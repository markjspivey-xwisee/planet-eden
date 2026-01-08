// Variety Integration Module for Planet Eden
// Connects all variety systems and provides unified API for renderer

import { varietySystem, HerbivoreSpecies, CarnivoreSpecies, Biomes, BehaviorPatterns, VisualVariety } from './variety.js';
import { creatureVisuals } from './creatures.js';
import { BuildingVisuals, BuildingDefinitions } from './buildings.js';
import { WorldEventManager } from './world-events.js';
import { eventSystem } from './events.js';

// =============================================================================
// VARIETY INTEGRATION SYSTEM
// =============================================================================
export class VarietyIntegration {
    constructor(renderer) {
        this.renderer = renderer;
        this.buildingVisuals = new BuildingVisuals(renderer?.scene);
        this.worldEvents = null;
        this.initialized = false;

        // Species tracking for emergent behavior
        this.creatureSpecies = new Map(); // creatureId -> species data
        this.herbivoreCount = new Map();  // species -> count
        this.carnivoreCount = new Map();  // species -> count

        // Behavior tracking
        this.herds = new Map();           // herdId -> herd data
        this.packs = new Map();           // packId -> pack data
        this.territories = new Map();     // markerId -> territory data

        // Discovery tracking (for events)
        this.discoveredSpecies = new Set();

        // Biome map cache
        this.biomeGrid = null;
        this.biomeGridSize = 20;

        console.log('[VarietyIntegration] Created');
    }

    // Initialize all variety systems
    init() {
        if (this.initialized) return;

        varietySystem.init();

        if (this.renderer) {
            this.worldEvents = new WorldEventManager(this.renderer);
        }

        this.initBiomeGrid();
        this.initialized = true;

        console.log('[VarietyIntegration] Initialized all variety systems');
        console.log(`  - ${Object.keys(HerbivoreSpecies).length} herbivore species`);
        console.log(`  - ${Object.keys(CarnivoreSpecies).length} carnivore species`);
        console.log(`  - ${Object.keys(Biomes).length} biome types`);
        console.log(`  - ${Object.keys(BuildingDefinitions).length} building types`);
    }

    // Initialize biome grid for position-based biome lookup
    initBiomeGrid() {
        this.biomeGrid = [];
        for (let x = 0; x < this.biomeGridSize; x++) {
            this.biomeGrid[x] = [];
            for (let z = 0; z < this.biomeGridSize; z++) {
                // Simple biome generation based on position
                const worldX = (x / this.biomeGridSize - 0.5) * 100;
                const worldZ = (z / this.biomeGridSize - 0.5) * 100;

                // Generate moisture and temperature from position
                const moisture = 0.5 + Math.sin(worldX * 0.05) * 0.3 + Math.cos(worldZ * 0.07) * 0.2;
                const temperature = 0.5 - Math.abs(worldZ) / 100;

                this.biomeGrid[x][z] = this.determineBiome(moisture, temperature);
            }
        }
    }

    // Determine biome from environmental factors
    determineBiome(moisture, temperature) {
        if (temperature < 0.2) {
            return 'TUNDRA';
        }
        if (moisture < 0.2) {
            return temperature > 0.5 ? 'DESERT' : 'GRASSLAND';
        }
        if (moisture > 0.8 && temperature > 0.6) {
            return 'JUNGLE';
        }
        if (moisture > 0.5) {
            return 'FOREST';
        }
        if (temperature > 0.5 && moisture < 0.4) {
            return 'SAVANNA';
        }
        return 'GRASSLAND';
    }

    // Get biome at world position
    getBiomeAt(worldX, worldZ) {
        const gridX = Math.floor((worldX / 100 + 0.5) * this.biomeGridSize);
        const gridZ = Math.floor((worldZ / 100 + 0.5) * this.biomeGridSize);

        const clampedX = Math.max(0, Math.min(this.biomeGridSize - 1, gridX));
        const clampedZ = Math.max(0, Math.min(this.biomeGridSize - 1, gridZ));

        const biomeName = this.biomeGrid?.[clampedX]?.[clampedZ] || 'GRASSLAND';
        return Biomes[biomeName] || Biomes.GRASSLAND;
    }

