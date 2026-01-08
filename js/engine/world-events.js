// World Events Extension for Planet Eden
// Dramatic random events that create emergent storytelling
// Integrates with the variety system and event notifications

import { eventSystem } from './events.js';
import { WorldEvents } from './variety.js';

// =============================================================================
// WORLD EVENT MANAGER
// =============================================================================
export class WorldEventManager {
    constructor(renderer) {
        this.renderer = renderer;
        this.activeEvents = new Map();
        this.eventCooldowns = new Map();
        this.lastEventCheck = 0;
        this.eventCheckInterval = 5000; // Check every 5 seconds
        this.minEventInterval = 60000; // At least 60 seconds between events
        this.lastEventTime = 0;

        // Visual effects
        this.meteorEffects = [];
        this.weatherOverrides = {};
        this.biomeModifiers = {};

        console.log('[WorldEventManager] Initialized with', Object.keys(WorldEvents).length, 'event types');
    }

    // Update - called each frame
    update(deltaMs, simTime, stats) {
        const now = performance.now();

        // Check for new events periodically
        if (now - this.lastEventCheck > this.eventCheckInterval) {
            this.lastEventCheck = now;
            this.checkForNewEvent(simTime, stats);
        }

        // Update active events
        this.updateActiveEvents(deltaMs);
    }

    // Check if a new event should trigger
    checkForNewEvent(simTime, stats) {
        const now = performance.now();

        // Enforce minimum interval between events
        if (now - this.lastEventTime < this.minEventInterval) {
            return null;
        }

        // Only trigger events occasionally
        if (Math.random() > 0.1) {
            return null;
        }

        // Check each event type
        for (const [eventKey, eventDef] of Object.entries(WorldEvents)) {
            // Check cooldown
            const cooldown = this.eventCooldowns.get(eventKey) || 0;
            if (now < cooldown) continue;

            // Random chance based on rarity
            if (Math.random() < eventDef.rarity) {
                this.triggerEvent(eventKey, eventDef);
                this.lastEventTime = now;

                // Set cooldown (event duration + 60 seconds)
                this.eventCooldowns.set(eventKey, now + (eventDef.duration * 1000) + 60000);
                return eventDef;
            }
        }

        return null;
    }

    // Trigger a specific event
    triggerEvent(eventKey, eventDef) {
        console.log(`[WorldEventManager] Triggering event: ${eventDef.name}`);

        const now = performance.now();
        const eventInstance = {
            key: eventKey,
            definition: eventDef,
            startTime: now,
            endTime: now + (eventDef.duration * 1000),
            progress: 0,
            data: this.initEventData(eventKey, eventDef)
        };

        this.activeEvents.set(eventKey, eventInstance);

        // Notify event system
        eventSystem.onWorldEvent(eventDef);

        // Apply immediate effects
        this.applyEventStart(eventKey, eventDef, eventInstance.data);

        return eventInstance;
    }

