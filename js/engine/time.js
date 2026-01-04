// time.js - Game Time and Day/Night Cycle System
// Reusable module for managing game time, day/night cycles, and seasonal changes

import * as THREE from 'three';

export class TimeSystem {
    constructor(options = {}) {
        // Time configuration
        this.dayLengthSeconds = options.dayLengthSeconds || 120; // 2 minutes = 1 game day
        this.startHour = options.startHour || 8; // Start at 8 AM

        // Current time state
        this.gameTime = this.startHour / 24; // 0-1 representing full day cycle
        this.day = 1;
        this.paused = false;

        // Celestial bodies
        this.sunAngle = 0;
        this.moonAngle = Math.PI; // Opposite to sun

        // Lighting state
        this.sunIntensity = 1.0;
        this.ambientIntensity = 0.3;
        this.skyColor = new THREE.Color(0x87CEEB);
        this.fogColor = new THREE.Color(0x87CEEB);

        // Time of day thresholds (in 0-1 range)
        this.dawn = 0.25;      // 6 AM
        this.sunrise = 0.29;   // 7 AM
        this.noon = 0.5;       // 12 PM
        this.sunset = 0.75;    // 6 PM
        this.dusk = 0.79;      // 7 PM
        this.midnight = 0.0;   // 12 AM

        // Color palettes for different times
        this.colors = {
            night: {
                sky: new THREE.Color(0x0a0a1a),
                ambient: new THREE.Color(0x1a1a2e),
                sun: new THREE.Color(0x2a2a4a),
                fog: new THREE.Color(0x0a0a1a)
            },
            dawn: {
                sky: new THREE.Color(0x2d1b4e),
                ambient: new THREE.Color(0x4a3060),
                sun: new THREE.Color(0xff6b6b),
                fog: new THREE.Color(0x3d2b5e)
            },
            sunrise: {
                sky: new THREE.Color(0xffa07a),
                ambient: new THREE.Color(0xffd4b8),
                sun: new THREE.Color(0xffcc00),
                fog: new THREE.Color(0xffc090)
            },
            day: {
                sky: new THREE.Color(0x87CEEB),
                ambient: new THREE.Color(0xffffff),
                sun: new THREE.Color(0xffffff),
                fog: new THREE.Color(0x87CEEB)
            },
            sunset: {
                sky: new THREE.Color(0xff7f50),
                ambient: new THREE.Color(0xffa07a),
                sun: new THREE.Color(0xff4500),
                fog: new THREE.Color(0xff8060)
            },
            dusk: {
                sky: new THREE.Color(0x4a3060),
                ambient: new THREE.Color(0x3a2050),
                sun: new THREE.Color(0x8b4513),
                fog: new THREE.Color(0x3a2050)
            }
        };

        // Callbacks
        this.onTimeChange = null;
        this.onDayChange = null;
        this.onPhaseChange = null;

        this.currentPhase = 'day';
    }

    update(deltaMs) {
        if (this.paused) return;

        const deltaSeconds = deltaMs / 1000;
        const dayProgress = deltaSeconds / this.dayLengthSeconds;

        this.gameTime += dayProgress;

        // Handle day rollover
        if (this.gameTime >= 1.0) {
            this.gameTime -= 1.0;
            this.day++;
            if (this.onDayChange) {
                this.onDayChange(this.day);
            }
        }

        // Update sun/moon angles
        this.sunAngle = this.gameTime * Math.PI * 2 - Math.PI / 2;
        this.moonAngle = this.sunAngle + Math.PI;

        // Determine current phase and interpolate colors
        this.updateLighting();

        if (this.onTimeChange) {
            this.onTimeChange(this.getTimeInfo());
        }
    }

    updateLighting() {
        const t = this.gameTime;
        let phase, colors1, colors2, blend;

        if (t < this.dawn) {
            // Night to dawn
            phase = 'night';
            colors1 = this.colors.night;
            colors2 = this.colors.dawn;
            blend = t / this.dawn;
        } else if (t < this.sunrise) {
            // Dawn to sunrise
            phase = 'dawn';
            colors1 = this.colors.dawn;
            colors2 = this.colors.sunrise;
            blend = (t - this.dawn) / (this.sunrise - this.dawn);
        } else if (t < this.noon) {
            // Sunrise to noon
            phase = 'morning';
            colors1 = this.colors.sunrise;
            colors2 = this.colors.day;
            blend = (t - this.sunrise) / (this.noon - this.sunrise);
        } else if (t < this.sunset) {
            // Noon to sunset
            phase = 'day';
            colors1 = this.colors.day;
            colors2 = this.colors.sunset;
            blend = (t - this.noon) / (this.sunset - this.noon);
        } else if (t < this.dusk) {
            // Sunset to dusk
            phase = 'sunset';
            colors1 = this.colors.sunset;
            colors2 = this.colors.dusk;
            blend = (t - this.sunset) / (this.dusk - this.sunset);
        } else {
            // Dusk to night
            phase = 'dusk';
            colors1 = this.colors.dusk;
            colors2 = this.colors.night;
            blend = (t - this.dusk) / (1.0 - this.dusk);
        }

        // Smooth blend using smoothstep
        blend = blend * blend * (3 - 2 * blend);

        // Interpolate colors
        this.skyColor.copy(colors1.sky).lerp(colors2.sky, blend);
        this.fogColor.copy(colors1.fog).lerp(colors2.fog, blend);

        // Calculate sun intensity based on height
        const sunHeight = Math.sin(this.sunAngle);
        this.sunIntensity = Math.max(0, sunHeight) * 1.5;
        this.ambientIntensity = 0.1 + Math.max(0, sunHeight) * 0.4;

        // Track phase changes
        if (phase !== this.currentPhase) {
            this.currentPhase = phase;
            if (this.onPhaseChange) {
                this.onPhaseChange(phase);
            }
        }
    }

    getTimeInfo() {
        const hours = Math.floor(this.gameTime * 24);
        const minutes = Math.floor((this.gameTime * 24 - hours) * 60);

        return {
            day: this.day,
            gameTime: this.gameTime,
            hours,
            minutes,
            timeString: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
            phase: this.currentPhase,
            isNight: this.gameTime < this.dawn || this.gameTime > this.dusk,
            sunAngle: this.sunAngle,
            moonAngle: this.moonAngle,
            sunIntensity: this.sunIntensity,
            ambientIntensity: this.ambientIntensity,
            skyColor: this.skyColor,
            fogColor: this.fogColor
        };
    }

    // Get sun position for a given orbit radius
    getSunPosition(radius = 200) {
        return new THREE.Vector3(
            Math.cos(this.sunAngle) * radius,
            Math.sin(this.sunAngle) * radius,
            0
        );
    }

    getMoonPosition(radius = 180) {
        return new THREE.Vector3(
            Math.cos(this.moonAngle) * radius,
            Math.sin(this.moonAngle) * radius,
            0
        );
    }

    // Set time directly (0-1)
    setTime(time) {
        this.gameTime = time % 1.0;
        this.updateLighting();
    }

    // Set time by hour (0-24)
    setHour(hour) {
        this.setTime(hour / 24);
    }

    pause() {
        this.paused = true;
    }

    resume() {
        this.paused = false;
    }

    setSpeed(multiplier) {
        this.dayLengthSeconds = 120 / multiplier;
    }
}

export default TimeSystem;
