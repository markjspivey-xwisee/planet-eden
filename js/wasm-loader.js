// WASM Loader - Loads and initializes the Planet Eden WASM module

export class WasmModule {
    constructor() {
        this.instance = null;
        this.memory = null;
        this.exports = null;
    }

    async load(wasmPath = './zig-out/bin/planet-eden.wasm') {
        try {
            // Fetch and instantiate WASM module
            const response = await fetch(wasmPath);
            const bytes = await response.arrayBuffer();

            // WASM module manages its own memory (no imports needed)
            const importObject = {
                env: {}
            };

            const result = await WebAssembly.instantiate(bytes, importObject);

            this.instance = result.instance;
            this.memory = result.instance.exports.memory; // WASM exports its own memory
            this.exports = this.instance.exports;

            console.log('[WASM] Module loaded successfully');
            console.log('[WASM] Exports:', Object.keys(this.exports));
            console.log('[WASM] Memory:', this.memory.buffer.byteLength / 1024 / 1024, 'MB');

            return true;
        } catch (error) {
            console.error('[WASM] Failed to load module:', error);
            return false;
        }
    }

    // Initialization
    init(maxOrganisms = 1000, seed = Date.now() & 0xFFFFFFFF) {
        if (!this.exports) {
            console.error('[WASM] Module not loaded');
            return false;
        }

        // Check WASM version
        if (this.exports.getVersion) {
            const version = this.exports.getVersion();
            console.log(`[WASM] Module version: ${version}`);
        }

        const success = this.exports.init(maxOrganisms, seed);
        if (success) {
            console.log(`[WASM] Simulation initialized with ${maxOrganisms} max organisms, seed: ${seed}`);
        } else {
            console.error('[WASM] Initialization failed');
        }
        return success;
    }

    // Update simulation
    update(delta) {
        if (this.exports) {
            this.exports.update(delta);
        }
    }

    // Create typed array views of WASM memory
    getOrganismData() {
        if (!this.exports || !this.memory) return null;

        const count = this.exports.getOrganismCount();

        return {
            count,
            positionsX: new Float32Array(
                this.memory.buffer,
                this.exports.getPositionsX(),
                count
            ),
            positionsY: new Float32Array(
                this.memory.buffer,
                this.exports.getPositionsY(),
                count
            ),
            positionsZ: new Float32Array(
                this.memory.buffer,
                this.exports.getPositionsZ(),
                count
            ),
            types: new Uint8Array(
                this.memory.buffer,
                this.exports.getTypes(),
                count
            ),
            energies: new Float32Array(
                this.memory.buffer,
                this.exports.getEnergies(),
                count
            ),
            healths: new Float32Array(
                this.memory.buffer,
                this.exports.getHealths(),
                count
            ),
            sizes: new Float32Array(
                this.memory.buffer,
                this.exports.getSizes(),
                count
            ),
            tribeIds: new Uint32Array(
                this.memory.buffer,
                this.exports.getTribeIds(),
                count
            ),
            alive: new Uint8Array(
                this.memory.buffer,
                this.exports.getAliveFlags(),
                count
            ),
            attacking: new Uint8Array(
                this.memory.buffer,
                this.exports.getAttackingFlags(),
                count
            ),
            eating: new Uint8Array(
                this.memory.buffer,
                this.exports.getEatingFlags(),
                count
            )
        };
    }

    // Spawn organism (tribeId 0xFFFFFFFF = no tribe)
    spawnOrganism(type, x, y, z, tribeId = 0xFFFFFFFF) {
        if (!this.exports) return 0xFFFFFFFF;
        return this.exports.spawnOrganism(type, x, y, z, tribeId);
    }

    // Create tribe
    createTribe() {
        if (!this.exports) return 0xFFFFFFFF;
        return this.exports.createTribe();
    }

    // Get tribe data
    getTribeData(tribeId) {
        if (!this.exports) return null;

        return {
            id: tribeId,
            food: this.exports.getTribeFood(tribeId),
            wood: this.exports.getTribeWood(tribeId),
            stone: this.exports.getTribeStone(tribeId),
            metal: this.exports.getTribeMetal(tribeId),
            memberCount: this.exports.getTribeMemberCount(tribeId),
            color: {
                r: this.exports.getTribeColorR(tribeId),
                g: this.exports.getTribeColorG(tribeId),
                b: this.exports.getTribeColorB(tribeId)
            }
        };
    }

