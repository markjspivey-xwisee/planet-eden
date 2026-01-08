// Creature Variety System - AAA Content Expansion for Planet Eden
// Adds species differentiation, unique behaviors, and visual variety

// =============================================================================
// SPECIES DEFINITIONS - Herbivores
// =============================================================================
export const HerbivoreSpecies = {
    DEER: {
        id: 0,
        name: 'Deer',
        icon: '\u{1F98C}',
        baseStats: { energy: 90, health: 70, speed: 1.3, size: 1.0 },
        behavior: {
            flightDistance: 12,      // Distance at which they flee from predators
            herdSize: { min: 3, max: 8 },
            grazeTime: 0.6,          // Time spent grazing vs moving
            alertness: 0.8           // How quickly they detect threats
        },
        visual: {
            bodyColor: 0x8B6914,      // Brown
            accentColor: 0xD4A574,    // Tan belly
            hasAntlers: true,
            antlerChance: 0.5        // Only males (50%)
        },
        biomePreference: ['forest', 'grassland'],
        sounds: ['deer_call', 'deer_alert']
    },
    RABBIT: {
        id: 1,
        name: 'Rabbit',
        icon: '\u{1F407}',
        baseStats: { energy: 50, health: 30, speed: 1.6, size: 0.4 },
        behavior: {
            flightDistance: 8,
            herdSize: { min: 2, max: 5 },
            grazeTime: 0.4,
            alertness: 0.95,
            burrowChance: 0.3        // Can hide in burrows
        },
        visual: {
            bodyColor: 0xA0826D,
            accentColor: 0xFFFFFF,    // White tail
            hasLongEars: true
        },
        biomePreference: ['grassland', 'forest'],
        sounds: ['rabbit_squeak']
    },
    ELEPHANT: {
        id: 2,
        name: 'Elephant',
        icon: '\u{1F418}',
        baseStats: { energy: 200, health: 250, speed: 0.6, size: 2.5 },
        behavior: {
            flightDistance: 5,        // Less flighty, will stand ground
            herdSize: { min: 4, max: 12 },
            grazeTime: 0.7,
            alertness: 0.5,
            protective: true,         // Protects herd members
            intimidation: 0.8         // Can scare off predators
        },
        visual: {
            bodyColor: 0x808080,
            accentColor: 0x606060,
            hasTrunk: true,
            hasTusks: true,
            tuskChance: 0.7
        },
        biomePreference: ['grassland', 'savanna'],
        sounds: ['elephant_trumpet', 'elephant_rumble']
    },
    BOAR: {
        id: 3,
        name: 'Boar',
        icon: '\u{1F417}',
        baseStats: { energy: 100, health: 120, speed: 1.1, size: 1.2 },
        behavior: {
            flightDistance: 6,
            herdSize: { min: 2, max: 6 },
            grazeTime: 0.5,
            alertness: 0.6,
            aggressive: true,         // May charge when cornered
            rootingBehavior: true     // Digs for food
        },
        visual: {
            bodyColor: 0x4A3728,
            accentColor: 0x2F1F14,
            hasTusks: true,
            hasMane: true
        },
        biomePreference: ['forest'],
        sounds: ['boar_snort', 'boar_squeal']
    },
    BISON: {
        id: 4,
        name: 'Bison',
        icon: '\u{1F402}',
        baseStats: { energy: 180, health: 200, speed: 0.9, size: 2.0 },
        behavior: {
            flightDistance: 8,
            herdSize: { min: 10, max: 30 },
            grazeTime: 0.65,
            alertness: 0.55,
            stampede: true,           // Group panic behavior
            migration: true           // Seasonal movement
        },
        visual: {
            bodyColor: 0x3D2914,
            accentColor: 0x5A3D1E,
            hasHorns: true,
            hasMane: true,
            woolly: true
        },
        biomePreference: ['grassland', 'tundra'],
        sounds: ['bison_grunt', 'bison_bellow']
    }
};

