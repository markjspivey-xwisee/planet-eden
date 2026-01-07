// Event System - Toast notifications and event log for Planet Eden
// Captures emergent moments and makes them visible to players

export class EventSystem {
    constructor() {
        this.events = [];
        this.maxEvents = 50;
        this.toastQueue = [];
        this.activeToasts = [];
        this.maxActiveToasts = 3;
        this.toastDuration = 4000; // ms
        this.container = null;
        this.logContainer = null;
        this.logVisible = false;

        // Tracking for emergent events
        this.stats = {
            births: 0,
            deaths: 0,
            hunts: 0,
            buildings: 0,
            tribesFormed: 0,
            wars: 0,
            extinctions: new Set(),
            peakPopulation: 0,
            currentPopulation: 0
        };

        // Cooldowns to prevent spam (ms)
        this.cooldowns = {
            birth: 0,
            death: 0,
            hunt: 0,
            building: 0
        };
        this.cooldownDuration = 2000;
    }

    init() {
        this.createUI();
        console.log('[EventSystem] Initialized');
    }

    createUI() {
        // Skip UI creation if new HUD is active (toasts still work via console)
        if (window.PLANET_EDEN_USE_NEW_HUD) {
            console.log('[EventSystem] Skipping old UI - using new HUD');
            return;
        }

        // Toast container (top right)
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            width: 300px;
            z-index: 1000;
            pointer-events: none;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(this.container);

        // Event log panel (hidden by default)
        this.logContainer = document.createElement('div');
        this.logContainer.id = 'event-log';
        this.logContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            width: 350px;
            max-height: 300px;
            background: rgba(0, 0, 0, 0.85);
            border: 1px solid rgba(100, 200, 100, 0.3);
            border-radius: 8px;
            padding: 10px;
            z-index: 1000;
            display: none;
            overflow-y: auto;
            font-family: 'Courier New', monospace;
            font-size: 11px;
        `;
        this.logContainer.innerHTML = `
            <div style="color: #8f8; margin-bottom: 8px; font-weight: bold; border-bottom: 1px solid #333; padding-bottom: 5px;">
                EVENT LOG (L to toggle)
            </div>
            <div id="event-log-content"></div>
        `;
        document.body.appendChild(this.logContainer);

        // Add keyboard listener
        window.addEventListener('keydown', (e) => {
            if (e.key === 'l' || e.key === 'L') {
                this.toggleLog();
            }
        });
    }

    toggleLog() {
        this.logVisible = !this.logVisible;
        this.logContainer.style.display = this.logVisible ? 'block' : 'none';
    }

    // Core event logging
    log(type, message, icon = '', priority = 'normal') {
        const timestamp = new Date().toLocaleTimeString();
        const event = {
            type,
            message,
            icon,
            priority,
            timestamp,
            time: Date.now()
        };

        this.events.unshift(event);
        if (this.events.length > this.maxEvents) {
            this.events.pop();
        }

        // Update log UI
        this.updateLogUI();

        // Show toast for important events
        if (priority === 'high' || priority === 'milestone') {
            this.showToast(event);
        }
    }

    updateLogUI() {
        const content = document.getElementById('event-log-content');
        if (!content) return;

        content.innerHTML = this.events.map(e => {
            const color = this.getEventColor(e.priority);
            return `<div style="color: ${color}; margin-bottom: 4px; opacity: 0.9;">
                <span style="color: #666;">[${e.timestamp}]</span> ${e.icon} ${e.message}
            </div>`;
        }).join('');
    }

    getEventColor(priority) {
        switch (priority) {
            case 'milestone': return '#ffd700';
            case 'high': return '#ff6b6b';
            case 'normal': return '#8f8';
            case 'low': return '#888';
            default: return '#8f8';
        }
    }

    showToast(event) {
        this.toastQueue.push(event);
        this.processToastQueue();
    }

    processToastQueue() {
        while (this.toastQueue.length > 0 && this.activeToasts.length < this.maxActiveToasts) {
            const event = this.toastQueue.shift();
            this.displayToast(event);
        }
    }

    displayToast(event) {
        // Skip if container doesn't exist (new HUD mode)
        if (!this.container) return;

        const toast = document.createElement('div');
        const bgColor = event.priority === 'milestone' ? 'rgba(255, 215, 0, 0.15)' : 'rgba(0, 0, 0, 0.9)';
        const borderColor = event.priority === 'milestone' ? '#ffd700' : 'rgba(100, 200, 100, 0.5)';

        toast.style.cssText = `
            background: ${bgColor};
            border: 1px solid ${borderColor};
            border-radius: 8px;
            padding: 12px 16px;
            color: #fff;
            font-family: 'Segoe UI', sans-serif;
            font-size: 13px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            transform: translateX(120%);
            transition: transform 0.3s ease-out, opacity 0.3s ease-out;
            pointer-events: auto;
            cursor: pointer;
        `;

        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;">${event.icon}</span>
                <div>
                    <div style="font-weight: bold; color: ${this.getEventColor(event.priority)};">${event.type}</div>
                    <div style="opacity: 0.8; font-size: 12px;">${event.message}</div>
                </div>
            </div>
        `;

        toast.onclick = () => this.dismissToast(toast);
        this.container.appendChild(toast);
        this.activeToasts.push(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
        });

