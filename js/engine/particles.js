// Particle Effects System for Planet Eden
// AAA-quality particle effects using Three.js points
// Enhanced with weather particles, combat effects, and movement dust

import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.emitters = [];
        this.particlePool = [];
        this.maxParticles = 2000; // Increased for AAA effects
        this.geometry = null;
        this.material = null;
        this.points = null;

        // Particle data arrays
        this.positions = new Float32Array(this.maxParticles * 3);
        this.velocities = new Float32Array(this.maxParticles * 3);
        this.colors = new Float32Array(this.maxParticles * 3);
        this.sizes = new Float32Array(this.maxParticles);
        this.lifetimes = new Float32Array(this.maxParticles);
        this.maxLifetimes = new Float32Array(this.maxParticles);
        this.active = new Uint8Array(this.maxParticles);

        // Extended particle properties for AAA effects
        this.particleTypes = new Uint8Array(this.maxParticles); // 0=normal, 1=no-gravity, 2=wind-affected
        this.alphas = new Float32Array(this.maxParticles);
        this.rotations = new Float32Array(this.maxParticles);
        this.rotationSpeeds = new Float32Array(this.maxParticles);

        // Wind for weather particles
        this.windDirection = new THREE.Vector3(1, 0, 0.5).normalize();
        this.windStrength = 0.2;

        // Planet center for spherical gravity
        this.planetCenter = new THREE.Vector3(0, 0, 0);
        this.planetRadius = 50;
        this.useSphericalGravity = true;

        this.initialized = false;
    }

    init() {
        // Create geometry
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

        // Create material with vertex colors
        this.material = new THREE.PointsMaterial({
            size: 0.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true
        });

        // Create points mesh
        this.points = new THREE.Points(this.geometry, this.material);
        this.points.frustumCulled = false;
        this.scene.add(this.points);

        // Initialize all particles as inactive
        for (let i = 0; i < this.maxParticles; i++) {
            this.active[i] = 0;
            this.positions[i * 3 + 1] = -1000; // Hide below scene
        }

        this.initialized = true;
        console.log('[ParticleSystem] Initialized with', this.maxParticles, 'max particles');
    }

    // Get an inactive particle index
    getParticle() {
        for (let i = 0; i < this.maxParticles; i++) {
            if (this.active[i] === 0) {
                return i;
            }
        }
        return -1; // Pool exhausted
    }

    // Spawn a single particle with optional type
    spawn(x, y, z, vx, vy, vz, r, g, b, size, lifetime, type = 0) {
        const i = this.getParticle();
        if (i < 0) return i;

        const i3 = i * 3;
        this.positions[i3] = x;
        this.positions[i3 + 1] = y;
        this.positions[i3 + 2] = z;

        this.velocities[i3] = vx;
        this.velocities[i3 + 1] = vy;
        this.velocities[i3 + 2] = vz;

        this.colors[i3] = r;
        this.colors[i3 + 1] = g;
        this.colors[i3 + 2] = b;

        this.sizes[i] = size;
        this.lifetimes[i] = lifetime;
        this.maxLifetimes[i] = lifetime;
        this.active[i] = 1;
        this.particleTypes[i] = type;
        this.alphas[i] = 1.0;
        this.rotations[i] = Math.random() * Math.PI * 2;
        this.rotationSpeeds[i] = (Math.random() - 0.5) * 2;

        return i;
    }

    // Set wind parameters (called from weather system)
    setWind(direction, strength) {
        if (direction) {
            this.windDirection.copy(direction).normalize();
        }
        this.windStrength = strength;
    }

    // Effect: Birth sparkles
    emitBirth(x, y, z, type) {
        const colors = {
            0: [0.2, 0.8, 0.2],   // Plant - green
            1: [0.6, 0.8, 0.3],   // Herbivore - yellow-green
            2: [0.9, 0.4, 0.2],   // Carnivore - orange
            3: [0.3, 0.6, 1.0]    // Humanoid - blue
        };
        const [r, g, b] = colors[type] || [1, 1, 1];

        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            const vx = Math.cos(angle) * speed;
            const vz = Math.sin(angle) * speed;
            const vy = 2 + Math.random() * 3;

            this.spawn(
                x + (Math.random() - 0.5) * 0.5,
                y + 0.5,
                z + (Math.random() - 0.5) * 0.5,
                vx, vy, vz,
                r, g, b,
                0.3 + Math.random() * 0.3,
                0.5 + Math.random() * 0.5
            );
        }
    }

    // Effect: Death puff
    emitDeath(x, y, z) {
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const elevation = Math.random() * Math.PI - Math.PI / 2;
            const speed = 1 + Math.random() * 2;

            const vx = Math.cos(angle) * Math.cos(elevation) * speed;
            const vy = Math.sin(elevation) * speed + 1;
            const vz = Math.sin(angle) * Math.cos(elevation) * speed;

            // Gray/dark particles
            const gray = 0.2 + Math.random() * 0.3;

            this.spawn(
                x, y + 0.5, z,
                vx, vy, vz,
                gray, gray, gray,
                0.4 + Math.random() * 0.3,
                0.8 + Math.random() * 0.4
            );
        }
    }

    // Effect: Hunt blood splatter
    emitHunt(x, y, z) {
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3;

            this.spawn(
                x, y + 0.3, z,
                Math.cos(angle) * speed,
                1 + Math.random() * 2,
                Math.sin(angle) * speed,
                0.8, 0.1, 0.1, // Red
                0.2 + Math.random() * 0.2,
                0.3 + Math.random() * 0.2
            );
        }
    }

    // Effect: Building construction dust
    emitConstruction(x, y, z) {
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 1;

            // Brown/tan dust
            const r = 0.6 + Math.random() * 0.2;
            const g = 0.5 + Math.random() * 0.2;
            const b = 0.3 + Math.random() * 0.1;

            this.spawn(
                x + (Math.random() - 0.5) * 2,
                y,
                z + (Math.random() - 0.5) * 2,
                Math.cos(angle) * speed,
                0.5 + Math.random() * 1,
                Math.sin(angle) * speed,
                r, g, b,
                0.3 + Math.random() * 0.4,
                1 + Math.random() * 0.5
            );
        }
    }

    // Effect: Eating particles
    emitEating(x, y, z, isPlant) {
        for (let i = 0; i < 3; i++) {
            const r = isPlant ? 0.2 : 0.8;
            const g = isPlant ? 0.7 : 0.3;
            const b = isPlant ? 0.2 : 0.2;

            this.spawn(
                x + (Math.random() - 0.5) * 0.5,
                y + 0.5,
                z + (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5,
                0.5 + Math.random() * 0.5,
                (Math.random() - 0.5) * 0.5,
                r, g, b,
                0.15 + Math.random() * 0.1,
                0.3 + Math.random() * 0.2
            );
        }
    }

    // Effect: Resource gathering
    emitGather(x, y, z, resourceType) {
        const colors = {
            food: [0.2, 0.8, 0.2],
            wood: [0.5, 0.3, 0.1],
            stone: [0.5, 0.5, 0.5],
            metal: [0.7, 0.7, 0.8]
        };
        const [r, g, b] = colors[resourceType] || [0.8, 0.8, 0.8];

        for (let i = 0; i < 5; i++) {
            this.spawn(
                x + (Math.random() - 0.5),
                y + Math.random() * 0.5,
                z + (Math.random() - 0.5),
                (Math.random() - 0.5) * 0.3,
                1 + Math.random(),
                (Math.random() - 0.5) * 0.3,
                r, g, b,
                0.2 + Math.random() * 0.15,
                0.4 + Math.random() * 0.3
            );
        }
    }

    // Effect: Milestone celebration
    emitCelebration(x, y, z) {
        const colors = [
            [1, 0.8, 0],    // Gold
            [1, 0.3, 0.3],  // Red
            [0.3, 1, 0.3],  // Green
            [0.3, 0.3, 1],  // Blue
            [1, 0.3, 1]     // Purple
        ];

        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const elevation = Math.random() * Math.PI / 2;
            const speed = 3 + Math.random() * 4;

            const [r, g, b] = colors[Math.floor(Math.random() * colors.length)];

            this.spawn(
                x + (Math.random() - 0.5) * 2,
                y,
                z + (Math.random() - 0.5) * 2,
                Math.cos(angle) * Math.cos(elevation) * speed,
                Math.sin(elevation) * speed + 2,
                Math.sin(angle) * Math.cos(elevation) * speed,
                r, g, b,
                0.3 + Math.random() * 0.3,
                1 + Math.random() * 0.5
            );
        }
    }

    // === AAA WEATHER EFFECTS ===

    // Effect: Rain drops at a position (for local rain under clouds)
    emitRainDrop(x, y, z, intensity = 1.0) {
        // Blue-white rain drops with gravity
        const r = 0.6 + Math.random() * 0.2;
        const g = 0.7 + Math.random() * 0.2;
        const b = 0.9 + Math.random() * 0.1;

        this.spawn(
            x + (Math.random() - 0.5) * 2,
            y,
            z + (Math.random() - 0.5) * 2,
            this.windDirection.x * this.windStrength * 0.5,
            -8 - Math.random() * 4, // Fast downward velocity
            this.windDirection.z * this.windStrength * 0.5,
            r, g, b,
            0.08 + Math.random() * 0.04,
            0.5 + Math.random() * 0.3,
            2 // Wind-affected type
        );
    }

    // Effect: Rain splash when drops hit ground
    emitRainSplash(x, y, z) {
        for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 1;

            this.spawn(
                x, y + 0.05, z,
                Math.cos(angle) * speed,
                0.3 + Math.random() * 0.5,
                Math.sin(angle) * speed,
                0.7, 0.8, 1.0,
                0.05 + Math.random() * 0.03,
                0.15 + Math.random() * 0.1
            );
        }
    }

    // Effect: Lightning flash particles
    emitLightningFlash(x, y, z, intensity = 1.0) {
        // Bright white-blue sparks
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const elevation = (Math.random() - 0.5) * Math.PI;
            const speed = 3 + Math.random() * 5;

            this.spawn(
                x + (Math.random() - 0.5) * 2,
                y + (Math.random() - 0.5) * 2,
                z + (Math.random() - 0.5) * 2,
                Math.cos(angle) * Math.cos(elevation) * speed,
                Math.sin(elevation) * speed,
                Math.sin(angle) * Math.cos(elevation) * speed,
                0.9, 0.95, 1.0,
                0.3 + Math.random() * 0.2,
                0.1 + Math.random() * 0.15,
                1 // No gravity type
            );
        }
    }

    // Effect: Snow particles
    emitSnowflake(x, y, z) {
        // Gentle falling snowflakes with wind drift
        this.spawn(
            x + (Math.random() - 0.5) * 3,
            y,
            z + (Math.random() - 0.5) * 3,
            this.windDirection.x * this.windStrength * 2,
            -0.5 - Math.random() * 0.5, // Slow descent
            this.windDirection.z * this.windStrength * 2,
            0.95, 0.97, 1.0,
            0.15 + Math.random() * 0.1,
            3 + Math.random() * 2,
            2 // Wind-affected type
        );
    }

    // === AAA COMBAT EFFECTS ===

    // Effect: Melee attack impact (sword clash, punch, etc.)
    emitCombatImpact(x, y, z, attackerType = 3) {
        // Sparks and dust
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            const isSparta = Math.random() > 0.5;

            if (isSparta) {
                // Bright sparks
                this.spawn(
                    x, y + 0.5, z,
                    Math.cos(angle) * speed,
                    1 + Math.random() * 3,
                    Math.sin(angle) * speed,
                    1.0, 0.8 + Math.random() * 0.2, 0.3,
                    0.1 + Math.random() * 0.1,
                    0.2 + Math.random() * 0.2,
                    1 // No gravity for sparks
                );
            } else {
                // Dust
                this.spawn(
                    x, y + 0.3, z,
                    Math.cos(angle) * speed * 0.5,
                    0.5 + Math.random(),
                    Math.sin(angle) * speed * 0.5,
                    0.6, 0.5, 0.4,
                    0.2 + Math.random() * 0.15,
                    0.4 + Math.random() * 0.3
                );
            }
        }
    }

    // Effect: Blood splatter (enhanced version)
    emitBloodSplatter(x, y, z, intensity = 1.0) {
        const count = Math.floor(8 * intensity);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const elevation = Math.random() * Math.PI / 3;
            const speed = 1 + Math.random() * 3;

            // Dark red blood
            const r = 0.5 + Math.random() * 0.3;
            const g = 0.05 + Math.random() * 0.1;
            const b = 0.05 + Math.random() * 0.05;

            this.spawn(
                x, y + 0.5, z,
                Math.cos(angle) * speed,
                Math.sin(elevation) * speed + 0.5,
                Math.sin(angle) * speed,
                r, g, b,
                0.1 + Math.random() * 0.15,
                0.3 + Math.random() * 0.3
            );
        }
    }

    // Effect: Shield block / parry sparks
    emitBlockSparks(x, y, z) {
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 3;

            this.spawn(
                x, y + 0.8, z,
                Math.cos(angle) * speed,
                1 + Math.random() * 2,
                Math.sin(angle) * speed,
                1.0, 0.9, 0.5,
                0.08 + Math.random() * 0.05,
                0.15 + Math.random() * 0.1,
                1 // No gravity
            );
        }
    }

    // === AAA MOVEMENT EFFECTS ===

    // Effect: Dust cloud when creatures move fast
    emitMovementDust(x, y, z, speed = 1.0, direction = null) {
        if (speed < 0.5) return; // No dust for slow movement

        const count = Math.min(4, Math.floor(speed * 2));
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dustSpeed = 0.3 + Math.random() * 0.5;

            // Opposite to movement direction for trail effect
            let vx = Math.cos(angle) * dustSpeed;
            let vz = Math.sin(angle) * dustSpeed;

            if (direction) {
                vx -= direction.x * 0.5;
                vz -= direction.z * 0.5;
            }

            // Brown/tan dust color
            const brightness = 0.5 + Math.random() * 0.2;

            this.spawn(
                x + (Math.random() - 0.5) * 0.5,
                y + 0.1,
                z + (Math.random() - 0.5) * 0.5,
                vx,
                0.2 + Math.random() * 0.3,
                vz,
                brightness * 0.9, brightness * 0.75, brightness * 0.5,
                0.15 + Math.random() * 0.1,
                0.5 + Math.random() * 0.3
            );
        }
    }

    // Effect: Footstep dust puff
    emitFootstep(x, y, z, intensity = 1.0) {
        for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.2 + Math.random() * 0.3;

            this.spawn(
                x + (Math.random() - 0.5) * 0.3,
                y + 0.05,
                z + (Math.random() - 0.5) * 0.3,
                Math.cos(angle) * speed,
                0.15 + Math.random() * 0.2,
                Math.sin(angle) * speed,
                0.6, 0.5, 0.4,
                0.1 + Math.random() * 0.08,
                0.3 + Math.random() * 0.2
            );
        }
    }

    // Effect: Jump/land impact
    emitLandingImpact(x, y, z, intensity = 1.0) {
        const count = Math.floor(10 * intensity);
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
            const speed = 1.5 + Math.random() * 1.5;

            this.spawn(
                x, y + 0.1, z,
                Math.cos(angle) * speed,
                0.3 + Math.random() * 0.5,
                Math.sin(angle) * speed,
                0.55, 0.45, 0.35,
                0.12 + Math.random() * 0.08,
                0.4 + Math.random() * 0.3
            );
        }
    }

    // === AAA ENVIRONMENTAL EFFECTS ===

    // Effect: Fire sparks (for campfires, burning buildings)
    emitFireSparks(x, y, z, intensity = 1.0) {
        const count = Math.floor(5 * intensity);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.3 + Math.random() * 0.5;

            // Orange-yellow sparks
            this.spawn(
                x + (Math.random() - 0.5) * 0.5,
                y + Math.random() * 0.5,
                z + (Math.random() - 0.5) * 0.5,
                Math.cos(angle) * speed + this.windDirection.x * this.windStrength,
                1 + Math.random() * 2,
                Math.sin(angle) * speed + this.windDirection.z * this.windStrength,
                1.0, 0.6 + Math.random() * 0.3, 0.1,
                0.05 + Math.random() * 0.05,
                0.5 + Math.random() * 0.5,
                1 // No gravity - floats up
            );
        }
    }

    // Effect: Smoke puff (for fires, explosions)
    emitSmoke(x, y, z, intensity = 1.0) {
        const count = Math.floor(6 * intensity);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.2 + Math.random() * 0.3;

            // Gray smoke
            const gray = 0.3 + Math.random() * 0.2;

            this.spawn(
                x + (Math.random() - 0.5) * 0.8,
                y + Math.random() * 0.3,
                z + (Math.random() - 0.5) * 0.8,
                Math.cos(angle) * speed + this.windDirection.x * this.windStrength * 0.5,
                0.3 + Math.random() * 0.5,
                Math.sin(angle) * speed + this.windDirection.z * this.windStrength * 0.5,
                gray, gray, gray,
                0.3 + Math.random() * 0.2,
                1.5 + Math.random() * 1.0,
                1 // No gravity
            );
        }
    }

    // Effect: Water splash (for creatures entering water)
    emitWaterSplash(x, y, z, intensity = 1.0) {
        const count = Math.floor(15 * intensity);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2 * intensity;
            const elevation = Math.PI / 6 + Math.random() * Math.PI / 4;

            this.spawn(
                x + (Math.random() - 0.5) * 0.5,
                y,
                z + (Math.random() - 0.5) * 0.5,
                Math.cos(angle) * speed,
                Math.sin(elevation) * speed * 1.5,
                Math.sin(angle) * speed,
                0.6, 0.8, 1.0,
                0.08 + Math.random() * 0.06,
                0.4 + Math.random() * 0.3
            );
        }
    }

    // Effect: Leaves falling from trees
    emitFallingLeaf(x, y, z) {
        // Random green-brown color for variety
        const isGreen = Math.random() > 0.3;
        const r = isGreen ? 0.2 + Math.random() * 0.3 : 0.6 + Math.random() * 0.2;
        const g = isGreen ? 0.5 + Math.random() * 0.3 : 0.4 + Math.random() * 0.2;
        const b = isGreen ? 0.1 + Math.random() * 0.1 : 0.1 + Math.random() * 0.1;

        this.spawn(
            x + (Math.random() - 0.5) * 2,
            y,
            z + (Math.random() - 0.5) * 2,
            this.windDirection.x * this.windStrength * 3,
            -0.3 - Math.random() * 0.2,
            this.windDirection.z * this.windStrength * 3,
            r, g, b,
            0.1 + Math.random() * 0.08,
            2 + Math.random() * 2,
            2 // Wind-affected
        );
    }

    // Effect: Pollen/seeds floating in air
    emitPollen(x, y, z) {
        this.spawn(
            x + (Math.random() - 0.5) * 1,
            y + Math.random() * 0.5,
            z + (Math.random() - 0.5) * 1,
            this.windDirection.x * this.windStrength * 2 + (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.1,
            this.windDirection.z * this.windStrength * 2 + (Math.random() - 0.5) * 0.2,
            1.0, 0.95, 0.6,
            0.03 + Math.random() * 0.02,
            3 + Math.random() * 3,
            2 // Wind-affected
        );
    }

    // Update all particles
    update(delta) {
        if (!this.initialized) return;

        const gravity = -9.8;
        let needsUpdate = false;

        for (let i = 0; i < this.maxParticles; i++) {
            if (this.active[i] === 0) continue;

            needsUpdate = true;
            const i3 = i * 3;
            const particleType = this.particleTypes[i];

            // Update lifetime
            this.lifetimes[i] -= delta;
            if (this.lifetimes[i] <= 0) {
                this.active[i] = 0;
                this.positions[i3 + 1] = -1000; // Hide
                continue;
            }

            // Apply physics based on particle type
            switch (particleType) {
                case 0: // Normal particle with gravity
                    this.velocities[i3 + 1] += gravity * delta;
                    break;

                case 1: // No gravity (sparks, smoke, fire)
                    // Apply drag instead
                    this.velocities[i3] *= 0.98;
                    this.velocities[i3 + 1] *= 0.98;
                    this.velocities[i3 + 2] *= 0.98;
                    // Slight upward drift for smoke/fire
                    this.velocities[i3 + 1] += 0.5 * delta;
                    break;

                case 2: // Wind-affected (rain, snow, leaves)
                    // Apply wind force
                    this.velocities[i3] += this.windDirection.x * this.windStrength * delta * 5;
                    this.velocities[i3 + 2] += this.windDirection.z * this.windStrength * delta * 5;
                    // Light gravity for drifting
                    this.velocities[i3 + 1] += gravity * 0.3 * delta;
                    // Apply drag
                    this.velocities[i3] *= 0.99;
                    this.velocities[i3 + 2] *= 0.99;
                    break;
            }

            // Update position
            this.positions[i3] += this.velocities[i3] * delta;
            this.positions[i3 + 1] += this.velocities[i3 + 1] * delta;
            this.positions[i3 + 2] += this.velocities[i3 + 2] * delta;

            // Fade out based on remaining lifetime
            const lifeRatio = this.lifetimes[i] / this.maxLifetimes[i];
            this.alphas[i] = lifeRatio;

            // Size behavior based on type
            if (particleType === 1) {
                // Smoke/fire grows slightly
                this.sizes[i] *= 1.002;
            } else {
                // Normal particles shrink
                this.sizes[i] *= 0.99;
            }

            // Update rotation
            this.rotations[i] += this.rotationSpeeds[i] * delta;

            // Fade colors slightly
            const fadeFactor = 0.9995;
            this.colors[i3] *= fadeFactor;
            this.colors[i3 + 1] *= fadeFactor;
            this.colors[i3 + 2] *= fadeFactor;

            // Ground/sphere collision
            if (this.useSphericalGravity) {
                // Check distance from planet center
                const px = this.positions[i3];
                const py = this.positions[i3 + 1];
                const pz = this.positions[i3 + 2];
                const dist = Math.sqrt(px * px + py * py + pz * pz);

                if (dist < this.planetRadius) {
                    // Hit the planet surface
                    const normal = { x: px / dist, y: py / dist, z: pz / dist };
                    const vDotN = this.velocities[i3] * normal.x +
                                  this.velocities[i3 + 1] * normal.y +
                                  this.velocities[i3 + 2] * normal.z;

                    if (vDotN < -0.5) {
                        // Bounce with damping
                        this.velocities[i3] -= 1.5 * vDotN * normal.x;
                        this.velocities[i3 + 1] -= 1.5 * vDotN * normal.y;
                        this.velocities[i3 + 2] -= 1.5 * vDotN * normal.z;
                        this.velocities[i3] *= 0.3;
                        this.velocities[i3 + 1] *= 0.3;
                        this.velocities[i3 + 2] *= 0.3;

                        // Push back to surface
                        const push = (this.planetRadius - dist + 0.1);
                        this.positions[i3] += normal.x * push;
                        this.positions[i3 + 1] += normal.y * push;
                        this.positions[i3 + 2] += normal.z * push;
                    } else {
                        // Too slow - deactivate
                        this.active[i] = 0;
                        this.positions[i3 + 1] = -1000;
                    }
                }
            } else {
                // Flat world ground collision
                if (this.positions[i3 + 1] < 0) {
                    if (this.velocities[i3 + 1] < -1) {
                        this.velocities[i3 + 1] *= -0.3; // Bounce
                        this.positions[i3 + 1] = 0;
                    } else {
                        this.active[i] = 0;
                        this.positions[i3 + 1] = -1000;
                    }
                }
            }
        }

        if (needsUpdate) {
            this.geometry.attributes.position.needsUpdate = true;
            this.geometry.attributes.size.needsUpdate = true;
            this.geometry.attributes.color.needsUpdate = true;
        }
    }

    // Get active particle count (for debugging/performance monitoring)
    getActiveCount() {
        let count = 0;
        for (let i = 0; i < this.maxParticles; i++) {
            if (this.active[i]) count++;
        }
        return count;
    }

    dispose() {
        if (this.points) {
            this.scene.remove(this.points);
            this.geometry.dispose();
            this.material.dispose();
        }
    }
}
