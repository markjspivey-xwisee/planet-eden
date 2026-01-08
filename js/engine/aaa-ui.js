// AAA-Quality UI Enhancements for Planet Eden
// Premium micro-interactions, tooltips, notifications, mini-map, selection system,
// onboarding, and statistics dashboard

export class AAAUISystem {
    constructor() {
        this.wasmModule = null;
        this.renderer = null;
        this.audioSystem = null;
        this.hud = null;

        // Selection system
        this.selectedEntity = null;
        this.selectedType = null; // 'creature' | 'tribe' | 'building'
        this.selectionRing = null;

        // Notification queue
        this.notifications = [];
        this.maxNotifications = 5;
        this.notificationDuration = 4000;

        // Tooltip state
        this.activeTooltip = null;
        this.tooltipTimeout = null;

        // Mini-map
        this.minimapCanvas = null;
        this.minimapCtx = null;
        this.minimapSize = 180;

        // Statistics
        this.statsHistory = {
            population: [],
            tribes: [],
            births: [],
            deaths: [],
            buildings: []
        };
        this.maxHistoryPoints = 300; // 5 minutes at 1 sample/sec
        this.lastStatsSample = 0;

        // Onboarding
        this.onboardingComplete = false;
        this.onboardingStep = 0;
        this.showKeyboardOverlay = false;

        // Pause menu
        this.pauseMenuVisible = false;

        // Event tracking for notifications
        this.lastTribeCount = 0;
        this.lastBuildingCount = 0;
        this.lastPopulation = 0;

        // Listeners for cleanup
        this._listeners = [];
        this._destroyed = false;
    }

    init(wasmModule, renderer, audioSystem, hud) {
        this.wasmModule = wasmModule;
        this.renderer = renderer;
        this.audioSystem = audioSystem;
        this.hud = hud;

        this.injectStyles();
        this.createNotificationContainer();
        this.createTooltipContainer();
        this.createMinimap();
        this.createSelectionPanel();
        this.createStatsDashboard();
        this.createOnboarding();
        this.createKeyboardOverlay();
        this.createPauseMenu();
        this.setupMicroInteractions();
        this.setupEventListeners();

        // Connect to renderer selection callbacks
        if (this.renderer) {
            this.renderer.onEntitySelected = (entity, type) => {
                this.selectEntity(entity, type);
            };
            this.renderer.onEntityDeselected = () => {
                this.clearSelection();
            };
        }

        // Check if first time user
        this.onboardingComplete = localStorage.getItem('planetEden_onboardingComplete') === 'true';
        if (!this.onboardingComplete) {
            setTimeout(() => this.startOnboarding(), 2000);
        }

        console.log('[AAA-UI] Premium UI system initialized');
    }

    _addListener(target, event, handler, options) {
        target.addEventListener(event, handler, options);
        this._listeners.push({ target, event, handler, options });
    }

