// AAA-Quality Audio System for Planet Eden
// Procedural soundscapes using Web Audio API - no external files needed
// Features: Ambient soundscapes, dynamic music, event audio, spatial audio, weather audio

export class AudioSystem {
    constructor() {
        this.context = null;
        this.masterGain = null;
        this.enabled = false;
        this.initialized = false;

        // Volume controls (0-1)
        this.volume = 0.3;           // Master volume
        this.sfxVolume = 0.8;        // Sound effects volume
        this.ambientVolume = 0.6;    // Ambient sounds volume
        this.musicVolume = 0.4;      // Music volume

        // Audio bus system for mixing
        this.buses = {
            master: null,
            ambient: null,
            music: null,
            sfx: null,
            weather: null,
            spatial: null
        };

        // Compressor for final mix
        this.compressor = null;

        // Active audio nodes
        this.ambientNodes = [];
        this.musicNodes = [];
        this.spatialSources = new Map(); // id -> { source, panner, gain }

        // Environment state
        this.timeOfDay = 0.5;        // 0-1 (0=midnight, 0.5=noon)
        this.weather = 'clear';      // clear, cloudy, rain, storm
        this.biome = 'forest';       // forest, water, plains

        // Game state for adaptive audio
        this.gameState = {
            population: 0,
            tribeCount: 0,
            isConflict: false,
            recentDeaths: 0,
            recentBirths: 0,
            milestone: false
        };

        // Music system state
        this.currentMusicMood = 'peaceful';
        this.musicTransitionTime = 3.0; // seconds to crossfade
        this.musicLoopTimer = null;

        // Ambient layer timers
        this.birdTimer = null;
        this.cricketTimer = null;
        this.owlTimer = null;
        this.waterTimer = null;

        // Weather sound nodes
        this.rainNode = null;
        this.thunderTimer = null;
        this.windNode = null;
        this.windIntensity = 0.15;

        // Spatial audio
        this.listener = null;
        this.listenerPosition = { x: 0, y: 50, z: 80 };
        this.listenerOrientation = { x: 0, y: -0.5, z: -0.8 };

        // Water sound sources (positioned near water bodies)
        this.waterSources = [];
    }

    async init() {
        this.createToggleButton();
        console.log('[AudioSystem] Ready (click speaker to enable)');
    }

    createToggleButton() {
        // Skip UI creation if new HUD is active
        if (window.PLANET_EDEN_USE_NEW_HUD) {
            console.log('[AudioSystem] Skipping old UI - using new HUD');
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
            this.startFullSoundscape();
            if (btn) btn.innerHTML = '🔊';
        } else {
            this.stopAllAudio();
            if (btn) btn.innerHTML = '🔇';
        }

        console.log(`[AudioSystem] Audio ${this.enabled ? 'enabled' : 'disabled'}`);
    }

    initAudioContext() {
        if (this.initialized) return;

        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();

            // Create compressor for final mix (prevents clipping)
            this.compressor = this.context.createDynamicsCompressor();
            this.compressor.threshold.value = -24;
            this.compressor.knee.value = 30;
            this.compressor.ratio.value = 12;
            this.compressor.attack.value = 0.003;
            this.compressor.release.value = 0.25;
            this.compressor.connect(this.context.destination);

            // Master gain
            this.masterGain = this.context.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.compressor);

            // Create audio buses
            this.buses.master = this.masterGain;

            this.buses.ambient = this.context.createGain();
            this.buses.ambient.gain.value = this.ambientVolume;
            this.buses.ambient.connect(this.masterGain);

            this.buses.music = this.context.createGain();
            this.buses.music.gain.value = this.musicVolume;
            this.buses.music.connect(this.masterGain);

            this.buses.sfx = this.context.createGain();
            this.buses.sfx.gain.value = this.sfxVolume;
            this.buses.sfx.connect(this.masterGain);

            this.buses.weather = this.context.createGain();
            this.buses.weather.gain.value = 0.7;
            this.buses.weather.connect(this.masterGain);

            this.buses.spatial = this.context.createGain();
            this.buses.spatial.gain.value = 0.6;
            this.buses.spatial.connect(this.masterGain);

            // Initialize spatial audio listener
            this.listener = this.context.listener;
            this.updateListenerPosition(this.listenerPosition, this.listenerOrientation);

