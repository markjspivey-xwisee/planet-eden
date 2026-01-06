// Unified HUD System for Planet Eden
// Clean, minimal game UI with modern aesthetic

export class HUD {
    constructor() {
        this.activeTab = 'stats';
        this.sidebarVisible = false;
        this.wasmModule = null;
        this.renderer = null;
        this.audioSystem = null;
    }

    init(wasmModule, renderer, audioSystem) {
        this.wasmModule = wasmModule;
        this.renderer = renderer;
        this.audioSystem = audioSystem;

        this.injectStyles();
        this.createHUD();
        this.setupEventListeners();

        console.log('[HUD] Initialized');
    }

    injectStyles() {
        const style = document.createElement('style');
        style.id = 'hud-styles';
        style.textContent = `
            /* ===== HUD Variables ===== */
            :root {
                --hud-bg: rgba(12, 14, 18, 0.92);
                --hud-bg-light: rgba(20, 24, 30, 0.95);
                --hud-border: rgba(80, 100, 120, 0.25);
                --hud-border-light: rgba(100, 130, 160, 0.4);
                --hud-text: #c8d0dc;
                --hud-text-dim: #6a7585;
                --hud-text-bright: #ffffff;
                --hud-accent: #4a9eff;
                --hud-accent-dim: rgba(74, 158, 255, 0.15);
                --hud-success: #3ddc84;
                --hud-warning: #ffb74d;
                --hud-danger: #ff6b6b;
                --hud-radius: 8px;
                --hud-radius-sm: 4px;
                --hud-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
                --hud-transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }

            /* ===== Top Status Bar ===== */
            .hud-topbar {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: 48px;
                background: var(--hud-bg);
                border-bottom: 1px solid var(--hud-border);
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 16px;
                z-index: 1000;
                backdrop-filter: blur(12px);
            }

            .hud-topbar-left,
            .hud-topbar-center,
            .hud-topbar-right {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .hud-topbar-center {
                position: absolute;
                left: 50%;
                transform: translateX(-50%);
            }

            .hud-stat-chip {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                background: var(--hud-accent-dim);
                border: 1px solid var(--hud-border);
                border-radius: 20px;
                font-size: 12px;
                color: var(--hud-text);
                font-weight: 500;
            }

            .hud-stat-chip .value {
                color: var(--hud-text-bright);
                font-weight: 600;
            }

            .hud-stat-chip.fps { border-color: var(--hud-success); }
            .hud-stat-chip.fps .value { color: var(--hud-success); }
            .hud-stat-chip.fps.warning .value { color: var(--hud-warning); }
            .hud-stat-chip.fps.danger .value { color: var(--hud-danger); }

            .hud-time-display {
                font-size: 13px;
                color: var(--hud-text);
                font-weight: 500;
            }

            .hud-time-display .day {
                color: var(--hud-accent);
            }

            .hud-weather-icon {
                font-size: 18px;
                filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.3));
            }

            /* ===== Icon Buttons ===== */
            .hud-icon-btn {
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: transparent;
                border: 1px solid transparent;
                border-radius: var(--hud-radius);
                color: var(--hud-text-dim);
                font-size: 18px;
                cursor: pointer;
                transition: var(--hud-transition);
            }

            .hud-icon-btn:hover {
                background: var(--hud-accent-dim);
                border-color: var(--hud-border);
                color: var(--hud-text-bright);
            }

            .hud-icon-btn.active {
                background: var(--hud-accent-dim);
                border-color: var(--hud-accent);
                color: var(--hud-accent);
            }

            /* ===== Side Panel ===== */
            .hud-sidebar {
                position: fixed;
                top: 60px;
                right: 12px;
                width: 320px;
                max-height: calc(100vh - 140px);
                background: var(--hud-bg);
                border: 1px solid var(--hud-border);
                border-radius: var(--hud-radius);
                box-shadow: var(--hud-shadow);
                backdrop-filter: blur(12px);
                z-index: 999;
                opacity: 0;
                transform: translateX(20px);
                pointer-events: none;
                transition: var(--hud-transition);
                display: flex;
                flex-direction: column;
            }

            .hud-sidebar.visible {
                opacity: 1;
                transform: translateX(0);
                pointer-events: auto;
            }

            .hud-sidebar-tabs {
                display: flex;
                border-bottom: 1px solid var(--hud-border);
                padding: 8px 8px 0 8px;
                gap: 4px;
            }

            .hud-tab-btn {
                flex: 1;
                padding: 10px 12px;
                background: transparent;
                border: none;
                border-bottom: 2px solid transparent;
                color: var(--hud-text-dim);
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: var(--hud-transition);
                border-radius: var(--hud-radius-sm) var(--hud-radius-sm) 0 0;
            }

            .hud-tab-btn:hover {
                background: var(--hud-accent-dim);
                color: var(--hud-text);
            }

            .hud-tab-btn.active {
                color: var(--hud-accent);
                border-bottom-color: var(--hud-accent);
                background: var(--hud-accent-dim);
            }

            .hud-sidebar-content {
                flex: 1;
                overflow-y: auto;
                padding: 12px;
            }

            .hud-tab-content {
                display: none;
            }

            .hud-tab-content.active {
                display: block;
            }

            /* ===== Stats Tab ===== */
            .hud-stat-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 8px;
            }

            .hud-stat-card {
                background: var(--hud-bg-light);
                border: 1px solid var(--hud-border);
                border-radius: var(--hud-radius-sm);
                padding: 12px;
            }

            .hud-stat-card .label {
                font-size: 10px;
                color: var(--hud-text-dim);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
            }

            .hud-stat-card .value {
                font-size: 20px;
                font-weight: 600;
                color: var(--hud-text-bright);
            }

            .hud-stat-card .sub {
                font-size: 11px;
                color: var(--hud-text-dim);
                margin-top: 2px;
            }

            .hud-stat-card.wide {
                grid-column: span 2;
            }

            /* ===== Tribes Tab ===== */
            .hud-tribe-card {
                background: var(--hud-bg-light);
                border: 1px solid var(--hud-border);
                border-radius: var(--hud-radius-sm);
                padding: 12px;
                margin-bottom: 8px;
                border-left: 3px solid;
            }

            .hud-tribe-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .hud-tribe-name {
                font-size: 13px;
                font-weight: 600;
            }

            .hud-tribe-members {
                font-size: 11px;
                color: var(--hud-text-dim);
            }

            .hud-tribe-resources {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 4px;
            }

            .hud-tribe-resource {
                text-align: center;
                font-size: 10px;
            }

            .hud-tribe-resource .icon {
                font-size: 14px;
                margin-bottom: 2px;
            }

            .hud-tribe-resource .amt {
                color: var(--hud-text);
                font-weight: 500;
            }

            /* ===== Powers Tab ===== */
            .hud-power-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 8px;
            }

            .hud-power-btn {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 16px 8px;
                background: var(--hud-bg-light);
                border: 1px solid var(--hud-border);
                border-radius: var(--hud-radius);
                color: var(--hud-text);
                cursor: pointer;
                transition: var(--hud-transition);
            }

            .hud-power-btn:hover {
                background: var(--hud-accent-dim);
                border-color: var(--hud-accent);
                transform: translateY(-2px);
            }

            .hud-power-btn:active {
                transform: translateY(0);
            }

            .hud-power-btn .icon {
                font-size: 24px;
                margin-bottom: 6px;
            }

            .hud-power-btn .name {
                font-size: 11px;
                font-weight: 500;
                text-align: center;
            }

            .hud-power-btn .key {
                font-size: 9px;
                color: var(--hud-text-dim);
                margin-top: 4px;
            }

            /* ===== Bottom Quick Bar ===== */
            .hud-quickbar {
                position: fixed;
                bottom: 16px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 12px;
                background: var(--hud-bg);
                border: 1px solid var(--hud-border);
                border-radius: 28px;
                backdrop-filter: blur(12px);
                box-shadow: var(--hud-shadow);
                z-index: 1000;
            }

            .hud-quickbar-btn {
                width: 44px;
                height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--hud-bg-light);
                border: 1px solid var(--hud-border);
                border-radius: 50%;
                color: var(--hud-text);
                font-size: 20px;
                cursor: pointer;
                transition: var(--hud-transition);
            }

            .hud-quickbar-btn:hover {
                background: var(--hud-accent-dim);
                border-color: var(--hud-accent);
                color: var(--hud-text-bright);
                transform: scale(1.1);
            }

            .hud-quickbar-btn.pause {
                width: 52px;
                height: 52px;
                font-size: 24px;
                background: var(--hud-accent-dim);
                border-color: var(--hud-accent);
            }

            .hud-quickbar-btn.pause.paused {
                background: rgba(255, 107, 107, 0.2);
                border-color: var(--hud-danger);
            }

            .hud-quickbar-divider {
                width: 1px;
                height: 32px;
                background: var(--hud-border);
                margin: 0 4px;
            }

            /* Speed slider in quickbar */
            .hud-speed-control {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 0 8px;
            }

            .hud-speed-slider {
                width: 80px;
                height: 4px;
                -webkit-appearance: none;
                background: var(--hud-border);
                border-radius: 2px;
                outline: none;
            }

            .hud-speed-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 14px;
                height: 14px;
                background: var(--hud-accent);
                border-radius: 50%;
                cursor: pointer;
                transition: var(--hud-transition);
            }

            .hud-speed-slider::-webkit-slider-thumb:hover {
                transform: scale(1.2);
            }

            .hud-speed-value {
                font-size: 11px;
                color: var(--hud-text);
                font-weight: 500;
                min-width: 32px;
                text-align: center;
            }

            /* ===== Keyboard Hint ===== */
            .hud-hint {
                position: fixed;
                bottom: 90px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 11px;
                color: var(--hud-text-dim);
                z-index: 998;
                pointer-events: none;
            }

            .hud-hint kbd {
                display: inline-block;
                padding: 2px 6px;
                background: var(--hud-bg);
                border: 1px solid var(--hud-border);
                border-radius: 3px;
                font-family: inherit;
                font-size: 10px;
                margin: 0 2px;
            }

            /* ===== Scrollbar ===== */
            .hud-sidebar-content::-webkit-scrollbar {
                width: 6px;
            }

            .hud-sidebar-content::-webkit-scrollbar-track {
                background: transparent;
            }

            .hud-sidebar-content::-webkit-scrollbar-thumb {
                background: var(--hud-border);
                border-radius: 3px;
            }

            .hud-sidebar-content::-webkit-scrollbar-thumb:hover {
                background: var(--hud-border-light);
            }

            /* ===== Empty State ===== */
            .hud-empty {
                text-align: center;
                padding: 24px;
                color: var(--hud-text-dim);
            }

            .hud-empty .icon {
                font-size: 32px;
                margin-bottom: 8px;
                opacity: 0.5;
            }

            /* ===== Mobile Responsive ===== */
            @media (max-width: 768px) {
                .hud-topbar {
                    height: 44px;
                    padding: 0 12px;
                }

                .hud-topbar-center {
                    display: none;
                }

                .hud-stat-chip {
                    padding: 4px 8px;
                    font-size: 11px;
                }

                .hud-sidebar {
                    top: 56px;
                    right: 8px;
                    left: 8px;
                    width: auto;
                    max-height: 50vh;
                }

                .hud-quickbar {
                    padding: 6px 10px;
                    gap: 6px;
                }

                .hud-quickbar-btn {
                    width: 40px;
                    height: 40px;
                    font-size: 18px;
                }

                .hud-quickbar-btn.pause {
                    width: 48px;
                    height: 48px;
                }

                .hud-speed-control {
                    display: none;
                }

                .hud-hint {
                    display: none;
                }
            }

            /* ===== Hide old UI elements ===== */
            #loading,
            #fps-counter,
            #time-display,
            #weather-display,
            #keyboard-hints,
            #tribe-panel,
            #stats-panel,
            #god-powers-panel,
            #controls-panel,
            #chart-panel,
            #save-load-buttons,
            #audio-toggle,
            #screenshot-btn,
            #sparkline-container,
            #achievement-toast,
            .mobile-panel-toggle,
            .mobile-panel-hide,
            .title {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
    }

    createHUD() {
        // Create container
        const container = document.createElement('div');
        container.id = 'hud-container';
        container.innerHTML = this.getHUDHTML();
        document.body.appendChild(container);

        // Cache elements
        this.elements = {
            fps: document.getElementById('hud-fps'),
            population: document.getElementById('hud-population'),
            time: document.getElementById('hud-time'),
            weather: document.getElementById('hud-weather'),
            sidebar: document.getElementById('hud-sidebar'),
            sidebarToggle: document.getElementById('hud-sidebar-toggle'),
            pauseBtn: document.getElementById('hud-pause-btn'),
            speedSlider: document.getElementById('hud-speed-slider'),
            speedValue: document.getElementById('hud-speed-value'),
            statsContent: document.getElementById('hud-stats-content'),
            tribesContent: document.getElementById('hud-tribes-content'),
            powersContent: document.getElementById('hud-powers-content')
        };
    }

    getHUDHTML() {
        return `
            <!-- Top Bar -->
            <div class="hud-topbar">
                <div class="hud-topbar-left">
                    <div class="hud-stat-chip fps" id="hud-fps-chip">
                        <span class="value" id="hud-fps">60</span>
                        <span>FPS</span>
                    </div>
                    <div class="hud-stat-chip">
                        <span>Pop</span>
                        <span class="value" id="hud-population">0</span>
                    </div>
                </div>

                <div class="hud-topbar-center">
                    <span class="hud-weather-icon" id="hud-weather">☀️</span>
                    <span class="hud-time-display">
                        <span class="day" id="hud-day">Day 1</span>
                        <span id="hud-time">12:00</span>
                    </span>
                </div>

                <div class="hud-topbar-right">
                    <button class="hud-icon-btn" id="hud-audio-toggle" title="Toggle Audio">
                        🔊
                    </button>
                    <button class="hud-icon-btn" id="hud-screenshot-btn" title="Screenshot">
                        📷
                    </button>
                    <button class="hud-icon-btn" id="hud-settings-btn" title="Settings">
                        ⚙️
                    </button>
                    <button class="hud-icon-btn" id="hud-sidebar-toggle" title="Toggle Panel">
                        📊
                    </button>
                </div>
            </div>

            <!-- Side Panel -->
            <div class="hud-sidebar" id="hud-sidebar">
                <div class="hud-sidebar-tabs">
                    <button class="hud-tab-btn active" data-tab="stats">Stats</button>
                    <button class="hud-tab-btn" data-tab="tribes">Tribes</button>
                    <button class="hud-tab-btn" data-tab="powers">Powers</button>
                </div>
                <div class="hud-sidebar-content">
                    <!-- Stats Tab -->
                    <div class="hud-tab-content active" id="hud-stats-content">
                        <div class="hud-stat-grid" id="hud-stat-grid"></div>
                    </div>

                    <!-- Tribes Tab -->
                    <div class="hud-tab-content" id="hud-tribes-content">
                        <div id="hud-tribe-list"></div>
                    </div>

                    <!-- Powers Tab -->
                    <div class="hud-tab-content" id="hud-powers-content">
                        <div class="hud-power-grid">
                            <button class="hud-power-btn" data-power="spawn-tribe">
                                <span class="icon">👥</span>
                                <span class="name">New Tribe</span>
                                <span class="key">F1</span>
                            </button>
                            <button class="hud-power-btn" data-power="mass-spawn">
                                <span class="icon">🌱</span>
                                <span class="name">Mass Spawn</span>
                                <span class="key">F2</span>
                            </button>
                            <button class="hud-power-btn" data-power="gift">
                                <span class="icon">💎</span>
                                <span class="name">Gift Resources</span>
                                <span class="key">F3</span>
                            </button>
                            <button class="hud-power-btn" data-power="lightning">
                                <span class="icon">⚡</span>
                                <span class="name">Lightning</span>
                                <span class="key">F4</span>
                            </button>
                            <button class="hud-power-btn" data-power="plague">
                                <span class="icon">☠️</span>
                                <span class="name">Plague</span>
                                <span class="key">F5</span>
                            </button>
                            <button class="hud-power-btn" data-power="blessing">
                                <span class="icon">✨</span>
                                <span class="name">Blessing</span>
                                <span class="key">F6</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Quick Bar -->
            <div class="hud-quickbar">
                <button class="hud-quickbar-btn" id="hud-spawn-plant" title="Spawn Plant">🌱</button>
                <button class="hud-quickbar-btn" id="hud-spawn-herbivore" title="Spawn Herbivore">🦌</button>
                <button class="hud-quickbar-btn" id="hud-spawn-carnivore" title="Spawn Carnivore">🦁</button>
                <button class="hud-quickbar-btn" id="hud-spawn-humanoid" title="Spawn Humanoid">👤</button>

                <div class="hud-quickbar-divider"></div>

                <button class="hud-quickbar-btn pause" id="hud-pause-btn" title="Pause (Space)">▶️</button>

                <div class="hud-quickbar-divider"></div>

                <div class="hud-speed-control">
                    <input type="range" class="hud-speed-slider" id="hud-speed-slider"
                           min="0.1" max="5" step="0.1" value="1">
                    <span class="hud-speed-value" id="hud-speed-value">1.0x</span>
                </div>
            </div>

            <!-- Keyboard Hint -->
            <div class="hud-hint">
                <kbd>Space</kbd> pause
                <kbd>?</kbd> help
                <kbd>Tab</kbd> panel
            </div>
        `;
    }

    setupEventListeners() {
        // Sidebar toggle
        document.getElementById('hud-sidebar-toggle').addEventListener('click', () => {
            this.toggleSidebar();
        });

        // Tab switching
        document.querySelectorAll('.hud-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Speed slider
        const speedSlider = document.getElementById('hud-speed-slider');
        const speedValue = document.getElementById('hud-speed-value');
        speedSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            speedValue.textContent = `${value.toFixed(1)}x`;
            if (window.planetEden) {
                window.planetEden.timeScale = value;
            }
        });

        // Pause button
        document.getElementById('hud-pause-btn').addEventListener('click', () => {
            if (window.planetEden) {
                window.planetEden.togglePause();
                this.updatePauseButton();
            }
        });

        // Spawn buttons
        ['plant', 'herbivore', 'carnivore', 'humanoid'].forEach((type, index) => {
            document.getElementById(`hud-spawn-${type}`).addEventListener('click', () => {
                if (window.planetEden && window.planetEden.ui) {
                    window.planetEden.ui.spawnRandom(index);
                }
            });
        });

        // Power buttons
        document.querySelectorAll('.hud-power-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const power = btn.dataset.power;
                this.activatePower(power);
            });
        });

        // Settings button
        document.getElementById('hud-settings-btn').addEventListener('click', () => {
            if (window.planetEden && window.planetEden.settingsSystem) {
                window.planetEden.settingsSystem.show();
            }
        });

        // Audio toggle
        document.getElementById('hud-audio-toggle').addEventListener('click', () => {
            if (this.audioSystem) {
                this.audioSystem.toggle();
                this.updateAudioButton();
            }
        });

        // Screenshot button
        document.getElementById('hud-screenshot-btn').addEventListener('click', () => {
            if (window.planetEden && window.planetEden.screenshotSystem) {
                window.planetEden.screenshotSystem.capture();
            }
        });

        // Keyboard shortcut for sidebar
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' && !e.ctrlKey && !e.altKey) {
                e.preventDefault();
                this.toggleSidebar();
            }
        });
    }

    toggleSidebar() {
        this.sidebarVisible = !this.sidebarVisible;
        document.getElementById('hud-sidebar').classList.toggle('visible', this.sidebarVisible);
        document.getElementById('hud-sidebar-toggle').classList.toggle('active', this.sidebarVisible);

        if (this.audioSystem) {
            if (this.sidebarVisible) {
                this.audioSystem.playPanelOpen();
            } else {
                this.audioSystem.playPanelClose();
            }
        }
    }

    switchTab(tabName) {
        this.activeTab = tabName;

        // Update tab buttons
        document.querySelectorAll('.hud-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.hud-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `hud-${tabName}-content`);
        });

        if (this.audioSystem) {
            this.audioSystem.playClick();
        }
    }

    activatePower(power) {
        if (!window.planetEden || !window.planetEden.ui) return;

        const ui = window.planetEden.ui;
        switch (power) {
            case 'spawn-tribe': ui.godPowerSpawnTribe(); break;
            case 'mass-spawn': ui.godPowerMassSpawn(); break;
            case 'gift': ui.godPowerGiftResources(); break;
            case 'lightning': ui.godPowerLightning(); break;
            case 'plague': ui.godPowerPlague(); break;
            case 'blessing': ui.godPowerBlessing(); break;
        }

        if (this.audioSystem) {
            this.audioSystem.playClick();
        }
    }

    updatePauseButton() {
        const btn = document.getElementById('hud-pause-btn');
        const isPaused = window.planetEden && !window.planetEden.running;
        btn.textContent = isPaused ? '▶️' : '⏸️';
        btn.classList.toggle('paused', isPaused);
    }

    updateAudioButton() {
        const btn = document.getElementById('hud-audio-toggle');
        const enabled = this.audioSystem && this.audioSystem.enabled;
        btn.textContent = enabled ? '🔊' : '🔇';
    }

    // Update methods called from main loop
    updateFPS(fps) {
        const fpsChip = document.getElementById('hud-fps-chip');
        const fpsValue = document.getElementById('hud-fps');

        fpsValue.textContent = fps;

        fpsChip.classList.remove('warning', 'danger');
        if (fps < 30) {
            fpsChip.classList.add('danger');
        } else if (fps < 55) {
            fpsChip.classList.add('warning');
        }
    }

    updatePopulation(count) {
        document.getElementById('hud-population').textContent = count;
    }

    updateTime(day, time) {
        document.getElementById('hud-day').textContent = `Day ${day}`;
        document.getElementById('hud-time').textContent = time;
    }

    updateWeather(weather) {
        const icons = {
            clear: '☀️',
            cloudy: '⛅',
            rain: '🌧️',
            storm: '⛈️'
        };
        document.getElementById('hud-weather').textContent = icons[weather] || '☀️';
    }

    updateStats(stats, typeCounts) {
        const grid = document.getElementById('hud-stat-grid');
        grid.innerHTML = `
            <div class="hud-stat-card">
                <div class="label">Organisms</div>
                <div class="value">${stats.aliveCount}</div>
                <div class="sub">of ${stats.organismCount} max</div>
            </div>
            <div class="hud-stat-card">
                <div class="label">Tribes</div>
                <div class="value">${stats.tribeCount}</div>
            </div>
            <div class="hud-stat-card">
                <div class="label">Buildings</div>
                <div class="value">${stats.buildingCount}</div>
            </div>
            <div class="hud-stat-card">
                <div class="label">Time</div>
                <div class="value">${stats.time.toFixed(0)}s</div>
            </div>
            <div class="hud-stat-card wide">
                <div class="label">Population Breakdown</div>
                <div class="sub" style="margin-top: 8px;">
                    🌿 ${typeCounts.plants} &nbsp;&nbsp;
                    🦌 ${typeCounts.herbivores} &nbsp;&nbsp;
                    🦁 ${typeCounts.carnivores} &nbsp;&nbsp;
                    👤 ${typeCounts.humanoids}
                </div>
            </div>
        `;
    }

    updateTribes(tribes) {
        const list = document.getElementById('hud-tribe-list');

        if (tribes.length === 0) {
            list.innerHTML = `
                <div class="hud-empty">
                    <div class="icon">🏛️</div>
                    <div>No tribes yet</div>
                    <div style="font-size: 11px; margin-top: 4px;">Press F1 to create one</div>
                </div>
            `;
            return;
        }

        list.innerHTML = tribes.map(tribe => {
            const color = `rgb(${tribe.color.r}, ${tribe.color.g}, ${tribe.color.b})`;
            return `
                <div class="hud-tribe-card" style="border-left-color: ${color};">
                    <div class="hud-tribe-header">
                        <span class="hud-tribe-name" style="color: ${color};">
                            ${this.getTribeName(tribe.id)}
                        </span>
                        <span class="hud-tribe-members">${tribe.memberCount} members</span>
                    </div>
                    <div class="hud-tribe-resources">
                        <div class="hud-tribe-resource">
                            <div class="icon">🍖</div>
                            <div class="amt">${Math.floor(tribe.food)}</div>
                        </div>
                        <div class="hud-tribe-resource">
                            <div class="icon">🪵</div>
                            <div class="amt">${Math.floor(tribe.wood)}</div>
                        </div>
                        <div class="hud-tribe-resource">
                            <div class="icon">🪨</div>
                            <div class="amt">${Math.floor(tribe.stone)}</div>
                        </div>
                        <div class="hud-tribe-resource">
                            <div class="icon">⚙️</div>
                            <div class="amt">${Math.floor(tribe.metal)}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getTribeName(tribeId) {
        const prefixes = ['Sun', 'Moon', 'Star', 'Storm', 'River', 'Mountain', 'Forest', 'Thunder'];
        const suffixes = ['Walkers', 'Seekers', 'Keepers', 'Hunters', 'Builders', 'Warriors', 'Singers', 'Dancers'];
        return `${prefixes[tribeId % prefixes.length]} ${suffixes[Math.floor(tribeId / prefixes.length) % suffixes.length]}`;
    }
}

export const hud = new HUD();