    injectStyles() {
        const style = document.createElement('style');
        style.id = 'aaa-ui-styles';
        style.textContent = `
            /* ===== Micro-interaction Variables ===== */
            :root {
                --aaa-ripple-color: rgba(74, 158, 255, 0.4);
                --aaa-hover-glow: 0 0 20px rgba(74, 158, 255, 0.3);
                --aaa-transition-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
                --aaa-transition-smooth: cubic-bezier(0.4, 0, 0.2, 1);
            }

            /* ===== Button Ripple Effect ===== */
            .aaa-ripple {
                position: relative;
                overflow: hidden;
            }

            .aaa-ripple::after {
                content: '';
                position: absolute;
                width: 100%;
                height: 100%;
                top: 0;
                left: 0;
                pointer-events: none;
                background-image: radial-gradient(circle, var(--aaa-ripple-color) 10%, transparent 10%);
                background-repeat: no-repeat;
                background-position: 50%;
                transform: scale(10, 10);
                opacity: 0;
                transition: transform 0.5s, opacity 0.8s;
            }

            .aaa-ripple:active::after {
                transform: scale(0, 0);
                opacity: 0.3;
                transition: 0s;
            }

            /* ===== Enhanced Button Hover ===== */
            .hud-icon-btn,
            .hud-quickbar-btn,
            .hud-power-btn,
            .hud-tab-btn {
                position: relative;
                overflow: hidden;
                transition: all 0.25s var(--aaa-transition-smooth);
            }

            .hud-icon-btn::before,
            .hud-quickbar-btn::before,
            .hud-power-btn::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 0;
                height: 0;
                background: radial-gradient(circle, var(--hud-accent-dim) 0%, transparent 70%);
                transform: translate(-50%, -50%);
                transition: width 0.4s ease, height 0.4s ease;
                pointer-events: none;
            }

            .hud-icon-btn:hover::before,
            .hud-quickbar-btn:hover::before,
            .hud-power-btn:hover::before {
                width: 150%;
                height: 150%;
            }

            .hud-quickbar-btn:hover {
                transform: scale(1.15) translateY(-3px);
                box-shadow: var(--aaa-hover-glow);
            }

            .hud-quickbar-btn:active {
                transform: scale(0.95);
                transition: transform 0.1s;
            }

            .hud-power-btn:hover {
                transform: translateY(-4px);
                box-shadow: var(--aaa-hover-glow), 0 8px 25px rgba(0, 0, 0, 0.3);
            }

            .hud-power-btn:active {
                transform: translateY(-1px);
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            }

            /* ===== Smooth State Transitions ===== */
            .hud-stat-card {
                transition: all 0.3s var(--aaa-transition-smooth);
            }

            .hud-stat-card:hover {
                background: rgba(74, 158, 255, 0.1);
                border-color: var(--hud-accent);
                transform: translateY(-2px);
            }

            .hud-tribe-card {
                transition: all 0.3s var(--aaa-transition-smooth);
            }

            .hud-tribe-card:hover {
                background: rgba(74, 158, 255, 0.08);
                transform: translateX(4px);
                box-shadow: -4px 0 0 var(--hud-accent);
            }

            /* ===== Value Change Animation ===== */
            @keyframes valueUp {
                0% { color: var(--hud-success); transform: scale(1); }
                50% { transform: scale(1.2); }
                100% { color: inherit; transform: scale(1); }
            }

            @keyframes valueDown {
                0% { color: var(--hud-danger); transform: scale(1); }
                50% { transform: scale(0.9); }
                100% { color: inherit; transform: scale(1); }
            }

            .value-increased {
                animation: valueUp 0.5s var(--aaa-transition-bounce);
            }

            .value-decreased {
                animation: valueDown 0.5s var(--aaa-transition-bounce);
            }

            /* ===== Notification System ===== */
            .aaa-notification-container {
                position: fixed;
                top: 60px;
                right: 12px;
                width: 320px;
                z-index: 1100;
                pointer-events: none;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .aaa-notification {
                background: var(--hud-bg);
                border: 1px solid var(--hud-border);
                border-radius: var(--hud-radius);
                padding: 12px 16px;
                display: flex;
                align-items: flex-start;
                gap: 12px;
                box-shadow: var(--hud-shadow);
                backdrop-filter: blur(12px);
                transform: translateX(120%);
                opacity: 0;
                transition: all 0.4s var(--aaa-transition-smooth);
                pointer-events: auto;
                cursor: pointer;
            }

            .aaa-notification.visible {
                transform: translateX(0);
                opacity: 1;
            }

            .aaa-notification.exiting {
                transform: translateX(120%);
                opacity: 0;
            }

            .aaa-notification-icon {
                font-size: 24px;
                flex-shrink: 0;
            }

            .aaa-notification-content {
                flex: 1;
            }

            .aaa-notification-title {
                font-size: 13px;
                font-weight: 600;
                color: var(--hud-text-bright);
                margin-bottom: 2px;
            }

            .aaa-notification-message {
                font-size: 12px;
                color: var(--hud-text-dim);
            }

            .aaa-notification-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 2px;
                background: var(--hud-accent);
                border-radius: 0 0 var(--hud-radius) var(--hud-radius);
                animation: notificationProgress linear forwards;
            }

            @keyframes notificationProgress {
                from { width: 100%; }
                to { width: 0%; }
            }

            .aaa-notification.info { border-left: 3px solid var(--hud-accent); }
            .aaa-notification.success { border-left: 3px solid var(--hud-success); }
            .aaa-notification.warning { border-left: 3px solid var(--hud-warning); }
            .aaa-notification.danger { border-left: 3px solid var(--hud-danger); }
            .aaa-notification.milestone {
                border-left: 3px solid #ffd700;
                background: linear-gradient(135deg, var(--hud-bg), rgba(255, 215, 0, 0.1));
            }

            /* ===== Tooltip System ===== */
            .aaa-tooltip-container {
                position: fixed;
                z-index: 2000;
                pointer-events: none;
            }

            .aaa-tooltip {
                background: var(--hud-bg);
                border: 1px solid var(--hud-border);
                border-radius: var(--hud-radius);
                padding: 12px 16px;
                max-width: 300px;
                box-shadow: var(--hud-shadow);
                backdrop-filter: blur(12px);
                opacity: 0;
                transform: translateY(8px);
                transition: all 0.2s var(--aaa-transition-smooth);
            }

            .aaa-tooltip.visible {
                opacity: 1;
                transform: translateY(0);
            }

            .aaa-tooltip-title {
                font-size: 13px;
                font-weight: 600;
                color: var(--hud-text-bright);
                margin-bottom: 6px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .aaa-tooltip-body {
                font-size: 12px;
                color: var(--hud-text);
                line-height: 1.5;
            }

            .aaa-tooltip-stats {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 6px;
                margin-top: 8px;
                padding-top: 8px;
                border-top: 1px solid var(--hud-border);
            }

            .aaa-tooltip-stat {
                font-size: 11px;
            }

            .aaa-tooltip-stat .label {
                color: var(--hud-text-dim);
            }

            .aaa-tooltip-stat .value {
                color: var(--hud-text-bright);
                font-weight: 500;
            }

            .aaa-tooltip-arrow {
                position: absolute;
                width: 8px;
                height: 8px;
                background: var(--hud-bg);
                border: 1px solid var(--hud-border);
                transform: rotate(45deg);
            }

            /* ===== Mini-map ===== */
            .aaa-minimap {
                position: fixed;
                bottom: 90px;
                left: 12px;
                width: 180px;
                height: 180px;
                background: var(--hud-bg);
                border: 1px solid var(--hud-border);
                border-radius: var(--hud-radius);
                box-shadow: var(--hud-shadow);
                backdrop-filter: blur(12px);
                overflow: hidden;
                z-index: 998;
                transition: all 0.3s var(--aaa-transition-smooth);
            }

            .aaa-minimap:hover {
                transform: scale(1.05);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            }

            .aaa-minimap-canvas {
                width: 100%;
                height: 100%;
                border-radius: var(--hud-radius);
            }

            .aaa-minimap-header {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                padding: 6px 10px;
                background: linear-gradient(to bottom, var(--hud-bg), transparent);
                font-size: 10px;
                color: var(--hud-text-dim);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .aaa-minimap-legend {
                position: absolute;
                bottom: 4px;
                left: 4px;
                right: 4px;
                display: flex;
                justify-content: center;
                gap: 8px;
                font-size: 8px;
                color: var(--hud-text-dim);
            }

            .aaa-minimap-legend span {
                display: flex;
                align-items: center;
                gap: 3px;
            }

            .aaa-minimap-legend .dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
            }

            /* ===== Selection Panel ===== */
            .aaa-selection-panel {
                position: fixed;
                bottom: 90px;
                left: 50%;
                transform: translateX(-50%) translateY(120%);
                background: var(--hud-bg);
                border: 1px solid var(--hud-border);
                border-radius: var(--hud-radius);
                padding: 16px 20px;
                min-width: 280px;
                box-shadow: var(--hud-shadow);
                backdrop-filter: blur(12px);
                z-index: 999;
                opacity: 0;
                transition: all 0.4s var(--aaa-transition-bounce);
            }

            .aaa-selection-panel.visible {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }

            .aaa-selection-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
                padding-bottom: 12px;
                border-bottom: 1px solid var(--hud-border);
            }

            .aaa-selection-icon {
                font-size: 32px;
            }

            .aaa-selection-info h3 {
                font-size: 14px;
                font-weight: 600;
                color: var(--hud-text-bright);
                margin: 0 0 2px 0;
            }

            .aaa-selection-info p {
                font-size: 11px;
                color: var(--hud-text-dim);
                margin: 0;
            }

            .aaa-selection-close {
                position: absolute;
                top: 8px;
                right: 8px;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: transparent;
                border: none;
                color: var(--hud-text-dim);
                cursor: pointer;
                border-radius: 4px;
                transition: all 0.2s;
            }

            .aaa-selection-close:hover {
                background: var(--hud-accent-dim);
                color: var(--hud-text-bright);
            }

            .aaa-selection-stats {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
            }

            .aaa-selection-stat {
                text-align: center;
                padding: 8px;
                background: var(--hud-bg-light);
                border-radius: var(--hud-radius-sm);
            }

            .aaa-selection-stat .label {
                font-size: 9px;
                color: var(--hud-text-dim);
                text-transform: uppercase;
            }

            .aaa-selection-stat .value {
                font-size: 16px;
                font-weight: 600;
                color: var(--hud-text-bright);
            }

            .aaa-selection-actions {
                display: flex;
                gap: 8px;
                margin-top: 12px;
            }

            .aaa-selection-btn {
                flex: 1;
                padding: 8px 12px;
                background: var(--hud-accent-dim);
                border: 1px solid var(--hud-border);
                border-radius: var(--hud-radius-sm);
                color: var(--hud-text);
                font-size: 11px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .aaa-selection-btn:hover {
                background: var(--hud-accent);
                color: #fff;
                transform: translateY(-1px);
            }

            /* ===== Statistics Dashboard ===== */
            .aaa-stats-dashboard {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.9);
                background: var(--hud-bg);
                border: 1px solid var(--hud-border);
                border-radius: 12px;
                width: 700px;
                max-width: 90vw;
                max-height: 80vh;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(16px);
                z-index: 2000;
                opacity: 0;
                pointer-events: none;
                transition: all 0.3s var(--aaa-transition-smooth);
                overflow: hidden;
            }

            .aaa-stats-dashboard.visible {
                transform: translate(-50%, -50%) scale(1);
                opacity: 1;
                pointer-events: auto;
            }

            .aaa-stats-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid var(--hud-border);
            }

            .aaa-stats-header h2 {
                font-size: 16px;
                font-weight: 600;
                color: var(--hud-text-bright);
                margin: 0;
            }

            .aaa-stats-close {
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: transparent;
                border: none;
                color: var(--hud-text-dim);
                cursor: pointer;
                border-radius: var(--hud-radius-sm);
                font-size: 18px;
                transition: all 0.2s;
            }

            .aaa-stats-close:hover {
                background: var(--hud-danger);
                color: #fff;
            }

            .aaa-stats-body {
                padding: 20px;
                overflow-y: auto;
                max-height: calc(80vh - 60px);
            }

            .aaa-stats-charts {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 16px;
            }

            .aaa-stats-chart {
                background: var(--hud-bg-light);
                border: 1px solid var(--hud-border);
                border-radius: var(--hud-radius);
                padding: 12px;
            }

            .aaa-stats-chart.full-width {
                grid-column: span 2;
            }

            .aaa-stats-chart h4 {
                font-size: 11px;
                font-weight: 500;
                color: var(--hud-text-dim);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin: 0 0 12px 0;
            }

            .aaa-stats-chart canvas {
                width: 100%;
                height: 120px;
            }

            .aaa-stats-chart.full-width canvas {
                height: 180px;
            }

            /* ===== Onboarding System ===== */
            .aaa-onboarding-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.7);
                z-index: 3000;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s;
            }

            .aaa-onboarding-overlay.visible {
                opacity: 1;
                pointer-events: auto;
            }

            .aaa-onboarding-spotlight {
                position: absolute;
                border-radius: 8px;
                box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.75);
                transition: all 0.5s var(--aaa-transition-smooth);
            }

            .aaa-onboarding-tooltip {
                position: absolute;
                background: var(--hud-bg);
                border: 1px solid var(--hud-accent);
                border-radius: var(--hud-radius);
                padding: 20px;
                max-width: 320px;
                box-shadow: var(--hud-shadow), 0 0 30px rgba(74, 158, 255, 0.2);
            }

            .aaa-onboarding-tooltip h3 {
                font-size: 15px;
                font-weight: 600;
                color: var(--hud-text-bright);
                margin: 0 0 8px 0;
            }

            .aaa-onboarding-tooltip p {
                font-size: 13px;
                color: var(--hud-text);
                margin: 0 0 16px 0;
                line-height: 1.5;
            }

            .aaa-onboarding-progress {
                display: flex;
                gap: 6px;
                margin-bottom: 16px;
            }

            .aaa-onboarding-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: var(--hud-border);
                transition: background 0.3s;
            }

            .aaa-onboarding-dot.active {
                background: var(--hud-accent);
            }

            .aaa-onboarding-dot.completed {
                background: var(--hud-success);
            }

            .aaa-onboarding-actions {
                display: flex;
                gap: 8px;
                justify-content: flex-end;
            }

            .aaa-onboarding-btn {
                padding: 8px 16px;
                border-radius: var(--hud-radius-sm);
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }

            .aaa-onboarding-btn.skip {
                background: transparent;
                border: 1px solid var(--hud-border);
                color: var(--hud-text-dim);
            }

            .aaa-onboarding-btn.skip:hover {
                background: var(--hud-accent-dim);
                color: var(--hud-text);
            }

            .aaa-onboarding-btn.next {
                background: var(--hud-accent);
                border: none;
                color: #fff;
            }

            .aaa-onboarding-btn.next:hover {
                background: #5aadff;
                transform: translateY(-1px);
            }

            /* ===== Keyboard Shortcut Overlay ===== */
            .aaa-keyboard-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.9);
                z-index: 3500;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s;
            }

            .aaa-keyboard-overlay.visible {
                opacity: 1;
                pointer-events: auto;
            }

            .aaa-keyboard-content {
                background: var(--hud-bg);
                border: 1px solid var(--hud-border);
                border-radius: 12px;
                padding: 24px 32px;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
            }

            .aaa-keyboard-content h2 {
                font-size: 18px;
                font-weight: 600;
                color: var(--hud-text-bright);
                margin: 0 0 20px 0;
                text-align: center;
            }

            .aaa-keyboard-section {
                margin-bottom: 20px;
            }

            .aaa-keyboard-section h4 {
                font-size: 12px;
                font-weight: 500;
                color: var(--hud-accent);
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin: 0 0 10px 0;
            }

            .aaa-keyboard-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 8px;
            }

            .aaa-keyboard-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 8px 12px;
                background: var(--hud-bg-light);
                border-radius: var(--hud-radius-sm);
            }

            .aaa-keyboard-item kbd {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 28px;
                height: 28px;
                padding: 0 8px;
                background: var(--hud-bg);
                border: 1px solid var(--hud-border);
                border-radius: 4px;
                font-family: inherit;
                font-size: 12px;
                font-weight: 600;
                color: var(--hud-text-bright);
            }

            .aaa-keyboard-item span {
                font-size: 12px;
                color: var(--hud-text);
            }

            .aaa-keyboard-close {
                display: block;
                width: 100%;
                padding: 12px;
                margin-top: 16px;
                background: var(--hud-accent);
                border: none;
                border-radius: var(--hud-radius);
                color: #fff;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }

            .aaa-keyboard-close:hover {
                background: #5aadff;
            }

            /* ===== Pause Menu ===== */
            .aaa-pause-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.85);
                z-index: 4000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s var(--aaa-transition-smooth);
                backdrop-filter: blur(8px);
            }

            .aaa-pause-overlay.visible {
                opacity: 1;
                pointer-events: auto;
            }

            .aaa-pause-menu {
                background: var(--hud-bg);
                border: 1px solid var(--hud-border);
                border-radius: 16px;
                padding: 40px 48px;
                min-width: 320px;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 100px rgba(74, 158, 255, 0.1);
                transform: scale(0.9) translateY(20px);
                transition: transform 0.3s var(--aaa-transition-bounce);
            }

            .aaa-pause-overlay.visible .aaa-pause-menu {
                transform: scale(1) translateY(0);
            }

            .aaa-pause-title {
                font-size: 28px;
                font-weight: 700;
                color: var(--hud-text-bright);
                margin: 0 0 8px 0;
                letter-spacing: 2px;
                text-transform: uppercase;
            }

            .aaa-pause-subtitle {
                font-size: 13px;
                color: var(--hud-text-dim);
                margin: 0 0 32px 0;
            }

            .aaa-pause-buttons {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .aaa-pause-btn {
                padding: 14px 24px;
                border-radius: var(--hud-radius);
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s var(--aaa-transition-smooth);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
            }

            .aaa-pause-btn.primary {
                background: var(--hud-accent);
                border: none;
                color: #fff;
            }

            .aaa-pause-btn.primary:hover {
                background: #5aadff;
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(74, 158, 255, 0.3);
            }

            .aaa-pause-btn.secondary {
                background: transparent;
                border: 1px solid var(--hud-border);
                color: var(--hud-text);
            }

            .aaa-pause-btn.secondary:hover {
                background: var(--hud-accent-dim);
                border-color: var(--hud-accent);
                color: var(--hud-text-bright);
            }

            .aaa-pause-btn.danger {
                background: transparent;
                border: 1px solid var(--hud-border);
                color: var(--hud-text-dim);
            }

            .aaa-pause-btn.danger:hover {
                background: rgba(255, 107, 107, 0.1);
                border-color: var(--hud-danger);
                color: var(--hud-danger);
            }

            .aaa-pause-hint {
                margin-top: 24px;
                font-size: 11px;
                color: var(--hud-text-dim);
            }

            .aaa-pause-hint kbd {
                display: inline-block;
                padding: 2px 6px;
                background: var(--hud-bg-light);
                border: 1px solid var(--hud-border);
                border-radius: 4px;
                font-family: inherit;
                font-size: 10px;
            }

            /* ===== Info Panels (Building, Resource, Cloud, Organism) ===== */
            .info-panel-mobile {
                position: fixed !important;
                z-index: 1050;
                background: var(--hud-bg) !important;
                border: 1px solid var(--hud-border) !important;
                border-radius: var(--hud-radius) !important;
                box-shadow: var(--hud-shadow) !important;
                backdrop-filter: blur(12px) !important;
                padding: 16px !important;
                min-width: 280px;
                max-width: 360px;
                font-family: inherit;
                color: var(--hud-text);
            }

            .info-panel-mobile h3,
            .info-panel-mobile .panel-title {
                color: var(--hud-text-bright);
                margin: 0 0 8px 0;
            }

            /* Mobile Responsive */
            @media (max-width: 768px) {
                .info-panel-mobile {
                    top: auto !important;
                    bottom: 90px !important;
                    left: 50% !important;
                    right: auto !important;
                    transform: translateX(-50%) !important;
                    max-width: 90vw !important;
                    min-width: auto !important;
                    width: calc(100vw - 24px) !important;
                }

                /* Neural network panel centered on mobile */
                #neural-network-panel {
                    top: 50% !important;
                    bottom: auto !important;
                    transform: translate(-50%, -50%) !important;
                    max-height: 80vh !important;
                    overflow-y: auto !important;
                }

                .aaa-minimap {
                    width: 120px;
                    height: 120px;
                    bottom: 80px;
                    left: 8px;
                }

                .aaa-notification-container {
                    width: 280px;
                    right: 8px;
                }

                .aaa-selection-panel {
                    width: 90%;
                    min-width: auto;
                }

                .aaa-stats-charts {
                    grid-template-columns: 1fr;
                }

                .aaa-stats-chart.full-width {
                    grid-column: span 1;
                }

                .aaa-keyboard-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // ========== Notification System ==========

    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'aaa-notification-container';
        container.className = 'aaa-notification-container';
        document.body.appendChild(container);
    }

    notify(title, message, type = 'info', icon = null) {
        const container = document.getElementById('aaa-notification-container');
        if (!container) return;

        const icons = {
            info: 'info-circle',
            success: 'check-circle',
            warning: 'alert-triangle',
            danger: 'x-circle',
            milestone: 'award'
        };

        const defaultIcons = {
            info: 'info',
            success: 'check',
            warning: 'warn',
            danger: 'error',
            milestone: 'star'
        };

        // Use emoji icons for simplicity
        const emojiIcons = {
            info: 'info',
            success: 'check',
            warning: 'warn',
            danger: 'error',
            milestone: 'star'
        };

        const notification = document.createElement('div');
        notification.className = `aaa-notification ${type}`;
        notification.innerHTML = `
            <div class="aaa-notification-icon">${icon || this.getNotificationEmoji(type)}</div>
            <div class="aaa-notification-content">
                <div class="aaa-notification-title">${title}</div>
                <div class="aaa-notification-message">${message}</div>
            </div>
            <div class="aaa-notification-progress" style="animation-duration: ${this.notificationDuration}ms;"></div>
        `;

        notification.addEventListener('click', () => this.dismissNotification(notification));

        container.appendChild(notification);

        // Limit max notifications
        const notifications = container.querySelectorAll('.aaa-notification');
        if (notifications.length > this.maxNotifications) {
            this.dismissNotification(notifications[0]);
        }

        // Trigger animation
        requestAnimationFrame(() => {
            notification.classList.add('visible');
        });

        // Play sound
        if (this.audioSystem && this.audioSystem.enabled) {
            if (type === 'milestone') {
                this.audioSystem.playSuccess();
            } else {
                this.audioSystem.playClick();
            }
        }

        // Auto dismiss
        setTimeout(() => {
            this.dismissNotification(notification);
        }, this.notificationDuration);
    }

    getNotificationEmoji(type) {
        const emojis = {
            info: 'info',
            success: 'done',
            warning: 'warn',
            danger: 'error',
            milestone: 'star'
        };
        return emojis[type] || 'info';
    }

    dismissNotification(notification) {
        if (!notification || !notification.parentNode) return;

        notification.classList.add('exiting');
        notification.classList.remove('visible');

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 400);
    }

    // ========== Tooltip System ==========

    createTooltipContainer() {
        const container = document.createElement('div');
        container.id = 'aaa-tooltip-container';
        container.className = 'aaa-tooltip-container';
        document.body.appendChild(container);
    }

    showTooltip(element, content, options = {}) {
        this.hideTooltip();

        const container = document.getElementById('aaa-tooltip-container');
        if (!container) return;

        const tooltip = document.createElement('div');
        tooltip.className = 'aaa-tooltip';
        tooltip.innerHTML = content;

        container.appendChild(tooltip);
        this.activeTooltip = tooltip;

        // Position tooltip
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        let top = rect.top - tooltipRect.height - 10;
        let left = rect.left + (rect.width - tooltipRect.width) / 2;

        // Bounds checking
        if (top < 10) {
            top = rect.bottom + 10;
        }
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }

        container.style.top = `${top}px`;
        container.style.left = `${left}px`;

        // Show with animation
        requestAnimationFrame(() => {
            tooltip.classList.add('visible');
        });

        // Play subtle hover sound
        if (this.audioSystem && this.audioSystem.enabled && options.playSound !== false) {
            this.audioSystem.playHover();
        }
    }

    hideTooltip() {
        if (this.activeTooltip) {
            this.activeTooltip.classList.remove('visible');
            setTimeout(() => {
                if (this.activeTooltip && this.activeTooltip.parentNode) {
                    this.activeTooltip.parentNode.removeChild(this.activeTooltip);
                }
                this.activeTooltip = null;
            }, 200);
        }

        if (this.tooltipTimeout) {
            clearTimeout(this.tooltipTimeout);
            this.tooltipTimeout = null;
        }
    }

    createCreatureTooltip(creature) {
        const typeNames = ['Plant', 'Herbivore', 'Carnivore', 'Humanoid'];
        const typeIcons = ['🌿', '🦌', '🦁', '👤'];
        const typeName = typeNames[creature.type] || 'Unknown';
        const typeIcon = typeIcons[creature.type] || '❓';

        return `
            <div class="aaa-tooltip-title">
                <span>${typeIcon}</span>
                <span>${typeName} #${creature.id}</span>
            </div>
            <div class="aaa-tooltip-body">
                ${creature.tribeId !== 0xFFFFFFFF ? `Member of tribe ${creature.tribeId}` : 'Wild creature'}
            </div>
            <div class="aaa-tooltip-stats">
                <div class="aaa-tooltip-stat">
                    <span class="label">Health</span>
                    <span class="value">${Math.round(creature.health)}%</span>
                </div>
                <div class="aaa-tooltip-stat">
                    <span class="label">Energy</span>
                    <span class="value">${Math.round(creature.energy)}%</span>
                </div>
                <div class="aaa-tooltip-stat">
                    <span class="label">Age</span>
                    <span class="value">${Math.round(creature.age)}s</span>
                </div>
                <div class="aaa-tooltip-stat">
                    <span class="label">Speed</span>
                    <span class="value">${creature.speed?.toFixed(1) || '1.0'}</span>
                </div>
            </div>
        `;
    }

    createTribeTooltip(tribe) {
        const tribeName = this.getTribeName(tribe.id);
        return `
            <div class="aaa-tooltip-title">
                <span>🏛️</span>
                <span>${tribeName}</span>
            </div>
            <div class="aaa-tooltip-body">
                A tribal civilization with ${tribe.memberCount} members.
            </div>
            <div class="aaa-tooltip-stats">
                <div class="aaa-tooltip-stat">
                    <span class="label">Food</span>
                    <span class="value">${Math.floor(tribe.food)}</span>
                </div>
                <div class="aaa-tooltip-stat">
                    <span class="label">Wood</span>
                    <span class="value">${Math.floor(tribe.wood)}</span>
                </div>
                <div class="aaa-tooltip-stat">
                    <span class="label">Stone</span>
                    <span class="value">${Math.floor(tribe.stone)}</span>
                </div>
                <div class="aaa-tooltip-stat">
                    <span class="label">Metal</span>
                    <span class="value">${Math.floor(tribe.metal)}</span>
                </div>
            </div>
        `;
    }

    getTribeName(tribeId) {
        const prefixes = ['Sun', 'Moon', 'Star', 'Storm', 'River', 'Mountain', 'Forest', 'Thunder'];
        const suffixes = ['Walkers', 'Seekers', 'Keepers', 'Hunters', 'Builders', 'Warriors', 'Singers', 'Dancers'];
        return `${prefixes[tribeId % prefixes.length]} ${suffixes[Math.floor(tribeId / prefixes.length) % suffixes.length]}`;
    }

    // ========== Mini-map ==========

    createMinimap() {
        const minimap = document.createElement('div');
        minimap.id = 'aaa-minimap';
        minimap.className = 'aaa-minimap';
        minimap.innerHTML = `
            <div class="aaa-minimap-header">Radar</div>
            <canvas class="aaa-minimap-canvas" width="${this.minimapSize}" height="${this.minimapSize}"></canvas>
            <div class="aaa-minimap-legend">
                <span><span class="dot" style="background: #4a0;"></span> Plant</span>
                <span><span class="dot" style="background: #ff0;"></span> Herb</span>
                <span><span class="dot" style="background: #f60;"></span> Carn</span>
                <span><span class="dot" style="background: #08f;"></span> Human</span>
            </div>
        `;
        document.body.appendChild(minimap);

        this.minimapCanvas = minimap.querySelector('canvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
    }

    updateMinimap() {
        if (!this.minimapCtx || !this.wasmModule) return;

        const ctx = this.minimapCtx;
        const size = this.minimapSize;
        const halfSize = size / 2;

        // Clear with dark background
        ctx.fillStyle = 'rgba(12, 14, 18, 0.95)';
        ctx.fillRect(0, 0, size, size);

        // Draw circular border
        ctx.strokeStyle = 'rgba(80, 100, 120, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(halfSize, halfSize, halfSize - 4, 0, Math.PI * 2);
        ctx.stroke();

        // Draw grid lines
        ctx.strokeStyle = 'rgba(80, 100, 120, 0.15)';
        ctx.lineWidth = 0.5;
        for (let i = 1; i < 4; i++) {
            const r = (halfSize - 4) * i / 4;
            ctx.beginPath();
            ctx.arc(halfSize, halfSize, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Cross lines
        ctx.beginPath();
        ctx.moveTo(halfSize, 4);
        ctx.lineTo(halfSize, size - 4);
        ctx.moveTo(4, halfSize);
        ctx.lineTo(size - 4, halfSize);
        ctx.stroke();

        // Get organism data
        const data = this.wasmModule.getOrganismData();
        if (!data) return;

        // Map world coordinates to minimap
        // Assuming world is roughly -50 to 50 in x and z
        const worldScale = 100;
        const mapScale = (size - 16) / worldScale;

        // Color by type
        const colors = {
            0: '#4a0',  // Plant - green
            1: '#ff0',  // Herbivore - yellow
            2: '#f60',  // Carnivore - orange
            3: '#08f'   // Humanoid - blue
        };

        // Draw organisms as dots
        for (let i = 0; i < data.count; i++) {
            if (!data.alive[i]) continue;

            const x = data.x[i] * mapScale + halfSize;
            const z = data.z[i] * mapScale + halfSize;
            const type = data.types[i];

            ctx.fillStyle = colors[type] || '#fff';
            ctx.beginPath();
            ctx.arc(x, z, type === 0 ? 1.5 : 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw buildings
        const buildings = this.wasmModule.getAllBuildings ? this.wasmModule.getAllBuildings() : [];
        ctx.fillStyle = '#888';
        buildings.forEach(b => {
            const x = b.x * mapScale + halfSize;
            const z = b.z * mapScale + halfSize;
            ctx.fillRect(x - 2, z - 2, 4, 4);
        });

        // Draw selected entity highlight
        if (this.selectedEntity) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            const x = this.selectedEntity.x * mapScale + halfSize;
            const z = this.selectedEntity.z * mapScale + halfSize;
            ctx.beginPath();
            ctx.arc(x, z, 6, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // ========== Selection System ==========

    createSelectionPanel() {
        const panel = document.createElement('div');
        panel.id = 'aaa-selection-panel';
        panel.className = 'aaa-selection-panel';
        panel.innerHTML = `
            <button class="aaa-selection-close" aria-label="Close selection">&times;</button>
            <div class="aaa-selection-header">
                <div class="aaa-selection-icon">❓</div>
                <div class="aaa-selection-info">
                    <h3>Nothing Selected</h3>
                    <p>Click on a creature or building to select</p>
                </div>
            </div>
            <div class="aaa-selection-stats"></div>
            <div class="aaa-selection-actions"></div>
        `;
        document.body.appendChild(panel);

        // Close button handler
        const closeBtn = panel.querySelector('.aaa-selection-close');
        this._addListener(closeBtn, 'click', () => this.clearSelection());
    }

    selectEntity(entity, type) {
        this.selectedEntity = entity;
        this.selectedType = type;

        const panel = document.getElementById('aaa-selection-panel');
        if (!panel) return;

        // Update panel content based on type
        if (type === 'creature') {
            this.updateCreatureSelection(entity, panel);
        } else if (type === 'tribe') {
            this.updateTribeSelection(entity, panel);
        } else if (type === 'building') {
            this.updateBuildingSelection(entity, panel);
        }

        panel.classList.add('visible');

        // Play selection sound
        if (this.audioSystem && this.audioSystem.enabled) {
            this.audioSystem.playClick();
        }

        // Notify renderer to highlight entity
        if (this.renderer && this.renderer.highlightEntity) {
            this.renderer.highlightEntity(entity, type);
        }
    }

    updateCreatureSelection(creature, panel) {
        const typeNames = ['Plant', 'Herbivore', 'Carnivore', 'Humanoid'];
        const typeIcons = ['🌿', '🦌', '🦁', '👤'];
        const typeName = typeNames[creature.type] || 'Unknown';
        const typeIcon = typeIcons[creature.type] || '❓';

        const tribeName = creature.tribeId !== 0xFFFFFFFF
            ? this.getTribeName(creature.tribeId)
            : 'Wild';

        panel.querySelector('.aaa-selection-icon').textContent = typeIcon;
        panel.querySelector('.aaa-selection-info h3').textContent = `${typeName} #${creature.id}`;
        panel.querySelector('.aaa-selection-info p').textContent = tribeName;

        panel.querySelector('.aaa-selection-stats').innerHTML = `
            <div class="aaa-selection-stat">
                <div class="label">Health</div>
                <div class="value">${Math.round(creature.health || 100)}%</div>
            </div>
            <div class="aaa-selection-stat">
                <div class="label">Energy</div>
                <div class="value">${Math.round(creature.energy || 100)}%</div>
            </div>
            <div class="aaa-selection-stat">
                <div class="label">Age</div>
                <div class="value">${Math.round(creature.age || 0)}s</div>
            </div>
        `;

        panel.querySelector('.aaa-selection-actions').innerHTML = `
            <button class="aaa-selection-btn" onclick="window.planetEden?.aaaUI?.followSelected()">Follow</button>
            <button class="aaa-selection-btn" onclick="window.planetEden?.aaaUI?.inspectSelected()">Inspect</button>
        `;
    }

