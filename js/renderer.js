// renderer.js - Professional 3D Planet Renderer for Planet Eden WASM
// Features: Spherical planet, atmosphere, sun, organisms on surface, click-to-select, neural network viz

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OrganismType, BuildingType, PlantType, GrowthStage } from './wasm-loader.js';
import { TimeSystem } from './engine/time.js';
import { AnimationSystem } from './engine/animation.js';
import { WeatherSystem } from './engine/weather.js';

const PLANET_RADIUS = 50;
const ORGANISM_SCALE = 1.25; // Reduced for more realistic proportions
const SUN_ORBIT_RADIUS = 300;

export class Renderer {
    constructor(wasmModule) {
        this.wasmModule = wasmModule;
        this.organisms = new Map(); // id -> THREE.Mesh
        this.buildings = new Map(); // id -> THREE.Mesh
        this.resources = new Map(); // id -> { mesh, type, amount }
        this.selectedOrganism = null;
        this.neuralNetworkPanel = null;

        // Previous positions for movement direction
        this.previousPositions = new Map();

        // Activity tracking for humanoids
        this.humanoidActivities = new Map(); // id -> { activity, target, progress, effects }
        this.activityEffects = new Map(); // id -> THREE.Group (particle effects)

        // Resource types
        this.RESOURCE_TYPES = {
            WOOD: 0,
            STONE: 1,
            GOLD: 2,
            IRON: 3
        };

        // Tribe resources (tracked client-side for building)
        this.tribeResources = new Map(); // tribeId -> { wood, stone, gold, iron }

        // Building costs by type
        this.BUILDING_COSTS = {
            hut: { wood: 20, stone: 5 },
            storage: { wood: 30, stone: 10 },
            workshop: { wood: 25, stone: 20, iron: 5 },
            farm: { wood: 15, stone: 0 },
            barracks: { wood: 40, stone: 30, iron: 10 }
        };

        // Building footprint radius (for spacing)
        this.BUILDING_RADIUS = 4;

        // Plant growth and reproduction system
        this.plantData = new Map(); // id -> { age, growth, maxGrowth, canSeed, seedTimer, plantType }
        this.GROWTH_RATE = 0.08; // Growth per second (4x faster)
        this.SEED_INTERVAL = 12; // Seconds between seed attempts (faster seeding)
        this.SEED_RADIUS = 12; // How far seeds can spread (wider spread)
        this.MAX_PLANTS_NEARBY = 15; // Allow denser forests

        // Fire system
        this.fires = new Map(); // id -> { mesh, position, intensity, spreadTimer, targetId, targetType }
        this.fireIdCounter = 0;
        this.FIRE_SPREAD_RATE = 0.5; // Chance per second to spread
        this.FIRE_SPREAD_RADIUS = 5; // How far fire can spread
        this.FIRE_DAMAGE_RATE = 10; // Damage per second

        // Water cycle system
        this.waterLevel = 0.5; // Base water level (0-1, affects water sphere scale)
        this.waterLevelMin = 0.3; // Minimum water level (drought)
        this.waterLevelMax = 0.8; // Maximum water level (flooding)
        this.rainAccumulationRate = 0.002; // Water gained per second per raining cloud
        this.evaporationRate = 0.001; // Water lost per second in sun
        this.baseWaterRadius = PLANET_RADIUS + 0.3; // Original water sphere radius

        // Initialize time system
        this.timeSystem = new TimeSystem({
            dayLengthSeconds: 120, // 2 minutes per day
            startHour: 10 // Start at 10 AM
        });

        // Time display
        this.timeSystem.onTimeChange = (info) => this.updateTimeDisplay(info);
        this.timeSystem.onDayChange = (day) => console.log(`[Time] Day ${day} begins`);

        // Initialize animation system
        this.animationSystem = new AnimationSystem();

        // Weather system (initialized after scene is created)
        this.weatherSystem = null;
    }

    init(container) {
        this.initScene(container);
        this.initCamera();
        this.initLights();
        this.createPlanet();
        this.createAtmosphere();
        this.createSun();
        this.createStarfield();
        // Clouds removed - will be dynamic 3D objects in weather system
        this.initControls();
        this.initRaycaster();
        this.initWeather();
        this.initResourceNodes();

        window.addEventListener('resize', () => this.onWindowResize());
        console.log('[Renderer] Professional 3D planet initialized');

        // Add test markers to verify rendering works
        this.addTestMarkers();
    }

    initResourceNodes() {
        // Create mineable resource nodes scattered around the planet
        const nodeCount = 15;

        for (let i = 0; i < nodeCount; i++) {
            // Determine resource type
            const roll = Math.random();
            let resourceType, color, emissive;
            if (roll < 0.4) {
                resourceType = this.RESOURCE_TYPES.STONE;
                color = 0x888888;
                emissive = 0x222222;
            } else if (roll < 0.7) {
                resourceType = this.RESOURCE_TYPES.IRON;
                color = 0x8B4513;
                emissive = 0x442200;
            } else {
                resourceType = this.RESOURCE_TYPES.GOLD;
                color = 0xFFD700;
                emissive = 0x886600;
            }

            // Create rock mesh
            const rockGroup = new THREE.Group();

            // Main rock body - irregular shape using multiple geometries
            const mainRock = new THREE.Mesh(
                new THREE.DodecahedronGeometry(0.8 + Math.random() * 0.4, 0),
                new THREE.MeshStandardMaterial({
                    color: color,
                    emissive: emissive,
                    emissiveIntensity: resourceType === this.RESOURCE_TYPES.GOLD ? 0.3 : 0.1,
                    roughness: 0.9,
                    metalness: resourceType === this.RESOURCE_TYPES.GOLD ? 0.6 : 0.2
                })
            );
            mainRock.scale.set(1, 0.7, 1);
            mainRock.rotation.set(Math.random(), Math.random(), Math.random());
            mainRock.castShadow = true;
            mainRock.receiveShadow = true;
            rockGroup.add(mainRock);

            // Add smaller rocks around
            for (let j = 0; j < 3; j++) {
                const smallRock = new THREE.Mesh(
                    new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.2, 0),
                    mainRock.material.clone()
                );
                smallRock.position.set(
                    (Math.random() - 0.5) * 1.2,
                    0,
                    (Math.random() - 0.5) * 1.2
                );
                smallRock.rotation.set(Math.random(), Math.random(), Math.random());
                smallRock.castShadow = true;
                rockGroup.add(smallRock);
            }

            // Find a land position for the resource
            const pos = this.findLandPosition();
            const surfaceInfo = this.positionOnPlanetSurface(pos.flatX, pos.flatZ, 0.5);

            rockGroup.position.copy(surfaceInfo.position);
            rockGroup.quaternion.copy(surfaceInfo.quaternion);
            rockGroup.scale.setScalar(1.5);
            rockGroup.userData.resourceId = i;

            this.planetGroup.add(rockGroup);
            this.resources.set(i, {
                mesh: rockGroup,
                type: resourceType,
                amount: 50 + Math.floor(Math.random() * 50),
                flatX: pos.flatX,
                flatZ: pos.flatZ
            });
        }