    // Initialize event-specific data
    initEventData(eventKey, eventDef) {
        const data = {};

        switch (eventKey) {
            case 'METEOR_STRIKE':
                // Random impact location
                data.impactX = (Math.random() - 0.5) * 80;
                data.impactZ = (Math.random() - 0.5) * 80;
                data.radius = eventDef.effects.radius;
                data.impacted = false;
                break;

            case 'PLAGUE':
                data.infectedCreatures = new Set();
                data.spreadRadius = eventDef.effects.spreadRadius;
                data.originX = (Math.random() - 0.5) * 60;
                data.originZ = (Math.random() - 0.5) * 60;
                break;

            case 'FLOOD':
                data.waterLevelIncrease = 0;
                data.maxIncrease = eventDef.effects.waterLevelRise;
                data.peakTime = eventDef.duration * 0.4; // Peak at 40%
                break;

            case 'GOLDEN_AGE':
                // Pick a random tribe to benefit
                if (this.renderer && this.renderer.wasmModule) {
                    const tribes = this.renderer.wasmModule.getAllTribes();
                    if (tribes.length > 0) {
                        data.targetTribe = tribes[Math.floor(Math.random() * tribes.length)].id;
                    }
                }
                break;

            case 'GREAT_HUNT':
                data.aggressionMultiplier = eventDef.effects.predatorAggression;
                break;

            case 'DROUGHT':
                data.waterDepletion = 0;
                data.maxDepletion = eventDef.effects.waterDepletion;
                break;

            case 'MIGRATION':
                // Random direction
                const angle = Math.random() * Math.PI * 2;
                data.directionX = Math.cos(angle);
                data.directionZ = Math.sin(angle);
                data.directionName = this.getDirectionName(angle);
                break;

            case 'VOLCANIC_ACTIVITY':
                // Volcano location (usually at high terrain)
                data.volcanoX = (Math.random() - 0.5) * 40;
                data.volcanoZ = (Math.random() - 0.5) * 40;
                data.intensity = 0;
                data.maxIntensity = 1.0;
                break;

            case 'AURORA':
                data.colors = [
                    [0.2, 1.0, 0.4],  // Green
                    [0.4, 0.2, 1.0],  // Purple
                    [1.0, 0.2, 0.6]   // Pink
                ];
                break;

            case 'ABUNDANCE':
                data.growthMultiplier = eventDef.effects.plantGrowth;
                break;
        }

        return data;
    }

    getDirectionName(angle) {
        const directions = ['east', 'northeast', 'north', 'northwest', 'west', 'southwest', 'south', 'southeast'];
        const index = Math.round(angle / (Math.PI / 4)) % 8;
        return directions[index];
    }

    // Apply effects when event starts
    applyEventStart(eventKey, eventDef, data) {
        switch (eventKey) {
            case 'METEOR_STRIKE':
                // Create meteor visual effect
                this.createMeteorEffect(data.impactX, data.impactZ);
                break;

            case 'FLOOD':
                // Weather override - heavy rain
                this.weatherOverrides.rain = true;
                this.weatherOverrides.intensity = 1.0;
                break;

            case 'DROUGHT':
                // Weather override - no rain
                this.weatherOverrides.drought = true;
                this.weatherOverrides.rain = false;
                break;

            case 'VOLCANIC_ACTIVITY':
                // Screen shake, dark sky
                this.createVolcanicEffects(data.volcanoX, data.volcanoZ);
                break;

            case 'AURORA':
                // Only visible at night
                if (this.renderer && this.renderer.timeSystem) {
                    const timeInfo = this.renderer.timeSystem.getTimeInfo();
                    if (!timeInfo.isNight) {
                        // Delay aurora until night
                        console.log('[WorldEventManager] Aurora waiting for nightfall');
                    }
                }
                break;
        }
    }

    // Update active events
    updateActiveEvents(deltaMs) {
        const now = performance.now();
        const eventsToEnd = [];

        for (const [eventKey, event] of this.activeEvents) {
            // Calculate progress
            const elapsed = now - event.startTime;
            const duration = event.endTime - event.startTime;
            event.progress = Math.min(1.0, elapsed / duration);

            // Update event effects
            this.updateEventEffects(eventKey, event, deltaMs);

            // Check if event has ended
            if (now >= event.endTime) {
                eventsToEnd.push(eventKey);
            }
        }

        // End completed events
        for (const eventKey of eventsToEnd) {
            this.endEvent(eventKey);
        }
    }

