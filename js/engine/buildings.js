// Extended Building System - AAA Content Expansion for Planet Eden
// Adds visual variety, special effects, and enhanced building mechanics

import * as THREE from 'three';

// =============================================================================
// EXTENDED BUILDING DEFINITIONS
// =============================================================================
export const BuildingDefinitions = {
    // Basic Buildings (Tier 1)
    HUT: {
        id: 0,
        name: 'Hut',
        icon: '\u{1F3E0}',
        tier: 1,
        category: 'housing',
        description: 'Basic shelter for tribe members',
        stats: {
            maxHealth: 100,
            populationBonus: 2,
            constructionTime: 10
        },
        cost: { food: 20, wood: 50, stone: 10, metal: 0 },
        requirements: {},
        effects: {
            shelterCapacity: 4,
            moralBonus: 0.1
        },
        visual: {
            scale: 1.0,
            variations: ['thatch', 'wooden', 'mud'],
            hasSmoke: true,
            hasLight: true
        }
    },

    FARM: {
        id: 1,
        name: 'Farm',
        icon: '\u{1F33E}',
        tier: 1,
        category: 'production',
        description: 'Produces food over time',
        stats: {
            maxHealth: 80,
            productionRate: 2.0,
            constructionTime: 15
        },
        cost: { food: 10, wood: 30, stone: 5, metal: 0 },
        requirements: {},
        effects: {
            foodProduction: 10,
            workerSlots: 3
        },
        visual: {
            scale: 1.2,
            variations: ['wheat', 'vegetable', 'rice'],
            hasCrops: true,
            hasAnimals: false
        }
    },

    // Defense Buildings (Tier 1-2)
    TOWER: {
        id: 2,
        name: 'Watchtower',
        icon: '\u{1F3EF}',
        tier: 2,
        category: 'defense',
        description: 'Provides vision and defense bonus',
        stats: {
            maxHealth: 200,
            defenseBonus: 20,
            visionRange: 25,
            constructionTime: 25
        },
        cost: { food: 30, wood: 40, stone: 80, metal: 20 },
        requirements: { buildings: ['hut'] },
        effects: {
            alertRange: 30,
            garrisonCapacity: 2,
            attackDamage: 5
        },
        visual: {
            scale: 1.5,
            variations: ['wooden', 'stone', 'reinforced'],
            hasFlag: true,
            hasGuard: true
        }
    },

    WALL: {
        id: 4,
        name: 'Wall',
        icon: '\u{1F9F1}',
        tier: 1,
        category: 'defense',
        description: 'Defensive structure blocking enemies',
        stats: {
            maxHealth: 300,
            defenseBonus: 15,
            constructionTime: 20
        },
        cost: { food: 0, wood: 20, stone: 50, metal: 10 },
        requirements: {},
        effects: {
            blockMovement: true,
            slowEnemies: 0.5
        },
        visual: {
            scale: 1.0,
            variations: ['wooden_palisade', 'stone_wall', 'reinforced_wall'],
            canConnect: true,
            hasGate: false
        }
    },

    // Cultural Buildings (Tier 2-3)
    TEMPLE: {
        id: 3,
        name: 'Temple',
        icon: '\u{1F3DB}',
        tier: 3,
        category: 'culture',
        description: 'Sacred place for worship and ceremonies',
        stats: {
            maxHealth: 150,
            cultureBonus: 25,
            constructionTime: 40
        },
        cost: { food: 50, wood: 60, stone: 100, metal: 30 },
        requirements: { buildings: ['hut', 'tower'], population: 10 },
        effects: {
            moraleBonus: 0.3,
            healingAura: 0.5,
            ceremonyPower: 1.0
        },
        visual: {
            scale: 1.8,
            variations: ['stone_shrine', 'wooden_temple', 'grand_temple'],
            hasAltar: true,
            hasStatue: true,
            glowEffect: true
        }
    },

    // Military Buildings (Tier 2)
    BARRACKS: {
        id: 5,
        name: 'Barracks',
        icon: '\u{1F3E2}',
        tier: 2,
        category: 'military',
        description: 'Trains warriors for the tribe',
        stats: {
            maxHealth: 180,
            defenseBonus: 10,
            trainingSpeed: 1.5,
            constructionTime: 30
        },
        cost: { food: 40, wood: 70, stone: 60, metal: 30 },
        requirements: { buildings: ['hut'] },
        effects: {
            trainingSlots: 3,
            combatBonus: 0.2,
            weaponStorage: 10
        },
        visual: {
            scale: 1.4,
            variations: ['wooden', 'stone', 'fortified'],
            hasWeaponRack: true,
            hasTrainingDummy: true
        }
    },

    // Industry Buildings (Tier 2)
    SMITHY: {
        id: 6,
        name: 'Smithy',
        icon: '\u{2692}',
        tier: 2,
        category: 'production',
        description: 'Crafts weapons and tools',
        stats: {
            maxHealth: 160,
            productionRate: 1.0,
            constructionTime: 25
        },
        cost: { food: 30, wood: 50, stone: 40, metal: 50 },
        requirements: { buildings: ['hut'], resources: { metal: 20 } },
        effects: {
            craftingSpeed: 1.5,
            equipmentQuality: 0.2,
            toolProduction: true
        },
        visual: {
            scale: 1.3,
            variations: ['basic', 'advanced', 'master'],
            hasForge: true,
            hasAnvil: true,
            hasSparks: true,
            hasSmoke: true
        }
    },

    MINE: {
        id: 7,
        name: 'Mine',
        icon: '\u{26CF}',
        tier: 2,
        category: 'production',
        description: 'Extracts stone and metal',
        stats: {
            maxHealth: 200,
            productionRate: 1.5,
            constructionTime: 35
        },
        cost: { food: 40, wood: 80, stone: 30, metal: 20 },
        requirements: { terrain: 'mountain' },
        effects: {
            stoneProduction: 5,
            metalProduction: 2,
            workerSlots: 4
        },
        visual: {
            scale: 1.2,
            variations: ['shaft', 'quarry', 'deep_mine'],
            hasMinecart: true,
            hasSupports: true
        }
    },

    // Trade Buildings (Tier 2-3)
    MARKET: {
        id: 8,
        name: 'Market',
        icon: '\u{1F3EA}',
        tier: 2,
        category: 'trade',
        description: 'Enables trading and resource conversion',
        stats: {
            maxHealth: 120,
            tradeEfficiency: 1.2,
            constructionTime: 20
        },
        cost: { food: 60, wood: 80, stone: 40, metal: 20 },
        requirements: { buildings: ['hut', 'farm'] },
        effects: {
            tradeRoutes: 2,
            merchantCapacity: 3,
            priceBonus: 0.1
        },
        visual: {
            scale: 1.3,
            variations: ['stalls', 'covered', 'plaza'],
            hasStalls: true,
            hasGoods: true,
            hasNPCs: true
        }
    },

    GRANARY: {
        id: 9,
        name: 'Granary',
        icon: '\u{1F3E8}',
        tier: 1,
        category: 'storage',
        description: 'Stores food and reduces spoilage',
        stats: {
            maxHealth: 140,
            storageCapacity: 500,
            constructionTime: 15
        },
        cost: { food: 30, wood: 70, stone: 50, metal: 10 },
        requirements: { buildings: ['farm'] },
        effects: {
            foodStorage: 500,
            spoilageReduction: 0.5,
            ratProtection: true
        },
        visual: {
            scale: 1.2,
            variations: ['wooden', 'stone', 'elevated'],
            hasSilos: true,
            hasCrates: true
        }
    },

    // =========================================================================
    // NEW BUILDING TYPES (Extended for AAA variety)
    // =========================================================================

    GATE: {
        id: 10,
        name: 'Gate',
        icon: '\u{1F6AA}',
        tier: 2,
        category: 'defense',
        description: 'Controlled entrance through walls',
        stats: {
            maxHealth: 250,
            defenseBonus: 10,
            constructionTime: 25
        },
        cost: { food: 10, wood: 60, stone: 80, metal: 40 },
        requirements: { buildings: ['wall'] },
        effects: {
            controlledAccess: true,
            canClose: true,
            bottleneck: 0.3
        },
        visual: {
            scale: 1.4,
            variations: ['wooden', 'iron', 'fortified'],
            hasPortcullis: true,
            animated: true
        }
    },

    WELL: {
        id: 11,
        name: 'Well',
        icon: '\u{1F6B0}',
        tier: 1,
        category: 'infrastructure',
        description: 'Provides water for the tribe',
        stats: {
            maxHealth: 80,
            waterProduction: 10,
            constructionTime: 10
        },
        cost: { food: 10, wood: 20, stone: 40, metal: 5 },
        requirements: {},
        effects: {
            waterSupply: 20,
            fireProtection: 0.3,
            healthBonus: 0.1
        },
        visual: {
            scale: 0.8,
            variations: ['stone', 'wooden', 'covered'],
            hasBucket: true,
            hasWater: true
        }
    },

    STABLE: {
        id: 12,
        name: 'Stable',
        icon: '\u{1F434}',
        tier: 2,
        category: 'military',
        description: 'Houses and trains mounts',
        stats: {
            maxHealth: 140,
            mountCapacity: 4,
            constructionTime: 25
        },
        cost: { food: 50, wood: 80, stone: 30, metal: 20 },
        requirements: { buildings: ['farm', 'barracks'] },
        effects: {
            mountTraining: true,
            speedBonus: 0.3,
            carryCapacity: 50
        },
        visual: {
            scale: 1.4,
            variations: ['basic', 'paddock', 'royal'],
            hasAnimals: true,
            hasFence: true
        }
    },

    LIBRARY: {
        id: 13,
        name: 'Library',
        icon: '\u{1F4DA}',
        tier: 3,
        category: 'culture',
        description: 'Repository of knowledge',
        stats: {
            maxHealth: 120,
            researchSpeed: 1.5,
            constructionTime: 35
        },
        cost: { food: 40, wood: 60, stone: 70, metal: 20 },
        requirements: { buildings: ['temple'], population: 15 },
        effects: {
            techBonus: 0.25,
            knowledgeStorage: 100,
            educationBonus: 0.2
        },
        visual: {
            scale: 1.3,
            variations: ['scrolls', 'books', 'grand'],
            hasShelves: true,
            hasDesk: true,
            hasCandles: true
        }
    },

    HARBOR: {
        id: 14,
        name: 'Harbor',
        icon: '\u{2693}',
        tier: 2,
        category: 'trade',
        description: 'Enables water trade and fishing',
        stats: {
            maxHealth: 160,
            tradeCapacity: 3,
            constructionTime: 40
        },
        cost: { food: 30, wood: 100, stone: 60, metal: 30 },
        requirements: { terrain: 'water' },
        effects: {
            fishingBonus: 2.0,
            seaTradeRoutes: 3,
            shipCapacity: 2
        },
        visual: {
            scale: 1.6,
            variations: ['dock', 'pier', 'port'],
            hasBoats: true,
            hasCrates: true,
            hasWater: true
        }
    },

    MONUMENT: {
        id: 15,
        name: 'Monument',
        icon: '\u{1F5FF}',
        tier: 3,
        category: 'culture',
        description: 'Grand structure celebrating achievements',
        stats: {
            maxHealth: 400,
            cultureBonus: 50,
            constructionTime: 60
        },
        cost: { food: 100, wood: 50, stone: 200, metal: 50 },
        requirements: { buildings: ['temple', 'library'], population: 25 },
        effects: {
            moraleBonus: 0.5,
            attractVisitors: true,
            legendaryStatus: true
        },
        visual: {
            scale: 2.5,
            variations: ['obelisk', 'statue', 'pyramid'],
            hasGlow: true,
            hasParticles: true
        }
    },

    WORKSHOP: {
        id: 16,
        name: 'Workshop',
        icon: '\u{1F527}',
        tier: 2,
        category: 'production',
        description: 'Crafts tools and advanced items',
        stats: {
            maxHealth: 140,
            craftingSpeed: 1.3,
            constructionTime: 20
        },
        cost: { food: 25, wood: 60, stone: 30, metal: 25 },
        requirements: { buildings: ['hut'] },
        effects: {
            toolProduction: true,
            repairSpeed: 2.0,
            inventionChance: 0.1
        },
        visual: {
            scale: 1.2,
            variations: ['carpentry', 'masonry', 'general'],
            hasWorkbench: true,
            hasTools: true
        }
    },

    HOSPITAL: {
        id: 17,
        name: 'Hospital',
        icon: '\u{1F3E5}',
        tier: 3,
        category: 'infrastructure',
        description: 'Heals wounded tribe members',
        stats: {
            maxHealth: 150,
            healingRate: 3.0,
            constructionTime: 35
        },
        cost: { food: 60, wood: 70, stone: 80, metal: 30 },
        requirements: { buildings: ['well', 'temple'], population: 20 },
        effects: {
            healingAura: 2.0,
            diseaseResistance: 0.5,
            bedCapacity: 6
        },
        visual: {
            scale: 1.4,
            variations: ['tent', 'building', 'grand'],
            hasBeds: true,
            hasHerbs: true
        }
    },

    STOREHOUSE: {
        id: 18,
        name: 'Storehouse',
        icon: '\u{1F4E6}',
        tier: 1,
        category: 'storage',
        description: 'General storage for resources',
        stats: {
            maxHealth: 120,
            storageCapacity: 300,
            constructionTime: 15
        },
        cost: { food: 20, wood: 60, stone: 30, metal: 10 },
        requirements: {},
        effects: {
            resourceStorage: 300,
            organizationBonus: 0.1,
            theftProtection: true
        },
        visual: {
            scale: 1.3,
            variations: ['wooden', 'stone', 'warehouse'],
            hasCrates: true,
            hasBarrels: true
        }
    },

    FORTRESS: {
        id: 19,
        name: 'Fortress',
        icon: '\u{1F3F0}',
        tier: 3,
        category: 'defense',
        description: 'Ultimate defensive structure',
        stats: {
            maxHealth: 500,
            defenseBonus: 50,
            constructionTime: 80
        },
        cost: { food: 100, wood: 150, stone: 300, metal: 100 },
        requirements: { buildings: ['barracks', 'wall', 'tower'], population: 30 },
        effects: {
            garrisonCapacity: 20,
            siegeResistance: 0.7,
            commandBonus: 0.3
        },
        visual: {
            scale: 2.0,
            variations: ['wooden', 'stone', 'iron'],
            hasTowers: true,
            hasFlags: true,
            hasGate: true
        }
    }
};

