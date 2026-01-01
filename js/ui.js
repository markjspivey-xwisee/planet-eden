/**
 * UI Module - User interface and notifications
 */

export function showNotification(msg) {
    const n = document.createElement('div');
    n.className = 'notification';
    n.textContent = msg;
    n.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, rgba(0, 40, 80, 0.95), rgba(0, 20, 50, 0.95));
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        border: 2px solid var(--border-bright, #00d4ff);
        font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 20px rgba(0, 200, 255, 0.3);
        animation: slideIn 0.3s ease-out;
    `;
    document.body.appendChild(n);
    setTimeout(() => {
        n.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => n.remove(), 300);
    }, 2700);
}

export function playSound(freq, duration) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = freq;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (e) {
        // Audio not supported, silently fail
    }
}

// Achievement tracking
const achievements = {
    firstCreature: { name: '🌱 First Life', desc: 'Spawn your first creature', unlocked: false },
    hundredCreatures: { name: '🌿 Thriving World', desc: 'Have 100+ organisms alive', unlocked: false },
    extinction: { name: '💀 Extinction Event', desc: 'Kill all organisms', unlocked: false },
    godOfLife: { name: '✨ God of Life', desc: 'Use Resurrect power', unlocked: false },
    meteorStrike: { name: '☄️ Divine Wrath', desc: 'Use Meteor Strike', unlocked: false },
    evolution100: { name: '🧬 Evolution Master', desc: 'Reach generation 100', unlocked: false },
    terraform: { name: '🏔️ World Shaper', desc: 'Use any terraform power', unlocked: false },
    balance: { name: '⚖️ Equilibrium', desc: 'Use Balance Ecosystem', unlocked: false },
    speedDemon: { name: '⚡ Speed Demon', desc: 'Run simulation at 5x speed', unlocked: false },
    observer: { name: '👁️ Observer', desc: 'Select and study an organism', unlocked: false }
};

export function checkAchievement(key) {
    if (!achievements[key].unlocked) {
        achievements[key].unlocked = true;
        showNotification(`🏆 Achievement: ${achievements[key].name}`);
        playSound(1200, 200);
    }
}

export function getAchievements() {
    return achievements;
}

// Population chart update
let populationChart = null;

export function initPopulationChart() {
    const canvas = document.getElementById('population-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    const ctx = canvas.getContext('2d');
    populationChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                { label: 'Plants', data: [], borderColor: '#4a8b2c', fill: false },
                { label: 'Herbivores', data: [], borderColor: '#8b6914', fill: false },
                { label: 'Carnivores', data: [], borderColor: '#8b0000', fill: false },
                { label: 'Humanoids', data: [], borderColor: '#6b5544', fill: false }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { display: true },
                y: { beginAtZero: true }
            },
            animation: { duration: 0 }
        }
    });
}

export function updatePopulationChart(time, counts) {
    if (!populationChart) return;

    populationChart.data.labels.push(Math.floor(time));
    populationChart.data.datasets[0].data.push(counts.plant || 0);
    populationChart.data.datasets[1].data.push(counts.herbivore || 0);
    populationChart.data.datasets[2].data.push(counts.carnivore || 0);
    populationChart.data.datasets[3].data.push(counts.humanoid || 0);

    // Keep only last 50 data points
    if (populationChart.data.labels.length > 50) {
        populationChart.data.labels.shift();
        populationChart.data.datasets.forEach(dataset => dataset.data.shift());
    }

    populationChart.update();
}

// Stats panel update
export function updateStatsPanel(organisms, selected, time) {
    const living = organisms.filter(o => !o.dead);
    const counts = { plant: 0, herbivore: 0, carnivore: 0, humanoid: 0 };
    let totalGeneration = 0;
    let genCount = 0;

    for (const o of living) {
        counts[o.type]++;
        if (o.type !== 'plant') {
            totalGeneration += o.generation;
            genCount++;
        }
    }

    const avgGen = genCount > 0 ? (totalGeneration / genCount).toFixed(1) : 0;

    document.getElementById('stat-time').textContent = Math.floor(time);
    document.getElementById('stat-plants').textContent = counts.plant;
    document.getElementById('stat-herbivores').textContent = counts.herbivore;
    document.getElementById('stat-carnivores').textContent = counts.carnivore;
    document.getElementById('stat-humanoids').textContent = counts.humanoid;
    document.getElementById('stat-total').textContent = living.length;
    document.getElementById('stat-avg-gen').textContent = avgGen;

    if (selected && !selected.dead) {
        document.getElementById('selected-id').textContent = selected.id;
        document.getElementById('selected-type').textContent = selected.type;
        document.getElementById('selected-energy').textContent = Math.floor(selected.energy);
        document.getElementById('selected-health').textContent = Math.floor(selected.health);
        document.getElementById('selected-age').textContent = Math.floor(selected.age);
        document.getElementById('selected-gen').textContent = selected.generation;
    }
}

// FPS counter
let lastFpsUpdate = 0;
let frameCount = 0;
let currentFps = 0;

export function updateFPS(delta) {
    frameCount++;
    lastFpsUpdate += delta;

    if (lastFpsUpdate >= 1) {
        currentFps = frameCount;
        const fpsEl = document.getElementById('fps-counter');
        if (fpsEl) {
            fpsEl.textContent = `${currentFps} FPS`;
            fpsEl.style.color = currentFps >= 50 ? '#0f0' : currentFps >= 30 ? '#ff0' : '#f00';
        }
        frameCount = 0;
        lastFpsUpdate = 0;
    }

    return currentFps;
}

// Export helpers
export function exportPopulationCSV(populationHistory) {
    const csv = ['Time,Plants,Herbivores,Carnivores,Humanoids,Total,AvgGeneration'];

    for (const entry of populationHistory) {
        csv.push(`${entry.time},${entry.counts.plant},${entry.counts.herbivore},${entry.counts.carnivore},${entry.counts.humanoid},${entry.total},${entry.avgGen}`);
    }

    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planet-eden-population-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showNotification('📊 Population CSV exported!');
}

export function exportWorldJSON(organisms, time, settings) {
    const data = {
        timestamp: Date.now(),
        time: time,
        organisms: organisms.map(o => o.exportData()),
        settings: settings,
        populationCounts: {
            plant: organisms.filter(o => o.type === 'plant' && !o.dead).length,
            herbivore: organisms.filter(o => o.type === 'herbivore' && !o.dead).length,
            carnivore: organisms.filter(o => o.type === 'carnivore' && !o.dead).length,
            humanoid: organisms.filter(o => o.type === 'humanoid' && !o.dead).length
        }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planet-eden-world-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showNotification('💾 World JSON exported!');
}

export function exportOrganism(organism) {
    if (!organism) {
        showNotification('⚠️ No organism selected');
        return;
    }

    const data = organism.exportData();

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `organism-${organism.type}-${organism.id}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showNotification(`🧬 Exported ${organism.type} #${organism.id}`);
}