    // Update ongoing event effects
    updateEventEffects(eventKey, event, deltaMs) {
        const deltaSec = deltaMs / 1000;

        switch (eventKey) {
            case 'METEOR_STRIKE':
                // Impact happens at 50% progress
                if (event.progress >= 0.5 && !event.data.impacted) {
                    this.applyMeteorImpact(event.data);
                    event.data.impacted = true;
                }
                break;

            case 'PLAGUE':
                // Spread plague periodically
                if (Math.random() < 0.1 * deltaSec) {
                    this.spreadPlague(event.data);
                }
                // Damage infected creatures
                this.damageInfectedCreatures(event.data, event.definition.effects.damagePerSecond * deltaSec);
                break;

            case 'FLOOD':
                // Water level rises then falls
                if (event.progress < 0.4) {
                    event.data.waterLevelIncrease = event.data.maxIncrease * (event.progress / 0.4);
                } else {
                    event.data.waterLevelIncrease = event.data.maxIncrease * (1 - (event.progress - 0.4) / 0.6);
                }
                break;

            case 'GOLDEN_AGE':
                // Bonus resources for target tribe
                // (Applied in variety system integration)
                break;

            case 'DROUGHT':
                // Gradually increase drought effects
                event.data.waterDepletion = event.data.maxDepletion * event.progress;
                break;

            case 'MIGRATION':
                // Move herds in migration direction
                // (Applied through behavior system)
                break;

            case 'VOLCANIC_ACTIVITY':
                // Intensity peaks at 50%
                if (event.progress < 0.5) {
                    event.data.intensity = event.data.maxIntensity * (event.progress / 0.5);
                } else {
                    event.data.intensity = event.data.maxIntensity * (1 - (event.progress - 0.5) / 0.5);
                }
                break;

            case 'AURORA':
                // Update aurora visual effect
                this.updateAuroraEffect(event.data, event.progress);
                break;
        }
    }

    // End an event
    endEvent(eventKey) {
        const event = this.activeEvents.get(eventKey);
        if (!event) return;

        console.log(`[WorldEventManager] Event ended: ${event.definition.name}`);

        // Notify event system
        eventSystem.onWorldEventEnd(event.definition);

        // Clean up effects
        this.cleanupEventEffects(eventKey, event);

        this.activeEvents.delete(eventKey);
    }

    // Clean up event effects
    cleanupEventEffects(eventKey, event) {
        switch (eventKey) {
            case 'FLOOD':
            case 'DROUGHT':
                delete this.weatherOverrides.rain;
                delete this.weatherOverrides.drought;
                delete this.weatherOverrides.intensity;
                break;

            case 'PLAGUE':
                event.data.infectedCreatures.clear();
                break;
        }
    }

    // Visual effect creators
    createMeteorEffect(impactX, impactZ) {
        if (!this.renderer || !this.renderer.scene) return;

        // Create meteor trail (particle effect placeholder)
        console.log(`[WorldEventManager] Meteor approaching (${impactX.toFixed(1)}, ${impactZ.toFixed(1)})`);

        // The visual would be created in the renderer
        if (this.renderer.createMeteorVisual) {
            this.renderer.createMeteorVisual(impactX, impactZ);
        }
    }

    applyMeteorImpact(data) {
        console.log(`[WorldEventManager] METEOR IMPACT at (${data.impactX.toFixed(1)}, ${data.impactZ.toFixed(1)})`);

        // Notify event system
        eventSystem.onMeteorStrike(data.impactX, data.impactZ, 200);

        // Apply damage to nearby creatures
        if (this.renderer && this.renderer.wasmModule) {
            const orgData = this.renderer.wasmModule.getOrganismData();
            if (orgData) {
                for (let i = 0; i < orgData.count; i++) {
                    if (!orgData.alive[i]) continue;

                    const dx = orgData.positionsX[i] - data.impactX;
                    const dz = orgData.positionsZ[i] - data.impactZ;
                    const dist = Math.sqrt(dx * dx + dz * dz);

                    if (dist < data.radius) {
                        const damage = 200 * (1 - dist / data.radius);
                        // Apply damage through WASM (if available)
                        console.log(`[WorldEventManager] Creature ${i} hit by meteor for ${damage.toFixed(0)} damage`);
                    }
                }
            }
        }

        // Create crater visual
        if (this.renderer.createCraterVisual) {
            this.renderer.createCraterVisual(data.impactX, data.impactZ, data.radius);
        }
    }

