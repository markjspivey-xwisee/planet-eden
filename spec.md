# Rainforest Growth Simulation - Technical Specification

## Project Overview
A browser-based 3D simulation of a growing rainforest ecosystem that runs continuously for hours. The simulation creates an emotionally calming, wondrous experience through procedural generation, dynamic weather, and a living ecosystem.

## Time Scale
- **1 real minute = 1 simulation day**
- Full day/night cycle every 60 seconds
- Seasons cycle over ~6 minutes (6 days)
- Visible plant growth over hours of runtime

## Core Features

### 1. Terrain & Environment
- **Terrain**: Procedurally generated using Simplex noise
  - Rolling hills with valleys
  - River valleys carved into terrain
  - Elevation range: 0-50 units
  - Size: 500x500 unit explorable area

- **Atmosphere**:
  - Dynamic sky dome with sun/moon cycle
  - Volumetric fog in valleys (morning mist)
  - Color gradients: dawn (pink/orange) → day (blue) → dusk (purple/red) → night (deep blue/black)
  - Stars visible at night with subtle twinkling
  - Ambient occlusion for depth

### 2. Water Systems
- **Rivers**:
  - 2-3 procedural river paths from highlands to lowlands
  - Reflective water surface with subtle caustics
  - Gentle flow animation (vertex displacement)
  - River width: 5-15 units

- **Rain**:
  - Particle system: 10,000-50,000 particles during rain
  - Gradual onset and fade (5-10 second transitions)
  - Rain frequency: Every 3-8 simulation days (random)
  - Duration: 0.5-2 simulation days
  - Ripples on water surfaces during rain
  - Muted lighting during rain

### 3. Vegetation System

#### Grass
- Instanced geometry (100,000+ blades)
- Wind response via vertex shader
- Height variation: 0.2-0.8 units
- Color: Multiple green shades with yellow/brown variation
- Density decreases near water and under tree canopy

#### Plants & Undergrowth
- Ferns (procedural fronds)
- Flowering plants (simple geometry with color variety)
- Mushrooms near tree bases
- Growth animation over simulation time

#### Trees
- **Procedural L-system generation**
- Tree types:
  1. Tall canopy trees (30-50 units height)
  2. Medium trees (15-30 units)
  3. Palms (10-20 units)
  4. Young saplings (2-10 units, growing)

- Features:
  - Branch swaying in wind
  - Leaf clusters as billboard sprites or low-poly geometry
  - Bark textures (procedural)
  - New trees spawn slowly over time
  - Initial forest: ~200 trees, growing to ~500+

### 4. Weather System

#### Wind
- Perlin noise-based wind field
- Base gentle breeze always present
- Occasional gusts (every few minutes)
- Affects: grass, leaves, rain direction, water ripples
- Visual: subtle particle drift (pollen/leaves)

#### Rain
- State machine: Clear → Clouding → Raining → Clearing
- Cloud buildup before rain
- Lightning during heavy rain (rare, distant)
- Sound would enhance but not required for visual

### 5. Lighting & Atmosphere

#### Day/Night Cycle (60-second period)
```
0-10s:   Dawn (sun rises, pink/orange sky)
10-30s:  Day (blue sky, bright directional light)
30-40s:  Dusk (sun sets, purple/red sky)
40-60s:  Night (stars, moon, ambient blue light)
```

#### Lighting
- Directional light (sun/moon)
- Hemisphere light (sky/ground ambient)
- Fog color matches time of day
- Shadows from trees (soft shadows)

### 6. Camera & Controls

#### Bird's Eye View
- Height: 100-200 units above terrain
- Orbit controls around center point
- Can zoom in/out
- Slow automatic rotation option

#### First Person View
- Height: 1.7 units (eye level)
- WASD movement (optional, or fixed position)
- Mouse look
- Crouch to 0.8 units
- Can teleport to points of interest

#### UI
- Minimal, non-intrusive
- View toggle button (corner)
- Time display (simulation day counter)
- Optional: time speed control

## Technical Architecture

### File Structure
```
rainforest-sim/
├── spec.md
├── index.html          (entry point, includes all modules)
├── styles.css          (minimal UI styling)
└── modules/
    ├── core.js         (main loop, scene setup)
    ├── terrain.js      (terrain generation)
    ├── water.js        (rivers, rain effects)
    ├── vegetation.js   (grass, plants, trees)
    ├── weather.js      (wind, rain, clouds)
    ├── sky.js          (atmosphere, day/night)
    ├── camera.js       (view modes, controls)
    └── utils.js        (noise functions, helpers)
```

