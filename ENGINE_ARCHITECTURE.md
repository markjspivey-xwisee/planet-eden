# Planet Eden Game Engine Architecture

## Overview
A modular game engine built with Zig (WASM) for simulation logic and JavaScript/Three.js for rendering. Components are designed to be reusable as standalone libraries.

## Reusable Library Candidates (Separate Repos)

### Zig Libraries
| Library | Description | Status |
|---------|-------------|--------|
| `zig-ecs` | Entity Component System | Planned |
| `zig-behavior` | Behavior trees for AI | Planned |
| `zig-noise` | Procedural noise generation | Planned |
| `zig-neural` | Neural network primitives | Exists (in project) |

### JavaScript Libraries
| Library | Description | Status |
|---------|-------------|--------|
| `three-animator` | Animation state machine for Three.js | Planned |
| `three-weather` | Weather/particle systems | Planned |
| `three-planet` | Procedural planet generation | Planned |
| `three-daynight` | Day/night cycle system | Planned |

## Core Systems

### 1. Time System
- Game time (ticks, days, seasons)
- Real-time to game-time conversion
- Day/night cycle driver
- Weather cycle driver

### 2. Animation System
```
AnimationController
├── StateMachine (idle, walk, run, attack, eat, build)
├── BlendTree (smooth transitions)
├── ProceduralAnimation (leg IK, look-at)
└── VertexAnimation (wind sway for plants)
```

### 3. Entity Component System
```
Entity
├── TransformComponent (position, rotation, scale)
├── RenderComponent (mesh, materials)
├── AnimationComponent (current state, blend weights)
├── AIComponent (behavior tree, goals)
├── HealthComponent (health, energy, hunger)
├── InventoryComponent (resources, tools)
└── SocialComponent (tribe, relationships)
```

### 4. Weather System
```
WeatherController
├── CloudSystem (3D clouds, coverage)
├── PrecipitationSystem (rain, snow particles)
├── WindSystem (direction, strength, gusts)
├── StormSystem (thunder, lightning)
└── TemperatureSystem (affects behavior)
```

### 5. Day/Night Cycle
```
DayNightController
├── SunOrbit (position, angle)
├── MoonOrbit (phases)
├── SkyGradient (color transitions)
├── AmbientLight (intensity changes)
└── StarVisibility (fade in/out)
```

### 6. Resource System
```
ResourceManager
├── ResourceTypes (wood, stone, food, water)
├── ResourceNodes (trees, rocks, water sources)
├── GatheringActions (chop, mine, collect, drink)
└── Inventory (storage, capacity)
```

### 7. Building System
```
BuildingController
├── BuildingTypes (hut, storage, workshop)
├── ConstructionProgress (stages, materials needed)
├── WorkerAssignment (who is building)
└── BuildingEffects (shelter, storage capacity)
```

### 8. Combat System
```
CombatController
├── AttackTypes (melee, ranged)
├── DamageCalculation
├── DeathHandling
└── LootDrops
```

## Data Flow

```
[WASM Simulation] ──updates──> [Shared Memory] <──reads── [JS Renderer]
       │                              │
       ├── Entity positions           ├── Animation states
       ├── Entity states              ├── Weather state
       ├── AI decisions               ├── Time of day
       └── Resource counts            └── Building progress
```

## Implementation Priority

### Phase 1: Core Visuals (Current Sprint)
1. Day/night cycle with sun orbit
2. Organism facing direction
3. Simple procedural walk animation
4. Tree wind sway

### Phase 2: Weather & Environment
1. Rain particle system
2. Storm effects
3. Wind affecting movement
4. Temperature zones

### Phase 3: Behaviors & Resources
1. Visible eating/drinking
2. Resource gathering animations
3. Building construction
4. Combat animations

### Phase 4: Polish
1. Sound system
2. UI improvements
3. Performance optimization
4. Save/load system

## File Structure
```
simulation/
├── src/                    # Zig WASM source
│   ├── main.zig
│   ├── simulation.zig
│   ├── ecs/               # Entity Component System
│   ├── ai/                # Behavior trees
│   └── systems/           # Game systems
├── js/
│   ├── engine/            # Core engine modules
│   │   ├── time.js        # Time/day-night
│   │   ├── animation.js   # Animation system
│   │   ├── weather.js     # Weather system
│   │   └── resources.js   # Resource system
│   ├── renderer.js        # Three.js rendering
│   ├── wasm-loader.js     # WASM interface
│   └── wasm-main.js       # Application entry
└── assets/                # Models, textures, sounds
```
