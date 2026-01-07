// Goals and Milestones System for Planet Eden
// Provides objectives and tracks player progress

export class GoalSystem {
    constructor() {
        this.goals = [];
        this.completedGoals = [];
        this.currentGoalIndex = 0;
        this.container = null;
        this.eventSystem = null;
        this.audioSystem = null;

        // Define progression goals
        this.defineGoals();
    }

    defineGoals() {
        this.goals = [
            {
                id: 'first_tribe',
                name: 'Dawn of Civilization',
                description: 'Establish your first tribe',
                icon: '🏛️',
                check: (stats) => stats.tribeCount >= 1,
                reward: 'Unlocked: Tribe management'
            },
            {
                id: 'population_50',
                name: 'Growing Community',
                description: 'Reach a population of 50 organisms',
                icon: '👥',
                check: (stats) => stats.aliveCount >= 50,
                reward: '+10 Food bonus'
            },
            {
                id: 'first_building',
                name: 'Foundations',
                description: 'Construct your first building',
                icon: '🏠',
                check: (stats) => stats.buildingCount >= 1,
                reward: 'Unlocked: Construction tools'
            },
            {
                id: 'population_100',
                name: 'Thriving Ecosystem',
                description: 'Reach 100 living organisms',
                icon: '🌿',
                check: (stats) => stats.aliveCount >= 100,
                reward: 'Ecosystem balance bonus'
            },
            {
                id: 'multiple_tribes',
                name: 'Divided Lands',
                description: 'Have 3 competing tribes',
                icon: '⚔️',
                check: (stats) => stats.tribeCount >= 3,
                reward: 'Diplomacy options'
            },
            {
                id: 'buildings_5',
                name: 'Village Builder',
                description: 'Construct 5 buildings',
                icon: '🏘️',
                check: (stats) => stats.buildingCount >= 5,
                reward: 'Advanced buildings'
            },
            {
                id: 'population_200',
                name: 'Flourishing World',
                description: 'Support 200 organisms',
                icon: '🌍',
                check: (stats) => stats.aliveCount >= 200,
                reward: 'World mastery'
            },
            {
                id: 'survival_5min',
                name: 'Endurance',
                description: 'Survive for 5 minutes',
                icon: '⏱️',
                check: (stats) => stats.time >= 300,
                reward: 'Time flies bonus'
            },
            {
                id: 'buildings_10',
                name: 'Town Planner',
                description: 'Build 10 structures',
                icon: '🏙️',
                check: (stats) => stats.buildingCount >= 10,
                reward: 'Urban development'
            },
            {
                id: 'population_300',
                name: 'Teeming Life',
                description: 'Reach 300 living organisms',
                icon: '🎆',
                check: (stats) => stats.aliveCount >= 300,
                reward: 'Life finds a way'
            },
            {
                id: 'dominance',
                name: 'Dominant Species',
                description: 'Have 50+ humanoids in tribes',
                icon: '👑',
                check: (stats, detailed) => detailed.tribalHumanoids >= 50,
                reward: 'Civilization achieved!'
            },
            {
                id: 'survival_10min',
                name: 'Eternal Eden',
                description: 'Maintain life for 10 minutes',
                icon: '🏆',
                check: (stats) => stats.time >= 600,
                reward: 'You are a god'
            }
        ];
    }

    init(eventSystem = null, audioSystem = null, particleSystem = null) {
        this.eventSystem = eventSystem;
        this.audioSystem = audioSystem;
        this.particleSystem = particleSystem;
        this.createUI();
        console.log('[GoalSystem] Initialized with', this.goals.length, 'goals');
    }

    createUI() {
        // Skip UI creation if new HUD is active
        if (window.PLANET_EDEN_USE_NEW_HUD) {
            console.log('[GoalSystem] Skipping old UI - using new HUD');
            // Still setup keyboard shortcut
            window.addEventListener('keydown', (e) => {
                if (e.key === 'o' || e.key === 'O') {
                    this.toggle();
                }
            });
            return;
        }

        // Goals panel (top left, below stats) - hidden by default, press O to toggle
        this.container = document.createElement('div');
        this.container.id = 'goals-panel';
        this.container.style.cssText = `
            position: fixed;
            top: 200px;
            left: 20px;
            width: 280px;
            background: rgba(0, 0, 0, 0.85);
            border: 1px solid rgba(100, 200, 100, 0.3);
            border-radius: 8px;
            padding: 12px;
            z-index: 999;
            font-family: 'Segoe UI', sans-serif;
            color: #fff;
            display: none;
        `;
        document.body.appendChild(this.container);

        // Keyboard shortcut
        window.addEventListener('keydown', (e) => {
            if (e.key === 'o' || e.key === 'O') {
                this.toggle();
            }
        });

        this.updateUI();
    }

