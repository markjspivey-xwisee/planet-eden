# 🌍 Planet Eden - God Mode AI Life Simulation

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_Now-00d4ff?style=for-the-badge)](https://markjspivey-xwisee.github.io/planet-eden/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/markjspivey-xwisee/planet-eden?style=for-the-badge)](https://github.com/markjspivey-xwisee/planet-eden/stargazers)

> **An interactive 3D ecosystem simulation where you play as a god with divine powers over an evolving planet.**

Control life, terraform landscapes, and watch AI organisms evolve in real-time with stunning particle effects and a polished game-like interface.

---

## ✨ Features

### 🎮 God Powers (22 Total)
Shape the world with your divine abilities across 4 categories:

#### ✨ **Divine Intervention**
- **Bless** - Restore energy and health with golden glow
- **Curse** - Drain life force with dark aura
- **Smite** - Strike down with lightning from the heavens
- **Resurrect** - Bring the dead back to life
- **Evolve** - Accelerate evolution with DNA spiral effects
- **Clone** - Duplicate any organism
- **Boost IQ** - Double neural network intelligence

#### 🌪️ **Environmental Powers**
- **Meteor Strike** - Devastate areas with explosive impact
- **Lightning** - Precision strikes from above
- **Plague** - Spread disease clouds
- **Healing Rain** - Restore health in large areas
- **Abundance** - Spawn vegetation instantly
- **Drought** - Remove plant life

#### 🏔️ **Terraforming**
- **Raise Terrain** - Create mountains and highlands
- **Lower Terrain** - Carve valleys and lowlands
- **Smooth Terrain** - Blend rough edges
- **Flatten** - Level the ground
- Adjustable brush size and strength

#### 📦 **Resource Management**
- **Mass Spawn** - Create 50+ organisms at once
- **Clear Area** - Remove all life in radius
- **Balance Ecosystem** - Auto-adjust populations
- **Food Surplus** - Boost plant growth globally
- **Famine** - Reduce resources

---

### 🧬 AI Ecosystem Features

- **Neural Network Brains** - Organisms learn and adapt using simple neural networks
- **Evolution System** - Creatures mutate and improve over generations
- **Food Chain Dynamics** - Plants → Herbivores → Carnivores → Humanoids
- **Spatial AI** - Organisms perceive nearby food, predators, and mates
- **Reproduction** - Population growth with genetic inheritance
- **Aging & Death** - Natural lifecycle simulation
- **4 Organism Types**:
  - 🌳 **Plants** - Stationary food source with growth
  - 🦌 **Herbivores** - Eat plants, flee predators
  - 🦁 **Carnivores** - Hunt herbivores
  - 👤 **Humanoids** - Omnivores with advanced AI

---

### 🎨 Visual Polish

- **Particle Effects System** - Explosions, lightning, healing auras, plague clouds
- **Smooth Animations** - Panel slide-ins, button ripples, power glows
- **Custom Cursors** - Visual feedback for active powers
- **Enhanced Tooltips** - Helpful descriptions on hover
- **Dramatic Notifications** - Bouncy alerts with gradient backgrounds
- **FPS Counter** - Monitor performance in real-time

---

### 🎯 User Experience

- **Welcome Screen** - Tutorial with controls guide
- **Keyboard Shortcuts**:
  - `Space` - Pause/Resume
  - `H` - Toggle Help
  - `S` - Settings
  - `Q/E` - Speed Control
  - `Ctrl+S` - Save World
  - `Ctrl+L` - Load World
  - `ESC` - Cancel Power
- **Settings Panel** - Quality presets, audio toggle, FPS display
- **Save/Load** - Preserve your world state
- **Sound Effects** - Procedural audio for every action
- **Population Graphs** - Real-time ecosystem tracking

---

## 🚀 Quick Start

### Play Online (Instant)
**[👉 Click here to play now!](https://markjspivey-xwisee.github.io/planet-eden/)**

No installation required - runs directly in your browser!

### Run Locally
```bash
# Download the file
git clone https://github.com/markjspivey-xwisee/planet-eden.git
cd planet-eden

# Open in browser
# Just double-click index.html or:
start index.html  # Windows
open index.html   # Mac
xdg-open index.html  # Linux
```

**Requirements:** Any modern browser (Chrome, Firefox, Edge, Safari)

---

## 🎮 How to Play

1. **Start Simulation** - Click "Start Simulation" on the welcome screen
2. **Select a Power** - Click any god power button on the left panel
3. **Use the Power** - Click on the planet or organisms to activate
4. **Watch & Evolve** - Observe the ecosystem dynamics
5. **Experiment** - Try different combinations and see what happens!

### Pro Tips 💡
- Start with **Balance Ecosystem** to get stable populations
- Use **Meteor** for dramatic resets
- Try **Evolve** on herbivores to create super-intelligent grazers
- **Terraform** to create islands and diverse biomes
- **Save** interesting worlds with `Ctrl+S`

---

## 🛠️ Technical Details

### Built With
- **Three.js r158** - 3D rendering and WebGL graphics
- **Chart.js 4.4.0** - Population graphs
- **Web Audio API** - Procedural sound generation
- **Vanilla JavaScript** - No framework dependencies
- **Single HTML File** - Entirely self-contained (3,290 lines)

### Performance Optimizations
- Spatial grid for O(1) collision detection
- Particle effect pooling and limits
- Terrain height caching
- Optimized geometry (320x320 planet resolution)
- Disabled shadows for 60 FPS performance
- Configurable quality presets

### Code Architecture
- **Organism Class** - Base entity with AI, physics, lifecycle
- **NeuralNetwork Class** - Simple feedforward network for decision-making
- **ParticleEffect Class** - Reusable visual effects system
- **SpatialGrid** - Efficient neighbor queries
- **POWERS Object** - Declarative power system
- **God Mode State** - Centralized game state management

---

## 📊 System Requirements

**Minimum:**
- Modern browser with WebGL support
- 4GB RAM
- Integrated graphics

**Recommended:**
- Chrome/Firefox/Edge (latest)
- 8GB RAM
- Dedicated GPU for 60 FPS

**Works on:** Windows, Mac, Linux, and modern tablets

---

## 🤝 Contributing

Contributions are welcome! Here are some ideas:

### Feature Ideas
- [ ] Day/night cycle with atmospheric shading
- [ ] Weather system (rain, snow, storms)
- [ ] More biomes (desert, tundra, jungle)
- [ ] Evolution tree visualization
- [ ] Multiplayer god battles
- [ ] Mobile touch controls optimization
- [ ] Achievement system
- [ ] Time-lapse recording

### How to Contribute
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes to `index.html`
4. Test thoroughly in multiple browsers
5. Commit (`git commit -m 'Add amazing feature'`)
6. Push (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

**TL;DR:** You can use this for anything, including commercial projects. Just keep the license notice.

---

## 🌟 Show Your Support

If you enjoyed playing with Planet Eden or found the code useful:

- ⭐ **Star this repo** to help others discover it
- 🐛 **Report bugs** via [Issues](https://github.com/markjspivey-xwisee/planet-eden/issues)
- 💡 **Suggest features** you'd like to see
- 🔀 **Fork and remix** - make your own version!
- 📢 **Share** with friends who like simulation games

---

## 🎓 Educational Use

Perfect for learning:
- **Three.js** - 3D graphics and WebGL
- **AI/Neural Networks** - Simple implementation
- **Game Development** - God game mechanics
- **Procedural Generation** - Terrain and biomes
- **Particle Systems** - Visual effects
- **Ecosystem Simulation** - Population dynamics

Teachers: Feel free to use this in classrooms! It's a great demonstration of:
- Artificial Life
- Evolutionary Algorithms
- Agent-Based Modeling
- Real-time Graphics Programming

---

## 🔗 Links

- **Live Demo:** [markjspivey-xwisee.github.io/planet-eden](https://markjspivey-xwisee.github.io/planet-eden/)
- **Report Issues:** [GitHub Issues](https://github.com/markjspivey-xwisee/planet-eden/issues)
- **Discussions:** [GitHub Discussions](https://github.com/markjspivey-xwisee/planet-eden/discussions)

---

## 🙏 Acknowledgments

- **Three.js** - Amazing 3D library
- **Chart.js** - Beautiful charts
- Inspired by classic god games like *Black & White*, *From Dust*, and *Spore*

---

<div align="center">

### Made with ❤️ and Claude AI

**[⭐ Star this repo](https://github.com/markjspivey-xwisee/planet-eden) • [🎮 Play Now](https://markjspivey-xwisee.github.io/planet-eden/) • [🐛 Report Bug](https://github.com/markjspivey-xwisee/planet-eden/issues)**

</div>
