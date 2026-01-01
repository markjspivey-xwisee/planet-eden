/**
 * Organism Module - Living entities with neural network AI
 * Integrates with true NeuralNetwork for full behavioral control
 */

import { NeuralNetwork } from './neural-network.js';

let orgId = 0;

export class Organism {
    constructor(type, pos, planetRadius, getTerrainHeightFn) {
        this.id = orgId++;
        this.type = type;
        this.position = pos.clone();
        this.velocity = new THREE.Vector3();
        this.age = 0;
        this.energy = 100;
        this.health = 100;
        this.generation = 1;
        this.dead = false;
        this.deathTime = 0;
        this.reproduceTimer = Math.random() * 50;

        this.planetRadius = planetRadius;
        this.getTerrainHeight = getTerrainHeightFn;

        const sizes = { plant: 2.5, herbivore: 2, carnivore: 2.5, humanoid: 3 };
        const speeds = { plant: 0, herbivore: 0.18, carnivore: 0.22, humanoid: 0.15 };

        this.size = sizes[type];
        this.speed = speeds[type];

        // Create true neural network with multiple outputs for full control
        if (type !== 'plant') {
            // Input: energy, health, nearestFood, nearestPredator, nearestPrey (5 inputs)
            // Hidden: 8 neurons for complex decision-making
            // Output: 3 outputs (moveX, moveY, moveZ for full 3D movement control)
            const hiddenNeurons = type === 'humanoid' ? 12 : 8;
            this.brain = new NeuralNetwork(5, hiddenNeurons, 3);
        } else {
            this.brain = null;
        }

        this.mesh = null;
    }