// =============================================================================
// SPECIES DEFINITIONS - Carnivores
// =============================================================================
export const CarnivoreSpecies = {
    WOLF: {
        id: 0,
        name: 'Wolf',
        icon: '\u{1F43A}',
        baseStats: { energy: 110, health: 100, speed: 1.4, size: 1.1 },
        behavior: {
            packSize: { min: 3, max: 8 },
            huntingStyle: 'pack',
            chaseDistance: 25,
            stamina: 0.9,
            territorial: true,
            territoryRadius: 30,
            howlTrigger: 0.3         // Chance to howl when idle
        },
        visual: {
            bodyColor: 0x606060,
            accentColor: 0x404040,
            eyeColor: 0xFFAA00,
            furVariation: ['gray', 'black', 'white', 'brown']
        },
        biomePreference: ['forest', 'tundra', 'grassland'],
        sounds: ['wolf_howl', 'wolf_growl', 'wolf_bark'],
        preyPreference: ['deer', 'rabbit', 'boar']
    },
    LION: {
        id: 1,
        name: 'Lion',
        icon: '\u{1F981}',
        baseStats: { energy: 140, health: 150, speed: 1.3, size: 1.5 },
        behavior: {
            packSize: { min: 2, max: 6 },  // Pride
            huntingStyle: 'ambush',
            chaseDistance: 15,             // Shorter bursts
            stamina: 0.5,
            territorial: true,
            territoryRadius: 40,
            maleProtective: true           // Males guard territory
        },
        visual: {
            bodyColor: 0xC9A227,
            accentColor: 0x8B6914,
            eyeColor: 0xDAA520,
            hasMane: true,
            maneChance: 0.5              // Only males
        },
        biomePreference: ['savanna', 'grassland'],
        sounds: ['lion_roar', 'lion_growl'],
        preyPreference: ['bison', 'deer', 'boar', 'elephant']
    },
    BEAR: {
        id: 2,
        name: 'Bear',
        icon: '\u{1F43B}',
        baseStats: { energy: 160, health: 200, speed: 0.9, size: 1.8 },
        behavior: {
            packSize: { min: 1, max: 2 },  // Mostly solitary
            huntingStyle: 'opportunist',
            chaseDistance: 10,
            stamina: 0.4,
            territorial: true,
            territoryRadius: 25,
            omnivore: true,                // Also eats plants/fish
            hibernation: true              // Winter behavior
        },
        visual: {
            bodyColor: 0x4A3728,
            accentColor: 0x2F1F14,
            eyeColor: 0x2F2F2F,
            furVariation: ['brown', 'black', 'polar']
        },
        biomePreference: ['forest', 'tundra'],
        sounds: ['bear_roar', 'bear_growl', 'bear_huff'],
        preyPreference: ['deer', 'rabbit', 'boar']
    },
    TIGER: {
        id: 3,
        name: 'Tiger',
        icon: '\u{1F405}',
        baseStats: { energy: 130, health: 140, speed: 1.5, size: 1.4 },
        behavior: {
            packSize: { min: 1, max: 1 },  // Solitary
            huntingStyle: 'stalk',
            chaseDistance: 20,
            stamina: 0.6,
            territorial: true,
            territoryRadius: 35,
            stealthBonus: 0.4             // Harder to detect
        },
        visual: {
            bodyColor: 0xFF8C00,
            accentColor: 0x000000,        // Stripes
            eyeColor: 0xFFD700,
            hasStripes: true
        },
        biomePreference: ['forest', 'jungle'],
        sounds: ['tiger_roar', 'tiger_growl', 'tiger_chuff'],
        preyPreference: ['deer', 'boar']
    },
    HYENA: {
        id: 4,
        name: 'Hyena',
        icon: '\u{1F43E}',
        baseStats: { energy: 100, health: 90, speed: 1.2, size: 0.9 },
        behavior: {
            packSize: { min: 4, max: 12 },
            huntingStyle: 'pack',
            chaseDistance: 30,
            stamina: 0.95,
            scavenger: true,              // Prefers already-dead prey
            mobAttack: true               // Swarm behavior
        },
        visual: {
            bodyColor: 0x8B7355,
            accentColor: 0x4A4A4A,
            eyeColor: 0x2F2F2F,
            hasSpots: true
        },
        biomePreference: ['savanna', 'grassland'],
        sounds: ['hyena_laugh', 'hyena_whoop'],
        preyPreference: ['deer', 'rabbit', 'boar']
    }
};

