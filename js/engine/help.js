// Help/Keyboard Shortcuts Modal for Planet Eden

export class HelpSystem {
    constructor() {
        this.modal = null;
        this.visible = false;
    }

    init() {
        this.createModal();
        this.setupKeyboard();
        console.log('[HelpSystem] Initialized');
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.id = 'help-modal';
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

        this.modal.innerHTML = `
            <div style="
                background: rgba(20, 30, 20, 0.95);
                border: 2px solid #4a0;
                border-radius: 12px;
                padding: 30px;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                color: #fff;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            ">
                <h2 style="color: #8f8; margin: 0 0 20px 0; text-align: center; font-size: 24px;">
                    🌍 Planet Eden - Controls
                </h2>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <h3 style="color: #4a0; margin: 0 0 10px 0; font-size: 14px;">SIMULATION</h3>
                        <div style="font-size: 12px; line-height: 1.8; color: #aaa;">
                            <div><span style="color: #8f8; display: inline-block; width: 60px;">SPACE</span> Pause / Resume</div>
                            <div><span style="color: #8f8; display: inline-block; width: 60px;">+ / -</span> Speed up / down</div>
                            <div><span style="color: #8f8; display: inline-block; width: 60px;">1-4</span> Spawn organisms</div>
                        </div>
                    </div>

                    <div>
                        <h3 style="color: #4a0; margin: 0 0 10px 0; font-size: 14px;">CAMERA</h3>
                        <div style="font-size: 12px; line-height: 1.8; color: #aaa;">
                            <div><span style="color: #8f8; display: inline-block; width: 60px;">← →</span> Rotate</div>
                            <div><span style="color: #8f8; display: inline-block; width: 60px;">↑ ↓</span> Zoom</div>
                            <div><span style="color: #8f8; display: inline-block; width: 60px;">R</span> Reset camera</div>
                            <div><span style="color: #8f8; display: inline-block; width: 60px;">C</span> Follow creature</div>
                        </div>
                    </div>

                    <div>
                        <h3 style="color: #4a0; margin: 0 0 10px 0; font-size: 14px;">PANELS</h3>
                        <div style="font-size: 12px; line-height: 1.8; color: #aaa;">
                            <div><span style="color: #8f8; display: inline-block; width: 60px;">T</span> Tribes panel</div>
                            <div><span style="color: #8f8; display: inline-block; width: 60px;">H</span> Help panels</div>
                            <div><span style="color: #8f8; display: inline-block; width: 60px;">O</span> Objectives</div>
                            <div><span style="color: #8f8; display: inline-block; width: 60px;">L</span> Event log</div>
                            <div><span style="color: #8f8; display: inline-block; width: 60px;">G</span> Population graph</div>
                        </div>
                    </div>

                    <div>
                        <h3 style="color: #4a0; margin: 0 0 10px 0; font-size: 14px;">TOOLS</h3>
                        <div style="font-size: 12px; line-height: 1.8; color: #aaa;">
                            <div><span style="color: #8f8; display: inline-block; width: 60px;">M</span> Toggle audio</div>
                            <div><span style="color: #8f8; display: inline-block; width: 60px;">P</span> Screenshot</div>
                            <div><span style="color: #8f8; display: inline-block; width: 60px;">I</span> Debug info</div>
                            <div><span style="color: #8f8; display: inline-block; width: 60px;">?</span> This help</div>
                        </div>
                    </div>

                    <div style="grid-column: span 2;">
                        <h3 style="color: #4a0; margin: 0 0 10px 0; font-size: 14px;">GOD POWERS</h3>
                        <div style="font-size: 12px; line-height: 1.8; color: #aaa; display: grid; grid-template-columns: 1fr 1fr; gap: 0 20px;">
                            <div><span style="color: #8f8; display: inline-block; width: 40px;">F1</span> New tribe</div>
                            <div><span style="color: #8f8; display: inline-block; width: 40px;">F2</span> Mass spawn</div>
                            <div><span style="color: #8f8; display: inline-block; width: 40px;">F3</span> Gift resources</div>
                            <div><span style="color: #8f8; display: inline-block; width: 40px;">F4</span> Trigger war</div>
                            <div><span style="color: #8f8; display: inline-block; width: 40px;">F5</span> Plague</div>
                            <div><span style="color: #8f8; display: inline-block; width: 40px;">F6</span> Divine blessing</div>
                        </div>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 20px; color: #666; font-size: 11px;">
                    Press <span style="color: #8f8;">?</span> or <span style="color: #8f8;">ESC</span> to close
                </div>
            </div>
        `;

        this.modal.onclick = (e) => {
            if (e.target === this.modal) this.hide();
        };

        document.body.appendChild(this.modal);
    }

    setupKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
                this.toggle();
            } else if (e.key === 'Escape' && this.visible) {
                this.hide();
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
        this.modal.style.display = 'flex';
        this.visible = true;
    }

    hide() {
        this.modal.style.display = 'none';
        this.visible = false;
    }
}

// Singleton
export const helpSystem = new HelpSystem();
