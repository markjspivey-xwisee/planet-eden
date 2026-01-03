// Main WASM Application Entry Point

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
    }

    async init() {
        console.log('[Planet Eden WASM] Initializing...');

        // Load WASM module
        const loaded = await this.wasmModule.load();
        if (!loaded) {
            console.error('[Planet Eden WASM] Failed to load WASM module');
            return false;
        }

        // Initialize simulation
        const initialized = this.wasmModule.init(2000, Date.now() & 0xFFFFFFFF);
        if (!initialized) {
            console.error('[Planet Eden WASM] Failed to initialize simulation');
            return false;
        }

        // Create renderer
        this.renderer = new Renderer(this.wasmModule);
        this.renderer.init(document.body);

        // Create UI
        this.ui = new WasmUI(this.wasmModule);
        this.ui.init();

        // Spawn initial organisms
        this.spawnInitialWorld();

        // Setup keyboard controls
        this.setupControls();

        console.log('[Planet Eden WASM] Initialization complete!');
        return true;
    }

    spawnInitialWorld() {
        console.log('[Planet Eden WASM] Creating initial world...');

        // Create a tribe
        const tribe1 = this.wasmModule.createTribe();
        console.log(`Created tribe ${tribe1}`);

        // Spawn some plants
        for (let i = 0; i < 20; i++) {
            const x = (Math.random() - 0.5) * 80;
            const z = (Math.random() - 0.5) * 80;
            this.wasmModule.spawnOrganism(OrganismType.PLANT, x, 0.5, z, 0);
        }

        // Spawn some herbivores
        for (let i = 0; i < 10; i++) {
            const x = (Math.random() - 0.5) * 60;
            const z = (Math.random() - 0.5) * 60;
            this.wasmModule.spawnOrganism(OrganismType.HERBIVORE, x, 2, z, tribe1);
        }

        // Spawn some carnivores
        for (let i = 0; i < 5; i++) {
            const x = (Math.random() - 0.5) * 60;
            const z = (Math.random() - 0.5) * 60;
            this.wasmModule.spawnOrganism(OrganismType.CARNIVORE, x, 2, z, 0);
        }

        // Spawn some humanoids
        for (let i = 0; i < 5; i++) {
            const x = (Math.random() - 0.5) * 60;
            const z = (Math.random() - 0.5) * 60;
            this.wasmModule.spawnOrganism(OrganismType.HUMANOID, x, 2, z, tribe1);
        }

        console.log('[Planet Eden WASM] Initial world created!');
    }

    setupControls() {
        let cameraAngle = 0;

        window.addEventListener('keydown', (e) => {
            switch (e.key) {
                case ' ':
                    this.running = !this.running;
                    console.log(`Simulation ${this.running ? 'started' : 'paused'}`);
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
                    console.log(`Time scale: ${this.timeScale}x`);
                    break;

                case '-':
                case '_':
                    this.timeScale = Math.max(0.1, this.timeScale - 0.5);
                    console.log(`Time scale: ${this.timeScale}x`);
                    break;

                case 'r':
                    // Reset camera
                    cameraAngle = 0;
                    this.renderer.camera.position.set(0, 50, 80);
                    this.renderer.camera.lookAt(0, 0, 0);
                    break;
            }
        });

        console.log('[Planet Eden WASM] Controls setup complete');
        console.log('  Space: Play/Pause');
        console.log('  Arrow Keys: Rotate/Zoom camera');
        console.log('  +/-: Adjust time scale');
        console.log('  R: Reset camera');
    }

    start() {
        this.running = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }

    gameLoop() {
        const now = performance.now();
        const delta = (now - this.lastTime) / 1000;  // Convert to seconds
        this.lastTime = now;

        if (this.running) {
            // Update simulation
            const adjustedDelta = delta * this.timeScale;
            this.wasmModule.update(adjustedDelta);
        }

        // Update renderer
        this.renderer.update();
        this.renderer.render();

        // Update UI
        this.ui.update(delta);

        // Continue loop
        requestAnimationFrame(() => this.gameLoop());
    }

    cleanup() {
        this.running = false;
        this.wasmModule.cleanup();
        console.log('[Planet Eden WASM] Cleaned up');
    }
}

// Initialize and start the application
async function main() {
    const app = new PlanetEdenWasm();

    const success = await app.init();
    if (success) {
        app.start();

        // Expose to window for debugging
        window.planetEden = app;

        console.log('[Planet Eden WASM] Running! Access via window.planetEden');
    } else {
        console.error('[Planet Eden WASM] Failed to initialize');

        // Show error message to user
        document.body.innerHTML = `
            <div style="
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                background: #000;
                color: #f00;
                font-family: monospace;
                font-size: 20px;
                text-align: center;
            ">
                <div>
                    <h1>Failed to initialize Planet Eden WASM</h1>
                    <p>Check console for details</p>
                </div>
            </div>
        `;
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
