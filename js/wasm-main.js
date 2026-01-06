// Enhanced WASM Application Entry Point - Full tribal civilization simulator

import { WasmModule, OrganismType } from './wasm-loader.js';
import { Renderer } from './renderer.js';
import { WasmUI } from './wasm-ui.js';

class PlanetEdenWasm {
    constructor() {
        this.wasmModule = new WasmModule();
        this.renderer = null;
        this.ui = null;
        this.running = false;
        this.lastTime = 0;
        this.timeScale = 1.0;
        this.loadingElement = null;
        this.pauseOverlay = null;
    }

    async init() {
        console.log('[Planet Eden WASM] 🌍 Initializing tribal civilization simulator...');

        this.loadingElement = document.getElementById('loading');

        // Load WASM module
        console.log('[Planet Eden WASM] Loading WASM module...');
        const loaded = await this.wasmModule.load();
        if (!loaded) {
            console.error('[Planet Eden WASM] ❌ Failed to load WASM module');
            this.showError('Failed to load WASM module. Check console for details.');
            return false;
        }
        console.log('[Planet Eden WASM] ✅ WASM module loaded');

        // Initialize simulation - plants don't use neural nets so we can have many more
        // Animals need ~1.6KB each for brain, plants are cheap (~64 bytes)
        console.log('[Planet Eden WASM] Initializing simulation with 500 max organisms...');
        const initialized = this.wasmModule.init(500, Date.now() & 0xFFFFFFFF);
        if (!initialized) {
            console.error('[Planet Eden WASM] ❌ Failed to initialize simulation');
            this.showError('Failed to initialize simulation. Check console for details.');
            return false;
        }
        console.log('[Planet Eden WASM] ✅ Simulation initialized');

        // Create renderer
        console.log('[Planet Eden WASM] Initializing 3D renderer...');
        this.renderer = new Renderer(this.wasmModule);
        this.renderer.init(document.body);
        console.log('[Planet Eden WASM] ✅ Renderer initialized');

        // Create UI
        console.log('[Planet Eden WASM] Initializing enhanced UI...');
        this.ui = new WasmUI(this.wasmModule, this.renderer);
        this.ui.init();
        console.log('[Planet Eden WASM] ✅ UI initialized');

        // Setup pause overlay
        this.pauseOverlay = document.getElementById('pause-overlay');

        // Spawn initial world
        this.spawnInitialWorld();

        // Setup keyboard controls
        this.setupControls();

        // Auto-start the simulation
        this.start();

        // Hide loading screen
        setTimeout(() => {
            this.loadingElement.classList.add('hidden');
        }, 1000);

        console.log('[Planet Eden WASM] 🎉 Initialization complete!');
        console.log('[Planet Eden WASM] ✅ Simulation auto-started!');
        console.log('[Planet Eden WASM] Press SPACE to pause, F1-F6 for god powers');
        return true;
    }

    spawnInitialWorld() {
        console.log('[Planet Eden WASM] 🌱 Creating initial world (LAND ONLY)...');

        // Create first tribe
        const tribe1 = this.wasmModule.createTribe();
        console.log(`[Planet Eden WASM] createTribe() returned: ${tribe1}`);

        // Verify tribe was created
        const stats = this.wasmModule.getStats();
        console.log(`[Planet Eden WASM] Tribe count after creation: ${stats.tribeCount}`);

        if (stats.tribeCount === 0) {
            console.error('[Planet Eden WASM] ⚠️ WARNING: Tribe count is 0 after createTribe()!');
        }

        const NO_TRIBE = 0xFFFFFFFF; // Special value meaning "no tribe"

        // Helper to spawn organism on land only
        const spawnOnLand = (type, tribeId) => {
            const pos = this.renderer.findLandPosition();
            if (pos.isLand) {
                this.wasmModule.spawnOrganism(type, pos.flatX, 0.5, pos.flatZ, tribeId);
                return true;
            }
            return false;
        };

        // Spawn abundant vegetation (300 plants/trees) - only on land
        // Plants can reproduce via seeding, so a good starting forest is important
        let plantCount = 0;
        for (let i = 0; i < 300; i++) {
            if (spawnOnLand(OrganismType.PLANT, NO_TRIBE)) plantCount++;
        }

        // Spawn herbivores (25 animals) - wild grazing herds, only on land
        let herbCount = 0;
        for (let i = 0; i < 25; i++) {
            if (spawnOnLand(OrganismType.HERBIVORE, NO_TRIBE)) herbCount++;
        }

        // Spawn carnivores (8 predators) - wild hunters, only on land
        let carnCount = 0;
        for (let i = 0; i < 8; i++) {
            if (spawnOnLand(OrganismType.CARNIVORE, NO_TRIBE)) carnCount++;
        }

        // Spawn first tribe members (12 humanoids) - only on land
        let humanCount = 0;
        for (let i = 0; i < 12; i++) {
            if (spawnOnLand(OrganismType.HUMANOID, tribe1)) humanCount++;
        }

        console.log('[Planet Eden WASM] ✅ Initial world created (LAND ONLY)!');
        console.log(`[Planet Eden WASM] 🏛️ 1 tribe with ${humanCount} members`);
        console.log(`[Planet Eden WASM] 🌲 ${plantCount} plants/trees (will grow and seed)`);
        console.log(`[Planet Eden WASM] 🦌 ${herbCount} herbivores`);
        console.log(`[Planet Eden WASM] 🦁 ${carnCount} carnivores`);
        console.log(`[Planet Eden WASM] Total: ${plantCount + herbCount + carnCount + humanCount} organisms`);

        // Verify organisms were spawned
        const finalStats = this.wasmModule.getStats();
        console.log(`[Planet Eden WASM] Final organism count: ${finalStats.organismCount}`);
        console.log(`[Planet Eden WASM] Alive count: ${finalStats.aliveCount}`);
    }