        // Auto dismiss
        setTimeout(() => {
            this.dismissToast(toast);
        }, this.toastDuration);
    }

    dismissToast(toast) {
        if (!toast.parentNode) return;

        toast.style.transform = 'translateX(120%)';
        toast.style.opacity = '0';

        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            const idx = this.activeToasts.indexOf(toast);
            if (idx > -1) this.activeToasts.splice(idx, 1);
            this.processToastQueue();
        }, 300);
    }

    // Game-specific event helpers
    onBirth(type, tribeId) {
        const now = Date.now();
        if (now - this.cooldowns.birth < this.cooldownDuration) return;
        this.cooldowns.birth = now;

        this.stats.births++;
        const typeNames = ['Plant', 'Herbivore', 'Carnivore', 'Humanoid'];
        const icons = ['🌱', '🦌', '🦁', '👤'];
        const typeName = typeNames[type] || 'Organism';
        const icon = icons[type] || '🔵';

        if (type === 3 && tribeId !== 0xFFFFFFFF) {
            this.log('Birth', `New ${typeName} born in Tribe ${tribeId}`, icon, 'normal');
        } else {
            this.log('Birth', `New ${typeName} spawned`, icon, 'low');
        }
    }

    onDeath(type, cause = 'natural') {
        const now = Date.now();
        if (now - this.cooldowns.death < this.cooldownDuration) return;
        this.cooldowns.death = now;

        this.stats.deaths++;
        const typeNames = ['Plant', 'Herbivore', 'Carnivore', 'Humanoid'];
        const typeName = typeNames[type] || 'Organism';

        if (cause === 'hunted') {
            this.log('Hunt', `${typeName} was hunted`, '💀', 'normal');
        } else if (cause === 'starved') {
            this.log('Death', `${typeName} starved`, '💀', 'low');
        } else {
            this.log('Death', `${typeName} died`, '💀', 'low');
        }
    }

    onHunt(predator, prey) {
        const now = Date.now();
        if (now - this.cooldowns.hunt < this.cooldownDuration) return;
        this.cooldowns.hunt = now;

        this.stats.hunts++;
        const predNames = ['Plant', 'Herbivore', 'Carnivore', 'Humanoid'];
        const predName = predNames[predator] || 'Predator';
        const preyName = predNames[prey] || 'Prey';

        this.log('Hunt', `${predName} caught a ${preyName}`, '🎯', 'normal');
    }

    onBuildingCreated(type, tribeId) {
        const now = Date.now();
        if (now - this.cooldowns.building < this.cooldownDuration) return;
        this.cooldowns.building = now;

        this.stats.buildings++;
        const buildingNames = ['Hut', 'Farm', 'Barracks', 'Watchtower', 'Storage', 'Workshop'];
        const buildingName = buildingNames[type] || 'Building';

        this.log('Construction', `Tribe ${tribeId} built a ${buildingName}`, '🏗️', 'high');
    }

    onTribeCreated(tribeId) {
        this.stats.tribesFormed++;
        this.log('New Tribe', `Tribe ${tribeId} has formed!`, '🏛️', 'high');
    }

    onWar(tribe1, tribe2) {
        this.stats.wars++;
        this.log('War', `Tribe ${tribe1} declared war on Tribe ${tribe2}!`, '⚔️', 'high');
    }

    onExtinction(type) {
        if (this.stats.extinctions.has(type)) return;
        this.stats.extinctions.add(type);

        const typeNames = ['Plants', 'Herbivores', 'Carnivores', 'Humanoids'];
        const typeName = typeNames[type] || 'Species';

        this.log('EXTINCTION', `${typeName} have gone extinct!`, '☠️', 'milestone');
    }

    // Milestone checks
    checkMilestones(stats) {
        const pop = stats.aliveCount;
        this.stats.currentPopulation = pop;

        // Peak population milestone
        if (pop > this.stats.peakPopulation) {
            const prev = this.stats.peakPopulation;
            this.stats.peakPopulation = pop;

            // Milestones at 100, 200, 300, etc
            const prevMilestone = Math.floor(prev / 100);
            const newMilestone = Math.floor(pop / 100);

            if (newMilestone > prevMilestone && newMilestone > 0) {
                this.log('MILESTONE', `Population reached ${newMilestone * 100}!`, '🎉', 'milestone');
            }
        }

        // First tribe milestone
        if (stats.tribeCount === 1 && this.stats.tribesFormed === 0) {
            this.stats.tribesFormed = 1;
            this.log('MILESTONE', 'First tribe has been established!', '🏛️', 'milestone');
        }

        // Multiple tribes
        if (stats.tribeCount >= 3 && this.stats.tribesFormed < 3) {
            this.stats.tribesFormed = stats.tribeCount;
            this.log('MILESTONE', 'Three tribes now compete for dominance!', '⚔️', 'milestone');
        }

        // First building
        if (stats.buildingCount === 1 && this.stats.buildings === 0) {
            this.stats.buildings = 1;
            this.log('MILESTONE', 'First structure built! Civilization begins...', '🏠', 'milestone');
        }
    }
}

// Singleton instance
export const eventSystem = new EventSystem();
