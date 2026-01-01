/**
 * Planet Eden - Main Entry Point
 * God Mode AI Life Simulation with True Neural Networks
 */

import { Organism, SpatialGrid, spawnOrganism } from './organism.js';
import { NeuralNetwork } from './neural-network.js';
import {
    initPowers,
    createPowersSystem,
    updateParticleEffects,
    modifyTerrain,
    smoothTerrain,
    flattenTerrain
} from './powers.js';
import {
    showNotification,
    playSound,
    checkAchievement,
    updateStatsPanel,
    updateFPS,
    updatePopulationChart,
    initPopulationChart,
    exportPopulationCSV,
    exportWorldJSON,
    exportOrganism
} from './ui.js';

// Constants
const PLANET_RADIUS = 50;
const GRID_CELL_SIZE = 20;

// Three.js core
let scene, camera, renderer, planetGroup, planetGeometry;
let sunLight, ambientLight;

// Game state
const state = {
    time: 0,
    paused: false,
    timeScale: 1,
    dayTime: 0,
    dayNightSpeed: 0.002,
    lastAutoSave: 0,
    cameraAngle: 0,
    cameraHeight: 20,
    cameraDistance: 150
};

// Organisms and spatial partitioning
const organisms = [];
let selected = null;
const spatialGrid = new SpatialGrid(GRID_CELL_SIZE);

// God mode powers
const godMode = {
    enabled: true,
    activePower: null,
    settings: {
        brushSize: 10,
        effectRadius: 15,
        terraformStrength: 2,
        spawnCount: 50
    },
    foodSurplusActive: false,
    foodSurplusTimer: 0,
    famineActive: false,
    famineTimer: 0
};

// Terrain height cache
const terrainHeightCache = new Map();
const CACHE_GRID_SIZE = 64;

// Population tracking
const populationHistory = [];
let lastPopulationRecord = 0;

// Initialize Three.js scene
function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.Fog(0x0a0a1a, 100, 300);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 50, 150);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Lighting
    sunLight = new THREE.DirectionalLight(0xffffee, 1.8);
    sunLight.position.set(50, 50, 50);
    scene.add(sunLight);

    ambientLight = new THREE.AmbientLight(0x404050, 0.6);
    scene.add(ambientLight);

    // Planet group
    planetGroup = new THREE.Group();
    scene.add(planetGroup);

    window.addEventListener('resize', onWindowResize);
}