// =============================================================================
// BIOME DEFINITIONS
// =============================================================================
export const Biomes = {
    FOREST: {
        id: 0,
        name: 'Forest',
        icon: '\u{1F332}',
        terrain: {
            color: { r: 0.18, g: 0.31, b: 0.09 },
            heightRange: { min: 1, max: 4 },
            moisture: 0.7
        },
        plantDensity: 0.8,
        plantTypes: ['tree', 'bush', 'flower', 'mushroom'],
        herbivoreSpawns: ['deer', 'rabbit', 'boar'],
        carnivoreSpawns: ['wolf', 'bear', 'tiger'],
        effects: {
            visibility: 0.6,           // Reduced visibility
            movementPenalty: 0.9,      // Slightly slower
            coverBonus: 0.3            // Hiding spots
        },
        ambientSounds: ['forest_birds', 'wind_leaves', 'creek']
    },
    GRASSLAND: {
        id: 1,
        name: 'Grassland',
        icon: '\u{1F33E}',
        terrain: {
            color: { r: 0.42, g: 0.56, b: 0.14 },
            heightRange: { min: 0.5, max: 2 },
            moisture: 0.4
        },
        plantDensity: 0.4,
        plantTypes: ['grass', 'flower', 'crop'],
        herbivoreSpawns: ['deer', 'rabbit', 'bison', 'elephant'],
        carnivoreSpawns: ['wolf', 'lion', 'hyena'],
        effects: {
            visibility: 1.0,
            movementPenalty: 1.0,
            coverBonus: 0.1
        },
        ambientSounds: ['wind_grass', 'insects']
    },
    TUNDRA: {
        id: 2,
        name: 'Tundra',
        icon: '\u{1F3D4}',
        terrain: {
            color: { r: 0.44, g: 0.5, b: 0.56 },
            heightRange: { min: 0, max: 2 },
            moisture: 0.2
        },
        plantDensity: 0.15,
        plantTypes: ['grass', 'bush'],
        herbivoreSpawns: ['bison'],
        carnivoreSpawns: ['wolf', 'bear'],
        effects: {
            visibility: 0.9,
            movementPenalty: 0.85,
            coverBonus: 0.05,
            coldDamage: 0.5            // Damage over time without shelter
        },
        ambientSounds: ['wind_howl', 'snow_crunch']
    },
    DESERT: {
        id: 3,
        name: 'Desert',
        icon: '\u{1F3DC}',
        terrain: {
            color: { r: 0.9, g: 0.83, b: 0.63 },
            heightRange: { min: -0.5, max: 3 },
            moisture: 0.05
        },
        plantDensity: 0.08,
        plantTypes: ['cactus', 'bush'],
        herbivoreSpawns: ['rabbit'],
        carnivoreSpawns: [],
        effects: {
            visibility: 1.0,
            movementPenalty: 0.8,
            coverBonus: 0.02,
            heatDamage: 0.3,           // Damage during day
            waterNeed: 2.0             // Double water consumption
        },
        ambientSounds: ['wind_sand', 'desert_silence']
    },
    SAVANNA: {
        id: 4,
        name: 'Savanna',
        icon: '\u{1F333}',
        terrain: {
            color: { r: 0.72, g: 0.63, b: 0.28 },
            heightRange: { min: 0.5, max: 2.5 },
            moisture: 0.3
        },
        plantDensity: 0.25,
        plantTypes: ['tree', 'grass'],
        herbivoreSpawns: ['elephant', 'bison', 'deer'],
        carnivoreSpawns: ['lion', 'hyena'],
        effects: {
            visibility: 0.95,
            movementPenalty: 1.0,
            coverBonus: 0.15
        },
        ambientSounds: ['savanna_birds', 'insects', 'lion_distant']
    },
    JUNGLE: {
        id: 5,
        name: 'Jungle',
        icon: '\u{1F334}',
        terrain: {
            color: { r: 0.08, g: 0.35, b: 0.05 },
            heightRange: { min: 0, max: 3 },
            moisture: 0.95
        },
        plantDensity: 0.95,
        plantTypes: ['tree', 'bush', 'flower', 'vine'],
        herbivoreSpawns: ['boar', 'deer'],
        carnivoreSpawns: ['tiger'],
        effects: {
            visibility: 0.4,
            movementPenalty: 0.7,
            coverBonus: 0.5
        },
        ambientSounds: ['jungle_birds', 'rain', 'insects']
    }
};