// =============================================================================
// BUILDING VISUAL CREATOR
// =============================================================================
export class BuildingVisuals {
    constructor(scene) {
        this.scene = scene;
        this.buildingMeshes = new Map();
    }

    // Create a 3D mesh for a building type
    createBuildingMesh(buildingType, variation = 0, tribeColor = 0x888888) {
        const definition = BuildingDefinitions[buildingType.toUpperCase()];
        if (!definition) {
            console.warn(`Unknown building type: ${buildingType}`);
            return this.createDefaultBuilding();
        }

        const group = new THREE.Group();
        const scale = definition.visual.scale;

        // Create base building based on category
        switch (definition.category) {
            case 'housing':
                this.createHousingBuilding(group, definition, variation, scale);
                break;
            case 'production':
                this.createProductionBuilding(group, definition, variation, scale);
                break;
            case 'defense':
                this.createDefenseBuilding(group, definition, variation, scale);
                break;
            case 'culture':
                this.createCultureBuilding(group, definition, variation, scale);
                break;
            case 'military':
                this.createMilitaryBuilding(group, definition, variation, scale);
                break;
            case 'trade':
                this.createTradeBuilding(group, definition, variation, scale);
                break;
            case 'storage':
                this.createStorageBuilding(group, definition, variation, scale);
                break;
            case 'infrastructure':
                this.createInfrastructureBuilding(group, definition, variation, scale);
                break;
            default:
                this.createDefaultBuilding(group, scale);
        }

        // Add tribe color accents
        this.addTribeAccents(group, tribeColor);

        // Add visual effects based on definition
        if (definition.visual.hasSmoke) {
            this.addSmokeEffect(group);
        }
        if (definition.visual.hasLight) {
            this.addLightEffect(group);
        }
        if (definition.visual.hasFlag) {
            this.addFlag(group, tribeColor);
        }
        if (definition.visual.glowEffect) {
            this.addGlowEffect(group, 0xFFD700);
        }

        group.userData.buildingType = buildingType;
        group.userData.definition = definition;

        return group;
    }

