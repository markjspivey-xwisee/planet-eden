# 🚀 Planet Eden WASM - Quick Start Guide

## Launch in 3 Steps

### 1. Build WASM (if not already built)
```bash
/tmp/zig-windows-x86_64-0.13.0/zig build --release=small
```

Output: `zig-out/bin/planet-eden.wasm` (24 KB)

### 2. Start Server
```bash
node server.js
```

Server runs on http://localhost:8000

### 3. Open Browser
```
http://localhost:8000/index-wasm.html
```

---

## What You'll See

🎬 **Loading Screen** (1 second)
- Animated spinner
- "Loading Planet Eden WASM..."
- WASM specs display

🌍 **Main Simulation**
- 3D planet with 75 organisms
- 5 HUD panels (Tribes, Stats, God Powers, Chart, Controls)
- FPS counter
- Pause overlay (press SPACE)

---

## First 60 Seconds

**0:00** - Simulation loads, paused
**0:01** - Press SPACE to start
**0:05** - Organisms begin moving (neural networks active)
**0:10** - Herbivores eat plants, carnivores hunt
**0:15** - Population chart starts tracking
**0:20** - Press F1 to spawn second tribe
**0:30** - Watch two tribes compete for resources
**0:45** - Press F2 for mass spawn (100 organisms)
**1:00** - 🏆 Achievement unlocked: "Population Boom"

---

## Key Features to Try

### God Powers (F1-F6)
1. **F1** - Spawn new tribe (8 humanoids)
2. **F2** - Mass spawn 100 organisms
3. **F3** - Gift resources to tribe
4. **F4** - Trigger tribal war
5. **F5** - Plague (kill 20%)
6. **F6** - Divine blessing (heal all)

### Quick Spawn (1-4)
- Press `1` for plants
- Press `2` for herbivores
- Press `3` for carnivores
- Press `4` for humanoids

### Camera Control
- Arrow keys to rotate/zoom
- `R` to reset camera
- `+/-` to speed up/slow down

### Debug Info
- Press `I` for detailed stats
- Check console for comprehensive logs

---

## Expected Performance

- **FPS**: 60 (green counter)
- **Organisms**: Start with 75, can handle 1200+
- **WASM Size**: 24 KB
- **Memory**: 16 MB

---

## Achievements to Unlock

🏛️ **First Tribe** - Create your first tribe (auto-unlocks)
🌍 **Population Boom** - Get 100 organisms alive
🌎 **Thriving World** - Get 500 organisms alive
🏰 **Five Nations** - Create 5 active tribes
⏰ **Ancient World** - Run for 1000 seconds
🌱 **Mass Creation** - Use F2 mass spawn

---

## Troubleshooting

**Blank screen?**
- Check browser console (F12)
- Ensure server is running on port 8000
- Try rebuilding WASM

**Low FPS?**
- Press `I` to check stats
- Reduce time scale with `-` key
- Check organism count (target <500 for 60 FPS)

**WASM not loading?**
- Rebuild: `zig build --release=small`
- Check `zig-out/bin/planet-eden.wasm` exists
- Clear browser cache

---

## Console Commands

```javascript
// Debug info
window.planetEden.logDebugInfo()

// Speed up 3x
window.planetEden.timeScale = 3.0

// Check stats
window.planetEden.wasmModule.getStats()

// Spawn organism
window.planetEden.wasmModule.spawnOrganism(3, 0, 5, 0, 0)
```

---

## 🎊 You're Ready!

Open **http://localhost:8000/index-wasm.html** and press SPACE to start!

Watch as neural networks drive tribal civilizations to evolve, build, and compete for survival on Planet Eden! 🌍
