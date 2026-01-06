// weather.js - Cloud-Based Local Weather System for Planet Eden
// Each cloud is a weather cell that can independently precipitate rain or snow

import * as THREE from 'three';

export class WeatherSystem {
    constructor(scene, planetRadius = 50, getTerrainHeight = null) {
        this.scene = scene;
        this.planetRadius = planetRadius;

        // Terrain height callback - takes (nx, ny, nz) normalized coords, returns height
        this.getTerrainHeight = getTerrainHeight;

        // Water level threshold (terrain below this is water)
        this.waterLevel = 0.5;

        // Minimum cloud height above terrain (to avoid touching trees/structures)
        this.minCloudAltitude = 12;
        // Additional random variation in cloud height
        this.cloudAltitudeVariation = 5;

        // Cloud movement speed (increased for more visible motion)
        this.cloudMoveSpeed = 3.0;

        // Cloud weather cells
        this.clouds = [];
        this.cloudGroup = new THREE.Group();
        this.scene.add(this.cloudGroup);

        // Rain particles in world space (not children of clouds)
        this.rainGroup = new THREE.Group();
        this.scene.add(this.rainGroup);

        // Global wind (affects cloud movement and tree sway)
        this.windDirection = new THREE.Vector3(1, 0, 0.5).normalize();
        this.windStrength = 0.2;
        this.gustTimer = 0;

        // Lightning
        this.lightningLight = null;
        this.activeLightningCloud = null;
        this.lightningTimer = 0;

        // Weather display callback
        this.onWeatherChange = null;
        this.lastWeatherSummary = 'clear';

        this.init();
    }

    init() {
        this.createClouds();
        this.createLightning();
    }