    updateTribeSelection(tribe, panel) {
        const tribeName = this.getTribeName(tribe.id);
        const color = `rgb(${tribe.color.r}, ${tribe.color.g}, ${tribe.color.b})`;

        panel.querySelector('.aaa-selection-icon').textContent = '🏛️';
        panel.querySelector('.aaa-selection-info h3').textContent = tribeName;
        panel.querySelector('.aaa-selection-info h3').style.color = color;
        panel.querySelector('.aaa-selection-info p').textContent = `${tribe.memberCount} members`;

        panel.querySelector('.aaa-selection-stats').innerHTML = `
            <div class="aaa-selection-stat">
                <div class="label">Food</div>
                <div class="value">${Math.floor(tribe.food)}</div>
            </div>
            <div class="aaa-selection-stat">
                <div class="label">Wood</div>
                <div class="value">${Math.floor(tribe.wood)}</div>
            </div>
            <div class="aaa-selection-stat">
                <div class="label">Stone</div>
                <div class="value">${Math.floor(tribe.stone)}</div>
            </div>
        `;

        panel.querySelector('.aaa-selection-actions').innerHTML = `
            <button class="aaa-selection-btn" onclick="window.planetEden?.aaaUI?.focusTribe()">Focus</button>
            <button class="aaa-selection-btn" onclick="window.planetEden?.aaaUI?.giftTribe()">Gift</button>
        `;
    }