            this.initialized = true;
            console.log('[AudioSystem] Audio context initialized with mixing buses');
        } catch (e) {
            console.error('[AudioSystem] Failed to create audio context:', e);
        }
    }

    // ============================================
    // VOLUME CONTROL
    // ============================================

    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.1);
        }
    }

    setMasterVolume(value) {
        this.setVolume(value);
        console.log('[AudioSystem] Master volume:', Math.round(this.volume * 100) + '%');
    }

    setSfxVolume(value) {
        this.sfxVolume = Math.max(0, Math.min(1, value));
        if (this.buses.sfx) {
            this.buses.sfx.gain.setTargetAtTime(this.sfxVolume, this.context.currentTime, 0.1);
        }
        console.log('[AudioSystem] SFX volume:', Math.round(this.sfxVolume * 100) + '%');
    }

    setAmbientVolume(value) {
        this.ambientVolume = Math.max(0, Math.min(1, value));
        if (this.buses.ambient) {
            this.buses.ambient.gain.setTargetAtTime(this.ambientVolume, this.context.currentTime, 0.2);
        }
        console.log('[AudioSystem] Ambient volume:', Math.round(this.ambientVolume * 100) + '%');
    }

    setMusicVolume(value) {
        this.musicVolume = Math.max(0, Math.min(1, value));
        if (this.buses.music) {
            this.buses.music.gain.setTargetAtTime(this.musicVolume, this.context.currentTime, 0.2);
        }
        console.log('[AudioSystem] Music volume:', Math.round(this.musicVolume * 100) + '%');
    }

    // ============================================
    // FULL SOUNDSCAPE MANAGEMENT
    // ============================================

    startFullSoundscape() {
        if (!this.context || !this.enabled) return;

        // Start ambient layers
        this.startAmbientDrone();
        this.startWindNoise();
        this.startDayNightSounds();

        // Start dynamic music
        this.startAdaptiveMusic();

        // Initialize weather sounds based on current weather
        this.updateWeatherAudio();

        // Start spatial water sounds
        this.initWaterSources();

        console.log('[AudioSystem] Full soundscape started');
    }

    stopAllAudio() {
        // Stop ambient nodes
        this.ambientNodes.forEach(node => {
            try {
                if (node.osc) { node.osc.stop(); node.osc.disconnect(); }
                if (node.noise) { node.noise.stop(); node.noise.disconnect(); }
                if (node.lfo) { node.lfo.stop(); node.lfo.disconnect(); }
            } catch (e) { /* already stopped */ }
        });
        this.ambientNodes = [];
        this.windNode = null;

        // Stop music
        this.musicNodes.forEach(node => {
            try {
                if (node.osc) { node.osc.stop(); node.osc.disconnect(); }
                if (node.lfo) { node.lfo.stop(); node.lfo.disconnect(); }
            } catch (e) { /* already stopped */ }
        });
        this.musicNodes = [];
        if (this.musicLoopTimer) {
            clearTimeout(this.musicLoopTimer);
            this.musicLoopTimer = null;
        }

        // Stop timers
        if (this.birdTimer) { clearTimeout(this.birdTimer); this.birdTimer = null; }
        if (this.cricketTimer) { clearTimeout(this.cricketTimer); this.cricketTimer = null; }
        if (this.owlTimer) { clearTimeout(this.owlTimer); this.owlTimer = null; }
        if (this.waterTimer) { clearTimeout(this.waterTimer); this.waterTimer = null; }
        if (this.thunderTimer) { clearTimeout(this.thunderTimer); this.thunderTimer = null; }

        // Stop weather
        this.stopRainSound();

        // Stop spatial sources
        this.spatialSources.forEach((source, id) => {
            try {
                if (source.source) { source.source.stop(); source.source.disconnect(); }
            } catch (e) { /* already stopped */ }
        });
        this.spatialSources.clear();
        this.waterSources = [];

        console.log('[AudioSystem] All audio stopped');
    }

    // ============================================
    // AMBIENT SOUNDSCAPES
    // ============================================

    startAmbientDrone() {
        if (!this.context || !this.enabled) return;

        // Base ambient drone layers - very low, subtle rumble
        this.createDrone(55, 0.06, 'sine');   // Deep bass
        this.createDrone(82, 0.03, 'sine');   // Low mid
        this.createDrone(110, 0.015, 'sine'); // Subtle harmonic
        this.createDrone(165, 0.008, 'triangle'); // Airy harmonic
    }

    createDrone(frequency, volume, type = 'sine') {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        const filter = this.context.createBiquadFilter();

        osc.type = type;
        osc.frequency.value = frequency;

        // Add slow modulation for organic feel
        const lfo = this.context.createOscillator();
        const lfoGain = this.context.createGain();
        lfo.frequency.value = 0.05 + Math.random() * 0.15;
        lfoGain.gain.value = frequency * 0.02;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();

        // Volume modulation for breathing effect
        const volLfo = this.context.createOscillator();
        const volLfoGain = this.context.createGain();
        volLfo.frequency.value = 0.02 + Math.random() * 0.05;
        volLfoGain.gain.value = volume * 0.3;
        volLfo.connect(volLfoGain);
        volLfoGain.connect(gain.gain);
        volLfo.start();

        filter.type = 'lowpass';
        filter.frequency.value = 300;
        filter.Q.value = 0.5;

        gain.gain.value = volume;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.buses.ambient);

        osc.start();

        this.ambientNodes.push({ osc, gain, lfo, lfoGain, filter, volLfo, volLfoGain, baseVolume: volume });
    }

    startWindNoise() {
        if (!this.context || !this.enabled) return;

        // Create brown noise for wind
        const bufferSize = this.context.sampleRate * 3;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5;
        }

        const noise = this.context.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        // Multiple filters for wind character
        const lowpass = this.context.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 500;

        const highpass = this.context.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 60;

        // Bandpass for "whooshing" character
        const bandpass = this.context.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 200;
        bandpass.Q.value = 0.5;

        const gain = this.context.createGain();
        gain.gain.value = this.windIntensity;

        // Slow LFO for wind gusts
        const lfo = this.context.createOscillator();
        const lfoGain = this.context.createGain();
        lfo.frequency.value = 0.08;
        lfoGain.gain.value = 0.08;
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        lfo.start();

        // Secondary gust LFO for complexity
        const gustLfo = this.context.createOscillator();
        const gustGain = this.context.createGain();
        gustLfo.frequency.value = 0.03;
        gustGain.gain.value = 0.05;
        gustLfo.connect(gustGain);
        gustGain.connect(gain.gain);
        gustLfo.start();

        noise.connect(lowpass);
        lowpass.connect(highpass);
        highpass.connect(bandpass);
        bandpass.connect(gain);
        gain.connect(this.buses.weather);

        noise.start();

        this.windNode = { noise, lowpass, highpass, bandpass, gain, lfo, lfoGain, gustLfo, gustGain };
        this.ambientNodes.push(this.windNode);
    }

    // Day/Night sound cycle
    startDayNightSounds() {
        this.updateDayNightSounds();
    }

    updateDayNightSounds() {
        if (!this.enabled) return;

        // Clear existing timers
        if (this.birdTimer) clearTimeout(this.birdTimer);
        if (this.cricketTimer) clearTimeout(this.cricketTimer);
        if (this.owlTimer) clearTimeout(this.owlTimer);

        const isDay = this.timeOfDay > 0.25 && this.timeOfDay < 0.75;
        const isDawn = this.timeOfDay > 0.2 && this.timeOfDay < 0.35;
        const isDusk = this.timeOfDay > 0.65 && this.timeOfDay < 0.8;
        const isNight = this.timeOfDay <= 0.25 || this.timeOfDay >= 0.75;

        if (isDay || isDawn || isDusk) {
            // More birds at dawn/dusk
            const birdFrequency = isDawn || isDusk ? 2000 : 4000;
            this.startBirdSounds(birdFrequency);
        }

        if (isNight || isDusk) {
            // Crickets at night and dusk
            this.startCricketSounds();
            // Occasional owl hoots
            this.startOwlSounds();
        }
    }

    startBirdSounds(baseInterval = 4000) {
        const playBird = () => {
            if (!this.enabled || !this.context) return;

            const types = ['chirp', 'tweet', 'warble', 'trill', 'call'];
            const type = types[Math.floor(Math.random() * types.length)];

            // Spatial positioning for birds
            const pan = (Math.random() - 0.5) * 2;
            this.playBirdSound(type, pan);

            const delay = baseInterval + Math.random() * baseInterval;
            this.birdTimer = setTimeout(playBird, delay);
        };

        this.birdTimer = setTimeout(playBird, 1000 + Math.random() * 2000);
    }

    playBirdSound(type, pan = 0) {
        if (!this.context || !this.enabled) return;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        const panner = this.context.createStereoPanner();

        const baseFreq = 1500 + Math.random() * 2500;
        osc.type = 'sine';
        osc.frequency.value = baseFreq;

        panner.pan.value = pan;
        gain.gain.value = 0;

        osc.connect(gain);
        gain.connect(panner);
        panner.connect(this.buses.ambient);

        const now = this.context.currentTime;
        const duration = 0.1 + Math.random() * 0.25;

        switch (type) {
            case 'chirp':
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
                gain.gain.linearRampToValueAtTime(0, now + duration);
                osc.frequency.setValueAtTime(baseFreq, now);
                osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.6, now + duration);
                break;

            case 'tweet':
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
                gain.gain.linearRampToValueAtTime(0.03, now + duration / 2);
                gain.gain.linearRampToValueAtTime(0.1, now + duration / 2 + 0.01);
                gain.gain.linearRampToValueAtTime(0, now + duration);
                osc.frequency.setValueAtTime(baseFreq, now);
                osc.frequency.setValueAtTime(baseFreq * 1.3, now + duration / 2);
                break;

            case 'warble':
                const warbleRate = 20 + Math.random() * 15;
                const warbleLfo = this.context.createOscillator();
                const warbleGain = this.context.createGain();
                warbleLfo.frequency.value = warbleRate;
                warbleGain.gain.value = baseFreq * 0.12;
                warbleLfo.connect(warbleGain);
                warbleGain.connect(osc.frequency);
                warbleLfo.start(now);
                warbleLfo.stop(now + duration * 2);

                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
                gain.gain.linearRampToValueAtTime(0, now + duration * 2);
                break;

            case 'trill':
                // Rapid frequency trill
                for (let i = 0; i < 6; i++) {
                    const t = now + i * 0.05;
                    osc.frequency.setValueAtTime(baseFreq * (1 + (i % 2) * 0.15), t);
                }
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
                gain.gain.setValueAtTime(0.08, now + 0.25);
                gain.gain.linearRampToValueAtTime(0, now + 0.35);
                break;

            case 'call':
                // Longer descending call
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.1, now + 0.02);
                gain.gain.setValueAtTime(0.1, now + 0.3);
                gain.gain.linearRampToValueAtTime(0, now + 0.5);
                osc.frequency.setValueAtTime(baseFreq * 1.2, now);
                osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, now + 0.5);
                break;
        }

        osc.start(now);
        osc.stop(now + duration * 2 + 0.5);
    }

    startCricketSounds() {
        const playCricket = () => {
            if (!this.enabled || !this.context) return;
            if (this.timeOfDay > 0.25 && this.timeOfDay < 0.65) {
                // Not night, stop crickets
                return;
            }

            this.playCricketChirp();

            const delay = 500 + Math.random() * 1500;
            this.cricketTimer = setTimeout(playCricket, delay);
        };

        this.cricketTimer = setTimeout(playCricket, 500);
    }

    playCricketChirp() {
        if (!this.context || !this.enabled) return;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        const panner = this.context.createStereoPanner();

        // Cricket frequency (high pitched)
        osc.type = 'sine';
        osc.frequency.value = 4000 + Math.random() * 1000;

        // Amplitude modulation for chirp pattern
        const ampMod = this.context.createOscillator();
        const ampModGain = this.context.createGain();
        ampMod.frequency.value = 50 + Math.random() * 30; // Rapid on-off
        ampModGain.gain.value = 0.5;
        ampMod.connect(ampModGain);

        panner.pan.value = (Math.random() - 0.5) * 1.5;
        gain.gain.value = 0.04;

        osc.connect(gain);
        ampModGain.connect(gain.gain);
        gain.connect(panner);
        panner.connect(this.buses.ambient);

        const now = this.context.currentTime;
        const duration = 0.1 + Math.random() * 0.15;

        // Chirp envelope
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 0.01);
        gain.gain.setValueAtTime(0.04, now + duration - 0.02);
        gain.gain.linearRampToValueAtTime(0, now + duration);

        osc.start(now);
        ampMod.start(now);
        osc.stop(now + duration);
        ampMod.stop(now + duration);
    }

    startOwlSounds() {
        const playOwl = () => {
            if (!this.enabled || !this.context) return;
            if (this.timeOfDay > 0.3 && this.timeOfDay < 0.7) {
                return; // Not night
            }

            this.playOwlHoot();

            const delay = 15000 + Math.random() * 30000; // Every 15-45 seconds
            this.owlTimer = setTimeout(playOwl, delay);
        };

        this.owlTimer = setTimeout(playOwl, 5000 + Math.random() * 10000);
    }

    playOwlHoot() {
        if (!this.context || !this.enabled) return;

        const playNote = (freq, start, dur, vol) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();
            const filter = this.context.createBiquadFilter();
            const panner = this.context.createStereoPanner();

            osc.type = 'sine';
            osc.frequency.value = freq;

            filter.type = 'lowpass';
            filter.frequency.value = 800;

            panner.pan.value = (Math.random() - 0.5) * 1.5;

            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(vol, start + 0.05);
            gain.gain.setValueAtTime(vol, start + dur - 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

            // Slight pitch drop
            osc.frequency.setValueAtTime(freq, start);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.92, start + dur);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(panner);
            panner.connect(this.buses.ambient);

            osc.start(start);
            osc.stop(start + dur + 0.1);
        };

        const now = this.context.currentTime;
        // "Hoo-hoo-hoo" pattern
        playNote(280, now, 0.4, 0.08);
        playNote(250, now + 0.5, 0.35, 0.06);
        playNote(220, now + 0.95, 0.5, 0.05);
    }

    // ============================================
    // WATER AMBIENCE (Spatial)
    // ============================================

    initWaterSources() {
        // Create several water ambient sources around typical water positions
        const waterPositions = [
            { x: -30, y: 0, z: 0 },
            { x: 30, y: 0, z: 20 },
            { x: 0, y: 0, z: -35 },
            { x: -20, y: 0, z: 30 }
        ];

        waterPositions.forEach((pos, i) => {
            this.createWaterSource(pos, i);
        });
    }

    createWaterSource(position, id) {
        if (!this.context || !this.enabled) return;

        // Pink noise for water
        const bufferSize = this.context.sampleRate * 2;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
            b6 = white * 0.115926;
        }

        const noise = this.context.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        // Water filter characteristics
        const lowpass = this.context.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 2000;

        const highpass = this.context.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 200;

        // Spatial panner
        const panner = this.context.createPanner();
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'inverse';
        panner.refDistance = 10;
        panner.maxDistance = 100;
        panner.rolloffFactor = 1;
        panner.setPosition(position.x, position.y, position.z);

        const gain = this.context.createGain();
        gain.gain.value = 0.15;

        // Bubbling LFO
        const lfo = this.context.createOscillator();
        const lfoGain = this.context.createGain();
        lfo.frequency.value = 0.3 + Math.random() * 0.4;
        lfoGain.gain.value = 0.05;
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        lfo.start();

        noise.connect(highpass);
        highpass.connect(lowpass);
        lowpass.connect(gain);
        gain.connect(panner);
        panner.connect(this.buses.spatial);

        noise.start();

        const sourceData = { noise, panner, gain, lfo, lfoGain, position };
        this.waterSources.push(sourceData);
        this.spatialSources.set(`water_${id}`, sourceData);
    }

    // ============================================
    // DYNAMIC ADAPTIVE MUSIC
    // ============================================

    startAdaptiveMusic() {
        this.playMusicLoop();
    }

    playMusicLoop() {
        if (!this.context || !this.enabled) return;

        // Determine mood based on game state
        let mood = 'peaceful';
        if (this.gameState.isConflict) {
            mood = 'tension';
        } else if (this.gameState.milestone) {
            mood = 'celebration';
            this.gameState.milestone = false; // Reset after playing
        } else if (this.gameState.recentDeaths > 3) {
            mood = 'somber';
        } else if (this.gameState.population > 50) {
            mood = 'prosperity';
        }

        this.currentMusicMood = mood;

        // Play appropriate music based on mood
        switch (mood) {
            case 'peaceful':
                this.playPeacefulMusic();
                break;
            case 'tension':
                this.playTensionMusic();
                break;
            case 'celebration':
                this.playCelebrationMusic();
                break;
            case 'somber':
                this.playSomberMusic();
                break;
            case 'prosperity':
                this.playProsperityMusic();
                break;
        }

        // Schedule next music segment
        const duration = mood === 'celebration' ? 8000 : 15000 + Math.random() * 10000;
        this.musicLoopTimer = setTimeout(() => this.playMusicLoop(), duration);
    }

    playPeacefulMusic() {
        // Gentle pentatonic melody
        const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // C D E G A C
        const now = this.context.currentTime;

        // Pad drone
        this.playMusicPad([261.63, 329.63, 392.00], now, 12, 0.03);

        // Melodic notes
        for (let i = 0; i < 8; i++) {
            const note = scale[Math.floor(Math.random() * scale.length)];
            const time = now + i * 1.5 + Math.random() * 0.3;
            this.playMusicNote(note, time, 1.2, 0.06, 'sine');
        }
    }

    playTensionMusic() {
        // Dissonant, pulsing
        const now = this.context.currentTime;

        // Low ominous drone
        this.playMusicPad([73.42, 77.78], now, 10, 0.05); // D2, Eb2 - tritone

        // Pulsing rhythm
        for (let i = 0; i < 16; i++) {
            const note = i % 2 === 0 ? 98 : 103.83; // G2, Ab2
            const time = now + i * 0.5;
            this.playMusicNote(note, time, 0.3, 0.08, 'sawtooth');
        }

        // Stinger accents
        if (Math.random() > 0.5) {
            this.playMusicNote(155.56, now + 2, 0.5, 0.1, 'square'); // Eb3
        }
    }

    playCelebrationMusic() {
        const scale = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; // C5 major
        const now = this.context.currentTime;

        // Bright fanfare
        const fanfare = [523.25, 659.25, 783.99, 1046.50];
        fanfare.forEach((note, i) => {
            this.playMusicNote(note, now + i * 0.2, 0.4, 0.1, 'triangle');
        });

        // Triumphant chord
        setTimeout(() => {
            this.playMusicPad([523.25, 659.25, 783.99], this.context.currentTime, 3, 0.06);
        }, 1000);

        // Sparkle notes
        for (let i = 0; i < 12; i++) {
            const note = scale[Math.floor(Math.random() * scale.length)] * (Math.random() > 0.5 ? 2 : 1);
            const time = now + 1.5 + i * 0.25 + Math.random() * 0.1;
            this.playMusicNote(note, time, 0.15, 0.04, 'sine');
        }
    }

    playSomberMusic() {
        // Minor key, slow
        const scale = [220, 246.94, 261.63, 293.66, 329.63, 349.23]; // A minor
        const now = this.context.currentTime;

        // Melancholic pad
        this.playMusicPad([220, 261.63, 329.63], now, 15, 0.025);

        // Slow descending melody
        const melody = [329.63, 293.66, 261.63, 220];
        melody.forEach((note, i) => {
            this.playMusicNote(note, now + i * 2, 1.8, 0.05, 'sine');
        });
    }

    playProsperityMusic() {
        // Uplifting major with activity
        const scale = [329.63, 392.00, 440.00, 493.88, 523.25, 587.33]; // E major area
        const now = this.context.currentTime;

        // Warm pad
        this.playMusicPad([329.63, 415.30, 493.88], now, 12, 0.03);

        // Bouncy melodic pattern
        for (let i = 0; i < 12; i++) {
            const note = scale[Math.floor(Math.random() * scale.length)];
            const time = now + i * 0.8 + Math.random() * 0.2;
            this.playMusicNote(note, time, 0.5, 0.05, 'triangle');
        }
    }

    playMusicPad(frequencies, startTime, duration, volume) {
        frequencies.forEach(freq => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();
            const filter = this.context.createBiquadFilter();

            osc.type = 'sine';
            osc.frequency.value = freq;

            // Slow vibrato
            const vib = this.context.createOscillator();
            const vibGain = this.context.createGain();
            vib.frequency.value = 4 + Math.random() * 2;
            vibGain.gain.value = freq * 0.003;
            vib.connect(vibGain);
            vibGain.connect(osc.frequency);
            vib.start(startTime);
            vib.stop(startTime + duration);

            filter.type = 'lowpass';
            filter.frequency.value = 1000;

            // Slow attack and release
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(volume, startTime + 2);
            gain.gain.setValueAtTime(volume, startTime + duration - 3);
            gain.gain.linearRampToValueAtTime(0, startTime + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.buses.music);

            osc.start(startTime);
            osc.stop(startTime + duration);

            this.musicNodes.push({ osc, gain, lfo: vib });
        });
    }

    playMusicNote(frequency, startTime, duration, volume, type = 'sine') {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = type;
        osc.frequency.value = frequency;

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(volume, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(this.buses.music);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.1);
    }

    // Update game state for adaptive music
    updateGameState(stats, additionalInfo = {}) {
        if (stats) {
            this.gameState.population = stats.aliveCount || 0;
            this.gameState.tribeCount = stats.tribeCount || 0;
        }
        if (additionalInfo.isConflict !== undefined) {
            this.gameState.isConflict = additionalInfo.isConflict;
        }
        if (additionalInfo.recentDeaths !== undefined) {
            this.gameState.recentDeaths = additionalInfo.recentDeaths;
        }
        if (additionalInfo.recentBirths !== undefined) {
            this.gameState.recentBirths = additionalInfo.recentBirths;
        }
    }

    triggerMilestone() {
        this.gameState.milestone = true;
    }

    // ============================================
    // EVENT AUDIO
    // ============================================

    playEventSound(type, position = null) {
        if (!this.context || !this.enabled) return;

        switch (type) {
            case 'birth':
                this.playBirthSound(position);
                break;
            case 'death':
                this.playDeathSound(position);
                break;
            case 'building':
            case 'buildingComplete':
                this.playBuildingCompleteSound(position);
                break;
            case 'combat':
            case 'attack':
                this.playCombatSound(position);
                break;
            case 'tribeForm':
                this.playTribeFormationSound();
                break;
            case 'milestone':
                this.playMilestoneSound();
                break;
            case 'war':
                this.playWarSound();
                break;
            case 'harvest':
                this.playHarvestSound(position);
                break;
            case 'craft':
                this.playCraftSound(position);
                break;
            case 'discover':
                this.playDiscoverySound();
                break;
            case 'eat':
            case 'eating':
                this.playEatSound(position);
                break;
            case 'footstep':
            case 'movement':
                this.playFootstepSound(position);
                break;
        }
    }

    playBirthSound(position) {
        const now = this.context.currentTime;

        // Gentle ascending tones
        [800, 1000, 1200].forEach((freq, i) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(0, now + i * 0.08);
            gain.gain.linearRampToValueAtTime(0.1 * this.sfxVolume, now + i * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2);

            osc.connect(gain);
            gain.connect(this.buses.sfx);

            osc.start(now + i * 0.08);
            osc.stop(now + i * 0.08 + 0.25);
        });

        // Soft shimmer
        this.playShimmer(now + 0.2, 0.5, 0.04);
    }

    playDeathSound(position) {
        const now = this.context.currentTime;

        // Low descending tone
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        const filter = this.context.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.8);

        filter.type = 'lowpass';
        filter.frequency.value = 500;

        gain.gain.setValueAtTime(0.15 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.buses.sfx);

        osc.start(now);
        osc.stop(now + 0.9);

        // Soft thud
        this.playThud(now, 60, 0.08);
    }

    playBuildingCompleteSound(position) {
        const now = this.context.currentTime;

        // Hammering sounds
        for (let i = 0; i < 3; i++) {
            this.playThud(now + i * 0.15, 200 + i * 50, 0.08);
        }

        // Success chime
        setTimeout(() => {
            const chime = [400, 500, 600, 800];
            chime.forEach((freq, i) => {
                const osc = this.context.createOscillator();
                const gain = this.context.createGain();

                osc.type = 'triangle';
                osc.frequency.value = freq;

                const t = this.context.currentTime + i * 0.1;
                gain.gain.setValueAtTime(0.1 * this.sfxVolume, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

                osc.connect(gain);
                gain.connect(this.buses.sfx);

                osc.start(t);
                osc.stop(t + 0.35);
            });
        }, 500);
    }

    playCombatSound(position) {
        const now = this.context.currentTime;

        // Impact noise burst
        const bufferSize = this.context.sampleRate * 0.15;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            const decay = Math.pow(1 - i / bufferSize, 2);
            data[i] = (Math.random() * 2 - 1) * decay;
        }

        const noise = this.context.createBufferSource();
        noise.buffer = buffer;

        const filter = this.context.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 800;
        filter.Q.value = 2;

        const gain = this.context.createGain();
        gain.gain.value = 0.2 * this.sfxVolume;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.buses.sfx);

        noise.start(now);

        // Clash tone
        const osc = this.context.createOscillator();
        const oscGain = this.context.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);

        oscGain.gain.setValueAtTime(0.1 * this.sfxVolume, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(oscGain);
        oscGain.connect(this.buses.sfx);

        osc.start(now);
        osc.stop(now + 0.2);
    }

    playTribeFormationSound() {
        const now = this.context.currentTime;

        // Fanfare
        const fanfare = [
            { freq: 392, time: 0, dur: 0.3 },
            { freq: 494, time: 0.15, dur: 0.3 },
            { freq: 587, time: 0.3, dur: 0.3 },
            { freq: 784, time: 0.45, dur: 0.6 }
        ];

        fanfare.forEach(note => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.type = 'triangle';
            osc.frequency.value = note.freq;

            const t = now + note.time;
            gain.gain.setValueAtTime(0.12 * this.sfxVolume, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + note.dur);

            osc.connect(gain);
            gain.connect(this.buses.sfx);

            osc.start(t);
            osc.stop(t + note.dur + 0.1);
        });

        // Drum roll
        for (let i = 0; i < 8; i++) {
            this.playThud(now + i * 0.08, 100 + Math.random() * 50, 0.05);
        }
    }

    playMilestoneSound() {
        this.triggerMilestone();

        const now = this.context.currentTime;

        // Triumphant chord progression
        const chords = [
            [523.25, 659.25, 783.99],  // C major
            [587.33, 739.99, 880.00],  // D major
            [659.25, 830.61, 987.77],  // E major
            [783.99, 987.77, 1174.66]  // G major
        ];

        chords.forEach((chord, ci) => {
            chord.forEach((freq, i) => {
                const osc = this.context.createOscillator();
                const gain = this.context.createGain();

                osc.type = 'sine';
                osc.frequency.value = freq;

                const t = now + ci * 0.4;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.08 * this.sfxVolume, t + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

                osc.connect(gain);
                gain.connect(this.buses.sfx);

                osc.start(t);
                osc.stop(t + 0.9);
            });
        });

        // Sparkle overlay
        this.playShimmer(now + 0.5, 2, 0.06);
    }

    playWarSound() {
        const now = this.context.currentTime;

        // War horn - low brass-like sound
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        const filter = this.context.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.linearRampToValueAtTime(146.83, now + 0.3);
        osc.frequency.setValueAtTime(146.83, now + 1.5);
        osc.frequency.linearRampToValueAtTime(110, now + 2);

        filter.type = 'lowpass';
        filter.frequency.value = 800;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15 * this.sfxVolume, now + 0.2);
        gain.gain.setValueAtTime(0.15 * this.sfxVolume, now + 1.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.buses.sfx);

        osc.start(now);
        osc.stop(now + 2.6);

        // War drums
        for (let i = 0; i < 6; i++) {
            this.playThud(now + 0.3 + i * 0.3, 80, 0.12);
        }
    }

    playHarvestSound(position) {
        const now = this.context.currentTime;

        // Rustling/gathering sound
        const bufferSize = this.context.sampleRate * 0.3;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + 0.04 * white) / 1.04;
            lastOut = data[i];
            data[i] *= Math.pow(1 - i / bufferSize, 0.5) * 0.5;
        }

        const noise = this.context.createBufferSource();
        noise.buffer = buffer;

        const filter = this.context.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 3000;
        filter.Q.value = 1;

        const gain = this.context.createGain();
        gain.gain.value = 0.1 * this.sfxVolume;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.buses.sfx);

        noise.start(now);

        // Soft chime
        const osc = this.context.createOscillator();
        const oscGain = this.context.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        oscGain.gain.setValueAtTime(0.06 * this.sfxVolume, now + 0.1);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(oscGain);
        oscGain.connect(this.buses.sfx);
        osc.start(now + 0.1);
        osc.stop(now + 0.5);
    }

    playCraftSound(position) {
        const now = this.context.currentTime;

        // Metallic tapping/crafting sounds
        for (let i = 0; i < 4; i++) {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.type = 'square';
            osc.frequency.value = 1200 + Math.random() * 600;

            const t = now + i * 0.12;
            gain.gain.setValueAtTime(0.08 * this.sfxVolume, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

            osc.connect(gain);
            gain.connect(this.buses.sfx);

            osc.start(t);
            osc.stop(t + 0.1);
        }

        // Completion ding
        const ding = this.context.createOscillator();
        const dingGain = this.context.createGain();
        ding.type = 'sine';
        ding.frequency.value = 1318.51; // E6
        dingGain.gain.setValueAtTime(0.1 * this.sfxVolume, now + 0.5);
        dingGain.gain.exponentialRampToValueAtTime(0.001, now + 1);
        ding.connect(dingGain);
        dingGain.connect(this.buses.sfx);
        ding.start(now + 0.5);
        ding.stop(now + 1.1);
    }

    playDiscoverySound() {
        const now = this.context.currentTime;

        // Mysterious ascending arpeggio
        const notes = [392, 493.88, 587.33, 783.99, 987.77];
        notes.forEach((freq, i) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            const t = now + i * 0.12;
            gain.gain.setValueAtTime(0.08 * this.sfxVolume, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

            osc.connect(gain);
            gain.connect(this.buses.sfx);

            osc.start(t);
            osc.stop(t + 0.7);
        });

        // Sparkle
        this.playShimmer(now + 0.3, 0.8, 0.05);
    }

    playEatSound(position) {
        const now = this.context.currentTime;

        // Crunching/munching sounds - short bursts of filtered noise
        for (let i = 0; i < 3; i++) {
            const bufferSize = this.context.sampleRate * 0.08;
            const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
            const data = buffer.getChannelData(0);

            // Create crunchy noise
            for (let j = 0; j < bufferSize; j++) {
                const decay = Math.pow(1 - j / bufferSize, 1.5);
                data[j] = (Math.random() * 2 - 1) * decay;
            }

            const noise = this.context.createBufferSource();
            noise.buffer = buffer;

            const filter = this.context.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 1200 + Math.random() * 800;
            filter.Q.value = 3;

            const gain = this.context.createGain();
            const t = now + i * 0.1;
            gain.gain.setValueAtTime(0.08 * this.sfxVolume, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.buses.sfx);

            noise.start(t);
        }

        // Soft swallow/gulp tone at the end
        const gulp = this.context.createOscillator();
        const gulpGain = this.context.createGain();

        gulp.type = 'sine';
        gulp.frequency.setValueAtTime(250, now + 0.3);
        gulp.frequency.exponentialRampToValueAtTime(150, now + 0.45);

        gulpGain.gain.setValueAtTime(0.05 * this.sfxVolume, now + 0.3);
        gulpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        gulp.connect(gulpGain);
        gulpGain.connect(this.buses.sfx);

        gulp.start(now + 0.3);
        gulp.stop(now + 0.5);
    }

    playFootstepSound(position) {
        const now = this.context.currentTime;

        // Soft thud with variation
        const freq = 100 + Math.random() * 80;
        const volume = 0.04 + Math.random() * 0.02;

        // Impact oscillator
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.4, now + 0.08);

        gain.gain.setValueAtTime(volume * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(this.buses.sfx);

        osc.start(now);
        osc.stop(now + 0.12);

        // Add subtle noise for ground texture
        const bufferSize = this.context.sampleRate * 0.05;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            const decay = Math.pow(1 - i / bufferSize, 2);
            data[i] = (Math.random() * 2 - 1) * decay * 0.3;
        }

        const noise = this.context.createBufferSource();
        noise.buffer = buffer;

        const filter = this.context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 600;

        const noiseGain = this.context.createGain();
        noiseGain.gain.value = 0.03 * this.sfxVolume;

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.buses.sfx);

        noise.start(now);
    }

    // Helper sounds
    playThud(time, freq, volume) {
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, time + 0.1);

        gain.gain.setValueAtTime(volume * this.sfxVolume, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

        osc.connect(gain);
        gain.connect(this.buses.sfx);

        osc.start(time);
        osc.stop(time + 0.2);
    }

    playShimmer(startTime, duration, volume) {
        // High frequency sparkle effect
        for (let i = 0; i < 12; i++) {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.type = 'sine';
            osc.frequency.value = 2000 + Math.random() * 4000;

            const t = startTime + Math.random() * duration;
            gain.gain.setValueAtTime(volume * this.sfxVolume * Math.random(), t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1 + Math.random() * 0.1);

            osc.connect(gain);
            gain.connect(this.buses.sfx);

            osc.start(t);
            osc.stop(t + 0.25);
        }
    }

    // ============================================
    // WEATHER AUDIO
    // ============================================

    setWeather(weather) {
        const prevWeather = this.weather;
        this.weather = weather;

        if (!this.context || !this.enabled) return;

        console.log(`[AudioSystem] Weather changed: ${prevWeather} -> ${weather}`);
        this.updateWeatherAudio();
    }

    updateWeatherAudio() {
        if (!this.context || !this.enabled) return;

        const weather = this.weather;

        // Update wind intensity based on weather
        const windTargets = {
            'clear': 0.12,
            'cloudy': 0.18,
            'rain': 0.25,
            'storm': 0.45
        };

        if (this.windNode) {
            const targetWind = windTargets[weather] || 0.15;
            this.windNode.gain.gain.setTargetAtTime(targetWind, this.context.currentTime, 2);

            // Adjust wind filter for weather character
            if (weather === 'storm') {
                this.windNode.lowpass.frequency.setTargetAtTime(800, this.context.currentTime, 1);
                this.windNode.gustLfo.frequency.value = 0.08;
                this.windNode.gustGain.gain.value = 0.15;
            } else {
                this.windNode.lowpass.frequency.setTargetAtTime(400, this.context.currentTime, 1);
                this.windNode.gustLfo.frequency.value = 0.03;
                this.windNode.gustGain.gain.value = 0.05;
            }
        }

        // Handle rain
        if (weather === 'rain' || weather === 'storm') {
            if (!this.rainNode) {
                this.startRainSound();
            }
            // Adjust rain intensity
            const rainVolume = weather === 'storm' ? 0.35 : 0.2;
            if (this.rainNode) {
                this.rainNode.gain.gain.setTargetAtTime(rainVolume, this.context.currentTime, 2);
            }
        } else if (this.rainNode) {
            // Fade out rain
            this.rainNode.gain.gain.setTargetAtTime(0, this.context.currentTime, 3);
            setTimeout(() => {
                if (this.weather !== 'rain' && this.weather !== 'storm') {
                    this.stopRainSound();
                }
            }, 4000);
        }

        // Thunder for storms
        if (weather === 'storm') {
            this.startThunderSounds();
        } else if (this.thunderTimer) {
            clearTimeout(this.thunderTimer);
            this.thunderTimer = null;
        }
    }

    startRainSound() {
        if (!this.context || this.rainNode) return;

        // Pink noise for rain
        const bufferSize = this.context.sampleRate * 3;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

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

        // Rain filter chain
        const highpass = this.context.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 800;

        const lowpass = this.context.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 10000;

        // Modulation for rain drops variation
        const modOsc = this.context.createOscillator();
        const modGain = this.context.createGain();
        modOsc.frequency.value = 15 + Math.random() * 20;
        modGain.gain.value = 0.015;

        const gain = this.context.createGain();
        gain.gain.value = 0;

        modOsc.connect(modGain);
        modGain.connect(gain.gain);

        noise.connect(highpass);
        highpass.connect(lowpass);
        lowpass.connect(gain);
        gain.connect(this.buses.weather);

        noise.start();
        modOsc.start();

        this.rainNode = { noise, highpass, lowpass, gain, modOsc, modGain };
        console.log('[AudioSystem] Rain sound started');
    }

    stopRainSound() {
        if (this.rainNode) {
            try {
                this.rainNode.noise.stop();
                this.rainNode.modOsc.stop();
            } catch (e) { /* already stopped */ }
            this.rainNode = null;
            console.log('[AudioSystem] Rain sound stopped');
        }
    }

    startThunderSounds() {
        if (this.thunderTimer) return;

        const playThunder = () => {
            if (!this.enabled || !this.context || this.weather !== 'storm') {
                this.thunderTimer = null;
                return;
            }

            this.playThunderRumble();

            // Random interval between thunder
            const delay = 5000 + Math.random() * 15000;
            this.thunderTimer = setTimeout(playThunder, delay);
        };

        // First thunder soon
        this.thunderTimer = setTimeout(playThunder, 1000 + Math.random() * 3000);
    }

    playThunderRumble() {
        if (!this.context || !this.enabled) return;

        const now = this.context.currentTime;

        // Initial crack
        this.playThunderCrack();

        // Low frequency rumble
        const osc1 = this.context.createOscillator();
        const osc2 = this.context.createOscillator();
        const gain = this.context.createGain();
        const filter = this.context.createBiquadFilter();

        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(35 + Math.random() * 25, now);
        osc1.frequency.exponentialRampToValueAtTime(20, now + 3);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(50 + Math.random() * 30, now);
        osc2.frequency.exponentialRampToValueAtTime(25, now + 3);

        filter.type = 'lowpass';
        filter.frequency.value = 250;

        const duration = 2 + Math.random() * 2;

        // Thunder envelope with multiple peaks (rumbling)
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.02);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.2);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.4);
        gain.gain.linearRampToValueAtTime(0.08, now + duration * 0.5);
        gain.gain.linearRampToValueAtTime(0.12, now + duration * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.buses.weather);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration + 0.1);
        osc2.stop(now + duration + 0.1);

        console.log('[AudioSystem] Thunder!');
    }

    playThunderCrack() {
        if (!this.context) return;

        const now = this.context.currentTime;

        // Sharp noise burst for crack
        const bufferSize = this.context.sampleRate * 0.25;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            const decay = Math.pow(1 - i / bufferSize, 3);
            data[i] = (Math.random() * 2 - 1) * decay;
        }

        const noise = this.context.createBufferSource();
        noise.buffer = buffer;

        const gain = this.context.createGain();
        gain.gain.value = 0.4;

        const filter = this.context.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 400;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.buses.weather);

        noise.start(now);
    }

    // ============================================
    // SPATIAL AUDIO
    // ============================================

    updateListenerPosition(position, orientation = null) {
        if (!this.listener) return;

        this.listenerPosition = position;
        if (orientation) this.listenerOrientation = orientation;

        // Update Web Audio API listener
        if (this.listener.positionX) {
            // Modern API
            this.listener.positionX.setValueAtTime(position.x, this.context.currentTime);
            this.listener.positionY.setValueAtTime(position.y, this.context.currentTime);
            this.listener.positionZ.setValueAtTime(position.z, this.context.currentTime);

            if (orientation) {
                this.listener.forwardX.setValueAtTime(orientation.x, this.context.currentTime);
                this.listener.forwardY.setValueAtTime(orientation.y, this.context.currentTime);
                this.listener.forwardZ.setValueAtTime(orientation.z, this.context.currentTime);
                this.listener.upX.setValueAtTime(0, this.context.currentTime);
                this.listener.upY.setValueAtTime(1, this.context.currentTime);
                this.listener.upZ.setValueAtTime(0, this.context.currentTime);
            }
        } else {
            // Legacy API
            this.listener.setPosition(position.x, position.y, position.z);
            if (orientation) {
                this.listener.setOrientation(orientation.x, orientation.y, orientation.z, 0, 1, 0);
            }
        }
    }

    // Play a sound at a specific world position
    playSpatialSound(type, position, volume = 0.5) {
        if (!this.context || !this.enabled) return;

        const panner = this.context.createPanner();
        panner.panningModel = 'HRTF';
        panner.distanceModel = 'inverse';
        panner.refDistance = 5;
        panner.maxDistance = 80;
        panner.rolloffFactor = 1.5;
        panner.setPosition(position.x, position.y, position.z);

        const gain = this.context.createGain();
        gain.gain.value = volume * this.sfxVolume;

        gain.connect(panner);
        panner.connect(this.buses.spatial);

        // Play appropriate sound through this spatial chain
        this.playSpatialSoundType(type, gain);
    }

    playSpatialSoundType(type, outputNode) {
        const now = this.context.currentTime;

        switch (type) {
            case 'footstep':
                const step = this.context.createOscillator();
                step.type = 'sine';
                step.frequency.value = 80 + Math.random() * 40;
                const stepGain = this.context.createGain();
                stepGain.gain.setValueAtTime(0.3, now);
                stepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
                step.connect(stepGain);
                stepGain.connect(outputNode);
                step.start(now);
                step.stop(now + 0.15);
                break;

            case 'rustle':
                // Leaf/grass rustle
                const rustleBuffer = this.context.createBuffer(1, this.context.sampleRate * 0.2, this.context.sampleRate);
                const rustleData = rustleBuffer.getChannelData(0);
                let last = 0;
                for (let i = 0; i < rustleBuffer.length; i++) {
                    const white = Math.random() * 2 - 1;
                    rustleData[i] = (last + 0.02 * white) / 1.02 * (1 - i / rustleBuffer.length);
                    last = rustleData[i];
                }
                const rustle = this.context.createBufferSource();
                rustle.buffer = rustleBuffer;
                const rustleFilter = this.context.createBiquadFilter();
                rustleFilter.type = 'bandpass';
                rustleFilter.frequency.value = 3000;
                rustle.connect(rustleFilter);
                rustleFilter.connect(outputNode);
                rustle.start(now);
                break;

            case 'splash':
                // Water splash
                const splashBuffer = this.context.createBuffer(1, this.context.sampleRate * 0.3, this.context.sampleRate);
                const splashData = splashBuffer.getChannelData(0);
                for (let i = 0; i < splashBuffer.length; i++) {
                    const decay = Math.pow(1 - i / splashBuffer.length, 1.5);
                    splashData[i] = (Math.random() * 2 - 1) * decay;
                }
                const splash = this.context.createBufferSource();
                splash.buffer = splashBuffer;
                const splashFilter = this.context.createBiquadFilter();
                splashFilter.type = 'lowpass';
                splashFilter.frequency.value = 2000;
                splash.connect(splashFilter);
                splashFilter.connect(outputNode);
                splash.start(now);
                break;

            case 'chop':
                // Wood chopping
                const chop = this.context.createOscillator();
                chop.type = 'sawtooth';
                chop.frequency.setValueAtTime(200, now);
                chop.frequency.exponentialRampToValueAtTime(80, now + 0.1);
                const chopGain = this.context.createGain();
                chopGain.gain.setValueAtTime(0.5, now);
                chopGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                chop.connect(chopGain);
                chopGain.connect(outputNode);
                chop.start(now);
                chop.stop(now + 0.2);
                break;
        }
    }

    // ============================================
    // TIME OF DAY
    // ============================================

    setTimeOfDay(time) {
        // time: 0 = midnight, 0.25 = 6am, 0.5 = noon, 0.75 = 6pm
        const prevTime = this.timeOfDay;
        this.timeOfDay = Math.max(0, Math.min(1, time));

        // Check for dawn/dusk transitions
        const wasDaytime = prevTime > 0.25 && prevTime < 0.75;
        const isDaytime = this.timeOfDay > 0.25 && this.timeOfDay < 0.75;

        if (wasDaytime !== isDaytime && this.enabled) {
            this.updateDayNightSounds();
        }

        // Adjust ambient drone based on time
        if (this.enabled && this.ambientNodes.length > 0) {
            const timeMultiplier = isDaytime ? 1.0 : 0.7; // Quieter at night
            this.ambientNodes.forEach(node => {
                if (node.gain && node.baseVolume !== undefined) {
                    node.gain.gain.setTargetAtTime(
                        node.baseVolume * timeMultiplier * this.ambientVolume,
                        this.context.currentTime,
                        2
                    );
                }
            });
        }
    }

    // ============================================
    // UI SOUNDS
    // ============================================

    playClick() {
        if (!this.context || !this.enabled) return;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sine';
        osc.frequency.value = 800;

        const now = this.context.currentTime;
        gain.gain.setValueAtTime(0.15 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(this.buses.sfx);

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
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(this.buses.sfx);

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
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(gain);
        gain.connect(this.buses.sfx);

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
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(this.buses.sfx);

        osc.start(now);
        osc.stop(now + 0.12);
    }

    playSuccess() {
        if (!this.context || !this.enabled) return;

        [600, 900].forEach((freq, i) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            const now = this.context.currentTime + i * 0.1;
            gain.gain.setValueAtTime(0.12 * this.sfxVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

            osc.connect(gain);
            gain.connect(this.buses.sfx);

            osc.start(now);
            osc.stop(now + 0.25);
        });
    }

    playError() {
        if (!this.context || !this.enabled) return;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = 'sawtooth';
        osc.frequency.value = 200;

        const now = this.context.currentTime;
        gain.gain.setValueAtTime(0.1 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        // Vibrato for error feel
        const vib = this.context.createOscillator();
        const vibGain = this.context.createGain();
        vib.frequency.value = 8;
        vibGain.gain.value = 15;
        vib.connect(vibGain);
        vibGain.connect(osc.frequency);
        vib.start(now);
        vib.stop(now + 0.25);

        const filter = this.context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 600;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.buses.sfx);

        osc.start(now);
        osc.stop(now + 0.25);
    }

    // Legacy compatibility methods
    playTone(freq, duration, volume, type = 'sine') {
        if (!this.context || !this.enabled) return;

        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.value = 0;

        osc.connect(gain);
        gain.connect(this.buses.sfx);

        const now = this.context.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume * this.sfxVolume, now + 0.01);
        gain.gain.linearRampToValueAtTime(0, now + duration);

        osc.start(now);
        osc.stop(now + duration + 0.1);
    }

    playChord(frequencies, duration, volume) {
        frequencies.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, duration, volume, 'sine'), i * 50);
        });
    }

    // Legacy method compatibility
    startAmbience() {
        this.startFullSoundscape();
    }

    stopAmbience() {
        this.stopAllAudio();
    }
}

// Singleton export
export const audioSystem = new AudioSystem();