    setupControls() {
        let cameraAngle = 0;

        window.addEventListener('keydown', (e) => {
            switch (e.key) {
                case ' ':
                    this.running = !this.running;
                    this.pauseOverlay.style.display = this.running ? 'none' : 'block';
                    console.log(`[Planet Eden WASM] ${this.running ? '▶️ STARTED' : '⏸️ PAUSED'}`);
                    break;

                case 'ArrowLeft':
                    cameraAngle -= 0.1;
                    this.renderer.rotateCamera(cameraAngle);
                    break;

                case 'ArrowRight':
                    cameraAngle += 0.1;
                    this.renderer.rotateCamera(cameraAngle);
                    break;

                case 'ArrowUp':
                    this.renderer.zoomCamera(-0.1);
                    break;

                case 'ArrowDown':
                    this.renderer.zoomCamera(0.1);
                    break;

                case '+':
                case '=':
                    this.timeScale = Math.min(5.0, this.timeScale + 0.5);
                    console.log(`[Planet Eden WASM] ⏩ Time scale: ${this.timeScale}x`);
                    document.getElementById('time-scale-slider').value = this.timeScale;
                    document.getElementById('time-scale-value').textContent = `${this.timeScale.toFixed(1)}x`;
                    break;

                case '-':
                case '_':
                    this.timeScale = Math.max(0.1, this.timeScale - 0.5);
                    console.log(`[Planet Eden WASM] ⏪ Time scale: ${this.timeScale}x`);
                    document.getElementById('time-scale-slider').value = this.timeScale;
                    document.getElementById('time-scale-value').textContent = `${this.timeScale.toFixed(1)}x`;
                    break;

                case 'r':
                case 'R':
                    // Reset camera
                    cameraAngle = 0;
                    this.renderer.camera.position.set(0, 50, 80);
                    this.renderer.camera.lookAt(0, 0, 0);
                    console.log('[Planet Eden WASM] 📷 Camera reset');
                    break;

                // Quick spawn shortcuts
                case '1':
                    this.ui.spawnRandom(OrganismType.PLANT);
                    break;
                case '2':
                    this.ui.spawnRandom(OrganismType.HERBIVORE);
                    break;
                case '3':
                    this.ui.spawnRandom(OrganismType.CARNIVORE);
                    break;
                case '4':
                    this.ui.spawnRandom(OrganismType.HUMANOID);
                    break;

                // Debug info
                case 'i':
                case 'I':
                    this.logDebugInfo();
                    break;
            }
        });

        console.log('[Planet Eden WASM] 🎮 Controls configured');
        console.log('');
        console.log('═══════════════════════════════════════════════════');
        console.log('                  CONTROLS GUIDE                   ');
        console.log('═══════════════════════════════════════════════════');
        console.log('');
        console.log('🎮 SIMULATION');
        console.log('  SPACE       - Play/Pause');
        console.log('  + / -       - Adjust time scale');
        console.log('');
        console.log('📷 CAMERA');
        console.log('  ← →         - Rotate camera');
        console.log('  ↑ ↓         - Zoom in/out');
        console.log('  R           - Reset camera');
        console.log('');
        console.log('🌱 QUICK SPAWN');
        console.log('  1           - Spawn plant');
        console.log('  2           - Spawn herbivore');
        console.log('  3           - Spawn carnivore');
        console.log('  4           - Spawn humanoid');
        console.log('');
        console.log('⚡ GOD POWERS');
        console.log('  F1          - Spawn new tribe');
        console.log('  F2          - Mass spawn 100 organisms');
        console.log('  F3          - Gift resources');
        console.log('  F4          - Trigger war');
        console.log('  F5          - Plague');
        console.log('  F6          - Divine blessing');
        console.log('');
        console.log('📊 DEBUG');
        console.log('  I           - Log debug info');
        console.log('');
        console.log('═══════════════════════════════════════════════════');
        console.log('');
    }

