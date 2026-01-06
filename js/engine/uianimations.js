// UI Animations System for Planet Eden
// Smooth, professional panel animations for AAA feel

export class UIAnimations {
    constructor() {
        this.animationQueue = [];
        this.isAnimating = false;
        this.audioSystem = null;
    }

    init() {
        this.injectStyles();
        this.setupPanelAnimations();
        console.log('[UIAnimations] Initialized');
    }

    // Connect audio system for UI sounds
    setAudioSystem(audioSystem) {
        this.audioSystem = audioSystem;
    }

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Panel Animation Styles */
            .hud-panel {
                transform: translateX(0);
                opacity: 1;
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                            opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }

            /* Left panels slide from left */
            .hud-panel.slide-in-left {
                animation: slideInLeft 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }

            .hud-panel.slide-out-left {
                animation: slideOutLeft 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }

            /* Right panels slide from right */
            .hud-panel.slide-in-right {
                animation: slideInRight 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }

            .hud-panel.slide-out-right {
                animation: slideOutRight 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }

            /* Top panels slide from top */
            .hud-panel.slide-in-top {
                animation: slideInTop 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }

            .hud-panel.slide-out-top {
                animation: slideOutTop 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }

            /* Bottom panels slide from bottom */
            .hud-panel.slide-in-bottom {
                animation: slideInBottom 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }

            .hud-panel.slide-out-bottom {
                animation: slideOutBottom 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            }

            /* Fade animations */
            .hud-panel.fade-in {
                animation: fadeIn 0.3s ease-out forwards;
            }

            .hud-panel.fade-out {
                animation: fadeOut 0.2s ease-out forwards;
            }

            /* Scale pop animation for important panels */
            .hud-panel.pop-in {
                animation: popIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            }

            .hud-panel.pop-out {
                animation: popOut 0.2s ease-in forwards;
            }

