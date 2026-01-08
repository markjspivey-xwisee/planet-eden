// animation.js - AAA-Quality Procedural Animation System for Planet Eden
// Handles walk cycles, idle animations, combat, eating, and behavior-specific animations
// With smooth interpolation and activity-based state machines

import * as THREE from 'three';

// Activity states for creatures
export const ActivityState = {
    IDLE: 'idle',
    WALKING: 'walking',
    RUNNING: 'running',
    EATING: 'eating',
    ATTACKING: 'attacking',
    DYING: 'dying',
    SWIMMING: 'swimming',
    SLEEPING: 'sleeping',
    GATHERING: 'gathering',
    BUILDING: 'building'
};

export class AnimationSystem {
    constructor() {
        // Animation states
        this.animationStates = new Map(); // id -> animation state

        // Default animation parameters
        this.walkCycleSpeed = 8; // Leg swings per second
        this.runCycleSpeed = 14; // Faster for running
        this.idleBobSpeed = 2; // Idle bob frequency
        this.idleBobAmount = 0.05; // Idle bob height

        // Smooth interpolation settings
        this.smoothingFactor = 0.15; // How quickly animations blend (0-1)
        this.fastSmoothingFactor = 0.25; // Faster smoothing for combat
    }

    // Initialize animation state for an organism
    initAnimationState(id, type) {
        this.animationStates.set(id, {
            phase: Math.random() * Math.PI * 2, // Random start phase for variety
            secondaryPhase: Math.random() * Math.PI * 2, // For secondary animations
            isMoving: false,
            speed: 0,
            type: type,
            activity: ActivityState.IDLE,
            previousActivity: ActivityState.IDLE,
            activityTransition: 1.0, // 0-1 for blending between activities
            targetPhase: 0,
            lastUpdate: Date.now(),

            // Smooth interpolation targets
            targetLegRotation: [0, 0, 0, 0],
            currentLegRotation: [0, 0, 0, 0],
            targetArmRotation: [0, 0],
            currentArmRotation: [0, 0],
            targetBodyOffset: 0,
            currentBodyOffset: 0,
            targetBodyTilt: { x: 0, z: 0 },
            currentBodyTilt: { x: 0, z: 0 },
            targetHeadRotation: { x: 0, y: 0 },
            currentHeadRotation: { x: 0, y: 0 },

            // Combat animation state
            attackPhase: 0,
            hitReaction: 0, // For being hit

            // Special animations
            breathPhase: Math.random() * Math.PI * 2,
            blinkTimer: Math.random() * 3,
            lookAroundTimer: Math.random() * 5
        });
    }

    // Update animation state based on movement and activity
    updateAnimationState(id, isMoving, speed, activity = null) {
        const state = this.animationStates.get(id);
        if (state) {
            // Track activity transitions for smooth blending
            if (activity && activity !== state.activity) {
                state.previousActivity = state.activity;
                state.activity = activity;
                state.activityTransition = 0;
            }

            state.isMoving = isMoving;
            state.speed = speed;

            // Auto-detect activity based on speed if not provided
            if (!activity) {
                if (!isMoving) {
                    state.activity = ActivityState.IDLE;
                } else if (speed > 1.5) {
                    state.activity = ActivityState.RUNNING;
                } else {
                    state.activity = ActivityState.WALKING;
                }
            }
        }
    }

    // Set specific activity (called externally for combat, eating, etc.)
    setActivity(id, activity) {
        const state = this.animationStates.get(id);
        if (state && state.activity !== activity) {
            state.previousActivity = state.activity;
            state.activity = activity;
            state.activityTransition = 0;

            // Reset attack phase for combat
            if (activity === ActivityState.ATTACKING) {
                state.attackPhase = 0;
            }
        }
    }

    // Trigger a hit reaction (for being attacked)
    triggerHitReaction(id, intensity = 1.0) {
        const state = this.animationStates.get(id);
        if (state) {
            state.hitReaction = intensity;
        }
    }

    // Get animation state for an organism
    getAnimationState(id) {
        return this.animationStates.get(id);
    }

    // Remove animation state
    removeAnimationState(id) {
        this.animationStates.delete(id);
    }

    // Smooth interpolation helper
    lerp(current, target, factor) {
        return current + (target - current) * factor;
    }

