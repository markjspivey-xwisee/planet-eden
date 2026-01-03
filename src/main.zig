// Main WASM module with exports for JavaScript
// This is the entry point for the WebAssembly module

const std = @import("std");
const math = @import("math.zig");
const simulation = @import("simulation.zig");
const organism = @import("organism.zig");

// Global simulation instance
var global_sim: ?*simulation.Simulation = null;

// WASM uses std.heap.page_allocator
const global_allocator = std.heap.page_allocator;

/// Initialize the simulation
export fn init(max_organisms: u32, seed: u32) bool {

    // Create simulation
    const sim = global_allocator.create(simulation.Simulation) catch return false;
    sim.* = simulation.Simulation.init(global_allocator, seed, max_organisms) catch return false;

    global_sim = sim;
    return true;
}

/// Update simulation by delta time
export fn update(delta: f32) void {
    if (global_sim) |sim| {
        sim.update(delta);
    }
}

/// Spawn a new organism
export fn spawnOrganism(org_type: u8, x: f32, y: f32, z: f32, tribe_id: u32) u32 {
    if (global_sim) |sim| {
        const pos = math.Vec3.init(x, y, z);
        const org_enum = @as(organism.OrganismType, @enumFromInt(org_type));
        const idx = sim.spawnOrganism(org_enum, pos, tribe_id) catch return 0xFFFFFFFF;
        return idx;
    }
    return 0xFFFFFFFF;
}

/// Create a new tribe
export fn createTribe() u32 {
    if (global_sim) |sim| {
        return sim.createTribe() orelse 0xFFFFFFFF;
    }
    return 0xFFFFFFFF;
}

/// Get number of organisms
export fn getOrganismCount() u32 {
    if (global_sim) |sim| {
        return @intCast(sim.organisms.count);
    }
    return 0;
}

/// Get number of alive organisms
export fn getAliveCount() u32 {
    if (global_sim) |sim| {
        return @intCast(sim.organisms.getAliveCount());
    }
    return 0;
}

/// Get number of tribes
export fn getTribeCount() u32 {
    if (global_sim) |sim| {
        return @intCast(sim.tribes.getActiveCount());
    }
    return 0;
}

/// Get number of buildings
export fn getBuildingCount() u32 {
    if (global_sim) |sim| {
        return @intCast(sim.buildings.count);
    }
    return 0;
}

/// Get current simulation time
export fn getTime() f32 {
    if (global_sim) |sim| {
        return sim.time;
    }
    return 0;
}

/// Get frame count
export fn getFrameCount() u64 {
    if (global_sim) |sim| {
        return sim.frame_count;
    }
    return 0;
}

// Memory access functions for JavaScript to read organism data

/// Get pointer to positions X array
export fn getPositionsX() [*]f32 {
    if (global_sim) |sim| {
        return sim.organisms.positions_x.ptr;
    }
    return undefined;
}

/// Get pointer to positions Y array
export fn getPositionsY() [*]f32 {
    if (global_sim) |sim| {
        return sim.organisms.positions_y.ptr;
    }
    return undefined;
}

/// Get pointer to positions Z array
export fn getPositionsZ() [*]f32 {
    if (global_sim) |sim| {
        return sim.organisms.positions_z.ptr;
    }
    return undefined;
}

/// Get pointer to types array
export fn getTypes() [*]u8 {
    if (global_sim) |sim| {
        return sim.organisms.types.ptr;
    }
    return undefined;
}

/// Get pointer to energies array
export fn getEnergies() [*]f32 {
    if (global_sim) |sim| {
        return sim.organisms.energies.ptr;
    }
    return undefined;
}

/// Get pointer to healths array
export fn getHealths() [*]f32 {
    if (global_sim) |sim| {
        return sim.organisms.healths.ptr;
    }
    return undefined;
}

/// Get pointer to sizes array
export fn getSizes() [*]f32 {
    if (global_sim) |sim| {
        return sim.organisms.sizes.ptr;
    }
    return undefined;
}

/// Get pointer to tribe IDs array
export fn getTribeIds() [*]u32 {
    if (global_sim) |sim| {
        return sim.organisms.tribe_ids.ptr;
    }
    return undefined;
}

/// Get pointer to alive flags array
export fn getAliveFlags() [*]bool {
    if (global_sim) |sim| {
        return sim.organisms.alive.ptr;
    }
    return undefined;
}

