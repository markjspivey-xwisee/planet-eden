# Planet Eden - AAA Production Plan

Priority-ordered task list for achieving retail-quality experience.

## Legend

- [ ] Not started
- [~] In progress
- [x] Complete

---

## Ralph Loop Development Methodology

The improved Ralph loop for this project:

```text
1. IDENTIFY  - Pick ONE feature from todo list
2. IMPLEMENT - Write the code
3. INTEGRATE - Add imports, init calls, connections
4. VERIFY    - Run syntax check + server test
5. COMPLETE  - Mark done, move to next
```

Key improvements made:

- Always run `node --check <file>` after editing
- Verify modules are served via `curl http://localhost:8000/path`
- Only mark complete after verification passes

---

## Critical (Must Have for Release)

### Polish & Visual Quality

- [x] Day/night ambient light color changes (warm sunrise/sunset, cool night)
- [x] Weather sound effects (rain, thunder, wind)
- [x] Tribe color indicators on humanoids (colored accessories/glow)
- [x] Loading screen with animated logo and gameplay tips
- [x] Smooth UI panel animations (slide in/out, fade)
- [x] Add pulsing glow effect on selected organism

### Core Features

- [x] Save/load simulation state to localStorage
- [x] Settings menu (graphics quality, audio volume, time scale)
- [ ] First-time tutorial/onboarding sequence
- [ ] Pause menu with resume/restart/settings options

### Audio Excellence

- [x] Background music (ambient, adaptive to time of day) - procedural ambient
- [x] UI sound effects (button clicks, panel opens)
- [x] Environmental sounds (wind, water, birds)
- [ ] Creature sounds (movement, eating, combat)

---

## High Priority (Enhanced Experience)

### Visual Effects

- [ ] Water reflections and subtle waves
- [ ] Atmospheric fog/haze at horizon
- [ ] God ray/volumetric lighting from sun
- [ ] Minimap showing organism distribution
- [ ] Seasonal effects (winter snow particles, autumn colors)

### Gameplay Polish

- [ ] Population graph with historical data (expandable view)
- [ ] Tribe diplomacy panel (relations, alliances, wars)
- [ ] Resource gathering progress indicators
- [ ] Building construction progress bar
- [ ] Achievement unlock animations

### Performance

- [ ] Level-of-detail (LOD) for distant organisms
- [ ] Frustum culling optimization
- [ ] Frame rate limiter option
- [ ] Mobile touch controls and gestures

---

## Medium Priority (Nice to Have)

### Content

- [ ] More building types with unique visuals
- [ ] Different biome visual themes
- [ ] Weather events (storms, drought, floods)
- [ ] Seasonal changes affecting gameplay

### Social Features

- [ ] Screenshot sharing with watermark
- [ ] Timelapse recording feature
- [ ] World seed system for sharing interesting maps

### Accessibility

- [ ] Colorblind mode
- [ ] UI scale options
- [ ] Reduced motion option
- [ ] High contrast mode

---

## Completed

### Core Systems

- [x] Zig+WASM high-performance simulation engine
- [x] Three.js 3D rendering with spherical planet
- [x] Neural network AI for organisms
- [x] Tribal civilization mechanics
- [x] Resource gathering and crafting
- [x] Day/night cycle
- [x] Weather system (rain, storms)

### Recent Improvements

- [x] Fix camera follow mode upside-down orientation
- [x] Clean up GUI panels (hide by default)
- [x] Add event/toast notification system
- [x] Add ambient audio system
- [x] Add particle effects system
- [x] Add goals/milestones system
- [x] Add screenshot system
- [x] Add population sparkline graph
- [x] Reduce energy drain for longer survival
- [x] Increase organism capacity to 500
- [x] Disable compaction (fixes visual jerking)
- [x] Optimize water avoidance performance
- [x] Fix mobile panel toggle
- [x] Add ? key help modal
- [x] Add organism count by type to stats
- [x] Improve follow mode camera smoothness
- [x] Add goal completion confetti particles
- [x] Connect particle system to birth/death events

---

## Build Commands

```bash
# Build WASM (production)
./zig/zig-windows-x86_64-0.13.0/zig.exe build --release=small

# Development server
node server.js

# Open http://localhost:8000
```

## Quality Targets

- **Desktop**: 60 FPS at 1080p
- **Mobile**: 30 FPS at 720p
- **Load time**: < 3 seconds
- **WASM size**: < 1 MB
- **Memory**: < 100 MB
