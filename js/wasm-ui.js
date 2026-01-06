// Enhanced WASM UI Module - Full tribal civilization interface
import { OrganismType } from './wasm-loader.js';
import { SparklineGraph } from './engine/sparkline.js';

export class WasmUI {
    constructor(wasmModule, renderer = null) {
        this.wasmModule = wasmModule;
        this.renderer = renderer;

        // FPS tracking
        this.fpsElement = null;
        this.lastFpsUpdate = 0;
        this.frameCount = 0;
        this.fps = 0;

        // Population chart
        this.populationChart = null;
        this.populationHistory = {
            labels: [],
            datasets: []
        };
        this.maxDataPoints = 60;

        // Achievements
        this.achievements = new Set();
        this.achievementDefs = {
            first_tribe: { name: '🏛️ First Tribe', desc: 'Create your first tribe' },
            population_100: { name: '🌍 Population Boom', desc: '100 organisms alive' },
            population_500: { name: '🌎 Thriving World', desc: '500 organisms alive' },
            five_tribes: { name: '🏰 Five Nations', desc: '5 active tribes' },
            long_lived: { name: '⏰ Ancient World', desc: 'Simulation running for 1000s' },
            mass_spawn: { name: '🌱 Mass Creation', desc: 'Spawn 100+ organisms' }
        };

        // Symbolic message icons (30 symbols)
        this.messageSymbols = [
            '🍖', '☠️', '🏃', '🏠', '⚔️', '🛡️', '👥', '🌱', '💎', '🔥',
            '💧', '⚡', '❤️', '💀', '🏆', '📍', '⚠️', '✅', '❌', '🎯',
            '🔔', '📢', '🎵', '💬', '🙏', '😊', '😢', '😡', '😨', '🤝'
        ];

        // Active messages (for visualization)
        this.activeMessages = [];

        // Mobile panel state
        this.mobilePanelIndex = 0;
        this.mobilePanels = ['tribe-panel', 'stats-panel', 'god-powers-panel', 'chart-panel', 'controls-panel'];
        this.isMobile = false;
        this.panelsHidden = false;
    }

    init() {
        // Setup FPS counter
        this.fpsElement = document.getElementById('fps-counter');

        // Initialize population chart
        this.initPopulationChart();

        // Setup control event listeners
        this.setupControls();

        // Setup god powers
        this.setupGodPowers();

        // Setup mobile panel toggle
        this.setupMobilePanels();

        console.log('[UI] Enhanced WASM UI initialized');
    }

