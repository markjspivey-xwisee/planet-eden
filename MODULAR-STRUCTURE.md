# 🏗️ Planet Eden - Modular Structure Documentation

## Overview

Planet Eden has been refactored from a single monolithic HTML file into a **modern, modular architecture** with separated concerns and true neural network AI.

---

## 📁 Project Structure

```
planet-eden/
├── index.html                          # Main entry HTML (clean, minimal)
├── planet-eden-complete.html          # Legacy monolithic version (4,800+ lines)
│
├── css/
│   └── style.css                      # All visual styling
│
├── js/
│   ├── main.js                        # Application entry point & game loop
│   ├── organism.js                    # Organism class & spatial grid
│   ├── neural-network.js              # True neural network implementation
│   ├── powers.js                      # God powers & particle effects
│   └── ui.js                          # UI helpers & notifications
│
├── README.md                          # User-facing documentation
├── DEVELOPER-FEATURES.md              # Developer tools guide
└── MODULAR-STRUCTURE.md              # This file
```

---

## 🧩 Module Breakdown

### 1. **index.html** (275 lines)
**Purpose:** Minimal entry point with UI structure

**Responsibilities:**
- Load external libraries (Three.js, Chart.js)
- Import modular CSS and JavaScript
- Define HTML structure for UI panels
- Setup initial event listeners

**Key sections:**
- Stats panel (population counts, time, avg generation)
- Selected organism panel
- FPS counter
- Population chart container
- Loading screen

---

### 2. **css/style.css** (~300 lines)
**Purpose:** All visual styling separated from logic

**Includes:**
- CSS variables for theming
- Mobile-first responsive design
- Panel styling with glassmorphism effects
- Button styles and hover states
- Animation keyframes
- Touch-friendly sizing (44px minimum tap targets)

**Benefits:**
- Easy theme customization
- Centralized visual design
- Better cacheability
- No inline styles in JavaScript

---

### 3. **js/neural-network.js** (98 lines)
**Purpose:** True feedforward neural network with multi-output control

**Features:**
- **Xavier initialization** for better learning
- **Multiple outputs** (3D movement control: moveX, moveY, moveZ)
- **Tanh activation** for smooth gradient flow
- **Mutation** for evolutionary learning
- **Clone & export** functionality

**Architecture:**
```
Input Layer (5 neurons)
    ↓
Hidden Layer (8-12 neurons, tanh activation)
    ↓
Output Layer (3 neurons for 3D movement)
```

**Inputs:**
1. Energy (0-1 normalized)
2. Health (0-1 normalized)
3. Nearest food distance (inverted)
4. Nearest predator distance (inverted)
5. Nearest prey distance (inverted)

**Outputs:**
1. Move X direction
2. Move Y direction
3. Move Z direction

**Key improvement over legacy:**
- Legacy used simple weighted sum with 1 output (just speed)
- New version controls full 3D movement with proper backprop-ready architecture

---

### 4. **js/organism.js** (~420 lines)
**Purpose:** Living entities with AI, physics, and lifecycle

**Classes:**
- **Organism** - Base entity class
- **SpatialGrid** - O(1) collision detection

**Organism Features:**
- 4 types: Plant, Herbivore, Carnivore, Humanoid
- True neural network brain (3 outputs)
- Intelligent behavior:
  - Seek food when hungry
  - Flee predators when in danger
  - Hunt prey (carnivores)
  - Wander when no stimulus
- Reproduction with genetic mutation
- Aging and death with decay animation
- Energy/health management
- Generation tracking

**SpatialGrid Optimization:**
- Divides 3D space into grid cells
- Only checks nearby organisms for collisions
- Reduces collision checks from O(n²) to O(n)
- Critical for 100+ entity performance

**Key improvement:**
- Organisms now use 3D neural network outputs for wandering
- Hybrid system: rules for survival instincts, NN for exploration

---

### 5. **js/powers.js** (~490 lines)
**Purpose:** God mode powers and visual effects system

**Powers (22 total):**
1. **Divine Intervention** (7):
   - Bless, Curse, Smite, Resurrect, Evolve, Clone, Boost IQ

2. **Environmental** (6):
   - Meteor, Lightning, Plague, Healing Rain, Abundance, Drought

3. **Terraforming** (4):
   - Raise, Lower, Smooth, Flatten terrain

4. **Resource Management** (5):
   - Mass Spawn, Clear Area, Balance Ecosystem, Food Surplus, Famine

**ParticleEffect Class:**
- THREE.Points-based system
- Configurable: count, color, size, spread, duration
- Physics: gravity, spiral motion, fade-out
- Auto-dispose when complete
- Capped at 20 active effects for performance

**Terraforming:**
- Direct BufferGeometry manipulation
- Falloff function for smooth transitions
- Dynamic biome color recalculation
- Terrain cache invalidation

**Key improvement:**
- Modular, reusable effect system
- Easy to add new powers
- Separated from main game loop

---

### 6. **js/ui.js** (~220 lines)
**Purpose:** User interface helpers and data export