    createMesh(planetGroup) {
        const group = new THREE.Group();

        if (this.type === 'plant') {
            const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, this.size * 0.8, 8);
            const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 });
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = this.size * 0.4;
            trunk.castShadow = true;
            group.add(trunk);

            const canopyGeo = new THREE.SphereGeometry(this.size * 0.6, 8, 8);
            const canopyMat = new THREE.MeshStandardMaterial({
                color: 0x2d5016,
                emissive: 0x1a3010,
                emissiveIntensity: 0.3,
                roughness: 0.7
            });
            const canopy = new THREE.Mesh(canopyGeo, canopyMat);
            canopy.position.y = this.size * 1.2;
            canopy.scale.set(1, 1.2, 1);
            canopy.castShadow = true;
            group.add(canopy);

        } else if (this.type === 'herbivore') {
            const bodyGeo = new THREE.BoxGeometry(this.size, this.size * 0.6, this.size * 1.2);
            const bodyMat = new THREE.MeshStandardMaterial({
                color: 0x8b6914,
                emissive: 0x443509,
                emissiveIntensity: 0.4,
                roughness: 0.6
            });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = this.size * 0.5;
            body.castShadow = true;
            group.add(body);

            const legGeo = new THREE.CylinderGeometry(0.15, 0.15, this.size * 0.5, 6);
            for (let i = 0; i < 4; i++) {
                const leg = new THREE.Mesh(legGeo, bodyMat);
                leg.position.set(
                    i % 2 === 0 ? -this.size * 0.3 : this.size * 0.3,
                    this.size * 0.25,
                    i < 2 ? this.size * 0.4 : -this.size * 0.4
                );
                leg.castShadow = true;
                group.add(leg);
            }

        } else if (this.type === 'carnivore') {
            const bodyGeo = new THREE.ConeGeometry(this.size * 0.7, this.size * 1.5, 8);
            const bodyMat = new THREE.MeshStandardMaterial({
                color: 0x8b0000,
                emissive: 0x450000,
                emissiveIntensity: 0.5,
                roughness: 0.5,
                metalness: 0.2
            });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = this.size * 0.8;
            body.rotation.x = Math.PI;
            body.castShadow = true;
            group.add(body);

        } else { // humanoid
            const bodyGeo = new THREE.BoxGeometry(this.size * 0.6, this.size * 1, this.size * 0.4);
            const bodyMat = new THREE.MeshStandardMaterial({
                color: 0xffdbac,
                emissive: 0x6b5544,
                emissiveIntensity: 0.3,
                roughness: 0.7
            });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = this.size * 0.9;
            body.castShadow = true;
            group.add(body);

            const headGeo = new THREE.SphereGeometry(this.size * 0.3, 8, 8);
            const head = new THREE.Mesh(headGeo, bodyMat);
            head.position.y = this.size * 1.6;
            head.castShadow = true;
            group.add(head);

            const legGeo = new THREE.CylinderGeometry(0.15, 0.15, this.size * 0.8, 6);
            for (let i = 0; i < 2; i++) {
                const leg = new THREE.Mesh(legGeo, bodyMat);
                leg.position.set(i === 0 ? -this.size * 0.2 : this.size * 0.2, this.size * 0.4, 0);
                leg.castShadow = true;
                group.add(leg);
            }
        }

        group.castShadow = true;
        group.receiveShadow = true;
        this.mesh = group;
        this.mesh.userData.organism = this;
        this.updateMeshPosition();
        planetGroup.add(this.mesh);
    }

    updateMeshPosition(selected = null) {
        if (!this.mesh) return;

        const normal = this.position.clone().normalize();
        const terrainHeight = this.getTerrainHeight(this.position);
        const distance = this.planetRadius + terrainHeight + (this.type === 'plant' ? 0 : 0.1);

        this.mesh.position.copy(normal.clone().multiplyScalar(distance));

        // Orient upright on sphere
        this.mesh.up.copy(normal);
        this.mesh.lookAt(this.mesh.position.clone().add(new THREE.Vector3(1, 0, 0)));

        if (this === selected) {
            this.mesh.traverse(child => {
                if (child.material) child.material.emissiveIntensity = 1.5;
            });
        } else {
            this.mesh.traverse(child => {
                if (child.material && child.material.emissive) {
                    child.material.emissiveIntensity = this.type === 'plant' ? 0.3 : 0.4;
                }
            });
        }
    }

    think(spatialGrid) {
        if (this.type === 'plant' || !this.brain) return;

        let nearestFood = null, nearestFoodDist = Infinity;
        let nearestPredator = null, nearestPredatorDist = Infinity;
        let nearestPrey = null, nearestPreyDist = Infinity;

        // Use spatial grid for efficient neighbor queries
        const nearby = spatialGrid.getNearby(this.position);

        for (const o of nearby) {
            if (o === this || o.dead) continue;
            const dist = this.position.distanceTo(o.position);

            if (this.type === 'herbivore' || this.type === 'humanoid') {
                if (o.type === 'plant' && dist < nearestFoodDist) {
                    nearestFood = o;
                    nearestFoodDist = dist;
                }
                if (o.type === 'carnivore' && dist < nearestPredatorDist) {
                    nearestPredator = o;
                    nearestPredatorDist = dist;
                }
            }

            if (this.type === 'carnivore') {
                if ((o.type === 'herbivore' || o.type === 'humanoid') && dist < nearestPreyDist) {
                    nearestPrey = o;
                    nearestPreyDist = dist;
                }
            }
        }

        // Prepare neural network inputs (normalized 0-1)
        const inputs = [
            this.energy / 100,
            this.health / 100,
            1 - Math.min(nearestFoodDist / 40, 1),
            1 - Math.min(nearestPredatorDist / 40, 1),
            1 - Math.min(nearestPreyDist / 40, 1)
        ];

        // Get neural network outputs (3 values for moveX, moveY, moveZ)
        const outputs = this.brain.predict(inputs);

        // HYBRID APPROACH: Use rules for target selection, neural network for movement modulation
        const normal = this.position.clone().normalize();
        let targetDirection = new THREE.Vector3();

        const isHungry = this.energy < 50;
        const inDanger = nearestPredatorDist < 15;

        if (this.type === 'herbivore' || this.type === 'humanoid') {
            if (inDanger && nearestPredator) {
                // FLEE from predator
                targetDirection.subVectors(this.position, nearestPredator.position);
            } else if (isHungry && nearestFood) {
                // SEEK food
                targetDirection.subVectors(nearestFood.position, this.position);
            } else {
                // Wander - use neural network outputs directly
                targetDirection.set(outputs[0], outputs[1], outputs[2]);
            }
        } else if (this.type === 'carnivore') {
            if (isHungry && nearestPrey) {
                // HUNT prey
                targetDirection.subVectors(nearestPrey.position, this.position);
            } else {
                // Wander - use neural network outputs directly
                targetDirection.set(outputs[0], outputs[1], outputs[2]);
            }
        }

        // Project onto tangent plane (move along sphere surface)
        targetDirection.sub(normal.clone().multiplyScalar(targetDirection.dot(normal)));
        targetDirection.normalize();

        // Apply movement with speed modulated by neural network confidence
        const nnConfidence = Math.abs(outputs[0] + outputs[1] + outputs[2]) / 3;
        this.velocity.copy(targetDirection.multiplyScalar(nnConfidence * this.speed));
    }

    update(delta, spatialGrid) {
        this.age += delta;

        // Handle decay animation for dead organisms
        if (this.dead) {
            this.deathTime += delta;
            const decayProgress = Math.min(this.deathTime / 60, 1);

            if (this.mesh) {
                const opacity = 0.5 * (1 - decayProgress);
                const sinkAmount = decayProgress * 2;
                const shrinkScale = 1 - decayProgress * 0.7;

                this.mesh.traverse(child => {
                    if (child.material) {
                        child.material.opacity = opacity;
                    }
                });

                this.mesh.scale.setScalar(shrinkScale);

                const normal = this.position.clone().normalize();
                const terrainHeight = this.getTerrainHeight(this.position);
                const distance = this.planetRadius + terrainHeight + (this.type === 'plant' ? 0 : 0.1) - sinkAmount;
                this.mesh.position.copy(normal.clone().multiplyScalar(distance));
            }

            return;
        }

        // Living organism logic
        this.energy -= delta * 0.15;
        this.reproduceTimer += delta;

        if (this.type !== 'plant') {
            this.think(spatialGrid);
            this.position.add(this.velocity);
            this.position.normalize().multiplyScalar(this.planetRadius);
            this.energy -= this.velocity.length() * 0.6;
        } else {
            this.energy += delta * 0.8;
            this.energy = Math.min(this.energy, 100);
        }

        if (this.energy <= 0 || this.health <= 0 || this.age > 800) {
            this.die();
        }

        this.updateMeshPosition();
    }

    eat(food) {
        this.energy += 65;
        this.energy = Math.min(this.energy, 100);
        food.die();
    }

    die() {
        this.dead = true;
        this.deathTime = 0;
        if (this.mesh) {
            this.mesh.traverse(child => {
                if (child.material) {
                    child.material.transparent = true;
                    child.material.opacity = 0.5;
                    const grayColor = new THREE.Color(0x666666);
                    if (child.material.emissive) {
                        child.material.emissive.copy(grayColor);
                        child.material.emissiveIntensity = 0.1;
                    }
                }
            });
        }
    }

    canReproduce() {
        return !this.dead && this.energy > 70 && this.health > 50 && this.reproduceTimer > 40;
    }

    reproduce() {
        this.energy -= 30;
        this.reproduceTimer = 0;

        const childBrain = this.brain ? this.brain.clone() : null;
        if (childBrain) childBrain.mutate();

        const offset = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        ).multiplyScalar(4);

        const child = new Organism(this.type, this.position.clone().add(offset), this.planetRadius, this.getTerrainHeight);
        child.generation = this.generation + 1;
        child.brain = childBrain;

        return child;
    }

    // Export for data analysis
    exportData() {
        return {
            id: this.id,
            type: this.type,
            position: { x: this.position.x, y: this.position.y, z: this.position.z },
            energy: this.energy,
            health: this.health,
            age: this.age,
            generation: this.generation,
            dead: this.dead,
            neuralNetwork: this.brain ? this.brain.export() : null
        };
    }
}

