// animation.js - Procedural Animation System for Planet Eden
// Handles walk cycles, idle animations, and behavior-specific animations

import * as THREE from 'three';

export class AnimationSystem {
    constructor() {
        // Animation states
        this.animationStates = new Map(); // id -> animation state

        // Default animation parameters
        this.walkCycleSpeed = 8; // Leg swings per second
        this.idleBobSpeed = 2; // Idle bob frequency
        this.idleBobAmount = 0.05; // Idle bob height
    }

    // Initialize animation state for an organism
    initAnimationState(id, type) {
        this.animationStates.set(id, {
            phase: 0, // Animation phase (0-2*PI)
            isMoving: false,
            speed: 0,
            type: type,
            lastUpdate: Date.now()
        });
    }

    // Update animation state based on movement
    updateAnimationState(id, isMoving, speed) {
        const state = this.animationStates.get(id);
        if (state) {
            state.isMoving = isMoving;
            state.speed = speed;
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

    // Update all animations (call each frame)
    update(deltaMs) {
        const deltaSeconds = deltaMs / 1000;

        for (const [id, state] of this.animationStates) {
            if (state.isMoving) {
                // Walking animation - advance phase based on movement speed
                state.phase += deltaSeconds * this.walkCycleSpeed * (0.5 + state.speed * 2);
            } else {
                // Idle animation - slow gentle movement
                state.phase += deltaSeconds * this.idleBobSpeed;
            }

            // Keep phase in reasonable range
            if (state.phase > Math.PI * 20) {
                state.phase -= Math.PI * 20;
            }
        }
    }

    // Apply walk animation to a quadruped mesh (herbivore/carnivore)
    animateQuadruped(mesh, state) {
        if (!mesh || !state) return;

        const phase = state.phase;
        const isMoving = state.isMoving;

        // Find leg meshes by searching children
        const legs = [];
        mesh.traverse((child) => {
            if (child.userData.isLeg) {
                legs.push(child);
            }
        });

        if (legs.length === 4) {
            // Quadruped walk cycle - diagonal pairs move together
            const walkAmplitude = isMoving ? 0.4 : 0.1;

            // Front left and back right (pair 1)
            if (legs[0]) {
                legs[0].rotation.x = Math.sin(phase) * walkAmplitude;
            }
            if (legs[3]) {
                legs[3].rotation.x = Math.sin(phase) * walkAmplitude;
            }

            // Front right and back left (pair 2) - opposite phase
            if (legs[1]) {
                legs[1].rotation.x = Math.sin(phase + Math.PI) * walkAmplitude;
            }
            if (legs[2]) {
                legs[2].rotation.x = Math.sin(phase + Math.PI) * walkAmplitude;
            }
        }

        // Body bob during movement
        const bodyBob = isMoving
            ? Math.abs(Math.sin(phase * 2)) * 0.05
            : Math.sin(phase) * this.idleBobAmount * 0.5;

        // Find body mesh and apply bob
        mesh.traverse((child) => {
            if (child.userData.isBody) {
                child.position.y = child.userData.baseY + bodyBob;
            }
        });
    }

    // Apply walk animation to a biped mesh (humanoid)
    animateBiped(mesh, state) {
        if (!mesh || !state) return;

        const phase = state.phase;
        const isMoving = state.isMoving;

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

        // Walking animation
        const walkAmplitude = isMoving ? 0.5 : 0.1;
        const armSwing = isMoving ? 0.3 : 0.05;

        // Legs swing opposite to each other
        if (legs.length >= 2) {
            legs[0].rotation.x = Math.sin(phase) * walkAmplitude;
            legs[1].rotation.x = Math.sin(phase + Math.PI) * walkAmplitude;
        }

        // Arms swing opposite to legs (natural walking motion)
        if (arms.length >= 2) {
            arms[0].rotation.x = Math.sin(phase + Math.PI) * armSwing;
            arms[1].rotation.x = Math.sin(phase) * armSwing;
        }

        // Body bob and slight lean
        mesh.traverse((child) => {
            if (child.userData.isBody) {
                const bodyBob = isMoving
                    ? Math.abs(Math.sin(phase * 2)) * 0.03
                    : Math.sin(phase) * this.idleBobAmount * 0.3;
                child.position.y = (child.userData.baseY || 0.5) + bodyBob;
            }

            // Head slight bob
            if (child.userData.isHead) {
                child.rotation.x = Math.sin(phase * 0.5) * 0.05;
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
                const baseSwayX = Math.sin(phase + (child.userData.swayOffset || 0)) * windStrength * 0.15;
                const baseSwayZ = Math.cos(phase * 0.7 + (child.userData.swayOffset || 0)) * windStrength * 0.12;

                // Add wind direction bias
                const windBiasX = (windX / windMagnitude) * windStrength * 0.1;
                const windBiasZ = (windZ / windMagnitude) * windStrength * 0.08;

                child.rotation.x = baseSwayX + windBiasX * Math.sin(phase * 0.3);
                child.rotation.z = baseSwayZ + windBiasZ * Math.sin(phase * 0.4);

                // Gentle scale breathing for leaves
                const breathe = 1 + Math.sin(phase * 0.5 + (child.userData.swayOffset || 0)) * 0.02;
                if (child.userData.originalScale) {
                    child.scale.setScalar(child.userData.originalScale * breathe);
                }
            }

            if (child.userData.isTrunk) {
                // Trunk sways in wind direction
                const trunkSwayX = Math.sin(phase * 0.8) * windStrength * 0.03;
                const trunkSwayZ = Math.cos(phase * 0.6) * windStrength * 0.03;

                // Wind pushes trunk
                const windPushX = (windX / windMagnitude) * windStrength * 0.015;
                const windPushZ = (windZ / windMagnitude) * windStrength * 0.015;

                child.rotation.x = trunkSwayX + windPushX;
                child.rotation.z = trunkSwayZ + windPushZ;
            }
        });
    }
}

export default AnimationSystem;