/// Get pointer to attacking flags array
export fn getAttackingFlags() [*]bool {
    if (global_sim) |sim| {
        return sim.organisms.is_attacking.ptr;
    }
    return undefined;
}

/// Get pointer to eating flags array
export fn getEatingFlags() [*]bool {
    if (global_sim) |sim| {
        return sim.organisms.is_eating.ptr;
    }
    return undefined;
}

// Tribe data access

/// Get tribe food
export fn getTribeFood(tribe_id: u32) f32 {
    if (global_sim) |sim| {
        if (sim.tribes.getTribe(tribe_id)) |t| {
            return t.food;
        }
    }
    return 0;
}

/// Get tribe wood
export fn getTribeWood(tribe_id: u32) f32 {
    if (global_sim) |sim| {
        if (sim.tribes.getTribe(tribe_id)) |t| {
            return t.wood;
        }
    }
    return 0;
}

/// Get tribe stone
export fn getTribeStone(tribe_id: u32) f32 {
    if (global_sim) |sim| {
        if (sim.tribes.getTribe(tribe_id)) |t| {
            return t.stone;
        }
    }
    return 0;
}

/// Get tribe metal
export fn getTribeMetal(tribe_id: u32) f32 {
    if (global_sim) |sim| {
        if (sim.tribes.getTribe(tribe_id)) |t| {
            return t.metal;
        }
    }
    return 0;
}

/// Get tribe member count
export fn getTribeMemberCount(tribe_id: u32) u32 {
    if (global_sim) |sim| {
        if (sim.tribes.getTribe(tribe_id)) |t| {
            return @intCast(t.member_count);
        }
    }
    return 0;
}

/// Get tribe color R
export fn getTribeColorR(tribe_id: u32) u8 {
    if (global_sim) |sim| {
        if (sim.tribes.getTribeConst(tribe_id)) |t| {
            return t.color_r;
        }
    }
    return 128;
}

/// Get tribe color G
export fn getTribeColorG(tribe_id: u32) u8 {
    if (global_sim) |sim| {
        if (sim.tribes.getTribeConst(tribe_id)) |t| {
            return t.color_g;
        }
    }
    return 128;
}

/// Get tribe color B
export fn getTribeColorB(tribe_id: u32) u8 {
    if (global_sim) |sim| {
        if (sim.tribes.getTribeConst(tribe_id)) |t| {
            return t.color_b;
        }
    }
    return 128;
}

// Building access

/// Get building position X
export fn getBuildingPosX(building_id: u32) f32 {
    if (global_sim) |sim| {
        if (sim.buildings.get(building_id)) |b| {
            return b.pos_x;
        }
    }
    return 0;
}

/// Get building position Y
export fn getBuildingPosY(building_id: u32) f32 {
    if (global_sim) |sim| {
        if (sim.buildings.get(building_id)) |b| {
            return b.pos_y;
        }
    }
    return 0;
}

/// Get building position Z
export fn getBuildingPosZ(building_id: u32) f32 {
    if (global_sim) |sim| {
        if (sim.buildings.get(building_id)) |b| {
            return b.pos_z;
        }
    }
    return 0;
}

/// Get building type
export fn getBuildingType(building_id: u32) u8 {
    if (global_sim) |sim| {
        if (sim.buildings.get(building_id)) |b| {
            return @intFromEnum(b.building_type);
        }
    }
    return 0;
}

/// Get building health
export fn getBuildingHealth(building_id: u32) f32 {
    if (global_sim) |sim| {
        if (sim.buildings.get(building_id)) |b| {
            return b.health;
        }
    }
    return 0;
}

/// Clean up simulation
export fn cleanup() void {
    if (global_sim) |sim| {
        sim.deinit();
        global_allocator.destroy(sim);
        global_sim = null;
    }
}

// Include all tests from modules
test {
    @import("std").testing.refAllDecls(@This());
    _ = @import("math.zig");
    _ = @import("neural_network.zig");
    _ = @import("organism.zig");
    _ = @import("spatial_grid.zig");
    _ = @import("tribe.zig");
    _ = @import("building.zig");
    _ = @import("equipment.zig");
    _ = @import("message.zig");
    _ = @import("simulation.zig");
}
