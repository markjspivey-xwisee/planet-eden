// Main WASM module with exports for JavaScript
// This is the entry point for the WebAssembly module
// Version: 3 - Full NN outputs (building, messaging, reproduce, flee, gather, share, recruit)

const std = @import("std");

// Version export to verify WASM is updated
// Version: 6 - SIMD enabled, mobile hide button
export fn getVersion() u32 {
    return 6;
}

const tribe = @import("tribe.zig");

/// Get maximum number of tribes allowed
export fn getMaxTribes() u32 {
    return @intCast(tribe.MAX_TRIBES);
}
const math = @import("math.zig");
const simulation = @import("simulation.zig");
const organism = @import("organism.zig");

// Global simulation instance - stored directly, not as pointer
var global_sim: simulation.Simulation = undefined;
var sim_initialized: bool = false;

// Static memory buffer for allocations (512KB, uninitialized to avoid large data section)
var memory_buffer: [512 * 1024]u8 = undefined;
var fba: std.heap.FixedBufferAllocator = undefined;

fn getAllocator() std.mem.Allocator {
    return fba.allocator();
}

/// Initialize the simulation
export fn init(max_organisms: u32, seed: u32) bool {
    // Initialize allocator
    fba = std.heap.FixedBufferAllocator.init(&memory_buffer);
    const allocator = fba.allocator();

    // Initialize full simulation
    global_sim = simulation.Simulation.init(allocator, seed, max_organisms) catch return false;
    sim_initialized = true;

    return true;
}

/// Update simulation by delta time
export fn update(delta: f32) void {
    if (sim_initialized) {
        global_sim.update(delta);
    }
}

/// Spawn a new organism
export fn spawnOrganism(org_type: u8, x: f32, y: f32, z: f32, tribe_id: u32) u32 {
    if (sim_initialized) {
        const pos = math.Vec3.init(x, y, z);
        const org_enum = @as(organism.OrganismType, @enumFromInt(org_type));
        const idx = global_sim.spawnOrganism(org_enum, pos, tribe_id) catch return 0xFFFFFFFF;
        return idx;
    }
    return 0xFFFFFFFF;
}

/// Create a new tribe
export fn createTribe() u32 {
    if (sim_initialized) {
        return global_sim.createTribe() orelse 0xFFFFFFFF;
    }
    return 0xFFFFFFFF;
}

/// Get number of organisms
export fn getOrganismCount() u32 {
    if (sim_initialized) {
        return @intCast(global_sim.organisms.count);
    }
    return 0;
}

/// Get number of alive organisms
export fn getAliveCount() u32 {
    if (sim_initialized) {
        return @intCast(global_sim.organisms.getAliveCount());
    }
    return 0;
}

/// Get number of tribes
export fn getTribeCount() u32 {
    if (sim_initialized) {
        return @intCast(global_sim.tribes.getActiveCount());
    }
    return 0;
}

/// Get number of buildings
export fn getBuildingCount() u32 {
    if (sim_initialized) {
        return @intCast(global_sim.buildings.count);
    }
    return 0;
}

/// Get current simulation time
export fn getTime() f32 {
    if (sim_initialized) {
        return global_sim.time;
    }
    return 0;
}

/// Get frame count
export fn getFrameCount() u64 {
    if (sim_initialized) {
        return global_sim.frame_count;
    }
    return 0;
}

// Memory access functions for JavaScript to read organism data

/// Get pointer to positions X array
export fn getPositionsX() [*]f32 {
    if (sim_initialized) {
        return global_sim.organisms.positions_x.ptr;
    }
    return undefined;
}

/// Get pointer to positions Y array
export fn getPositionsY() [*]f32 {
    if (sim_initialized) {
        return global_sim.organisms.positions_y.ptr;
    }
    return undefined;
}

/// Get pointer to positions Z array
export fn getPositionsZ() [*]f32 {
    if (sim_initialized) {
        return global_sim.organisms.positions_z.ptr;
    }
    return undefined;
}

/// Get pointer to types array
export fn getTypes() [*]u8 {
    if (sim_initialized) {
        return global_sim.organisms.types.ptr;
    }
    return undefined;
}

/// Get pointer to energies array
export fn getEnergies() [*]f32 {
    if (sim_initialized) {
        return global_sim.organisms.energies.ptr;
    }
    return undefined;
}

/// Get pointer to healths array
export fn getHealths() [*]f32 {
    if (sim_initialized) {
        return global_sim.organisms.healths.ptr;
    }
    return undefined;
}

/// Get pointer to sizes array
export fn getSizes() [*]f32 {
    if (sim_initialized) {
        return global_sim.organisms.sizes.ptr;
    }
    return undefined;
}

/// Get pointer to tribe IDs array
export fn getTribeIds() [*]u32 {
    if (sim_initialized) {
        return global_sim.organisms.tribe_ids.ptr;
    }
    return undefined;
}

/// Get pointer to alive flags array
export fn getAliveFlags() [*]bool {
    if (sim_initialized) {
        return global_sim.organisms.alive.ptr;
    }
    return undefined;
}