// =============================================================================
// RANDOM EVENTS SYSTEM
// =============================================================================
export const WorldEvents = {
    METEOR_STRIKE: {
        id: 'meteor',
        name: 'Meteor Strike',
        icon: '\u{2604}',
        rarity: 0.002,               // Very rare
        duration: 5,                 // Seconds of impact
        effects: {
            radius: 15,
            damage: 200,
            fireChance: 0.8,
            craterFormation: true
        },
        announcement: 'A meteor streaks across the sky!',
        aftermath: 'The crater smolders where the meteor struck.'
    },
    PLAGUE: {
        id: 'plague',
        name: 'Plague',
        icon: '\u{1F9A0}',
        rarity: 0.008,
        duration: 120,               // 2 minutes
        effects: {
            spreadRadius: 8,
            damagePerSecond: 0.5,
            spreadChance: 0.3,
            affectsHumanoids: true,
            affectsCarnivores: false
        },
        announcement: 'A mysterious illness spreads through the land...',
        aftermath: 'The plague has run its course.'
    },
    FLOOD: {
        id: 'flood',
        name: 'Flood',
        icon: '\u{1F30A}',
        rarity: 0.015,
        duration: 60,
        effects: {
            waterLevelRise: 0.3,
            drowningDamage: 2.0,
            destroysBuildings: true,
            scattersHerds: true
        },
        announcement: 'The waters are rising!',
        aftermath: 'The flood waters recede, leaving destruction.'
    },
    GOLDEN_AGE: {
        id: 'golden_age',
        name: 'Golden Age',
        icon: '\u{1F31F}',
        rarity: 0.005,
        duration: 180,               // 3 minutes
        effects: {
            resourceMultiplier: 2.0,
            birthRateBonus: 0.5,
            peacefulRelations: true
        },
        announcement: 'A golden age of prosperity begins!',
        aftermath: 'The golden age fades, but its legacy remains.'
    },
    GREAT_HUNT: {
        id: 'great_hunt',
        name: 'Great Hunt',
        icon: '\u{1F3B9}',
        rarity: 0.012,
        duration: 90,
        effects: {
            predatorAggression: 2.0,
            herbivoreFear: 1.5,
            huntSuccessBonus: 0.3
        },
        announcement: 'The predators grow restless... a great hunt begins!',
        aftermath: 'The hunt is over. The strong survive.'
    },
    DROUGHT: {
        id: 'drought',
        name: 'Drought',
        icon: '\u{2600}',
        rarity: 0.018,
        duration: 150,
        effects: {
            waterDepletion: 0.5,
            plantDeath: 0.3,
            migrationTrigger: true
        },
        announcement: 'The rains have stopped. Drought sets in.',
        aftermath: 'Clouds gather on the horizon...'
    },
    MIGRATION: {
        id: 'migration',
        name: 'Great Migration',
        icon: '\u{1F426}',
        rarity: 0.02,
        duration: 120,
        effects: {
            herdMovement: true,
            newSpeciesArrival: 0.3,
            territoryShift: true
        },
        announcement: 'The herds are on the move!',
        aftermath: 'The migration settles into new territories.'
    },
    VOLCANIC_ACTIVITY: {
        id: 'volcanic',
        name: 'Volcanic Activity',
        icon: '\u{1F30B}',
        rarity: 0.003,
        duration: 45,
        effects: {
            ashCloud: true,
            lavaFlows: true,
            earthquakes: true,
            fertileSoilBonus: 0.5    // After event
        },
        announcement: 'The mountain rumbles! Volcanic activity detected!',
        aftermath: 'The eruption subsides. The land is forever changed.'
    },
    AURORA: {
        id: 'aurora',
        name: 'Aurora',
        icon: '\u{1F320}',
        rarity: 0.025,
        duration: 60,
        effects: {
            beautyBonus: true,       // Visual only
            nocturnal: true,         // Only at night
            tribeHappiness: 0.2
        },
        announcement: 'The sky dances with ethereal lights!',
        aftermath: 'The aurora fades, leaving wonder in its wake.'
    },
    ABUNDANCE: {
        id: 'abundance',
        name: 'Season of Abundance',
        icon: '\u{1F340}',
        rarity: 0.022,
        duration: 200,
        effects: {
            plantGrowth: 2.0,
            birthRate: 1.3,
            foodYield: 1.5
        },
        announcement: 'Nature blesses the land with abundance!',
        aftermath: 'The season of plenty draws to a close.'
    }
};