// Create procedural planet
function createPlanet() {
    planetGeometry = new THREE.SphereGeometry(PLANET_RADIUS, 160, 160);
    const positions = planetGeometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);

    // Perlin-like noise for terrain
    function noise3D(x, y, z) {
        return (Math.sin(x * 3.5 + Math.cos(z * 2.7)) *
                Math.sin(y * 2.8 + Math.cos(x * 3.1)) *
                Math.sin(z * 3.2 + Math.cos(y * 2.5))) * 0.5;
    }

    function getTerrainHeight(nx, ny, nz) {
        let height = 0;
        let amplitude = 4;
        let frequency = 1;

        for (let i = 0; i < 4; i++) {
            height += noise3D(nx * frequency, ny * frequency, nz * frequency) * amplitude;
            amplitude *= 0.5;
            frequency *= 2;
        }

        return height;
    }

    function getBiomeColor(height, latitude, nx, ny, nz) {
        const absLat = Math.abs(latitude);
        const textureNoise = noise3D(nx * 10, ny * 10, nz * 10) * 0.05;

        const deepOcean = new THREE.Color(0x003366);
        const ocean = new THREE.Color(0x0077be);
        const beach = new THREE.Color(0xf4a460);
        const grassland = new THREE.Color(0x4a8b2c);
        const forest = new THREE.Color(0x2d5016);
        const temperateForest = new THREE.Color(0x3a6b2a);
        const tundra = new THREE.Color(0x8b9aaa);
        const brownMountain = new THREE.Color(0x6b5544);
        const rockMountain = new THREE.Color(0x888888);
        const snow = new THREE.Color(0xf0f8ff);

        let baseColor;

        if (height < -2) {
            baseColor = deepOcean;
        } else if (height < 0) {
            const t = (height + 2) / 2;
            baseColor = new THREE.Color().lerpColors(deepOcean, ocean, t);
        } else if (height < 0.5) {
            const t = height / 0.5;
            baseColor = new THREE.Color().lerpColors(ocean, beach, t);
        } else if (height < 2) {
            const t = (height - 0.5) / 1.5;
            let targetColor = absLat > 0.7 ? tundra : absLat > 0.4 ? temperateForest : grassland;
            baseColor = new THREE.Color().lerpColors(beach, targetColor, t);
        } else if (height < 5) {
            const t = (height - 2) / 3;
            let lowColor = absLat > 0.4 ? temperateForest : grassland;
            let highColor = absLat > 0.6 ? brownMountain : forest;
            baseColor = new THREE.Color().lerpColors(lowColor, highColor, t);
        } else if (height < 8) {
            const t = (height - 5) / 3;
            baseColor = new THREE.Color().lerpColors(brownMountain, rockMountain, t);
        } else {
            const t = Math.min((height - 8) / 2, 1);
            baseColor = new THREE.Color().lerpColors(rockMountain, snow, t);
        }

        baseColor.r = Math.max(0, Math.min(1, baseColor.r + textureNoise));
        baseColor.g = Math.max(0, Math.min(1, baseColor.g + textureNoise));
        baseColor.b = Math.max(0, Math.min(1, baseColor.b + textureNoise));

        return baseColor;
    }

    // Generate terrain
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);

        const len = Math.sqrt(x * x + y * y + z * z);
        const nx = x / len, ny = y / len, nz = z / len;

        const height = getTerrainHeight(nx, ny, nz);
        const latitude = Math.asin(ny);
        const color = getBiomeColor(height, latitude, nx, ny, nz);

        positions.setXYZ(i, nx * (PLANET_RADIUS + height), ny * (PLANET_RADIUS + height), nz * (PLANET_RADIUS + height));
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }

    planetGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    planetGeometry.computeVertexNormals();

    const planet = new THREE.Mesh(planetGeometry, new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.85,
        metalness: 0.05,
        flatShading: false
    }));
    planet.castShadow = true;
    planet.receiveShadow = true;
    planetGroup.add(planet);

    // Store procedural functions globally for reuse
    window.getTerrainHeight = getTerrainHeight;
    window.getBiomeColor = getBiomeColor;

    // Atmosphere
    const atmoGeo = new THREE.SphereGeometry(PLANET_RADIUS + 5, 32, 32);
    const atmoMat = new THREE.ShaderMaterial({
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vNormal;
            void main() {
                float intensity = pow(0.5 - dot(vNormal, vec3(0, 0, 1.0)), 3.0);
                gl_FragColor = vec4(0.4, 0.6, 1.0, 1.0) * intensity * 2.5;
            }
        `,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true
    });
    planetGroup.add(new THREE.Mesh(atmoGeo, atmoMat));
}

// Terrain height helper with cache
function getTerrainHeightAtPosition(position) {
    const normalized = position.clone().normalize();
    const gx = Math.round(normalized.x * CACHE_GRID_SIZE);
    const gy = Math.round(normalized.y * CACHE_GRID_SIZE);
    const gz = Math.round(normalized.z * CACHE_GRID_SIZE);
    const cacheKey = `${gx},${gy},${gz}`;

    if (terrainHeightCache.has(cacheKey)) {
        return terrainHeightCache.get(cacheKey);
    }

    const height = window.getTerrainHeight(normalized.x, normalized.y, normalized.z);
    terrainHeightCache.set(cacheKey, height);

    if (terrainHeightCache.size > 10000) {
        const firstKey = terrainHeightCache.keys().next().value;
        terrainHeightCache.delete(firstKey);
    }

    return height;
}

// Initialize organisms
function initOrganisms() {
    spawnOrganism('plant', 30, PLANET_RADIUS, getTerrainHeightAtPosition, organisms);
    spawnOrganism('herbivore', 8, PLANET_RADIUS, getTerrainHeightAtPosition, organisms);
    spawnOrganism('carnivore', 3, PLANET_RADIUS, getTerrainHeightAtPosition, organisms);
    spawnOrganism('humanoid', 2, PLANET_RADIUS, getTerrainHeightAtPosition, organisms);

    // Create meshes for all organisms
    for (const org of organisms) {
        org.createMesh(planetGroup);
    }
}

// Initialize powers system
let POWERS;
function initPowersSystem() {
    initPowers(scene, planetGroup, planetGeometry, terrainHeightCache, organisms);
    POWERS = createPowersSystem(
        Organism,
        showNotification,
        playSound,
        checkAchievement,
        (type, count) => spawnOrganism(type, count, PLANET_RADIUS, getTerrainHeightAtPosition, organisms),
        PLANET_RADIUS
    );
}

// Camera controls
let isDragging = false;
let prevX = 0, prevY = 0;
let touches = [];
let lastPinchDistance = 0;

function setupControls() {
    const canvas = renderer.domElement;

    canvas.addEventListener('mousedown', e => {
        isDragging = true;
        prevX = e.clientX;
        prevY = e.clientY;
    });

    canvas.addEventListener('mousemove', e => {
        if (isDragging) {
            state.cameraAngle += (e.clientX - prevX) * 0.005;
            state.cameraHeight -= (e.clientY - prevY) * 0.5;
            state.cameraHeight = Math.max(-30, Math.min(80, state.cameraHeight));
            prevX = e.clientX;
            prevY = e.clientY;
        }
    });

    canvas.addEventListener('mouseup', () => isDragging = false);

    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        state.cameraDistance += e.deltaY * 0.1;
        state.cameraDistance = Math.max(80, Math.min(250, state.cameraDistance));
    });

    // Touch controls
    canvas.addEventListener('touchstart', e => {
        touches = Array.from(e.touches);
        if (touches.length === 1) {
            isDragging = true;
            prevX = touches[0].clientX;
            prevY = touches[0].clientY;
        } else if (touches.length === 2) {
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            lastPinchDistance = Math.sqrt(dx * dx + dy * dy);
        }
    });

    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        touches = Array.from(e.touches);

        if (touches.length === 1 && isDragging) {
            state.cameraAngle += (touches[0].clientX - prevX) * 0.005;
            state.cameraHeight -= (touches[0].clientY - prevY) * 0.5;
            state.cameraHeight = Math.max(-30, Math.min(80, state.cameraHeight));
            prevX = touches[0].clientX;
            prevY = touches[0].clientY;
        } else if (touches.length === 2) {
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const delta = distance - lastPinchDistance;
            state.cameraDistance -= delta * 0.5;
            state.cameraDistance = Math.max(80, Math.min(250, state.cameraDistance));
            lastPinchDistance = distance;
        }
    });

    canvas.addEventListener('touchend', () => {
        isDragging = false;
        touches = [];
    });
}

// Update ecosystem
function updateEcosystem(delta) {
    // Update spatial grid
    spatialGrid.clear();
    for (const org of organisms) {
        if (!org.dead) spatialGrid.add(org);
    }

    // Update organisms
    for (const org of organisms) {
        org.update(delta, spatialGrid);
    }

    // Handle reproduction
    for (const org of organisms) {
        if (org.canReproduce()) {
            const child = org.reproduce();
            child.createMesh(planetGroup);
            organisms.push(child);
        }
    }

    // Handle collisions (eating)
    for (const org of organisms) {
        if (org.dead || org.type === 'plant') continue;

        const nearby = spatialGrid.getNearby(org.position);
        for (const other of nearby) {
            if (other === org || other.dead) continue;
            if (org.position.distanceTo(other.position) < 3) {
                if (org.type === 'herbivore' && other.type === 'plant') {
                    org.eat(other);
                } else if (org.type === 'carnivore' && (other.type === 'herbivore' || other.type === 'humanoid')) {
                    org.eat(other);
                } else if (org.type === 'humanoid' && (other.type === 'plant' || other.type === 'herbivore')) {
                    org.eat(other);
                }
            }
        }
    }

    // Remove fully decayed organisms
    for (let i = organisms.length - 1; i >= 0; i--) {
        if (organisms[i].dead && organisms[i].deathTime >= 60) {
            if (organisms[i].mesh) planetGroup.remove(organisms[i].mesh);
            organisms.splice(i, 1);
        }
    }

    // Timed god mode effects
    if (godMode.foodSurplusActive) {
        godMode.foodSurplusTimer -= delta;
        if (godMode.foodSurplusTimer <= 0) godMode.foodSurplusActive = false;
    }

    if (godMode.famineActive) {
        godMode.famineTimer -= delta;
        if (godMode.famineTimer <= 0) godMode.famineActive = false;
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    const delta = state.paused ? 0 : 0.016 * state.timeScale;
    state.time += delta;

    // Update camera
    camera.position.x = Math.cos(state.cameraAngle) * state.cameraDistance;
    camera.position.z = Math.sin(state.cameraAngle) * state.cameraDistance;
    camera.position.y = state.cameraHeight;
    camera.lookAt(planetGroup.position);

    // Update ecosystem
    if (!state.paused) {
        updateEcosystem(delta);
        updateParticleEffects(delta);
    }

    // Update UI
    updateStatsPanel(organisms, selected, state.time);
    const fps = updateFPS(delta);

    // Record population history
    if (state.time - lastPopulationRecord > 10) {
        const living = organisms.filter(o => !o.dead);
        const counts = { plant: 0, herbivore: 0, carnivore: 0, humanoid: 0 };
        let totalGen = 0, genCount = 0;

        for (const o of living) {
            counts[o.type]++;
            if (o.type !== 'plant') {
                totalGen += o.generation;
                genCount++;
            }
        }

        updatePopulationChart(state.time, counts);

        populationHistory.push({
            time: Math.floor(state.time),
            counts,
            total: living.length,
            avgGen: genCount > 0 ? (totalGen / genCount).toFixed(1) : 0
        });

        lastPopulationRecord = state.time;
    }

    // Auto-save
    if (state.time - state.lastAutoSave > 120) {
        state.lastAutoSave = state.time;
        const saveData = {
            time: state.time,
            organisms: organisms.map(o => o.exportData()),
            godMode: godMode
        };
        localStorage.setItem('planetEdenAutoSave', JSON.stringify(saveData));
    }

    renderer.render(scene, camera);
}

// Window resize handler
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Initialize and start
function init() {
    showNotification('🌍 Welcome to Planet Eden!');

    initScene();
    createPlanet();
    initOrganisms();
    initPowersSystem();
    setupControls();
    initPopulationChart();

    animate();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export globals for console debugging
window.PlanetEden = {
    organisms,
    selected,
    state,
    godMode,
    POWERS,
    exportPopulationCSV: () => exportPopulationCSV(populationHistory),
    exportWorldJSON: () => exportWorldJSON(organisms, state.time, godMode.settings),
    exportOrganism: () => exportOrganism(selected)
};
