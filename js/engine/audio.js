// Ambient Audio System for Planet Eden
// Uses Web Audio API for procedural ambient soundscapes

export class AudioSystem {
    constructor() {
        this.context = null;
        this.masterGain = null;
        this.enabled = false;
        this.initialized = false;

        // Volume controls
        this.volume = 0.3;      // Master volume
        this.sfxVolume = 0.8;   // Sound effects volume
        this.ambientVolume = 0.6; // Ambient sounds volume

        // Oscillators and nodes
        this.ambientNodes = [];
        this.windNode = null;
        this.birdTimer = null;

        // Weather sound nodes
        this.rainNode = null;
        this.thunderTimer = null;

        // State tracking
        this.timeOfDay = 0; // 0-1, affects soundscape
        this.weather = 'clear'; // clear, rain, storm
    }

    async init() {
        // Audio context must be created after user interaction
        this.createToggleButton();
        console.log('[AudioSystem] Ready (click speaker to enable)');
    }

    createToggleButton() {
        // Skip UI creation if new HUD is active
        if (window.PLANET_EDEN_USE_NEW_HUD) {
            console.log('[AudioSystem] Skipping old UI - using new HUD');
            // Still setup keyboard shortcut
            window.addEventListener('keydown', (e) => {
                if (e.key === 'm' || e.key === 'M') {
                    this.toggle();
                }
            });
            return;
        }

        const btn = document.createElement('button');
        btn.id = 'audio-toggle';
        btn.innerHTML = '🔇';
        btn.title = 'Toggle Audio (M)';
        btn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 60px;
            width: 36px;
            height: 36px;
            background: rgba(0, 0, 0, 0.6);
            border: 1px solid rgba(100, 200, 100, 0.2);
            border-radius: 50%;
            color: #fff;
            font-size: 16px;
            cursor: pointer;
            z-index: 1001;
            transition: all 0.2s;
            opacity: 0.7;
        `;
        btn.onmouseover = () => { btn.style.background = 'rgba(50, 100, 50, 0.8)'; btn.style.opacity = '1'; };
        btn.onmouseout = () => { btn.style.background = 'rgba(0, 0, 0, 0.6)'; btn.style.opacity = '0.7'; };
        btn.onclick = () => this.toggle();
        document.body.appendChild(btn);

        // Keyboard shortcut
        window.addEventListener('keydown', (e) => {
            if (e.key === 'm' || e.key === 'M') {
                this.toggle();
            }
        });
    }

    toggle() {
        if (!this.initialized) {
            this.initAudioContext();
        }

        this.enabled = !this.enabled;
        const btn = document.getElementById('audio-toggle');

        if (this.enabled) {
            this.context.resume();
            this.startAmbience();
            if (btn) btn.innerHTML = '🔊';
        } else {
            this.stopAmbience();
            if (btn) btn.innerHTML = '🔇';
        }

        console.log(`[AudioSystem] Audio ${this.enabled ? 'enabled' : 'disabled'}`);
    }

    initAudioContext() {
        if (this.initialized) return;

        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.context.destination);
            this.initialized = true;
            console.log('[AudioSystem] Audio context initialized');
        } catch (e) {
            console.error('[AudioSystem] Failed to create audio context:', e);
        }
    }

    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.1);
        }
    }

    // Create ambient wind/nature drone
    startAmbience() {
        if (!this.context || !this.enabled) return;

        // Base ambient drone (very low frequency rumble)
        this.createDrone(60, 0.08); // Low rumble
        this.createDrone(90, 0.04); // Mid low
        this.createDrone(120, 0.02); // Subtle harmonic

        // Wind noise
        this.createWindNoise();

        // Bird sounds (periodic)
        this.startBirdSounds();

        console.log('[AudioSystem] Ambience started');
    }

    createDrone(frequency, volume) {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        const filter = this.context.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.value = frequency;

        // Add subtle modulation
        const lfo = this.context.createOscillator();
        const lfoGain = this.context.createGain();
        lfo.frequency.value = 0.1 + Math.random() * 0.2;
        lfoGain.gain.value = frequency * 0.02;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();

        filter.type = 'lowpass';
        filter.frequency.value = 200;

        gain.gain.value = volume;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start();

        this.ambientNodes.push({ osc, gain, lfo, lfoGain, filter });
    }

    createWindNoise() {
        // Create noise buffer
        const bufferSize = this.context.sampleRate * 2;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        // Brown noise (more natural wind sound)
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5; // Amplify
        }

        const noise = this.context.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        // Filters for wind character
        const lowpass = this.context.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 400;

        const highpass = this.context.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 80;

        const gain = this.context.createGain();
        gain.gain.value = 0.15;

        // Modulate wind intensity
        const lfo = this.context.createOscillator();
        const lfoGain = this.context.createGain();
        lfo.frequency.value = 0.05;
        lfoGain.gain.value = 0.05;
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        lfo.start();

        noise.connect(lowpass);
        lowpass.connect(highpass);
        highpass.connect(gain);
        gain.connect(this.masterGain);

        noise.start();

        this.windNode = { noise, lowpass, highpass, gain, lfo, lfoGain };
        this.ambientNodes.push(this.windNode);
    }

    startBirdSounds() {
        // Random bird chirps
        const playBird = () => {
            if (!this.enabled || !this.context) return;

            // Random bird types
            const types = ['chirp', 'tweet', 'warble'];
            const type = types[Math.floor(Math.random() * types.length)];

            this.playBirdSound(type);

            // Schedule next bird
            const delay = 3000 + Math.random() * 8000; // 3-11 seconds
            this.birdTimer = setTimeout(playBird, delay);
        };

        this.birdTimer = setTimeout(playBird, 2000);
    }

    playBirdSound(type) {
        if (!this.context || !this.enabled) return;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        const baseFreq = 1000 + Math.random() * 2000;
        osc.type = 'sine';
        osc.frequency.value = baseFreq;

        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(this.masterGain);

        const now = this.context.currentTime;
        const duration = 0.1 + Math.random() * 0.2;

        switch (type) {
            case 'chirp':
                // Quick chirp
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
                gain.gain.linearRampToValueAtTime(0, now + duration);
                osc.frequency.setValueAtTime(baseFreq, now);
                osc.frequency.linearRampToValueAtTime(baseFreq * 1.5, now + duration);
                break;

            case 'tweet':
                // Two-note tweet
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
                gain.gain.linearRampToValueAtTime(0.02, now + duration / 2);
                gain.gain.linearRampToValueAtTime(0.08, now + duration / 2 + 0.01);
                gain.gain.linearRampToValueAtTime(0, now + duration);
                osc.frequency.setValueAtTime(baseFreq, now);
                osc.frequency.setValueAtTime(baseFreq * 1.2, now + duration / 2);
                break;

            case 'warble':
                // Warbling sound
                const warbleRate = 15 + Math.random() * 10;
                const warbleLfo = this.context.createOscillator();
                const warbleGain = this.context.createGain();
                warbleLfo.frequency.value = warbleRate;
                warbleGain.gain.value = baseFreq * 0.1;
                warbleLfo.connect(warbleGain);
                warbleGain.connect(osc.frequency);
                warbleLfo.start(now);
                warbleLfo.stop(now + duration * 2);

                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.06, now + 0.02);
                gain.gain.linearRampToValueAtTime(0, now + duration * 2);
                break;
        }

        osc.start(now);
        osc.stop(now + duration * 2 + 0.1);
    }

    // Special event sounds
    playEventSound(type) {
        if (!this.context || !this.enabled) return;

        switch (type) {
            case 'birth':
                this.playTone(800, 0.1, 0.1, 'sine');
                setTimeout(() => this.playTone(1000, 0.1, 0.08, 'sine'), 100);
                break;
            case 'death':
                this.playTone(200, 0.3, 0.15, 'triangle');
                break;
            case 'building':
                this.playTone(400, 0.1, 0.1, 'square');
                this.playTone(500, 0.1, 0.1, 'square');
                setTimeout(() => this.playTone(600, 0.15, 0.1, 'square'), 150);
                break;
            case 'milestone':
                this.playChord([523, 659, 784], 0.5, 0.15); // C major chord
                break;
            case 'war':
                this.playTone(150, 0.4, 0.2, 'sawtooth');
                break;
        }
    }

    playTone(freq, duration, volume, type = 'sine') {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.value = 0;

        osc.connect(gain);
        gain.connect(this.masterGain);

        const now = this.context.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume, now + 0.01);
        gain.gain.linearRampToValueAtTime(0, now + duration);

        osc.start(now);
        osc.stop(now + duration + 0.1);
    }

    playChord(frequencies, duration, volume) {
        frequencies.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, duration, volume, 'sine'), i * 50);
        });
    }

    stopAmbience() {
        // Stop all ambient nodes
        this.ambientNodes.forEach(node => {
            if (node.osc) {
                node.osc.stop();
                node.osc.disconnect();
            }
            if (node.noise) {
                node.noise.stop();
                node.noise.disconnect();
            }
            if (node.lfo) {
                node.lfo.stop();
                node.lfo.disconnect();
            }
        });
        this.ambientNodes = [];
        this.windNode = null;

        // Stop bird timer
        if (this.birdTimer) {
            clearTimeout(this.birdTimer);
            this.birdTimer = null;
        }

        console.log('[AudioSystem] Ambience stopped');
    }

    // Weather effects
    setWeather(weather) {
        const prevWeather = this.weather;
        this.weather = weather;
        if (!this.context || !this.enabled) return;

        // Adjust wind based on weather
        if (this.windNode) {
            const windVolume = weather === 'storm' ? 0.4 : weather === 'rain' ? 0.25 : 0.15;
            this.windNode.gain.gain.setTargetAtTime(windVolume, this.context.currentTime, 1);
        }

        // Start/stop rain sounds
        if ((weather === 'rain' || weather === 'storm') && !this.rainNode) {
            this.startRainSound();
        } else if (weather === 'clear' && this.rainNode) {
            this.stopRainSound();
        }

        // Adjust rain intensity
        if (this.rainNode) {
            const rainVolume = weather === 'storm' ? 0.35 : weather === 'rain' ? 0.2 : 0;
            this.rainNode.gain.gain.setTargetAtTime(rainVolume, this.context.currentTime, 2);
        }

        // Thunder for storms
        if (weather === 'storm' && prevWeather !== 'storm') {
            this.startThunderSounds();
        } else if (weather !== 'storm' && this.thunderTimer) {
            clearTimeout(this.thunderTimer);
            this.thunderTimer = null;
        }
    }

    // Rain sound effect - pink noise filtered to sound like rain
    startRainSound() {
        if (!this.context) return;

        // Create noise buffer
        const bufferSize = this.context.sampleRate * 2;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        // Pink noise (better rain sound than white or brown)
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
        }

        const noise = this.context.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        // Filter chain for realistic rain
        const highpass = this.context.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 1000;

        const lowpass = this.context.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 8000;

        const gain = this.context.createGain();
        gain.gain.value = 0;

        // Random crackle modulation for rain drops
        const crackleLfo = this.context.createOscillator();
        const crackleGain = this.context.createGain();
        crackleLfo.type = 'square';
        crackleLfo.frequency.value = 20 + Math.random() * 30;
        crackleGain.gain.value = 0.02;
        crackleLfo.connect(crackleGain);
        crackleGain.connect(gain.gain);
        crackleLfo.start();

        noise.connect(highpass);
        highpass.connect(lowpass);
        lowpass.connect(gain);
        gain.connect(this.masterGain);

        noise.start();

        this.rainNode = { noise, highpass, lowpass, gain, crackleLfo, crackleGain };
        console.log('[AudioSystem] Rain sound started');
    }

    stopRainSound() {
        if (this.rainNode) {
            this.rainNode.noise.stop();
            this.rainNode.crackleLfo.stop();
            this.rainNode = null;
            console.log('[AudioSystem] Rain sound stopped');
        }
    }

    // Thunder sound effects for storms
    startThunderSounds() {
        const playThunder = () => {
            if (!this.enabled || !this.context || this.weather !== 'storm') return;

            this.playThunderRumble();

            // Random interval between thunder
            const delay = 8000 + Math.random() * 20000; // 8-28 seconds
            this.thunderTimer = setTimeout(playThunder, delay);
        };

        // First thunder after short delay
        this.thunderTimer = setTimeout(playThunder, 2000 + Math.random() * 5000);
    }

    playThunderRumble() {
        if (!this.context || !this.enabled) return;

        // Low frequency rumble
        const osc1 = this.context.createOscillator();
        const osc2 = this.context.createOscillator();
        const gain = this.context.createGain();
        const filter = this.context.createBiquadFilter();

        osc1.type = 'sawtooth';
        osc1.frequency.value = 40 + Math.random() * 30;
        osc2.type = 'triangle';
        osc2.frequency.value = 60 + Math.random() * 40;

        filter.type = 'lowpass';
        filter.frequency.value = 200;

        // Thunder envelope - starts loud, rumbles, fades
        const now = this.context.currentTime;
        const duration = 2 + Math.random() * 2;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.05); // Sharp attack
        gain.gain.linearRampToValueAtTime(0.2, now + 0.3);  // Initial drop
        gain.gain.linearRampToValueAtTime(0.25, now + 0.6); // Rumble up
        gain.gain.linearRampToValueAtTime(0.1, now + duration * 0.5);
        gain.gain.linearRampToValueAtTime(0, now + duration); // Fade out

        // Frequency modulation for rumble character
        osc1.frequency.setValueAtTime(osc1.frequency.value, now);
        osc1.frequency.linearRampToValueAtTime(osc1.frequency.value * 0.5, now + duration);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration + 0.1);
        osc2.stop(now + duration + 0.1);

        // Add crackle noise for lightning crack
        this.playThunderCrack();

        console.log('[AudioSystem] Thunder!');
    }

    playThunderCrack() {
        if (!this.context) return;

        // Short burst of noise for the initial crack
        const bufferSize = this.context.sampleRate * 0.3;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            const decay = 1 - (i / bufferSize);
            data[i] = (Math.random() * 2 - 1) * decay * decay;
        }

        const noise = this.context.createBufferSource();
        noise.buffer = buffer;

        const gain = this.context.createGain();
        gain.gain.value = 0.3;

        const filter = this.context.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 500;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start();
    }

    // Volume control methods for settings integration
    setMasterVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.1);
        }
        console.log('[AudioSystem] Master volume:', Math.round(this.volume * 100) + '%');
    }

    setSfxVolume(value) {
        this.sfxVolume = Math.max(0, Math.min(1, value));
        // SFX volume affects individual sound effects when they play
        console.log('[AudioSystem] SFX volume:', Math.round(this.sfxVolume * 100) + '%');
    }

    setAmbientVolume(value) {
        this.ambientVolume = Math.max(0, Math.min(1, value));
        // Adjust ambient nodes if they exist
        this.ambientNodes.forEach(node => {
            if (node.gain) {
                node.gain.gain.setTargetAtTime(
                    node.baseVolume * this.ambientVolume,
                    this.context.currentTime,
                    0.2
                );
            }
        });
        console.log('[AudioSystem] Ambient volume:', Math.round(this.ambientVolume * 100) + '%');
    }

    // UI Sound Effects
    playClick() {
        if (!this.context || !this.enabled) return;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sine';
        osc.frequency.value = 800;

        const now = this.context.currentTime;
        gain.gain.setValueAtTime(0.15 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.08);
    }

    playHover() {
        if (!this.context || !this.enabled) return;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sine';
        osc.frequency.value = 600;

        const now = this.context.currentTime;
        gain.gain.setValueAtTime(0.05 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.05);
    }

    playPanelOpen() {
        if (!this.context || !this.enabled) return;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.context.currentTime + 0.1);

        const now = this.context.currentTime;
        gain.gain.setValueAtTime(0.1 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.15);
    }

    playPanelClose() {
        if (!this.context || !this.enabled) return;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.context.currentTime + 0.1);

        const now = this.context.currentTime;
        gain.gain.setValueAtTime(0.1 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.12);
    }

    playSuccess() {
        if (!this.context || !this.enabled) return;

        // Two-note success chime
        [600, 900].forEach((freq, i) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            const now = this.context.currentTime + i * 0.1;
            gain.gain.setValueAtTime(0.12 * this.sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + 0.2);
        });
    }
}

// Singleton
export const audioSystem = new AudioSystem();