    // Update all animations (call each frame)
    update(deltaMs) {
        const deltaSeconds = deltaMs / 1000;

        for (const [id, state] of this.animationStates) {
            // Update activity transition
            if (state.activityTransition < 1.0) {
                state.activityTransition = Math.min(1.0, state.activityTransition + deltaSeconds * 3);
            }

            // Update phases based on activity
            switch (state.activity) {
                case ActivityState.RUNNING:
                    state.phase += deltaSeconds * this.runCycleSpeed * (0.5 + state.speed);
                    break;
                case ActivityState.WALKING:
                    state.phase += deltaSeconds * this.walkCycleSpeed * (0.5 + state.speed * 2);
                    break;
                case ActivityState.ATTACKING:
                    state.attackPhase += deltaSeconds * 8;
                    state.phase += deltaSeconds * this.walkCycleSpeed * 0.5;
                    break;
                case ActivityState.EATING:
                    state.phase += deltaSeconds * 4;
                    break;
                default:
                    state.phase += deltaSeconds * this.idleBobSpeed;
            }

            // Secondary animations (breathing, looking around)
            state.secondaryPhase += deltaSeconds * 1.5;
            state.breathPhase += deltaSeconds * 2;

            // Blink timer
            state.blinkTimer -= deltaSeconds;
            if (state.blinkTimer <= 0) {
                state.blinkTimer = 2 + Math.random() * 4;
            }

            // Look around timer for idle
            if (state.activity === ActivityState.IDLE) {
                state.lookAroundTimer -= deltaSeconds;
                if (state.lookAroundTimer <= 0) {
                    state.lookAroundTimer = 3 + Math.random() * 5;
                    // Random head turn target
                    state.targetHeadRotation.y = (Math.random() - 0.5) * 0.8;
                }
            } else {
                state.targetHeadRotation.y = 0;
            }

            // Decay hit reaction
            if (state.hitReaction > 0) {
                state.hitReaction *= 0.9;
                if (state.hitReaction < 0.01) state.hitReaction = 0;
            }

            // Keep phase in reasonable range
            if (state.phase > Math.PI * 20) {
                state.phase -= Math.PI * 20;
            }
            if (state.attackPhase > Math.PI * 2) {
                state.attackPhase -= Math.PI * 2;
            }

            // Smoothly interpolate all animation values
            const smoothFactor = state.activity === ActivityState.ATTACKING ?
                this.fastSmoothingFactor : this.smoothingFactor;

            for (let i = 0; i < 4; i++) {
                state.currentLegRotation[i] = this.lerp(
                    state.currentLegRotation[i],
                    state.targetLegRotation[i],
                    smoothFactor
                );
            }
            for (let i = 0; i < 2; i++) {
                state.currentArmRotation[i] = this.lerp(
                    state.currentArmRotation[i],
                    state.targetArmRotation[i],
                    smoothFactor
                );
            }
            state.currentBodyOffset = this.lerp(state.currentBodyOffset, state.targetBodyOffset, smoothFactor);
            state.currentBodyTilt.x = this.lerp(state.currentBodyTilt.x, state.targetBodyTilt.x, smoothFactor);
            state.currentBodyTilt.z = this.lerp(state.currentBodyTilt.z, state.targetBodyTilt.z, smoothFactor);
            state.currentHeadRotation.x = this.lerp(state.currentHeadRotation.x, state.targetHeadRotation.x, smoothFactor);
            state.currentHeadRotation.y = this.lerp(state.currentHeadRotation.y, state.targetHeadRotation.y, smoothFactor);
        }
    }