// =============================================================================
// CREATURE BEHAVIOR PATTERNS
// =============================================================================
export const BehaviorPatterns = {
    // Pack Hunting Behavior
    PACK_HUNT: {
        name: 'Pack Hunt',
        minPackSize: 3,
        coordination: {
            flanking: true,
            relay: true,             // Take turns chasing
            signaling: true          // Communicate positions
        },
        roles: {
            alpha: { leads: true, damage: 1.2 },
            flanker: { speedBonus: 0.2, damage: 0.9 },
            pursuer: { stamina: 1.3, damage: 0.8 }
        },
        successBonus: 0.5           // +50% success with full pack
    },

    // Herding Behavior
    HERD: {
        name: 'Herding',
        formation: 'loose',
        centerBias: 0.6,            // Tendency to move toward herd center
        alertPropagation: 0.8,      // How fast alerts spread
        collectiveFlee: true,
        protectYoung: true,
        sentinels: {
            enabled: true,
            percentage: 0.15        // 15% act as lookouts
        }
    },

    // Migration Pattern
    MIGRATION: {
        name: 'Migration',
        seasonal: true,
        triggers: {
            temperature: true,
            foodScarcity: true,
            waterLevel: true
        },
        pathMemory: true,           // Remember migration routes
        groupMovement: true,
        restPoints: true
    },

    // Territorial Behavior
    TERRITORIAL: {
        name: 'Territorial',
        markingBehavior: true,
        patrolRoutes: true,
        intruderResponse: {
            warning: { distance: 15, action: 'display' },
            chase: { distance: 10, action: 'pursue' },
            attack: { distance: 5, action: 'fight' }
        },
        scentMarking: {
            frequency: 30,          // Seconds between marks
            duration: 300           // How long marks last
        }
    },

    // Ambush Hunting
    AMBUSH: {
        name: 'Ambush',
        stalkPhase: {
            speed: 0.3,
            patience: 20            // Seconds to wait
        },
        attackPhase: {
            burstSpeed: 2.0,
            range: 3,
            cooldown: 30
        },
        preferCover: true,
        nightBonus: 0.3
    },

    // Scavenging Behavior
    SCAVENGE: {
        name: 'Scavenge',
        detectCorpseRange: 40,
        competitionAggression: 0.7,
        shareWithPack: true,
        guardCorpse: true
    },

    // Defensive Circle
    DEFENSIVE_CIRCLE: {
        name: 'Defensive Circle',
        triggerThreat: 2,           // Number of predators
        formationSpeed: 5,          // Seconds to form
        youngInCenter: true,
        hornedOutward: true,
        breakThreshold: 0.3         // Health % to scatter
    }
};

// =============================================================================
// VISUAL VARIETY DEFINITIONS
// =============================================================================
export const VisualVariety = {
    // Age-based appearance
    AGE_STAGES: {
        juvenile: {
            sizeMultiplier: 0.5,
            colorSaturation: 0.7,
            features: ['smaller', 'rounder']
        },
        adult: {
            sizeMultiplier: 1.0,
            colorSaturation: 1.0,
            features: ['full_size', 'all_features']
        },
        elder: {
            sizeMultiplier: 0.95,
            colorSaturation: 0.6,
            features: ['graying', 'scarred']
        }
    },

    // Tribe-based customization (for humanoids)
    TRIBE_STYLES: {
        warrior: {
            accessories: ['warpaint', 'feathers', 'scars'],
            colorScheme: 'red_black'
        },
        gatherer: {
            accessories: ['baskets', 'flowers', 'beads'],
            colorScheme: 'earth_green'
        },
        hunter: {
            accessories: ['furs', 'bones', 'weapons'],
            colorScheme: 'brown_white'
        },
        shaman: {
            accessories: ['staff', 'mask', 'totems'],
            colorScheme: 'purple_gold'
        }
    },

    // Fur/Skin patterns
    PATTERNS: {
        solid: { weight: 0.4 },
        spotted: { weight: 0.2 },
        striped: { weight: 0.15 },
        gradient: { weight: 0.15 },
        patchy: { weight: 0.1 }
    },

    // Weather-affected appearance
    WEATHER_EFFECTS: {
        wet: { shininess: 1.5, darkening: 0.2 },
        muddy: { colorShift: 0x3D2817, coverage: 0.3 },
        snowy: { whiteOverlay: 0.4, coverage: 0.5 },
        dusty: { desaturation: 0.2, coverage: 0.4 }
    }
};