// Spatial grid for efficient collision detection
export class SpatialGrid {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }

    clear() {
        this.grid.clear();
    }

    getCellKey(position) {
        const x = Math.floor(position.x / this.cellSize);
        const y = Math.floor(position.y / this.cellSize);
        const z = Math.floor(position.z / this.cellSize);
        return `${x},${y},${z}`;
    }

    add(organism) {
        const key = this.getCellKey(organism.position);
        if (!this.grid.has(key)) {
            this.grid.set(key, []);
        }
        this.grid.get(key).push(organism);
    }

    getNearby(position) {
        const results = [];
        const centerKey = this.getCellKey(position);

        // Check center cell and 26 neighboring cells
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const [cx, cy, cz] = centerKey.split(',').map(Number);
                    const key = `${cx + dx},${cy + dy},${cz + dz}`;
                    if (this.grid.has(key)) {
                        results.push(...this.grid.get(key));
                    }
                }
            }
        }
        return results;
    }

    getAll() {
        const all = [];
        for (const cell of this.grid.values()) {
            all.push(...cell);
        }
        return all;
    }
}

// Helper function to spawn organisms
export function spawnOrganism(type, count, planetRadius, getTerrainHeightFn, organismsArray) {
    for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const pos = new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta),
            Math.cos(phi),
            Math.sin(phi) * Math.sin(theta)
        ).multiplyScalar(planetRadius);

        organismsArray.push(new Organism(type, pos, planetRadius, getTerrainHeightFn));
    }
}
