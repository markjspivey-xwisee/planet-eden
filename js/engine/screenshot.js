// Screenshot and Share System for Planet Eden
// Captures moments and allows sharing

export class ScreenshotSystem {
    constructor(renderer) {
        this.renderer = renderer;
        this.container = null;
        this.previewModal = null;
        this.lastScreenshot = null;
    }

    init() {
        this.createUI();
        this.setupKeyboard();
        console.log('[ScreenshotSystem] Initialized');
    }

    createUI() {
        // Skip UI creation if new HUD is active
        if (window.PLANET_EDEN_USE_NEW_HUD) {
            console.log('[ScreenshotSystem] Skipping old UI - using new HUD');
            return;
        }

        // Screenshot button
        const btn = document.createElement('button');
        btn.id = 'screenshot-btn';
        btn.innerHTML = '📷';
        btn.title = 'Take Screenshot (P)';
        btn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 36px;
            height: 36px;
            background: rgba(0, 0, 0, 0.6);
            border: 1px solid rgba(100, 200, 100, 0.2);
            border-radius: 50%;
            color: #fff;
            font-size: 16px;
            cursor: pointer;
            z-index: 1001;
            transition: all 0.2s;
            opacity: 0.7;
        `;
        btn.onmouseover = () => { btn.style.background = 'rgba(50, 100, 50, 0.8)'; btn.style.opacity = '1'; };
        btn.onmouseout = () => { btn.style.background = 'rgba(0, 0, 0, 0.6)'; btn.style.opacity = '0.7'; };
        btn.onclick = () => this.capture();
        document.body.appendChild(btn);

        // Preview modal (hidden)
        this.previewModal = document.createElement('div');
        this.previewModal.id = 'screenshot-modal';
        this.previewModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 2000;
            display: none;
            justify-content: center;
            align-items: center;
            flex-direction: column;
        `;
        this.previewModal.innerHTML = `
            <div style="text-align: center; max-width: 90%; max-height: 90%;">
                <img id="screenshot-preview" style="max-width: 100%; max-height: 70vh; border: 2px solid #4a0; border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
                <div style="margin-top: 20px; display: flex; gap: 15px; justify-content: center;">
                    <button id="screenshot-download" style="padding: 12px 24px; background: #4a0; border: none; border-radius: 6px; color: #fff; font-size: 16px; cursor: pointer;">
                        💾 Download
                    </button>
                    <button id="screenshot-copy" style="padding: 12px 24px; background: #048; border: none; border-radius: 6px; color: #fff; font-size: 16px; cursor: pointer;">
                        📋 Copy
                    </button>
                    <button id="screenshot-close" style="padding: 12px 24px; background: #333; border: none; border-radius: 6px; color: #fff; font-size: 16px; cursor: pointer;">
                        ✕ Close
                    </button>
                </div>
                <div style="margin-top: 15px; color: #666; font-size: 12px;">
                    Press ESC or click outside to close
                </div>
            </div>
        `;
        document.body.appendChild(this.previewModal);

        // Modal events
        document.getElementById('screenshot-download').onclick = () => this.download();
        document.getElementById('screenshot-copy').onclick = () => this.copyToClipboard();
        document.getElementById('screenshot-close').onclick = () => this.closeModal();
        this.previewModal.onclick = (e) => {
            if (e.target === this.previewModal) this.closeModal();
        };
    }

    setupKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'p' || e.key === 'P') {
                this.capture();
            }
            if (e.key === 'Escape' && this.previewModal.style.display === 'flex') {
                this.closeModal();
            }
        });
    }

    capture() {
        if (!this.renderer || !this.renderer.renderer) {
            console.error('[ScreenshotSystem] Renderer not available');
            return;
        }

        // Flash effect
        this.flashScreen();

        // Get canvas data
        const canvas = this.renderer.renderer.domElement;

        // Force a render to ensure latest frame
        this.renderer.render();

        // Create screenshot with stats overlay
        this.createScreenshotWithOverlay(canvas);
    }

    flashScreen() {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            z-index: 9999;
            opacity: 0.8;
            pointer-events: none;
            animation: flashFade 0.3s ease-out forwards;
        `;

        // Add animation
        if (!document.getElementById('flash-style')) {
            const style = document.createElement('style');
            style.id = 'flash-style';
            style.textContent = `
                @keyframes flashFade {
                    0% { opacity: 0.8; }
                    100% { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 300);
    }

    createScreenshotWithOverlay(canvas) {
        // Create a composite canvas
        const composite = document.createElement('canvas');
        composite.width = canvas.width;
        composite.height = canvas.height;
        const ctx = composite.getContext('2d');

        // Draw the 3D scene
        ctx.drawImage(canvas, 0, 0);

        // Add watermark/branding
        ctx.font = 'bold 24px "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'left';
        ctx.fillText('🌍 Planet Eden', 20, 40);

        ctx.font = '14px "Segoe UI", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText(new Date().toLocaleString(), 20, 60);

        // Add stats if available
        const statsPanel = document.getElementById('stats-panel');
        if (statsPanel) {
            // Get current stats from the panel
            const organisms = document.getElementById('stat-organisms')?.textContent || '?';
            const tribes = document.getElementById('stat-tribes')?.textContent || '?';

            ctx.font = '12px "Courier New", monospace';
            ctx.fillStyle = 'rgba(100, 255, 100, 0.7)';
            ctx.textAlign = 'right';
            ctx.fillText(`Pop: ${organisms} | Tribes: ${tribes}`, canvas.width - 20, canvas.height - 20);
        }

        // Store and show
        this.lastScreenshot = composite.toDataURL('image/png');
        this.showPreview();
    }

    showPreview() {
        const preview = document.getElementById('screenshot-preview');
        preview.src = this.lastScreenshot;
        this.previewModal.style.display = 'flex';
    }

    closeModal() {
        this.previewModal.style.display = 'none';
    }

    download() {
        if (!this.lastScreenshot) return;

        const link = document.createElement('a');
        link.download = `planet-eden-${Date.now()}.png`;
        link.href = this.lastScreenshot;
        link.click();

        console.log('[ScreenshotSystem] Downloaded screenshot');
    }

    async copyToClipboard() {
        if (!this.lastScreenshot) return;

        try {
            // Convert data URL to blob
            const response = await fetch(this.lastScreenshot);
            const blob = await response.blob();

            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);

            // Show feedback
            const copyBtn = document.getElementById('screenshot-copy');
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '✓ Copied!';
            copyBtn.style.background = '#0a0';
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.style.background = '#048';
            }, 2000);

            console.log('[ScreenshotSystem] Copied to clipboard');
        } catch (err) {
            console.error('[ScreenshotSystem] Failed to copy:', err);
            alert('Failed to copy to clipboard. Try downloading instead.');
        }
    }
}