    createHousingBuilding(group, definition, variation, scale) {
        // Base platform
        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(1.2 * scale, 1.3 * scale, 0.2, 8),
            new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.9 })
        );
        base.position.y = 0.1;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);

        // Main structure
        const wallColor = variation === 0 ? 0x8B7355 : variation === 1 ? 0x6B4226 : 0xA0826D;
        const walls = new THREE.Mesh(
            new THREE.CylinderGeometry(1.0 * scale, 1.1 * scale, 1.5 * scale, 8),
            new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.8 })
        );
        walls.position.y = 0.85 * scale;
        walls.castShadow = true;
        group.add(walls);

        // Roof
        const roofColor = variation === 0 ? 0xD4A574 : variation === 1 ? 0x8B4513 : 0x654321;
        const roof = new THREE.Mesh(
            new THREE.ConeGeometry(1.3 * scale, 1.0 * scale, 8),
            new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.85 })
        );
        roof.position.y = 2.0 * scale;
        roof.castShadow = true;
        group.add(roof);

        // Door
        const door = new THREE.Mesh(
            new THREE.BoxGeometry(0.4 * scale, 0.8 * scale, 0.1),
            new THREE.MeshStandardMaterial({ color: 0x3D2817, roughness: 0.9 })
        );
        door.position.set(0, 0.5 * scale, 1.05 * scale);
        group.add(door);
    }

    createProductionBuilding(group, definition, variation, scale) {
        // Base platform
        const base = new THREE.Mesh(
            new THREE.BoxGeometry(2.5 * scale, 0.15, 2.5 * scale),
            new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.95 })
        );
        base.position.y = 0.075;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);

        if (definition.name === 'Farm') {
            // Farm plot
            const plot = new THREE.Mesh(
                new THREE.BoxGeometry(2.2 * scale, 0.1, 2.2 * scale),
                new THREE.MeshStandardMaterial({ color: 0x5C4033, roughness: 1.0 })
            );
            plot.position.y = 0.2;
            group.add(plot);

            // Crops
            const cropColors = [0x228B22, 0xD4A574, 0x90EE90];
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    const crop = new THREE.Mesh(
                        new THREE.BoxGeometry(0.4 * scale, 0.3 + Math.random() * 0.2, 0.4 * scale),
                        new THREE.MeshStandardMaterial({
                            color: cropColors[Math.floor(Math.random() * cropColors.length)],
                            roughness: 0.8
                        })
                    );
                    crop.position.set(i * 0.6 * scale, 0.4, j * 0.6 * scale);
                    crop.castShadow = true;
                    group.add(crop);
                }
            }
        } else {
            // Generic production building
            const walls = new THREE.Mesh(
                new THREE.BoxGeometry(2.0 * scale, 1.5 * scale, 2.0 * scale),
                new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.85 })
            );
            walls.position.y = 0.85 * scale;
            walls.castShadow = true;
            group.add(walls);

            const roof = new THREE.Mesh(
                new THREE.BoxGeometry(2.3 * scale, 0.2 * scale, 2.3 * scale),
                new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.9 })
            );
            roof.position.y = 1.7 * scale;
            roof.castShadow = true;
            group.add(roof);
        }
    }

    createDefenseBuilding(group, definition, variation, scale) {
        if (definition.name === 'Wall') {
            // Wall segment
            const wall = new THREE.Mesh(
                new THREE.BoxGeometry(2.5 * scale, 2.0 * scale, 0.5 * scale),
                new THREE.MeshStandardMaterial({
                    color: variation === 0 ? 0x8B7355 : 0x696969,
                    roughness: 0.9
                })
            );
            wall.position.y = 1.0 * scale;
            wall.castShadow = true;
            wall.receiveShadow = true;
            group.add(wall);

            // Battlements
            for (let i = -1; i <= 1; i++) {
                const merlon = new THREE.Mesh(
                    new THREE.BoxGeometry(0.5 * scale, 0.4 * scale, 0.6 * scale),
                    new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.9 })
                );
                merlon.position.set(i * 0.8 * scale, 2.2 * scale, 0);
                merlon.castShadow = true;
                group.add(merlon);
            }
        } else if (definition.name === 'Watchtower') {
            // Tower base
            const towerBase = new THREE.Mesh(
                new THREE.CylinderGeometry(0.8 * scale, 1.0 * scale, 3.0 * scale, 8),
                new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.85 })
            );
            towerBase.position.y = 1.5 * scale;
            towerBase.castShadow = true;
            group.add(towerBase);

            // Platform
            const platform = new THREE.Mesh(
                new THREE.CylinderGeometry(1.2 * scale, 1.0 * scale, 0.3 * scale, 8),
                new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.9 })
            );
            platform.position.y = 3.15 * scale;
            platform.castShadow = true;
            group.add(platform);

            // Roof
            const roof = new THREE.Mesh(
                new THREE.ConeGeometry(1.3 * scale, 0.8 * scale, 8),
                new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.85 })
            );
            roof.position.y = 3.7 * scale;
            roof.castShadow = true;
            group.add(roof);
        } else {
            // Fortress
            this.createFortress(group, scale);
        }
    }

    createFortress(group, scale) {
        // Main keep
        const keep = new THREE.Mesh(
            new THREE.BoxGeometry(3.0 * scale, 3.5 * scale, 3.0 * scale),
            new THREE.MeshStandardMaterial({ color: 0x505050, roughness: 0.8 })
        );
        keep.position.y = 1.75 * scale;
        keep.castShadow = true;
        keep.receiveShadow = true;
        group.add(keep);

        // Corner towers
        const towerPositions = [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]];
        for (const [x, z] of towerPositions) {
            const tower = new THREE.Mesh(
                new THREE.CylinderGeometry(0.6 * scale, 0.7 * scale, 4.5 * scale, 8),
                new THREE.MeshStandardMaterial({ color: 0x606060, roughness: 0.85 })
            );
            tower.position.set(x * scale, 2.25 * scale, z * scale);
            tower.castShadow = true;
            group.add(tower);

            // Tower roof
            const towerRoof = new THREE.Mesh(
                new THREE.ConeGeometry(0.8 * scale, 0.6 * scale, 8),
                new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.9 })
            );
            towerRoof.position.set(x * scale, 4.8 * scale, z * scale);
            group.add(towerRoof);
        }

        // Main roof
        const mainRoof = new THREE.Mesh(
            new THREE.ConeGeometry(2.0 * scale, 1.5 * scale, 4),
            new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.9 })
        );
        mainRoof.position.y = 4.25 * scale;
        mainRoof.rotation.y = Math.PI / 4;
        mainRoof.castShadow = true;
        group.add(mainRoof);
    }

    createCultureBuilding(group, definition, variation, scale) {
        if (definition.name === 'Temple') {
            // Temple base (stepped)
            for (let i = 0; i < 3; i++) {
                const step = new THREE.Mesh(
                    new THREE.BoxGeometry((2.5 - i * 0.4) * scale, 0.4 * scale, (2.5 - i * 0.4) * scale),
                    new THREE.MeshStandardMaterial({ color: 0xE8E8E8, roughness: 0.7 })
                );
                step.position.y = 0.2 + i * 0.4;
                step.castShadow = true;
                step.receiveShadow = true;
                group.add(step);
            }

            // Columns
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                const column = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.15 * scale, 0.18 * scale, 2.0 * scale, 12),
                    new THREE.MeshStandardMaterial({ color: 0xFFFFE0, roughness: 0.6 })
                );
                column.position.set(
                    Math.cos(angle) * 0.8 * scale,
                    2.2 * scale,
                    Math.sin(angle) * 0.8 * scale
                );
                column.castShadow = true;
                group.add(column);
            }

            // Roof
            const roof = new THREE.Mesh(
                new THREE.ConeGeometry(1.5 * scale, 1.0 * scale, 4),
                new THREE.MeshStandardMaterial({ color: 0xDAA520, roughness: 0.5, metalness: 0.3 })
            );
            roof.position.y = 3.7 * scale;
            roof.rotation.y = Math.PI / 4;
            roof.castShadow = true;
            group.add(roof);

            // Altar
            const altar = new THREE.Mesh(
                new THREE.BoxGeometry(0.6 * scale, 0.4 * scale, 0.4 * scale),
                new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.8 })
            );
            altar.position.y = 1.4 * scale;
            group.add(altar);
        } else if (definition.name === 'Monument') {
            // Obelisk
            const obelisk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.3 * scale, 0.5 * scale, 5.0 * scale, 4),
                new THREE.MeshStandardMaterial({
                    color: 0xE8E8E8,
                    roughness: 0.5,
                    metalness: 0.1
                })
            );
            obelisk.position.y = 2.5 * scale;
            obelisk.castShadow = true;
            group.add(obelisk);

            // Pyramidion (top)
            const top = new THREE.Mesh(
                new THREE.ConeGeometry(0.4 * scale, 0.6 * scale, 4),
                new THREE.MeshStandardMaterial({
                    color: 0xFFD700,
                    roughness: 0.3,
                    metalness: 0.7
                })
            );
            top.position.y = 5.3 * scale;
            top.rotation.y = Math.PI / 4;
            group.add(top);

            // Base
            const base = new THREE.Mesh(
                new THREE.BoxGeometry(1.5 * scale, 0.5 * scale, 1.5 * scale),
                new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.8 })
            );
            base.position.y = 0.25 * scale;
            base.castShadow = true;
            group.add(base);
        } else {
            // Library
            this.createLibrary(group, scale);
        }
    }

    createLibrary(group, scale) {
        // Main building
        const main = new THREE.Mesh(
            new THREE.BoxGeometry(2.5 * scale, 2.0 * scale, 2.0 * scale),
            new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.85 })
        );
        main.position.y = 1.1 * scale;
        main.castShadow = true;
        group.add(main);

        // Dome
        const dome = new THREE.Mesh(
            new THREE.SphereGeometry(1.0 * scale, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshStandardMaterial({ color: 0x4169E1, roughness: 0.6 })
        );
        dome.position.y = 2.1 * scale;
        dome.castShadow = true;
        group.add(dome);

        // Windows
        for (let i = 0; i < 3; i++) {
            const window = new THREE.Mesh(
                new THREE.BoxGeometry(0.3 * scale, 0.5 * scale, 0.1),
                new THREE.MeshStandardMaterial({
                    color: 0xFFFF99,
                    emissive: 0xFFFF66,
                    emissiveIntensity: 0.3
                })
            );
            window.position.set((i - 1) * 0.6 * scale, 1.2 * scale, 1.05 * scale);
            group.add(window);
        }
    }

    createMilitaryBuilding(group, definition, variation, scale) {
        // Barracks/Stable
        const main = new THREE.Mesh(
            new THREE.BoxGeometry(3.0 * scale, 1.8 * scale, 2.2 * scale),
            new THREE.MeshStandardMaterial({ color: 0x8B0000, roughness: 0.85 })
        );
        main.position.y = 1.0 * scale;
        main.castShadow = true;
        group.add(main);

        // Peaked roof
        const roofGeo = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            -1.6 * scale, 1.9 * scale, -1.2 * scale,
            1.6 * scale, 1.9 * scale, -1.2 * scale,
            0, 2.8 * scale, 0,
            -1.6 * scale, 1.9 * scale, 1.2 * scale,
            1.6 * scale, 1.9 * scale, 1.2 * scale,
        ]);
        roofGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        roofGeo.setIndex([0, 1, 2, 1, 4, 2, 4, 3, 2, 3, 0, 2, 0, 3, 4, 0, 4, 1]);
        roofGeo.computeVertexNormals();

        const roof = new THREE.Mesh(
            roofGeo,
            new THREE.MeshStandardMaterial({ color: 0x4a0000, roughness: 0.9, side: THREE.DoubleSide })
        );
        roof.castShadow = true;
        group.add(roof);

        // Flag pole
        const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, 2.0 * scale),
            new THREE.MeshStandardMaterial({ color: 0x654321 })
        );
        pole.position.set(1.2 * scale, 3.0 * scale, 0.8 * scale);
        group.add(pole);
    }

    createTradeBuilding(group, definition, variation, scale) {
        // Market stalls
        const base = new THREE.Mesh(
            new THREE.BoxGeometry(3.0 * scale, 0.15, 2.5 * scale),
            new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.95 })
        );
        base.position.y = 0.075;
        group.add(base);

        // Stall structures
        for (let i = -1; i <= 1; i++) {
            const stall = new THREE.Mesh(
                new THREE.BoxGeometry(0.8 * scale, 1.0 * scale, 0.6 * scale),
                new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.85 })
            );
            stall.position.set(i * 0.9 * scale, 0.6 * scale, 0);
            stall.castShadow = true;
            group.add(stall);

            // Awning
            const awning = new THREE.Mesh(
                new THREE.BoxGeometry(1.0 * scale, 0.1 * scale, 0.8 * scale),
                new THREE.MeshStandardMaterial({
                    color: [0xCC0000, 0x00CC00, 0x0000CC][i + 1],
                    roughness: 0.8
                })
            );
            awning.position.set(i * 0.9 * scale, 1.2 * scale, 0.1 * scale);
            awning.rotation.x = 0.2;
            group.add(awning);
        }
    }

    createStorageBuilding(group, definition, variation, scale) {
        // Granary/Storehouse
        const main = new THREE.Mesh(
            new THREE.CylinderGeometry(1.0 * scale, 1.2 * scale, 2.5 * scale, 12),
            new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.9 })
        );
        main.position.y = 1.35 * scale;
        main.castShadow = true;
        group.add(main);

        // Conical roof
        const roof = new THREE.Mesh(
            new THREE.ConeGeometry(1.3 * scale, 1.0 * scale, 12),
            new THREE.MeshStandardMaterial({ color: 0xD4A574, roughness: 0.85 })
        );
        roof.position.y = 3.1 * scale;
        roof.castShadow = true;
        group.add(roof);

        // Supports (elevated)
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const support = new THREE.Mesh(
                new THREE.CylinderGeometry(0.1 * scale, 0.12 * scale, 0.5 * scale, 8),
                new THREE.MeshStandardMaterial({ color: 0x654321 })
            );
            support.position.set(
                Math.cos(angle) * 0.9 * scale,
                0.15 * scale,
                Math.sin(angle) * 0.9 * scale
            );
            group.add(support);
        }
    }

    createInfrastructureBuilding(group, definition, variation, scale) {
        if (definition.name === 'Well') {
            // Well base
            const base = new THREE.Mesh(
                new THREE.CylinderGeometry(0.6 * scale, 0.7 * scale, 0.6 * scale, 12),
                new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.9 })
            );
            base.position.y = 0.3 * scale;
            base.castShadow = true;
            group.add(base);

            // Roof structure
            const post1 = new THREE.Mesh(
                new THREE.BoxGeometry(0.1 * scale, 1.2 * scale, 0.1 * scale),
                new THREE.MeshStandardMaterial({ color: 0x8B4513 })
            );
            post1.position.set(-0.4 * scale, 0.9 * scale, 0);
            group.add(post1);

            const post2 = post1.clone();
            post2.position.x = 0.4 * scale;
            group.add(post2);

            const beam = new THREE.Mesh(
                new THREE.BoxGeometry(1.0 * scale, 0.1 * scale, 0.1 * scale),
                new THREE.MeshStandardMaterial({ color: 0x8B4513 })
            );
            beam.position.y = 1.5 * scale;
            group.add(beam);

            // Bucket
            const bucket = new THREE.Mesh(
                new THREE.CylinderGeometry(0.12 * scale, 0.1 * scale, 0.2 * scale, 8),
                new THREE.MeshStandardMaterial({ color: 0x654321 })
            );
            bucket.position.y = 1.0 * scale;
            group.add(bucket);
        } else if (definition.name === 'Hospital') {
            // Hospital building
            const main = new THREE.Mesh(
                new THREE.BoxGeometry(2.5 * scale, 1.5 * scale, 2.0 * scale),
                new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.8 })
            );
            main.position.y = 0.85 * scale;
            main.castShadow = true;
            group.add(main);

            // Red cross
            const crossH = new THREE.Mesh(
                new THREE.BoxGeometry(0.6 * scale, 0.15 * scale, 0.1),
                new THREE.MeshStandardMaterial({ color: 0xFF0000 })
            );
            crossH.position.set(0, 1.2 * scale, 1.05 * scale);
            group.add(crossH);

            const crossV = new THREE.Mesh(
                new THREE.BoxGeometry(0.15 * scale, 0.6 * scale, 0.1),
                new THREE.MeshStandardMaterial({ color: 0xFF0000 })
            );
            crossV.position.set(0, 1.2 * scale, 1.05 * scale);
            group.add(crossV);

            // Flat roof
            const roof = new THREE.Mesh(
                new THREE.BoxGeometry(2.7 * scale, 0.15 * scale, 2.2 * scale),
                new THREE.MeshStandardMaterial({ color: 0xE0E0E0, roughness: 0.9 })
            );
            roof.position.y = 1.7 * scale;
            group.add(roof);
        }
    }

    createDefaultBuilding(group = new THREE.Group(), scale = 1.0) {
        const box = new THREE.Mesh(
            new THREE.BoxGeometry(1.5 * scale, 1.5 * scale, 1.5 * scale),
            new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.9 })
        );
        box.position.y = 0.75 * scale;
        box.castShadow = true;
        group.add(box);
        return group;
    }

    addTribeAccents(group, color) {
        // Add subtle colored elements to identify tribe ownership
        group.traverse((child) => {
            if (child.isMesh && child.material) {
                // Clone material to avoid affecting other buildings
                child.userData.originalColor = child.material.color.getHex();
            }
        });

        // Add a colored banner/marker
        const marker = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.3, 0.05),
            new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.3
            })
        );
        marker.position.set(0, 0.15, 0);
        marker.userData.isTribeMarker = true;
        group.add(marker);
    }

    addSmokeEffect(group) {
        // Placeholder for particle smoke effect
        group.userData.hasSmoke = true;
    }

    addLightEffect(group) {
        const light = new THREE.PointLight(0xFFAA44, 0.5, 5);
        light.position.set(0, 1.5, 0);
        light.userData.isInteriorLight = true;
        group.add(light);
    }

    addFlag(group, color) {
        const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8),
            new THREE.MeshStandardMaterial({ color: 0x654321 })
        );
        pole.position.set(0, 2.5, 0);
        group.add(pole);

        const flag = new THREE.Mesh(
            new THREE.PlaneGeometry(0.5, 0.3),
            new THREE.MeshStandardMaterial({
                color: color,
                side: THREE.DoubleSide
            })
        );
        flag.position.set(0.25, 3.1, 0);
        flag.userData.isFlag = true;
        group.add(flag);
    }

    addGlowEffect(group, color) {
        const glow = new THREE.PointLight(color, 1.0, 8);
        glow.position.set(0, 2, 0);
        glow.userData.isGlowLight = true;
        group.add(glow);
    }
}

// Singleton for building definitions lookup
export const buildingDefs = BuildingDefinitions;
