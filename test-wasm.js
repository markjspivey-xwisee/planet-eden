// Test WASM module loading and basic functionality
const fs = require('fs');

async function testWasm() {
    console.log('[Test] Loading WASM module...');

    const wasmBuffer = fs.readFileSync('./zig-out/bin/planet-eden.wasm');

    const importObject = {
        env: {}
    };

    const wasmModule = await WebAssembly.instantiate(wasmBuffer, importObject);
    const { exports } = wasmModule.instance;

    console.log('[Test] WASM module loaded successfully');
    console.log('[Test] Available exports:', Object.keys(exports).slice(0, 10).join(', '), '...');

    // Test initialization
    console.log('\n[Test] Testing init()...');
    const initResult = exports.init(1000, 42);
    console.log('[Test] init() returned:', initResult);

    if (!initResult) {
        console.error('[Test] FAILED: init() returned false!');
        return;
    }

    // Test getting counts
    console.log('\n[Test] Testing getOrganismCount()...');
    const count = exports.getOrganismCount();
    console.log('[Test] Organism count:', count);

    console.log('\n[Test] Testing getTribeCount()...');
    const tribeCount = exports.getTribeCount();
    console.log('[Test] Tribe count:', tribeCount);

    // Test spawning organisms
    console.log('\n[Test] Testing spawnOrganism()...');
    const orgId = exports.spawnOrganism(3, 0, 5, 0, 0); // humanoid at (0, 5, 0)
    console.log('[Test] Spawned organism ID:', orgId);

    if (orgId === 0xFFFFFFFF) {
        console.error('[Test] FAILED: spawnOrganism() returned error!');
        return;
    }

    // Test update
    console.log('\n[Test] Testing update()...');
    exports.update(0.016); // 60 FPS delta
    console.log('[Test] Update completed');

    // Check counts again
    const newCount = exports.getOrganismCount();
    const aliveCount = exports.getAliveCount();
    console.log('[Test] Organism count after spawn:', newCount);
    console.log('[Test] Alive count:', aliveCount);

    // Test memory access
    if (exports.memory) {
        console.log('\n[Test] Memory buffer size:', exports.memory.buffer.byteLength / 1024 / 1024, 'MB');

        // Test reading position data
        const posXPtr = exports.getPositionsX();
        const posYPtr = exports.getPositionsY();
        const posZPtr = exports.getPositionsZ();

        const posXArray = new Float32Array(exports.memory.buffer, posXPtr, newCount);
        const posYArray = new Float32Array(exports.memory.buffer, posYPtr, newCount);
        const posZArray = new Float32Array(exports.memory.buffer, posZPtr, newCount);

        console.log('[Test] Organism 0 position:', {
            x: posXArray[0],
            y: posYArray[0],
            z: posZArray[0]
        });
    }

    console.log('\n[Test] ✅ ALL TESTS PASSED!');
}

testWasm().catch(err => {
    console.error('[Test] ❌ ERROR:', err.message);
    console.error(err.stack);
});
