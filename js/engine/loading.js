// Loading Screen System for Planet Eden
// AAA-quality loading experience with animated logo and gameplay tips

export class LoadingScreen {
    constructor() {
        this.overlay = null;
        this.progressBar = null;
        this.tipElement = null;
        this.progress = 0;
        this.currentTipIndex = 0;
        this.tipInterval = null;
        this.isVisible = true;

        // Gameplay tips shown during loading
        this.tips = [
            "Herbivores eat plants to survive. Plants regrow over time.",
            "Carnivores hunt herbivores - they're essential for ecosystem balance.",
            "Press SPACE to pause the simulation and observe your world.",
            "Use + and - keys to speed up or slow down time.",
            "Click on any organism to see detailed stats and neural network.",
            "Tribes build structures and gather resources together.",
            "Watch for the day/night cycle - organisms behave differently at night.",
            "Humanoids can chop trees for wood and mine rocks for stone.",
            "Press F1 to create a new tribe in your world.",
            "Each organism has unique genetics that affect their behavior.",
            "Rain helps plants grow faster - watch for weather changes!",
            "Press T to see tribe statistics and resources.",
            "Buildings provide shelter and storage for tribe members.",
            "Use arrow keys to rotate the planet and explore your world.",
            "Press R to reset the camera to its default position.",
            "Organisms with more energy live longer and reproduce more.",
            "Press G to view the population graph over time.",
            "Carnivores turn red when attacking - watch the food chain!",
            "The sun orbits the planet - time passes as it moves.",
            "Press ? to see all keyboard shortcuts and controls."
        ];
    }

