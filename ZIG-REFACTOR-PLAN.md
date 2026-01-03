# Planet Eden - Zig + WASM Refactor Plan

## Why Zig + WASM?

### Performance Gains
- **10-100x faster** simulation loop (native code vs interpreted JS)
- **SIMD instructions** for neural network matrix operations
- **Multi-threading** via Web Workers (simulate 1000+ organisms)
- **Predictable memory** - manual allocation, no GC pauses
- **Smaller bundle size** - WASM compresses better than JS

### Current Bottlenecks
1. Neural network `think()` - 100+ organisms × 17 outputs = thousands of calculations/frame
2. Spatial grid updates - O(n) but still slow in JS
3. Message system - array iteration and distance checks
4. Building updates - bonus calculations for nearby organisms

### Expected Results
- **Current**: 100 organisms @ 60 FPS
- **Zig+WASM**: 1000+ organisms @ 60 FPS
- **With threads**: 5000+ organisms @ 60 FPS

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Browser (JavaScript)                │
│                                                      │
│  ┌────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ Three.js   │  │  Chart.js    │  │  UI/Input  │  │
│  │ Rendering  │  │  Graphs      │  │  Handling  │  │
│  └─────┬──────┘  └──────────────┘  └──────┬─────┘  │
│        │                                   │        │
│        │ Read positions/types       Send actions    │
│        ▼                                   ▼        │
│  ┌────────────────────────────────────────────────┐ │
│  │           WASM Glue Code (JS)                  │ │
│  │  - Load WASM module                            │ │
│  │  - Create typed arrays from WASM memory        │ │
│  │  - Call WASM exports                           │ │
│  └────────────────────────────────────────────────┘ │
└───────────────────────┬──────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │  WebAssembly Module (Zig)     │
        │                               │
        │  ┌─────────────────────────┐  │
        │  │  Simulation Core        │  │
        │  │  - Update loop          │  │
        │  │  - Delta time physics   │  │
        │  │  - 60 FPS target        │  │
        │  └────────┬────────────────┘  │
        │           │                   │
        │  ┌────────▼────────┐          │
        │  │  Neural Network │          │
        │  │  - SIMD ops     │          │
        │  │  - Tanh/sigmoid │          │
        │  │  - Mutation     │          │
        │  └────────┬────────┘          │
        │           │                   │
        │  ┌────────▼────────┐          │
        │  │  Organisms      │          │
        │  │  - Packed array │          │
        │  │  - SoA layout   │          │
        │  │  - Think/move   │          │
        │  └────────┬────────┘          │
        │           │                   │
        │  ┌────────▼────────┐          │
        │  │  Spatial Grid   │          │
        │  │  - O(1) lookup  │          │
        │  │  - Collision    │          │
        │  └────────┬────────┘          │
        │           │                   │
        │  ┌────────▼────────┐          │
        │  │  Tribes         │          │
        │  │  - Resources    │          │
        │  │  - Buildings    │          │
        │  │  - Messages     │          │
        │  └─────────────────┘          │
        └───────────────────────────────┘
```

---

## Module Structure

### Zig Modules (src/)

```
src/
├── main.zig                 # WASM exports and initialization
├── simulation.zig           # Main update loop
├── neural_network.zig       # Neural network with SIMD
├── organism.zig             # Organism struct and behavior
├── tribe.zig                # Tribe management
├── building.zig             # Building system
├── equipment.zig            # Weapons/armor
├── spatial_grid.zig         # Spatial partitioning
├── message.zig              # Language/communication
├── math.zig                 # Vec3, distance, normalize
└── allocator.zig            # Memory management
```

### JavaScript Glue Code (js/)

```
js/
├── wasm-loader.js           # Load and initialize WASM
├── renderer.js              # Three.js rendering from WASM memory
├── ui.js                    # UI updates (tribe panel, stats)
├── input.js                 # Mouse/keyboard to WASM
└── main.js                  # Application entry point
```

---

## Data Layout (Structure of Arrays - SoA)

For SIMD and cache efficiency, use Structure of Arrays instead of Array of Structures:

```zig
// BAD (AoS - cache unfriendly)
const Organism = struct {
    position: Vec3,
    velocity: Vec3,
    energy: f32,
    health: f32,
    type: u8,
};
const organisms = []Organism;