    logDebugInfo() {
        const stats = this.wasmModule.getStats();
        const tribes = this.wasmModule.getAllTribes();

        console.log('');
        console.log('═══════════════════════════════════════════════════');
        console.log('              SIMULATION DEBUG INFO                ');
        console.log('═══════════════════════════════════════════════════');
        console.log('');
        console.log('📊 STATISTICS');
        console.log(`  Organisms:  ${stats.aliveCount} / ${stats.organismCount} alive`);
        console.log(`  Tribes:     ${stats.tribeCount} active`);
        console.log(`  Buildings:  ${stats.buildingCount}`);
        console.log(`  Time:       ${stats.time.toFixed(2)}s`);
        console.log(`  Frames:     ${stats.frameCount.toLocaleString()}`);
        console.log(`  FPS:        ${this.ui.fps}`);
        console.log(`  Time Scale: ${this.timeScale}x`);
        console.log('');
        console.log('🏛️ TRIBES');
        tribes.forEach(tribe => {
            console.log(`  Tribe ${tribe.id}:`);
            console.log(`    Members:   ${tribe.memberCount}`);
            console.log(`    Resources: F:${tribe.food.toFixed(0)} W:${tribe.wood.toFixed(0)} S:${tribe.stone.toFixed(0)} M:${tribe.metal.toFixed(0)}`);
            console.log(`    Color:     RGB(${tribe.color.r}, ${tribe.color.g}, ${tribe.color.b})`);
        });
        console.log('');
        console.log('💾 WASM');
        console.log(`  Memory:     ${(this.wasmModule.memory.buffer.byteLength / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  Module:     24 KB`);
        console.log('');
        console.log('═══════════════════════════════════════════════════');
        console.log('');
    }

    start() {
        this.running = true;
        this.pauseOverlay.style.display = 'none';
        this.lastTime = performance.now();
        this.gameLoop();

        console.log('[Planet Eden WASM] ▶️ Simulation started!');
    }

    gameLoop() {
        const now = performance.now();
        const delta = (now - this.lastTime) / 1000;  // Convert to seconds
        this.lastTime = now;

        if (this.running) {
            // Update simulation with time scaling
            const adjustedDelta = delta * this.timeScale;
            this.wasmModule.update(adjustedDelta);
        }

        // Always update renderer and UI
        this.renderer.update();
        this.renderer.render();
        this.ui.update(delta);

        // Continue loop
        requestAnimationFrame(() => this.gameLoop());
    }

    cleanup() {
        this.running = false;
        this.wasmModule.cleanup();
        console.log('[Planet Eden WASM] 🛑 Cleaned up');
    }

    showError(message) {
        this.loadingElement.innerHTML = `
            <div style="color: #F00; font-size: 32px; margin-bottom: 20px;">❌ ERROR</div>
            <div style="font-size: 18px; max-width: 600px;">${message}</div>
            <div style="font-size: 14px; margin-top: 20px; color: #888;">Check browser console for details</div>
        `;
    }
}

// Initialize and start the application
async function main() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════╗');
    console.log('║                                                   ║');
    console.log('║           🌍 PLANET EDEN - WASM EDITION 🌍         ║');
    console.log('║                                                   ║');
    console.log('║     Neural Evolution Tribal Civilization          ║');
    console.log('║                                                   ║');
    console.log('╚═══════════════════════════════════════════════════╝');
    console.log('');
    console.log('🚀 Powered by:');
    console.log('   • Zig + WebAssembly (882 KB)');
    console.log('   • Three.js 3D Graphics');
    console.log('   • Neural Networks (15→12→17)');
    console.log('   • Plant/Resource/Crafting Systems');
    console.log('');

    const app = new PlanetEdenWasm();

    const success = await app.init();
    if (success) {
        app.start();

        // Expose to window for debugging
        window.planetEden = app;

        console.log('');
        console.log('✅ Planet Eden WASM is running!');
        console.log('');
        console.log('🎮 Access via: window.planetEden');
        console.log('📊 Methods:');
        console.log('   • window.planetEden.logDebugInfo()');
        console.log('   • window.planetEden.timeScale = 2.0');
        console.log('');
        console.log('Press SPACE to begin, or I for debug info');
        console.log('');
    } else {
        console.error('');
        console.error('❌ Failed to initialize Planet Eden WASM');
        console.error('');
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        app.cleanup();
    });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}
