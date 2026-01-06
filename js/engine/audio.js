// Ambient Audio System for Planet Eden
// Uses Web Audio API for procedural ambient soundscapes

export class AudioSystem {
    constructor() {
        this.context = null;
        this.masterGain = null;
        this.enabled = false;
        this.initialized = false;
        this.volume = 0.3;

        // Oscillators and nodes
        this.ambientNodes = [];
        this.windNode = null;
        this.birdTimer = null;

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
        const btn = document.createElement('button');
        btn.id = 'audio-toggle';
        btn.innerHTML = '🔇';
        btn.title = 'Toggle Audio (M)';
        btn.style.cssText = `
            position: fixed;
            top: 20px;
            right: 80px;
            width: 40px;
            height: 40px;
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid rgba(100, 200, 100, 0.3);
            border-radius: 50%;
            color: #fff;
            font-size: 18px;
            cursor: pointer;
            z-index: 1001;
            transition: all 0.2s;
        `;
        btn.onmouseover = () => btn.style.background = 'rgba(50, 100, 50, 0.8)';
        btn.onmouseout = () => btn.style.background = 'rgba(0, 0, 0, 0.7)';
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
            btn.innerHTML = '🔊';
        } else {
            this.stopAmbience();
            btn.innerHTML = '🔇';
        }
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
        this.weather = weather;
        if (!this.context || !this.enabled) return;

        // Adjust wind based on weather
        if (this.windNode) {
            const windVolume = weather === 'storm' ? 0.4 : weather === 'rain' ? 0.25 : 0.15;
            this.windNode.gain.gain.setTargetAtTime(windVolume, this.context.currentTime, 1);
        }
    }
}

// Singleton
export const audioSystem = new AudioSystem();