// GOOD (SoA - SIMD friendly)
const Organisms = struct {
    positions_x: []f32,
    positions_y: []f32,
    positions_z: []f32,
    velocities_x: []f32,
    velocities_y: []f32,
    velocities_z: []f32,
    energies: []f32,
    healths: []f32,
    types: []u8,
    count: usize,
};
```

This allows SIMD operations on entire arrays at once!

---

## Memory Layout

WASM memory is a single linear buffer. We'll organize it like this:

```
WASM Linear Memory (grows as needed)
┌──────────────────────────────────────────────┐
│  Organisms (SoA)                             │ 0x0000 - 0x10000
│  - positions_x[1000]                         │
│  - positions_y[1000]                         │
│  - energies[1000]                            │
│  - etc.                                      │
├──────────────────────────────────────────────┤
│  Neural Network Weights                      │ 0x10000 - 0x20000
│  - Packed arrays of f32                      │
├──────────────────────────────────────────────┤
│  Tribes                                      │ 0x20000 - 0x30000
│  - Resources, member IDs                     │
├──────────────────────────────────────────────┤
│  Buildings                                   │ 0x30000 - 0x40000
├──────────────────────────────────────────────┤
│  Messages                                    │ 0x40000 - 0x50000
├──────────────────────────────────────────────┤
│  Spatial Grid                                │ 0x50000 - 0x60000
│  - Hash map of cell → organism IDs           │
└──────────────────────────────────────────────┘
```

JavaScript creates TypedArrays that view this memory directly!

---

## WASM Exports (API)

```zig
// Initialization
export fn init(max_organisms: u32, max_tribes: u32) void;

// Simulation
export fn update(delta_time: f32) void;
export fn spawnOrganism(organism_type: u8, x: f32, y: f32, z: f32) u32;
export fn removeOrganism(id: u32) void;

// Getters (JS reads from memory directly via TypedArrays)
export fn getOrganismCount() u32;
export fn getOrganismsPositionsPtr() [*]f32;  // Returns memory offset
export fn getOrganismsTypesPtr() [*]u8;
export fn getOrganismsEnergiesPtr() [*]f32;

// Tribes
export fn getTribeCount() u32;
export fn getTribesPtr() [*]Tribe;

// Buildings
export fn getBuildingCount() u32;
export fn getBuildingsPtr() [*]Building;

// Messages
export fn getMessageCount() u32;
export fn getMessagesPtr() [*]Message;

// God powers
export fn applyGodPower(power_type: u8, x: f32, y: f32, z: f32) void;
```

---

## Performance Optimizations

### 1. SIMD Neural Networks
```zig
const std = @import("std");
const builtin = @import("builtin");

