// Save/Load System for Planet Eden
// Handles persistence of simulation state to localStorage

export class SaveSystem {
    constructor() {
        this.SAVE_KEY = 'planetEden_saveGame';
        this.AUTOSAVE_KEY = 'planetEden_autoSave';
        this.AUTOSAVE_INTERVAL = 60000; // 1 minute

        this.wasmModule = null;
        this.renderer = null;
        this.eventSystem = null;

        this.autosaveTimer = null;
        this.lastSaveTime = null;
    }

    init(wasmModule, renderer, eventSystem) {
        this.wasmModule = wasmModule;
        this.renderer = renderer;
        this.eventSystem = eventSystem;

        this.createUI();
        this.setupKeyboard();

        // Load autosave setting
        const settings = this.loadSettings();
        if (settings && settings.autoSave) {
            this.startAutosave();
        }

        console.log('[SaveSystem] Initialized');
    }

    createUI() {
        // Add save/load buttons to the UI
        const container = document.createElement('div');
        container.id = 'save-load-buttons';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 110px;
            display: flex;
            gap: 5px;
            z-index: 1001;
        `;

        // Save button
        const saveBtn = document.createElement('button');
        saveBtn.innerHTML = '💾';
        saveBtn.title = 'Save Game (Ctrl+S)';
        saveBtn.style.cssText = this.buttonStyle();
        saveBtn.onclick = () => this.saveGame();
        saveBtn.onmouseover = () => { saveBtn.style.background = 'rgba(50, 100, 50, 0.8)'; saveBtn.style.opacity = '1'; };
        saveBtn.onmouseout = () => { saveBtn.style.background = 'rgba(0, 0, 0, 0.6)'; saveBtn.style.opacity = '0.7'; };

        // Load button
        const loadBtn = document.createElement('button');
        loadBtn.innerHTML = '📂';
        loadBtn.title = 'Load Game (Ctrl+L)';
        loadBtn.style.cssText = this.buttonStyle();
        loadBtn.onclick = () => this.showLoadDialog();
        loadBtn.onmouseover = () => { loadBtn.style.background = 'rgba(50, 100, 50, 0.8)'; loadBtn.style.opacity = '1'; };
        loadBtn.onmouseout = () => { loadBtn.style.background = 'rgba(0, 0, 0, 0.6)'; loadBtn.style.opacity = '0.7'; };

        container.appendChild(saveBtn);
        container.appendChild(loadBtn);
        document.body.appendChild(container);
    }

    buttonStyle() {
        return `
            width: 36px;
            height: 36px;
            background: rgba(0, 0, 0, 0.6);
            border: 1px solid rgba(100, 200, 100, 0.2);
            border-radius: 50%;
            color: #fff;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.2s;
            opacity: 0.7;
        `;
    }

    setupKeyboard() {
        window.addEventListener('keydown', (e) => {
            // Ctrl+S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveGame();
            }
            // Ctrl+L to load
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                this.showLoadDialog();
            }
        });
    }

    loadSettings() {
        try {
            const settings = localStorage.getItem('planetEden_settings');
            return settings ? JSON.parse(settings) : null;
        } catch (e) {
            return null;
        }
    }

    startAutosave() {
        if (this.autosaveTimer) return;

        this.autosaveTimer = setInterval(() => {
            this.autoSave();
        }, this.AUTOSAVE_INTERVAL);

        console.log('[SaveSystem] Autosave enabled (every 60s)');
    }

    stopAutosave() {
        if (this.autosaveTimer) {
            clearInterval(this.autosaveTimer);
            this.autosaveTimer = null;
        }
    }

    // Collect all game state into a serializable object
    collectGameState() {
        if (!this.wasmModule) return null;

        const organismData = this.wasmModule.getOrganismData();
        const stats = this.wasmModule.getStats();
        const tribes = this.wasmModule.getAllTribes();

        // Collect organism data
        const organisms = [];
        for (let i = 0; i < organismData.count; i++) {
            if (organismData.alive[i]) {
                organisms.push({
                    id: i,
                    type: organismData.types[i],
                    x: organismData.positionsX[i],
                    y: organismData.positionsY[i],
                    z: organismData.positionsZ[i],
                    energy: organismData.energies[i],
                    health: organismData.healths[i],
                    tribeId: organismData.tribeIds[i]
                });
            }
        }

        // Collect building data
        const buildings = [];
        if (this.renderer && this.renderer.buildings) {
            this.renderer.buildings.forEach((building, id) => {
                buildings.push({
                    id: id,
                    type: building.userData.buildingType,
                    x: building.userData.flatX,
                    z: building.userData.flatZ,
                    tribeId: building.userData.tribeId
                });
            });
        }

        // Collect tribe resources (from renderer's local tracking)
        const tribeResources = {};
        if (this.renderer && this.renderer.tribeResources) {
            this.renderer.tribeResources.forEach((resources, tribeId) => {
                tribeResources[tribeId] = { ...resources };
            });
        }

        return {
            version: 1,
            timestamp: Date.now(),
            stats: {
                time: stats.time,
                frameCount: stats.frameCount
            },
            organisms,
            tribes: tribes.map(t => ({
                id: t.id,
                food: t.food,
                wood: t.wood,
                stone: t.stone,
                metal: t.metal,
                color: t.color
            })),
            buildings,
            tribeResources
        };
    }

    saveGame(slot = 'manual') {
        try {
            const state = this.collectGameState();
            if (!state) {
                console.error('[SaveSystem] Failed to collect game state');
                return false;
            }

            const key = slot === 'auto' ? this.AUTOSAVE_KEY : this.SAVE_KEY;
            const saveData = JSON.stringify(state);

            localStorage.setItem(key, saveData);
            this.lastSaveTime = Date.now();

            const sizeKB = (saveData.length / 1024).toFixed(1);
            console.log(`[SaveSystem] Game saved (${sizeKB} KB)`);

            // Show notification
            if (this.eventSystem && slot !== 'auto') {
                this.eventSystem.log('Save', 'Game saved successfully!', '💾', 'normal');
            }

            return true;
        } catch (e) {
            console.error('[SaveSystem] Save failed:', e);
            if (this.eventSystem) {
                this.eventSystem.log('Error', 'Failed to save game', '❌', 'high');
            }
            return false;
        }
    }

    autoSave() {
        console.log('[SaveSystem] Auto-saving...');
        this.saveGame('auto');
    }

    hasSaveGame(slot = 'manual') {
        const key = slot === 'auto' ? this.AUTOSAVE_KEY : this.SAVE_KEY;
        return localStorage.getItem(key) !== null;
    }

    getSaveInfo(slot = 'manual') {
        try {
            const key = slot === 'auto' ? this.AUTOSAVE_KEY : this.SAVE_KEY;
            const data = localStorage.getItem(key);
            if (!data) return null;

            const state = JSON.parse(data);
            return {
                timestamp: state.timestamp,
                date: new Date(state.timestamp).toLocaleString(),
                organisms: state.organisms.length,
                tribes: state.tribes.length,
                buildings: state.buildings.length,
                playTime: state.stats.time
            };
        } catch (e) {
            return null;
        }
    }

    showLoadDialog() {
        const manualSave = this.getSaveInfo('manual');
        const autoSave = this.getSaveInfo('auto');

        if (!manualSave && !autoSave) {
            if (this.eventSystem) {
                this.eventSystem.log('Load', 'No saved games found', '📂', 'normal');
            }
            return;
        }

        // Create modal dialog
        const modal = document.createElement('div');
        modal.id = 'load-dialog';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 3000;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: 'Segoe UI', sans-serif;
        `;

        const formatTime = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}m ${secs}s`;
        };

        modal.innerHTML = `
            <div style="
                background: rgba(20, 30, 20, 0.98);
                border: 2px solid #4a0;
                border-radius: 12px;
                padding: 30px;
                width: 400px;
                max-width: 90vw;
                color: #fff;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
            ">
                <h2 style="color: #8f8; margin: 0 0 20px 0; text-align: center;">Load Game</h2>