    updateBuildingSelection(building, panel) {
        const buildingNames = ['Hut', 'Farm', 'Barracks', 'Watchtower', 'Storage', 'Workshop'];
        const buildingIcons = ['🏠', '🌾', '⚔️', '🗼', '📦', '🔨'];
        const name = buildingNames[building.type] || 'Building';
        const icon = buildingIcons[building.type] || '🏗️';

        panel.querySelector('.aaa-selection-icon').textContent = icon;
        panel.querySelector('.aaa-selection-info h3').textContent = name;
        panel.querySelector('.aaa-selection-info p').textContent = `Owned by Tribe ${building.tribeId}`;

        panel.querySelector('.aaa-selection-stats').innerHTML = `
            <div class="aaa-selection-stat">
                <div class="label">Health</div>
                <div class="value">${Math.round(building.health || 100)}%</div>
            </div>
            <div class="aaa-selection-stat">
                <div class="label">Level</div>
                <div class="value">${building.level || 1}</div>
            </div>
            <div class="aaa-selection-stat">
                <div class="label">Workers</div>
                <div class="value">${building.workers || 0}</div>
            </div>
        `;

        panel.querySelector('.aaa-selection-actions').innerHTML = `
            <button class="aaa-selection-btn" onclick="window.planetEden?.aaaUI?.focusBuilding()">Focus</button>
        `;
    }