### Dependencies
- **Three.js r158+** (via CDN with inline fallback consideration)
- No other external dependencies
- All procedural - no external assets needed

### Performance Targets
- 60 FPS on modern hardware
- 30 FPS minimum on older hardware
- LOD system for distant objects
- Frustum culling
- Instanced rendering for grass/plants

### Browser Compatibility
- Chrome 90+
- Edge 90+
- Firefox 90+
- Must work with file:// protocol (local double-click)
- Must work with http://localhost

## Visual Style

### Color Palette
- **Greens**: #2d5a27, #3a7d32, #4a9c3f, #6bb85a (vegetation)
- **Earth**: #5c4033, #8b6914, #a08060 (soil, bark)
- **Water**: #1a5f7a, #2d8cb8, #4db8d9 (rivers)
- **Sky Day**: #87ceeb → #1e90ff (gradient)
- **Sky Night**: #0a0a2e, #1a1a4e (deep blue)
- **Dawn/Dusk**: #ff7e5f, #feb47b, #c56cd6

### Aesthetic Goals
- Soft, dreamy quality
- Studio Ghibli-inspired wonder
- Gentle movements, nothing jarring
- Rich but not overwhelming detail
- Sense of life and growth

## Growth Mechanics

### Initial State (Day 0)
- Bare terrain with grass starting to appear
- Few small saplings
- Rivers present
- Sparse vegetation

### Growth Over Time
- Grass spreads and thickens (first hour)
- Saplings grow taller (visible over 10+ minutes)
- New trees spawn at edges (every few minutes)
- Flowers bloom and fade
- Forest fills in gradually

### Mature State (After ~2 hours)
- Dense canopy
- Multiple layers of vegetation
- Full ecosystem appearance
- Continues to evolve subtly

## Implementation Notes

### Completed Features ✓

**Core Systems**
- ✓ Three.js scene with WebGL renderer, shadows, ACES tone mapping
- ✓ Day/night cycle: 60 seconds = 1 simulation day
- ✓ Simplex noise-based procedural generation throughout
- ✓ Modular architecture with 10 distinct modules

**Terrain & Environment**
- ✓ 300x300 unit terrain with fbm noise heightmap
- ✓ River valleys carved procedurally
- ✓ Vertex-colored terrain based on height
- ✓ Dynamic fog that changes with time of day

**Sky & Atmosphere**
- ✓ Gradient sky dome with shader
- ✓ Twinkling stars at night (2000 stars)
- ✓ Sun/moon directional lights with shadows
- ✓ Hemisphere ambient lighting
- ✓ Color transitions: Night→Dawn→Day→Dusk→Night

**Water**
- ✓ Animated water plane with wave shader
- ✓ Rain ripple effects when raining
- ✓ Foam on wave peaks
- ✓ Semi-transparent with depth

**Weather**
- ✓ Perlin-based wind field affecting grass, trees, particles
- ✓ Rain particle system (15,000 particles)
- ✓ Rain state machine with gradual transitions
- ✓ Cloud system (20 clouds) that darkens during rain
- ✓ Wind-affected rain direction

**Vegetation**
- ✓ 80,000 instanced grass blades with wind shader
- ✓ Procedural trees with trunk + foliage layers
- ✓ Palm trees (separate type)
- ✓ 150 initial trees, growing to 400+
- ✓ Tree growth animation over time
- ✓ Tree spawning system
- ✓ Ferns and bushes (500 plants)
- ✓ 150 flowers that open during day, close at night

**Ambient Life**
- ✓ 3000 floating pollen particles (daytime)
- ✓ 200 blinking fireflies (nighttime)
- ✓ 50 colorful butterflies (daytime, good weather)

**Camera System**
- ✓ Bird's eye view with orbit controls
- ✓ First-person view with pointer lock
- ✓ WASD movement in first person
- ✓ Auto-rotate option
- ✓ Terrain following in first person

**UI**
- ✓ Minimal, glassmorphism-styled panels
- ✓ Day counter, time of day, weather, tree count
- ✓ View mode toggle buttons
- ✓ Loading screen with progress bar
- ✓ Control instructions

### Technical Specs
- Single HTML file (87KB)
- Works with file:// protocol (double-click)
- Works with localhost server
- Three.js r158 via CDN
- WebGL with PCF soft shadows
- 60 FPS target on modern hardware