    // ==========================================================================
    // CREATURE VARIETY API
    // ==========================================================================

    // Assign species to a creature based on position and type
    assignCreatureSpecies(creatureId, organismType, worldX, worldZ) {
        const biome = this.getBiomeAt(worldX, worldZ);
        let species = null;

        if (organismType === 1) { // Herbivore
            species = varietySystem.getRandomHerbivoreSpecies(biome.name?.toLowerCase());
            this.herbivoreCount.set(species.name, (this.herbivoreCount.get(species.name) || 0) + 1);
        } else if (organismType === 2) { // Carnivore
            species = varietySystem.getRandomCarnivoreSpecies(biome.name?.toLowerCase());
            this.carnivoreCount.set(species.name, (this.carnivoreCount.get(species.name) || 0) + 1);
        }

        if (species) {
            const creatureData = {
                id: creatureId,
                species: species,
                speciesId: species.id,
                biome: biome.name,
                age: 0,
                visualOverrides: this.generateVisualVariety(species)
            };

            this.creatureSpecies.set(creatureId, creatureData);

            // Fire discovery event for first sighting
            if (!this.discoveredSpecies.has(species.name)) {
                this.discoveredSpecies.add(species.name);
                eventSystem.onSpeciesDiscovered(species.name, biome.name);
            }

            return creatureData;
        }

        return null;
    }

    // Generate visual variety for a creature
    generateVisualVariety(species) {
        const overrides = {};

        // Age-based variety (random age stage for variety)
        const ageRoll = Math.random();
        if (ageRoll < 0.15) {
            overrides.ageStage = 'juvenile';
            overrides.sizeMultiplier = VisualVariety.AGE_STAGES.juvenile.sizeMultiplier;
        } else if (ageRoll > 0.9) {
            overrides.ageStage = 'elder';
            overrides.sizeMultiplier = VisualVariety.AGE_STAGES.elder.sizeMultiplier;
        } else {
            overrides.ageStage = 'adult';
            overrides.sizeMultiplier = 0.9 + Math.random() * 0.2; // Slight variation
        }

        // Color variation
        if (species.visual.furVariation) {
            overrides.furColor = species.visual.furVariation[
                Math.floor(Math.random() * species.visual.furVariation.length)
            ];
        }

        // Feature variation
        overrides.features = [];
        if (species.visual.hasAntlers && Math.random() < (species.visual.antlerChance || 0.5)) {
            overrides.features.push('antlers');
        }
        if (species.visual.hasMane && Math.random() < (species.visual.maneChance || 0.5)) {
            overrides.features.push('mane');
        }
        if (species.visual.hasTusks && Math.random() < (species.visual.tuskChance || 0.7)) {
            overrides.features.push('tusks');
        }

        // Pattern
        overrides.pattern = varietySystem.selectPattern();

        return overrides;
    }

    // Get species info for a creature
    getCreatureSpecies(creatureId) {
        return this.creatureSpecies.get(creatureId);
    }

    // Create a creature mesh with species variety
    createCreatureMesh(organismType, creatureId, worldX = 0, worldZ = 0) {
        // Assign species if not already assigned
        let speciesData = this.creatureSpecies.get(creatureId);
        if (!speciesData && (organismType === 1 || organismType === 2)) {
            speciesData = this.assignCreatureSpecies(creatureId, organismType, worldX, worldZ);
        }

        if (speciesData && speciesData.species) {
            // Create mesh with species-specific visuals
            if (organismType === 1) {
                return creatureVisuals.createHerbivoreMesh(
                    speciesData.species.id,
                    speciesData.visualOverrides
                );
            } else if (organismType === 2) {
                return creatureVisuals.createCarnivoreMesh(
                    speciesData.species.id,
                    speciesData.visualOverrides
                );
            }
        }

        return null;
    }