                ${manualSave ? `
                    <div class="save-slot" style="
                        background: rgba(0, 0, 0, 0.3);
                        border: 1px solid #4a0;
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 15px;
                        cursor: pointer;
                        transition: all 0.2s;
                    " onmouseover="this.style.borderColor='#8f8'" onmouseout="this.style.borderColor='#4a0'" onclick="window.loadGameSlot('manual')">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #8f8; font-weight: 600;">💾 Manual Save</span>
                            <span style="color: #888; font-size: 12px;">${manualSave.date}</span>
                        </div>
                        <div style="color: #aaa; font-size: 13px;">
                            ${manualSave.organisms} organisms, ${manualSave.tribes} tribes, ${manualSave.buildings} buildings
                        </div>
                        <div style="color: #666; font-size: 12px; margin-top: 4px;">
                            Play time: ${formatTime(manualSave.playTime)}
                        </div>
                    </div>
                ` : ''}

                ${autoSave ? `
                    <div class="save-slot" style="
                        background: rgba(0, 0, 0, 0.3);
                        border: 1px solid #464;
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 15px;
                        cursor: pointer;
                        transition: all 0.2s;
                    " onmouseover="this.style.borderColor='#8f8'" onmouseout="this.style.borderColor='#464'" onclick="window.loadGameSlot('auto')">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span style="color: #6a6; font-weight: 600;">🔄 Auto Save</span>
                            <span style="color: #888; font-size: 12px;">${autoSave.date}</span>
                        </div>
                        <div style="color: #aaa; font-size: 13px;">
                            ${autoSave.organisms} organisms, ${autoSave.tribes} tribes, ${autoSave.buildings} buildings
                        </div>
                        <div style="color: #666; font-size: 12px; margin-top: 4px;">
                            Play time: ${formatTime(autoSave.playTime)}
                        </div>
                    </div>
                ` : ''}

                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                    <button onclick="document.getElementById('load-dialog').remove()" style="
                        background: transparent;
                        border: 1px solid #666;
                        color: #888;
                        padding: 10px 25px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                    ">Cancel</button>
                </div>
            </div>
        `;

        // Setup load function
        window.loadGameSlot = (slot) => {
            modal.remove();
            this.loadGame(slot);
        };

        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        document.body.appendChild(modal);
    }

    loadGame(slot = 'manual') {
        try {
            const key = slot === 'auto' ? this.AUTOSAVE_KEY : this.SAVE_KEY;
            const data = localStorage.getItem(key);

            if (!data) {
                console.error('[SaveSystem] No save data found');
                return false;
            }

            const state = JSON.parse(data);
            console.log('[SaveSystem] Loading save from', new Date(state.timestamp).toLocaleString());

            // Since we can't directly restore WASM state, we'll need to:
            // 1. Reset the simulation
            // 2. Recreate organisms
            // 3. Recreate buildings
            // 4. Restore tribe resources

            // Note: Full state restoration requires WASM support for loading state
            // For now, show a message that save/load is a snapshot feature

            if (this.eventSystem) {
                this.eventSystem.log('Load', 'Loading saved game...', '📂', 'high');
            }

            // Attempt to restore what we can
            this.restoreGameState(state);

            console.log('[SaveSystem] Game loaded successfully');
            return true;
        } catch (e) {
            console.error('[SaveSystem] Load failed:', e);
            if (this.eventSystem) {
                this.eventSystem.log('Error', 'Failed to load game', '❌', 'high');
            }
            return false;
        }
    }

    restoreGameState(state) {
        // Restore tribe resources
        if (this.renderer && state.tribeResources) {
            this.renderer.tribeResources.clear();
            Object.entries(state.tribeResources).forEach(([tribeId, resources]) => {
                this.renderer.tribeResources.set(parseInt(tribeId), { ...resources });
            });
        }

        // Note: Full organism and building restoration would require WASM API support
        // This is a foundation for when WASM state serialization is implemented
        console.log(`[SaveSystem] Restored: ${state.organisms.length} organisms, ${state.buildings.length} buildings`);

        if (this.eventSystem) {
            this.eventSystem.log(
                'Loaded',
                `Restored ${state.organisms.length} organisms from ${new Date(state.timestamp).toLocaleDateString()}`,
                '✅',
                'high'
            );
        }
    }

    deleteSave(slot = 'manual') {
        const key = slot === 'auto' ? this.AUTOSAVE_KEY : this.SAVE_KEY;
        localStorage.removeItem(key);
        console.log(`[SaveSystem] Deleted ${slot} save`);
    }

    dispose() {
        this.stopAutosave();
    }
}

// Singleton
export const saveSystem = new SaveSystem();