    createClouds() {
        const cloudMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.85,
            roughness: 1.0,
            metalness: 0
        });

        // Create 25-30 cloud weather cells
        const cloudCount = 25 + Math.floor(Math.random() * 6);

        for (let i = 0; i < cloudCount; i++) {
            const cloud = this.createCloudCell(cloudMaterial, i);
            this.clouds.push(cloud);
            this.cloudGroup.add(cloud.group);
        }
    }

    createCloudCell(baseMaterial, index) {
        const cloudGroup = new THREE.Group();
        cloudGroup.userData.cloudIndex = index;

        // Random position on sphere
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        // Get normalized direction for terrain query
        const nx = Math.sin(phi) * Math.cos(theta);
        const ny = Math.cos(phi);
        const nz = Math.sin(phi) * Math.sin(theta);

        // Query terrain height if callback is available, otherwise use default
        let terrainOffset = 0;
        if (this.getTerrainHeight) {
            terrainOffset = this.getTerrainHeight(nx, ny, nz);
        }

        // Cloud altitude: terrain height + minimum clearance + random variation
        const cloudAltitude = terrainOffset + this.minCloudAltitude + Math.random() * this.cloudAltitudeVariation;
        const cloudRadius = this.planetRadius + cloudAltitude;

        const baseX = cloudRadius * nx;
        const baseY = cloudRadius * ny;
        const baseZ = cloudRadius * nz;

        cloudGroup.position.set(baseX, baseY, baseZ);

        // Create 4-8 puffs per cloud
        const puffCount = 4 + Math.floor(Math.random() * 5);
        const puffs = [];

        for (let j = 0; j < puffCount; j++) {
            const puffSize = 1.5 + Math.random() * 2.5;
            const puffGeo = new THREE.SphereGeometry(puffSize, 8, 6);
            const puffMaterial = baseMaterial.clone();
            const puff = new THREE.Mesh(puffGeo, puffMaterial);

            puff.position.set(
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 5
            );
            puff.scale.y = 0.5 + Math.random() * 0.2; // Flatten clouds
            cloudGroup.add(puff);
            puffs.push(puff);
        }

        // Create rain particle system for this cloud (in world space)
        const rainSystem = this.createCloudRainSystem();
        this.rainGroup.add(rainSystem.points);

        // Randomize initial weather state for diversity (including storms)
        const initialStates = ['clear', 'clear', 'cloudy', 'cloudy', 'rain', 'rain', 'storm'];
        const initialState = initialStates[Math.floor(Math.random() * initialStates.length)];

        // Stagger state timers so clouds don't all transition together
        const staggeredTimer = 10 + Math.random() * 80 + (index * 2);

        // Weather cell state
        const cell = {
            group: cloudGroup,
            puffs: puffs,
            rainSystem: rainSystem,
            // Movement - faster for more visible motion
            orbitSpeed: 0.0002 + Math.random() * 0.0004,
            orbitAxis: new THREE.Vector3(
                Math.random() - 0.5,
                1,
                Math.random() - 0.5
            ).normalize(),
            // Local weather state - randomized initial state
            weatherState: initialState,
            weatherIntensity: initialState === 'storm' ? 1.0 : (initialState === 'rain' ? 0.7 : (initialState === 'cloudy' ? 0.3 : 0)),
            targetIntensity: initialState === 'storm' ? 1.0 : (initialState === 'rain' ? 0.7 : (initialState === 'cloudy' ? 0.3 : 0)),
            stateTimer: staggeredTimer,
            stateProgress: Math.random() * 10,
            // Storm properties - 75% of clouds can produce storms
            canStorm: Math.random() > 0.25,
            lightningCharge: Math.random() * 0.5, // Start with some charge

            // Moisture tracking for water cycle - storms/rain start with more moisture
            moisture: initialState === 'storm' ? (0.7 + Math.random() * 0.3) :
                      (initialState === 'rain' ? (0.5 + Math.random() * 0.3) : Math.random() * 0.5),
            isOverWater: false
        };

        return cell;
    }

    // Check if a normalized position is over water
    isPositionOverWater(nx, ny, nz) {
        if (!this.getTerrainHeight) return false;
        const terrainHeight = this.getTerrainHeight(nx, ny, nz);
        return terrainHeight < this.waterLevel;
    }

    createCloudRainSystem() {
        const rainCount = 150; // Particles per cloud
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(rainCount * 3);
        const velocities = [];

        // Initialize rain particles (will be positioned relative to cloud in update)
        for (let i = 0; i < rainCount; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;

            velocities.push({
                speed: 0.5 + Math.random() * 0.4,
                progress: Math.random(), // 0-1, how far fallen
                offsetX: (Math.random() - 0.5) * 6,
                offsetZ: (Math.random() - 0.5) * 6
            });
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xaaccff,
            size: 0.3,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const points = new THREE.Points(geometry, material);
        points.visible = false;
        points.frustumCulled = false; // Always render

        return {
            points: points,
            velocities: velocities,
            geometry: geometry
        };
    }

    createLightning() {
        this.lightningLight = new THREE.PointLight(0xffffff, 0, 100);
        this.scene.add(this.lightningLight);

        // Lightning bolt mesh
        this.lightningBolt = null;
        this.lightningBoltGroup = new THREE.Group();
        this.scene.add(this.lightningBoltGroup);

        // Callback for when lightning strikes (for damage handling)
        this.onLightningStrike = null;
    }

    // Set callback for lightning strike events
    setLightningCallback(callback) {
        this.onLightningStrike = callback;
    }

    // Create a visual lightning bolt from cloud to ground
    createLightningBolt(cloud) {
        // Clear previous bolt
        while (this.lightningBoltGroup.children.length > 0) {
            const child = this.lightningBoltGroup.children[0];
            this.lightningBoltGroup.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
        }

        const cloudPos = cloud.group.position.clone();
        const cloudNormal = cloudPos.clone().normalize();

        // Calculate strike position on ground (below cloud)
        const strikeRadius = this.planetRadius + 0.5; // Just above terrain
        const strikePos = cloudNormal.clone().multiplyScalar(strikeRadius);

        // Create jagged lightning path
        const segments = 8 + Math.floor(Math.random() * 5);
        const points = [];
        const midpoint = new THREE.Vector3().lerpVectors(cloudPos, strikePos, 0.5);

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const point = new THREE.Vector3().lerpVectors(cloudPos, strikePos, t);

            // Add randomness to create jagged effect (more in the middle)
            if (i > 0 && i < segments) {
                const jitterAmount = 2 * (1 - Math.abs(t - 0.5) * 2);
                const perpX = new THREE.Vector3().crossVectors(cloudNormal, new THREE.Vector3(1, 0, 0)).normalize();
                const perpZ = new THREE.Vector3().crossVectors(cloudNormal, perpX).normalize();

                point.add(perpX.multiplyScalar((Math.random() - 0.5) * jitterAmount));
                point.add(perpZ.multiplyScalar((Math.random() - 0.5) * jitterAmount));
            }

            points.push(point);
        }

        // Create main bolt
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0xaaddff,
            linewidth: 3,
            transparent: true,
            opacity: 1
        });
        const bolt = new THREE.Line(geometry, material);
        this.lightningBoltGroup.add(bolt);

        // Create glow effect (thicker white bolt behind)
        const glowMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            linewidth: 5,
            transparent: true,
            opacity: 0.8
        });
        const glowBolt = new THREE.Line(geometry.clone(), glowMaterial);
        this.lightningBoltGroup.add(glowBolt);

        // Add branch bolts
        const branchCount = 1 + Math.floor(Math.random() * 3);
        for (let b = 0; b < branchCount; b++) {
            const startIdx = 2 + Math.floor(Math.random() * (segments - 3));
            const startPoint = points[startIdx].clone();

            // Branch off in random direction
            const branchDir = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            ).normalize();

            const branchPoints = [startPoint];
            let currentPoint = startPoint.clone();
            const branchSegs = 2 + Math.floor(Math.random() * 3);

            for (let s = 0; s < branchSegs; s++) {
                const step = 0.5 + Math.random() * 1;
                currentPoint = currentPoint.clone().add(branchDir.clone().multiplyScalar(step));
                currentPoint.add(new THREE.Vector3(
                    (Math.random() - 0.5) * 0.5,
                    (Math.random() - 0.5) * 0.5,
                    (Math.random() - 0.5) * 0.5
                ));
                branchPoints.push(currentPoint);
            }

            const branchGeo = new THREE.BufferGeometry().setFromPoints(branchPoints);
            const branchMat = new THREE.LineBasicMaterial({
                color: 0x88bbff,
                linewidth: 1,
                transparent: true,
                opacity: 0.6
            });
            const branch = new THREE.Line(branchGeo, branchMat);
            this.lightningBoltGroup.add(branch);
        }

        return strikePos;
    }

    update(deltaMs, timeInfo) {
        const deltaSeconds = deltaMs / 1000;

        // Update wind gusts
        this.updateWind(deltaSeconds);

        // Update each cloud weather cell
        let activeWeatherCount = 0;
        let stormCount = 0;

        for (const cloud of this.clouds) {
            this.updateCloudCell(cloud, deltaSeconds, timeInfo);

            if (cloud.weatherState !== 'clear') activeWeatherCount++;
            if (cloud.weatherState === 'storm') stormCount++;
        }

        // Update lightning
        this.updateLightning(deltaSeconds);

        // Update weather display with summary (only when changed)
        let summary = 'clear';
        if (stormCount > 0) summary = 'storm';
        else if (activeWeatherCount > 5) summary = 'rain';
        else if (activeWeatherCount > 0) summary = 'cloudy';

        if (summary !== this.lastWeatherSummary) {
            this.lastWeatherSummary = summary;
            if (this.onWeatherChange) {
                this.onWeatherChange(summary);
            }
        }
    }

    updateWind(deltaSeconds) {
        this.gustTimer += deltaSeconds;
        if (this.gustTimer > 3 + Math.random() * 5) {
            this.gustTimer = 0;
            this.windStrength = 0.15 + Math.random() * 0.4;
            // Slightly rotate wind direction
            const rotAngle = (Math.random() - 0.5) * 0.5;
            this.windDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotAngle);
        }
        // Decay wind strength
        this.windStrength = Math.max(0.1, this.windStrength - deltaSeconds * 0.05);
    }

    updateCloudCell(cloud, deltaSeconds, timeInfo) {
        // Move cloud (orbit + drift) - faster movement
        cloud.group.position.applyAxisAngle(cloud.orbitAxis, cloud.orbitSpeed * this.cloudMoveSpeed);

        // Apply wind drift (stronger effect)
        const windEffect = this.windDirection.clone().multiplyScalar(this.windStrength * 0.005);
        cloud.group.position.add(windEffect);

        // Keep cloud at proper altitude above terrain
        const currentPos = cloud.group.position.clone();
        const dist = currentPos.length();
        const normalized = currentPos.normalize();

        // Query terrain height at current position
        let terrainOffset = 0;
        if (this.getTerrainHeight) {
            terrainOffset = this.getTerrainHeight(normalized.x, normalized.y, normalized.z);
        }

        // Check if over water for water cycle
        cloud.isOverWater = this.isPositionOverWater(normalized.x, normalized.y, normalized.z);

        // WATER CYCLE: Clouds gain moisture over water, release it as rain over land
        if (cloud.isOverWater) {
            // Over water: absorb moisture (evaporation)
            cloud.moisture = Math.min(1.0, cloud.moisture + deltaSeconds * 0.08);

            // High moisture over water = grow into rain cloud
            if (cloud.moisture > 0.6 && cloud.weatherState === 'clear') {
                cloud.weatherState = 'cloudy';
                cloud.targetIntensity = 0.4;
                cloud.stateTimer = 15 + Math.random() * 20;
            }
        } else {
            // Over land: release moisture as rain if saturated
            if (cloud.moisture > 0.7) {
                // Trigger rain when moving from water to land with high moisture
                if (cloud.weatherState === 'cloudy' || cloud.weatherState === 'clear') {
                    cloud.weatherState = 'rain';
                    cloud.targetIntensity = 0.8;
                    cloud.stateTimer = 10 + Math.random() * 15;
                }
            }

            // Lose moisture while raining
            if (cloud.weatherState === 'rain' || cloud.weatherState === 'storm') {
                cloud.moisture = Math.max(0, cloud.moisture - deltaSeconds * 0.1);

                // Stop raining when moisture depleted
                if (cloud.moisture < 0.2) {
                    cloud.weatherState = 'cloudy';
                    cloud.targetIntensity = 0.2;
                    cloud.stateTimer = 5 + Math.random() * 10;
                }
            }

            // Dissipate dry clouds over land
            if (cloud.moisture < 0.3 && cloud.weatherState === 'cloudy') {
                cloud.weatherState = 'clear';
                cloud.targetIntensity = 0;
                cloud.stateTimer = 20 + Math.random() * 30;
            }
        }

        // Target altitude: terrain + min clearance + gentle wave for variation
        const cloudAltitude = terrainOffset + this.minCloudAltitude + Math.sin(cloud.stateProgress * 0.1) * 2;
        const targetDist = this.planetRadius + cloudAltitude;

        // Smoothly interpolate to target altitude
        cloud.group.position.copy(normalized).multiplyScalar(
            dist * 0.95 + targetDist * 0.05
        );

        // Update weather state timer
        cloud.stateProgress += deltaSeconds;
        cloud.stateTimer -= deltaSeconds;

        if (cloud.stateTimer <= 0) {
            this.transitionCloudState(cloud);
        }

        // Smoothly interpolate intensity toward target
        cloud.weatherIntensity += (cloud.targetIntensity - cloud.weatherIntensity) * deltaSeconds * 0.5;

        // Cloud scale based on moisture (fuller clouds when more moisture)
        const moistureScale = 0.7 + cloud.moisture * 0.6;
        cloud.puffs.forEach(puff => {
            puff.scale.setScalar(moistureScale);
            puff.scale.y *= 0.6; // Keep flattened
        });

        // Update cloud appearance based on weather state
        this.updateCloudAppearance(cloud, timeInfo);

        // Update rain particles (in world space, falling toward planet center)
        this.updateCloudRain(cloud, deltaSeconds);

        // Update lightning charge for storm clouds (faster charge, higher trigger chance)
        if (cloud.weatherState === 'storm' && cloud.canStorm) {
            cloud.lightningCharge += deltaSeconds * 0.25; // Faster charge buildup
            if (cloud.lightningCharge > 1 && Math.random() < 0.08) { // 8% chance per frame when charged
                this.triggerLightning(cloud);
                cloud.lightningCharge = 0;
            }
        }
        // Rain clouds can also occasionally produce lightning (less frequently)
        if (cloud.weatherState === 'rain' && cloud.canStorm && cloud.moisture > 0.7) {
            cloud.lightningCharge += deltaSeconds * 0.05;
            if (cloud.lightningCharge > 1.5 && Math.random() < 0.03) {
                this.triggerLightning(cloud);
                cloud.lightningCharge = 0;
            }
        }
    }

    transitionCloudState(cloud) {
        const currentState = cloud.weatherState;
        let nextState;

        // State machine for weather transitions - influenced by moisture and location
        if (currentState === 'clear') {
            // More likely to form clouds if high moisture
            if (cloud.moisture > 0.5) {
                nextState = 'cloudy';
            } else {
                nextState = Math.random() > 0.6 ? 'cloudy' : 'clear';
            }
        } else if (currentState === 'cloudy') {
            const roll = Math.random();
            // High moisture over land = rain or storm
            if (cloud.moisture > 0.6 && !cloud.isOverWater) {
                nextState = roll < 0.4 && cloud.canStorm ? 'storm' : 'rain';
            } else if (cloud.moisture < 0.3) {
                nextState = 'clear';
            } else if (roll < 0.2) {
                nextState = 'clear';
            } else if (roll < 0.6) {
                nextState = cloud.moisture > 0.5 ? 'rain' : 'cloudy';
            } else if (cloud.canStorm && cloud.moisture > 0.6) {
                nextState = 'storm';
            } else {
                nextState = 'cloudy';
            }
        } else if (currentState === 'rain') {
            const roll = Math.random();
            // Low moisture = stop raining
            if (cloud.moisture < 0.3) {
                nextState = 'cloudy';
            } else if (roll < 0.2) {
                nextState = 'cloudy';
            } else if (roll < 0.5 && cloud.canStorm && cloud.moisture > 0.5) {
                nextState = 'storm'; // More likely to escalate to storm
            } else {
                nextState = 'rain';
            }
        } else if (currentState === 'storm') {
            // Storms last longer before dissipating
            nextState = Math.random() > 0.6 ? 'storm' : (Math.random() > 0.5 ? 'rain' : 'cloudy');
        }

        cloud.weatherState = nextState;
        cloud.stateTimer = 20 + Math.random() * 40;
        cloud.stateProgress = 0;

        // Set target intensity (will smoothly interpolate)
        switch (nextState) {
            case 'clear': cloud.targetIntensity = 0; break;
            case 'cloudy': cloud.targetIntensity = 0.3; break;
            case 'rain': cloud.targetIntensity = 0.7; break;
            case 'storm': cloud.targetIntensity = 1.0; break;
        }
    }

    updateCloudAppearance(cloud, timeInfo) {
        const intensity = cloud.weatherIntensity;

        // Update puff colors based on THIS cloud's weather state
        cloud.puffs.forEach(puff => {
            // Base brightness from time of day
            let baseBrightness = 0.5 + (timeInfo ? timeInfo.sunIntensity : 0.5) * 0.5;

            // Each cloud has its own appearance based on its state
            let r, g, b;
            if (cloud.weatherState === 'storm') {
                // Dark purple-gray for storm clouds
                const darkFactor = 0.3 + (1 - intensity) * 0.3;
                r = baseBrightness * darkFactor * 0.5;
                g = baseBrightness * darkFactor * 0.5;
                b = baseBrightness * darkFactor * 0.7;
            } else if (cloud.weatherState === 'rain') {
                // Gray for rain clouds
                const darkFactor = 0.5 + (1 - intensity) * 0.3;
                r = baseBrightness * darkFactor * 0.7;
                g = baseBrightness * darkFactor * 0.7;
                b = baseBrightness * darkFactor * 0.8;
            } else if (cloud.weatherState === 'cloudy') {
                // Slightly gray
                r = baseBrightness * 0.85;
                g = baseBrightness * 0.85;
                b = baseBrightness * 0.9;
            } else {
                // White/bright for clear
                r = baseBrightness;
                g = baseBrightness;
                b = baseBrightness;
            }

            puff.material.color.setRGB(r, g, b);
            puff.material.opacity = 0.6 + intensity * 0.3;
        });
    }

    updateCloudRain(cloud, deltaSeconds) {
        const rain = cloud.rainSystem;
        const shouldRain = cloud.weatherState === 'rain' || cloud.weatherState === 'storm';

        rain.points.visible = shouldRain;

        if (!shouldRain) {
            rain.points.material.opacity = Math.max(0, rain.points.material.opacity - deltaSeconds * 2);
            return;
        }

        // Fade in rain
        const targetOpacity = cloud.weatherState === 'storm' ? 0.9 : 0.6;
        rain.points.material.opacity += (targetOpacity - rain.points.material.opacity) * deltaSeconds * 2;

        // Get cloud world position
        const cloudWorldPos = cloud.group.position.clone();

        // Direction toward planet center (normalized)
        const toCenter = cloudWorldPos.clone().normalize().negate();

        // Perpendicular axes for spreading rain
        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(toCenter, up).normalize();
        const forward = new THREE.Vector3().crossVectors(right, toCenter).normalize();

        // Update rain particle positions in WORLD SPACE
        const positions = rain.geometry.attributes.position.array;
        const fallDistance = 12; // How far rain falls before resetting

        for (let i = 0; i < rain.velocities.length; i++) {
            const vel = rain.velocities[i];

            // Advance progress
            vel.progress += vel.speed * deltaSeconds * 0.8;

            // Reset if fallen too far
            if (vel.progress > 1) {
                vel.progress = 0;
                vel.offsetX = (Math.random() - 0.5) * 6;
                vel.offsetZ = (Math.random() - 0.5) * 6;
            }

            // Calculate world position:
            // Start at cloud position, offset perpendicular to fall direction, then fall toward center
            const fallDist = vel.progress * fallDistance;

            const worldX = cloudWorldPos.x + right.x * vel.offsetX + forward.x * vel.offsetZ + toCenter.x * fallDist;
            const worldY = cloudWorldPos.y + right.y * vel.offsetX + forward.y * vel.offsetZ + toCenter.y * fallDist;
            const worldZ = cloudWorldPos.z + right.z * vel.offsetX + forward.z * vel.offsetZ + toCenter.z * fallDist;

            positions[i * 3] = worldX;
            positions[i * 3 + 1] = worldY;
            positions[i * 3 + 2] = worldZ;
        }

        rain.geometry.attributes.position.needsUpdate = true;
    }

    triggerLightning(cloud) {
        if (!this.lightningLight) return;

        this.activeLightningCloud = cloud;
        this.lightningTimer = 0.3; // Flash duration (longer for bolt visibility)

        // Create visual lightning bolt and get strike position
        const strikePos = this.createLightningBolt(cloud);

        // Position lightning light at strike point
        this.lightningLight.position.copy(strikePos);
        this.lightningLight.intensity = 8;

        // Notify callback of lightning strike for damage handling
        if (this.onLightningStrike && strikePos) {
            this.onLightningStrike({
                position: strikePos,
                cloudPosition: cloud.group.position.clone(),
                intensity: cloud.weatherIntensity
            });
        }

        console.log('[Weather] Lightning strike at', strikePos.x.toFixed(1), strikePos.y.toFixed(1), strikePos.z.toFixed(1));
    }

    updateLightning(deltaSeconds) {
        if (!this.lightningLight) return;

        if (this.lightningTimer > 0) {
            this.lightningTimer -= deltaSeconds;
            // Flicker effect for light
            this.lightningLight.intensity = Math.random() > 0.3 ? 4 + Math.random() * 4 : 0;

            // Fade out lightning bolt
            const fadeProgress = this.lightningTimer / 0.3;
            for (const child of this.lightningBoltGroup.children) {
                if (child.material) {
                    child.material.opacity = fadeProgress;
                }
            }
        } else {
            this.lightningLight.intensity = 0;
            this.activeLightningCloud = null;

            // Clear lightning bolt
            while (this.lightningBoltGroup.children.length > 0) {
                const child = this.lightningBoltGroup.children[0];
                this.lightningBoltGroup.remove(child);
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            }
        }
    }

    // Get weather info at a specific world position (for local effects like tree sway)
    getWeatherAtPosition(worldPos) {
        let closestCloud = null;
        let closestDist = Infinity;
        let totalInfluence = 0;
        let weightedIntensity = 0;

        for (const cloud of this.clouds) {
            const dist = worldPos.distanceTo(cloud.group.position);
            const influenceRadius = 20;

            if (dist < influenceRadius) {
                const influence = 1 - (dist / influenceRadius);
                totalInfluence += influence;
                weightedIntensity += cloud.weatherIntensity * influence;

                if (dist < closestDist) {
                    closestDist = dist;
                    closestCloud = cloud;
                }
            }
        }

        return {
            nearestCloud: closestCloud,
            distance: closestDist,
            intensity: totalInfluence > 0 ? weightedIntensity / totalInfluence : 0,
            isRaining: weightedIntensity > 0.5,
            windStrength: this.windStrength,
            windDirection: this.windDirection.clone()
        };
    }

    // Get global weather summary
    getWeatherInfo() {
        let maxIntensity = 0;
        let activeCount = 0;

        for (const cloud of this.clouds) {
            if (cloud.weatherIntensity > maxIntensity) {
                maxIntensity = cloud.weatherIntensity;
            }
            if (cloud.weatherState !== 'clear') {
                activeCount++;
            }
        }

        return {
            intensity: maxIntensity,
            activeCloudCount: activeCount,
            windStrength: this.windStrength,
            windDirection: this.windDirection.clone(),
            isRaining: activeCount > 3,
            isStorming: this.clouds.some(c => c.weatherState === 'storm')
        };
    }

    // Set weather for a specific cloud (god power)
    setCloudWeather(cloudIndex, weather) {
        if (cloudIndex >= 0 && cloudIndex < this.clouds.length) {
            const cloud = this.clouds[cloudIndex];
            cloud.weatherState = weather;
            switch (weather) {
                case 'clear': cloud.targetIntensity = 0; break;
                case 'cloudy': cloud.targetIntensity = 0.3; break;
                case 'rain': cloud.targetIntensity = 0.7; break;
                case 'storm': cloud.targetIntensity = 1.0; break;
            }
        }
    }

    // Trigger global storm (god power)
    triggerStorm() {
        for (const cloud of this.clouds) {
            if (cloud.canStorm) {
                cloud.weatherState = 'storm';
                cloud.targetIntensity = 1.0;
                cloud.stateTimer = 30;
            }
        }
    }

    // Clear all weather (god power)
    clearWeather() {
        for (const cloud of this.clouds) {
            cloud.weatherState = 'clear';
            cloud.targetIntensity = 0;
            cloud.stateTimer = 60;
        }
    }

    dispose() {
        for (const cloud of this.clouds) {
            if (cloud.rainSystem.points) {
                cloud.rainSystem.geometry.dispose();
                cloud.rainSystem.points.material.dispose();
            }
        }
        this.scene.remove(this.cloudGroup);
        this.scene.remove(this.rainGroup);
        if (this.lightningLight) {
            this.scene.remove(this.lightningLight);
        }
    }
}

export default WeatherSystem;
