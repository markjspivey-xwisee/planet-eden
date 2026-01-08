// effects.js - AAA-Quality Visual Effects System for Planet Eden
// Includes screen shake, vignette, color grading, bloom, and environmental effects

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Custom color grading shader for time-of-day effects
const ColorGradingShader = {
    uniforms: {
        tDiffuse: { value: null },
        brightness: { value: 0.0 },
        contrast: { value: 1.0 },
        saturation: { value: 1.0 },
        tint: { value: new THREE.Color(1, 1, 1) },
        vignetteIntensity: { value: 0.0 },
        vignetteRadius: { value: 0.8 },
        vignetteSoftness: { value: 0.5 },
        time: { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float brightness;
        uniform float contrast;
        uniform float saturation;
        uniform vec3 tint;
        uniform float vignetteIntensity;
        uniform float vignetteRadius;
        uniform float vignetteSoftness;
        uniform float time;

        varying vec2 vUv;

        vec3 adjustSaturation(vec3 color, float sat) {
            float gray = dot(color, vec3(0.299, 0.587, 0.114));
            return mix(vec3(gray), color, sat);
        }

        void main() {
            vec4 texel = texture2D(tDiffuse, vUv);
            vec3 color = texel.rgb;

            // Apply brightness
            color += brightness;

            // Apply contrast
            color = (color - 0.5) * contrast + 0.5;

            // Apply saturation
            color = adjustSaturation(color, saturation);

            // Apply color tint
            color *= tint;

            // Vignette effect
            vec2 centeredUv = vUv - 0.5;
            float dist = length(centeredUv);
            float vignette = smoothstep(vignetteRadius, vignetteRadius - vignetteSoftness, dist);
            vignette = mix(1.0, vignette, vignetteIntensity);
            color *= vignette;

            // Clamp final color
            color = clamp(color, 0.0, 1.0);

            gl_FragColor = vec4(color, texel.a);
        }
    `
};

// Screen shake effect shader
const ScreenShakeShader = {
    uniforms: {
        tDiffuse: { value: null },
        offsetX: { value: 0.0 },
        offsetY: { value: 0.0 },
        intensity: { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float offsetX;
        uniform float offsetY;
        uniform float intensity;
        varying vec2 vUv;

        void main() {
            vec2 uv = vUv;
            uv.x += offsetX * intensity;
            uv.y += offsetY * intensity;
            gl_FragColor = texture2D(tDiffuse, uv);
        }
    `
};

export class VisualEffectsSystem {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;

        // Effect composer for post-processing
        this.composer = null;
        this.colorGradingPass = null;
        this.screenShakePass = null;
        this.bloomPass = null;

        // Screen shake state
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeDecay = 5.0; // How fast shake decays
        this.shakeTime = 0;

        // Vignette state
        this.vignetteIntensity = 0;
        this.vignetteTargetIntensity = 0;
        this.vignetteTransitionSpeed = 2.0;

        // Color grading presets for different times/events
        this.colorGradingPresets = {
            normal: { brightness: 0, contrast: 1.0, saturation: 1.0, tint: new THREE.Color(1, 1, 1) },
            dawn: { brightness: 0.02, contrast: 1.1, saturation: 1.1, tint: new THREE.Color(1.1, 0.95, 0.85) },
            day: { brightness: 0.05, contrast: 1.05, saturation: 1.05, tint: new THREE.Color(1.0, 1.0, 1.0) },
            sunset: { brightness: 0.03, contrast: 1.15, saturation: 1.2, tint: new THREE.Color(1.2, 0.9, 0.7) },
            dusk: { brightness: -0.02, contrast: 1.1, saturation: 0.9, tint: new THREE.Color(0.9, 0.85, 1.0) },
            night: { brightness: -0.1, contrast: 1.2, saturation: 0.7, tint: new THREE.Color(0.7, 0.8, 1.1) },
            storm: { brightness: -0.15, contrast: 1.3, saturation: 0.6, tint: new THREE.Color(0.8, 0.85, 1.0) },
            combat: { brightness: 0.05, contrast: 1.2, saturation: 1.3, tint: new THREE.Color(1.1, 0.9, 0.9) }
        };

        this.currentGrading = { ...this.colorGradingPresets.normal };
        this.targetGrading = { ...this.colorGradingPresets.normal };
        this.gradingTransitionSpeed = 1.0;

        // Campfire glow tracking
        this.campfireLights = new Map();

        // Flash effects queue
        this.flashEffects = [];

        // Ambient occlusion (fake) - darker areas near ground
        this.aoEnabled = true;

        this.initialized = false;
    }

    init() {
        // Create effect composer
        this.composer = new EffectComposer(this.renderer);

        // Main render pass
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Bloom pass for glowing effects (campfires, lightning, etc.)
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.5,   // strength
            0.4,   // radius
            0.85   // threshold
        );
        this.composer.addPass(this.bloomPass);

        // Screen shake pass
        this.screenShakePass = new ShaderPass(ScreenShakeShader);
        this.screenShakePass.uniforms.intensity.value = 0;
        this.composer.addPass(this.screenShakePass);

        // Color grading pass (includes vignette)
        this.colorGradingPass = new ShaderPass(ColorGradingShader);
        this.composer.addPass(this.colorGradingPass);

        this.initialized = true;
        console.log('[VisualEffects] AAA-quality effects system initialized');
    }

    // Trigger screen shake (for combat, explosions, lightning, etc.)
    triggerScreenShake(intensity = 1.0, duration = 0.5) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.shakeDuration = Math.max(this.shakeDuration, duration);
        this.shakeTime = 0;
    }

    // Trigger lightning flash effect
    triggerLightningFlash() {
        this.flashEffects.push({
            intensity: 1.0,
            duration: 0.3,
            elapsed: 0,
            color: new THREE.Color(0.9, 0.95, 1.0)
        });

        // Also trigger screen shake for thunder
        setTimeout(() => {
            this.triggerScreenShake(0.3, 0.2);
        }, 100 + Math.random() * 200);
    }

    // Set vignette intensity (for storms, danger, focus)
    setVignetteIntensity(intensity, instant = false) {
        this.vignetteTargetIntensity = Math.max(0, Math.min(1, intensity));
        if (instant) {
            this.vignetteIntensity = this.vignetteTargetIntensity;
        }
    }

    // Set color grading based on time of day or event
    setColorGrading(preset, transitionSpeed = 1.0) {
        if (this.colorGradingPresets[preset]) {
            this.targetGrading = { ...this.colorGradingPresets[preset] };
            this.gradingTransitionSpeed = transitionSpeed;
        }
    }

    // Set custom color grading
    setCustomGrading(brightness, contrast, saturation, tint) {
        this.targetGrading = {
            brightness: brightness !== undefined ? brightness : this.targetGrading.brightness,
            contrast: contrast !== undefined ? contrast : this.targetGrading.contrast,
            saturation: saturation !== undefined ? saturation : this.targetGrading.saturation,
            tint: tint !== undefined ? tint.clone() : this.targetGrading.tint
        };
    }

    // Add campfire glow light to a position
    addCampfireGlow(id, position, intensity = 1.0) {
        if (this.campfireLights.has(id)) {
            const light = this.campfireLights.get(id);
            light.position.copy(position);
            light.intensity = intensity * 2;
            return;
        }

        const light = new THREE.PointLight(0xff6600, intensity * 2, 15, 2);
        light.position.copy(position);
        light.castShadow = false; // Performance optimization

        // Add flickering data
        light.userData.flickerPhase = Math.random() * Math.PI * 2;
        light.userData.baseIntensity = intensity * 2;

        this.scene.add(light);
        this.campfireLights.set(id, light);
    }

    // Remove campfire glow
    removeCampfireGlow(id) {
        if (this.campfireLights.has(id)) {
            const light = this.campfireLights.get(id);
            this.scene.remove(light);
            this.campfireLights.delete(id);
        }
    }

    // Set bloom strength (for day/night transition)
    setBloomStrength(strength) {
        if (this.bloomPass) {
            this.bloomPass.strength = strength;
        }
    }

    // Update all effects (called each frame)
    update(deltaMs) {
        if (!this.initialized) return;

        const deltaSeconds = deltaMs / 1000;

        // Update screen shake
        this.updateScreenShake(deltaSeconds);

        // Update vignette
        this.updateVignette(deltaSeconds);

        // Update color grading
        this.updateColorGrading(deltaSeconds);

        // Update flash effects
        this.updateFlashEffects(deltaSeconds);

        // Update campfire flickering
        this.updateCampfireLights(deltaSeconds);

        // Apply to shader uniforms
        this.applyEffects();
    }

    updateScreenShake(deltaSeconds) {
        if (this.shakeDuration > 0) {
            this.shakeTime += deltaSeconds;

            // Calculate shake decay
            const decay = 1 - (this.shakeTime / this.shakeDuration);
            const currentIntensity = this.shakeIntensity * decay * decay;

            // Random shake offset
            const shakeX = (Math.random() - 0.5) * 2 * currentIntensity * 0.02;
            const shakeY = (Math.random() - 0.5) * 2 * currentIntensity * 0.02;

            this.screenShakePass.uniforms.offsetX.value = shakeX;
            this.screenShakePass.uniforms.offsetY.value = shakeY;
            this.screenShakePass.uniforms.intensity.value = currentIntensity;

            if (this.shakeTime >= this.shakeDuration) {
                this.shakeDuration = 0;
                this.shakeIntensity = 0;
                this.screenShakePass.uniforms.intensity.value = 0;
            }
        }
    }

    updateVignette(deltaSeconds) {
        // Smoothly interpolate vignette intensity
        const diff = this.vignetteTargetIntensity - this.vignetteIntensity;
        this.vignetteIntensity += diff * Math.min(1, deltaSeconds * this.vignetteTransitionSpeed * 3);
    }

    updateColorGrading(deltaSeconds) {
        const speed = deltaSeconds * this.gradingTransitionSpeed;

        // Interpolate each grading parameter
        this.currentGrading.brightness += (this.targetGrading.brightness - this.currentGrading.brightness) * speed;
        this.currentGrading.contrast += (this.targetGrading.contrast - this.currentGrading.contrast) * speed;
        this.currentGrading.saturation += (this.targetGrading.saturation - this.currentGrading.saturation) * speed;

        if (this.currentGrading.tint && this.targetGrading.tint) {
            this.currentGrading.tint.lerp(this.targetGrading.tint, speed);
        }
    }

    updateFlashEffects(deltaSeconds) {
        for (let i = this.flashEffects.length - 1; i >= 0; i--) {
            const flash = this.flashEffects[i];
            flash.elapsed += deltaSeconds;

            if (flash.elapsed >= flash.duration) {
                this.flashEffects.splice(i, 1);
            }
        }
    }

    updateCampfireLights(deltaSeconds) {
        for (const [id, light] of this.campfireLights) {
            // Update flicker phase
            light.userData.flickerPhase += deltaSeconds * 10;

            // Calculate flicker
            const flicker = Math.sin(light.userData.flickerPhase) * 0.2 +
                           Math.sin(light.userData.flickerPhase * 2.3) * 0.15 +
                           Math.random() * 0.1;

            light.intensity = light.userData.baseIntensity * (1 + flicker);

            // Slight color variation
            const colorVar = 0.9 + flicker * 0.2;
            light.color.setRGB(1.0 * colorVar, 0.5 * colorVar, 0.2);
        }
    }

    applyEffects() {
        if (!this.colorGradingPass) return;

        const uniforms = this.colorGradingPass.uniforms;

        // Apply color grading
        uniforms.brightness.value = this.currentGrading.brightness;
        uniforms.contrast.value = this.currentGrading.contrast;
        uniforms.saturation.value = this.currentGrading.saturation;

        if (this.currentGrading.tint) {
            uniforms.tint.value.copy(this.currentGrading.tint);
        }

        // Apply vignette
        uniforms.vignetteIntensity.value = this.vignetteIntensity;

        // Apply flash effects (additive brightness)
        let flashBrightness = 0;
        for (const flash of this.flashEffects) {
            const progress = flash.elapsed / flash.duration;
            const flashIntensity = flash.intensity * (1 - progress) * (1 - progress);
            flashBrightness += flashIntensity * 0.3;
        }
        uniforms.brightness.value += flashBrightness;
    }

    // Render using effect composer instead of direct renderer
    render() {
        if (this.initialized && this.composer) {
            this.composer.render();
            return true;
        }
        return false;
    }

    // Handle window resize
    onResize(width, height) {
        if (this.composer) {
            this.composer.setSize(width, height);
        }
        if (this.bloomPass) {
            this.bloomPass.setSize(width, height);
        }
    }

    // Dispose all resources
    dispose() {
        // Remove all campfire lights
        for (const [id, light] of this.campfireLights) {
            this.scene.remove(light);
        }
        this.campfireLights.clear();

        if (this.composer) {
            this.composer.dispose();
        }
    }
}

export default VisualEffectsSystem;