    // Remove creature from tracking
    removeCreature(creatureId) {
        const speciesData = this.creatureSpecies.get(creatureId);
        if (speciesData) {
            const speciesName = speciesData.species.name;
            const isHerbivore = Object.values(HerbivoreSpecies).some(s => s.name === speciesName);

            if (isHerbivore) {
                const count = this.herbivoreCount.get(speciesName) || 1;
                this.herbivoreCount.set(speciesName, Math.max(0, count - 1));
            } else {
                const count = this.carnivoreCount.get(speciesName) || 1;
                this.carnivoreCount.set(speciesName, Math.max(0, count - 1));
            }

            this.creatureSpecies.delete(creatureId);
        }
    }

    // ==========================================================================
    // BEHAVIOR API
    // ==========================================================================

    // Try to form a herd from nearby creatures
    tryFormHerd(creatureId, nearbyCreatures) {
        const speciesData = this.creatureSpecies.get(creatureId);
        if (!speciesData) return null;

        const species = speciesData.species;
        if (!species.behavior || !species.behavior.herdSize) return null;

        // Count same-species creatures nearby
        const sameSpecies = nearbyCreatures.filter(id => {
            const other = this.creatureSpecies.get(id);
            return other && other.species.name === species.name;
        });

        // Check if minimum herd size is met
        if (sameSpecies.length >= species.behavior.herdSize.min) {
            const herdId = `herd_${creatureId}_${Date.now()}`;
            const members = [creatureId, ...sameSpecies.slice(0, species.behavior.herdSize.max - 1)];

            const herd = {
                id: herdId,
                leader: creatureId,
                members: new Set(members),
                species: species.name,
                behavior: BehaviorPatterns.HERD,
                formation: 'loose',
                alertLevel: 0
            };

            this.herds.set(herdId, herd);

            // Notify event system
            eventSystem.onHerdFormed(species.name, members.length);

            return herd;
        }

        return null;
    }

    // Try to form a hunting pack from nearby predators
    tryFormPack(creatureId, nearbyCreatures) {
        const speciesData = this.creatureSpecies.get(creatureId);
        if (!speciesData) return null;

        const species = speciesData.species;
        if (!species.behavior || !species.behavior.packSize) return null;

        // Count same-species creatures nearby
        const sameSpecies = nearbyCreatures.filter(id => {
            const other = this.creatureSpecies.get(id);
            return other && other.species.name === species.name;
        });

        // Check if minimum pack size is met
        if (sameSpecies.length >= species.behavior.packSize.min) {
            const packId = `pack_${creatureId}_${Date.now()}`;
            const members = [creatureId, ...sameSpecies.slice(0, species.behavior.packSize.max - 1)];

            const pack = {
                id: packId,
                alpha: creatureId,
                members: new Set(members),
                species: species.name,
                behavior: BehaviorPatterns.PACK_HUNT,
                hunting: false,
                targetId: null
            };

            this.packs.set(packId, pack);

            // Notify event system
            eventSystem.onPackFormed(species.name, members.length);

            return pack;
        }

        return null;
    }

    // Mark territory for a creature
    markTerritory(creatureId, worldX, worldZ) {
        const speciesData = this.creatureSpecies.get(creatureId);
        if (!speciesData) return null;

        const species = speciesData.species;
        if (!species.behavior || !species.behavior.territorial) return null;

        const markId = `territory_${creatureId}_${Date.now()}`;
        const mark = {
            id: markId,
            owner: creatureId,
            species: species.name,
            x: worldX,
            z: worldZ,
            radius: species.behavior.territoryRadius || 25,
            strength: 1.0,
            timestamp: Date.now(),
            duration: BehaviorPatterns.TERRITORIAL.scentMarking.duration * 1000
        };

        this.territories.set(markId, mark);
        return mark;
    }