    spreadPlague(data) {
        if (!this.renderer || !this.renderer.wasmModule) return;

        const orgData = this.renderer.wasmModule.getOrganismData();
        if (!orgData) return;

        // Find potential new infections
        for (let i = 0; i < orgData.count; i++) {
            if (!orgData.alive[i]) continue;
            if (data.infectedCreatures.has(i)) continue;

            // Skip carnivores (plague doesn't affect them in this definition)
            if (orgData.types[i] === 2) continue;

            // Check distance from plague origin or infected creatures
            let canInfect = false;
            const x = orgData.positionsX[i];
            const z = orgData.positionsZ[i];

            // Check origin
            const originDist = Math.sqrt((x - data.originX) ** 2 + (z - data.originZ) ** 2);
            if (originDist < data.spreadRadius) {
                canInfect = true;
            }

            // Check other infected
            if (!canInfect) {
                for (const infectedId of data.infectedCreatures) {
                    if (!orgData.alive[infectedId]) continue;
                    const ix = orgData.positionsX[infectedId];
                    const iz = orgData.positionsZ[infectedId];
                    const dist = Math.sqrt((x - ix) ** 2 + (z - iz) ** 2);
                    if (dist < data.spreadRadius * 0.5) {
                        canInfect = true;
                        break;
                    }
                }
            }

            // Random chance to actually infect
            if (canInfect && Math.random() < 0.3) {
                data.infectedCreatures.add(i);
            }
        }
    }

    damageInfectedCreatures(data, damage) {
        // Damage would be applied through WASM
        // This is a placeholder - the actual implementation would modify health values
        for (const creatureId of data.infectedCreatures) {
            // Track that creature should take damage
        }
    }

    createVolcanicEffects(volcanoX, volcanoZ) {
        console.log(`[WorldEventManager] Volcanic activity at (${volcanoX.toFixed(1)}, ${volcanoZ.toFixed(1)})`);

        // Visual effects would be created in renderer
        if (this.renderer.createVolcanoVisual) {
            this.renderer.createVolcanoVisual(volcanoX, volcanoZ);
        }
    }

    updateAuroraEffect(data, progress) {
        // Update aurora colors based on progress
        // This would be applied to the sky shader
    }

    // Get current event effects for other systems to use
    getActiveEffects() {
        const effects = {
            resourceMultiplier: 1.0,
            birthRateBonus: 0,
            predatorAggression: 1.0,
            weatherOverrides: { ...this.weatherOverrides },
            migrationDirection: null,
            waterLevel: 0
        };

        for (const [eventKey, event] of this.activeEvents) {
            switch (eventKey) {
                case 'GOLDEN_AGE':
                    effects.resourceMultiplier *= event.definition.effects.resourceMultiplier;
                    effects.birthRateBonus += event.definition.effects.birthRateBonus;
                    break;

                case 'GREAT_HUNT':
                    effects.predatorAggression *= event.definition.effects.predatorAggression;
                    break;

                case 'MIGRATION':
                    effects.migrationDirection = {
                        x: event.data.directionX,
                        z: event.data.directionZ
                    };
                    break;

                case 'FLOOD':
                    effects.waterLevel = event.data.waterLevelIncrease;
                    break;

                case 'ABUNDANCE':
                    effects.resourceMultiplier *= event.definition.effects.foodYield;
                    effects.birthRateBonus += event.definition.effects.birthRate - 1.0;
                    break;
            }
        }

        return effects;
    }

    // Check if specific event is active
    isEventActive(eventKey) {
        return this.activeEvents.has(eventKey);
    }

    // Get active event names for UI
    getActiveEventNames() {
        return Array.from(this.activeEvents.values()).map(e => e.definition.name);
    }
}

// Factory function
export function createWorldEventManager(renderer) {
    return new WorldEventManager(renderer);
}