/// Get pointer to attacking flags array
export fn getAttackingFlags() [*]bool {
    if (sim_initialized) {
        return global_sim.organisms.is_attacking.ptr;
    }
    return undefined;
}

/// Get pointer to eating flags array
export fn getEatingFlags() [*]bool {
    if (sim_initialized) {
        return global_sim.organisms.is_eating.ptr;
    }
    return undefined;
}

/// Get pointer to velocities X array
export fn getVelocitiesX() [*]f32 {
    if (sim_initialized) {
        return global_sim.organisms.velocities_x.ptr;
    }
    return undefined;
}

/// Get pointer to velocities Y array
export fn getVelocitiesY() [*]f32 {
    if (sim_initialized) {
        return global_sim.organisms.velocities_y.ptr;
    }
    return undefined;
}

/// Get pointer to velocities Z array
export fn getVelocitiesZ() [*]f32 {
    if (sim_initialized) {
        return global_sim.organisms.velocities_z.ptr;
    }
    return undefined;
}

/// Set organism position (used by JS for water avoidance corrections)
export fn setOrganismPosition(idx: u32, x: f32, y: f32, z: f32) void {
    if (sim_initialized and idx < global_sim.organisms.count) {
        global_sim.organisms.positions_x[idx] = x;
        global_sim.organisms.positions_y[idx] = y;
        global_sim.organisms.positions_z[idx] = z;
    }
}

/// Set organism velocity (used by JS for water avoidance push)
export fn setOrganismVelocity(idx: u32, vx: f32, vy: f32, vz: f32) void {
    if (sim_initialized and idx < global_sim.organisms.count) {
        global_sim.organisms.velocities_x[idx] = vx;
        global_sim.organisms.velocities_y[idx] = vy;
        global_sim.organisms.velocities_z[idx] = vz;
    }
}

// Tribe data access

/// Get tribe food
export fn getTribeFood(tribe_id: u32) f32 {
    if (sim_initialized) {
        if (global_sim.tribes.getTribe(tribe_id)) |t| {
            return t.food;
        }
    }
    return 0;
}

/// Get tribe wood
export fn getTribeWood(tribe_id: u32) f32 {
    if (sim_initialized) {
        if (global_sim.tribes.getTribe(tribe_id)) |t| {
            return t.wood;
        }
    }
    return 0;
}

/// Get tribe stone
export fn getTribeStone(tribe_id: u32) f32 {
    if (sim_initialized) {
        if (global_sim.tribes.getTribe(tribe_id)) |t| {
            return t.stone;
        }
    }
    return 0;
}

/// Get tribe metal
export fn getTribeMetal(tribe_id: u32) f32 {
    if (sim_initialized) {
        if (global_sim.tribes.getTribe(tribe_id)) |t| {
            return t.metal;
        }
    }
    return 0;
}

/// Get tribe member count
export fn getTribeMemberCount(tribe_id: u32) u32 {
    if (sim_initialized) {
        if (global_sim.tribes.getTribe(tribe_id)) |t| {
            return @intCast(t.member_count);
        }
    }
    return 0;
}

/// Get tribe color R
export fn getTribeColorR(tribe_id: u32) u8 {
    if (sim_initialized) {
        if (global_sim.tribes.getTribeConst(tribe_id)) |t| {
            return t.color_r;
        }
    }
    return 128;
}

/// Get tribe color G
export fn getTribeColorG(tribe_id: u32) u8 {
    if (sim_initialized) {
        if (global_sim.tribes.getTribeConst(tribe_id)) |t| {
            return t.color_g;
        }
    }
    return 128;
}

/// Get tribe color B
export fn getTribeColorB(tribe_id: u32) u8 {
    if (sim_initialized) {
        if (global_sim.tribes.getTribeConst(tribe_id)) |t| {
            return t.color_b;
        }
    }
    return 128;
}

// Building access

/// Get building position X
export fn getBuildingPosX(building_id: u32) f32 {
    if (sim_initialized) {
        if (global_sim.buildings.get(building_id)) |b| {
            return b.pos_x;
        }
    }
    return 0;
}

/// Get building position Y
export fn getBuildingPosY(building_id: u32) f32 {
    if (sim_initialized) {
        if (global_sim.buildings.get(building_id)) |b| {
            return b.pos_y;
        }
    }
    return 0;
}

/// Get building position Z
export fn getBuildingPosZ(building_id: u32) f32 {
    if (sim_initialized) {
        if (global_sim.buildings.get(building_id)) |b| {
            return b.pos_z;
        }
    }
    return 0;
}

/// Get building type
export fn getBuildingType(building_id: u32) u8 {
    if (sim_initialized) {
        if (global_sim.buildings.get(building_id)) |b| {
            return @intFromEnum(b.building_type);
        }
    }
    return 0;
}

/// Get building health
export fn getBuildingHealth(building_id: u32) f32 {
    if (sim_initialized) {
        if (global_sim.buildings.get(building_id)) |b| {
            return b.health;
        }
    }
    return 0;
}

/// Clean up simulation
export fn cleanup() void {
    if (sim_initialized) {
        global_sim.deinit();
        sim_initialized = false;
    }
}

// Tests disabled for WASM build
// test {
//     @import("std").testing.refAllDecls(@This());
// }