    init() {
        // Immediately hide old loading screen to prevent flash
        const oldLoading = document.getElementById('loading');
        if (oldLoading) {
            oldLoading.style.display = 'none';
        }

        this.createOverlay();
        this.startTipRotation();
        console.log('[LoadingScreen] Initialized');
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'loading-screen';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #0a1a0a 0%, #1a2a1a 50%, #0a1a0a 100%);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            transition: opacity 0.8s ease-out;
        `;

        this.overlay.innerHTML = `
            <style>
                @keyframes planetSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 0.8; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.05); }
                }
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                #loading-planet {
                    width: 120px;
                    height: 120px;
                    border-radius: 50%;
                    background: radial-gradient(circle at 30% 30%,
                        #4a8 0%,
                        #385 30%,
                        #263 60%,
                        #152 100%);
                    box-shadow:
                        inset -20px -20px 40px rgba(0,0,0,0.5),
                        0 0 60px rgba(100, 200, 100, 0.3),
                        0 0 100px rgba(100, 200, 100, 0.1);
                    animation: planetSpin 20s linear infinite;
                    position: relative;
                    margin-bottom: 40px;
                }
                #loading-planet::before {
                    content: '';
                    position: absolute;
                    top: 10%;
                    left: 20%;
                    width: 25%;
                    height: 15%;
                    background: rgba(100, 180, 100, 0.4);
                    border-radius: 50%;
                    filter: blur(3px);
                }
                #loading-planet::after {
                    content: '';
                    position: absolute;
                    top: 40%;
                    right: 15%;
                    width: 30%;
                    height: 20%;
                    background: rgba(80, 160, 80, 0.3);
                    border-radius: 50%;
                    filter: blur(4px);
                }
                #loading-title {
                    color: #8f8;
                    font-size: 2.5rem;
                    font-weight: 300;
                    letter-spacing: 8px;
                    margin-bottom: 10px;
                    text-shadow: 0 0 20px rgba(100, 255, 100, 0.5);
                    animation: pulse 2s ease-in-out infinite;
                }
                #loading-subtitle {
                    color: #6a6;
                    font-size: 1rem;
                    letter-spacing: 4px;
                    margin-bottom: 50px;
                    opacity: 0.8;
                }
                #loading-progress-container {
                    width: 300px;
                    height: 4px;
                    background: rgba(100, 255, 100, 0.1);
                    border-radius: 2px;
                    overflow: hidden;
                    margin-bottom: 30px;
                }
                #loading-progress-bar {
                    width: 0%;
                    height: 100%;
                    background: linear-gradient(90deg, #4a8, #8f8, #4a8);
                    background-size: 200% 100%;
                    animation: shimmer 1.5s linear infinite;
                    transition: width 0.3s ease-out;
                    border-radius: 2px;
                }
                #loading-status {
                    color: #6a6;
                    font-size: 0.9rem;
                    margin-bottom: 40px;
                    min-height: 1.2em;
                }
                #loading-tip-container {
                    max-width: 500px;
                    text-align: center;
                    padding: 20px;
                    border: 1px solid rgba(100, 255, 100, 0.2);
                    border-radius: 8px;
                    background: rgba(0, 0, 0, 0.3);
                }
                #loading-tip-label {
                    color: #4a8;
                    font-size: 0.75rem;
                    letter-spacing: 2px;
                    margin-bottom: 10px;
                    text-transform: uppercase;
                }
                #loading-tip {
                    color: #aaa;
                    font-size: 0.95rem;
                    line-height: 1.6;
                    min-height: 3em;
                    animation: fadeInUp 0.5s ease-out;
                }
            </style>

            <div id="loading-planet"></div>
            <div id="loading-title">PLANET EDEN</div>
            <div id="loading-subtitle">ECOSYSTEM SIMULATOR</div>
            <div id="loading-progress-container">
                <div id="loading-progress-bar"></div>
            </div>
            <div id="loading-status">Initializing...</div>
            <div id="loading-tip-container">
                <div id="loading-tip-label">Tip</div>
                <div id="loading-tip">${this.tips[0]}</div>
            </div>
        `;

        document.body.appendChild(this.overlay);
        this.progressBar = this.overlay.querySelector('#loading-progress-bar');
        this.tipElement = this.overlay.querySelector('#loading-tip');
        this.statusElement = this.overlay.querySelector('#loading-status');
    }

    startTipRotation() {
        // Rotate tips every 4 seconds
        this.tipInterval = setInterval(() => {
            this.currentTipIndex = (this.currentTipIndex + 1) % this.tips.length;
            if (this.tipElement) {
                // Fade out, change, fade in
                this.tipElement.style.opacity = '0';
                setTimeout(() => {
                    this.tipElement.textContent = this.tips[this.currentTipIndex];
                    this.tipElement.style.opacity = '1';
                }, 250);
            }
        }, 4000);
    }

    setProgress(progress, status = null) {
        this.progress = Math.min(100, Math.max(0, progress));

        if (this.progressBar) {
            this.progressBar.style.width = `${this.progress}%`;
        }

        if (status && this.statusElement) {
            this.statusElement.textContent = status;
        }
    }

    hide(callback) {
        if (!this.isVisible) return;

        this.isVisible = false;

        // Stop tip rotation
        if (this.tipInterval) {
            clearInterval(this.tipInterval);
            this.tipInterval = null;
        }

        // Set to 100% before fading out
        this.setProgress(100, 'Welcome to Planet Eden!');

        // Fade out after a brief delay
        setTimeout(() => {
            if (this.overlay) {
                this.overlay.style.opacity = '0';
                this.overlay.style.pointerEvents = 'none';

                // Remove from DOM after animation
                setTimeout(() => {
                    if (this.overlay && this.overlay.parentNode) {
                        this.overlay.parentNode.removeChild(this.overlay);
                        this.overlay = null;
                    }
                    if (callback) callback();
                }, 800);
            }
        }, 500);

        console.log('[LoadingScreen] Hiding');
    }

    // Show loading screen again (for restarts)
    show() {
        if (this.isVisible) return;

        this.isVisible = true;
        this.progress = 0;
        this.currentTipIndex = 0;

        this.createOverlay();
        this.startTipRotation();
        this.setProgress(0, 'Initializing...');

        // Force reflow then make visible
        this.overlay.offsetHeight;
        this.overlay.style.opacity = '1';
        this.overlay.style.pointerEvents = 'auto';

        console.log('[LoadingScreen] Showing');
    }

    dispose() {
        if (this.tipInterval) {
            clearInterval(this.tipInterval);
            this.tipInterval = null;
        }
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
            this.overlay = null;
        }
    }
}

// Singleton instance
export const loadingScreen = new LoadingScreen();