            /* Keyframes */
            @keyframes slideInLeft {
                from {
                    transform: translateX(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes slideOutLeft {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(-100%);
                    opacity: 0;
                }
            }

            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }

            @keyframes slideInTop {
                from {
                    transform: translateY(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }

            @keyframes slideOutTop {
                from {
                    transform: translateY(0);
                    opacity: 1;
                }
                to {
                    transform: translateY(-100%);
                    opacity: 0;
                }
            }

            @keyframes slideInBottom {
                from {
                    transform: translateY(100%);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }

            @keyframes slideOutBottom {
                from {
                    transform: translateY(0);
                    opacity: 1;
                }
                to {
                    transform: translateY(100%);
                    opacity: 0;
                }
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }

            @keyframes popIn {
                from {
                    transform: scale(0.8);
                    opacity: 0;
                }
                60% {
                    transform: scale(1.05);
                    opacity: 1;
                }
                to {
                    transform: scale(1);
                    opacity: 1;
                }
            }

            @keyframes popOut {
                from {
                    transform: scale(1);
                    opacity: 1;
                }
                to {
                    transform: scale(0.8);
                    opacity: 0;
                }
            }

            /* Hover effects for interactive elements */
            .hud-panel .clickable {
                transition: transform 0.15s ease, background 0.15s ease;
            }

            .hud-panel .clickable:hover {
                transform: scale(1.02);
            }

            .hud-panel .clickable:active {
                transform: scale(0.98);
            }

            /* Button press effect */
            .btn-animate {
                transition: transform 0.1s ease, box-shadow 0.1s ease;
            }

            .btn-animate:active {
                transform: scale(0.95);
                box-shadow: 0 0 5px rgba(0, 255, 0, 0.5);
            }

            /* Pulse effect for notifications */
            @keyframes pulse {
                0%, 100% {
                    box-shadow: 0 0 0 0 rgba(0, 255, 0, 0.4);
                }
                50% {
                    box-shadow: 0 0 0 10px rgba(0, 255, 0, 0);
                }
            }

            .pulse {
                animation: pulse 2s infinite;
            }

            /* Shimmer effect for loading states */
            @keyframes shimmer {
                0% {
                    background-position: -200% 0;
                }
                100% {
                    background-position: 200% 0;
                }
            }

            .shimmer {
                background: linear-gradient(
                    90deg,
                    rgba(255, 255, 255, 0) 0%,
                    rgba(255, 255, 255, 0.1) 50%,
                    rgba(255, 255, 255, 0) 100%
                );
                background-size: 200% 100%;
                animation: shimmer 1.5s infinite;
            }

            /* Stagger children animation */
            .stagger-children > * {
                opacity: 0;
                animation: fadeInUp 0.3s ease-out forwards;
            }

            .stagger-children > *:nth-child(1) { animation-delay: 0.05s; }
            .stagger-children > *:nth-child(2) { animation-delay: 0.1s; }
            .stagger-children > *:nth-child(3) { animation-delay: 0.15s; }
            .stagger-children > *:nth-child(4) { animation-delay: 0.2s; }
            .stagger-children > *:nth-child(5) { animation-delay: 0.25s; }
            .stagger-children > *:nth-child(6) { animation-delay: 0.3s; }
            .stagger-children > *:nth-child(7) { animation-delay: 0.35s; }
            .stagger-children > *:nth-child(8) { animation-delay: 0.4s; }

            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            /* Tooltip animation */
            .tooltip {
                opacity: 0;
                transform: translateY(5px);
                transition: opacity 0.2s ease, transform 0.2s ease;
            }

            .tooltip.visible {
                opacity: 1;
                transform: translateY(0);
            }
        `;
        document.head.appendChild(style);
    }

    setupPanelAnimations() {
        // Add animation hooks to existing toggle functions
        // This will be called from the main application when panels toggle
    }

    // Animate panel show
    showPanel(panelId, direction = 'auto') {
        const panel = document.getElementById(panelId);
        if (!panel) return;

        // Determine animation direction based on panel position
        if (direction === 'auto') {
            const rect = panel.getBoundingClientRect();
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;

            if (rect.left < centerX - 100) direction = 'left';
            else if (rect.right > centerX + 100) direction = 'right';
            else if (rect.top < centerY) direction = 'top';
            else direction = 'bottom';
        }

        // Remove any existing animation classes
        this.clearAnimationClasses(panel);

        // Show panel and add animation
        panel.style.display = 'block';
        panel.classList.add(`slide-in-${direction}`);

        // Play panel open sound
        if (this.audioSystem) {
            this.audioSystem.playPanelOpen();
        }

        // Clean up after animation
        panel.addEventListener('animationend', () => {
            this.clearAnimationClasses(panel);
        }, { once: true });
    }

    // Animate panel hide
    hidePanel(panelId, direction = 'auto') {
        const panel = document.getElementById(panelId);
        if (!panel) return;

        // Determine animation direction based on panel position
        if (direction === 'auto') {
            const rect = panel.getBoundingClientRect();
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;

            if (rect.left < centerX - 100) direction = 'left';
            else if (rect.right > centerX + 100) direction = 'right';
            else if (rect.top < centerY) direction = 'top';
            else direction = 'bottom';
        }

        // Remove any existing animation classes
        this.clearAnimationClasses(panel);

        // Add animation
        panel.classList.add(`slide-out-${direction}`);

        // Play panel close sound
        if (this.audioSystem) {
            this.audioSystem.playPanelClose();
        }

        // Hide panel after animation
        panel.addEventListener('animationend', () => {
            panel.style.display = 'none';
            this.clearAnimationClasses(panel);
        }, { once: true });
    }

    // Toggle panel with animation
    togglePanel(panelId, direction = 'auto') {
        const panel = document.getElementById(panelId);
        if (!panel) return;

        const isVisible = panel.style.display !== 'none' &&
                         getComputedStyle(panel).display !== 'none';

        if (isVisible) {
            this.hidePanel(panelId, direction);
        } else {
            this.showPanel(panelId, direction);
        }
    }

    // Clear all animation classes from panel
    clearAnimationClasses(panel) {
        const classes = [
            'slide-in-left', 'slide-out-left',
            'slide-in-right', 'slide-out-right',
            'slide-in-top', 'slide-out-top',
            'slide-in-bottom', 'slide-out-bottom',
            'fade-in', 'fade-out',
            'pop-in', 'pop-out'
        ];
        panel.classList.remove(...classes);
    }

    // Pop animation for modal-like panels
    popIn(panelId) {
        const panel = document.getElementById(panelId);
        if (!panel) return;

        this.clearAnimationClasses(panel);
        panel.style.display = 'block';
        panel.classList.add('pop-in');

        panel.addEventListener('animationend', () => {
            this.clearAnimationClasses(panel);
        }, { once: true });
    }

    popOut(panelId) {
        const panel = document.getElementById(panelId);
        if (!panel) return;

        this.clearAnimationClasses(panel);
        panel.classList.add('pop-out');

        panel.addEventListener('animationend', () => {
            panel.style.display = 'none';
            this.clearAnimationClasses(panel);
        }, { once: true });
    }

    // Add pulse effect to element
    addPulse(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add('pulse');
        }
    }

    removePulse(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('pulse');
        }
    }

    // Add stagger animation to children
    staggerChildren(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.classList.add('stagger-children');
        }
    }
}

// Singleton
export const uiAnimations = new UIAnimations();
