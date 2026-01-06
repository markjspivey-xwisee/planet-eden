// Particle Effects System for Planet Eden
// Lightweight particle effects using Three.js points

import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.emitters = [];
        this.particlePool = [];
        this.maxParticles = 500;
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

    // Spawn a single particle
    spawn(x, y, z, vx, vy, vz, r, g, b, size, lifetime) {
        const i = this.getParticle();
        if (i < 0) return;

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

    // Update all particles
    update(delta) {
        if (!this.initialized) return;

        const gravity = -9.8;
        let needsUpdate = false;

        for (let i = 0; i < this.maxParticles; i++) {
            if (this.active[i] === 0) continue;

            needsUpdate = true;
            const i3 = i * 3;

            // Update lifetime
            this.lifetimes[i] -= delta;
            if (this.lifetimes[i] <= 0) {
                this.active[i] = 0;
                this.positions[i3 + 1] = -1000; // Hide
                continue;
            }

            // Apply gravity to velocity
            this.velocities[i3 + 1] += gravity * delta;

            // Update position
            this.positions[i3] += this.velocities[i3] * delta;
            this.positions[i3 + 1] += this.velocities[i3 + 1] * delta;
            this.positions[i3 + 2] += this.velocities[i3 + 2] * delta;

            // Fade out based on remaining lifetime
            const lifeRatio = this.lifetimes[i] / this.maxLifetimes[i];
            this.sizes[i] *= 0.99; // Shrink slightly

            // Ground collision - bounce or die
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

        if (needsUpdate) {
            this.geometry.attributes.position.needsUpdate = true;
            this.geometry.attributes.size.needsUpdate = true;
        }
    }

    dispose() {
        if (this.points) {
            this.scene.remove(this.points);
            this.geometry.dispose();
            this.material.dispose();
        }
    }
}