**Functions:**
- **showNotification()** - Toast notifications
- **playSound()** - Procedural audio
- **checkAchievement()** - 10 unlockable achievements
- **updateStatsPanel()** - Real-time population display
- **updateFPS()** - Performance monitoring
- **updatePopulationChart()** - Chart.js integration
- **exportPopulationCSV()** - Time-series data export
- **exportWorldJSON()** - Full world state export
- **exportOrganism()** - Individual creature DNA export

**Achievements:**
- First Life, Thriving World, Extinction Event
- God of Life, Divine Wrath, Evolution Master
- World Shaper, Equilibrium, Speed Demon, Observer

**Key improvement:**
- All UI logic centralized
- Easy to add new export formats
- Notifications system decoupled from game logic

---

### 7. **js/main.js** (~450 lines)
**Purpose:** Application core - Three.js setup, game loop, coordination

**Responsibilities:**
- Scene initialization (camera, renderer, lights)
- Procedural planet generation with biomes
- Camera controls (mouse + touch)
- Game loop (update → render)
- Ecosystem simulation:
  - Spatial grid updates
  - Organism updates (AI, movement, aging)
  - Collision detection (eating)
  - Reproduction
  - Timed god mode effects
  - Auto-save every 2 minutes
- Population tracking and charts
- Module coordination

**Planet Generation:**
- 160x160 sphere geometry for smooth terrain
- 4 octaves of Perlin-like noise
- 8+ biomes: deep ocean, ocean, beach, grassland, forest, tundra, mountains, snow peaks
- Latitude-based climate zones
- Procedural height caching for performance

**Camera System:**
- Orbital camera (angle + height + distance)
- Mouse drag to rotate
- Mouse wheel to zoom
- Touch support:
  - Single finger drag: rotate
  - Pinch to zoom

**Key improvement:**
- Clean separation of concerns
- Easy to swap rendering backends (e.g., use Babylon.js)
- Game state exposed via `window.PlanetEden` for debugging

---

## 🚀 Performance Optimizations

### Compared to Legacy Version

| Aspect | Legacy | Modular | Improvement |
|--------|--------|---------|-------------|
| **File Size** | 4,800 lines in 1 file | ~2,100 lines across 7 files | Better organization |
| **Load Time** | Parse entire file | Parallel module loading | Faster |
| **Neural Network** | 1 output (speed only) | 3 outputs (full 3D control) | More intelligent |
| **Code Reusability** | Monolithic | Modular exports | High |
| **Maintainability** | Hard to navigate | Logical separation | Easy |
| **Browser Caching** | Cache entire 4.8K lines | Cache CSS/JS separately | Efficient |
| **Testing** | Test full app | Test individual modules | Easier |

### Current Optimizations

1. **Spatial Grid** - O(n) instead of O(n²) collision detection
2. **Terrain Height Cache** - 10,000 entry LRU cache
3. **Particle Effect Pooling** - Max 20 active effects
4. **Delta Time Scaling** - Framerate-independent physics
5. **Reduced Draw Calls** - Instancing for particle systems
6. **BufferGeometry** - Direct vertex manipulation
7. **Fog** - Hide distant objects from rendering
8. **No Shadows** - Disabled for 60 FPS performance

---

## 🎯 Usage

### Development

```bash
# Start local server
node server.js

# Or use Python
python -m http.server 8000

# Or use VS Code Live Server extension
```

### Browser Console Debugging

```javascript
// Access simulation
window.PlanetEden

// Get all organisms
PlanetEden.organisms

// Get selected organism
PlanetEden.selected

// Get game state
PlanetEden.state

// Access powers
PlanetEden.POWERS

// Export data
PlanetEden.exportPopulationCSV()
PlanetEden.exportWorldJSON()
PlanetEden.exportOrganism()

// Pause/resume
PlanetEden.state.paused = true
```

### Keyboard Controls

- **Space** - Pause/Resume
- (Future: More controls can be added via event listeners in index.html)

---

## 🧪 Testing Checklist

### Module Imports
- [x] ES6 modules load without errors
- [x] Three.js CDN loads
- [x] Chart.js CDN loads
- [ ] No CORS errors (requires HTTP server)

### Neural Network
- [ ] Organisms move intelligently (seek food, flee predators)
- [ ] Wandering uses NN outputs (not random)
- [ ] Mutation works (check generation increases)
- [ ] Export includes neural network weights

### Spatial Performance
- [ ] 100+ organisms run at 60 FPS
- [ ] No frame drops during reproduction bursts
- [ ] Spatial grid visualization (if implemented)

### God Powers
- [ ] All 22 powers work
- [ ] Particle effects render correctly
- [ ] Terraforming modifies geometry
- [ ] No power errors in console

### UI
- [ ] Stats panel updates in real-time
- [ ] Selected organism panel shows data
- [ ] FPS counter displays correct value
- [ ] Population chart renders
- [ ] Notifications appear and disappear
- [ ] Achievements unlock