    // Apply walk animation to a quadruped mesh (herbivore/carnivore)
    animateQuadruped(mesh, state) {
        if (!mesh || !state) return;

        const phase = state.phase;
        const activity = state.activity;

        // Find leg meshes by searching children
        const legs = [];
        mesh.traverse((child) => {
            if (child.userData.isLeg) {
                legs.push(child);
            }
        });

        // Calculate target leg rotations based on activity
        let walkAmplitude = 0.1;
        let speedMultiplier = 1;

        switch (activity) {
            case ActivityState.RUNNING:
                walkAmplitude = 0.6;
                speedMultiplier = 1.5;
                break;
            case ActivityState.WALKING:
                walkAmplitude = 0.4;
                break;
            case ActivityState.ATTACKING:
                walkAmplitude = 0.2;
                break;
            case ActivityState.EATING:
                walkAmplitude = 0.05;
                break;
            case ActivityState.IDLE:
            default:
                walkAmplitude = 0.1;
        }

        // Hit reaction adds extra wobble
        const hitWobble = state.hitReaction * 0.3;

        if (legs.length >= 4) {
            // Quadruped walk cycle - diagonal pairs move together
            state.targetLegRotation[0] = Math.sin(phase * speedMultiplier) * walkAmplitude + hitWobble;
            state.targetLegRotation[3] = Math.sin(phase * speedMultiplier) * walkAmplitude + hitWobble;
            state.targetLegRotation[1] = Math.sin(phase * speedMultiplier + Math.PI) * walkAmplitude - hitWobble;
            state.targetLegRotation[2] = Math.sin(phase * speedMultiplier + Math.PI) * walkAmplitude - hitWobble;

            // Apply smoothed rotations
            legs[0].rotation.x = state.currentLegRotation[0];
            if (legs[3]) legs[3].rotation.x = state.currentLegRotation[3];
            if (legs[1]) legs[1].rotation.x = state.currentLegRotation[1];
            if (legs[2]) legs[2].rotation.x = state.currentLegRotation[2];
        }

        // Body bob and tilt
        let bodyBob = 0;
        let bodyTiltX = 0;
        let bodyTiltZ = 0;

        switch (activity) {
            case ActivityState.RUNNING:
                bodyBob = Math.abs(Math.sin(phase * 2 * speedMultiplier)) * 0.08;
                bodyTiltX = Math.sin(phase * speedMultiplier) * 0.05;
                break;
            case ActivityState.WALKING:
                bodyBob = Math.abs(Math.sin(phase * 2)) * 0.05;
                break;
            case ActivityState.EATING:
                bodyBob = -0.1 + Math.sin(phase) * 0.05; // Dip down for eating
                bodyTiltX = 0.2 + Math.sin(phase) * 0.1;
                break;
            case ActivityState.ATTACKING:
                bodyBob = Math.sin(state.attackPhase) * 0.1;
                bodyTiltX = -0.1 + Math.sin(state.attackPhase * 2) * 0.15;
                break;
            case ActivityState.IDLE:
            default:
                bodyBob = Math.sin(phase) * this.idleBobAmount * 0.5;
                // Breathing effect
                bodyBob += Math.sin(state.breathPhase) * 0.01;
        }

        // Apply hit reaction
        bodyBob += state.hitReaction * 0.1;
        bodyTiltZ += state.hitReaction * 0.2;

        state.targetBodyOffset = bodyBob;
        state.targetBodyTilt.x = bodyTiltX;
        state.targetBodyTilt.z = bodyTiltZ;

        // Find and animate body mesh
        mesh.traverse((child) => {
            if (child.userData.isBody) {
                child.position.y = (child.userData.baseY || 0) + state.currentBodyOffset;
                child.rotation.x = state.currentBodyTilt.x;
                child.rotation.z = state.currentBodyTilt.z;
            }
            if (child.userData.isHead) {
                // Head movement - look around, eating nod
                let headX = state.currentHeadRotation.x;
                let headY = state.currentHeadRotation.y;

                if (activity === ActivityState.EATING) {
                    headX = 0.3 + Math.sin(phase * 2) * 0.15;
                } else if (activity === ActivityState.ATTACKING) {
                    headX = -0.2 + Math.sin(state.attackPhase) * 0.1;
                }

                state.targetHeadRotation.x = headX;
                child.rotation.x = state.currentHeadRotation.x;
                child.rotation.y = state.currentHeadRotation.y;
            }
            // Tail wagging
            if (child.userData.isTail) {
                const wagSpeed = activity === ActivityState.RUNNING ? 3 : 1.5;
                const wagAmount = activity === ActivityState.ATTACKING ? 0.1 : 0.3;
                child.rotation.y = Math.sin(phase * wagSpeed) * wagAmount;
            }
        });
    }

