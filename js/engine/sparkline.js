// Population Sparkline Graph for Planet Eden
// Real-time mini graph showing population trends

export class SparklineGraph {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.container = null;

        // Data storage
        this.history = {
            total: [],
            plants: [],
            herbivores: [],
            carnivores: [],
            humanoids: []
        };

        this.maxDataPoints = 120; // 2 minutes at 1 sample/sec
        this.sampleInterval = 1000; // ms
        this.lastSample = 0;

        // Colors
        this.colors = {
            total: '#8f8',
            plants: '#4a0',
            herbivores: '#ff0',
            carnivores: '#f60',
            humanoids: '#08f'
        };

        // Display mode
        this.showMode = 'all'; // 'all', 'total', 'breakdown'
        this.visible = true;
    }

    init() {
        this.createUI();
        console.log('[Sparkline] Initialized');
    }

    createUI() {
        // Skip UI creation if new HUD is active
        if (window.PLANET_EDEN_USE_NEW_HUD) {
            console.log('[Sparkline] Skipping old UI - using new HUD');
            return;
        }

        // Container - hidden by default, press G to toggle
        // Positioned above the screenshot/audio buttons
        this.container = document.createElement('div');
        this.container.id = 'sparkline-container';
        this.container.style.cssText = `
            position: fixed;
            bottom: 70px;
            right: 20px;
            width: 200px;
            background: rgba(0, 0, 0, 0.85);
            border: 1px solid rgba(100, 200, 100, 0.3);
            border-radius: 8px;
            padding: 10px;
            z-index: 999;
            font-family: 'Segoe UI', sans-serif;
            display: none;
        `;
        this.visible = false;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            color: #8f8;
            font-size: 11px;
        `;
        header.innerHTML = `
            <span>POPULATION</span>
            <button id="sparkline-toggle" style="background: none; border: none; color: #666; cursor: pointer; font-size: 10px;">toggle</button>
        `;
        this.container.appendChild(header);

        // Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = 180;
        this.canvas.height = 60;
        this.canvas.style.cssText = `
            background: rgba(0, 0, 0, 0.5);
            border-radius: 4px;
        `;
        this.container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // Legend
        const legend = document.createElement('div');
        legend.id = 'sparkline-legend';
        legend.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 8px;
            font-size: 9px;
        `;
        legend.innerHTML = `
            <span style="color: ${this.colors.plants};">● Plants</span>
            <span style="color: ${this.colors.herbivores};">● Herb</span>
            <span style="color: ${this.colors.carnivores};">● Carn</span>
            <span style="color: ${this.colors.humanoids};">● Human</span>
        `;
        this.container.appendChild(legend);

        // Current values
        const values = document.createElement('div');
        values.id = 'sparkline-values';
        values.style.cssText = `
            display: flex;
            justify-content: space-between;
            margin-top: 6px;
            font-size: 10px;
            color: #666;
        `;
        values.innerHTML = `<span>Total: <span id="spark-total" style="color: #8f8;">0</span></span>`;
        this.container.appendChild(values);

        document.body.appendChild(this.container);

        // Toggle button
        document.getElementById('sparkline-toggle').onclick = () => this.cycleMode();

        // Keyboard shortcut
        window.addEventListener('keydown', (e) => {
            if (e.key === 'g' || e.key === 'G') {
                this.toggle();
            }
        });
    }

    toggle() {
        this.visible = !this.visible;
        this.container.style.display = this.visible ? 'block' : 'none';
    }

    cycleMode() {
        const modes = ['all', 'total', 'breakdown'];
        const idx = modes.indexOf(this.showMode);
        this.showMode = modes[(idx + 1) % modes.length];
        this.draw();
    }

    // Sample current population
    sample(stats, typeCounts) {
        const now = Date.now();
        if (now - this.lastSample < this.sampleInterval) return;
        this.lastSample = now;

        // Add data points
        this.history.total.push(stats.aliveCount);
        this.history.plants.push(typeCounts.plants || 0);
        this.history.herbivores.push(typeCounts.herbivores || 0);
        this.history.carnivores.push(typeCounts.carnivores || 0);
        this.history.humanoids.push(typeCounts.humanoids || 0);

        // Trim to max length
        Object.values(this.history).forEach(arr => {
            while (arr.length > this.maxDataPoints) arr.shift();
        });

        // Update display (skip if UI not created)
        const sparkTotal = document.getElementById('spark-total');
        if (sparkTotal) {
            sparkTotal.textContent = stats.aliveCount;
        }

        this.draw();
    }

    draw() {
        if (!this.ctx || !this.visible) return;

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear
        ctx.clearRect(0, 0, w, h);

        // Find max value for scaling
        let maxVal = 10;
        Object.values(this.history).forEach(arr => {
            arr.forEach(v => { if (v > maxVal) maxVal = v; });
        });

        // Draw grid lines
        ctx.strokeStyle = 'rgba(100, 200, 100, 0.1)';
        ctx.lineWidth = 1;
        for (let y = 0; y < h; y += h / 4) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Draw sparklines based on mode
        if (this.showMode === 'all' || this.showMode === 'breakdown') {
            this.drawLine(this.history.plants, this.colors.plants, maxVal, 0.8);
            this.drawLine(this.history.herbivores, this.colors.herbivores, maxVal, 0.8);
            this.drawLine(this.history.carnivores, this.colors.carnivores, maxVal, 0.8);
            this.drawLine(this.history.humanoids, this.colors.humanoids, maxVal, 0.8);
        }

        if (this.showMode === 'all' || this.showMode === 'total') {
            this.drawLine(this.history.total, this.colors.total, maxVal, 1.5);
        }

        // Draw max label
        ctx.fillStyle = 'rgba(100, 200, 100, 0.5)';
        ctx.font = '9px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(maxVal.toString(), w - 2, 10);
    }

    drawLine(data, color, maxVal, lineWidth = 1) {
        if (data.length < 2) return;

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const padding = 2;

        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();

        data.forEach((val, i) => {
            const x = padding + (i / (this.maxDataPoints - 1)) * (w - padding * 2);
            const y = h - padding - (val / maxVal) * (h - padding * 2);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();
    }

    // Get type counts from organism data
    static countTypes(wasmModule) {
        const data = wasmModule.getOrganismData();
        if (!data) return { plants: 0, herbivores: 0, carnivores: 0, humanoids: 0 };

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

        return counts;
    }
}

// Singleton
export const sparklineGraph = new SparklineGraph();
