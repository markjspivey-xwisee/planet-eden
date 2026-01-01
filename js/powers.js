/**
 * God Powers Module - Divine intervention and terraforming abilities
 */

// Active particle effects
let activeEffects = [];
let scene, planetGroup, planetGeometry, terrainHeightCache, organisms;

export function initPowers(sceneRef, planetGroupRef, planetGeo, terrainCache, organismsRef) {
    scene = sceneRef;
    planetGroup = planetGroupRef;
    planetGeometry = planetGeo;
    terrainHeightCache = terrainCache;
    organisms = organismsRef;
}

// Particle Effect Class
class ParticleEffect {
    constructor(position, config) {
        this.position = position.clone();
        this.particles = [];
        this.timer = 0;
        this.duration = config.duration || 2000;
        this.particleCount = config.count || 50;

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3);
        const colors = new Float32Array(this.particleCount * 3);

        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            positions[i3] = position.x;
            positions[i3 + 1] = position.y;
            positions[i3 + 2] = position.z;

            colors[i3] = config.color.r;
            colors[i3 + 1] = config.color.g;
            colors[i3 + 2] = config.color.b;

            this.particles.push({
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * config.spread,
                    (Math.random() - 0.5) * config.spread,
                    (Math.random() - 0.5) * config.spread
                ),
                life: 1
            });
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: config.size || 0.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });

        this.mesh = new THREE.Points(geometry, material);
        scene.add(this.mesh);
    }

    update(delta) {
        this.timer += delta * 1000;
        const progress = this.timer / this.duration;

        if (progress >= 1) return true; // Signal completion

        const positions = this.mesh.geometry.attributes.position.array;

        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            const particle = this.particles[i];

            // Apply velocity with gravity-like effect
            particle.velocity.y -= delta * 2;

            positions[i3] += particle.velocity.x * delta;
            positions[i3 + 1] += particle.velocity.y * delta;
            positions[i3 + 2] += particle.velocity.z * delta;

            // Add spiral effect
            const angle = this.timer * 0.005;
            const spiralForce = 0.1;
            positions[i3] += Math.cos(angle + i) * spiralForce * delta;
            positions[i3 + 2] += Math.sin(angle + i) * spiralForce * delta;

            particle.life = 1 - progress;
        }

        this.mesh.geometry.attributes.position.needsUpdate = true;

        // Fade out with easing
        const easeOut = 1 - Math.pow(progress, 2);
        this.mesh.material.opacity = easeOut * 0.9;

        return false;
    }

    dispose() {
        scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}

export function updateParticleEffects(delta) {
    for (let i = activeEffects.length - 1; i >= 0; i--) {
        const done = activeEffects[i].update(delta);
        if (done) {
            activeEffects[i].dispose();
            activeEffects.splice(i, 1);
        }
    }
}

export function createGlowEffect(organism, color, duration) {
    const effect = new ParticleEffect(organism.position, {
        count: 30,
        color: new THREE.Color(color),
        size: 0.6,
        spread: 2,
        duration: duration
    });
    activeEffects.push(effect);
}

export function createExplosionEffect(position, color = 0xFF4400) {
    const explosion = new ParticleEffect(position, {
        count: 80,
        color: new THREE.Color(color),
        size: 1.2,
        spread: 8,
        duration: 1500
    });
    activeEffects.push(explosion);

    setTimeout(() => {
        const smoke = new ParticleEffect(position, {
            count: 40,
            color: new THREE.Color(0x555555),
            size: 0.8,
            spread: 4,
            duration: 2000
        });
        activeEffects.push(smoke);
    }, 100);
}

export function createLightningEffect(startPos, endPos) {
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const pos = new THREE.Vector3().lerpVectors(startPos, endPos, t);

        pos.x += (Math.random() - 0.5) * 2;
        pos.y += (Math.random() - 0.5) * 2;
        pos.z += (Math.random() - 0.5) * 2;

        const bolt = new ParticleEffect(pos, {
            count: 15,
            color: new THREE.Color(0x00DDFF),
            size: 0.8,
            spread: 1,
            duration: 300
        });
        activeEffects.push(bolt);
    }

    createExplosionEffect(endPos, 0x00DDFF);
}

export function createHealingAura(position) {
    const heal = new ParticleEffect(position, {
        count: 60,
        color: new THREE.Color(0x00FF88),
        size: 0.5,
        spread: 5,
        duration: 2500
    });
    activeEffects.push(heal);

    setTimeout(() => {
        const ring = new ParticleEffect(position, {
            count: 40,
            color: new THREE.Color(0x88FFAA),
            size: 0.3,
            spread: 8,
            duration: 1500
        });
        activeEffects.push(ring);
    }, 200);
}