    // Apply walk animation to a biped mesh (humanoid)
    animateBiped(mesh, state) {
        if (!mesh || !state) return;

        const phase = state.phase;
        const activity = state.activity;

        const legs = [];
        const arms = [];

        mesh.traverse((child) => {
            if (child.userData.isLeg) {
                legs.push(child);
            }
            if (child.userData.isArm) {
                arms.push(child);
            }
        });

        // Calculate animation parameters based on activity
        let walkAmplitude = 0.1;
        let armSwing = 0.05;
        let speedMultiplier = 1;

        switch (activity) {
            case ActivityState.RUNNING:
                walkAmplitude = 0.7;
                armSwing = 0.5;
                speedMultiplier = 1.5;
                break;
            case ActivityState.WALKING:
                walkAmplitude = 0.5;
                armSwing = 0.3;
                break;
            case ActivityState.ATTACKING:
                walkAmplitude = 0.2;
                armSwing = 0.8; // Big arm swings for attacks
                break;
            case ActivityState.EATING:
            case ActivityState.GATHERING:
                walkAmplitude = 0.1;
                armSwing = 0.4;
                break;
            case ActivityState.BUILDING:
                walkAmplitude = 0.15;
                armSwing = 0.6;
                break;
            case ActivityState.IDLE:
            default:
                walkAmplitude = 0.1;
                armSwing = 0.05;
        }

        // Apply hit reaction
        const hitWobble = state.hitReaction * 0.3;

        // Leg animation - opposite phase
        if (legs.length >= 2) {
            state.targetLegRotation[0] = Math.sin(phase * speedMultiplier) * walkAmplitude + hitWobble;
            state.targetLegRotation[1] = Math.sin(phase * speedMultiplier + Math.PI) * walkAmplitude - hitWobble;

            legs[0].rotation.x = state.currentLegRotation[0];
            legs[1].rotation.x = state.currentLegRotation[1];
        }

        // Arm animation - activity dependent
        if (arms.length >= 2) {
            if (activity === ActivityState.ATTACKING) {
                // Attack animation - both arms swing forward
                const attackSwing = Math.sin(state.attackPhase) * armSwing;
                state.targetArmRotation[0] = -0.5 + attackSwing;
                state.targetArmRotation[1] = -0.5 + attackSwing * 0.8;
            } else if (activity === ActivityState.EATING || activity === ActivityState.GATHERING) {
                // Arms move forward for reaching
                state.targetArmRotation[0] = -0.4 + Math.sin(phase) * 0.2;
                state.targetArmRotation[1] = -0.4 + Math.sin(phase + 0.5) * 0.2;
            } else if (activity === ActivityState.BUILDING) {
                // Alternating arm movements for hammering
                state.targetArmRotation[0] = -0.8 + Math.abs(Math.sin(phase * 2)) * 0.6;
                state.targetArmRotation[1] = -0.3 + Math.sin(phase) * 0.1;
            } else {
                // Normal walking - arms swing opposite to legs
                state.targetArmRotation[0] = Math.sin(phase * speedMultiplier + Math.PI) * armSwing;
                state.targetArmRotation[1] = Math.sin(phase * speedMultiplier) * armSwing;
            }

            arms[0].rotation.x = state.currentArmRotation[0];
            arms[1].rotation.x = state.currentArmRotation[1];
        }

        // Body animation
        let bodyBob = 0;
        let bodyTiltX = 0;
        let bodyTiltZ = 0;

        switch (activity) {
            case ActivityState.RUNNING:
                bodyBob = Math.abs(Math.sin(phase * 2 * speedMultiplier)) * 0.05;
                bodyTiltX = 0.1; // Lean forward when running
                break;
            case ActivityState.WALKING:
                bodyBob = Math.abs(Math.sin(phase * 2)) * 0.03;
                break;
            case ActivityState.ATTACKING:
                bodyBob = Math.sin(state.attackPhase) * 0.05;
                bodyTiltX = -0.15 + Math.sin(state.attackPhase) * 0.1;
                break;
            case ActivityState.EATING:
            case ActivityState.GATHERING:
                bodyBob = -0.15 + Math.sin(phase) * 0.03;
                bodyTiltX = 0.3;
                break;
            case ActivityState.BUILDING:
                bodyBob = Math.abs(Math.sin(phase * 2)) * 0.04;
                bodyTiltX = 0.15;
                break;
            case ActivityState.IDLE:
            default:
                bodyBob = Math.sin(phase) * this.idleBobAmount * 0.3;
                bodyBob += Math.sin(state.breathPhase) * 0.015;
        }

        // Apply hit reaction
        bodyBob += state.hitReaction * 0.15;
        bodyTiltZ += state.hitReaction * 0.25;

        state.targetBodyOffset = bodyBob;
        state.targetBodyTilt.x = bodyTiltX;
        state.targetBodyTilt.z = bodyTiltZ;

        mesh.traverse((child) => {
            if (child.userData.isBody) {
                child.position.y = (child.userData.baseY || 0.5) + state.currentBodyOffset;
                child.rotation.x = state.currentBodyTilt.x;
                child.rotation.z = state.currentBodyTilt.z;
            }

            // Head animation
            if (child.userData.isHead) {
                let headX = Math.sin(phase * 0.5) * 0.05;
                let headY = state.currentHeadRotation.y;

                if (activity === ActivityState.EATING || activity === ActivityState.GATHERING) {
                    headX = 0.3 + Math.sin(phase) * 0.1;
                } else if (activity === ActivityState.ATTACKING) {
                    headX = -0.1;
                } else if (activity === ActivityState.BUILDING) {
                    headX = 0.2 + Math.sin(phase * 2) * 0.05;
                }

                state.targetHeadRotation.x = headX;
                child.rotation.x = state.currentHeadRotation.x;
                child.rotation.y = headY;
            }
        });
    }

