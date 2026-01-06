# Planet Eden - Development Loop Prompt

You are developing **Planet Eden**, a Zig+WASM tribal civilization simulator with Three.js rendering.

## Project Context

- **Tech Stack**: Zig compiled to WebAssembly (WASM), JavaScript/Three.js for 3D rendering
- **Core Systems**: Neural network AI for organisms, tribal civilizations, resource gathering, building
- **Repository**: https://github.com/markjspivey-xwisee/planet-eden

## Current State

Read `@fix_plan.md` for the current prioritized task list.

## Development Guidelines

1. **Always read the fix plan first** - Check `@fix_plan.md` for current priorities
2. **Test after changes** - Run the server and verify in browser
3. **Update the fix plan** - Mark tasks complete, add new issues discovered
4. **Commit regularly** - Push working changes to GitHub
5. **Performance matters** - Target 60 FPS, minimize allocations

## Key Files

- `src/main.zig` - WASM exports and entry point
- `src/simulation.zig` - Core simulation logic
- `src/organism.zig` - Organism data structures (SoA layout)
- `js/renderer.js` - Three.js 3D rendering
- `js/wasm-main.js` - JavaScript entry point
- `index-wasm.html` - Main HTML page

## Build Commands

```bash
# Build WASM (from project root)
./zig/zig-windows-x86_64-0.13.0/zig.exe build --release=small

# Run dev server
node server.js
```

## Completion Signal

When ALL tasks in `@fix_plan.md` are marked [x] complete, respond with:

**RALPH_COMPLETE**

This signals the loop to exit successfully.

## Current Objective

Work through the tasks in `@fix_plan.md` in priority order. Fix bugs, implement features, and ensure the simulation runs smoothly at 60 FPS with all systems working correctly.