    // Check if position is in marked territory
    checkTerritory(worldX, worldZ) {
        const now = Date.now();
        let strongestClaim = null;
        let maxStrength = 0;

        for (const [markId, mark] of this.territories) {
            // Remove expired marks
            if (now - mark.timestamp > mark.duration) {
                this.territories.delete(markId);
                continue;
            }

            const dist = Math.sqrt((worldX - mark.x) ** 2 + (worldZ - mark.z) ** 2);
            if (dist < mark.radius) {
                const age = (now - mark.timestamp) / mark.duration;
                const currentStrength = mark.strength * (1 - age);

                if (currentStrength > maxStrength) {
                    maxStrength = currentStrength;
                    strongestClaim = mark;
                }
            }
        }

        return strongestClaim;
    }

    // ==========================================================================
    // BUILDING API
    // ==========================================================================

    // Create building mesh with visual variety
    createBuildingMesh(buildingType, tribeColor = 0x888888, variation = 0) {
        return this.buildingVisuals.createBuildingMesh(buildingType, variation, tribeColor);
    }

    // Get building definition
    getBuildingDef(buildingType) {
        return BuildingDefinitions[buildingType.toUpperCase()];
    }

    // Get all building types
    getAllBuildingTypes() {
        return Object.keys(BuildingDefinitions);
    }

    // Get buildings by tier
    getBuildingsByTier(tier) {
        return Object.entries(BuildingDefinitions)
            .filter(([_, def]) => def.tier === tier)
            .map(([name, def]) => ({ name, ...def }));
    }

    // Get buildings by category
    getBuildingsByCategory(category) {
        return Object.entries(BuildingDefinitions)
            .filter(([_, def]) => def.category === category)
            .map(([name, def]) => ({ name, ...def }));
    }

    // ==========================================================================
    // WORLD EVENTS API
    // ==========================================================================

    // Update world events
    updateWorldEvents(deltaMs, simTime, stats) {
        if (this.worldEvents) {
            this.worldEvents.update(deltaMs, simTime, stats);
        }
    }

    // Get active event effects
    getActiveEventEffects() {
        return this.worldEvents ? this.worldEvents.getActiveEffects() : {};
    }

    // Check if specific event is active
    isEventActive(eventKey) {
        return this.worldEvents ? this.worldEvents.isEventActive(eventKey) : false;
    }

    // Get list of active event names
    getActiveEventNames() {
        return this.worldEvents ? this.worldEvents.getActiveEventNames() : [];
    }

    // ==========================================================================
    // STATISTICS API
    // ==========================================================================

    // Get species population statistics
    getSpeciesStats() {
        return {
            herbivores: Object.fromEntries(this.herbivoreCount),
            carnivores: Object.fromEntries(this.carnivoreCount),
            totalHerbivores: Array.from(this.herbivoreCount.values()).reduce((a, b) => a + b, 0),
            totalCarnivores: Array.from(this.carnivoreCount.values()).reduce((a, b) => a + b, 0),
            discoveredSpecies: this.discoveredSpecies.size,
            activeHerds: this.herds.size,
            activePacks: this.packs.size,
            territoryMarks: this.territories.size
        };
    }

    // Get biome statistics
    getBiomeStats() {
        const biomeCreatures = {};

        for (const [_, data] of this.creatureSpecies) {
            const biomeName = data.biome || 'Unknown';
            if (!biomeCreatures[biomeName]) {
                biomeCreatures[biomeName] = { herbivores: 0, carnivores: 0 };
            }

            const isHerbivore = Object.values(HerbivoreSpecies).some(s => s.name === data.species.name);
            if (isHerbivore) {
                biomeCreatures[biomeName].herbivores++;
            } else {
                biomeCreatures[biomeName].carnivores++;
            }
        }

        return biomeCreatures;
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

// Re-export key definitions for external use
export {
    HerbivoreSpecies,
    CarnivoreSpecies,
    Biomes,
    BehaviorPatterns,
    VisualVariety,
    BuildingDefinitions
};

// Factory function
export function createVarietyIntegration(renderer) {
    return new VarietyIntegration(renderer);
}

// Singleton instance (can be used without renderer for definitions)
let globalIntegration = null;
export function getVarietyIntegration() {
    if (!globalIntegration) {
        globalIntegration = new VarietyIntegration(null);
        globalIntegration.init();
    }
    return globalIntegration;
}