    clearSelection() {
        this.selectedEntity = null;
        this.selectedType = null;

        const panel = document.getElementById('aaa-selection-panel');
        if (panel) {
            panel.classList.remove('visible');
        }

        // Clear highlight in renderer
        if (this.renderer && this.renderer.clearHighlight) {
            this.renderer.clearHighlight();
        }
    }

    followSelected() {
        if (this.selectedEntity && this.renderer) {
            this.renderer.followTarget = this.selectedEntity;
            this.renderer.followMode = true;
            this.notify('Camera', `Following ${this.selectedType}`, 'info', '📷');
        }
    }

    inspectSelected() {
        if (this.selectedEntity) {
            console.log('[AAA-UI] Selected entity:', this.selectedEntity);
            this.notify('Debug', 'Entity data logged to console', 'info', '🔍');
        }
    }

    focusTribe() {
        // Focus camera on tribe's centroid
        if (this.selectedEntity && this.renderer) {
            this.notify('Camera', 'Focusing on tribe territory', 'info', '🎯');
        }
    }

    giftTribe() {
        if (this.selectedEntity && window.planetEden?.ui) {
            window.planetEden.ui.godPowerGiftResources();
        }
    }

    focusBuilding() {
        if (this.selectedEntity && this.renderer) {
            // Focus camera on building
            this.notify('Camera', 'Focusing on building', 'info', '🎯');
        }
    }

    // ========== Statistics Dashboard ==========

