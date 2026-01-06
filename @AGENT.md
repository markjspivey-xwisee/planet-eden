# Planet Eden - Agent Instructions

## Quick Reference

### Build & Run
```bash
# Build WASM
./zig/zig-windows-x86_64-0.13.0/zig.exe build --release=small

# Run server
node server.js

# Open browser to http://localhost:3000
```

### Project Structure
```
planet-eden/
├── src/                    # Zig WASM source
│   ├── main.zig           # WASM exports
│   ├── simulation.zig     # Core sim logic
│   ├── organism.zig       # Organism SoA data
│   └── ...
├── js/                    # JavaScript
│   ├── wasm-main.js       # Entry point
│   ├── renderer.js        # Three.js rendering
│   ├── wasm-loader.js     # WASM interface
│   └── engine/            # Feature systems
│       ├── events.js      # Toast notifications
│       ├── audio.js       # Ambient audio
│       ├── particles.js   # Particle effects
│       ├── goals.js       # Milestones
│       ├── screenshot.js  # Screenshot capture
│       └── sparkline.js   # Population graph
├── index-wasm.html        # Main HTML
├── PROMPT.md              # Ralph loop prompt
├── @fix_plan.md           # Task list
└── .claude/               # Claude config
    ├── settings.json      # Hooks config
    └── ralph-hook.js      # Loop controller
```

### Key Keyboard Shortcuts
| Key | Action |
|-----|--------|
| SPACE | Pause/Resume |
| T | Toggle tribes panel |
| H | Toggle help panels |
| L | Toggle event log |
| G | Toggle population graph |
| O | Toggle objectives |
| C | Follow selected creature |
| M | Toggle audio |
| P | Take screenshot |

### Coding Guidelines

1. **Zig (WASM)**
   - Use SoA (Structure of Arrays) for performance
   - Avoid allocations in hot paths
   - Bump WASM version in main.zig after changes

2. **JavaScript**
   - Three.js for all 3D rendering
   - Use requestAnimationFrame for game loop
   - Minimize DOM operations

3. **Performance Targets**
   - 60 FPS on desktop
   - 30 FPS on mobile
   - < 100ms frame time spikes

### Common Issues

**WASM not updating**: Clear browser cache or increment version in main.zig

**Low FPS**: Check for excessive water avoidance checks, reduce organism count

**Visual jerking**: Compaction is disabled; if re-enabled, fix renderer ID tracking

### Version History

- v10: Disabled compaction (fixes jerking)
- v9: Increased capacity to 500, genetic variation
- v8: Reduced energy drain, more plants