### Mobile
- [ ] Touch drag rotates camera
- [ ] Pinch to zoom works
- [ ] UI is readable on small screens
- [ ] Panels don't overlap

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                   index.html                        │
│  ┌────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ Three.js   │  │  Chart.js    │  │  style.css │  │
│  │  (CDN)     │  │   (CDN)      │  │            │  │
│  └────────────┘  └──────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────┘
                       │ imports
                       ▼
┌─────────────────────────────────────────────────────┐
│                    main.js                          │
│  • Three.js scene setup                             │
│  • Game loop (60 FPS)                               │
│  • Camera controls                                  │
│  • Module coordination                              │
└─────────────────────────────────────────────────────┘
         │              │              │
         │ uses         │ uses         │ uses
         ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ organism.js  │ │  powers.js   │ │    ui.js     │
│              │ │              │ │              │
│ • Organism   │ │ • 22 Powers  │ │ • Notify     │
│ • AI logic   │ │ • Effects    │ │ • Stats      │
│ • Physics    │ │ • Terraform  │ │ • Export     │
│ • Spatial    │ │              │ │ • Chart      │
│   Grid       │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
         │
         │ uses
         ▼
┌──────────────────────────────┐
│    neural-network.js         │
│                              │
│ • NeuralNetwork class        │
│ • Xavier initialization      │
│ • Forward propagation        │
│ • Mutation & cloning         │
│ • 3 outputs for 3D control   │
└──────────────────────────────┘
```

---

## 🔮 Future Enhancements

### Possible Improvements

1. **Full Neural Network Control**
   - Remove rule-based behavior entirely
   - Train networks using neuroevolution
   - Emergent behavior without hard-coded rules

2. **WebGL Compute Shaders**
   - GPU-accelerated neural network forward pass
   - 1000+ organisms at 60 FPS

3. **Web Workers**
   - Offload AI computation to separate thread
   - Keep main thread for rendering only

4. **TypeScript Migration**
   - Type safety for large refactors
   - Better IDE autocomplete
   - Catch bugs at compile time

5. **Unit Tests**
   - Jest for JavaScript testing
   - Test neural network math
   - Test spatial grid accuracy

6. **Build Process**
   - Webpack/Vite for bundling
   - Minification for production
   - Source maps for debugging

7. **Save/Load System**
   - Full world persistence
   - Share worlds via JSON import
   - Replay system (record/playback)

8. **Multiplayer**
   - WebRTC for peer-to-peer
   - Multiple gods controlling same world
   - Competitive god battles

---

## 🎓 Learning Resources

### For Understanding This Codebase

**Three.js:**
- [Official Docs](https://threejs.org/docs/)
- Fundamentals (scenes, cameras, meshes, materials)
- BufferGeometry manipulation
- Particle systems with THREE.Points

**Neural Networks:**
- [3Blue1Brown Neural Network Series](https://www.youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi)
- Xavier/Glorot initialization
- Activation functions (tanh, sigmoid, ReLU)
- Neuroevolution (genetic algorithms for NN training)

**Spatial Partitioning:**
- Grid-based collision detection
- Quadtrees (2D) and Octrees (3D)
- Hash-based spatial lookup

**ES6 Modules:**
- Import/export syntax
- Module best practices
- Circular dependency avoidance

---

## 📝 Migration Guide (Legacy → Modular)

If you have modifications to the legacy `planet-eden-complete.html`:

1. **Identify your changes** (use git diff or compare tools)
2. **Locate the module** (organism logic → organism.js, powers → powers.js, etc.)
3. **Update the module** (maintain export/import structure)
4. **Test in isolation** (can you import the module without errors?)
5. **Test in integration** (does main.js still work?)

**Example:** Adding a new god power

Legacy (in HTML):
```javascript
const POWERS = {
    // ... existing powers
    'my-power': { name: 'My Power', execute: () => { ... } }
}
```

Modular (in powers.js):
```javascript
export function createPowersSystem(...) {
    const POWERS = {
        // ... existing powers
        'my-power': {
            name: 'My Power',
            targetType: 'location',
            execute: (position) => {
                // Your power logic
                showNotification('My power activated!');
            }
        }
    };
    return POWERS;
}
```

---

## ✅ Production Checklist

Before deploying:

- [ ] Test all modules load (check browser console)
- [ ] No errors during 5-minute run
- [ ] FPS stays above 30 with 100+ organisms
- [ ] All 22 powers work without errors
- [ ] Mobile touch controls work
- [ ] Population chart renders
- [ ] Export functions generate valid files
- [ ] Auto-save doesn't cause lag
- [ ] Achievements unlock correctly
- [ ] Neural networks control organism behavior
- [ ] README.md updated with new structure
- [ ] Code comments are clear

---

## 📄 License

MIT License - Same as original project

---

## 🙏 Credits

- **Three.js** - 3D rendering engine
- **Chart.js** - Population graphs
- **Original Design** - God mode simulation concept
- **Modular Refactor** - Claude AI assisted refactoring

---

**Made with ❤️ and modern JavaScript**
