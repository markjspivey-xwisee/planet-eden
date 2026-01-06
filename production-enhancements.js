/**
 * Production Enhancements for Rainforest Simulation
 * Add this script to your index.html before the main simulation code
 * Version: 1.0.0
 */

(function() {
    'use strict';

    // ============================================================================
    // CONFIGURATION
    // ============================================================================

    const CONFIG = {
        VERSION: '1.0.0',
        DEBUG_MODE: false,
        ANALYTICS_ID: null, // Set to your Google Analytics ID
        SENTRY_DSN: null,   // Set to your Sentry DSN
        AUTO_QUALITY_ADJUST: true,
        PERFORMANCE_MONITORING: true,
        SHOW_TUTORIAL: true,
        MOBILE_WARNING: true
    };

    // ============================================================================
    // ERROR HANDLING
    // ============================================================================

    class ErrorHandler {
        static init() {
            window.addEventListener('error', this.handleError.bind(this));
            window.addEventListener('unhandledrejection', this.handleRejection.bind(this));
        }

        static handleError(event) {
            console.error('[Error]', event.error);
            this.report('JavaScript Error', event.error.message, event.error.stack);
            this.showUserError('Something went wrong', event.error.message);
        }

        static handleRejection(event) {
            console.error('[Promise Rejection]', event.reason);
            this.report('Promise Rejection', event.reason);
        }

        static report(title, message, stack) {
            // Send to analytics
            if (window.gtag) {
                window.gtag('event', 'exception', {
                    description: `${title}: ${message}`,
                    fatal: false
                });
            }

            // Send to Sentry
            if (window.Sentry && CONFIG.SENTRY_DSN) {
                window.Sentry.captureException(new Error(`${title}: ${message}`));
            }

            // Log for debugging
            if (CONFIG.DEBUG_MODE) {
                console.table({ title, message, stack });
            }
        }

        static showUserError(title, message) {
            // Create error notification
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(255, 107, 107, 0.95);
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                max-width: 400px;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                animation: slideIn 0.3s ease;
            `;
            errorDiv.innerHTML = `
                <strong>${title}</strong><br>
                <small>${message}</small><br>
                <button onclick="this.parentElement.remove()" style="
                    margin-top: 0.5rem;
                    background: white;
                    color: #ff6b6b;
                    border: none;
                    padding: 0.3rem 0.8rem;
                    border-radius: 4px;
                    cursor: pointer;
                ">Dismiss</button>
            `;
            document.body.appendChild(errorDiv);
            setTimeout(() => errorDiv.remove(), 10000);
        }
    }

    // ============================================================================
    // WEBGL COMPATIBILITY CHECK
    // ============================================================================

    class CompatibilityChecker {
        static check() {
            const results = {
                webgl: this.checkWebGL(),
                webgl2: this.checkWebGL2(),
                performance: this.checkPerformance(),
                mobile: this.isMobile(),
                touchscreen: this.hasTouchscreen()
            };

            console.log('[Compatibility]', results);
            return results;
        }

        static checkWebGL() {
            try {
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                if (!gl) {
                    this.showFatalError('WebGL Not Supported',
                        'Your browser doesn\'t support WebGL. Please use Chrome, Firefox, or Edge.');
                    return false;
                }
                return true;
            } catch (e) {
                return false;
            }
        }

        static checkWebGL2() {
            try {
                const canvas = document.createElement('canvas');
                return !!canvas.getContext('webgl2');
            } catch (e) {
                return false;
            }
        }

        static checkPerformance() {
            const cores = navigator.hardwareConcurrency || 2;
            const memory = navigator.deviceMemory || 4;

            if (cores <= 2 || memory <= 2) {
                return 'low';
            } else if (cores <= 4 || memory <= 4) {
                return 'medium';
            } else {
                return 'high';
            }
        }

        static isMobile() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        }

        static hasTouchscreen() {
            return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        }

        static showFatalError(title, message) {
            document.body.innerHTML = `
                <div style="
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    background: linear-gradient(135deg, #2a1a1a 0%, #1a0a0a 100%);
                    color: white;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    text-align: center;
                    padding: 2rem;
                ">
                    <h1 style="font-size: 3rem; margin-bottom: 1rem;">⚠️</h1>
                    <h2 style="font-size: 2rem; margin-bottom: 1rem;">${title}</h2>
                    <p style="font-size: 1rem; max-width: 500px; opacity: 0.8;">${message}</p>
                    <button onclick="location.reload()" style="
                        margin-top: 2rem;
                        background: #6bb85a;
                        color: white;
                        border: none;
                        padding: 1rem 2rem;
                        border-radius: 8px;
                        font-size: 1rem;
                        cursor: pointer;
                    ">Try Again</button>
                </div>
            `;
        }
    }

    // ============================================================================
    // PERFORMANCE MONITOR
    // ============================================================================

    class PerformanceMonitor {
        constructor() {
            this.fps = 60;
            this.frameCount = 0;
            this.lastCheck = performance.now();
            this.frameTimes = [];
            this.qualityLevel = 'medium';
        }

        update() {
            if (!CONFIG.PERFORMANCE_MONITORING) return;

            this.frameCount++;
            const now = performance.now();
            const delta = now - this.lastCheck;

            if (delta >= 1000) {
                this.fps = Math.round(this.frameCount / (delta / 1000));
                this.frameCount = 0;
                this.lastCheck = now;

                // Auto-adjust quality if enabled
                if (CONFIG.AUTO_QUALITY_ADJUST) {
                    this.autoAdjustQuality();
                }

                // Update UI if element exists
                const fpsElement = document.getElementById('fps-counter');
                if (fpsElement) {
                    fpsElement.textContent = this.fps;
                }

                // Track performance metrics
                if (window.gtag) {
                    window.gtag('event', 'performance', {
                        event_category: 'monitoring',
                        event_label: 'fps',
                        value: this.fps
                    });
                }
            }
        }

        autoAdjustQuality() {
            if (this.fps < 20 && this.qualityLevel !== 'low') {
                console.warn('[Performance] Low FPS detected, reducing quality');
                this.setQuality('low');
                this.notify('Performance: Quality reduced to maintain framerate');
            } else if (this.fps > 55 && this.qualityLevel === 'low') {
                console.log('[Performance] Good FPS, increasing quality');
                this.setQuality('medium');
            }
        }

        setQuality(level) {
            this.qualityLevel = level;
            if (window.applyQualitySettings) {
                window.applyQualitySettings(level);
            }
        }

        notify(message) {
            ErrorHandler.showUserError('Performance Adjustment', message);
        }
    }

    // ============================================================================
    // SETTINGS MANAGER
    // ============================================================================

    class Settings {
        static  save(key, value) {
            try {
                const settings = this.load();
                settings[key] = value;
                localStorage.setItem('rainforest-settings', JSON.stringify(settings));
            } catch (e) {
                console.warn('[Settings] Could not save:', e);
            }
        }

        static load() {
            try {
                const saved = localStorage.getItem('rainforest-settings');
                return saved ? JSON.parse(saved) : this.getDefaults();
            } catch (e) {
                return this.getDefaults();
            }
        }

        static getDefaults() {
            const compat = CompatibilityChecker.checkPerformance();
            return {
                quality: compat === 'low' ? 'low' : 'medium',
                autoRotate: false,
                timeSpeed: 1,
                soundEnabled: false,
                tutorialCompleted: false,
                mobileWarningDismissed: false,
                version: CONFIG.VERSION
            };
        }

        static reset() {
            localStorage.removeItem('rainforest-settings');
        }
    }

    // ============================================================================
    // ANALYTICS
    // ============================================================================

    class Analytics {
        static init() {
            if (!CONFIG.ANALYTICS_ID) return;

            // Load Google Analytics
            const script1 = document.createElement('script');
            script1.async = true;
            script1.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.ANALYTICS_ID}`;
            document.head.appendChild(script1);

            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', CONFIG.ANALYTICS_ID);

            console.log('[Analytics] Initialized');
        }

        static track(eventName, params = {}) {
            if (window.gtag) {
                window.gtag('event', eventName, {
                    ...params,
                    version: CONFIG.VERSION
                });
            }
            if (CONFIG.DEBUG_MODE) {
                console.log('[Analytics]', eventName, params);
            }
        }

        static pageView(path) {
            if (window.gtag) {
                window.gtag('config', CONFIG.ANALYTICS_ID, {
                    page_path: path
                });
            }
        }
    }

    // ============================================================================
    // TUTORIAL SYSTEM
    // ============================================================================

    class Tutorial {
        static show() {
            const settings = Settings.load();
            if (settings.tutorialCompleted || !CONFIG.SHOW_TUTORIAL) return;

            const overlay = document.createElement('div');
            overlay.id = 'tutorial-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            `;

            overlay.innerHTML = `
                <div style="
                    background: rgba(20, 40, 20, 0.95);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(107, 184, 90, 0.3);
                    border-radius: 12px;
                    padding: 2rem;
                    max-width: 500px;
                    text-align: center;
                    color: white;
                ">
                    <h2 style="color: #6bb85a; margin-bottom: 1rem;">Welcome to the Rainforest!</h2>
                    <p style="margin-bottom: 1.5rem; line-height: 1.6;">
                        Watch as a living ecosystem grows before your eyes. Trees will sprout and grow,
                        weather will change, and nature will evolve.<br><br>
                        <strong>Time flows fast here:</strong> 1 real minute = 1 simulation day<br><br>
                        Use the controls to explore different views, speed up time, or interact with the ecosystem.
                    </p>
                    <button onclick="window.ProductionEnhancements.Tutorial.skip()" style="
                        background: rgba(107, 184, 90, 0.2);
                        border: 1px solid rgba(107, 184, 90, 0.5);
                        color: white;
                        padding: 0.8rem 1.5rem;
                        border-radius: 6px;
                        cursor: pointer;
                        margin-right: 0.5rem;
                    ">Skip</button>
                    <button onclick="window.ProductionEnhancements.Tutorial.start()" style="
                        background: #6bb85a;
                        border: none;
                        color: white;
                        padding: 0.8rem 1.5rem;
                        border-radius: 6px;
                        cursor: pointer;
                    ">Get Started</button>
                </div>
            `;

            document.body.appendChild(overlay);
            Analytics.track('tutorial_shown');
        }

        static skip() {
            this.close();
            Settings.save('tutorialCompleted', true);
            Analytics.track('tutorial_skipped');
        }

        static start() {
            this.close();
            Settings.save('tutorialCompleted', true);
            Analytics.track('tutorial_completed');
        }

        static close() {
            const overlay = document.getElementById('tutorial-overlay');
            if (overlay) overlay.remove();
        }
    }

    // ============================================================================
    // MOBILE DETECTION & WARNING
    // ============================================================================

    class MobileHandler {
        static showWarning() {
            if (!CONFIG.MOBILE_WARNING) return;
            if (!CompatibilityChecker.isMobile()) return;

            const settings = Settings.load();
            if (settings.mobileWarningDismissed) return;

            const warning = document.createElement('div');
            warning.id = 'mobile-warning';
            warning.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(20, 40, 20, 0.95);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(107, 184, 90, 0.3);
                border-radius: 12px;
                padding: 2rem;
                max-width: 400px;
                z-index: 9998;
                color: white;
                text-align: center;
            `;

            warning.innerHTML = `
                <h3 style="color: #6bb85a; margin-bottom: 1rem;">Mobile Device Detected</h3>
                <p style="margin-bottom: 1.5rem;">
                    This simulation is optimized for desktop browsers. Performance on mobile
                    devices may be limited due to the intensive 3D graphics.
                </p>
                <button onclick="window.ProductionEnhancements.MobileHandler.dismiss()" style="
                    background: #6bb85a;
                    border: none;
                    color: white;
                    padding: 0.8rem 1.5rem;
                    border-radius: 6px;
                    cursor: pointer;
                    width: 100%;
                ">I Understand</button>
            `;

            document.body.appendChild(warning);
            Analytics.track('mobile_warning_shown');
        }

        static dismiss() {
            const warning = document.getElementById('mobile-warning');
            if (warning) warning.remove();
            Settings.save('mobileWarningDismissed', true);
            Analytics.track('mobile_warning_dismissed');
        }
    }

    // ============================================================================
    // SCREENSHOT UTILITY
    // ============================================================================

    class Screenshot {
        static capture() {
            if (!window.renderer) {
                ErrorHandler.showUserError('Screenshot Failed', 'Renderer not ready');
                return;
            }

            try {
                window.renderer.domElement.toBlob(function(blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `rainforest-${Date.now()}.png`;
                    a.click();
                    URL.revokeObjectURL(url);

                    ErrorHandler.showUserError('Screenshot Saved', 'Check your downloads folder');
                    Analytics.track('screenshot_captured');
                });
            } catch (e) {
                ErrorHandler.showUserError('Screenshot Failed', e.message);
            }
        }
    }

    // ============================================================================
    // KEYBOARD SHORTCUTS
    // ============================================================================

    class KeyboardShortcuts {
        static init() {
            document.addEventListener('keydown', (e) => {
                // Don't trigger if user is typing
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

                switch(e.key.toLowerCase()) {
                    case 'h':
                        this.showHelp();
                        break;
                    case 'p':
                        Screenshot.capture();
                        break;
                    case 'f':
                        this.toggleFullscreen();
                        break;
                    case 'escape':
                        // Handled by main app
                        break;
                }
            });
        }

        static showHelp() {
            alert(`Rainforest Simulation Help\n\n` +
                  `Keyboard Shortcuts:\n` +
                  `H - Show this help\n` +
                  `P - Take screenshot\n` +
                  `F - Toggle fullscreen\n` +
                  `ESC - Exit first person mode\n\n` +
                  `Mouse Controls:\n` +
                  `Left click + drag - Rotate camera (bird's eye)\n` +
                  `Right click + drag - Pan camera\n` +
                  `Scroll - Zoom in/out\n\n` +
                  `Version: ${CONFIG.VERSION}`);
            Analytics.track('help_viewed');
        }

        static toggleFullscreen() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
                Analytics.track('fullscreen_entered');
            } else {
                document.exitFullscreen();
                Analytics.track('fullscreen_exited');
            }
        }
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    class ProductionEnhancements {
        static init() {
            console.log(`[Production Enhancements] Initializing v${CONFIG.VERSION}`);

            // Check compatibility first
            const compat = CompatibilityChecker.check();
            if (!compat.webgl) return; // Fatal error, don't continue

            // Initialize all systems
            ErrorHandler.init();
            Analytics.init();
            KeyboardShortcuts.init();

            // Create performance monitor
            window.performanceMonitor = new PerformanceMonitor();

            // Show mobile warning if needed
            setTimeout(() => MobileHandler.showWarning(), 500);

            // Show tutorial after loading
            setTimeout(() => Tutorial.show(), 2000);

            // Track session start
            Analytics.track('session_start', {
                mobile: compat.mobile,
                performance: compat.performance,
                webgl2: compat.webgl2
            });

            // Expose API
            window.ProductionEnhancements = {
                Tutorial,
                MobileHandler,
                Screenshot,
                Settings,
                Analytics,
                ErrorHandler,
                PerformanceMonitor,
                version: CONFIG.VERSION
            };

            console.log('[Production Enhancements] Ready');
        }
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => ProductionEnhancements.init());
    } else {
        ProductionEnhancements.init();
    }

})();
