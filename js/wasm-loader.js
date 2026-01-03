// WASM Loader - Loads and initializes the Planet Eden WASM module

export class WasmModule {
    constructor() {
        this.instance = null;
        this.memory = null;
        this.exports = null;
    }

    async load(wasmPath = '/zig-out/bin/planet-eden.wasm') {
        try {
            // Fetch and instantiate WASM module
            const response = await fetch(wasmPath);
            const bytes = await response.arrayBuffer();

            // Import memory is required by our WASM build
            const importObject = {
                env: {
                    memory: new WebAssembly.Memory({
                        initial: 256,  // 16 MB initial
                        maximum: 2048  // 128 MB max
                    })
                }
            };

            const result = await WebAssembly.instantiate(bytes, importObject);

            this.instance = result.instance;
            this.memory = importObject.env.memory;
            this.exports = this.instance.exports;

            console.log('[WASM] Module loaded successfully');
            console.log('[WASM] Exports:', Object.keys(this.exports));

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

    // Spawn organism
    spawnOrganism(type, x, y, z, tribeId = 0) {
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
        if (!this.exports) return [];

        const count = this.exports.getTribeCount();
        const tribes = [];

        for (let i = 0; i < count; i++) {
            tribes.push(this.getTribeData(i));
        }

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