export function createPlagueCloud(position) {
    const plague = new ParticleEffect(position, {
        count: 100,
        color: new THREE.Color(0x440044),
        size: 1.0,
        spread: 6,
        duration: 3000
    });
    activeEffects.push(plague);
}

export function createEvolutionEffect(position) {
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            const helix = new ParticleEffect(position, {
                count: 50,
                color: new THREE.Color(0xFF00FF),
                size: 0.6,
                spread: 3,
                duration: 2000
            });
            activeEffects.push(helix);
        }, i * 300);
    }
}

// Terraforming Functions
export function modifyTerrain(clickPoint, brushSize, strength, getTerrainHeight, getBiomeColor, PLANET_RADIUS) {
    const positions = planetGeometry.attributes.position;
    const colors = planetGeometry.attributes.color;

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);

        const vertex = new THREE.Vector3(x, y, z);
        const dist = vertex.distanceTo(clickPoint);

        if (dist < brushSize) {
            const falloff = 1 - (dist / brushSize);
            const adjustment = strength * falloff;

            const len = vertex.length();
            const nx = x / len, ny = y / len, nz = z / len;

            const newLen = len + adjustment;
            positions.setXYZ(i, nx * newLen, ny * newLen, nz * newLen);

            const height = getTerrainHeight(nx, ny, nz);
            const latitude = Math.asin(ny);
            const color = getBiomeColor(height, latitude, nx, ny, nz);
            colors.setXYZ(i, color.r, color.g, color.b);
        }
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    planetGeometry.computeVertexNormals();
    terrainHeightCache.clear();
}

export function smoothTerrain(clickPoint, brushSize, getTerrainHeight, getBiomeColor) {
    const positions = planetGeometry.attributes.position;
    const colors = planetGeometry.attributes.color;

    let totalHeight = 0;
    let count = 0;
    for (let i = 0; i < positions.count; i++) {
        const vertex = new THREE.Vector3(positions.getX(i), positions.getY(i), positions.getZ(i));
        const dist = vertex.distanceTo(clickPoint);
        if (dist < brushSize) {
            totalHeight += vertex.length();
            count++;
        }
    }
    const avgHeight = totalHeight / count;

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        const vertex = new THREE.Vector3(x, y, z);
        const dist = vertex.distanceTo(clickPoint);

        if (dist < brushSize) {
            const falloff = 1 - (dist / brushSize);
            const currentLen = vertex.length();
            const newLen = currentLen + (avgHeight - currentLen) * falloff * 0.5;

            const len = vertex.length();
            const nx = x / len, ny = y / len, nz = z / len;
            positions.setXYZ(i, nx * newLen, ny * newLen, nz * newLen);

            const height = getTerrainHeight(nx, ny, nz);
            const latitude = Math.asin(ny);
            const color = getBiomeColor(height, latitude, nx, ny, nz);
            colors.setXYZ(i, color.r, color.g, color.b);
        }
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    planetGeometry.computeVertexNormals();
    terrainHeightCache.clear();
}

export function flattenTerrain(clickPoint, brushSize, getTerrainHeight, getBiomeColor) {
    const positions = planetGeometry.attributes.position;
    const colors = planetGeometry.attributes.color;
    const targetHeight = clickPoint.length();

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        const vertex = new THREE.Vector3(x, y, z);
        const dist = vertex.distanceTo(clickPoint);

        if (dist < brushSize) {
            const falloff = 1 - (dist / brushSize);
            const currentLen = vertex.length();
            const newLen = currentLen + (targetHeight - currentLen) * falloff;

            const len = vertex.length();
            const nx = x / len, ny = y / len, nz = z / len;
            positions.setXYZ(i, nx * newLen, ny * newLen, nz * newLen);

            const height = getTerrainHeight(nx, ny, nz);
            const latitude = Math.asin(ny);
            const color = getBiomeColor(height, latitude, nx, ny, nz);
            colors.setXYZ(i, color.r, color.g, color.b);
        }
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    planetGeometry.computeVertexNormals();
    terrainHeightCache.clear();
}