    // Get all tribes
    getAllTribes() {
        if (!this.exports) {
            console.log('[WASM Loader] getAllTribes: No exports');
            return [];
        }

        const tribeCount = this.exports.getTribeCount();
        console.log('[WASM Loader] getTribeCount() returned:', tribeCount);

        if (tribeCount === 0) return [];

        // Get unique tribe IDs from organisms
        const data = this.getOrganismData();
        const uniqueTribeIds = new Set();

        for (let i = 0; i < data.count; i++) {
            // Check for valid tribe ID (0xFFFFFFFF means no tribe)
            if (data.alive[i] && data.tribeIds[i] < 0xFFFFFFFF) {
                uniqueTribeIds.add(data.tribeIds[i]);
                console.log(`[WASM Loader] Found organism ${i} with tribe ${data.tribeIds[i]}, type ${data.types[i]}`);
            }
        }

        console.log('[WASM Loader] Unique tribe IDs:', Array.from(uniqueTribeIds));

        const tribes = [];
        for (const tribeId of uniqueTribeIds) {
            const tribeData = this.getTribeData(tribeId);
            console.log(`[WASM Loader] getTribeData(${tribeId}) returned:`, tribeData);
            if (tribeData && tribeData.memberCount > 0) {
                tribes.push(tribeData);
            }
        }

        console.log('[WASM Loader] getAllTribes returning', tribes.length, 'tribes');
        return tribes;
    }

    // Get building data
    getBuildingData(buildingId) {
        if (!this.exports) return null;

        return {
            id: buildingId,
            x: this.exports.getBuildingPosX(buildingId),
            y: this.exports.getBuildingPosY(buildingId),
            z: this.exports.getBuildingPosZ(buildingId),
            type: this.exports.getBuildingType(buildingId),
            health: this.exports.getBuildingHealth(buildingId)
        };
    }

    // Get statistics
    getStats() {
        if (!this.exports) return null;

        return {
            organismCount: this.exports.getOrganismCount(),
            aliveCount: this.exports.getAliveCount(),
            tribeCount: this.exports.getTribeCount(),
            buildingCount: this.exports.getBuildingCount(),
            time: this.exports.getTime(),
            frameCount: this.exports.getFrameCount()
        };
    }

    // Get plant data
    getPlantData() {
        if (!this.exports || !this.memory) return null;

        const count = this.exports.getPlantCount ? this.exports.getPlantCount() : 0;
        if (count === 0) return { count: 0 };

        return {
            count,
            types: new Uint8Array(
                this.memory.buffer,
                this.exports.getPlantTypes(),
                count
            ),
            growthStages: new Uint8Array(
                this.memory.buffer,
                this.exports.getPlantGrowthStages(),
                count
            ),
            sizes: new Float32Array(
                this.memory.buffer,
                this.exports.getPlantSizes(),
                count
            ),
            ages: new Float32Array(
                this.memory.buffer,
                this.exports.getPlantAges(),
                count
            )
        };
    }

    // Get plant genetics
    getPlantGenetics(plantIdx) {
        if (!this.exports || !this.exports.getPlantGenetics) return null;

        const packed = this.exports.getPlantGenetics(plantIdx);
        // Unpack from u64
        return {
            growthRate: (Number(packed) & 0xFF) / 255 * 4,
            maxSize: ((Number(packed) >> 8) & 0xFF) / 255 * 4,
            lifespan: ((Number(packed) >> 16) & 0xFF) / 255 * 4,
            colorHue: ((Number(packed) >> 24) & 0xFF) / 255,
            colorSaturation: ((Number(BigInt(packed) >> 32n)) & 0xFF) / 255,
            leafDensity: ((Number(BigInt(packed) >> 40n)) & 0xFF) / 255,
            foodValue: ((Number(BigInt(packed) >> 48n)) & 0xFF) / 255 * 3,
            woodValue: ((Number(BigInt(packed) >> 56n)) & 0xFF) / 255 * 3
        };
    }

    // Spawn plant with specific type
    spawnPlant(plantType, x, y, z) {
        if (!this.exports || !this.exports.spawnPlantOrganism) return 0xFFFFFFFF;
        return this.exports.spawnPlantOrganism(plantType, x, y, z);
    }

    // Get resource node data
    getResourceNodeCount() {
        if (!this.exports || !this.exports.getResourceNodeCount) return 0;
        return this.exports.getResourceNodeCount();
    }