    setupMobilePanels() {
        const toggleBtn = document.getElementById('mobile-panel-toggle');
        const hideBtn = document.getElementById('mobile-panel-hide');
        if (!toggleBtn) return;

        // Check if mobile and update panel visibility
        const checkMobile = () => {
            this.isMobile = window.innerWidth <= 900;
            if (this.isMobile) {
                if (this.panelsHidden) {
                    // All panels hidden
                    this.mobilePanels.forEach(id => {
                        const panel = document.getElementById(id);
                        if (panel) {
                            panel.classList.remove('mobile-active');
                        }
                    });
                } else {
                    // Show current panel only
                    this.mobilePanels.forEach((id, index) => {
                        const panel = document.getElementById(id);
                        if (panel) {
                            if (index === this.mobilePanelIndex) {
                                panel.classList.add('mobile-active');
                            } else {
                                panel.classList.remove('mobile-active');
                            }
                        }
                    });
                }
                this.updateMobileToggleBtn();
            } else {
                // Show all panels on desktop
                this.mobilePanels.forEach(id => {
                    const panel = document.getElementById(id);
                    if (panel) {
                        panel.classList.remove('mobile-active');
                    }
                });
            }
        };

        // Toggle button click - cycle through panels
        toggleBtn.addEventListener('click', () => {
            if (this.panelsHidden) {
                // If hidden, show panels first
                this.panelsHidden = false;
                hideBtn?.classList.remove('panels-hidden');
            } else {
                // Cycle to next panel
                this.mobilePanelIndex = (this.mobilePanelIndex + 1) % this.mobilePanels.length;
            }
            this.mobilePanels.forEach((id, index) => {
                const panel = document.getElementById(id);
                if (panel) {
                    if (index === this.mobilePanelIndex) {
                        panel.classList.add('mobile-active');
                    } else {
                        panel.classList.remove('mobile-active');
                    }
                }
            });
            this.updateMobileToggleBtn();
        });

        // Hide button click - toggle all panels off/on
        if (hideBtn) {
            hideBtn.addEventListener('click', () => {
                this.panelsHidden = !this.panelsHidden;
                hideBtn.classList.toggle('panels-hidden', this.panelsHidden);
                hideBtn.textContent = this.panelsHidden ? '👁️' : '✕';

                if (this.panelsHidden) {
                    // Hide all panels
                    this.mobilePanels.forEach(id => {
                        const panel = document.getElementById(id);
                        if (panel) {
                            panel.classList.remove('mobile-active');
                        }
                    });
                } else {
                    // Show current panel
                    const panel = document.getElementById(this.mobilePanels[this.mobilePanelIndex]);
                    if (panel) {
                        panel.classList.add('mobile-active');
                    }
                }
                this.updateMobileToggleBtn();
            });
        }

        // Listen for resize
        window.addEventListener('resize', checkMobile);

        // Initial check
        checkMobile();
    }

    updateMobileToggleBtn() {
        const toggleBtn = document.getElementById('mobile-panel-toggle');
        if (!toggleBtn) return;

        if (this.panelsHidden) {
            toggleBtn.textContent = '📊 Show Panels';
            return;
        }

        const panelNames = {
            'tribe-panel': '🏛️ Tribes',
            'stats-panel': '📊 Stats',
            'god-powers-panel': '⚡ Powers',
            'chart-panel': '📈 Chart',
            'controls-panel': '🎮 Controls'
        };

        const currentPanel = this.mobilePanels[this.mobilePanelIndex];
        toggleBtn.textContent = panelNames[currentPanel] + ' ▼';
    }