// Use SIMD vectors for neural network operations
fn matmulSIMD(inputs: []const f32, weights: []const f32, outputs: []f32) void {
    if (builtin.cpu.arch == .wasm32) {
        // WebAssembly SIMD (4x f32 at once)
        const vec_len = inputs.len / 4;
        var i: usize = 0;
        while (i < vec_len) : (i += 1) {
            const in_vec = @as(@Vector(4, f32), inputs[i*4..][0..4].*);
            const w_vec = @as(@Vector(4, f32), weights[i*4..][0..4].*);
            const result = in_vec * w_vec;
            outputs[i*4..][0..4].* = result;
        }
    } else {
        // Fallback for non-SIMD
        for (inputs, weights, outputs) |in, w, *out| {
            out.* = in * w;
        }
    }
}
```

### 2. Multi-Threading (Future)
```zig
// Split organisms across multiple Web Workers
// Each worker simulates a subset of organisms
export fn updateRange(start_idx: u32, end_idx: u32, delta: f32) void {
    // Update only organisms[start_idx..end_idx]
}
```

### 3. Spatial Grid Optimization
```zig
// Use hash map with custom hash for 3D grid coordinates
fn gridHash(x: i32, y: i32, z: i32) u64 {
    return (@as(u64, @bitCast(u32, x)) << 32)
         | (@as(u64, @bitCast(u32, y)) << 16)
         | @as(u64, @bitCast(u32, z));
}
```

---

## Build Process

### build.zig
```zig
const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.resolveTargetQuery(.{
        .cpu_arch = .wasm32,
        .os_tag = .freestanding,
    });

    const optimize = .ReleaseSmall; // Optimize for size

    const wasm = b.addExecutable(.{
        .name = "planet-eden",
        .root_source_file = .{ .path = "src/main.zig" },
        .target = target,
        .optimize = optimize,
    });

    wasm.entry = .disabled; // No _start function
    wasm.rdynamic = true; // Export all symbols

    b.installArtifact(wasm);
}
```

### Compile Command
```bash
zig build -Dtarget=wasm32-freestanding -Doptimize=ReleaseSmall
```

Outputs: `zig-out/bin/planet-eden.wasm`

---

## Migration Strategy

### Phase 1: Core Simulation (Week 1)
1. Setup Zig project structure
2. Implement Vec3 math utilities
3. Implement neural network (no SIMD yet)
4. Implement organism update logic
5. Test in Node.js (not browser yet)

### Phase 2: WASM Integration (Week 1)
1. Create WASM exports
2. JavaScript loader
3. TypedArray views of WASM memory
4. Basic rendering (just spheres)

### Phase 3: Full Feature Parity (Week 2)
1. Tribes
2. Buildings
3. Messages
4. Equipment
5. God powers

### Phase 4: Optimization (Week 2)
1. SIMD neural networks
2. Profile and optimize hot paths
3. Multi-threading experiments
4. Compress WASM with Brotli

### Phase 5: Enhanced Features (Week 3+)
1. 1000+ organism simulations
2. Advanced AI behaviors
3. Procedural planet expansion
4. Save/load full worlds

---

## Performance Targets

| Metric | JS (Current) | Zig+WASM (Target) | With Threading |
|--------|-------------|-------------------|----------------|
| **Max Organisms @ 60 FPS** | 100 | 1000 | 5000 |
| **Neural Network FPS** | 60 | 240+ | 960+ |
| **Memory Usage** | ~50 MB | ~10 MB | ~50 MB |
| **Bundle Size** | 287 KB | ~100 KB | ~100 KB |
| **Load Time** | 500ms | 200ms | 200ms |

---

## Testing Strategy

1. **Unit Tests** (Zig native):
   ```bash
   zig test src/neural_network.zig
   zig test src/spatial_grid.zig
   ```

2. **Integration Tests** (Node.js):
   ```javascript
   const wasm = await WebAssembly.instantiate(fs.readFileSync('planet-eden.wasm'));
   assert(wasm.instance.exports.getOrganismCount() === 0);
   ```

3. **Browser Tests**:
   - Visual regression (screenshot comparison)
   - Performance benchmarks (1000 organisms @ 60 FPS)

---

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Zig learning curve | Start simple, incrementally add complexity |
| WASM debugging hard | Extensive logging, test in Node first |
| Three.js integration | Keep rendering in JS, only simulation in WASM |
| Browser compatibility | Check WebAssembly SIMD support, fallback |
| Migration time | Do it in phases, keep JS version working |

---

## Success Criteria

✅ Simulation runs at 60 FPS with 1000+ organisms
✅ Neural networks use SIMD when available
✅ Memory usage < 20 MB
✅ WASM bundle < 150 KB (compressed)
✅ Feature parity with current JS version
✅ Extensible architecture for future features

---

**Let's build this!** 🚀