    getResourceNode(nodeId) {
        if (!this.exports) return null;

        return {
            id: nodeId,
            x: this.exports.getResourceNodePosX(nodeId),
            y: this.exports.getResourceNodePosY(nodeId),
            z: this.exports.getResourceNodePosZ(nodeId),
            type: this.exports.getResourceNodeType(nodeId),
            amount: this.exports.getResourceNodeAmount(nodeId)
        };
    }

    // Spawn resource node
    spawnResourceNode(resourceType, x, y, z, amount) {
        if (!this.exports || !this.exports.spawnResourceNode) return 0xFFFFFFFF;
        return this.exports.spawnResourceNode(resourceType, x, y, z, amount);
    }

    // Get crafted items
    getCraftedItemCount() {
        if (!this.exports || !this.exports.getCraftedItemCount) return 0;
        return this.exports.getCraftedItemCount();
    }

    getCraftedItem(itemId) {
        if (!this.exports) return null;

        const itemType = this.exports.getCraftedItemType(itemId);
        const category = (itemType & 0xF0);
        const subtype = (itemType & 0x0F);

        return {
            id: itemId,
            owner: this.exports.getCraftedItemOwner(itemId),
            category, // 0x00 = tool, 0x10 = weapon, 0x20 = armor
            subtype,
            quality: this.exports.getCraftedItemQuality(itemId),
            durability: this.exports.getCraftedItemDurability(itemId),
            equipped: this.exports.isCraftedItemEquipped(itemId)
        };
    }

    // Get organism bonuses from equipment
    getOrganismBonuses(orgId) {
        if (!this.exports) return { damage: 0, defense: 0 };

        return {
            damage: this.exports.getOrganismDamageBonus ? this.exports.getOrganismDamageBonus(orgId) : 0,
            defense: this.exports.getOrganismDefenseBonus ? this.exports.getOrganismDefenseBonus(orgId) : 0
        };
    }

    // Enhanced building data
    getBuildingData(buildingId) {
        if (!this.exports) return null;

        return {
            id: buildingId,
            x: this.exports.getBuildingPosX(buildingId),
            y: this.exports.getBuildingPosY(buildingId),
            z: this.exports.getBuildingPosZ(buildingId),
            type: this.exports.getBuildingType(buildingId),
            health: this.exports.getBuildingHealth(buildingId),
            progress: this.exports.getBuildingProgress ? this.exports.getBuildingProgress(buildingId) : 100,
            tribeId: this.exports.getBuildingTribeId ? this.exports.getBuildingTribeId(buildingId) : 0xFFFFFFFF
        };
    }

    // Cleanup
    cleanup() {
        if (this.exports) {
            this.exports.cleanup();
            console.log('[WASM] Simulation cleaned up');
        }
    }
}

// Organism types enum (matches Zig)
export const OrganismType = {
    PLANT: 0,
    HERBIVORE: 1,
    CARNIVORE: 2,
    HUMANOID: 3
};

// Building types enum (matches Zig)
export const BuildingType = {
    HUT: 0,
    FARM: 1,
    TOWER: 2,
    TEMPLE: 3,
    WALL: 4,
    BARRACKS: 5,
    SMITHY: 6,
    MINE: 7,
    MARKET: 8,
    GRANARY: 9
};

// Plant types enum (matches Zig)
export const PlantType = {
    GRASS: 0,
    TREE: 1,
    BUSH: 2,
    FLOWER: 3,
    CROP: 4
};

// Growth stages enum (matches Zig)
export const GrowthStage = {
    SEED: 0,
    SPROUT: 1,
    JUVENILE: 2,
    MATURE: 3,
    FLOWERING: 4,
    FRUITING: 5,
    DYING: 6
};

// Resource types enum (matches Zig)
export const ResourceType = {
    WOOD: 0,
    STONE: 1,
    FIBER: 2,
    FOOD: 3,
    WATER: 4,
    PLANK: 5,
    BRICK: 6,
    ROPE: 7,
    CLOTH: 8,
    TOOL: 9,
    WEAPON: 10,
    SEED: 11,
    HIDE: 12,
    BONE: 13,
    METAL: 14
};

// Item categories
export const ItemCategory = {
    TOOL: 0x00,
    WEAPON: 0x10,
    ARMOR: 0x20
};
