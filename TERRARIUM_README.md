# 🧬 Neural Terrarium - Artificial Life Planet Simulation

**An advanced neural network-driven ecosystem simulation on a virtual planet**

## 🌍 What Is This?

A fully autonomous artificial terrarium where AI-powered life forms evolve, compete, and thrive on a small spherical planet. Every creature has its own neural network brain, and evolution happens in real-time through genetic algorithms.

![Status](https://img.shields.io/badge/status-experimental-orange) ![AI](https://img.shields.io/badge/AI-Neural_Networks-blue) ![Evolution](https://img.shields.io/badge/evolution-genetic_algorithms-green)

## ✨ Key Features

### 🪐 Virtual Planet
- **Spherical world** with procedurally generated terrain
- **Realistic atmosphere** with shader-based atmospheric scattering
- **Orbital mechanics** - planet rotates and orbits a sun
- **Day/night cycle** based on planetary rotation
- **Dynamic weather** driven by atmospheric physics

### 🧠 Neural Network Life Forms
- **Autonomous creatures** with neural network brains (TensorFlow.js)
- **Genetic evolution** using NEAT algorithm (Neataptic)
- **Learning behaviors** - creatures improve over generations
- **Emergent intelligence** - watch AI discover survival strategies

### 🌱 Ecosystem Types

#### Plants (Producers)
- Generate energy from "sunlight"
- Stationary but evolve resistance traits
- Form the base of the food chain

#### Herbivores (Primary Consumers)
- Neural network-controlled movement
- Seek plants, avoid predators
- Evolve better foraging strategies

#### Carnivores (Secondary Consumers)
- Advanced hunting AI
- Track and pursue herbivores
- Evolve pursuit and ambush tactics

#### Decomposers (Planned)
- Break down dead organisms
- Recycle nutrients
- Maintain ecosystem health

### 🔬 Advanced Features

**Neural Networks:**
- 8 input neurons (sensors for food, predators, energy, etc.)
- Hidden layers evolved through NEAT
- 2 output neurons (movement speed and direction)

**Genetic Evolution:**
- Mutation and crossover
- Natural selection based on fitness
- Generation tracking
- Trait inheritance

**Ecosystem Dynamics:**
- Predator-prey relationships
- Energy flow through trophic levels
- Population dynamics
- Resource competition
- Reproduction with energy cost

## 🎮 Controls

### Mouse Controls
- **Left Click + Drag**: Rotate camera around planet
- **Scroll Wheel**: Zoom in/out
- **Right Click**: (Reserved for creature selection)

### Simulation Controls
- **⏸ PAUSE**: Pause/resume simulation
- **⏩ SPEED**: Adjust time speed (1x, 2x, 5x, 10x)

### Spawn Life Forms
- **🌱 Spawn Plants**: Add 10 photosynthetic organisms
- **🐛 Spawn Herbivores**: Add 5 plant-eating creatures
- **🦎 Spawn Carnivores**: Add 3 hunting predators

### Events
- **☄ Meteor Strike**: Random extinction event (kills 20%)
- **⚡ Evolution Boost**: Force mutation in all creatures
- **🔄 RESET PLANET**: Start over from scratch

## 📊 HUD Information

### Planet Status Panel
- Simulation day counter
- Solar time (24-hour cycle)
- Orbital position
- Average temperature
- Atmospheric composition
- Biosphere health score

### Ecosystem Metrics Panel
- Total organism count
- Population by type (plants, herbivores, carnivores)
- Average generation number
- Average fitness score
- Birth/death statistics
- Energy flow status

### Neural Activity Panel
- Selected creature information
- Neural network state
- Health and energy bars
- Behavioral stats
- Generation and fitness

## 🔬 How It Works

### Neural Network Architecture

Each creature has a brain with:

**Inputs (8 neurons):**
1. Forward obstacle sensor
2. Left side sensor
3. Right side sensor
4. Current energy level (0-1)
5. Current health (0-1)
6. Nearest food distance (0-1)
7. Nearest predator distance (0-1)
8. Nearest prey distance (0-1)

**Outputs (2 neurons):**
1. Movement speed (-0.5 to 0.5)
2. Turn angle (-π/4 to π/4)

**Hidden layers:** Evolved through NEAT algorithm

### Genetic Algorithm (NEAT)

- **Population size**: 50 genomes
- **Mutation rate**: 30%
- **Elitism**: Top 10% always survive
- **Selection**: Fitness-based
- **Mutation types**: Weight, add node, add connection, enable/disable

### Fitness Function

```javascript
fitness = age × 0.1 + energy × 0.01 + offspring × 10
```

Rewards:
- Survival time
- Energy management
- Successful reproduction

### Life Cycle

1. **Birth**: Creature spawns with parent's mutated brain
2. **Growth**: Learns to navigate and find resources
3. **Reproduction**: Asexual reproduction when energy > 70%
4. **Death**: Energy depletion, predation, or old age

### Energy System

- **Plants**: Generate +0.3 energy/sec from sunlight
- **Herbivores**: Lose -0.5 energy/sec, gain +30 from eating plants
- **Carnivores**: Lose -0.5 energy/sec, gain +30 from eating herbivores
- **Movement**: Additional energy cost proportional to speed

## 🚀 Quick Start

### Option 1: Direct Open
```bash
# Just open in browser
open terrarium.html
```

### Option 2: Local Server
```bash
# Start server
node server.js

# Open browser
http://localhost:8000/terrarium.html
```

### First Steps

1. **Watch the initialization** - Planet generates with initial life
2. **Observe behaviors** - See creatures move and interact
3. **Check statistics** - Monitor population dynamics
4. **Spawn more life** - Add organisms to see evolution
5. **Speed up time** - Use 5x or 10x to see generations pass
6. **Experiment** - Try meteor strikes or evolution boosts

## 🔬 Scientific Concepts Demonstrated

### Artificial Life
- **Autonomous agents** with emergent behavior
- **Self-organizing systems**
- **Adaptation** to environmental pressures

### Evolutionary Computation
- **Genetic algorithms** for optimization
- **Neuroevolution** (NEAT)
- **Natural selection** in action

### Ecology
- **Trophic levels** (producers, consumers)
- **Food webs** and energy transfer
- **Population dynamics** (boom-bust cycles)
- **Carrying capacity**
- **Predator-prey oscillations**

### Complex Systems
- **Emergence** - complex patterns from simple rules
- **Self-organization** - order without central control
- **Feedback loops** - population regulation

## 🛠️ Technical Stack

### 3D Graphics
- **Three.js r158** - WebGL rendering
- Custom atmosphere shader
- Real-time shadows
- Procedural terrain generation

### Artificial Intelligence
- **TensorFlow.js 4.15** - Neural network runtime
- **Neataptic 1.4.8** - Neuroevolution (NEAT algorithm)
- Custom genetic algorithm implementation

### Architecture
- Pure vanilla JavaScript (no framework overhead)
- Modular organism system
- Efficient instanced rendering
- Event-driven UI updates

## 📈 Performance

- **60 FPS** with ~100 organisms
- **30 FPS** with ~200 organisms
- **Auto-degradation** at higher populations
- Optimized for modern browsers

## 🎓 Educational Use

Perfect for teaching:
- **AI & Machine Learning** - Neural networks in action
- **Evolutionary Biology** - Natural selection visualization
- **Complex Systems** - Emergence and self-organization
- **Game AI** - Autonomous agent behaviors
- **Ecosystem Dynamics** - Food webs and population cycles

## 🔮 Planned Features

### Short Term
- [ ] Creature selection and tracking
- [ ] Neural network visualization for selected creature
- [ ] Heat map of population density
- [ ] Resource (food) indicators
- [ ] Improved genetic diversity metrics

### Medium Term
- [ ] Sexual reproduction (genetic mixing)
- [ ] Specialized plant types (trees, grass, flowers)
- [ ] More complex neural networks (LSTM for memory)
- [ ] Seasonal cycles affecting plant growth
- [ ] Terrain-based biomes (jungle, desert, tundra)

### Long Term
- [ ] Reinforcement learning integration
- [ ] Multi-planet system (migration)
- [ ] Cooperation and social behaviors
- [ ] Language evolution (communication between creatures)
- [ ] Civilization emergence (tool use, structures)

## 🧬 Extending the Simulation

### Adding New Creature Types

```javascript
class Omnivore extends Organism {
    constructor(position, brain) {
        super('omnivore', position, brain);
        this.canEatPlants = true;
        this.canEatMeat = true;
    }
}
```

### Custom Fitness Functions

```javascript
organism.fitness =
    organism.age * 0.1 +           // Survival
    organism.offspring * 10 +       // Reproduction
    organism.kills * 5 +            // Hunting success
    organism.exploredArea * 0.05;   // Exploration
```

### New Neural Network Inputs

```javascript
sense() {
    return [
        // ... existing sensors
        this.temperatureSensor(),
        this.gravitySensor(),
        this.groupDensitySensor(),
        this.seasonalTimeSensor()
    ];
}
```

## 🐛 Known Issues

- **Performance**: Slows with >300 organisms (optimization needed)
- **Population explosions**: Herbivores can overpopulate if unchecked
- **Extinction**: Small populations can go extinct randomly
- **UI**: Neural viz panel not yet fully functional

## 📚 References

### Artificial Life
- "Artificial Life" by Christopher Langton
- "The Computational Beauty of Nature" by Gary William Flake
- "Vehicles: Experiments in Synthetic Psychology" by Valentino Braitenberg

### Neuroevolution
- "Evolving Neural Networks through Augmenting Topologies" (NEAT paper)
- "Neuroevolution: from architectures to learning" by Dario Floreano et al.

### Complex Systems
- "Complexity: A Guided Tour" by Melanie Mitchell
- "The Emergence of Everything" by Harold Morowitz

## 🤝 Contributing

Ideas for improvement:
1. More sophisticated neural network architectures
2. Better visualization of evolutionary lineages
3. Save/load ecosystem states
4. Export genetic data for analysis
5. Multi-player (multiple planets with migration)

## 📄 License

MIT License - Feel free to experiment and extend!

## 🙏 Credits

Built with:
- [Three.js](https://threejs.org/) - 3D rendering
- [TensorFlow.js](https://www.tensorflow.org/js) - Neural networks
- [Neataptic](https://wagenaartje.github.io/neataptic/) - Neuroevolution

Inspired by:
- Karl Sims' Evolved Virtual Creatures
- Conway's Game of Life
- Tierra artificial life simulation
- Polyworld evolution simulator

---

**"Life finds a way." - Dr. Ian Malcolm**

🌍 Watch artificial life evolve before your eyes! 🧬