// =============================================================================
// VARIETY SYSTEM CLASS
// =============================================================================
export class VarietySystem {
    constructor() {
        this.activeEvents = new Map();
        this.territories = new Map();
        this.herds = new Map();
        this.packs = new Map();
        this.migrationRoutes = [];

        // Track species populations
        this.populations = {
            herbivores: new Map(),
            carnivores: new Map()
        };

        // Event cooldowns
        this.eventCooldowns = new Map();
        this.minEventInterval = 30000; // 30 seconds between events
        this.lastEventTime = 0;
    }

    init() {
        console.log('[VarietySystem] Initialized with AAA content variety');
        console.log(`[VarietySystem] ${Object.keys(HerbivoreSpecies).length} herbivore species`);
        console.log(`[VarietySystem] ${Object.keys(CarnivoreSpecies).length} carnivore species`);
        console.log(`[VarietySystem] ${Object.keys(Biomes).length} biome types`);
        console.log(`[VarietySystem] ${Object.keys(WorldEvents).length} world events`);
    }

    // Get random species for spawning
    getRandomHerbivoreSpecies(biome = null) {
        const species = Object.values(HerbivoreSpecies);
        if (biome) {
            const biomeData = Biomes[biome.toUpperCase()];
            if (biomeData) {
                const validSpecies = species.filter(s =>
                    s.biomePreference.includes(biome.toLowerCase())
                );
                if (validSpecies.length > 0) {
                    return validSpecies[Math.floor(Math.random() * validSpecies.length)];
                }
            }
        }
        return species[Math.floor(Math.random() * species.length)];
    }

    getRandomCarnivoreSpecies(biome = null) {
        const species = Object.values(CarnivoreSpecies);
        if (biome) {
            const biomeData = Biomes[biome.toUpperCase()];
            if (biomeData) {
                const validSpecies = species.filter(s =>
                    s.biomePreference.includes(biome.toLowerCase())
                );
                if (validSpecies.length > 0) {
                    return validSpecies[Math.floor(Math.random() * validSpecies.length)];
                }
            }
        }
        return species[Math.floor(Math.random() * species.length)];
    }

    // Determine biome from position
    getBiomeAtPosition(terrainHeight, latitude, moisture) {
        // Snow at high altitudes or polar regions
        if (terrainHeight > 6 || Math.abs(latitude) > 0.8) {
            return Biomes.TUNDRA;
        }

        // Desert at low moisture
        if (moisture < 0.15 && Math.abs(latitude) < 0.4) {
            return Biomes.DESERT;
        }

        // Jungle at high moisture and warmth
        if (moisture > 0.8 && Math.abs(latitude) < 0.3) {
            return Biomes.JUNGLE;
        }

        // Forest at mid-high moisture
        if (moisture > 0.5 && terrainHeight > 1) {
            return Biomes.FOREST;
        }

        // Savanna at tropical grasslands
        if (moisture < 0.4 && Math.abs(latitude) < 0.35) {
            return Biomes.SAVANNA;
        }

        // Default grassland
        return Biomes.GRASSLAND;
    }

    // Check for random events
    checkForEvents(simTime, stats) {
        const now = performance.now();
        if (now - this.lastEventTime < this.minEventInterval) {
            return null;
        }

        for (const [eventId, event] of Object.entries(WorldEvents)) {
            // Check cooldown
            const cooldown = this.eventCooldowns.get(eventId) || 0;
            if (now < cooldown) continue;

            // Random chance
            if (Math.random() < event.rarity) {
                this.lastEventTime = now;
                this.eventCooldowns.set(eventId, now + (event.duration * 1000) + 60000);

                // Start the event
                this.activeEvents.set(eventId, {
                    event,
                    startTime: now,
                    endTime: now + (event.duration * 1000)
                });

                console.log(`[VarietySystem] Event started: ${event.name}`);
                return event;
            }
        }

        return null;
    }

    // Update active events
    updateEvents(simTime) {
        const now = performance.now();
        const completedEvents = [];

        for (const [eventId, data] of this.activeEvents) {
            if (now >= data.endTime) {
                completedEvents.push(eventId);
                console.log(`[VarietySystem] Event ended: ${data.event.name}`);
            }
        }

        for (const eventId of completedEvents) {
            this.activeEvents.delete(eventId);
        }

        return completedEvents;
    }