        console.log(`[Renderer] Created ${nodeCount} resource nodes`);
    }

    addTestMarkers() {
        // Debug test spheres removed - they were causing big colored balls on the planet
    }

    initScene(container) {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = new THREE.FogExp2(0x000000, 0.002);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        this.planetGroup = new THREE.Group();
        this.scene.add(this.planetGroup);
    }

    initCamera() {
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            2000
        );
        // Position camera to see the whole planet with test markers
        this.camera.position.set(80, 50, 80);
        this.camera.lookAt(0, 0, 0);
    }

    initLights() {
        // Ambient light - intensity controlled by time system
        this.ambientLight = new THREE.AmbientLight(0x808080, 0.4);
        this.scene.add(this.ambientLight);

        // Hemisphere light for natural sky/ground lighting
        this.hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x444444, 0.3);
        this.hemiLight.position.set(0, 50, 0);
        this.scene.add(this.hemiLight);

        // Main directional light (sun) - position controlled by time system
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        this.sunLight.position.set(SUN_ORBIT_RADIUS, 0, 0);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.camera.left = -100;
        this.sunLight.shadow.camera.right = 100;
        this.sunLight.shadow.camera.top = 100;
        this.sunLight.shadow.camera.bottom = -100;
        this.sunLight.shadow.camera.near = 100;
        this.sunLight.shadow.camera.far = 600;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.bias = -0.0001;
        this.scene.add(this.sunLight);

        // Moonlight - subtle blue tint
        this.moonLight = new THREE.DirectionalLight(0x6688cc, 0.2);
        this.moonLight.position.set(-SUN_ORBIT_RADIUS, 0, 0);
        this.scene.add(this.moonLight);
    }

    createPlanet() {
        // Store noise function as class method for consistent terrain across all systems
        this.noise = (x, y, z) => {
            return Math.sin(x * 2) * Math.cos(y * 2) * Math.sin(z * 2) +
                   Math.sin(x * 4.5) * Math.cos(y * 4.5) * 0.5 +
                   Math.sin(x * 8.2) * Math.cos(z * 8.2) * 0.25;
        };

        // Terrain height function - used everywhere
        this.getTerrainHeight = (nx, ny, nz) => {
            const continentNoise = this.noise(nx * 0.8, ny * 0.8, nz * 0.8) * 6;
            const mountainNoise = this.noise(nx * 3, ny * 3, nz * 3) * 2.5;
            const detailNoise = this.noise(nx * 10, ny * 10, nz * 10) * 0.4;
            return continentNoise + mountainNoise + detailNoise;
        };

        // Check if a position is on land (for spawn validation)
        this.isOnLand = (nx, ny, nz) => {
            return this.getTerrainHeight(nx, ny, nz) > 0.5; // Above water level
        };

        // Real 3D terrain with actual vertex displacement
        // Using IcosahedronGeometry to avoid UV seam artifacts
        const geometry = new THREE.IcosahedronGeometry(PLANET_RADIUS, 7); // 7 subdivisions = ~163k vertices
        const positions = geometry.attributes.position;
        const colors = new Float32Array(positions.count * 3);

        // Biome color based on height and latitude - only for LAND (not water)
        const getBiomeColor = (height, latitude) => {
            const absLat = Math.abs(latitude);

            // Water is handled by separate water mesh, so terrain below water is seafloor
            if (height < 0) return { r: 0.15, g: 0.12, b: 0.08 };       // Seafloor (brownish)
            if (height < 0.5) return { r: 0.9, g: 0.83, b: 0.63 };      // Beach
            if (height < 2) {
                if (absLat > 0.7) return { r: 0.44, g: 0.5, b: 0.56 };  // Tundra
                if (absLat > 0.4) return { r: 0.34, g: 0.49, b: 0.27 }; // Temperate forest
                return { r: 0.42, g: 0.56, b: 0.14 };                    // Grassland
            }
            if (height < 4) {
                if (absLat > 0.6) return { r: 0.54, g: 0.45, b: 0.33 }; // Mountain rock
                return { r: 0.18, g: 0.31, b: 0.09 };                    // Dense forest
            }
            if (height < 6) return { r: 0.41, g: 0.41, b: 0.41 };       // Rocky mountain
            return { r: 0.94, g: 0.97, b: 1.0 };                         // Snow peak
        };

        // Store terrain data for organism placement
        this.terrainData = [];

        // Displace vertices and set colors
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);

            const len = Math.sqrt(x * x + y * y + z * z);
            const nx = x / len, ny = y / len, nz = z / len;

            const height = this.getTerrainHeight(nx, ny, nz);
            const latitude = Math.asin(ny);
            const color = getBiomeColor(height, latitude);

            // Actually displace the vertex to create real 3D terrain
            // For underwater areas, clamp to slightly below water level
            const clampedHeight = Math.max(height, -2);
            const newRadius = PLANET_RADIUS + clampedHeight;
            positions.setXYZ(i, nx * newRadius, ny * newRadius, nz * newRadius);

            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;

            this.terrainData.push({ height, latitude, nx, ny, nz });
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.computeVertexNormals();
        positions.needsUpdate = true;

        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.8,
            metalness: 0.1
        });

        this.planet = new THREE.Mesh(geometry, material);
        this.planet.receiveShadow = true;
        this.planet.castShadow = true;
        this.planetGroup.add(this.planet);

        // Create separate water layer
        this.createWater();

        // Clouds are now created by the WeatherSystem
    }

    createWater() {
        // Water as a separate transparent sphere at sea level
        // Using IcosahedronGeometry to match terrain (no seam)
        const waterGeometry = new THREE.IcosahedronGeometry(PLANET_RADIUS + 0.3, 6);

        const waterMaterial = new THREE.MeshStandardMaterial({
            color: 0x0077bb,
            transparent: true,
            opacity: 0.75,
            roughness: 0.05,
            metalness: 0.4,
            side: THREE.DoubleSide
        });

        this.water = new THREE.Mesh(waterGeometry, waterMaterial);
        this.water.receiveShadow = true;
        this.planetGroup.add(this.water);
    }

    // Clouds are now managed by the WeatherSystem for local weather effects

    createAtmosphere() {
        // Atmosphere that follows terrain contours
        const geometry = new THREE.IcosahedronGeometry(PLANET_RADIUS, 5);
        const positions = geometry.attributes.position;

        // Displace atmosphere vertices to follow terrain (but smoothed and offset)
        const atmosphereOffset = 4; // Height above terrain
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);

            const len = Math.sqrt(x * x + y * y + z * z);
            const nx = x / len, ny = y / len, nz = z / len;

            // Get terrain height but smoothed (use lower frequency noise)
            const smoothedHeight = this.noise(nx * 0.8, ny * 0.8, nz * 0.8) * 4;
            const clampedHeight = Math.max(smoothedHeight, 0);

            const newRadius = PLANET_RADIUS + clampedHeight + atmosphereOffset;
            positions.setXYZ(i, nx * newRadius, ny * newRadius, nz * newRadius);
        }

        geometry.computeVertexNormals();
        positions.needsUpdate = true;

        const vertexShader = `
            varying vec3 vNormal;
            varying vec3 vWorldPosition;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        const fragmentShader = `
            varying vec3 vNormal;
            varying vec3 vWorldPosition;
            void main() {
                vec3 viewDir = normalize(cameraPosition - vWorldPosition);
                float rim = 1.0 - abs(dot(vNormal, viewDir));
                float intensity = pow(rim, 3.0) * 0.5;
                gl_FragColor = vec4(0.4, 0.7, 1.0, intensity);
            }
        `;

        const material = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false
        });

        this.atmosphere = new THREE.Mesh(geometry, material);
        this.scene.add(this.atmosphere);
    }

    createSun() {
        // Visual sun sphere
        const sunGeometry = new THREE.SphereGeometry(15, 32, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff99,
            emissive: 0xffff99,
            emissiveIntensity: 1.0
        });
        this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
        this.sun.position.copy(this.sunLight.position);

        // Sun glow
        const glowGeometry = new THREE.SphereGeometry(18, 32, 32);
        const glowVertexShader = `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;
        const glowFragmentShader = `
            uniform vec3 glowColor;
            uniform float c;
            uniform float p;
            varying vec3 vNormal;
            void main() {
                float intensity = pow(c - dot(vNormal, vec3(0, 0, 1.0)), p);
                gl_FragColor = vec4(glowColor, intensity);
            }
        `;
        const glowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                c: { value: 0.2 },
                p: { value: 2.5 },
                glowColor: { value: new THREE.Color(0xffdd88) }
            },
            vertexShader: glowVertexShader,
            fragmentShader: glowFragmentShader,
            side: THREE.FrontSide,
            blending: THREE.AdditiveBlending,
            transparent: true
        });
        const sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.sun.add(sunGlow);

        this.scene.add(this.sun);

        // Create Moon
        this.createMoon();
    }

    createMoon() {
        // Visual moon sphere - smaller than sun, silvery color
        const moonGeometry = new THREE.SphereGeometry(8, 32, 32);
        const moonMaterial = new THREE.MeshStandardMaterial({
            color: 0xddddee,
            emissive: 0x888899,
            emissiveIntensity: 0.3,
            roughness: 0.9,
            metalness: 0.1,
            transparent: true,
            opacity: 0.9
        });
        this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
        this.moon.position.copy(this.moonLight.position);

        // Moon glow - subtle blue-white
        const moonGlowGeometry = new THREE.SphereGeometry(10, 32, 32);
        const moonGlowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                glowColor: { value: new THREE.Color(0x8899bb) },
                c: { value: 0.3 },
                p: { value: 2.0 }
            },
            vertexShader: `
                varying vec3 vNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 glowColor;
                uniform float c;
                uniform float p;
                varying vec3 vNormal;
                void main() {
                    float intensity = pow(c - dot(vNormal, vec3(0, 0, 1.0)), p);
                    gl_FragColor = vec4(glowColor, intensity * 0.5);
                }
            `,
            side: THREE.FrontSide,
            blending: THREE.AdditiveBlending,
            transparent: true
        });
        const moonGlow = new THREE.Mesh(moonGlowGeometry, moonGlowMaterial);
        this.moon.add(moonGlow);

        // Add crater details with slightly darker spots
        const craterMaterial = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,
            roughness: 1.0,
            metalness: 0
        });

        // Create a few crater-like features
        const craterPositions = [
            { theta: 0.3, phi: 0.5, size: 1.5 },
            { theta: 1.2, phi: 0.8, size: 1.0 },
            { theta: 2.0, phi: 1.5, size: 1.2 },
            { theta: 0.8, phi: 2.2, size: 0.8 }
        ];

        craterPositions.forEach(crater => {
            const craterGeo = new THREE.SphereGeometry(crater.size, 8, 8);
            const craterMesh = new THREE.Mesh(craterGeo, craterMaterial);
            craterMesh.position.set(
                7 * Math.sin(crater.phi) * Math.cos(crater.theta),
                7 * Math.cos(crater.phi),
                7 * Math.sin(crater.phi) * Math.sin(crater.theta)
            );
            craterMesh.scale.y = 0.3; // Flatten into oval
            this.moon.add(craterMesh);
        });

        this.scene.add(this.moon);
    }

    createStarfield() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.7,
            sizeAttenuation: true,
            transparent: true,
            opacity: 1.0
        });

        const starsVertices = [];
        for (let i = 0; i < 10000; i++) {
            const radius = 500 + Math.random() * 500;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);

            starsVertices.push(x, y, z);
        }

        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        this.stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(this.stars);
    }

    // Old shader-based clouds removed - now using 3D cloud objects (createCloudObjects)

    initControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 70;
        this.controls.maxDistance = 300;
        this.controls.maxPolarAngle = Math.PI;
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 0.3;
    }

    initRaycaster() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.renderer.domElement.addEventListener('click', (event) => this.onMouseClick(event));
        this.renderer.domElement.addEventListener('mousemove', (event) => this.onMouseMove(event));
    }

    initWeather() {
        // Pass terrain height function so clouds follow terrain contours
        this.weatherSystem = new WeatherSystem(this.scene, PLANET_RADIUS, this.getTerrainHeight.bind(this));
        this.weatherSystem.onWeatherChange = (weather) => {
            console.log(`[Weather] Changed to: ${weather}`);
            this.updateWeatherDisplay(weather);
        };

        // Set up lightning strike callback
        this.weatherSystem.setLightningCallback((strikeData) => {
            this.handleLightningStrike(strikeData);
        });
    }

    // Handle lightning strike - damage creatures and potentially start fires
    handleLightningStrike(strikeData) {
        const strikePos = strikeData.position;
        const strikeRadius = 3; // Damage radius

        console.log('[Renderer] Processing lightning strike');

        // Check for organisms near the strike
        const data = this.wasmModule.getOrganismData();
        if (data) {
            for (let i = 0; i < data.count; i++) {
                if (!data.alive[i]) continue;

                const mesh = this.organisms.get(i);
                if (!mesh) continue;

                const dist = mesh.position.distanceTo(strikePos);
                if (dist < strikeRadius) {
                    // Direct hit - major damage or kill
                    const damage = 80 + Math.random() * 40; // 80-120 damage
                    data.healths[i] = Math.max(0, data.healths[i] - damage);

                    console.log(`[Lightning] Hit organism ${i} for ${damage.toFixed(0)} damage!`);

                    // 30% chance to start fire on plants
                    if (data.types[i] === 0 && Math.random() < 0.3) {
                        this.startFire(i, 'organism', mesh.position.clone());
                    }
                }
            }
        }

        // Check for buildings near the strike
        for (const [id, building] of this.buildings) {
            const dist = building.mesh.position.distanceTo(strikePos);
            if (dist < strikeRadius * 1.5) {
                // Hit building
                building.health = Math.max(0, building.health - 30);
                console.log(`[Lightning] Hit building ${id}!`);

                // 50% chance to start fire on buildings
                if (Math.random() < 0.5) {
                    this.startFire(id, 'building', building.mesh.position.clone());
                }
            }
        }

        // Small chance to start ground fire even if nothing was hit
        if (Math.random() < 0.15) {
            this.startFire(null, 'ground', strikePos);
        }
    }

    // Start a fire at a location
    startFire(targetId, targetType, position) {
        const fireId = this.fireIdCounter++;

        // Create fire visual
        const fireGroup = new THREE.Group();

        // Main flame
        const flameGeo = new THREE.ConeGeometry(0.3, 1.2, 8);
        const flameMat = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.9
        });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.y = 0.6;
        fireGroup.add(flame);

        // Inner bright core
        const coreGeo = new THREE.ConeGeometry(0.15, 0.8, 8);
        const coreMat = new THREE.MeshBasicMaterial({
            color: 0xffff44,
            transparent: true,
            opacity: 0.95
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.position.y = 0.4;
        fireGroup.add(core);

        // Point light for fire glow
        const fireLight = new THREE.PointLight(0xff4400, 2, 8);
        fireLight.position.y = 0.5;
        fireGroup.add(fireLight);

        fireGroup.position.copy(position);
        fireGroup.userData.fireId = fireId;
        this.planetGroup.add(fireGroup);

        this.fires.set(fireId, {
            mesh: fireGroup,
            position: position.clone(),
            intensity: 1,
            spreadTimer: 2 + Math.random() * 3, // Time until spread attempt
            burnTimer: 15 + Math.random() * 15, // How long it burns
            targetId: targetId,
            targetType: targetType,
            animPhase: Math.random() * Math.PI * 2
        });

        console.log(`[Fire] Started fire ${fireId} at ${targetType}${targetId !== null ? ' #' + targetId : ''}`);
    }

    // Update all fires
    updateFires(deltaSeconds) {
        const firesToRemove = [];
        const data = this.wasmModule.getOrganismData();

        for (const [id, fire] of this.fires) {
            // Animate fire
            fire.animPhase += deltaSeconds * 8;
            const flicker = 0.8 + Math.sin(fire.animPhase) * 0.2 + Math.random() * 0.1;

            if (fire.mesh.children.length > 0) {
                // Animate flame size
                fire.mesh.children[0].scale.set(flicker, 0.9 + Math.sin(fire.animPhase * 1.5) * 0.2, flicker);
                fire.mesh.children[1].scale.set(flicker * 0.8, 0.85 + Math.sin(fire.animPhase * 2) * 0.15, flicker * 0.8);

                // Update light intensity
                if (fire.mesh.children[2] && fire.mesh.children[2].isLight) {
                    fire.mesh.children[2].intensity = 1.5 + Math.random() * 1;
                }
            }

            // Damage target
            if (fire.targetId !== null && data) {
                if (fire.targetType === 'organism') {
                    const idx = fire.targetId;
                    if (idx < data.count && data.alive[idx]) {
                        data.healths[idx] -= this.FIRE_DAMAGE_RATE * deltaSeconds;
                        if (data.healths[idx] <= 0) {
                            fire.targetId = null; // Target destroyed
                        }
                    }
                } else if (fire.targetType === 'building') {
                    const building = this.buildings.get(fire.targetId);
                    if (building) {
                        building.health -= this.FIRE_DAMAGE_RATE * 0.5 * deltaSeconds;
                        if (building.health <= 0) {
                            // Building destroyed
                            this.planetGroup.remove(building.mesh);
                            this.buildings.delete(fire.targetId);
                            fire.targetId = null;
                        }
                    }
                }
            }

            // Spread timer
            fire.spreadTimer -= deltaSeconds;
            if (fire.spreadTimer <= 0) {
                fire.spreadTimer = 3 + Math.random() * 4;

                // Try to spread to nearby objects
                if (Math.random() < this.FIRE_SPREAD_RATE) {
                    this.trySpreadFire(fire);
                }
            }

            // Burn timer
            fire.burnTimer -= deltaSeconds;
            fire.intensity = Math.max(0.2, fire.burnTimer / 15);

            if (fire.burnTimer <= 0) {
                firesToRemove.push(id);
            }
        }

        // Remove expired fires
        for (const id of firesToRemove) {
            const fire = this.fires.get(id);
            if (fire && fire.mesh) {
                this.planetGroup.remove(fire.mesh);
                fire.mesh.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
            }
            this.fires.delete(id);
            console.log(`[Fire] Fire ${id} burned out`);
        }
    }

    // Try to spread fire to nearby flammable objects
    trySpreadFire(fire) {
        // Check nearby organisms (plants are flammable)
        const data = this.wasmModule.getOrganismData();
        if (data) {
            for (let i = 0; i < data.count; i++) {
                if (!data.alive[i]) continue;
                if (data.types[i] !== 0) continue; // Only plants catch fire

                const mesh = this.organisms.get(i);
                if (!mesh) continue;

                const dist = mesh.position.distanceTo(fire.position);
                if (dist < this.FIRE_SPREAD_RADIUS && dist > 0.5) {
                    // Check if this target is already on fire
                    let alreadyOnFire = false;
                    for (const [fid, f] of this.fires) {
                        if (f.targetType === 'organism' && f.targetId === i) {
                            alreadyOnFire = true;
                            break;
                        }
                    }

                    if (!alreadyOnFire && Math.random() < 0.4) {
                        this.startFire(i, 'organism', mesh.position.clone());
                        return; // Only spread to one target per attempt
                    }
                }
            }
        }

        // Check nearby buildings
        for (const [id, building] of this.buildings) {
            const dist = building.mesh.position.distanceTo(fire.position);
            if (dist < this.FIRE_SPREAD_RADIUS && dist > 0.5) {
                let alreadyOnFire = false;
                for (const [fid, f] of this.fires) {
                    if (f.targetType === 'building' && f.targetId === id) {
                        alreadyOnFire = true;
                        break;
                    }
                }

                if (!alreadyOnFire && Math.random() < 0.3) {
                    this.startFire(id, 'building', building.mesh.position.clone());
                    return;
                }
            }
        }
    }

    // Update water cycle - rain accumulation and sun evaporation
    updateWaterCycle(deltaSeconds, timeInfo) {
        if (!this.weatherSystem || !this.water) return;

        const clouds = this.weatherSystem.clouds;
        let rainContribution = 0;

        // Count active rain clouds
        for (const cloud of clouds) {
            if (cloud.weatherState === 'rain' || cloud.weatherState === 'storm') {
                // Each raining cloud contributes to water level
                const intensity = cloud.weatherIntensity;
                rainContribution += intensity * this.rainAccumulationRate;
            }
        }

        // Add rain water
        this.waterLevel += rainContribution * deltaSeconds;

        // Evaporation based on sun intensity (only during day)
        if (timeInfo && timeInfo.sunIntensity > 0.3) {
            const evaporationAmount = this.evaporationRate * timeInfo.sunIntensity * deltaSeconds;

            // Less evaporation when it's cloudy/raining
            const weatherInfo = this.weatherSystem.getWeatherInfo();
            const cloudCover = Math.min(1, weatherInfo.activeCloudCount / 10);
            const reducedEvaporation = evaporationAmount * (1 - cloudCover * 0.7);

            this.waterLevel -= reducedEvaporation;
        }

        // Clamp water level
        this.waterLevel = Math.max(this.waterLevelMin, Math.min(this.waterLevelMax, this.waterLevel));

        // Update water mesh scale to reflect water level
        // Map water level (0.3-0.8) to scale (0.98-1.02) for subtle visual change
        const scaleFactor = 0.98 + (this.waterLevel - this.waterLevelMin) / (this.waterLevelMax - this.waterLevelMin) * 0.04;
        const newRadius = this.baseWaterRadius * scaleFactor;

        // Update water mesh geometry scale
        this.water.scale.setScalar(scaleFactor);

        // Update water opacity based on level (fuller = more opaque blue)
        const opacity = 0.6 + (this.waterLevel - this.waterLevelMin) / (this.waterLevelMax - this.waterLevelMin) * 0.25;
        this.water.material.opacity = opacity;

        // Water color shifts with level - drought is more murky, flood is clearer blue
        const levelNorm = (this.waterLevel - this.waterLevelMin) / (this.waterLevelMax - this.waterLevelMin);
        const r = 0.0 + (1 - levelNorm) * 0.1;  // Slightly brown when low
        const g = 0.4 + levelNorm * 0.15;       // More cyan when high
        const b = 0.6 + levelNorm * 0.2;        // More blue when high
        this.water.material.color.setRGB(r, g, b);

        // Optional: Add puddle effects or flooding indicators
        // (Could create temporary water pools on low terrain when level is high)
    }

    updateWeatherDisplay(weather) {
        const weatherDisplay = document.getElementById('weather-display');
        if (weatherDisplay) {
            const icons = {
                'clear': '\u2600',     // sun
                'cloudy': '\u2601',    // cloud
                'rain': '\u{1F327}',   // cloud with rain
                'storm': '\u26C8'      // thunder cloud
            };

            // Water level indicator
            const waterPercent = Math.round((this.waterLevel - this.waterLevelMin) / (this.waterLevelMax - this.waterLevelMin) * 100);
            let waterIcon = '\u{1F4A7}'; // droplet
            if (waterPercent < 30) waterIcon = '\u{1F3DC}'; // desert (drought)
            else if (waterPercent > 80) waterIcon = '\u{1F30A}'; // wave (flooding)

            weatherDisplay.textContent = `${icons[weather] || ''} ${weather.charAt(0).toUpperCase() + weather.slice(1)} | ${waterIcon} ${waterPercent}%`;
        }
    }

    onMouseClick(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Check organisms first
        const organismMeshes = Array.from(this.organisms.values());
        const organismIntersects = this.raycaster.intersectObjects(organismMeshes, true);

        if (organismIntersects.length > 0) {
            const clickedMesh = organismIntersects[0].object.parent || organismIntersects[0].object;
            const clickedId = clickedMesh.userData.organismId;
            if (clickedId !== undefined) {
                this.selectOrganism(clickedId);
                return;
            }
        }

        // Check buildings
        const buildingMeshes = Array.from(this.buildings.values()).map(b => b.mesh);
        const buildingIntersects = this.raycaster.intersectObjects(buildingMeshes, true);

        if (buildingIntersects.length > 0) {
            // Find building ID from clicked mesh or its parents
            let obj = buildingIntersects[0].object;
            while (obj && !obj.userData.buildingId) {
                obj = obj.parent;
            }
            if (obj && obj.userData.buildingId) {
                this.selectBuilding(obj.userData.buildingId);
                return;
            }
        }

        // Check resources
        const resourceMeshes = Array.from(this.resources.values()).map(r => r.mesh);
        const resourceIntersects = this.raycaster.intersectObjects(resourceMeshes, true);

        if (resourceIntersects.length > 0) {
            let obj = resourceIntersects[0].object;
            while (obj && obj.userData.resourceId === undefined) {
                obj = obj.parent;
            }
            if (obj && obj.userData.resourceId !== undefined) {
                this.selectResource(obj.userData.resourceId);
                return;
            }
            // Fallback - find by mesh reference
            for (const [id, res] of this.resources) {
                if (res.mesh === obj || res.mesh.children.includes(resourceIntersects[0].object)) {
                    this.selectResource(id);
                    return;
                }
            }
        }

        // Check clouds
        if (this.weatherSystem && this.weatherSystem.cloudGroup) {
            const cloudMeshes = [];
            this.weatherSystem.cloudGroup.traverse(child => {
                if (child.isMesh) cloudMeshes.push(child);
            });
            const cloudIntersects = this.raycaster.intersectObjects(cloudMeshes, true);

            if (cloudIntersects.length > 0) {
                // Find which cloud was clicked
                let obj = cloudIntersects[0].object;
                while (obj && !obj.userData.cloudIndex && obj.parent) {
                    obj = obj.parent;
                }
                if (obj.userData.cloudIndex !== undefined) {
                    this.selectCloud(obj.userData.cloudIndex);
                    return;
                }
                // Try to find by parent group
                for (let i = 0; i < this.weatherSystem.clouds.length; i++) {
                    if (this.weatherSystem.clouds[i].group.children.some(c =>
                        c === cloudIntersects[0].object || c.children?.includes(cloudIntersects[0].object)
                    )) {
                        this.selectCloud(i);
                        return;
                    }
                }
            }
        }

        // Nothing clicked - deselect all
        this.deselectOrganism();
        this.deselectBuilding();
        this.deselectResource();
        this.deselectCloud();
    }

    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Check organisms
        const organismMeshes = Array.from(this.organisms.values());
        const organismIntersects = this.raycaster.intersectObjects(organismMeshes, true);

        if (organismIntersects.length > 0) {
            this.renderer.domElement.style.cursor = 'pointer';
            return;
        }

        // Check buildings
        const buildingMeshes = Array.from(this.buildings.values()).map(b => b.mesh);
        const buildingIntersects = this.raycaster.intersectObjects(buildingMeshes, true);

        if (buildingIntersects.length > 0) {
            this.renderer.domElement.style.cursor = 'pointer';
            return;
        }

        // Check resources
        const resourceMeshes = Array.from(this.resources.values()).map(r => r.mesh);
        const resourceIntersects = this.raycaster.intersectObjects(resourceMeshes, true);

        if (resourceIntersects.length > 0) {
            this.renderer.domElement.style.cursor = 'pointer';
            return;
        }

        // Check clouds
        if (this.weatherSystem && this.weatherSystem.cloudGroup) {
            const cloudMeshes = [];
            this.weatherSystem.cloudGroup.traverse(child => {
                if (child.isMesh) cloudMeshes.push(child);
            });
            const cloudIntersects = this.raycaster.intersectObjects(cloudMeshes, true);

            if (cloudIntersects.length > 0) {
                this.renderer.domElement.style.cursor = 'pointer';
                return;
            }
        }

        this.renderer.domElement.style.cursor = 'default';
    }

    selectOrganism(id) {
        this.deselectOrganism();

        this.selectedOrganism = id;
        const mesh = this.organisms.get(id);

        if (mesh) {
            // Add selection ring
            const ringGeometry = new THREE.RingGeometry(1.5, 1.8, 32);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
            });
            this.selectionRing = new THREE.Mesh(ringGeometry, ringMaterial);
            this.selectionRing.rotation.x = Math.PI / 2;
            mesh.add(this.selectionRing);

            // Show neural network panel
            this.showNeuralNetworkPanel(id);
        }
    }

    deselectOrganism() {
        if (this.selectionRing) {
            this.selectionRing.parent.remove(this.selectionRing);
            this.selectionRing = null;
        }
        this.selectedOrganism = null;
        this.hideNeuralNetworkPanel();
    }

    selectBuilding(buildingId) {
        this.deselectOrganism();
        this.deselectBuilding();

        this.selectedBuilding = buildingId;
        const building = this.buildings.get(buildingId);

        if (building && building.mesh) {
            // Add selection ring around building
            const ringGeometry = new THREE.RingGeometry(8, 9, 32);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0xffaa00,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
            });
            this.buildingSelectionRing = new THREE.Mesh(ringGeometry, ringMaterial);
            this.buildingSelectionRing.rotation.x = Math.PI / 2;
            this.buildingSelectionRing.position.y = 0.5;
            building.mesh.add(this.buildingSelectionRing);

            // Show building stats panel
            this.showBuildingPanel(buildingId);
        }
    }

    deselectBuilding() {
        if (this.buildingSelectionRing) {
            this.buildingSelectionRing.parent.remove(this.buildingSelectionRing);
            this.buildingSelectionRing = null;
        }
        this.selectedBuilding = null;
        this.hideBuildingPanel();
    }

    showBuildingPanel(buildingId) {
        const building = this.buildings.get(buildingId);
        if (!building) return;

        // Remove existing panel
        this.hideBuildingPanel();

        // Create building info panel
        this.buildingPanel = document.createElement('div');
        this.buildingPanel.className = 'info-panel-mobile';
        this.buildingPanel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 320px;
            background: rgba(20, 20, 30, 0.95);
            border: 2px solid rgba(255, 170, 0, 0.6);
            border-radius: 12px;
            padding: 1.5rem;
            color: white;
            font-family: 'Segoe UI', Arial, sans-serif;
            min-width: 280px;
            max-width: 350px;
            z-index: 1000;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        `;

        const buildingTypeNames = {
            'hut': 'Hut',
            'house': 'House',
            'workshop': 'Workshop',
            'storage': 'Storage',
            'farm': 'Farm',
            'barracks': 'Barracks'
        };

        const buildingTypeIcons = {
            'hut': '\u{1F3E0}',
            'house': '\u{1F3E1}',
            'workshop': '\u2692',
            'storage': '\u{1F4E6}',
            'farm': '\u{1F33E}',
            'barracks': '\u2694'
        };

        const buildingDescriptions = {
            'hut': 'Shelter for tribe members',
            'storage': 'Stores gathered resources',
            'workshop': 'Crafts tools and equipment',
            'farm': 'Grows food for the tribe',
            'barracks': 'Trains warriors'
        };

        const typeName = buildingTypeNames[building.type] || 'Building';
        const typeIcon = buildingTypeIcons[building.type] || '\u{1F3D7}';
        const description = buildingDescriptions[building.type] || '';

        const age = Math.floor((Date.now() - building.createdAt) / 1000);
        const ageMinutes = Math.floor(age / 60);
        const ageSeconds = age % 60;
        const ageStr = ageMinutes > 0 ? `${ageMinutes}m ${ageSeconds}s` : `${ageSeconds}s`;

        const resources = building.resources || { wood: 0, stone: 0, gold: 0, iron: 0 };

        this.buildingPanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <div style="font-size: 1.3rem; color: #fa0;">
                    ${typeIcon} ${typeName}
                </div>
                <button id="building-close-btn" style="background: none; border: none; color: #888; font-size: 1.5rem; cursor: pointer; padding: 0;">&times;</button>
            </div>
            ${description ? `<div style="font-size: 0.8rem; color: #888; margin-bottom: 1rem;">${description}</div>` : ''}

            <div style="margin: 1rem 0;">
                <div style="font-size: 0.85rem; margin-bottom: 0.3rem; color: #888;">HEALTH</div>
                <div style="background: rgba(255,255,255,0.1); height: 10px; border-radius: 5px; overflow: hidden;">
                    <div style="width: ${building.health}%; height: 100%; background: ${building.health > 70 ? '#0f0' : building.health > 30 ? '#ff0' : '#f00'}; transition: width 0.3s;"></div>
                </div>
                <div style="text-align: right; font-size: 0.75rem; color: #888; margin-top: 0.2rem;">${building.health}%</div>
            </div>

            ${building.tribeId > 0 ? `
                <div style="background: rgba(255,170,0,0.15); border: 1px solid rgba(255,200,0,0.3); border-radius: 6px; padding: 0.6rem; margin: 1rem 0;">
                    <div style="color: #fa0; font-weight: 600;">\u{1F3DB} Tribe ${building.tribeId} Property</div>
                </div>
            ` : ''}

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; margin: 1rem 0;">
                <div style="background: rgba(255,255,255,0.05); padding: 0.6rem; border-radius: 6px;">
                    <div style="color: #888; font-size: 0.75rem;">CAPACITY</div>
                    <div style="font-size: 1.1rem; margin-top: 0.3rem;">${building.occupants?.length || 0}/${building.capacity}</div>
                </div>
                <div style="background: rgba(255,255,255,0.05); padding: 0.6rem; border-radius: 6px;">
                    <div style="color: #888; font-size: 0.75rem;">AGE</div>
                    <div style="font-size: 1.1rem; margin-top: 0.3rem;">${ageStr}</div>
                </div>
            </div>

            <div style="margin: 1rem 0;">
                <div style="font-size: 0.85rem; margin-bottom: 0.5rem; color: #888;">STORED RESOURCES</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                    <div style="background: rgba(139,69,19,0.3); padding: 0.4rem 0.6rem; border-radius: 4px; display: flex; justify-content: space-between;">
                        <span>\u{1FAB5} Wood</span>
                        <span style="color: #CD853F;">${resources.wood}</span>
                    </div>
                    <div style="background: rgba(128,128,128,0.3); padding: 0.4rem 0.6rem; border-radius: 4px; display: flex; justify-content: space-between;">
                        <span>\u{1FAA8} Stone</span>
                        <span style="color: #888;">${resources.stone}</span>
                    </div>
                    <div style="background: rgba(255,215,0,0.2); padding: 0.4rem 0.6rem; border-radius: 4px; display: flex; justify-content: space-between;">
                        <span>\u{1F947} Gold</span>
                        <span style="color: #FFD700;">${resources.gold}</span>
                    </div>
                    <div style="background: rgba(139,90,43,0.3); padding: 0.4rem 0.6rem; border-radius: 4px; display: flex; justify-content: space-between;">
                        <span>\u2699 Iron</span>
                        <span style="color: #B87333;">${resources.iron}</span>
                    </div>
                </div>
            </div>

            <div style="font-size: 0.7rem; color: #555; margin-top: 1rem; text-align: center;">
                Position: (${building.flatX?.toFixed(1) || '?'}, ${building.flatZ?.toFixed(1) || '?'})
            </div>
        `;

        document.body.appendChild(this.buildingPanel);

        // Add close button handler
        document.getElementById('building-close-btn').onclick = () => this.deselectBuilding();
    }

    hideBuildingPanel() {
        if (this.buildingPanel) {
            document.body.removeChild(this.buildingPanel);
            this.buildingPanel = null;
        }
    }

    // Resource selection
    selectResource(resourceId) {
        this.deselectOrganism();
        this.deselectBuilding();
        this.deselectResource();
        this.deselectCloud();

        this.selectedResource = resourceId;
        const resource = this.resources.get(resourceId);

        if (resource && resource.mesh) {
            // Add selection ring
            const ringGeometry = new THREE.RingGeometry(2.5, 3, 32);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
            });
            this.resourceSelectionRing = new THREE.Mesh(ringGeometry, ringMaterial);
            this.resourceSelectionRing.rotation.x = Math.PI / 2;
            this.resourceSelectionRing.position.y = 0.3;
            resource.mesh.add(this.resourceSelectionRing);

            this.showResourcePanel(resourceId);
        }
    }

    deselectResource() {
        if (this.resourceSelectionRing) {
            this.resourceSelectionRing.parent?.remove(this.resourceSelectionRing);
            this.resourceSelectionRing = null;
        }
        this.selectedResource = null;
        this.hideResourcePanel();
    }

    showResourcePanel(resourceId) {
        const resource = this.resources.get(resourceId);
        if (!resource) return;

        this.hideResourcePanel();

        this.resourcePanel = document.createElement('div');
        this.resourcePanel.className = 'info-panel-mobile';
        this.resourcePanel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 320px;
            background: rgba(20, 30, 30, 0.95);
            border: 2px solid rgba(0, 255, 255, 0.6);
            border-radius: 12px;
            padding: 1.5rem;
            color: white;
            font-family: 'Segoe UI', Arial, sans-serif;
            min-width: 250px;
            max-width: 320px;
            z-index: 1000;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        `;

        const resourceTypes = {
            0: { name: 'Stone', icon: '\u{1FAA8}', color: '#888' },
            1: { name: 'Iron Ore', icon: '\u2699', color: '#B87333' },
            2: { name: 'Gold Ore', icon: '\u{1F947}', color: '#FFD700' },
            3: { name: 'Crystal', icon: '\u{1F48E}', color: '#88ffff' }
        };

        const typeInfo = resourceTypes[resource.type] || { name: 'Resource', icon: '\u{1FAA8}', color: '#888' };

        this.resourcePanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <div style="font-size: 1.3rem; color: ${typeInfo.color};">
                    ${typeInfo.icon} ${typeInfo.name}
                </div>
                <button id="resource-close-btn" style="background: none; border: none; color: #888; font-size: 1.5rem; cursor: pointer; padding: 0;">&times;</button>
            </div>

            <div style="margin: 1rem 0;">
                <div style="font-size: 0.85rem; margin-bottom: 0.3rem; color: #888;">REMAINING</div>
                <div style="background: rgba(255,255,255,0.1); height: 10px; border-radius: 5px; overflow: hidden;">
                    <div style="width: ${resource.amount}%; height: 100%; background: ${typeInfo.color}; transition: width 0.3s;"></div>
                </div>
                <div style="text-align: right; font-size: 0.75rem; color: #888; margin-top: 0.2rem;">${resource.amount} units</div>
            </div>

            <div style="font-size: 0.8rem; color: #aaa; margin-top: 1rem;">
                Humanoids can mine this resource when nearby.
            </div>

            <div style="font-size: 0.7rem; color: #555; margin-top: 1rem; text-align: center;">
                Position: (${resource.flatX?.toFixed(1)}, ${resource.flatZ?.toFixed(1)})
            </div>
        `;

        document.body.appendChild(this.resourcePanel);
        document.getElementById('resource-close-btn').onclick = () => this.deselectResource();
    }

    hideResourcePanel() {
        if (this.resourcePanel) {
            document.body.removeChild(this.resourcePanel);
            this.resourcePanel = null;
        }
    }

    // Cloud selection
    selectCloud(cloudIndex) {
        this.deselectOrganism();
        this.deselectBuilding();
        this.deselectResource();
        this.deselectCloud();

        if (!this.weatherSystem || !this.weatherSystem.clouds[cloudIndex]) return;

        this.selectedCloud = cloudIndex;
        const cloud = this.weatherSystem.clouds[cloudIndex];

        // Add selection indicator (glowing outline)
        const ringGeometry = new THREE.RingGeometry(5, 6, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xaaddff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.6
        });
        this.cloudSelectionRing = new THREE.Mesh(ringGeometry, ringMaterial);
        this.cloudSelectionRing.rotation.x = Math.PI / 2;
        cloud.group.add(this.cloudSelectionRing);

        this.showCloudPanel(cloudIndex);
    }

    deselectCloud() {
        if (this.cloudSelectionRing) {
            this.cloudSelectionRing.parent?.remove(this.cloudSelectionRing);
            this.cloudSelectionRing = null;
        }
        this.selectedCloud = null;
        this.hideCloudPanel();
    }

    showCloudPanel(cloudIndex) {
        const cloud = this.weatherSystem?.clouds[cloudIndex];
        if (!cloud) return;

        this.hideCloudPanel();

        this.cloudPanel = document.createElement('div');
        this.cloudPanel.className = 'info-panel-mobile';
        this.cloudPanel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 320px;
            background: rgba(30, 40, 60, 0.95);
            border: 2px solid rgba(170, 220, 255, 0.6);
            border-radius: 12px;
            padding: 1.5rem;
            color: white;
            font-family: 'Segoe UI', Arial, sans-serif;
            min-width: 260px;
            max-width: 320px;
            z-index: 1000;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        `;

        const weatherIcons = {
            'clear': '\u2600',
            'cloudy': '\u2601',
            'rain': '\u{1F327}',
            'storm': '\u26C8'
        };

        const weatherColors = {
            'clear': '#fff8dc',
            'cloudy': '#ccc',
            'rain': '#6699ff',
            'storm': '#9966ff'
        };

        const icon = weatherIcons[cloud.weatherState] || '\u2601';
        const color = weatherColors[cloud.weatherState] || '#ccc';
        const moisturePercent = Math.round(cloud.moisture * 100);
        const intensityPercent = Math.round(cloud.weatherIntensity * 100);

        this.cloudPanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <div style="font-size: 1.3rem; color: ${color};">
                    ${icon} Cloud #${cloudIndex + 1}
                </div>
                <button id="cloud-close-btn" style="background: none; border: none; color: #888; font-size: 1.5rem; cursor: pointer; padding: 0;">&times;</button>
            </div>

            <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 0.8rem; margin: 1rem 0;">
                <div style="font-size: 1rem; color: ${color}; text-transform: capitalize; font-weight: 600;">
                    ${cloud.weatherState}
                </div>
                ${cloud.isOverWater ? '<div style="font-size: 0.8rem; color: #66aaff; margin-top: 0.3rem;">\u{1F30A} Over Water - Absorbing moisture</div>' : '<div style="font-size: 0.8rem; color: #8b4513; margin-top: 0.3rem;">\u{1F33F} Over Land</div>'}
            </div>

            <div style="margin: 1rem 0;">
                <div style="font-size: 0.85rem; margin-bottom: 0.3rem; color: #888;">MOISTURE</div>
                <div style="background: rgba(255,255,255,0.1); height: 10px; border-radius: 5px; overflow: hidden;">
                    <div style="width: ${moisturePercent}%; height: 100%; background: #4488ff; transition: width 0.3s;"></div>
                </div>
                <div style="text-align: right; font-size: 0.75rem; color: #888; margin-top: 0.2rem;">${moisturePercent}%</div>
            </div>

            <div style="margin: 1rem 0;">
                <div style="font-size: 0.85rem; margin-bottom: 0.3rem; color: #888;">INTENSITY</div>
                <div style="background: rgba(255,255,255,0.1); height: 10px; border-radius: 5px; overflow: hidden;">
                    <div style="width: ${intensityPercent}%; height: 100%; background: ${color}; transition: width 0.3s;"></div>
                </div>
                <div style="text-align: right; font-size: 0.75rem; color: #888; margin-top: 0.2rem;">${intensityPercent}%</div>
            </div>

            ${cloud.canStorm ? '<div style="font-size: 0.8rem; color: #ff6; margin-top: 0.5rem;">\u26A1 Can produce lightning</div>' : ''}

            <div style="font-size: 0.75rem; color: #666; margin-top: 1rem;">
                Clouds absorb moisture over water and release it as rain over land.
            </div>
        `;

        document.body.appendChild(this.cloudPanel);
        document.getElementById('cloud-close-btn').onclick = () => this.deselectCloud();
    }

    hideCloudPanel() {
        if (this.cloudPanel) {
            document.body.removeChild(this.cloudPanel);
            this.cloudPanel = null;
        }
    }

    showNeuralNetworkPanel(id) {
        // Get organism data
        const data = this.wasmModule.getOrganismData();
        if (!data) {
            console.error('[Renderer] No organism data available');
            return;
        }

        // The id IS the organism index in the WASM data array
        const organismIndex = id;

        // Validate index
        if (organismIndex < 0 || organismIndex >= data.count) {
            console.error('[Renderer] Invalid organism index:', organismIndex);
            return;
        }

        if (!data.alive[organismIndex]) {
            console.error('[Renderer] Organism is not alive:', organismIndex);
            return;
        }

        const type = data.types[organismIndex];
        const energy = data.energies[organismIndex];
        const health = data.healths[organismIndex];
        const tribeId = data.tribeIds[organismIndex];

        console.log('[Renderer] Showing stats for organism:', {
            id: organismIndex,
            type: ['PLANT', 'HERBIVORE', 'CARNIVORE', 'HUMANOID'][type],
            energy: energy.toFixed(1),
            health: health.toFixed(1),
            tribeId
        });

        const typeNames = ['PLANT', 'HERBIVORE', 'CARNIVORE', 'HUMANOID'];
        const typeIcons = ['🌱', '🦌', '🦁', '🧍'];

        if (!this.neuralNetworkPanel) {
            this.neuralNetworkPanel = document.createElement('div');
            this.neuralNetworkPanel.id = 'neural-network-panel';
            this.neuralNetworkPanel.className = 'info-panel-mobile';
            this.neuralNetworkPanel.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 700px;
                max-width: 95vw;
                max-height: 90vh;
                overflow-y: auto;
                background: rgba(0, 0, 0, 0.95);
                border: 2px solid #0F0;
                border-radius: 12px;
                padding: 20px;
                z-index: 9999;
                box-shadow: 0 0 40px rgba(0, 255, 0, 0.5);
                color: #fff;
            `;

            const closeBtn = document.createElement('button');
            closeBtn.textContent = 'Close';
            closeBtn.style.cssText = `
                position: absolute;
                top: 10px;
                right: 10px;
                padding: 8px 16px;
                background: rgba(0, 255, 0, 0.2);
                border: 1px solid #0F0;
                color: #0F0;
                cursor: pointer;
                border-radius: 4px;
            `;
            closeBtn.onclick = () => this.deselectOrganism();
            this.neuralNetworkPanel.appendChild(closeBtn);

            document.body.appendChild(this.neuralNetworkPanel);
        }

        // Get plant-specific data if this is a plant
        const isPlant = type === 0;
        const plantInfo = isPlant ? this.plantData.get(id) : null;
        const growthPercent = plantInfo ? Math.round((plantInfo.growth / plantInfo.maxGrowth) * 100) : 0;
        const plantTypeNames = ['Grass', 'Tree', 'Bush', 'Flower', 'Crop'];
        const plantTypeName = plantInfo ? plantTypeNames[plantInfo.plantType] || 'Plant' : 'Plant';

        // Build detailed stats HTML
        const statsHTML = `
            <div style="margin-bottom: 1rem; font-size: 1.3rem; color: #0F0; text-align: center;">
                ${typeIcons[type]} ${isPlant ? plantTypeName : typeNames[type]} #${id}
            </div>

            <div style="margin: 1rem 0;">
                <div style="font-size: 0.85rem; margin-bottom: 0.3rem; color: #888;">HEALTH</div>
                <div style="background: rgba(255,255,255,0.1); height: 10px; border-radius: 5px; overflow: hidden;">
                    <div style="width: ${health}%; height: 100%; background: ${health > 70 ? '#0f0' : health > 30 ? '#ff0' : '#f00'}; transition: width 0.3s;"></div>
                </div>
                <div style="text-align: right; font-size: 0.75rem; color: #888; margin-top: 0.2rem;">${health.toFixed(0)}%</div>
            </div>

            ${isPlant ? `
                <div style="margin: 1rem 0;">
                    <div style="font-size: 0.85rem; margin-bottom: 0.3rem; color: #888;">GROWTH</div>
                    <div style="background: rgba(255,255,255,0.1); height: 10px; border-radius: 5px; overflow: hidden;">
                        <div style="width: ${growthPercent}%; height: 100%; background: #4a4; transition: width 0.3s;"></div>
                    </div>
                    <div style="text-align: right; font-size: 0.75rem; color: #888; margin-top: 0.2rem;">${growthPercent}%</div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; margin: 1rem 0;">
                    <div style="background: rgba(255,255,255,0.05); padding: 0.6rem; border-radius: 6px;">
                        <div style="color: #888; font-size: 0.75rem;">AGE</div>
                        <div style="font-size: 1.1rem; margin-top: 0.3rem;">${plantInfo ? plantInfo.age.toFixed(0) : 0}s</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.05); padding: 0.6rem; border-radius: 6px;">
                        <div style="color: #888; font-size: 0.75rem;">CAN SEED</div>
                        <div style="font-size: 1.1rem; margin-top: 0.3rem;">${plantInfo && plantInfo.canSeed ? '✓ Yes' : '✗ No'}</div>
                    </div>
                </div>

                <div style="text-align: center; color: #6a6; padding: 1rem; font-size: 0.9rem;">
                    🌱 Plants grow naturally and can spread seeds when mature.
                </div>
            ` : `
                <div style="margin: 1rem 0;">
                    <div style="font-size: 0.85rem; margin-bottom: 0.3rem; color: #888;">ENERGY</div>
                    <div style="background: rgba(255,255,255,0.1); height: 10px; border-radius: 5px; overflow: hidden;">
                        <div style="width: ${energy}%; height: 100%; background: ${energy > 70 ? '#0f0' : energy > 30 ? '#ff0' : '#f00'}; transition: width 0.3s;"></div>
                    </div>
                    <div style="text-align: right; font-size: 0.75rem; color: #888; margin-top: 0.2rem;">${energy.toFixed(0)}%</div>
                </div>

                ${tribeId > 0 && tribeId !== 0xFFFFFFFF ? `
                    <div style="background: rgba(0,100,255,0.15); border: 1px solid rgba(0,200,255,0.3); border-radius: 6px; padding: 0.6rem; margin: 1rem 0;">
                        <div style="color: #0af; font-weight: 600;">🏛️ Tribe Member</div>
                        <div style="font-size: 0.85rem; color: #888; margin-top: 0.3rem;">Tribe ID: ${tribeId}</div>
                    </div>
                ` : ''}

                <div style="background: rgba(100,0,255,0.2); border: 1px solid rgba(150,0,255,0.3); border-radius: 8px; padding: 1rem; margin: 1.5rem 0;">
                    <div style="color: #0F0; font-weight: 600; margin-bottom: 0.8rem; font-size: 1.1rem;">
                        🧠 Neural Network Live State
                    </div>

                    <div style="font-size: 0.8rem; color: #888; margin-bottom: 0.5rem;">INPUTS (What it perceives):</div>
                    <div id="nn-inputs" style="font-size: 0.75rem; margin-bottom: 1rem;"></div>

                    <div style="font-size: 0.8rem; color: #888; margin-bottom: 0.5rem;">OUTPUTS (Brain's decisions):</div>
                    <div id="nn-outputs" style="font-size: 0.75rem;"></div>

                    <div style="font-size: 0.7rem; color: #666; margin-top: 0.8rem; padding-top: 0.8rem; border-top: 1px solid rgba(255,255,255,0.1); font-style: italic;">
                        🧠 Neural network controlling all decisions autonomously
                    </div>
                </div>
            `}
        `;

        this.neuralNetworkPanel.innerHTML = statsHTML;

        // Re-add close button
        const newCloseBtn = document.createElement('button');
        newCloseBtn.textContent = 'Close';
        newCloseBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            padding: 8px 16px;
            background: rgba(0, 255, 0, 0.2);
            border: 1px solid #0F0;
            color: #0F0;
            cursor: pointer;
            border-radius: 4px;
        `;
        newCloseBtn.onclick = () => this.deselectOrganism();
        this.neuralNetworkPanel.appendChild(newCloseBtn);

        // If not a plant, animate the neural network values
        if (type !== 0) {
            this.animateNeuralNetworkValues(id, type);
        }
    }

    hideNeuralNetworkPanel() {
        if (this.neuralNetworkPanel) {
            document.body.removeChild(this.neuralNetworkPanel);
            this.neuralNetworkPanel = null;
        }
    }

    animateNeuralNetworkValues(id, type) {
        const animate = () => {
            if (!this.neuralNetworkPanel || this.selectedOrganism !== id) return;

            // Get fresh organism data
            const data = this.wasmModule.getOrganismData();
            if (!data) return;

            // The id IS the organism index
            const organismIndex = id;

            // Validate
            if (organismIndex < 0 || organismIndex >= data.count || !data.alive[organismIndex]) {
                return;
            }

            const energy = data.energies[organismIndex];
            const health = data.healths[organismIndex];

            // Simulate neural network inputs (these would ideally come from WASM)
            const nnInputs = [
                energy / 100,
                health / 100,
                Math.random(), // Food nearby (placeholder)
                Math.random(), // Predator nearby (placeholder)
                Math.random(), // Prey nearby (placeholder)
                0.5, // Age (placeholder)
                0.3, // Social density (placeholder)
                0.2  // Generation (placeholder)
            ];

            // Simulate neural network outputs (placeholder values)
            const nnOutputs = [
                Math.random() * 2 - 1, // MoveX
                Math.random() * 2 - 1, // MoveY
                Math.random() * 2 - 1, // MoveZ
                Math.random(), // Speed
                data.eating[organismIndex] ? 1.0 : 0.0, // Eat
                data.attacking[organismIndex] ? 1.0 : 0.0, // Attack
                Math.random(), // Reproduce
                Math.random() * 2 - 1 // Social
            ];

            // Update inputs display
            const inputsDiv = document.getElementById('nn-inputs');
            if (inputsDiv) {
                inputsDiv.innerHTML = `
                    <div style="display: flex; justify-content: space-between; margin: 0.3rem 0;">
                        <span style="color: #888;">Energy:</span>
                        <span style="color: ${nnInputs[0] > 0.7 ? '#0f0' : nnInputs[0] > 0.3 ? '#ff0' : '#f00'};">${(nnInputs[0] * 100).toFixed(0)}%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 0.3rem 0;">
                        <span style="color: #888;">Health:</span>
                        <span style="color: ${nnInputs[1] > 0.7 ? '#0f0' : nnInputs[1] > 0.3 ? '#ff0' : '#f00'};">${(nnInputs[1] * 100).toFixed(0)}%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 0.3rem 0;">
                        <span style="color: #888;">Food Nearby:</span>
                        <span style="color: ${nnInputs[2] > 0.5 ? '#0f0' : nnInputs[2] > 0.2 ? '#ff0' : '#888'};">${(nnInputs[2] * 100).toFixed(0)}%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 0.3rem 0;">
                        <span style="color: #888;">Predator Nearby:</span>
                        <span style="color: ${nnInputs[3] > 0.5 ? '#f00' : nnInputs[3] > 0.2 ? '#ff0' : '#0f0'};">${(nnInputs[3] * 100).toFixed(0)}%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 0.3rem 0;">
                        <span style="color: #888;">Prey Nearby:</span>
                        <span style="color: ${nnInputs[4] > 0.5 ? '#0f0' : '#888'};">${(nnInputs[4] * 100).toFixed(0)}%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 0.3rem 0;">
                        <span style="color: #888;">Age:</span>
                        <span style="color: #8af;">${(nnInputs[5] * 100).toFixed(0)}%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 0.3rem 0;">
                        <span style="color: #888;">Social Density:</span>
                        <span style="color: #8af;">${(nnInputs[6] * 100).toFixed(0)}%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 0.3rem 0;">
                        <span style="color: #888;">Generation:</span>
                        <span style="color: #8af;">${(nnInputs[7] * 100).toFixed(0)}%</span>
                    </div>
                `;
            }

            // Update outputs display
            const outputsDiv = document.getElementById('nn-outputs');
            if (outputsDiv) {
                outputsDiv.innerHTML = `
                    <div style="background: rgba(0,255,0,0.05); border-left: 2px solid rgba(0,255,0,0.3); padding: 0.5rem; margin: 0.5rem 0;">
                        <div style="color: #888; margin-bottom: 0.3rem; font-weight: 600;">Movement (3D direction):</div>
                        <div style="display: flex; justify-content: space-between; margin: 0.2rem 0;">
                            <span>X:</span>
                            <span style="color: ${nnOutputs[0] > 0 ? '#0f0' : '#f88'};">${nnOutputs[0] > 0 ? '+' : ''}${(nnOutputs[0] * 100).toFixed(0)}%</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin: 0.2rem 0;">
                            <span>Y:</span>
                            <span style="color: ${nnOutputs[1] > 0 ? '#0f0' : '#f88'};">${nnOutputs[1] > 0 ? '+' : ''}${(nnOutputs[1] * 100).toFixed(0)}%</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin: 0.2rem 0;">
                            <span>Z:</span>
                            <span style="color: ${nnOutputs[2] > 0 ? '#0f0' : '#f88'};">${nnOutputs[2] > 0 ? '+' : ''}${(nnOutputs[2] * 100).toFixed(0)}%</span>
                        </div>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 0.3rem 0;">
                        <span style="color: #888;">Speed Modifier:</span>
                        <span style="color: #0f0;">${(nnOutputs[3] * 100).toFixed(0)}%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 0.3rem 0;">
                        <span style="color: #888;">Should Eat:</span>
                        <span style="color: ${nnOutputs[4] > 0.5 ? '#0f0' : '#f00'};">${nnOutputs[4] > 0.5 ? '✅ YES' : '❌ NO'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 0.3rem 0;">
                        <span style="color: #888;">Should Attack:</span>
                        <span style="color: ${nnOutputs[5] > 0.5 ? '#f00' : '#0f0'};">${nnOutputs[5] > 0.5 ? '⚔️ YES' : '🕊️ NO'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 0.3rem 0;">
                        <span style="color: #888;">Should Reproduce:</span>
                        <span style="color: ${nnOutputs[6] > 0.5 ? '#0f0' : '#888'};">${nnOutputs[6] > 0.5 ? '💚 YES' : '⏸️ NO'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 0.3rem 0;">
                        <span style="color: #888;">Social Behavior:</span>
                        <span style="color: ${Math.abs(nnOutputs[7]) > 0.5 ? '#0af' : '#888'};">${nnOutputs[7] > 0.5 ? '👥 SEEK' : nnOutputs[7] < -0.5 ? '🚶 AVOID' : '😐 NEUTRAL'}</span>
                    </div>
                `;
            }

            requestAnimationFrame(animate);
        };

        animate();
    }

    // Convert flat world position to sphere surface position
    positionOnPlanetSurface(flatX, flatZ, objectHeight = 0) {
        const worldSize = 100;
        const normalizedX = flatX / worldSize;
        const normalizedZ = flatZ / worldSize;

        const longitude = normalizedX * Math.PI * 2;
        const latitude = normalizedZ * Math.PI - Math.PI / 2;

        // Get normalized direction on sphere
        const nx = Math.cos(latitude) * Math.cos(longitude);
        const ny = Math.sin(latitude);
        const nz = Math.cos(latitude) * Math.sin(longitude);

        // Use the ACTUAL terrain height function (same as planet generation)
        const terrainHeight = this.getTerrainHeight(nx, ny, nz);
        const isLand = terrainHeight > 0.5;

        // Position directly ON the terrain surface with minimal offset
        // objectHeight is half the object's height to place its base on ground
        const surfaceHeight = isLand ? terrainHeight : 0.5; // Water level at 0.5
        const surfaceRadius = PLANET_RADIUS + surfaceHeight + objectHeight;

        const x = surfaceRadius * nx;
        const y = surfaceRadius * ny;
        const z = surfaceRadius * nz;

        const position = new THREE.Vector3(x, y, z);

        // Calculate orientation (face outward from planet center)
        const normal = position.clone().normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            normal
        );

        return { position, quaternion, isLand, terrainHeight };
    }

    // Find a valid land position for spawning
    findLandPosition() {
        const maxAttempts = 100;
        for (let i = 0; i < maxAttempts; i++) {
            const flatX = (Math.random() - 0.5) * 90;
            const flatZ = (Math.random() - 0.5) * 90;
            const result = this.positionOnPlanetSurface(flatX, flatZ);
            if (result.isLand) {
                return { flatX, flatZ, ...result };
            }
        }
        // Fallback - return any position
        return { flatX: 0, flatZ: 0, ...this.positionOnPlanetSurface(0, 0) };
    }

    update() {
        // Get organism data from WASM
        const data = this.wasmModule.getOrganismData();
        if (!data) return;

        const currentIds = new Set();

        // Update organism meshes
        for (let i = 0; i < data.count; i++) {
            const id = i;
            currentIds.add(id);

            if (!data.alive[i]) {
                this.removeOrganism(id);
                continue;
            }

            const orgType = data.types[i];
            let mesh = this.organisms.get(id);

            // Check if mesh exists AND type matches - recreate if type changed (slot reuse)
            if (mesh && mesh.userData.organismType !== orgType) {
                this.removeOrganism(id);
                mesh = null;
            }

            if (!mesh) {
                mesh = this.createOrganismMesh(orgType);
                mesh.userData.organismId = id;
                mesh.userData.organismType = orgType;
                this.organisms.set(id, mesh);
                this.planetGroup.add(mesh);

                // Initialize animation state
                this.animationSystem.initAnimationState(id, orgType);

                // Initialize plant growth data for plants
                if (orgType === 0) {
                    const plantType = mesh.userData.plantType || 1; // Default to tree
                    const maxGrowth = plantType === 1 ? 1.5 : 1.0; // Trees grow more
                    this.plantData.set(id, {
                        age: 0,
                        growth: 0.3 + Math.random() * 0.3, // Start at 30-60% grown
                        maxGrowth: maxGrowth,
                        canSeed: plantType === 1 || plantType === 2, // Trees and bushes can seed
                        seedTimer: Math.random() * this.SEED_INTERVAL,
                        plantType: plantType,
                        flatX: data.positionsX[i],
                        flatZ: data.positionsZ[i]
                    });
                }
            }

            // Position on planet surface
            let flatX = data.positionsX[i];
            let flatZ = data.positionsZ[i];

            // Determine object height offset for proper ground placement
            // This lifts the object's origin above terrain so feet/base touch ground
            // NOTE: ORGANISM_SCALE (1.25) is applied to meshes, so local y=-1.0 becomes world y=-1.25
            // Plants: trunk base at y=0 in model, no offset needed
            // Herbivores/Carnivores: legs extend to local y=-1.0, world y=-1.25, need lift of 1.25
            // Humanoids: legs extend to local y=-0.95, world y=-1.2, need lift of ~1.2
            const objectHeights = {
                0: -0.2,  // Plant - slight push into ground to ensure grounding after scaling
                1: 1.25,  // Herbivore - legs extend to world y=-1.25, lift so feet touch ground
                2: 1.25,  // Carnivore - legs extend to world y=-1.25, lift so feet touch ground
                3: 1.2    // Humanoid - legs extend to world y=-1.2, lift so feet touch ground
            };
            const objectHeight = objectHeights[orgType] || 0.5;

            // Get terrain info at this position
            let { position, quaternion, isLand } = this.positionOnPlanetSurface(flatX, flatZ, objectHeight);

            // Skip rendering plants that ended up in water (don't render them)
            if (orgType === 0 && !isLand) {
                mesh.visible = false;
                continue;
            }

            // Water avoidance for non-plants: prevent organisms from entering water
            if (orgType !== 0) {
                let needsPositionUpdate = false;

                // If in water, strongly push toward land
                if (!isLand) {
                    let bestLandDir = null;
                    let bestLandDist = Infinity;

                    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                        for (let radius = 2; radius <= 20; radius += 2) {
                            const testX = flatX + Math.cos(angle) * radius;
                            const testZ = flatZ + Math.sin(angle) * radius;
                            const testInfo = this.positionOnPlanetSurface(testX, testZ);
                            if (testInfo.isLand && radius < bestLandDist) {
                                bestLandDist = radius;
                                bestLandDir = { x: testX - flatX, z: testZ - flatZ };
                            }
                        }
                    }

                    if (bestLandDir) {
                        const pushStrength = 1.5; // Strong push to get out of water quickly
                        const len = Math.sqrt(bestLandDir.x ** 2 + bestLandDir.z ** 2);
                        flatX += (bestLandDir.x / len) * pushStrength;
                        flatZ += (bestLandDir.z / len) * pushStrength;
                        needsPositionUpdate = true;
                    }
                } else {
                    // On land - check if moving toward water and redirect
                    if (data.velocitiesX && data.velocitiesZ) {
                        const vx = data.velocitiesX[i] || 0;
                        const vz = data.velocitiesZ[i] || 0;
                        const speed = Math.sqrt(vx * vx + vz * vz);

                        if (speed > 0.1) {
                            // Check position ahead based on velocity
                            const lookAhead = 3.0; // How far ahead to check
                            const futureX = flatX + (vx / speed) * lookAhead;
                            const futureZ = flatZ + (vz / speed) * lookAhead;
                            const futureInfo = this.positionOnPlanetSurface(futureX, futureZ);

                            // If heading toward water, redirect velocity
                            if (!futureInfo.isLand) {
                                // Find a safe direction to redirect to
                                let bestSafeDir = null;
                                let bestAngleDiff = Infinity;
                                const currentAngle = Math.atan2(vz, vx);

                                for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
                                    const testX = flatX + Math.cos(angle) * lookAhead;
                                    const testZ = flatZ + Math.sin(angle) * lookAhead;
                                    const testInfo = this.positionOnPlanetSurface(testX, testZ);

                                    if (testInfo.isLand) {
                                        // Prefer directions closest to original heading
                                        let angleDiff = Math.abs(angle - currentAngle);
                                        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
                                        if (angleDiff < bestAngleDiff) {
                                            bestAngleDiff = angleDiff;
                                            bestSafeDir = { x: Math.cos(angle), z: Math.sin(angle) };
                                        }
                                    }
                                }

                                // Redirect velocity toward safe direction
                                if (bestSafeDir && this.wasmModule.setOrganismVelocity) {
                                    const newVx = bestSafeDir.x * speed;
                                    const newVz = bestSafeDir.z * speed;
                                    this.wasmModule.setOrganismVelocity(i, newVx, 0, newVz);
                                }
                            }
                        }
                    }
                }

                // Write corrected position back to WASM
                if (needsPositionUpdate && this.wasmModule.setOrganismPosition) {
                    this.wasmModule.setOrganismPosition(i, flatX, data.positionsY[i], flatZ);
                    const adjusted = this.positionOnPlanetSurface(flatX, flatZ, objectHeight);
                    position = adjusted.position;
                    quaternion = adjusted.quaternion;
                }
            }

            // Smooth position interpolation to prevent jerky movement
            if (mesh.userData.hasPosition) {
                const lerpFactor = 0.15; // Smooth interpolation (lower = smoother but more lag)
                mesh.position.lerp(position, lerpFactor);
            } else {
                mesh.position.copy(position);
                mesh.userData.hasPosition = true;
            }

            // Calculate orientation based on movement direction (for non-plants)
            if (orgType !== 0) {
                const prevPos = this.previousPositions.get(id);
                if (prevPos) {
                    // Calculate movement direction on the sphere surface
                    const moveVec = new THREE.Vector3().subVectors(position, prevPos);
                    const moveDist = moveVec.length();

                    // Update animation state based on movement
                    this.animationSystem.updateAnimationState(id, moveDist > 0.01, moveDist);

                    // Only update orientation if moving significantly
                    if (moveDist > 0.01) {
                        // Get the normal at this position (points outward from planet center)
                        const normal = position.clone().normalize();

                        // Project movement onto the tangent plane (remove the radial component)
                        const radialComponent = normal.clone().multiplyScalar(moveVec.dot(normal));
                        const tangentMove = moveVec.clone().sub(radialComponent);

                        if (tangentMove.length() > 0.001) {
                            // Create orientation: mesh "up" is the normal, "forward" is movement direction
                            const forward = tangentMove.normalize();
                            const right = new THREE.Vector3().crossVectors(normal, forward).normalize();
                            const correctedForward = new THREE.Vector3().crossVectors(right, normal).normalize();

                            // Build rotation matrix
                            const rotMatrix = new THREE.Matrix4();
                            rotMatrix.makeBasis(right, normal, correctedForward);

                            // Convert to quaternion and apply with smoothing
                            const targetQuat = new THREE.Quaternion().setFromRotationMatrix(rotMatrix);

                            // Smooth interpolation toward target orientation
                            if (mesh.userData.targetQuat) {
                                mesh.quaternion.slerp(targetQuat, 0.15);
                            } else {
                                mesh.quaternion.copy(targetQuat);
                            }
                            mesh.userData.targetQuat = targetQuat.clone();
                        }
                    } else {
                        // Not moving much - keep existing orientation but still stand on surface
                        if (!mesh.userData.targetQuat) {
                            mesh.quaternion.copy(quaternion);
                        }
                    }
                } else {
                    // First frame - use default surface orientation
                    mesh.quaternion.copy(quaternion);
                }

                // Store current smoothed position for next frame's direction calculation
                this.previousPositions.set(id, mesh.position.clone());
            } else {
                // Plants just use surface orientation
                mesh.quaternion.copy(quaternion);
            }

            // Scale based on health (don't change color - it breaks type identification)
            const health = data.healths ? data.healths[i] : 100;
            const healthScale = 0.8 + (health / 100) * 0.4; // 0.8 to 1.2 scale
            mesh.scale.setScalar(ORGANISM_SCALE * healthScale);
        }

        // Update humanoid behaviors (chopping, mining, building)
        this.updateHumanoidBehaviors(data);

        // Update plant growth and seeding
        this.updatePlants(data, 1/60); // Assuming ~60fps

        // Update fire system
        this.updateFires(1/60);

        // Remove organisms that no longer exist
        for (const [id, mesh] of this.organisms) {
            if (!currentIds.has(id)) {
                this.removeOrganism(id);
            }
        }
    }

    updateHumanoidBehaviors(data) {
        // Check each humanoid for nearby resources/trees and update their activity
        for (let i = 0; i < data.count; i++) {
            if (!data.alive[i]) continue;
            if (data.types[i] !== 3) continue; // Only humanoids

            const isAttacking = data.attacking[i];
            const mesh = this.organisms.get(i);
            if (!mesh) continue;

            const humanoidPos = mesh.position.clone();
            let activity = this.humanoidActivities.get(i);

            // Check what's nearby if humanoid is in attack mode
            if (isAttacking) {
                let foundTarget = false;

                // Check for nearby trees (plants that are trees)
                for (const [plantId, plantMesh] of this.organisms) {
                    if (data.types[plantId] !== 0) continue; // Only plants
                    if (!data.alive[plantId]) continue;

                    const dist = humanoidPos.distanceTo(plantMesh.position);
                    if (dist < 5) {
                        // Found a tree to chop!
                        if (!activity || activity.activity !== 'chopping' || activity.target !== plantId) {
                            activity = {
                                activity: 'chopping',
                                target: plantId,
                                progress: 0,
                                lastEffectTime: 0
                            };
                            this.humanoidActivities.set(i, activity);
                        }
                        foundTarget = true;

                        // Update chopping progress
                        activity.progress += 0.5;

                        // Create chopping effect every few frames
                        if (Date.now() - activity.lastEffectTime > 300) {
                            this.createChoppingEffect(plantMesh.position);
                            activity.lastEffectTime = Date.now();
                        }

                        // Tree falls after enough chopping
                        if (activity.progress > 100) {
                            const tribeId = data.tribeIds[i];
                            this.harvestTree(plantId, i);
                            // Add wood to tribe resources
                            if (tribeId !== 0xFFFFFFFF) {
                                this.addTribeResource(tribeId, this.RESOURCE_TYPES.WOOD, 15);
                                console.log(`[Renderer] Tribe ${tribeId} gained 15 wood`);
                            }
                            this.humanoidActivities.delete(i);
                        }
                        break;
                    }
                }

                // If no tree, check for resources to mine
                if (!foundTarget) {
                    for (const [resId, resource] of this.resources) {
                        if (resource.amount <= 0) continue;

                        const dist = humanoidPos.distanceTo(resource.mesh.position);
                        if (dist < 5) {
                            // Found a resource to mine!
                            if (!activity || activity.activity !== 'mining' || activity.target !== resId) {
                                activity = {
                                    activity: 'mining',
                                    target: resId,
                                    progress: 0,
                                    lastEffectTime: 0
                                };
                                this.humanoidActivities.set(i, activity);
                            }
                            foundTarget = true;

                            // Update mining progress
                            activity.progress += 0.3;

                            // Create mining spark effect
                            if (Date.now() - activity.lastEffectTime > 200) {
                                this.createMiningEffect(resource.mesh.position, resource.type);
                                activity.lastEffectTime = Date.now();
                            }

                            // Extract resource
                            if (activity.progress > 50) {
                                resource.amount -= 10;
                                activity.progress = 0;

                                // Add resource to tribe
                                const tribeId = data.tribeIds[i];
                                if (tribeId !== 0xFFFFFFFF) {
                                    this.addTribeResource(tribeId, resource.type, 10);
                                    const typeNames = ['wood', 'stone', 'gold', 'iron'];
                                    console.log(`[Renderer] Tribe ${tribeId} gained 10 ${typeNames[resource.type]}`);
                                }

                                // Remove depleted resource
                                if (resource.amount <= 0) {
                                    this.planetGroup.remove(resource.mesh);
                                    this.resources.delete(resId);
                                    this.humanoidActivities.delete(i);
                                }
                            }
                            break;
                        }
                    }
                }

                // If no resource or tree, try to build (if tribe has resources)
                if (!foundTarget && (!activity || activity.activity !== 'building')) {
                    const tribeId = data.tribeIds[i];
                    // 2% chance to attempt building when attacking with no target
                    if (tribeId !== 0xFFFFFFFF && Math.random() < 0.02) {
                        const flatX = data.positionsX[i];
                        const flatZ = data.positionsZ[i];

                        // Pick building type based on what tribe can afford
                        const buildingTypes = ['hut', 'storage', 'workshop', 'farm', 'barracks'];
                        const affordableTypes = buildingTypes.filter(type =>
                            this.canAffordBuilding(tribeId, type)
                        );

                        if (affordableTypes.length > 0) {
                            // Weighted selection - huts more common
                            let buildType;
                            if (affordableTypes.includes('hut') && Math.random() < 0.5) {
                                buildType = 'hut';
                            } else {
                                buildType = affordableTypes[Math.floor(Math.random() * affordableTypes.length)];
                            }

                            const result = this.tryBuild(flatX, flatZ, tribeId, buildType);
                            if (result) {
                                console.log(`[Renderer] Humanoid ${i} built a ${buildType}!`);
                            }
                        }
                    }
                }
            } else {
                // Not attacking - clear activity
                if (activity) {
                    this.humanoidActivities.delete(i);
                }
            }
        }

        // Update existing effects
        this.updateActivityEffects();
    }

    createChoppingEffect(position) {
        // Create wood chip particles
        const particleCount = 5;
        const particles = new THREE.Group();

        for (let i = 0; i < particleCount; i++) {
            const chip = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.05, 0.15),
                new THREE.MeshStandardMaterial({
                    color: 0x8B4513,
                    roughness: 0.9
                })
            );
            chip.position.copy(position);
            chip.position.add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                Math.random() * 0.5 + 0.5,
                (Math.random() - 0.5) * 0.5
            ));
            chip.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            chip.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                Math.random() * 0.05,
                (Math.random() - 0.5) * 0.1
            );
            chip.userData.life = 1.0;
            particles.add(chip);
        }

        this.planetGroup.add(particles);
        particles.userData.isEffect = true;
        particles.userData.createdAt = Date.now();

        // Store for cleanup
        const effectId = Date.now() + Math.random();
        this.activityEffects.set(effectId, particles);
    }

    createMiningEffect(position, resourceType) {
        // Create spark particles
        const particleCount = 8;
        const particles = new THREE.Group();

        let color = 0xFFFFFF;
        if (resourceType === this.RESOURCE_TYPES.GOLD) color = 0xFFD700;
        else if (resourceType === this.RESOURCE_TYPES.IRON) color = 0xFF6600;

        for (let i = 0; i < particleCount; i++) {
            const spark = new THREE.Mesh(
                new THREE.SphereGeometry(0.05, 4, 4),
                new THREE.MeshStandardMaterial({
                    color: color,
                    emissive: color,
                    emissiveIntensity: 1.0
                })
            );
            spark.position.copy(position);
            spark.position.add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                Math.random() * 0.3 + 0.3,
                (Math.random() - 0.5) * 0.3
            ));
            spark.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.15,
                Math.random() * 0.1,
                (Math.random() - 0.5) * 0.15
            );
            spark.userData.life = 1.0;
            particles.add(spark);
        }

        this.planetGroup.add(particles);
        particles.userData.isEffect = true;
        particles.userData.createdAt = Date.now();

        const effectId = Date.now() + Math.random();
        this.activityEffects.set(effectId, particles);
    }

    updateActivityEffects() {
        // Update and remove old particle effects
        const now = Date.now();
        for (const [effectId, particles] of this.activityEffects) {
            const age = now - particles.userData.createdAt;

            if (age > 1000) {
                // Remove old effects
                this.planetGroup.remove(particles);
                this.activityEffects.delete(effectId);
            } else {
                // Update particle positions
                const fadeOut = 1 - (age / 1000);
                particles.children.forEach(particle => {
                    if (particle.userData.velocity) {
                        particle.position.add(particle.userData.velocity);
                        particle.userData.velocity.y -= 0.002; // Gravity
                    }
                    particle.material.opacity = fadeOut;
                    particle.material.transparent = true;
                });
            }
        }
    }

    updatePlants(data, deltaSeconds) {
        // Update each plant's growth and check for seeding
        for (const [id, plantInfo] of this.plantData) {
            const mesh = this.organisms.get(id);
            if (!mesh || !data.alive[id]) {
                this.plantData.delete(id);
                continue;
            }

            // Age the plant
            plantInfo.age += deltaSeconds;

            // Grow the plant (slower as it reaches max)
            if (plantInfo.growth < plantInfo.maxGrowth) {
                const growthFactor = 1 - (plantInfo.growth / plantInfo.maxGrowth);
                plantInfo.growth += this.GROWTH_RATE * deltaSeconds * growthFactor;
                plantInfo.growth = Math.min(plantInfo.growth, plantInfo.maxGrowth);

                // Apply growth scale to mesh
                const growthScale = 0.3 + plantInfo.growth * 0.7; // 30% to 100%+ scale
                mesh.scale.setScalar(ORGANISM_SCALE * growthScale);
            }

            // Check for seeding (only mature plants)
            if (plantInfo.canSeed && plantInfo.growth > 0.8) {
                plantInfo.seedTimer -= deltaSeconds;

                if (plantInfo.seedTimer <= 0) {
                    plantInfo.seedTimer = this.SEED_INTERVAL + Math.random() * 10;

                    // Try to spawn a seed nearby
                    this.trySpawnSeed(plantInfo);
                }
            }
        }
    }

    trySpawnSeed(parentPlant) {
        // Count nearby plants to prevent overcrowding
        let nearbyCount = 0;
        for (const [id, otherPlant] of this.plantData) {
            const dx = parentPlant.flatX - otherPlant.flatX;
            const dz = parentPlant.flatZ - otherPlant.flatZ;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < this.SEED_RADIUS) {
                nearbyCount++;
            }
        }

        if (nearbyCount >= this.MAX_PLANTS_NEARBY) {
            return; // Too crowded
        }

        // Random position within seed radius
        const angle = Math.random() * Math.PI * 2;
        const distance = 2 + Math.random() * (this.SEED_RADIUS - 2);
        const newX = parentPlant.flatX + Math.cos(angle) * distance;
        const newZ = parentPlant.flatZ + Math.sin(angle) * distance;

        // Check if on land
        const pos = this.positionOnPlanetSurface(newX, newZ, 0);
        if (!pos.isLand) {
            return; // Can't seed in water
        }

        // Spawn the new plant via WASM
        const NO_TRIBE = 0xFFFFFFFF;
        const success = this.wasmModule.spawnOrganism(0, newX, 0.5, newZ, NO_TRIBE);

        if (success) {
            console.log(`[Renderer] Plant seeded at (${newX.toFixed(1)}, ${newZ.toFixed(1)})`);
        }
    }

    harvestTree(plantId, humanoidId) {
        // Tree has been chopped - remove it and maybe spawn wood resource
        const plantMesh = this.organisms.get(plantId);
        if (plantMesh) {
            // Create falling tree effect
            const fallDir = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
            const startQuat = plantMesh.quaternion.clone();

            // Animate fall over time
            let fallProgress = 0;
            const fallInterval = setInterval(() => {
                fallProgress += 0.05;
                if (fallProgress >= 1) {
                    clearInterval(fallInterval);
                    this.planetGroup.remove(plantMesh);
                    this.organisms.delete(plantId);
                } else {
                    // Rotate tree to fall
                    plantMesh.rotateOnAxis(fallDir, 0.05);
                    plantMesh.scale.multiplyScalar(0.98);
                }
            }, 50);

            console.log(`[Renderer] Tree ${plantId} harvested by humanoid ${humanoidId}`);
        }
    }

    // Check if a building can be placed at this location (no overlap)
    canBuildAt(flatX, flatZ) {
        for (const [id, building] of this.buildings) {
            const dx = flatX - building.flatX;
            const dz = flatZ - building.flatZ;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < this.BUILDING_RADIUS * 2) {
                return false; // Too close to existing building
            }
        }
        return true;
    }

    // Get or initialize tribe resources
    getTribeResources(tribeId) {
        if (!this.tribeResources.has(tribeId)) {
            this.tribeResources.set(tribeId, { wood: 0, stone: 0, gold: 0, iron: 0 });
        }
        return this.tribeResources.get(tribeId);
    }

    // Add resources to a tribe
    addTribeResource(tribeId, resourceType, amount) {
        const resources = this.getTribeResources(tribeId);
        const typeNames = ['wood', 'stone', 'gold', 'iron'];
        const typeName = typeNames[resourceType] || 'wood';
        resources[typeName] += amount;
    }

    // Check if tribe can afford a building
    canAffordBuilding(tribeId, buildingType) {
        const resources = this.getTribeResources(tribeId);
        const cost = this.BUILDING_COSTS[buildingType] || this.BUILDING_COSTS.hut;

        for (const [resource, amount] of Object.entries(cost)) {
            if ((resources[resource] || 0) < amount) {
                return false;
            }
        }
        return true;
    }

    // Deduct building cost from tribe
    deductBuildingCost(tribeId, buildingType) {
        const resources = this.getTribeResources(tribeId);
        const cost = this.BUILDING_COSTS[buildingType] || this.BUILDING_COSTS.hut;

        for (const [resource, amount] of Object.entries(cost)) {
            resources[resource] -= amount;
        }
    }

    // Try to build - returns true if successful
    tryBuild(flatX, flatZ, tribeId, buildingType = 'hut') {
        // Check spacing
        if (!this.canBuildAt(flatX, flatZ)) {
            return null;
        }

        // Check resources
        if (!this.canAffordBuilding(tribeId, buildingType)) {
            return null;
        }

        // Deduct cost and build
        this.deductBuildingCost(tribeId, buildingType);
        return this.createBuilding(flatX, flatZ, tribeId, buildingType);
    }

    createBuilding(flatX, flatZ, tribeId, buildingType = 'hut') {
        const buildingGroup = new THREE.Group();
        const buildingId = Date.now() + Math.random();

        // Building scale
        const scale = 1.5;

        // Building capacity for each type
        const capacityMap = { hut: 4, storage: 0, workshop: 2, farm: 0, barracks: 8 };
        const capacity = capacityMap[buildingType] || 4;

        // Create unique building based on type
        switch (buildingType) {
            case 'farm':
                this.createFarmBuilding(buildingGroup, scale);
                break;
            case 'storage':
                this.createStorageBuilding(buildingGroup, scale);
                break;
            case 'workshop':
                this.createWorkshopBuilding(buildingGroup, scale);
                break;
            case 'barracks':
                this.createBarracksBuilding(buildingGroup, scale);
                break;
            case 'hut':
            default:
                this.createHutBuilding(buildingGroup, scale);
                break;
        }

        // Position on planet surface
        const surfaceInfo = this.positionOnPlanetSurface(flatX, flatZ, 0);
        buildingGroup.position.copy(surfaceInfo.position);
        buildingGroup.quaternion.copy(surfaceInfo.quaternion);

        // Store building data for click detection
        buildingGroup.userData.isBuilding = true;
        buildingGroup.userData.buildingId = buildingId;
        buildingGroup.userData.buildingType = buildingType;
        buildingGroup.userData.tribeId = tribeId;

        // Make all children raycastable
        buildingGroup.traverse(child => {
            if (child.isMesh) {
                child.userData.isBuilding = true;
                child.userData.buildingId = buildingId;
            }
        });

        this.planetGroup.add(buildingGroup);

        // Store building data with stats
        this.buildings.set(buildingId, {
            mesh: buildingGroup,
            tribeId: tribeId,
            type: buildingType,
            flatX: flatX,
            flatZ: flatZ,
            createdAt: Date.now(),
            health: 100,
            capacity: capacity,
            occupants: [],
            resources: { wood: 0, stone: 0, gold: 0, iron: 0 }
        });

        const cost = this.BUILDING_COSTS[buildingType] || this.BUILDING_COSTS.hut;
        console.log(`[Renderer] ${buildingType} built for tribe ${tribeId} (cost: ${JSON.stringify(cost)})`);
        return buildingId;
    }

    // === UNIQUE BUILDING CREATION METHODS ===

    createHutBuilding(group, scale) {
        // Round thatched hut with cone roof
        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(1.8 * scale, 2.0 * scale, 0.3, 12),
            new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.95 })
        );
        base.position.y = 0.15;
        base.castShadow = true;
        group.add(base);

        const walls = new THREE.Mesh(
            new THREE.CylinderGeometry(1.5 * scale, 1.7 * scale, 2.0 * scale, 12),
            new THREE.MeshStandardMaterial({ color: 0xCD853F, roughness: 0.85 })
        );
        walls.position.y = 1.0 * scale + 0.3;
        walls.castShadow = true;
        group.add(walls);

        const roof = new THREE.Mesh(
            new THREE.ConeGeometry(2.2 * scale, 1.5 * scale, 12),
            new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.95 })
        );
        roof.position.y = 2.0 * scale + 0.75 * scale + 0.3;
        roof.castShadow = true;
        group.add(roof);

        // Door
        const door = new THREE.Mesh(
            new THREE.BoxGeometry(0.6 * scale, 1.3 * scale, 0.2),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
        );
        door.position.set(0, 0.65 * scale + 0.3, 1.65 * scale);
        group.add(door);
    }

    createFarmBuilding(group, scale) {
        // Open farm structure - no walls, just fenced area with crops

        // Dirt plot base
        const plot = new THREE.Mesh(
            new THREE.BoxGeometry(4 * scale, 0.15, 4 * scale),
            new THREE.MeshStandardMaterial({ color: 0x5C4033, roughness: 1.0 })
        );
        plot.position.y = 0.075;
        plot.castShadow = true;
        group.add(plot);

        // Wooden fence posts around perimeter
        const fencePositions = [
            [-2, 0, -2], [0, 0, -2], [2, 0, -2],
            [-2, 0, 2], [0, 0, 2], [2, 0, 2],
            [-2, 0, 0], [2, 0, 0]
        ];
        for (const [x, _, z] of fencePositions) {
            const post = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08 * scale, 0.1 * scale, 1.0 * scale, 6),
                new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 })
            );
            post.position.set(x * scale, 0.5 * scale, z * scale);
            post.castShadow = true;
            group.add(post);
        }

        // Horizontal fence rails
        const railMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 });
        for (const z of [-2, 2]) {
            const rail = new THREE.Mesh(
                new THREE.BoxGeometry(4 * scale, 0.1 * scale, 0.08 * scale),
                railMaterial
            );
            rail.position.set(0, 0.6 * scale, z * scale);
            group.add(rail);
        }

        // Crop rows (green rectangles representing plants)
        for (let row = -1; row <= 1; row++) {
            for (let col = -1; col <= 1; col++) {
                const crop = new THREE.Mesh(
                    new THREE.BoxGeometry(0.6 * scale, 0.4 * scale, 0.6 * scale),
                    new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.8 })
                );
                crop.position.set(col * 1.0 * scale, 0.35, row * 1.0 * scale);
                crop.castShadow = true;
                group.add(crop);
            }
        }

        // Small shed in corner
        const shed = new THREE.Mesh(
            new THREE.BoxGeometry(0.8 * scale, 0.8 * scale, 0.8 * scale),
            new THREE.MeshStandardMaterial({ color: 0xA0522D, roughness: 0.9 })
        );
        shed.position.set(1.5 * scale, 0.4 * scale, -1.5 * scale);
        shed.castShadow = true;
        group.add(shed);

        const shedRoof = new THREE.Mesh(
            new THREE.ConeGeometry(0.6 * scale, 0.4 * scale, 4),
            new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.9 })
        );
        shedRoof.position.set(1.5 * scale, 0.9 * scale, -1.5 * scale);
        shedRoof.rotation.y = Math.PI / 4;
        group.add(shedRoof);
    }

    createStorageBuilding(group, scale) {
        // Large rectangular warehouse
        const base = new THREE.Mesh(
            new THREE.BoxGeometry(3.5 * scale, 0.3, 2.5 * scale),
            new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.95 })
        );
        base.position.y = 0.15;
        base.castShadow = true;
        group.add(base);

        // Wooden walls (box shape)
        const walls = new THREE.Mesh(
            new THREE.BoxGeometry(3.2 * scale, 2.0 * scale, 2.2 * scale),
            new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.85 })
        );
        walls.position.y = 1.0 * scale + 0.3;
        walls.castShadow = true;
        group.add(walls);

        // Sloped roof
        const roofGeom = new THREE.BoxGeometry(3.6 * scale, 0.3 * scale, 2.6 * scale);
        const roof = new THREE.Mesh(
            roofGeom,
            new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.9 })
        );
        roof.position.y = 2.15 * scale;
        roof.castShadow = true;
        group.add(roof);

        // Large door
        const door = new THREE.Mesh(
            new THREE.BoxGeometry(1.0 * scale, 1.5 * scale, 0.2),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
        );
        door.position.set(0, 0.85 * scale, 1.15 * scale);
        group.add(door);

        // Crates outside
        for (let i = 0; i < 4; i++) {
            const crate = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 0.5, 0.5),
                new THREE.MeshStandardMaterial({ color: 0xCD853F, roughness: 0.9 })
            );
            crate.position.set(
                1.8 * scale + (i % 2) * 0.6,
                0.25,
                -0.5 + Math.floor(i / 2) * 0.6
            );
            crate.castShadow = true;
            group.add(crate);
        }
    }

    createWorkshopBuilding(group, scale) {
        // Smithy/workshop with forge
        const base = new THREE.Mesh(
            new THREE.BoxGeometry(2.8 * scale, 0.3, 2.8 * scale),
            new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.95 })
        );
        base.position.y = 0.15;
        base.castShadow = true;
        group.add(base);

        // Stone walls
        const walls = new THREE.Mesh(
            new THREE.BoxGeometry(2.5 * scale, 1.8 * scale, 2.5 * scale),
            new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.9 })
        );
        walls.position.y = 0.9 * scale + 0.3;
        walls.castShadow = true;
        group.add(walls);

        // Flat roof with chimney
        const roof = new THREE.Mesh(
            new THREE.BoxGeometry(2.8 * scale, 0.25 * scale, 2.8 * scale),
            new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.9 })
        );
        roof.position.y = 1.9 * scale;
        roof.castShadow = true;
        group.add(roof);

        // Tall chimney (smokestack)
        const chimney = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3 * scale, 0.35 * scale, 1.2 * scale, 8),
            new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 })
        );
        chimney.position.set(0.8 * scale, 2.5 * scale, 0.8 * scale);
        chimney.castShadow = true;
        group.add(chimney);

        // Anvil outside
        const anvilBase = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.35, 0.4, 8),
            new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.7 })
        );
        anvilBase.position.set(1.8 * scale, 0.2, 0);
        anvilBase.castShadow = true;
        group.add(anvilBase);

        const anvilTop = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.15, 0.25),
            new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.9 })
        );
        anvilTop.position.set(1.8 * scale, 0.47, 0);
        anvilTop.castShadow = true;
        group.add(anvilTop);

        // Door
        const door = new THREE.Mesh(
            new THREE.BoxGeometry(0.8 * scale, 1.4 * scale, 0.2),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
        );
        door.position.set(0, 0.7 * scale + 0.3, 1.3 * scale);
        group.add(door);
    }

    createBarracksBuilding(group, scale) {
        // Large military building
        const base = new THREE.Mesh(
            new THREE.BoxGeometry(4.0 * scale, 0.3, 3.0 * scale),
            new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.95 })
        );
        base.position.y = 0.15;
        base.castShadow = true;
        group.add(base);

        // Stone/wood walls (larger building)
        const walls = new THREE.Mesh(
            new THREE.BoxGeometry(3.6 * scale, 2.2 * scale, 2.6 * scale),
            new THREE.MeshStandardMaterial({ color: 0x8B0000, roughness: 0.85 })
        );
        walls.position.y = 1.1 * scale + 0.3;
        walls.castShadow = true;
        group.add(walls);

        // Peaked roof
        const roofGeom = new THREE.CylinderGeometry(0.1, 2.2 * scale, 1.2 * scale, 4);
        const roof = new THREE.Mesh(
            roofGeom,
            new THREE.MeshStandardMaterial({ color: 0x4a0000, roughness: 0.9 })
        );
        roof.position.y = 2.8 * scale;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        group.add(roof);

        // Flag pole
        const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, 2.0 * scale, 6),
            new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.9 })
        );
        pole.position.set(1.5 * scale, 2.5 * scale, 1.0 * scale);
        pole.castShadow = true;
        group.add(pole);

        // Flag
        const flag = new THREE.Mesh(
            new THREE.PlaneGeometry(0.6 * scale, 0.4 * scale),
            new THREE.MeshStandardMaterial({
                color: 0xCC0000,
                roughness: 0.8,
                side: THREE.DoubleSide
            })
        );
        flag.position.set(1.8 * scale, 3.2 * scale, 1.0 * scale);
        flag.rotation.y = Math.PI / 2;
        group.add(flag);

        // Weapon rack
        const rack = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 1.0, 0.6),
            new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.9 })
        );
        rack.position.set(2.0 * scale, 0.5, -0.8 * scale);
        rack.castShadow = true;
        group.add(rack);

        // Spears on rack
        for (let i = 0; i < 3; i++) {
            const spear = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6),
                new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 })
            );
            spear.position.set(2.0 * scale, 0.5, -0.6 * scale + i * 0.2);
            spear.rotation.x = Math.PI / 12;
            group.add(spear);
        }

        // Large door
        const door = new THREE.Mesh(
            new THREE.BoxGeometry(1.2 * scale, 1.6 * scale, 0.2),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
        );
        door.position.set(0, 0.8 * scale + 0.3, 1.35 * scale);
        group.add(door);
    }

    // Create different plant visuals based on plant type
    createPlantVisual(group, plantType) {
        switch (plantType) {
            case PlantType.GRASS: // 0 - Grass
                this.createGrass(group);
                break;
            case PlantType.TREE: // 1 - Tree
                this.createTree(group);
                break;
            case PlantType.BUSH: // 2 - Bush
                this.createBush(group);
                break;
            case PlantType.FLOWER: // 3 - Flower
                this.createFlower(group);
                break;
            case PlantType.CROP: // 4 - Crop
                this.createCrop(group);
                break;
            default:
                this.createTree(group); // Default to tree
        }
    }

    createGrass(group) {
        // Multiple grass blades
        const grassMaterial = new THREE.MeshStandardMaterial({
            color: 0x44aa33,
            emissive: 0x113311,
            emissiveIntensity: 0.3,
            roughness: 0.9,
            metalness: 0.0,
            side: THREE.DoubleSide
        });

        for (let i = 0; i < 5; i++) {
            const blade = new THREE.Mesh(
                new THREE.PlaneGeometry(0.08, 0.4),
                grassMaterial.clone()
            );
            blade.position.set(
                (Math.random() - 0.5) * 0.3,
                0.2,
                (Math.random() - 0.5) * 0.3
            );
            blade.rotation.y = Math.random() * Math.PI * 2;
            blade.rotation.x = (Math.random() - 0.5) * 0.3;
            blade.userData.isLeaves = true;
            blade.userData.swayOffset = Math.random() * 2;
            group.add(blade);
        }
    }

    createTree(group, sizeMultiplier = null) {
        // Random size variation if not specified (0.5 to 1.5x base size)
        const size = sizeMultiplier !== null ? sizeMultiplier : 0.5 + Math.random() * 1.0;

        // Base tree dimensions (much larger than before)
        // Trees range from ~3 to ~9 units tall (clouds are at 12+ units)
        const baseHeight = 4.0;
        const height = baseHeight * size;
        const trunkRadius = 0.3 * size;
        const trunkHeight = height * 0.5;
        const canopyRadius = 1.5 * size;

        // Trunk color variation
        const trunkColors = [0x4d3319, 0x5d4423, 0x3d2b15, 0x6b4423];
        const trunkColor = trunkColors[Math.floor(Math.random() * trunkColors.length)];

        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(trunkRadius * 0.7, trunkRadius, trunkHeight, 12),
            new THREE.MeshStandardMaterial({
                color: trunkColor,
                roughness: 0.95,
                metalness: 0.0
            })
        );
        trunk.position.y = trunkHeight / 2;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        trunk.userData.isTrunk = true;
        group.add(trunk);

        // Leaf color variation
        const leafColors = [0x228822, 0x2a9a2a, 0x1a7a1a, 0x339933, 0x227722];
        const leafColor = leafColors[Math.floor(Math.random() * leafColors.length)];

        // Canopy layers (more layers for bigger trees)
        const layerCount = Math.max(3, Math.floor(3 + size * 2));
        for (let i = 0; i < layerCount; i++) {
            const layerProgress = i / (layerCount - 1);
            const layerRadius = canopyRadius * (1.0 - layerProgress * 0.5);
            const layerHeight = canopyRadius * 0.5;

            const leaves = new THREE.Mesh(
                new THREE.ConeGeometry(layerRadius, layerHeight, 16),
                new THREE.MeshStandardMaterial({
                    color: leafColor,
                    emissive: 0x112211,
                    emissiveIntensity: 0.3,
                    roughness: 0.8,
                    metalness: 0.0
                })
            );
            leaves.position.y = trunkHeight + layerHeight * 0.3 + i * layerHeight * 0.6;
            leaves.castShadow = true;
            leaves.receiveShadow = true;
            leaves.userData.isLeaves = true;
            leaves.userData.swayOffset = i * 0.5 + Math.random();
            leaves.userData.originalScale = 1.0;
            group.add(leaves);
        }

        // Store tree size for reference
        group.userData.treeSize = size;
        group.userData.treeHeight = height;
    }

    createBush(group) {
        // Round bush with multiple spheres
        const bushMaterial = new THREE.MeshStandardMaterial({
            color: 0x339933,
            emissive: 0x113311,
            emissiveIntensity: 0.3,
            roughness: 0.8,
            metalness: 0.1
        });

        // Main body - multiple overlapping spheres
        const bushPositions = [
            [0, 0.25, 0], [0.15, 0.2, 0.1], [-0.1, 0.22, 0.12],
            [0.05, 0.3, -0.1], [-0.08, 0.28, -0.05]
        ];

        for (const pos of bushPositions) {
            const sphere = new THREE.Mesh(
                new THREE.SphereGeometry(0.2, 12, 8),
                bushMaterial.clone()
            );
            sphere.position.set(pos[0], pos[1], pos[2]);
            sphere.castShadow = true;
            sphere.receiveShadow = true;
            sphere.userData.isLeaves = true;
            sphere.userData.swayOffset = Math.random() * 2;
            group.add(sphere);
        }

        // Some bushes have berries
        if (Math.random() > 0.5) {
            for (let i = 0; i < 4; i++) {
                const berry = new THREE.Mesh(
                    new THREE.SphereGeometry(0.04, 8, 6),
                    new THREE.MeshStandardMaterial({
                        color: 0xff3333,
                        emissive: 0x441111,
                        emissiveIntensity: 0.5
                    })
                );
                berry.position.set(
                    (Math.random() - 0.5) * 0.3,
                    0.25 + Math.random() * 0.1,
                    (Math.random() - 0.5) * 0.3
                );
                group.add(berry);
            }
        }
    }

    createFlower(group) {
        // Stem
        const stem = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.03, 0.3, 8),
            new THREE.MeshStandardMaterial({
                color: 0x228822,
                roughness: 0.8
            })
        );
        stem.position.y = 0.15;
        group.add(stem);

        // Flower head - random color
        const flowerColors = [0xff6699, 0xffff44, 0x9966ff, 0xff9933, 0xff3366, 0x66ccff];
        const flowerColor = flowerColors[Math.floor(Math.random() * flowerColors.length)];

        // Petals
        const petalCount = 5 + Math.floor(Math.random() * 4);
        for (let i = 0; i < petalCount; i++) {
            const petal = new THREE.Mesh(
                new THREE.SphereGeometry(0.08, 8, 6),
                new THREE.MeshStandardMaterial({
                    color: flowerColor,
                    emissive: flowerColor,
                    emissiveIntensity: 0.3,
                    roughness: 0.6
                })
            );
            petal.scale.set(1, 0.5, 0.3);
            const angle = (i / petalCount) * Math.PI * 2;
            petal.position.set(
                Math.cos(angle) * 0.08,
                0.35,
                Math.sin(angle) * 0.08
            );
            petal.rotation.z = angle + Math.PI / 2;
            petal.userData.isLeaves = true;
            petal.userData.swayOffset = i * 0.3;
            group.add(petal);
        }

        // Center
        const center = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 8, 6),
            new THREE.MeshStandardMaterial({
                color: 0xffdd00,
                emissive: 0x886600,
                emissiveIntensity: 0.5
            })
        );
        center.position.y = 0.35;
        group.add(center);
    }

    createCrop(group) {
        // Wheat/crop stalks
        const stalkColor = 0xccaa44;
        const headColor = 0xddbb55;

        // Multiple stalks
        for (let i = 0; i < 3; i++) {
            const stalk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.015, 0.02, 0.4, 6),
                new THREE.MeshStandardMaterial({
                    color: stalkColor,
                    roughness: 0.9
                })
            );
            stalk.position.set(
                (Math.random() - 0.5) * 0.15,
                0.2,
                (Math.random() - 0.5) * 0.15
            );
            stalk.rotation.x = (Math.random() - 0.5) * 0.2;
            stalk.rotation.z = (Math.random() - 0.5) * 0.2;
            stalk.userData.isLeaves = true;
            stalk.userData.swayOffset = i * 0.4;
            group.add(stalk);

            // Wheat head
            const head = new THREE.Mesh(
                new THREE.ConeGeometry(0.04, 0.12, 8),
                new THREE.MeshStandardMaterial({
                    color: headColor,
                    emissive: 0x443300,
                    emissiveIntensity: 0.2,
                    roughness: 0.8
                })
            );
            head.position.copy(stalk.position);
            head.position.y = 0.45;
            head.rotation.copy(stalk.rotation);
            head.userData.isLeaves = true;
            head.userData.swayOffset = i * 0.4 + 0.2;
            group.add(head);
        }
    }

    createOrganismMesh(type, plantType = null) {
        const group = new THREE.Group();

        // Convert to number to ensure correct comparison
        const t = Number(type);

        if (t === 0) {
            // PLANT - Create different types based on plantType or random
            const pType = plantType !== null ? plantType : Math.floor(Math.random() * 5);
            group.userData.plantType = pType;

            this.createPlantVisual(group, pType);
        } else if (t === 1) {
            // HERBIVORE - Blue quadruped animal
            const herbBodyGeo = new THREE.SphereGeometry(0.8, 24, 16);
            herbBodyGeo.scale(1.3, 1.0, 0.9);
            const herbBody = new THREE.Mesh(
                herbBodyGeo,
                new THREE.MeshStandardMaterial({
                    color: 0x8888ff,
                    emissive: 0x444488,
                    emissiveIntensity: 0.3,
                    roughness: 0.8,
                    metalness: 0.2
                })
            );
            herbBody.castShadow = true;
            herbBody.receiveShadow = true;
            herbBody.userData.isBody = true;
            herbBody.userData.baseY = 0;
            group.add(herbBody);

            // Head with snout
            const herbHead = new THREE.Mesh(
                new THREE.SphereGeometry(0.5, 20, 16),
                new THREE.MeshStandardMaterial({
                    color: 0x6666dd,
                    emissive: 0x333366,
                    emissiveIntensity: 0.3,
                    roughness: 0.8,
                    metalness: 0.2
                })
            );
            herbHead.position.set(0, 0.2, 1.1);
            herbHead.scale.set(0.8, 0.9, 1.1);
            herbHead.castShadow = true;
            herbHead.userData.isHead = true;
            group.add(herbHead);

            // Ears
            for (let side of [-1, 1]) {
                const ear = new THREE.Mesh(
                    new THREE.ConeGeometry(0.15, 0.3, 8),
                    new THREE.MeshStandardMaterial({
                        color: 0x6666dd,
                        emissive: 0x333366,
                        emissiveIntensity: 0.2
                    })
                );
                ear.position.set(side * 0.3, 0.5, 1.0);
                ear.castShadow = true;
                group.add(ear);
            }

            // Four legs with pivot groups for animation
            const legPositions = [
                [-0.5, 0, 0.5], [0.5, 0, 0.5],
                [-0.5, 0, -0.5], [0.5, 0, -0.5]
            ];
            legPositions.forEach((pos, idx) => {
                // Create a pivot group at the hip joint
                const legPivot = new THREE.Group();
                legPivot.position.set(pos[0], -0.3, pos[2]);
                legPivot.userData.isLeg = true;
                legPivot.userData.legIndex = idx;

                const leg = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.12, 0.1, 0.7, 12),
                    new THREE.MeshStandardMaterial({
                        color: 0x7777dd,
                        roughness: 0.8
                    })
                );
                leg.position.y = -0.35; // Offset from pivot
                leg.castShadow = true;

                legPivot.add(leg);
                group.add(legPivot);
            });
        } else if (t === 2) {
            // CARNIVORE - Red predator with elongated body
            const carnBodyGeo = new THREE.SphereGeometry(0.7, 24, 16);
            carnBodyGeo.scale(1.5, 0.85, 0.85);
            const carnBody = new THREE.Mesh(
                carnBodyGeo,
                new THREE.MeshStandardMaterial({
                    color: 0xff4444,
                    emissive: 0x882222,
                    emissiveIntensity: 0.4,
                    roughness: 0.6,
                    metalness: 0.3
                })
            );
            carnBody.castShadow = true;
            carnBody.receiveShadow = true;
            carnBody.userData.isBody = true;
            carnBody.userData.baseY = 0;
            group.add(carnBody);

            // Predator head
            const carnHeadGeo = new THREE.SphereGeometry(0.45, 20, 16);
            carnHeadGeo.scale(0.9, 0.8, 1.1);
            const carnHead = new THREE.Mesh(
                carnHeadGeo,
                new THREE.MeshStandardMaterial({
                    color: 0xdd2222,
                    emissive: 0x661111,
                    emissiveIntensity: 0.4,
                    roughness: 0.6,
                    metalness: 0.3
                })
            );
            carnHead.position.set(0, 0.15, 1.2);
            carnHead.castShadow = true;
            carnHead.userData.isHead = true;
            group.add(carnHead);

            // Snout
            const snout = new THREE.Mesh(
                new THREE.ConeGeometry(0.25, 0.4, 12),
                new THREE.MeshStandardMaterial({
                    color: 0xcc1111,
                    emissive: 0x550000,
                    emissiveIntensity: 0.3
                })
            );
            snout.position.set(0, 0, 1.5);
            snout.rotation.x = Math.PI / 2;
            snout.castShadow = true;
            group.add(snout);

            // Glowing eyes
            for (let side of [-1, 1]) {
                const eye = new THREE.Mesh(
                    new THREE.SphereGeometry(0.08, 12, 12),
                    new THREE.MeshStandardMaterial({
                        color: 0xffff00,
                        emissive: 0xffff00,
                        emissiveIntensity: 0.8
                    })
                );
                eye.position.set(side * 0.25, 0.3, 1.35);
                group.add(eye);
            }

            // Four legs with pivot groups
            const carnLegPositions = [
                [-0.4, 0, 0.6], [0.4, 0, 0.6],
                [-0.4, 0, -0.6], [0.4, 0, -0.6]
            ];
            carnLegPositions.forEach((pos, idx) => {
                const legPivot = new THREE.Group();
                legPivot.position.set(pos[0], -0.3, pos[2]);
                legPivot.userData.isLeg = true;
                legPivot.userData.legIndex = idx;

                const leg = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.14, 0.1, 0.75, 12),
                    new THREE.MeshStandardMaterial({
                        color: 0xdd3333,
                        roughness: 0.7
                    })
                );
                leg.position.y = -0.4;
                leg.castShadow = true;

                legPivot.add(leg);
                group.add(legPivot);
            });

            // Tail
            const tail = new THREE.Mesh(
                new THREE.ConeGeometry(0.12, 0.8, 12),
                new THREE.MeshStandardMaterial({
                    color: 0xff3333,
                    roughness: 0.7
                })
            );
            tail.position.set(0, 0.1, -1.2);
            tail.rotation.x = -Math.PI / 2;
            tail.castShadow = true;
            tail.userData.isTail = true;
            group.add(tail);
        } else if (t === 3) {
            // HUMANOID - Tan bipedal figure
            const humanTorso = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.35, 0.8, 12, 20),
                new THREE.MeshStandardMaterial({
                    color: 0xffcc88,
                    emissive: 0x886644,
                    emissiveIntensity: 0.3,
                    roughness: 0.9,
                    metalness: 0.1
                })
            );
            humanTorso.position.y = 0.5;
            humanTorso.castShadow = true;
            humanTorso.receiveShadow = true;
            humanTorso.userData.isBody = true;
            humanTorso.userData.baseY = 0.5;
            group.add(humanTorso);

            // Head
            const humanHead = new THREE.Mesh(
                new THREE.SphereGeometry(0.35, 20, 20),
                new THREE.MeshStandardMaterial({
                    color: 0xffbb77,
                    emissive: 0x885533,
                    emissiveIntensity: 0.3,
                    roughness: 0.85,
                    metalness: 0.1
                })
            );
            humanHead.position.y = 1.15;
            humanHead.castShadow = true;
            humanHead.userData.isHead = true;
            group.add(humanHead);

            // Eyes
            for (let side of [-1, 1]) {
                const eye = new THREE.Mesh(
                    new THREE.SphereGeometry(0.06, 12, 12),
                    new THREE.MeshStandardMaterial({
                        color: 0x000000,
                        emissive: 0x222222,
                        emissiveIntensity: 0.5
                    })
                );
                eye.position.set(side * 0.15, 1.2, 0.3);
                group.add(eye);
            }

            // Arms with pivot groups
            let armIdx = 0;
            for (let side of [-1, 1]) {
                const armPivot = new THREE.Group();
                armPivot.position.set(side * 0.5, 0.8, 0);
                armPivot.userData.isArm = true;
                armPivot.userData.armIndex = armIdx++;

                const arm = new THREE.Mesh(
                    new THREE.CapsuleGeometry(0.12, 0.6, 8, 12),
                    new THREE.MeshStandardMaterial({
                        color: 0xffbb77,
                        roughness: 0.9
                    })
                );
                arm.position.y = -0.3;
                arm.rotation.z = side * 0.2;
                arm.castShadow = true;

                armPivot.add(arm);
                group.add(armPivot);
            }

            // Legs with pivot groups
            let legIdx = 0;
            for (let side of [-1, 1]) {
                const legPivot = new THREE.Group();
                legPivot.position.set(side * 0.2, 0, 0);
                legPivot.userData.isLeg = true;
                legPivot.userData.legIndex = legIdx++;

                const leg = new THREE.Mesh(
                    new THREE.CapsuleGeometry(0.15, 0.7, 8, 12),
                    new THREE.MeshStandardMaterial({
                        color: 0xddaa66,
                        roughness: 0.9
                    })
                );
                leg.position.y = -0.45;
                leg.castShadow = true;

                legPivot.add(leg);
                group.add(legPivot);
            }
        } else {
            // UNKNOWN TYPE - Default gray sphere
            console.warn(`[Renderer] Unknown organism type: ${t}`);
            const defaultMesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.5, 8, 8),
                new THREE.MeshPhongMaterial({ color: 0x888888 })
            );
            defaultMesh.castShadow = true;
            group.add(defaultMesh);
        }

        group.scale.setScalar(ORGANISM_SCALE);
        return group;
    }

    removeOrganism(id) {
        const mesh = this.organisms.get(id);
        if (mesh) {
            this.planetGroup.remove(mesh);
            this.organisms.delete(id);
            this.previousPositions.delete(id);
            this.animationSystem.removeAnimationState(id);

            if (this.selectedOrganism === id) {
                this.deselectOrganism();
            }
        }
    }

    render(deltaMs = 16) {
        // Update time system (day/night cycle)
        this.timeSystem.update(deltaMs);
        const timeInfo = this.timeSystem.getTimeInfo();

        // Update sun position (orbits around planet)
        if (this.sun && this.sunLight) {
            const sunPos = this.timeSystem.getSunPosition(SUN_ORBIT_RADIUS);
            this.sun.position.copy(sunPos);
            this.sunLight.position.copy(sunPos);
            this.sunLight.intensity = timeInfo.sunIntensity;

            // Sun color based on time
            if (timeInfo.phase === 'sunrise' || timeInfo.phase === 'sunset') {
                this.sun.material.color.setHex(0xff6600);
                this.sunLight.color.setHex(0xffaa66);
            } else if (timeInfo.isNight) {
                this.sun.material.color.setHex(0x444466);
                this.sunLight.color.setHex(0x444466);
            } else {
                this.sun.material.color.setHex(0xffff99);
                this.sunLight.color.setHex(0xffffff);
            }
        }

        // Update moon position and light
        if (this.moon) {
            const moonPos = this.timeSystem.getMoonPosition(SUN_ORBIT_RADIUS * 0.9);
            this.moon.position.copy(moonPos);
            this.moon.material.opacity = timeInfo.isNight ? 0.9 : 0.2;

            // Sync moonlight
            if (this.moonLight) {
                this.moonLight.position.copy(moonPos);
                this.moonLight.intensity = timeInfo.isNight ? 0.3 : 0.05;
            }
        }

        // Update sky/background color
        this.scene.background.copy(timeInfo.skyColor);
        if (this.scene.fog) {
            this.scene.fog.color.copy(timeInfo.fogColor);
        }

        // Update ambient light
        if (this.ambientLight) {
            this.ambientLight.intensity = timeInfo.ambientIntensity;
        }

        // Stars visibility - more visible at night
        if (this.stars) {
            this.stars.material.opacity = timeInfo.isNight ? 1.0 : 0.1;
            this.stars.rotation.y -= 0.0001;
        }

        // Rotate planet slowly
        if (this.planetGroup) {
            this.planetGroup.rotation.y += 0.0002;
        }

        // Update animation system
        this.animationSystem.update(deltaMs);

        // Update weather system (clouds are now managed here)
        if (this.weatherSystem) {
            this.weatherSystem.update(deltaMs, timeInfo);
        }

        // Update water cycle (rain accumulation and sun evaporation)
        this.updateWaterCycle(deltaMs / 1000, timeInfo);

        // Apply animations to all organisms
        const weatherInfo = this.weatherSystem ? this.weatherSystem.getWeatherInfo() : { windStrength: 0.3, windDirection: { x: 1, z: 0.5 } };
        for (const [id, mesh] of this.organisms) {
            const state = this.animationSystem.getAnimationState(id);
            if (state) {
                const orgType = mesh.userData.organismType;

                if (orgType === 0) {
                    // Plant - wind sway animation with weather wind direction
                    const windStrength = 0.2 + weatherInfo.windStrength * 0.8;
                    const windDir = weatherInfo.windDirection || { x: 1, z: 0.5 };
                    this.animationSystem.animatePlant(mesh, state, windStrength, windDir);
                } else if (orgType === 1 || orgType === 2) {
                    // Herbivore or Carnivore - quadruped walk
                    this.animationSystem.animateQuadruped(mesh, state);
                } else if (orgType === 3) {
                    // Humanoid - biped walk
                    this.animationSystem.animateBiped(mesh, state);
                }
            }
        }

        // Pulse selection ring
        if (this.selectionRing) {
            this.selectionRing.rotation.z += 0.02;
            this.selectionRing.material.opacity = 0.5 + Math.sin(Date.now() * 0.003) * 0.3;
        }

        // Update controls
        this.controls.update();

        this.renderer.render(this.scene, this.camera);
    }

    updateTimeDisplay(info) {
        // Update time display in UI if exists
        const timeDisplay = document.getElementById('time-display');
        if (timeDisplay) {
            // Phase icons
            const phaseIcons = {
                'night': '\u{1F319}',     // crescent moon
                'dawn': '\u{1F305}',      // sunrise
                'morning': '\u{2600}',    // sun
                'day': '\u{2600}',        // sun
                'sunset': '\u{1F307}',    // sunset
                'dusk': '\u{1F306}'       // cityscape at dusk
            };
            const icon = phaseIcons[info.phase] || '\u{2600}';
            timeDisplay.textContent = `${icon} Day ${info.day} - ${info.timeString}`;

            // Adjust color based on time
            if (info.isNight) {
                timeDisplay.style.color = '#8899bb';
                timeDisplay.style.borderColor = 'rgba(136, 153, 187, 0.3)';
            } else if (info.phase === 'dawn' || info.phase === 'sunrise') {
                timeDisplay.style.color = '#ffaa66';
                timeDisplay.style.borderColor = 'rgba(255, 170, 102, 0.3)';
            } else if (info.phase === 'sunset' || info.phase === 'dusk') {
                timeDisplay.style.color = '#ff7744';
                timeDisplay.style.borderColor = 'rgba(255, 119, 68, 0.3)';
            } else {
                timeDisplay.style.color = '#ffd700';
                timeDisplay.style.borderColor = 'rgba(255, 215, 0, 0.3)';
            }
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // Camera controls for keyboard
    rotateCamera(angle) {
        // OrbitControls handles this
    }

    zoomCamera(delta) {
        const distance = this.camera.position.length();
        const newDistance = Math.max(70, Math.min(300, distance + delta * 10));
        this.camera.position.normalize().multiplyScalar(newDistance);
    }

    setTimeScale(scale) {
        // Could affect animation speeds if needed
    }
}