// God Powers Definition
export function createPowersSystem(Organism, showNotification, playSound, checkAchievement, spawnOrganism, PLANET_RADIUS) {
    const POWERS = {
        'bless': {
            name: 'Bless',
            targetType: 'creature',
            execute: (organism) => {
                organism.energy = Math.min(100, organism.energy + 50);
                organism.health = Math.min(100, organism.health + 50);
                createGlowEffect(organism, 0xFFD700, 2000);
                showNotification(`✨ Blessed ${organism.type} #${organism.id}`);
            }
        },
        'curse': {
            name: 'Curse',
            targetType: 'creature',
            execute: (organism) => {
                organism.energy = Math.max(0, organism.energy - 50);
                organism.health = Math.max(10, organism.health - 50);
                createGlowEffect(organism, 0x800080, 2000);
                showNotification(`💀 Cursed ${organism.type} #${organism.id}`);
            }
        },
        'smite': {
            name: 'Smite',
            targetType: 'creature',
            execute: (organism) => {
                const skyPos = organism.position.clone().normalize().multiplyScalar(PLANET_RADIUS + 30);
                createLightningEffect(skyPos, organism.position);
                organism.die();
                showNotification(`⚡ Smited ${organism.type} #${organism.id}`);
                playSound(200, 300);
            }
        },
        'resurrect': {
            name: 'Resurrect',
            targetType: 'dead-creature',
            execute: (organism) => {
                organism.dead = false;
                organism.deathTime = 0;
                organism.energy = 100;
                organism.health = 100;
                organism.age = 0;
                if (organism.mesh) {
                    organism.mesh.traverse(child => {
                        if (child.material) {
                            child.material.opacity = 1;
                            child.material.transparent = false;
                        }
                    });
                    organism.mesh.scale.setScalar(1);
                }
                createGlowEffect(organism, 0x00FFFF, 2000);
                showNotification(`🌟 Resurrected ${organism.type} #${organism.id}`);
                checkAchievement('godOfLife');
            }
        },
        'evolve': {
            name: 'Evolve',
            targetType: 'creature',
            execute: (organism) => {
                if (organism.brain) {
                    for (let i = 0; i < 5; i++) organism.brain.mutate();
                    organism.generation += 5;
                    createEvolutionEffect(organism.position);
                    showNotification(`🧬 Evolved ${organism.type} #${organism.id} to gen ${organism.generation}`);
                    playSound(800, 200);
                }
            }
        },
        'clone': {
            name: 'Clone',
            targetType: 'creature',
            execute: (organism) => {
                const offset = new THREE.Vector3(2, 0, 0);
                const clonePos = organism.position.clone().add(offset);
                const clone = new Organism(organism.type, clonePos, PLANET_RADIUS, organism.getTerrainHeight);
                clone.generation = organism.generation;
                clone.brain = organism.brain ? organism.brain.clone() : null;
                organisms.push(clone);
                createGlowEffect(organism, 0x00FFFF, 1500);
                createGlowEffect(clone, 0x00FFFF, 1500);
                showNotification(`👥 Cloned ${organism.type} #${organism.id}`);
            }
        },
        'boost-iq': {
            name: 'Boost IQ',
            targetType: 'creature',
            execute: (organism) => {
                if (organism.brain) {
                    // Double the hidden layer size
                    const newHidden = organism.brain.hiddenCount * 2;
                    organism.brain.weightsIH = [...organism.brain.weightsIH, ...organism.brain.weightsIH];
                    createGlowEffect(organism, 0x0088FF, 2000);
                    showNotification(`🧠 Boosted intelligence of ${organism.type} #${organism.id}`);
                }
            }
        },
        'meteor': {
            name: 'Meteor',
            targetType: 'location',
            execute: (position, effectRadius) => {
                createExplosionEffect(position, 0xFF4400);
                let killed = 0;
                for (const o of organisms) {
                    if (!o.dead && o.position.distanceTo(position) < effectRadius) {
                        o.die();
                        killed++;
                    }
                }
                showNotification(`☄️ Meteor strike! Killed ${killed} organisms`);
                playSound(100, 500);
                checkAchievement('meteorStrike');
            }
        },
        'lightning': {
            name: 'Lightning',
            targetType: 'creature',
            execute: (organism) => {
                const skyPos = organism.position.clone().normalize().multiplyScalar(PLANET_RADIUS + 30);
                createLightningEffect(skyPos, organism.position);
                organism.die();
                showNotification(`⚡ Lightning struck ${organism.type} #${organism.id}`);
                playSound(150, 250);
            }
        },
        'plague': {
            name: 'Plague',
            targetType: 'location',
            execute: (position, effectRadius) => {
                createPlagueCloud(position);
                let infected = 0;
                for (const o of organisms) {
                    if (!o.dead && o.type !== 'plant' && o.position.distanceTo(position) < effectRadius) {
                        o.plagued = true;
                        o.plagueTimer = 100;
                        infected++;
                    }
                }
                showNotification(`🦠 Plague spread! ${infected} organisms infected`);
                playSound(300, 400);
            }
        },
        'heal-rain': {
            name: 'Healing Rain',
            targetType: 'location',
            execute: (position, effectRadius) => {
                createHealingAura(position);
                let healed = 0;
                for (const o of organisms) {
                    if (!o.dead && o.position.distanceTo(position) < effectRadius) {
                        o.energy = Math.min(100, o.energy + 50);
                        o.health = Math.min(100, o.health + 50);
                        healed++;
                    }
                }
                showNotification(`🌧️ Healing rain! Restored ${healed} organisms`);
                playSound(900, 300);
            }
        },
        'abundance': {
            name: 'Abundance',
            targetType: 'location',
            execute: (position, effectRadius) => {
                createGlowEffect({position}, 0x00FF88, 2000);
                for (let i = 0; i < 20; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Math.random() * effectRadius;
                    const normal = position.clone().normalize();
                    const tangent = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
                    const spawnPos = position.clone().add(tangent.multiplyScalar(dist));
                    const plant = new Organism('plant', spawnPos, PLANET_RADIUS, organism => organism.getTerrainHeight);
                    organisms.push(plant);
                }
                showNotification(`🌿 Abundance! Spawned 20 plants`);
            }
        },
        'drought': {
            name: 'Drought',
            targetType: 'location',
            execute: (position, effectRadius) => {
                createGlowEffect({position}, 0x996633, 2000);
                let killed = 0;
                for (const o of organisms) {
                    if (!o.dead && o.type === 'plant' && o.position.distanceTo(position) < effectRadius) {
                        o.die();
                        killed++;
                    }
                }
                showNotification(`🏜️ Drought! Killed ${killed} plants`);
            }
        },
        'mass-spawn': {
            name: 'Mass Spawn',
            targetType: 'location',
            execute: (position, effectRadius, spawnCount) => {
                const type = prompt('Spawn type? (plant/herbivore/carnivore/humanoid)', 'plant');
                if (!type) return;
                for (let i = 0; i < spawnCount; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = Math.random() * effectRadius;
                    const normal = position.clone().normalize();
                    const tangent = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
                    const spawnPos = position.clone().add(tangent.multiplyScalar(dist));
                    organisms.push(new Organism(type, spawnPos, PLANET_RADIUS, () => 0));
                }
                createGlowEffect({position}, 0x00FFFF, 2000);
                showNotification(`🎯 Spawned ${spawnCount} ${type}s`);
            }
        },
        'clear-area': {
            name: 'Clear Area',
            targetType: 'location',
            execute: (position, effectRadius) => {
                createGlowEffect({position}, 0xFFFFFF, 1500);
                let removed = 0;
                for (let i = organisms.length - 1; i >= 0; i--) {
                    if (organisms[i].position.distanceTo(position) < effectRadius) {
                        if (organisms[i].mesh) planetGroup.remove(organisms[i].mesh);
                        organisms.splice(i, 1);
                        removed++;
                    }
                }
                showNotification(`💥 Cleared area! Removed ${removed} organisms`);
            }
        },
        'balance': {
            name: 'Balance Ecosystem',
            targetType: 'global',
            execute: () => {
                const targets = {plant: 50, herbivore: 15, carnivore: 5, humanoid: 4};
                const current = {plant: 0, herbivore: 0, carnivore: 0, humanoid: 0};
                for (const o of organisms) {
                    if (!o.dead) current[o.type]++;
                }
                let changes = 0;
                for (const type in targets) {
                    const diff = targets[type] - current[type];
                    if (diff > 0) {
                        spawnOrganism(type, diff);
                        changes += diff;
                    } else if (diff < 0) {
                        let toKill = -diff;
                        for (let i = organisms.length - 1; i >= 0 && toKill > 0; i--) {
                            if (organisms[i].type === type && !organisms[i].dead) {
                                organisms[i].die();
                                toKill--;
                                changes++;
                            }
                        }
                    }
                }
                showNotification(`⚖️ Balanced ecosystem! ${changes} changes`);
                checkAchievement('balance');
            }
        },
        'surplus': {
            name: 'Food Surplus',
            targetType: 'global',
            execute: (godMode) => {
                godMode.foodSurplusActive = true;
                godMode.foodSurplusTimer = 200;
                showNotification(`🌾 Food surplus activated for 200 time units!`);
            }
        },
        'famine': {
            name: 'Famine',
            targetType: 'global',
            execute: (godMode) => {
                godMode.famineActive = true;
                godMode.famineTimer = 200;
                showNotification(`🥀 Famine activated for 200 time units!`);
            }
        }
    };

    return POWERS;
}