    createStatsDashboard() {
        const dashboard = document.createElement('div');
        dashboard.id = 'aaa-stats-dashboard';
        dashboard.className = 'aaa-stats-dashboard';
        dashboard.innerHTML = `
            <div class="aaa-stats-header">
                <h2>Statistics Dashboard</h2>
                <button class="aaa-stats-close" aria-label="Close">&times;</button>
            </div>
            <div class="aaa-stats-body">
                <div class="aaa-stats-charts">
                    <div class="aaa-stats-chart full-width">
                        <h4>Population Over Time</h4>
                        <canvas id="aaa-chart-population"></canvas>
                    </div>
                    <div class="aaa-stats-chart">
                        <h4>Species Distribution</h4>
                        <canvas id="aaa-chart-species"></canvas>
                    </div>
                    <div class="aaa-stats-chart">
                        <h4>Tribe Growth</h4>
                        <canvas id="aaa-chart-tribes"></canvas>
                    </div>
                    <div class="aaa-stats-chart full-width">
                        <h4>Birth/Death Rate</h4>
                        <canvas id="aaa-chart-births"></canvas>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(dashboard);

        // Close button
        const closeBtn = dashboard.querySelector('.aaa-stats-close');
        this._addListener(closeBtn, 'click', () => this.hideStatsDashboard());
    }

    showStatsDashboard() {
        const dashboard = document.getElementById('aaa-stats-dashboard');
        if (dashboard) {
            dashboard.classList.add('visible');
            this.drawAllCharts();
        }

        if (this.audioSystem && this.audioSystem.enabled) {
            this.audioSystem.playPanelOpen();
        }
    }

    hideStatsDashboard() {
        const dashboard = document.getElementById('aaa-stats-dashboard');
        if (dashboard) {
            dashboard.classList.remove('visible');
        }

        if (this.audioSystem && this.audioSystem.enabled) {
            this.audioSystem.playPanelClose();
        }
    }

    drawAllCharts() {
        this.drawPopulationChart();
        this.drawSpeciesChart();
        this.drawTribesChart();
        this.drawBirthDeathChart();
    }

    drawPopulationChart() {
        const canvas = document.getElementById('aaa-chart-population');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const w = canvas.width = canvas.offsetWidth;
        const h = canvas.height = 180;

        ctx.clearRect(0, 0, w, h);

        const data = this.statsHistory.population;
        if (data.length < 2) {
            ctx.fillStyle = 'rgba(200, 208, 220, 0.5)';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Collecting data...', w / 2, h / 2);
            return;
        }

        // Draw grid
        ctx.strokeStyle = 'rgba(80, 100, 120, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const y = (h / 5) * i + 10;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Find max value
        const maxVal = Math.max(...data, 10);

        // Draw line
        ctx.strokeStyle = '#4a9eff';
        ctx.lineWidth = 2;
        ctx.beginPath();

        data.forEach((val, i) => {
            const x = (i / (data.length - 1)) * w;
            const y = h - 10 - (val / maxVal) * (h - 20);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });

        ctx.stroke();

        // Draw fill
        ctx.lineTo(w, h - 10);
        ctx.lineTo(0, h - 10);
        ctx.closePath();
        ctx.fillStyle = 'rgba(74, 158, 255, 0.1)';
        ctx.fill();
    }

    drawSpeciesChart() {
        const canvas = document.getElementById('aaa-chart-species');
        if (!canvas || !this.wasmModule) return;

        const ctx = canvas.getContext('2d');
        const w = canvas.width = canvas.offsetWidth;
        const h = canvas.height = 120;

        ctx.clearRect(0, 0, w, h);

        // Get current counts
        const data = this.wasmModule.getOrganismData();
        if (!data) return;

        const counts = { plants: 0, herbivores: 0, carnivores: 0, humanoids: 0 };
        for (let i = 0; i < data.count; i++) {
            if (!data.alive[i]) continue;
            switch (data.types[i]) {
                case 0: counts.plants++; break;
                case 1: counts.herbivores++; break;
                case 2: counts.carnivores++; break;
                case 3: counts.humanoids++; break;
            }
        }

        const total = counts.plants + counts.herbivores + counts.carnivores + counts.humanoids;
        if (total === 0) return;

        // Draw bar chart
        const colors = ['#4a0', '#ff0', '#f60', '#08f'];
        const labels = ['Plant', 'Herb', 'Carn', 'Human'];
        const values = [counts.plants, counts.herbivores, counts.carnivores, counts.humanoids];
        const barWidth = (w - 40) / 4;
        const maxHeight = h - 30;

        values.forEach((val, i) => {
            const barHeight = (val / total) * maxHeight;
            const x = 20 + i * barWidth;
            const y = h - 20 - barHeight;

            ctx.fillStyle = colors[i];
            ctx.fillRect(x + 5, y, barWidth - 10, barHeight);

            ctx.fillStyle = 'rgba(200, 208, 220, 0.7)';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(labels[i], x + barWidth / 2, h - 5);
            ctx.fillText(val.toString(), x + barWidth / 2, y - 5);
        });
    }

    drawTribesChart() {
        const canvas = document.getElementById('aaa-chart-tribes');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const w = canvas.width = canvas.offsetWidth;
        const h = canvas.height = 120;

        ctx.clearRect(0, 0, w, h);

        const data = this.statsHistory.tribes;
        if (data.length < 2) {
            ctx.fillStyle = 'rgba(200, 208, 220, 0.5)';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Collecting data...', w / 2, h / 2);
            return;
        }

        const maxVal = Math.max(...data, 1);

        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.beginPath();

        data.forEach((val, i) => {
            const x = (i / (data.length - 1)) * w;
            const y = h - 10 - (val / maxVal) * (h - 20);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });

        ctx.stroke();
    }

    drawBirthDeathChart() {
        const canvas = document.getElementById('aaa-chart-births');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const w = canvas.width = canvas.offsetWidth;
        const h = canvas.height = 120;

        ctx.clearRect(0, 0, w, h);

        // This would require birth/death event tracking
        ctx.fillStyle = 'rgba(200, 208, 220, 0.5)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Birth/death tracking coming soon', w / 2, h / 2);
    }

    // ========== Onboarding System ==========

    createOnboarding() {
        const overlay = document.createElement('div');
        overlay.id = 'aaa-onboarding-overlay';
        overlay.className = 'aaa-onboarding-overlay';
        overlay.innerHTML = `
            <div class="aaa-onboarding-spotlight" id="aaa-onboarding-spotlight"></div>
            <div class="aaa-onboarding-tooltip" id="aaa-onboarding-tooltip">
                <h3>Welcome to Planet Eden</h3>
                <p>Let us show you around the simulation!</p>
                <div class="aaa-onboarding-progress" id="aaa-onboarding-progress"></div>
                <div class="aaa-onboarding-actions">
                    <button class="aaa-onboarding-btn skip" id="aaa-onboarding-skip">Skip Tutorial</button>
                    <button class="aaa-onboarding-btn next" id="aaa-onboarding-next">Get Started</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Button handlers
        const skipBtn = overlay.querySelector('#aaa-onboarding-skip');
        const nextBtn = overlay.querySelector('#aaa-onboarding-next');

        this._addListener(skipBtn, 'click', () => this.skipOnboarding());
        this._addListener(nextBtn, 'click', () => this.nextOnboardingStep());
    }

    startOnboarding() {
        this.onboardingStep = 0;
        const overlay = document.getElementById('aaa-onboarding-overlay');
        if (overlay) {
            overlay.classList.add('visible');
            this.updateOnboardingStep();
        }
    }

    onboardingSteps = [
        {
            title: 'Welcome to Planet Eden',
            message: 'Watch life evolve on a living planet. Creatures hunt, build, and form tribes!',
            target: null,
            position: 'center'
        },
        {
            title: 'Quick Bar Controls',
            message: 'Use these buttons to spawn new creatures or pause the simulation.',
            target: '.hud-quickbar',
            position: 'top'
        },
        {
            title: 'Population Stats',
            message: 'Keep track of your world\'s population and FPS here.',
            target: '.hud-topbar-left',
            position: 'bottom'
        },
        {
            title: 'Side Panel',
            message: 'Click here to open detailed stats, tribe info, and god powers.',
            target: '#hud-sidebar-toggle',
            position: 'left'
        },
        {
            title: 'Time & Weather',
            message: 'The day/night cycle and weather affect your creatures.',
            target: '.hud-topbar-center',
            position: 'bottom'
        },
        {
            title: 'Mini-map',
            message: 'Use the radar to see all creatures and buildings at a glance.',
            target: '.aaa-minimap',
            position: 'right'
        },
        {
            title: 'You\'re Ready!',
            message: 'Press ? anytime to see keyboard shortcuts. Have fun playing god!',
            target: null,
            position: 'center'
        }
    ];

