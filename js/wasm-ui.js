// WASM UI Module - Updates UI elements from WASM data

export class WasmUI {
    constructor(wasmModule) {
        this.wasmModule = wasmModule;
        this.statsElement = null;
        this.tribesElement = null;
        this.controlsElement = null;
        this.fpsElement = null;
        this.lastFpsUpdate = 0;
        this.frameCount = 0;
        this.fps = 0;
    }

    init() {
        // Create UI container
        const uiContainer = document.createElement('div');
        uiContainer.id = 'ui-container';
        uiContainer.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            max-width: 300px;
            z-index: 1000;
        `;

        // Stats panel
        this.statsElement = document.createElement('div');
        this.statsElement.id = 'stats';
        uiContainer.appendChild(this.statsElement);

        // Divider
        const divider = document.createElement('hr');
        divider.style.cssText = 'border: 1px solid rgba(255,255,255,0.3); margin: 10px 0;';
        uiContainer.appendChild(divider);

        // Tribes panel
        this.tribesElement = document.createElement('div');
        this.tribesElement.id = 'tribes';
        uiContainer.appendChild(this.tribesElement);

        // Divider
        const divider2 = document.createElement('hr');
        divider2.style.cssText = 'border: 1px solid rgba(255,255,255,0.3); margin: 10px 0;';
        uiContainer.appendChild(divider2);

        // Controls panel
        this.controlsElement = document.createElement('div');
        this.controlsElement.id = 'controls';
        this.createControls();
        uiContainer.appendChild(this.controlsElement);

        document.body.appendChild(uiContainer);

        // FPS counter
        this.fpsElement = document.createElement('div');
        this.fpsElement.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: #0F0;
            padding: 10px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 20px;
            z-index: 1000;
        `;
        document.body.appendChild(this.fpsElement);

        console.log('[UI] Initialized');
    }

    createControls() {
        this.controlsElement.innerHTML = `
            <h3 style="margin: 0 0 10px 0;">Controls</h3>
            <button id="btn-spawn-plant" style="margin: 5px; padding: 5px 10px;">Spawn Plant</button>
            <button id="btn-spawn-herbivore" style="margin: 5px; padding: 5px 10px;">Spawn Herbivore</button>
            <button id="btn-spawn-carnivore" style="margin: 5px; padding: 5px 10px;">Spawn Carnivore</button>
            <button id="btn-spawn-humanoid" style="margin: 5px; padding: 5px 10px;">Spawn Humanoid</button>
            <button id="btn-create-tribe" style="margin: 5px; padding: 5px 10px;">Create Tribe</button>
            <button id="btn-spawn-100" style="margin: 5px; padding: 5px 10px;">Spawn 100 Organisms</button>
        `;

        // Attach event listeners
        setTimeout(() => {
            document.getElementById('btn-spawn-plant')?.addEventListener('click', () => this.spawnRandom(0));
            document.getElementById('btn-spawn-herbivore')?.addEventListener('click', () => this.spawnRandom(1));
            document.getElementById('btn-spawn-carnivore')?.addEventListener('click', () => this.spawnRandom(2));
            document.getElementById('btn-spawn-humanoid')?.addEventListener('click', () => this.spawnRandom(3));
            document.getElementById('btn-create-tribe')?.addEventListener('click', () => this.createTribe());
            document.getElementById('btn-spawn-100')?.addEventListener('click', () => this.spawn100());
        }, 0);
    }

    spawnRandom(type) {
        const x = (Math.random() - 0.5) * 100;
        const y = 5;
        const z = (Math.random() - 0.5) * 100;
        const tribeId = Math.floor(Math.random() * this.wasmModule.exports.getTribeCount());

        this.wasmModule.spawnOrganism(type, x, y, z, tribeId);
        console.log(`Spawned organism type ${type} at (${x.toFixed(1)}, ${y}, ${z.toFixed(1)})`);
    }

    createTribe() {
        const tribeId = this.wasmModule.createTribe();
        if (tribeId !== 0xFFFFFFFF) {
            console.log(`Created tribe ${tribeId}`);
        } else {
            console.error('Failed to create tribe');
        }
    }

    spawn100() {
        for (let i = 0; i < 100; i++) {
            const type = Math.floor(Math.random() * 4);
            this.spawnRandom(type);
        }
        console.log('Spawned 100 random organisms');
    }

    update(deltaTime) {
        // Update FPS counter
        this.frameCount++;
        const now = performance.now();
        if (now - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = now;
        }

        this.fpsElement.textContent = `${this.fps} FPS`;

        // Update stats
        const stats = this.wasmModule.getStats();
        if (stats) {
            this.statsElement.innerHTML = `
                <h3 style="margin: 0 0 10px 0;">Simulation Stats</h3>
                <div>Organisms: ${stats.aliveCount} / ${stats.organismCount}</div>
                <div>Tribes: ${stats.tribeCount}</div>
                <div>Buildings: ${stats.buildingCount}</div>
                <div>Time: ${stats.time.toFixed(1)}s</div>
                <div>Frames: ${stats.frameCount}</div>
            `;
        }

        // Update tribes panel
        const tribes = this.wasmModule.getAllTribes();
        let tribesHTML = '<h3 style="margin: 0 0 10px 0;">Tribes</h3>';

        if (tribes.length === 0) {
            tribesHTML += '<div style="color: #888;">No tribes yet</div>';
        } else {
            tribes.forEach(tribe => {
                const color = `rgb(${tribe.color.r}, ${tribe.color.g}, ${tribe.color.b})`;
                tribesHTML += `
                    <div style="margin: 5px 0; padding: 5px; background: rgba(255,255,255,0.1); border-radius: 4px;">
                        <div style="color: ${color}; font-weight: bold;">Tribe ${tribe.id}</div>
                        <div style="font-size: 11px;">
                            Members: ${tribe.memberCount} |
                            Food: ${tribe.food.toFixed(0)} |
                            Wood: ${tribe.wood.toFixed(0)}
                        </div>
                        <div style="font-size: 11px;">
                            Stone: ${tribe.stone.toFixed(0)} |
                            Metal: ${tribe.metal.toFixed(0)}
                        </div>
                    </div>
                `;
            });
        }

        this.tribesElement.innerHTML = tribesHTML;
    }
}