    updateUI() {
        if (!this.container) return;

        const currentGoal = this.goals[this.currentGoalIndex];
        const progress = this.completedGoals.length;
        const total = this.goals.length;

        let html = `
            <div style="margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #333;">
                <span style="color: #8f8; font-weight: bold;">OBJECTIVES</span>
                <span style="float: right; color: #666;">${progress}/${total}</span>
            </div>
        `;

        // Progress bar
        const progressPct = (progress / total) * 100;
        html += `
            <div style="background: #222; border-radius: 4px; height: 6px; margin-bottom: 12px; overflow: hidden;">
                <div style="background: linear-gradient(90deg, #4a0, #8f0); height: 100%; width: ${progressPct}%; transition: width 0.5s;"></div>
            </div>
        `;

        if (currentGoal) {
            html += `
                <div style="background: rgba(50, 100, 50, 0.3); border-radius: 6px; padding: 10px; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                        <span style="font-size: 24px;">${currentGoal.icon}</span>
                        <span style="font-weight: bold; color: #ffd700;">${currentGoal.name}</span>
                    </div>
                    <div style="color: #aaa; font-size: 12px; margin-left: 32px;">${currentGoal.description}</div>
                </div>
            `;
        } else {
            html += `
                <div style="text-align: center; padding: 20px; color: #ffd700;">
                    <div style="font-size: 32px; margin-bottom: 10px;">🏆</div>
                    <div style="font-weight: bold;">ALL GOALS COMPLETE!</div>
                    <div style="color: #888; font-size: 12px; margin-top: 5px;">You've mastered Planet Eden</div>
                </div>
            `;
        }

        // Recent completions
        if (this.completedGoals.length > 0) {
            const recent = this.completedGoals.slice(-3).reverse();
            html += `
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #333;">
                    <div style="color: #666; font-size: 11px; margin-bottom: 6px;">COMPLETED</div>
            `;
            recent.forEach(goal => {
                html += `
                    <div style="display: flex; align-items: center; gap: 6px; color: #555; font-size: 11px; margin-bottom: 3px;">
                        <span>${goal.icon}</span>
                        <span style="text-decoration: line-through;">${goal.name}</span>
                        <span style="color: #4a0;">✓</span>
                    </div>
                `;
            });
            html += `</div>`;
        }

        this.container.innerHTML = html;
    }

    // Check goals against current stats
    check(stats, detailedStats = {}) {
        const currentGoal = this.goals[this.currentGoalIndex];
        if (!currentGoal) return; // All complete

        if (currentGoal.check(stats, detailedStats)) {
            this.completeGoal(currentGoal);
        }
    }

    completeGoal(goal) {
        this.completedGoals.push(goal);
        this.currentGoalIndex++;

        // Notify via event system
        if (this.eventSystem) {
            this.eventSystem.log(
                'GOAL COMPLETE',
                `${goal.name} - ${goal.reward}`,
                goal.icon,
                'milestone'
            );
        }

        // Play sound
        if (this.audioSystem) {
            this.audioSystem.playEventSound('milestone');
        }

        // Emit celebration particles (confetti effect!)
        if (this.particleSystem) {
            // Emit from multiple positions for full-screen celebration
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2;
                const radius = 15 + Math.random() * 10;
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;
                const y = 5 + Math.random() * 5;

                // Delayed bursts for cascading effect
                setTimeout(() => {
                    this.particleSystem.emitCelebration(x, y, z);
                }, i * 100);
            }
        }

        // Update UI
        this.updateUI();

        console.log(`[GoalSystem] Completed: ${goal.name}`);
    }

    // Toggle visibility
    toggle() {
        if (this.container) {
            const visible = this.container.style.display !== 'none';
            this.container.style.display = visible ? 'none' : 'block';
        }
    }

    // Get current goal for display
    getCurrentGoal() {
        return this.goals[this.currentGoalIndex] || null;
    }

    // Get completion percentage
    getProgress() {
        return (this.completedGoals.length / this.goals.length) * 100;
    }
}

// Singleton
export const goalSystem = new GoalSystem();