    updateOnboardingStep() {
        const step = this.onboardingSteps[this.onboardingStep];
        const tooltip = document.getElementById('aaa-onboarding-tooltip');
        const spotlight = document.getElementById('aaa-onboarding-spotlight');
        const progress = document.getElementById('aaa-onboarding-progress');
        const nextBtn = document.getElementById('aaa-onboarding-next');

        if (!tooltip || !step) return;

        // Update content
        tooltip.querySelector('h3').textContent = step.title;
        tooltip.querySelector('p').textContent = step.message;

        // Update progress dots
        progress.innerHTML = this.onboardingSteps.map((_, i) => `
            <div class="aaa-onboarding-dot ${i < this.onboardingStep ? 'completed' : ''} ${i === this.onboardingStep ? 'active' : ''}"></div>
        `).join('');

        // Update button text
        nextBtn.textContent = this.onboardingStep === this.onboardingSteps.length - 1 ? 'Finish' : 'Next';

        // Position spotlight and tooltip
        if (step.target) {
            const targetEl = document.querySelector(step.target);
            if (targetEl) {
                const rect = targetEl.getBoundingClientRect();
                const padding = 8;

                spotlight.style.display = 'block';
                spotlight.style.left = `${rect.left - padding}px`;
                spotlight.style.top = `${rect.top - padding}px`;
                spotlight.style.width = `${rect.width + padding * 2}px`;
                spotlight.style.height = `${rect.height + padding * 2}px`;

                // Position tooltip based on step.position
                const tooltipRect = tooltip.getBoundingClientRect();
                switch (step.position) {
                    case 'top':
                        tooltip.style.left = `${rect.left + rect.width / 2 - tooltipRect.width / 2}px`;
                        tooltip.style.top = `${rect.top - tooltipRect.height - 20}px`;
                        break;
                    case 'bottom':
                        tooltip.style.left = `${rect.left + rect.width / 2 - tooltipRect.width / 2}px`;
                        tooltip.style.top = `${rect.bottom + 20}px`;
                        break;
                    case 'left':
                        tooltip.style.left = `${rect.left - tooltipRect.width - 20}px`;
                        tooltip.style.top = `${rect.top + rect.height / 2 - tooltipRect.height / 2}px`;
                        break;
                    case 'right':
                        tooltip.style.left = `${rect.right + 20}px`;
                        tooltip.style.top = `${rect.top + rect.height / 2 - tooltipRect.height / 2}px`;
                        break;
                }
            }
        } else {
            spotlight.style.display = 'none';
            tooltip.style.left = '50%';
            tooltip.style.top = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
        }
    }

    nextOnboardingStep() {
        this.onboardingStep++;

        if (this.onboardingStep >= this.onboardingSteps.length) {
            this.completeOnboarding();
        } else {
            this.updateOnboardingStep();
        }
    }

    skipOnboarding() {
        this.completeOnboarding();
    }

    completeOnboarding() {
        const overlay = document.getElementById('aaa-onboarding-overlay');
        if (overlay) {
            overlay.classList.remove('visible');
        }

        this.onboardingComplete = true;
        localStorage.setItem('planetEden_onboardingComplete', 'true');

        this.notify('Tutorial Complete', 'Press ? for keyboard shortcuts', 'success', '🎓');
    }

    // ========== Keyboard Shortcut Overlay ==========

    createKeyboardOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'aaa-keyboard-overlay';
        overlay.className = 'aaa-keyboard-overlay';
        overlay.innerHTML = `
            <div class="aaa-keyboard-content">
                <h2>Keyboard Shortcuts</h2>

                <div class="aaa-keyboard-section">
                    <h4>Simulation</h4>
                    <div class="aaa-keyboard-grid">
                        <div class="aaa-keyboard-item"><kbd>Space</kbd><span>Play/Pause</span></div>
                        <div class="aaa-keyboard-item"><kbd>+</kbd><span>Speed Up</span></div>
                        <div class="aaa-keyboard-item"><kbd>-</kbd><span>Slow Down</span></div>
                        <div class="aaa-keyboard-item"><kbd>Tab</kbd><span>Toggle Panel</span></div>
                    </div>
                </div>

                <div class="aaa-keyboard-section">
                    <h4>Spawn</h4>
                    <div class="aaa-keyboard-grid">
                        <div class="aaa-keyboard-item"><kbd>1</kbd><span>Plant</span></div>
                        <div class="aaa-keyboard-item"><kbd>2</kbd><span>Herbivore</span></div>
                        <div class="aaa-keyboard-item"><kbd>3</kbd><span>Carnivore</span></div>
                        <div class="aaa-keyboard-item"><kbd>4</kbd><span>Humanoid</span></div>
                    </div>
                </div>

                <div class="aaa-keyboard-section">
                    <h4>God Powers</h4>
                    <div class="aaa-keyboard-grid">
                        <div class="aaa-keyboard-item"><kbd>F1</kbd><span>New Tribe</span></div>
                        <div class="aaa-keyboard-item"><kbd>F2</kbd><span>Mass Spawn</span></div>
                        <div class="aaa-keyboard-item"><kbd>F3</kbd><span>Gift Resources</span></div>
                        <div class="aaa-keyboard-item"><kbd>F4</kbd><span>Lightning</span></div>
                        <div class="aaa-keyboard-item"><kbd>F5</kbd><span>Plague</span></div>
                        <div class="aaa-keyboard-item"><kbd>F6</kbd><span>Blessing</span></div>
                    </div>
                </div>

                <div class="aaa-keyboard-section">
                    <h4>Camera & View</h4>
                    <div class="aaa-keyboard-grid">
                        <div class="aaa-keyboard-item"><kbd>C</kbd><span>Follow Selected</span></div>
                        <div class="aaa-keyboard-item"><kbd>R</kbd><span>Reset Camera</span></div>
                        <div class="aaa-keyboard-item"><kbd>G</kbd><span>Population Graph</span></div>
                        <div class="aaa-keyboard-item"><kbd>S</kbd><span>Stats Dashboard</span></div>
                    </div>
                </div>

                <div class="aaa-keyboard-section">
                    <h4>Other</h4>
                    <div class="aaa-keyboard-grid">
                        <div class="aaa-keyboard-item"><kbd>M</kbd><span>Toggle Audio</span></div>
                        <div class="aaa-keyboard-item"><kbd>P</kbd><span>Screenshot</span></div>
                        <div class="aaa-keyboard-item"><kbd>L</kbd><span>Event Log</span></div>
                        <div class="aaa-keyboard-item"><kbd>?</kbd><span>This Menu</span></div>
                    </div>
                </div>

                <button class="aaa-keyboard-close">Close (Press ? or Escape)</button>
            </div>
        `;
        document.body.appendChild(overlay);