    // Apply idle/sway animation to plants
    animatePlant(mesh, state, windStrength = 0.3, windDirection = null) {
        if (!mesh || !state) return;

        const phase = state.phase;

        // Default wind direction if not provided
        const windX = windDirection ? windDirection.x : 1;
        const windZ = windDirection ? windDirection.z : 0.5;
        const windMagnitude = Math.sqrt(windX * windX + windZ * windZ) || 1;

        mesh.traverse((child) => {
            if (child.userData.isLeaves) {
                // Leaves sway in the wind direction with natural variation
                const swayOffset = child.userData.swayOffset || 0;
                const baseSwayX = Math.sin(phase + swayOffset) * windStrength * 0.15;
                const baseSwayZ = Math.cos(phase * 0.7 + swayOffset) * windStrength * 0.12;

                // Add turbulence for more natural movement
                const turbulence = Math.sin(phase * 3 + swayOffset * 2) * windStrength * 0.05;

                // Add wind direction bias
                const windBiasX = (windX / windMagnitude) * windStrength * 0.1;
                const windBiasZ = (windZ / windMagnitude) * windStrength * 0.08;

                child.rotation.x = baseSwayX + windBiasX * Math.sin(phase * 0.3) + turbulence;
                child.rotation.z = baseSwayZ + windBiasZ * Math.sin(phase * 0.4) + turbulence * 0.5;

                // Gentle scale breathing for leaves
                const breathe = 1 + Math.sin(phase * 0.5 + swayOffset) * 0.02;
                if (child.userData.originalScale) {
                    child.scale.setScalar(child.userData.originalScale * breathe);
                }
            }

            if (child.userData.isTrunk) {
                // Trunk sways in wind direction with smooth damping
                const trunkSwayX = Math.sin(phase * 0.8) * windStrength * 0.03;
                const trunkSwayZ = Math.cos(phase * 0.6) * windStrength * 0.03;

                // Wind pushes trunk
                const windPushX = (windX / windMagnitude) * windStrength * 0.015;
                const windPushZ = (windZ / windMagnitude) * windStrength * 0.015;

                child.rotation.x = trunkSwayX + windPushX;
                child.rotation.z = trunkSwayZ + windPushZ;
            }

            // Flower petals gentle movement
            if (child.userData.isPetal) {
                const petalOffset = child.userData.petalIndex || 0;
                child.rotation.y = Math.sin(phase * 0.5 + petalOffset * 0.5) * 0.05;
                child.rotation.x = Math.sin(phase * 0.3 + petalOffset) * 0.03;
            }
        });
    }

    // Get count of active animations
    getActiveCount() {
        return this.animationStates.size;
    }
}

export default AnimationSystem;