    initPopulationChart() {
        const ctx = document.getElementById('population-chart').getContext('2d');

        this.populationChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: []
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            color: '#fff',
                            font: { size: 10 },
                            boxWidth: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#0F0',
                        bodyColor: '#fff'
                    }
                },
                scales: {
                    x: {
                        display: true,
                        ticks: {
                            color: '#888',
                            maxTicksLimit: 10
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        display: true,
                        beginAtZero: true,
                        ticks: {
                            color: '#888'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    }

    setupControls() {
        // Time scale slider
        const slider = document.getElementById('time-scale-slider');
        const valueDisplay = document.getElementById('time-scale-value');

        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            valueDisplay.textContent = `${value.toFixed(1)}x`;
            if (window.planetEden) {
                window.planetEden.timeScale = value;
            }
        });

        // Spawn organism buttons
        document.getElementById('btn-spawn-plant').addEventListener('click', () => {
            this.spawnRandom(OrganismType.PLANT);
        });

        document.getElementById('btn-spawn-herbivore').addEventListener('click', () => {
            this.spawnRandom(OrganismType.HERBIVORE);
        });

        document.getElementById('btn-spawn-carnivore').addEventListener('click', () => {
            this.spawnRandom(OrganismType.CARNIVORE);
        });

        document.getElementById('btn-spawn-humanoid').addEventListener('click', () => {
            this.spawnRandom(OrganismType.HUMANOID);
        });
    }

    setupGodPowers() {
        // F1 - Spawn New Tribe
        document.getElementById('btn-spawn-tribe').addEventListener('click', () => {
            this.godPowerSpawnTribe();
        });

        // F2 - Mass Spawn
        document.getElementById('btn-mass-spawn').addEventListener('click', () => {
            this.godPowerMassSpawn();
        });

        // F3 - Gift Resources
        document.getElementById('btn-gift-resources').addEventListener('click', () => {
            this.godPowerGiftResources();
        });

        // F4 - Lightning Strike
        document.getElementById('btn-trigger-war').addEventListener('click', () => {
            this.godPowerLightning();
        });

        // F5 - Plague
        document.getElementById('btn-plague').addEventListener('click', () => {
            this.godPowerPlague();
        });

        // F6 - Divine Blessing
        document.getElementById('btn-blessing').addEventListener('click', () => {
            this.godPowerBlessing();
        });

        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.key === 'F1') { e.preventDefault(); this.godPowerSpawnTribe(); }
            if (e.key === 'F2') { e.preventDefault(); this.godPowerMassSpawn(); }
            if (e.key === 'F3') { e.preventDefault(); this.godPowerGiftResources(); }
            if (e.key === 'F4') { e.preventDefault(); this.godPowerLightning(); }
            if (e.key === 'F5') { e.preventDefault(); this.godPowerPlague(); }
            if (e.key === 'F6') { e.preventDefault(); this.godPowerBlessing(); }
        });
    }

    // Tribe name generator - unique names for each tribe
    getTribeName(tribeId) {
        const prefixes = ['Sun', 'Moon', 'Star', 'Storm', 'River', 'Mountain', 'Forest', 'Thunder'];
        const suffixes = ['Walkers', 'Seekers', 'Keepers', 'Hunters', 'Builders', 'Warriors', 'Singers', 'Dancers'];
        return `${prefixes[tribeId % prefixes.length]} ${suffixes[Math.floor(tribeId / prefixes.length) % suffixes.length]}`;
    }

    // God Power Implementations
    godPowerSpawnTribe() {
        // Check if at max tribes first
        const currentTribes = this.wasmModule.getStats().tribeCount;
        const maxTribes = this.wasmModule.exports.getMaxTribes ? this.wasmModule.exports.getMaxTribes() : 8;

        if (currentTribes >= maxTribes) {
            this.showMessage(`❌ Maximum tribes reached (${maxTribes})`, 'error');
            return;
        }

        const tribeId = this.wasmModule.createTribe();

        if (tribeId !== 0xFFFFFFFF) {
            const tribeName = this.getTribeName(tribeId);

            // Spawn 10 humanoids for the new tribe on LAND
            let spawnedCount = 0;
            const basePos = this.renderer?.findLandPosition() || { flatX: 0, flatZ: 0 };

            for (let i = 0; i < 10; i++) {
                const angle = (i / 10) * Math.PI * 2;
                const radius = 5;
                const x = basePos.flatX + Math.cos(angle) * radius;
                const z = basePos.flatZ + Math.sin(angle) * radius;

                const orgId = this.wasmModule.spawnOrganism(OrganismType.HUMANOID, x, 0.5, z, tribeId);
                if (orgId !== 0xFFFFFFFF) spawnedCount++;
            }

            this.showMessage(`👥 The ${tribeName} tribe has emerged! (${spawnedCount} members)`, 'success');
            this.checkAchievement('first_tribe');
        } else {
            this.showMessage(`❌ Cannot create more tribes`, 'error');
        }
    }

    godPowerMassSpawn() {
        const count = 100;

        for (let i = 0; i < count; i++) {
            const type = Math.random() < 0.3 ? OrganismType.PLANT :
                         Math.random() < 0.6 ? OrganismType.HERBIVORE :
                         Math.random() < 0.8 ? OrganismType.CARNIVORE :
                         OrganismType.HUMANOID;

            this.spawnRandom(type);
        }

        this.showMessage(`🌱 Spawned ${count} organisms!`, 'success');
        this.checkAchievement('mass_spawn');
    }

    godPowerGiftResources() {
        const tribes = this.wasmModule.getAllTribes();

        if (tribes.length === 0) {
            this.showMessage('❌ No tribes to gift resources to', 'error');
            return;
        }

        // Gift resources to a random tribe (would need WASM export for this)
        const randomTribe = tribes[Math.floor(Math.random() * tribes.length)];
        const tribeName = this.getTribeName(randomTribe.id);
        this.showMessage(`💎 Gifted 500 resources to the ${tribeName}!`, 'success');

        // TODO: Add WASM export to actually gift resources
    }

    godPowerLightning() {
        // Trigger lightning strike via weather system
        if (this.renderer && this.renderer.weatherSystem) {
            // Find a storm cloud to trigger from, or use any cloud
            const clouds = this.renderer.weatherSystem.clouds || [];
            const stormClouds = clouds.filter(c => c.weatherState === 'storm' || c.canStorm);

            if (stormClouds.length > 0) {
                // Trigger from a random storm cloud
                const cloud = stormClouds[Math.floor(Math.random() * stormClouds.length)];
                this.renderer.weatherSystem.triggerLightning(cloud);
                this.showMessage('⚡ Lightning strikes from the heavens!', 'warning');
            } else if (clouds.length > 0) {
                // Force lightning from any cloud
                const cloud = clouds[Math.floor(Math.random() * clouds.length)];
                this.renderer.weatherSystem.triggerLightning(cloud);
                this.showMessage('⚡ You summon divine lightning!', 'warning');
            } else {
                this.showMessage('❌ No clouds to strike from', 'error');
            }
        } else {
            this.showMessage('❌ Weather system not available', 'error');
        }
    }

    godPowerPlague() {
        const aliveCount = this.wasmModule.exports.getAliveCount();
        const killCount = Math.floor(aliveCount * 0.2); // Kill 20%

        this.showMessage(`☠️ Plague strikes! ${killCount} organisms perish!`, 'warning');

        // TODO: Add WASM export to kill random organisms
    }

    godPowerBlessing() {
        const aliveCount = this.wasmModule.exports.getAliveCount();

        this.showMessage(`✨ Divine blessing! All ${aliveCount} organisms healed!`, 'success');

        // TODO: Add WASM export to heal all organisms
    }

    spawnRandom(type) {
        // Use renderer to find a valid land position
        if (!this.renderer || !this.renderer.findLandPosition) {
            // Fallback if renderer not available
            const x = (Math.random() - 0.5) * 80;
            const z = (Math.random() - 0.5) * 80;
            const tribes = this.wasmModule.getAllTribes();
            const tribeId = tribes.length > 0 && Math.random() < 0.7 ?
                           tribes[Math.floor(Math.random() * tribes.length)].id : 0;
            this.wasmModule.spawnOrganism(type, x, 0.5, z, tribeId);
            return;
        }

        // Find a valid land position
        const pos = this.renderer.findLandPosition();
        if (!pos.isLand) {
            console.warn('Could not find valid land position for spawn');
            return;
        }

        // Get random tribe or no tribe
        const tribes = this.wasmModule.getAllTribes();
        const tribeId = tribes.length > 0 && Math.random() < 0.7 ?
                       tribes[Math.floor(Math.random() * tribes.length)].id : 0xFFFFFFFF;

        const orgId = this.wasmModule.spawnOrganism(type, pos.flatX, 0.5, pos.flatZ, tribeId);

        if (orgId !== 0xFFFFFFFF) {
            const typeNames = ['Plant', 'Herbivore', 'Carnivore', 'Humanoid'];
            console.log(`Spawned ${typeNames[type]} #${orgId} on land at (${pos.flatX.toFixed(1)}, ${pos.flatZ.toFixed(1)})`);
        }
    }

    update(deltaTime) {
        // Update FPS counter
        this.updateFPS();

        // Update stats panel
        this.updateStats();

        // Update tribes panel
        this.updateTribes();

        // Update population chart (every 2 seconds)
        if (this.wasmModule.exports.getTime() % 2 < deltaTime * 2) {
            this.updatePopulationChart();
        }

        // Check achievements
        this.checkAchievements();

        // Update symbolic messages
        this.updateMessages(deltaTime);
    }

    updateFPS() {
        this.frameCount++;
        const now = performance.now();

        if (now - this.lastFpsUpdate >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = now;

            // Color code FPS
            if (this.fps >= 55) {
                this.fpsElement.style.color = '#0F0';
                this.fpsElement.style.borderColor = '#0F0';
            } else if (this.fps >= 30) {
                this.fpsElement.style.color = '#FF0';
                this.fpsElement.style.borderColor = '#FF0';
            } else {
                this.fpsElement.style.color = '#F00';
                this.fpsElement.style.borderColor = '#F00';
            }
        }

        this.fpsElement.textContent = `${this.fps} FPS`;
    }

    updateStats() {
        const stats = this.wasmModule.getStats();

        if (!stats) return;

        // Get organism counts by type
        const typeCounts = SparklineGraph.countTypes(this.wasmModule);

        const statsHTML = `
            <div class="stat-row">
                <span>🧬 Organisms</span>
                <span class="stat-value">${stats.aliveCount} / ${stats.organismCount}</span>
            </div>
            <div class="stat-row stat-breakdown" style="font-size: 10px; color: #888; padding-left: 16px;">
                <span>🌿 ${typeCounts.plants} · 🦌 ${typeCounts.herbivores} · 🦁 ${typeCounts.carnivores} · 👤 ${typeCounts.humanoids}</span>
            </div>
            <div class="stat-row">
                <span>🏛️ Tribes</span>
                <span class="stat-value">${stats.tribeCount}</span>
            </div>
            <div class="stat-row">
                <span>🏗️ Buildings</span>
                <span class="stat-value">${stats.buildingCount}</span>
            </div>
            <div class="stat-row">
                <span>⏰ Time</span>
                <span class="stat-value">${stats.time.toFixed(1)}s</span>
            </div>
            <div class="stat-row">
                <span>📊 Frame</span>
                <span class="stat-value">${stats.frameCount.toLocaleString()}</span>
            </div>
            <div class="stat-row">
                <span>🏆 Achievements</span>
                <span class="stat-value">${this.achievements.size} / ${Object.keys(this.achievementDefs).length}</span>
            </div>
        `;

        document.getElementById('stats-content').innerHTML = statsHTML;
    }

    updateTribes() {
        const tribes = this.wasmModule.getAllTribes();
        const tribeListElement = document.getElementById('tribe-list');

        // Enhanced debug logging
        const stats = this.wasmModule.getStats();
        const organismData = this.wasmModule.getOrganismData();

        console.log('[UI] Tribe Update Debug:', {
            statsCount: stats.tribeCount,
            tribesReturned: tribes.length,
            totalOrganisms: stats.organismCount,
            aliveOrganisms: stats.aliveCount
        });

        // Log organism tribe IDs
        if (organismData) {
            const tribeIds = new Set();
            for (let i = 0; i < organismData.count; i++) {
                // 0xFFFFFFFF means no tribe, valid tribe IDs are 0+
                if (organismData.alive[i] && organismData.tribeIds[i] < 0xFFFFFFFF) {
                    tribeIds.add(organismData.tribeIds[i]);
                }
            }
            console.log('[UI] Unique tribe IDs from organisms:', Array.from(tribeIds));
        }

        console.log('[UI] Tribes data:', tribes);

        if (tribes.length === 0) {
            tribeListElement.innerHTML = '<div style="color: #888; text-align: center; padding: 20px;">No tribes yet<br><small>Click "Spawn New Tribe" to begin</small></div>';
            return;
        }

        let tribesHTML = '';

        tribes.forEach(tribe => {
            const color = `rgb(${tribe.color.r}, ${tribe.color.g}, ${tribe.color.b})`;
            const foodPercent = Math.min(100, (tribe.food / 500) * 100);
            const woodPercent = Math.min(100, (tribe.wood / 500) * 100);
            const tribeName = this.getTribeName(tribe.id);

            tribesHTML += `
                <div class="tribe-card" style="border-color: ${color};">
                    <div class="tribe-name" style="color: ${color};">
                        ${tribeName}
                    </div>
                    <div class="tribe-stat">
                        <span>👥 Members</span>
                        <span>${tribe.memberCount}</span>
                    </div>
                    <div class="tribe-stat">
                        <span>🍖 Food</span>
                        <span>${Math.floor(tribe.food)}</span>
                    </div>
                    <div class="resource-bar">
                        <div class="resource-fill" style="width: ${foodPercent}%; background: #4CAF50;"></div>
                    </div>
                    <div class="tribe-stat" style="margin-top: 8px;">
                        <span>🪵 Wood</span>
                        <span>${Math.floor(tribe.wood)}</span>
                    </div>
                    <div class="resource-bar">
                        <div class="resource-fill" style="width: ${woodPercent}%; background: #8B4513;"></div>
                    </div>
                    <div class="tribe-stat" style="margin-top: 8px;">
                        <span>🪨 Stone</span>
                        <span>${Math.floor(tribe.stone)}</span>
                    </div>
                    <div class="tribe-stat">
                        <span>⚙️ Metal</span>
                        <span>${Math.floor(tribe.metal)}</span>
                    </div>
                </div>
            `;
        });

        tribeListElement.innerHTML = tribesHTML;
    }

    updatePopulationChart() {
        const stats = this.wasmModule.getStats();
        const tribes = this.wasmModule.getAllTribes();
        const time = stats.time.toFixed(0);

        // Add timestamp
        this.populationHistory.labels.push(time + 's');
        if (this.populationHistory.labels.length > this.maxDataPoints) {
            this.populationHistory.labels.shift();
        }

        // Update total population dataset
        if (!this.populationHistory.datasets[0]) {
            this.populationHistory.datasets[0] = {
                label: 'Total',
                data: [],
                borderColor: '#0F0',
                backgroundColor: 'rgba(0, 255, 0, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            };
        }
        this.populationHistory.datasets[0].data.push(stats.aliveCount);
        if (this.populationHistory.datasets[0].data.length > this.maxDataPoints) {
            this.populationHistory.datasets[0].data.shift();
        }

        // Update tribe-specific datasets (top 4 tribes)
        const topTribes = tribes
            .sort((a, b) => b.memberCount - a.memberCount)
            .slice(0, 4);

        topTribes.forEach((tribe, index) => {
            const datasetIndex = index + 1;
            const color = `rgb(${tribe.color.r}, ${tribe.color.g}, ${tribe.color.b})`;
            const tribeName = this.getTribeName(tribe.id);

            if (!this.populationHistory.datasets[datasetIndex]) {
                this.populationHistory.datasets[datasetIndex] = {
                    label: tribeName,
                    data: new Array(this.populationHistory.labels.length - 1).fill(0),
                    borderColor: color,
                    backgroundColor: `rgba(${tribe.color.r}, ${tribe.color.g}, ${tribe.color.b}, 0.1)`,
                    borderWidth: 1.5,
                    tension: 0.3
                };
            } else {
                // Update label in case tribe changed
                this.populationHistory.datasets[datasetIndex].label = tribeName;
            }

            this.populationHistory.datasets[datasetIndex].data.push(tribe.memberCount);
            if (this.populationHistory.datasets[datasetIndex].data.length > this.maxDataPoints) {
                this.populationHistory.datasets[datasetIndex].data.shift();
            }
        });

        // Update chart
        this.populationChart.data.labels = this.populationHistory.labels;
        this.populationChart.data.datasets = this.populationHistory.datasets;
        this.populationChart.update('none');
    }

    checkAchievements() {
        const stats = this.wasmModule.getStats();
        const tribes = this.wasmModule.getAllTribes();

        if (!this.achievements.has('first_tribe') && stats.tribeCount >= 1) {
            this.unlockAchievement('first_tribe');
        }

        if (!this.achievements.has('population_100') && stats.aliveCount >= 100) {
            this.unlockAchievement('population_100');
        }

        if (!this.achievements.has('population_500') && stats.aliveCount >= 500) {
            this.unlockAchievement('population_500');
        }

        if (!this.achievements.has('five_tribes') && stats.tribeCount >= 5) {
            this.unlockAchievement('five_tribes');
        }

        if (!this.achievements.has('long_lived') && stats.time >= 1000) {
            this.unlockAchievement('long_lived');
        }
    }

    checkAchievement(achievementId) {
        if (!this.achievements.has(achievementId)) {
            this.unlockAchievement(achievementId);
        }
    }

    unlockAchievement(achievementId) {
        this.achievements.add(achievementId);

        const achievement = this.achievementDefs[achievementId];
        if (achievement) {
            this.showAchievement(achievement.name, achievement.desc);
        }
    }

    showAchievement(name, description) {
        const toast = document.getElementById('achievement-toast');
        toast.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 8px;">🏆 Achievement Unlocked!</div>
            <div style="font-size: 18px;">${name}</div>
            <div style="font-size: 14px; font-weight: normal; margin-top: 4px;">${description}</div>
        `;
        toast.style.display = 'block';

        // Play sound effect (if available)
        // TODO: Add achievement sound

        setTimeout(() => {
            toast.style.display = 'none';
        }, 4000);
    }

    showMessage(text, type = 'info') {
        console.log(`[Message] ${text}`);

        // Visual notification (could be enhanced with toast notifications)
        const colors = {
            success: '#4CAF50',
            error: '#F44336',
            warning: '#FF9800',
            info: '#2196F3'
        };

        // Flash the relevant UI element
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${colors[type]};
            color: white;
            padding: 20px 40px;
            border-radius: 12px;
            font-size: 18px;
            font-weight: bold;
            z-index: 3000;
            box-shadow: 0 0 30px ${colors[type]};
            animation: fadeOut 2s forwards;
        `;
        flash.textContent = text;
        document.body.appendChild(flash);

        setTimeout(() => flash.remove(), 2000);
    }

    updateMessages(deltaTime) {
        // Update active floating message icons
        this.activeMessages = this.activeMessages.filter(msg => {
            msg.lifetime -= deltaTime;
            return msg.lifetime > 0;
        });

        // Floating emoji messages disabled
        // if (Math.random() < 0.02) {
        //     this.spawnFloatingMessage();
        // }
    }

    spawnFloatingMessage() {
        // Only spawn messages if we have a renderer and organisms
        if (!this.renderer || !this.renderer.organisms || this.renderer.organisms.size === 0) {
            return;
        }

        const symbol = this.messageSymbols[Math.floor(Math.random() * this.messageSymbols.length)];

        // Pick a random organism
        const organismArray = Array.from(this.renderer.organisms.values());
        const randomOrganism = organismArray[Math.floor(Math.random() * organismArray.length)];

        if (!randomOrganism) return;

        // Convert 3D world position to 2D screen position
        const worldPosition = randomOrganism.position.clone();
        worldPosition.project(this.renderer.camera);

        const x = (worldPosition.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-worldPosition.y * 0.5 + 0.5) * window.innerHeight;

        // Only show messages that are visible on screen
        if (x < 0 || x > window.innerWidth || y < 0 || y > window.innerHeight) {
            return;
        }

        const messageElement = document.createElement('div');
        messageElement.className = 'message-icon';
        messageElement.textContent = symbol;
        messageElement.style.left = x + 'px';
        messageElement.style.top = y + 'px';

        document.body.appendChild(messageElement);

        setTimeout(() => messageElement.remove(), 8000);

        this.activeMessages.push({
            element: messageElement,
            lifetime: 8,
            symbol: symbol
        });
    }
}