        // Close button and overlay click
        const closeBtn = overlay.querySelector('.aaa-keyboard-close');
        this._addListener(closeBtn, 'click', () => this.hideKeyboardOverlay());
        this._addListener(overlay, 'click', (e) => {
            if (e.target === overlay) this.hideKeyboardOverlay();
        });
    }

    showKeyboardOverlay() {
        const overlay = document.getElementById('aaa-keyboard-overlay');
        if (overlay) {
            overlay.classList.add('visible');
            this.showKeyboardOverlay = true;
        }
    }

    hideKeyboardOverlay() {
        const overlay = document.getElementById('aaa-keyboard-overlay');
        if (overlay) {
            overlay.classList.remove('visible');
            this.showKeyboardOverlay = false;
        }
    }

    toggleKeyboardOverlay() {
        const overlay = document.getElementById('aaa-keyboard-overlay');
        if (overlay) {
            overlay.classList.toggle('visible');
        }
    }

    // ========== Pause Menu ==========

    createPauseMenu() {
        const overlay = document.createElement('div');
        overlay.id = 'aaa-pause-overlay';
        overlay.className = 'aaa-pause-overlay';
        overlay.innerHTML = `
            <div class="aaa-pause-menu">
                <h2 class="aaa-pause-title">Paused</h2>
                <p class="aaa-pause-subtitle">Simulation is paused</p>
                <div class="aaa-pause-buttons">
                    <button class="aaa-pause-btn primary" id="aaa-pause-resume">
                        <span>▶</span> Resume
                    </button>
                    <button class="aaa-pause-btn secondary" id="aaa-pause-settings">
                        <span>⚙</span> Settings
                    </button>
                    <button class="aaa-pause-btn secondary" id="aaa-pause-help">
                        <span>?</span> Controls
                    </button>
                    <button class="aaa-pause-btn danger" id="aaa-pause-restart">
                        <span>↺</span> Restart Simulation
                    </button>
                </div>
                <p class="aaa-pause-hint">Press <kbd>Space</kbd> or <kbd>Esc</kbd> to resume</p>
            </div>
        `;
        document.body.appendChild(overlay);

        // Button handlers
        const resumeBtn = overlay.querySelector('#aaa-pause-resume');
        const settingsBtn = overlay.querySelector('#aaa-pause-settings');
        const helpBtn = overlay.querySelector('#aaa-pause-help');
        const restartBtn = overlay.querySelector('#aaa-pause-restart');

        this._addListener(resumeBtn, 'click', () => this.resumeFromPauseMenu());
        this._addListener(settingsBtn, 'click', () => this.openSettingsFromPause());
        this._addListener(helpBtn, 'click', () => this.openHelpFromPause());
        this._addListener(restartBtn, 'click', () => this.restartFromPauseMenu());
    }

    showPauseMenu() {
        const overlay = document.getElementById('aaa-pause-overlay');
        if (overlay && !this.pauseMenuVisible) {
            overlay.classList.add('visible');
            this.pauseMenuVisible = true;

            if (this.audioSystem && this.audioSystem.enabled) {
                this.audioSystem.playPanelOpen();
            }
        }
    }

    hidePauseMenu() {
        const overlay = document.getElementById('aaa-pause-overlay');
        if (overlay && this.pauseMenuVisible) {
            overlay.classList.remove('visible');
            this.pauseMenuVisible = false;

            if (this.audioSystem && this.audioSystem.enabled) {
                this.audioSystem.playPanelClose();
            }
        }
    }

    resumeFromPauseMenu() {
        this.hidePauseMenu();
        if (window.planetEden && !window.planetEden.running) {
            window.planetEden.togglePause();
            if (this.hud) {
                this.hud.updatePauseButton();
            }
        }
    }

    openSettingsFromPause() {
        // Open the settings panel
        if (window.planetEden && window.planetEden.settingsSystem) {
            window.planetEden.settingsSystem.toggle();
        }
    }

    openHelpFromPause() {
        this.showKeyboardOverlay();
    }

    restartFromPauseMenu() {
        // Confirm before restart
        if (confirm('Are you sure you want to restart the simulation? All progress will be lost.')) {
            this.hidePauseMenu();
            if (window.planetEden && window.planetEden.restart) {
                window.planetEden.restart();
            } else {
                // Fallback: reload the page
                window.location.reload();
            }
        }
    }

    // Called when pause state changes
    onPauseStateChanged(isPaused) {
        if (isPaused) {
            this.showPauseMenu();
        } else {
            this.hidePauseMenu();
        }
    }

    // ========== Micro-interactions Setup ==========

    setupMicroInteractions() {
        // Add ripple effect class to all interactive buttons
        document.querySelectorAll('.hud-icon-btn, .hud-quickbar-btn, .hud-power-btn, .hud-tab-btn').forEach(btn => {
            btn.classList.add('aaa-ripple');
        });
    }

    // ========== Event Listeners ==========

    setupEventListeners() {
        // Keyboard shortcuts
        this._addListener(window, 'keydown', (e) => {
            // Question mark for keyboard overlay
            if (e.key === '?' || (e.shiftKey && e.key === '/')) {
                e.preventDefault();
                this.toggleKeyboardOverlay();
            }

            // S for stats dashboard
            if ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey) {
                const dashboard = document.getElementById('aaa-stats-dashboard');
                if (dashboard) {
                    if (dashboard.classList.contains('visible')) {
                        this.hideStatsDashboard();
                    } else {
                        this.showStatsDashboard();
                    }
                }
            }

            // Escape to close overlays or resume from pause
            if (e.key === 'Escape') {
                if (this.pauseMenuVisible) {
                    this.resumeFromPauseMenu();
                } else {
                    this.hideKeyboardOverlay();
                    this.hideStatsDashboard();
                    this.clearSelection();
                }
            }
        });

        // Click handling for selection
        this._addListener(window, 'click', (e) => {
            // Handle clicks on tribe cards for selection
            const tribeCard = e.target.closest('.hud-tribe-card');
            if (tribeCard && this.wasmModule) {
                const tribes = this.wasmModule.getAllTribes();
                const index = Array.from(tribeCard.parentNode.children).indexOf(tribeCard);
                if (tribes[index]) {
                    this.selectEntity(tribes[index], 'tribe');
                }
            }
        });

        // Tooltip handling for various elements
        this.setupTooltips();
    }

    setupTooltips() {
        // Tribe cards get tooltips
        const setupTribeTooltips = () => {
            document.querySelectorAll('.hud-tribe-card').forEach(card => {
                card.addEventListener('mouseenter', (e) => {
                    const tribes = this.wasmModule?.getAllTribes() || [];
                    const index = Array.from(card.parentNode.children).indexOf(card);
                    if (tribes[index]) {
                        this.showTooltip(card, this.createTribeTooltip(tribes[index]));
                    }
                });
                card.addEventListener('mouseleave', () => this.hideTooltip());
            });
        };

        // Setup initial tooltips
        setupTribeTooltips();

        // Re-setup when tribes list updates
        const observer = new MutationObserver(() => {
            setupTribeTooltips();
        });

        const tribeList = document.getElementById('hud-tribe-list');
        if (tribeList) {
            observer.observe(tribeList, { childList: true });
        }
    }

    // ========== Update Loop ==========

    update(deltaTime) {
        // Update minimap
        this.updateMinimap();

        // Sample statistics periodically
        const now = Date.now();
        if (now - this.lastStatsSample >= 1000) {
            this.lastStatsSample = now;
            this.sampleStatistics();
        }

        // Check for notification-worthy events
        this.checkForEvents();

        // Update selected entity info if visible
        if (this.selectedEntity && this.selectedType) {
            this.updateSelectionPanel();
        }
    }

    sampleStatistics() {
        if (!this.wasmModule) return;

        const stats = this.wasmModule.getStats();

        // Sample population
        this.statsHistory.population.push(stats.aliveCount);
        if (this.statsHistory.population.length > this.maxHistoryPoints) {
            this.statsHistory.population.shift();
        }

        // Sample tribe count
        this.statsHistory.tribes.push(stats.tribeCount);
        if (this.statsHistory.tribes.length > this.maxHistoryPoints) {
            this.statsHistory.tribes.shift();
        }

        // Sample buildings
        this.statsHistory.buildings.push(stats.buildingCount);
        if (this.statsHistory.buildings.length > this.maxHistoryPoints) {
            this.statsHistory.buildings.shift();
        }
    }

    checkForEvents() {
        if (!this.wasmModule) return;

        const stats = this.wasmModule.getStats();

        // New tribe formed
        if (stats.tribeCount > this.lastTribeCount && this.lastTribeCount > 0) {
            const tribes = this.wasmModule.getAllTribes();
            const newTribe = tribes[tribes.length - 1];
            if (newTribe) {
                const tribeName = this.getTribeName(newTribe.id);
                this.notify('New Tribe', `The ${tribeName} have emerged!`, 'milestone', '🏛️');
            }
        }
        this.lastTribeCount = stats.tribeCount;

        // New building constructed
        if (stats.buildingCount > this.lastBuildingCount && this.lastBuildingCount > 0) {
            this.notify('Construction', 'A new building has been completed', 'success', '🏗️');
        }
        this.lastBuildingCount = stats.buildingCount;

        // Population milestones
        const milestones = [50, 100, 200, 300, 500];
        for (const milestone of milestones) {
            if (stats.aliveCount >= milestone && this.lastPopulation < milestone) {
                this.notify('Population Milestone', `${milestone} organisms are now alive!`, 'milestone', '🎉');
                break;
            }
        }
        this.lastPopulation = stats.aliveCount;
    }

    updateSelectionPanel() {
        // Refresh selection data if entity still exists
        if (this.selectedType === 'creature' && this.wasmModule) {
            const data = this.wasmModule.getOrganismData();
            if (data && this.selectedEntity.id < data.count) {
                if (!data.alive[this.selectedEntity.id]) {
                    this.notify('Selection Lost', 'The selected creature has died', 'warning', '💀');
                    this.clearSelection();
                }
            }
        }
    }

    // ========== Cleanup ==========

    destroy() {
        if (this._destroyed) return;

        // Remove all listeners
        for (const { target, event, handler, options } of this._listeners) {
            try {
                target.removeEventListener(event, handler, options);
            } catch (e) {
                console.warn('[AAA-UI] Failed to remove listener:', e);
            }
        }
        this._listeners = [];

        // Remove DOM elements
        const elements = [
            'aaa-notification-container',
            'aaa-tooltip-container',
            'aaa-minimap',
            'aaa-selection-panel',
            'aaa-stats-dashboard',
            'aaa-onboarding-overlay',
            'aaa-keyboard-overlay',
            'aaa-pause-overlay',
            'aaa-ui-styles'
        ];

        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });

        this._destroyed = true;
        console.log('[AAA-UI] Destroyed and cleaned up');
    }
}

// Singleton export
export const aaaUISystem = new AAAUISystem();