    // Get active event effects
    getActiveEventEffects() {
        const effects = {};

        for (const [eventId, data] of this.activeEvents) {
            Object.assign(effects, data.event.effects);
        }

        return effects;
    }

    // Register a herd
    registerHerd(leaderId, members, species) {
        const herdId = `herd_${leaderId}`;
        this.herds.set(herdId, {
            leader: leaderId,
            members: new Set(members),
            species,
            centerX: 0,
            centerZ: 0,
            lastUpdate: performance.now()
        });
        return herdId;
    }

    // Register a pack
    registerPack(alphaId, members, species) {
        const packId = `pack_${alphaId}`;
        this.packs.set(packId, {
            alpha: alphaId,
            members: new Set(members),
            species,
            hunting: false,
            targetId: null,
            lastUpdate: performance.now()
        });
        return packId;
    }

    // Mark territory
    markTerritory(creatureId, x, z, radius, strength) {
        const markId = `mark_${creatureId}_${Date.now()}`;
        this.territories.set(markId, {
            owner: creatureId,
            x, z, radius, strength,
            createdAt: performance.now(),
            expiresAt: performance.now() + (BehaviorPatterns.TERRITORIAL.scentMarking.duration * 1000)
        });
        return markId;
    }

    // Check territory at position
    getTerritoryOwner(x, z) {
        const now = performance.now();
        let strongestMark = null;
        let maxStrength = 0;

        for (const [markId, mark] of this.territories) {
            // Clean up expired marks
            if (now > mark.expiresAt) {
                this.territories.delete(markId);
                continue;
            }

            const dist = Math.sqrt((x - mark.x) ** 2 + (z - mark.z) ** 2);
            if (dist < mark.radius) {
                // Fade strength over time
                const age = (now - mark.createdAt) / (mark.expiresAt - mark.createdAt);
                const currentStrength = mark.strength * (1 - age);

                if (currentStrength > maxStrength) {
                    maxStrength = currentStrength;
                    strongestMark = mark;
                }
            }
        }

        return strongestMark ? strongestMark.owner : null;
    }

    // Get visual properties for creature
    getCreatureVisuals(type, speciesId, age, tribeId = null) {
        let species = null;
        if (type === 1) { // Herbivore
            species = Object.values(HerbivoreSpecies)[speciesId % Object.keys(HerbivoreSpecies).length];
        } else if (type === 2) { // Carnivore
            species = Object.values(CarnivoreSpecies)[speciesId % Object.keys(CarnivoreSpecies).length];
        }

        if (!species) return null;

        // Determine age stage
        let ageStage = 'adult';
        if (age < 30) ageStage = 'juvenile';
        else if (age > 500) ageStage = 'elder';

        const ageData = VisualVariety.AGE_STAGES[ageStage];

        // Generate visual properties
        const visuals = {
            species: species.name,
            icon: species.icon,
            bodyColor: species.visual.bodyColor,
            accentColor: species.visual.accentColor,
            sizeMultiplier: species.baseStats.size * ageData.sizeMultiplier,
            features: [],
            pattern: this.selectPattern()
        };

        // Add species-specific features
        if (species.visual.hasAntlers && Math.random() < (species.visual.antlerChance || 0.5)) {
            visuals.features.push('antlers');
        }
        if (species.visual.hasMane && Math.random() < (species.visual.maneChance || 0.5)) {
            visuals.features.push('mane');
        }
        if (species.visual.hasTusks && Math.random() < (species.visual.tuskChance || 0.7)) {
            visuals.features.push('tusks');
        }
        if (species.visual.hasStripes) {
            visuals.features.push('stripes');
        }
        if (species.visual.hasSpots) {
            visuals.features.push('spots');
        }

        // Add age features
        visuals.features.push(...ageData.features);

        return visuals;
    }

    selectPattern() {
        const patterns = VisualVariety.PATTERNS;
        let totalWeight = Object.values(patterns).reduce((sum, p) => sum + p.weight, 0);
        let random = Math.random() * totalWeight;

        for (const [pattern, data] of Object.entries(patterns)) {
            random -= data.weight;
            if (random <= 0) return pattern;
        }

        return 'solid';
    }
}

// Singleton instance
export const varietySystem = new VarietySystem();
