// Settings Menu System for Planet Eden
// AAA-quality settings interface with persistent preferences

export class SettingsSystem {
    constructor() {
        this.modal = null;
        this.visible = false;
        this.onSettingsChange = null;

        // Default settings
        this.defaults = {
            graphics: {
                quality: 'high',       // 'low', 'medium', 'high'
                shadows: true,
                particles: true,
                antialiasing: true,
                drawDistance: 100
            },
            audio: {
                master: 0.7,
                music: 0.5,
                sfx: 0.8,
                ambient: 0.6
            },
            gameplay: {
                timeScale: 1.0,
                autoSave: true,
                showTips: true,
                cameraSpeed: 1.0
            },
            display: {
                showFPS: false,
                showStats: true,
                showMinimap: true,
                uiScale: 1.0
            }
        };

        // Load saved settings or use defaults
        this.settings = this.loadSettings();
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('planetEden_settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge with defaults to handle new settings
                return this.deepMerge(this.defaults, parsed);
            }
        } catch (e) {
            console.warn('[Settings] Failed to load settings:', e);
        }
        return JSON.parse(JSON.stringify(this.defaults));
    }

    saveSettings() {
        try {
            localStorage.setItem('planetEden_settings', JSON.stringify(this.settings));
            console.log('[Settings] Saved');
        } catch (e) {
            console.warn('[Settings] Failed to save settings:', e);
        }
    }

    deepMerge(target, source) {
        const output = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                output[key] = this.deepMerge(target[key] || {}, source[key]);
            } else {
                output[key] = source[key];
            }
        }
        return output;
    }

    init() {
        this.createModal();
        this.setupKeyboard();
        console.log('[Settings] Initialized');
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'settings-modal';
        this.modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 3000;
            display: none;
            justify-content: center;
            align-items: center;
            font-family: 'Segoe UI', sans-serif;
        `;

        this.updateModalContent();

        this.modal.onclick = (e) => {
            if (e.target === this.modal) this.hide();
        };

        document.body.appendChild(this.modal);
    }

    updateModalContent() {
        const s = this.settings;

        this.modal.innerHTML = `
            <div style="
                background: rgba(20, 30, 20, 0.98);
                border: 2px solid #4a0;
                border-radius: 12px;
                padding: 30px;
                width: 500px;
                max-width: 90vw;
                max-height: 85vh;
                overflow-y: auto;
                color: #fff;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                    <h2 style="color: #8f8; margin: 0; font-size: 24px;">Settings</h2>
                    <button id="settings-close" style="
                        background: transparent;
                        border: 1px solid #666;
                        color: #888;
                        font-size: 24px;
                        cursor: pointer;
                        padding: 5px 12px;
                        border-radius: 4px;
                    ">&times;</button>
                </div>

                <!-- Graphics Section -->
                <div class="settings-section" style="margin-bottom: 25px;">
                    <h3 style="color: #4a0; margin: 0 0 15px 0; font-size: 14px; letter-spacing: 1px;">
                        GRAPHICS
                    </h3>

                    <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <label style="color: #aaa; font-size: 13px;">Quality Preset</label>
                        <select id="setting-quality" style="
                            background: #1a2a1a;
                            border: 1px solid #4a0;
                            color: #8f8;
                            padding: 6px 12px;
                            border-radius: 4px;
                            cursor: pointer;
                        ">
                            <option value="low" ${s.graphics.quality === 'low' ? 'selected' : ''}>Low</option>
                            <option value="medium" ${s.graphics.quality === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="high" ${s.graphics.quality === 'high' ? 'selected' : ''}>High</option>
                        </select>
                    </div>

                    <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <label style="color: #aaa; font-size: 13px;">Shadows</label>
                        <label style="position: relative; width: 50px; height: 26px;">
                            <input type="checkbox" id="setting-shadows" ${s.graphics.shadows ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                            <span class="toggle-slider" style="
                                position: absolute;
                                cursor: pointer;
                                top: 0;
                                left: 0;
                                right: 0;
                                bottom: 0;
                                background: ${s.graphics.shadows ? '#4a0' : '#333'};
                                transition: 0.3s;
                                border-radius: 26px;
                            "><span style="
                                position: absolute;
                                content: '';
                                height: 20px;
                                width: 20px;
                                left: ${s.graphics.shadows ? '26px' : '3px'};
                                bottom: 3px;
                                background: white;
                                transition: 0.3s;
                                border-radius: 50%;
                            "></span></span>
                        </label>
                    </div>

                    <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <label style="color: #aaa; font-size: 13px;">Particles</label>
                        <label style="position: relative; width: 50px; height: 26px;">
                            <input type="checkbox" id="setting-particles" ${s.graphics.particles ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                            <span class="toggle-slider" style="
                                position: absolute;
                                cursor: pointer;
                                top: 0;
                                left: 0;
                                right: 0;
                                bottom: 0;
                                background: ${s.graphics.particles ? '#4a0' : '#333'};
                                transition: 0.3s;
                                border-radius: 26px;
                            "><span style="
                                position: absolute;
                                content: '';
                                height: 20px;
                                width: 20px;
                                left: ${s.graphics.particles ? '26px' : '3px'};
                                bottom: 3px;
                                background: white;
                                transition: 0.3s;
                                border-radius: 50%;
                            "></span></span>
                        </label>
                    </div>
                </div>

                <!-- Audio Section -->
                <div class="settings-section" style="margin-bottom: 25px;">
                    <h3 style="color: #4a0; margin: 0 0 15px 0; font-size: 14px; letter-spacing: 1px;">
                        AUDIO
                    </h3>

                    <div class="setting-row" style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <label style="color: #aaa; font-size: 13px;">Master Volume</label>
                            <span style="color: #8f8; font-size: 13px;">${Math.round(s.audio.master * 100)}%</span>
                        </div>
                        <input type="range" id="setting-master" min="0" max="100" value="${s.audio.master * 100}" style="
                            width: 100%;
                            height: 6px;
                            -webkit-appearance: none;
                            background: linear-gradient(to right, #4a0 ${s.audio.master * 100}%, #333 ${s.audio.master * 100}%);
                            border-radius: 3px;
                            cursor: pointer;
                        ">
                    </div>

                    <div class="setting-row" style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <label style="color: #aaa; font-size: 13px;">Sound Effects</label>
                            <span style="color: #8f8; font-size: 13px;">${Math.round(s.audio.sfx * 100)}%</span>
                        </div>
                        <input type="range" id="setting-sfx" min="0" max="100" value="${s.audio.sfx * 100}" style="
                            width: 100%;
                            height: 6px;
                            -webkit-appearance: none;
                            background: linear-gradient(to right, #4a0 ${s.audio.sfx * 100}%, #333 ${s.audio.sfx * 100}%);
                            border-radius: 3px;
                            cursor: pointer;
                        ">
                    </div>

                    <div class="setting-row" style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <label style="color: #aaa; font-size: 13px;">Ambient Sounds</label>
                            <span style="color: #8f8; font-size: 13px;">${Math.round(s.audio.ambient * 100)}%</span>
                        </div>
                        <input type="range" id="setting-ambient" min="0" max="100" value="${s.audio.ambient * 100}" style="
                            width: 100%;
                            height: 6px;
                            -webkit-appearance: none;
                            background: linear-gradient(to right, #4a0 ${s.audio.ambient * 100}%, #333 ${s.audio.ambient * 100}%);
                            border-radius: 3px;
                            cursor: pointer;
                        ">
                    </div>
                </div>

                <!-- Gameplay Section -->
                <div class="settings-section" style="margin-bottom: 25px;">
                    <h3 style="color: #4a0; margin: 0 0 15px 0; font-size: 14px; letter-spacing: 1px;">
                        GAMEPLAY
                    </h3>

                    <div class="setting-row" style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <label style="color: #aaa; font-size: 13px;">Simulation Speed</label>
                            <span style="color: #8f8; font-size: 13px;">${s.gameplay.timeScale.toFixed(1)}x</span>
                        </div>
                        <input type="range" id="setting-timescale" min="0.1" max="3" step="0.1" value="${s.gameplay.timeScale}" style="
                            width: 100%;
                            height: 6px;
                            -webkit-appearance: none;
                            background: linear-gradient(to right, #4a0 ${((s.gameplay.timeScale - 0.1) / 2.9) * 100}%, #333 ${((s.gameplay.timeScale - 0.1) / 2.9) * 100}%);
                            border-radius: 3px;
                            cursor: pointer;
                        ">
                    </div>

                    <div class="setting-row" style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <label style="color: #aaa; font-size: 13px;">Camera Speed</label>
                            <span style="color: #8f8; font-size: 13px;">${s.gameplay.cameraSpeed.toFixed(1)}x</span>
                        </div>
                        <input type="range" id="setting-cameraspeed" min="0.5" max="2" step="0.1" value="${s.gameplay.cameraSpeed}" style="
                            width: 100%;
                            height: 6px;
                            -webkit-appearance: none;
                            background: linear-gradient(to right, #4a0 ${((s.gameplay.cameraSpeed - 0.5) / 1.5) * 100}%, #333 ${((s.gameplay.cameraSpeed - 0.5) / 1.5) * 100}%);
                            border-radius: 3px;
                            cursor: pointer;
                        ">
                    </div>

                    <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <label style="color: #aaa; font-size: 13px;">Show Tips</label>
                        <label style="position: relative; width: 50px; height: 26px;">
                            <input type="checkbox" id="setting-tips" ${s.gameplay.showTips ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                            <span class="toggle-slider" style="
                                position: absolute;
                                cursor: pointer;
                                top: 0;
                                left: 0;
                                right: 0;
                                bottom: 0;
                                background: ${s.gameplay.showTips ? '#4a0' : '#333'};
                                transition: 0.3s;
                                border-radius: 26px;
                            "><span style="
                                position: absolute;
                                content: '';
                                height: 20px;
                                width: 20px;
                                left: ${s.gameplay.showTips ? '26px' : '3px'};
                                bottom: 3px;
                                background: white;
                                transition: 0.3s;
                                border-radius: 50%;
                            "></span></span>
                        </label>
                    </div>
                </div>

                <!-- Display Section -->
                <div class="settings-section" style="margin-bottom: 25px;">
                    <h3 style="color: #4a0; margin: 0 0 15px 0; font-size: 14px; letter-spacing: 1px;">
                        DISPLAY
                    </h3>

                    <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <label style="color: #aaa; font-size: 13px;">Show FPS Counter</label>
                        <label style="position: relative; width: 50px; height: 26px;">
                            <input type="checkbox" id="setting-fps" ${s.display.showFPS ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                            <span class="toggle-slider" style="
                                position: absolute;
                                cursor: pointer;
                                top: 0;
                                left: 0;
                                right: 0;
                                bottom: 0;
                                background: ${s.display.showFPS ? '#4a0' : '#333'};
                                transition: 0.3s;
                                border-radius: 26px;
                            "><span style="
                                position: absolute;
                                content: '';
                                height: 20px;
                                width: 20px;
                                left: ${s.display.showFPS ? '26px' : '3px'};
                                bottom: 3px;
                                background: white;
                                transition: 0.3s;
                                border-radius: 50%;
                            "></span></span>
                        </label>
                    </div>

                    <div class="setting-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <label style="color: #aaa; font-size: 13px;">Show Statistics</label>
                        <label style="position: relative; width: 50px; height: 26px;">
                            <input type="checkbox" id="setting-stats" ${s.display.showStats ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                            <span class="toggle-slider" style="
                                position: absolute;
                                cursor: pointer;
                                top: 0;
                                left: 0;
                                right: 0;
                                bottom: 0;
                                background: ${s.display.showStats ? '#4a0' : '#333'};
                                transition: 0.3s;
                                border-radius: 26px;
                            "><span style="
                                position: absolute;
                                content: '';
                                height: 20px;
                                width: 20px;
                                left: ${s.display.showStats ? '26px' : '3px'};
                                bottom: 3px;
                                background: white;
                                transition: 0.3s;
                                border-radius: 50%;
                            "></span></span>
                        </label>
                    </div>
                </div>

                <!-- Buttons -->
                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; padding-top: 20px; border-top: 1px solid #333;">
                    <button id="settings-reset" style="
                        background: transparent;
                        border: 1px solid #a44;
                        color: #a44;
                        padding: 10px 20px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                    ">Reset to Defaults</button>
                    <button id="settings-apply" style="
                        background: #4a0;
                        border: none;
                        color: #fff;
                        padding: 10px 25px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                    ">Apply</button>
                </div>
            </div>
        `;

        // Setup event listeners
        setTimeout(() => this.setupEventListeners(), 0);
    }

    setupEventListeners() {
        // Close button
        const closeBtn = document.getElementById('settings-close');
        if (closeBtn) closeBtn.onclick = () => this.hide();

        // Apply button
        const applyBtn = document.getElementById('settings-apply');
        if (applyBtn) applyBtn.onclick = () => this.applySettings();

        // Reset button
        const resetBtn = document.getElementById('settings-reset');
        if (resetBtn) resetBtn.onclick = () => this.resetToDefaults();

        // Quality preset
        const quality = document.getElementById('setting-quality');
        if (quality) quality.onchange = (e) => {
            this.settings.graphics.quality = e.target.value;
            this.applyQualityPreset(e.target.value);
        };

        // Checkboxes (toggles)
        this.setupToggle('setting-shadows', 'graphics', 'shadows');
        this.setupToggle('setting-particles', 'graphics', 'particles');
        this.setupToggle('setting-tips', 'gameplay', 'showTips');
        this.setupToggle('setting-fps', 'display', 'showFPS');
        this.setupToggle('setting-stats', 'display', 'showStats');

        // Sliders
        this.setupSlider('setting-master', 'audio', 'master', 100);
        this.setupSlider('setting-sfx', 'audio', 'sfx', 100);
        this.setupSlider('setting-ambient', 'audio', 'ambient', 100);
        this.setupSlider('setting-timescale', 'gameplay', 'timeScale', 1);
        this.setupSlider('setting-cameraspeed', 'gameplay', 'cameraSpeed', 1);
    }

    setupToggle(elementId, category, setting) {
        const element = document.getElementById(elementId);
        if (element) {
            element.onchange = (e) => {
                this.settings[category][setting] = e.target.checked;
                this.updateModalContent();
            };
        }
    }

    setupSlider(elementId, category, setting, divisor) {
        const element = document.getElementById(elementId);
        if (element) {
            element.oninput = (e) => {
                this.settings[category][setting] = parseFloat(e.target.value) / divisor;
                this.updateModalContent();
            };
        }
    }

    applyQualityPreset(quality) {
        switch (quality) {
            case 'low':
                this.settings.graphics.shadows = false;
                this.settings.graphics.particles = false;
                this.settings.graphics.antialiasing = false;
                break;
            case 'medium':
                this.settings.graphics.shadows = true;
                this.settings.graphics.particles = true;
                this.settings.graphics.antialiasing = false;
                break;
            case 'high':
                this.settings.graphics.shadows = true;
                this.settings.graphics.particles = true;
                this.settings.graphics.antialiasing = true;
                break;
        }
        this.updateModalContent();
    }

    applySettings() {
        this.saveSettings();

        // Notify application of changes
        if (this.onSettingsChange) {
            this.onSettingsChange(this.settings);
        }

        // Show confirmation
        console.log('[Settings] Applied:', this.settings);
        this.hide();
    }

    resetToDefaults() {
        this.settings = JSON.parse(JSON.stringify(this.defaults));
        this.updateModalContent();
        console.log('[Settings] Reset to defaults');
    }

    setupKeyboard() {
        window.addEventListener('keydown', (e) => {
            // ESC key to open settings, or close if visible
            if (e.key === 'Escape' && this.visible) {
                this.hide();
            }
            // S key (when not typing) to open settings
            if (e.key === 's' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') {
                // Don't open settings with 's' - conflicts with other controls
                // Use the UI button or ESC instead
            }
        });
    }

    toggle() {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }

    show() {
        this.updateModalContent();
        this.modal.style.display = 'flex';
        this.visible = true;
    }

    hide() {
        this.modal.style.display = 'none';
        this.visible = false;
    }

    get(category, setting) {
        return this.settings[category]?.[setting];
    }

    set(category, setting, value) {
        if (this.settings[category]) {
            this.settings[category][setting] = value;
            this.saveSettings();
        }
    }
}

// Singleton
export const settingsSystem = new SettingsSystem();
