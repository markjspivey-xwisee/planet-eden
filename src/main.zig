// Main WASM module with exports for JavaScript
// This is the entry point for the WebAssembly module
// Version: 11 - AAA Strategic Systems (Diplomacy, Tech, Seasons, Territory, Population)

const std = @import("std");

// Version export to verify WASM is updated
// Version: 11 - AAA Strategic Systems
export fn getVersion() u32 {
    return 11;
}

const tribe = @import("tribe.zig");
const seasons = @import("seasons.zig");
const technology = @import("technology.zig");
const territory = @import("territory.zig");

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

// ============================================================================
// AAA STRATEGIC SYSTEMS - WASM EXPORTS
// ============================================================================

// === SEASONS & WEATHER ===

/// Get current season (0=spring, 1=summer, 2=autumn, 3=winter)
export fn getCurrentSeason() u8 {
    if (sim_initialized) {
        return @intFromEnum(global_sim.season_mgr.current_season);
    }
    return 0;
}

/// Get current weather (0=clear, 1=cloudy, 2=rain, 3=storm, 4=snow, 5=blizzard, 6=drought, 7=fog, 8=heat_wave)
export fn getCurrentWeather() u8 {
    if (sim_initialized) {
        return @intFromEnum(global_sim.season_mgr.current_weather);
    }
    return 0;
}

/// Get current game day
export fn getCurrentDay() u32 {
    if (sim_initialized) {
        return global_sim.season_mgr.current_day;
    }
    return 1;
}

/// Get current game year
export fn getCurrentYear() u32 {
    if (sim_initialized) {
        return global_sim.season_mgr.current_year;
    }
    return 1;
}

/// Get time of day (0.0-1.0, 0=midnight, 0.5=noon)
export fn getTimeOfDay() f32 {
    if (sim_initialized) {
        return global_sim.season_mgr.getTimeOfDay();
    }
    return 0.5;
}

/// Get light level (0.0-1.0)
export fn getLightLevel() f32 {
    if (sim_initialized) {
        return global_sim.season_mgr.getLightLevel();
    }
    return 1.0;
}

/// Get food modifier from weather/season
export fn getFoodModifier() f32 {
    if (sim_initialized) {
        return global_sim.season_mgr.food_modifier;
    }
    return 1.0;
}

/// Get movement modifier from weather
export fn getMovementModifier() f32 {
    if (sim_initialized) {
        return global_sim.season_mgr.movement_modifier;
    }
    return 1.0;
}

/// Get active event count
export fn getActiveEventCount() u32 {
    if (sim_initialized) {
        return @intCast(global_sim.season_mgr.event_count);
    }
    return 0;
}

// === DIPLOMACY ===

/// Get reputation between two tribes (-100 to 100)
export fn getReputation(tribe_a: u32, tribe_b: u32) i8 {
    if (sim_initialized) {
        return global_sim.diplomacy_mgr.getReputation(tribe_a, tribe_b);
    }
    return 0;
}

/// Check if two tribes are at war
export fn areAtWar(tribe_a: u32, tribe_b: u32) bool {
    if (sim_initialized) {
        return global_sim.diplomacy_mgr.isAtWar(tribe_a, tribe_b);
    }
    return false;
}

/// Check if two tribes have met
export fn haveMet(tribe_a: u32, tribe_b: u32) bool {
    if (sim_initialized) {
        return global_sim.diplomacy_mgr.haveMet(tribe_a, tribe_b);
    }
    return false;
}

/// Get diplomatic status (0=unknown, 1=hostile, 2=unfriendly, 3=neutral, 4=friendly, 5=allied)
export fn getDiplomaticStatus(tribe_a: u32, tribe_b: u32) u8 {
    if (sim_initialized) {
        return @intFromEnum(global_sim.diplomacy_mgr.getStatus(tribe_a, tribe_b));
    }
    return 0;
}

/// Get number of active wars
export fn getActiveWarCount() u32 {
    if (sim_initialized) {
        return @intCast(global_sim.diplomacy_mgr.getActiveWarCount());
    }
    return 0;
}

/// Get number of active treaties
export fn getActiveTreatyCount() u32 {
    if (sim_initialized) {
        return @intCast(global_sim.diplomacy_mgr.getActiveTreatyCount());
    }
    return 0;
}

/// Declare war (for god powers / JS control)
export fn declareWar(attacker: u32, defender: u32) bool {
    if (sim_initialized) {
        const result = global_sim.diplomacy_mgr.declareWar(attacker, defender, .conquest, global_sim.time);
        return result != null;
    }
    return false;
}

/// Force peace between tribes
export fn forcePeace(tribe_a: u32, tribe_b: u32) void {
    if (sim_initialized) {
        if (global_sim.diplomacy_mgr.getWar(tribe_a, tribe_b)) |war| {
            _ = war;
            // Find and end the war
            for (0..global_sim.diplomacy_mgr.war_count) |i| {
                if (global_sim.diplomacy_mgr.wars[i].active and
                    global_sim.diplomacy_mgr.wars[i].involves(tribe_a) and
                    global_sim.diplomacy_mgr.wars[i].involves(tribe_b))
                {
                    global_sim.diplomacy_mgr.endWar(i);
                    break;
                }
            }
        }
    }
}

// === TECHNOLOGY ===

/// Get tribe's technology level (number of techs researched)
export fn getTechLevel(tribe_id: u32) u32 {
    if (sim_initialized) {
        return global_sim.tech_mgr.getTechLevel(tribe_id);
    }
    return 0;
}

/// Check if tribe has specific technology
export fn hasTechnology(tribe_id: u32, tech_id: u8) bool {
    if (sim_initialized) {
        if (global_sim.tech_mgr.getResearchConst(tribe_id)) |research| {
            const tech: technology.Technology = @enumFromInt(tech_id);
            return research.hasTech(tech);
        }
    }
    return false;
}

/// Get current research progress (0-100%)
export fn getResearchProgress(tribe_id: u32) f32 {
    if (sim_initialized) {
        if (global_sim.tech_mgr.getResearchConst(tribe_id)) |research| {
            return research.getResearchProgress();
        }
    }
    return 0;
}

/// Get current research target (255 = none)
export fn getCurrentResearch(tribe_id: u32) u8 {
    if (sim_initialized) {
        if (global_sim.tech_mgr.getResearchConst(tribe_id)) |research| {
            if (research.current_research) |tech| {
                return @intFromEnum(tech);
            }
        }
    }
    return 255;
}

/// Get current era (0-5)
export fn getCurrentEra(tribe_id: u32) u8 {
    if (sim_initialized) {
        if (global_sim.tech_mgr.getResearchConst(tribe_id)) |research| {
            return research.getCurrentEra();
        }
    }
    return 0;
}

/// Grant technology to tribe (god power)
export fn grantTechnology(tribe_id: u32, tech_id: u8) void {
    if (sim_initialized) {
        if (global_sim.tech_mgr.getResearch(tribe_id)) |research| {
            const tech: technology.Technology = @enumFromInt(tech_id);
            research.grantTech(tech);
        }
    }
}

// === TERRITORY ===

/// Get number of territory cells owned by tribe
export fn getTerritoryCount(tribe_id: u32) u32 {
    if (sim_initialized) {
        return global_sim.territory_mgr.getTerritoryCount(tribe_id);
    }
    return 0;
}

/// Get territory owner at world position (255 = unclaimed)
export fn getTerritoryOwner(x: f32, z: f32) u8 {
    if (sim_initialized) {
        if (global_sim.territory_mgr.getCellAtConst(x, z)) |cell| {
            if (cell.owner_tribe == 0xFFFFFFFF) return 255;
            return @as(u8, @intCast(@min(254, cell.owner_tribe)));
        }
    }
    return 255;
}

/// Get terrain type at position
export fn getTerrainType(x: f32, z: f32) u8 {
    if (sim_initialized) {
        if (global_sim.territory_mgr.getCellAtConst(x, z)) |cell| {
            return @intFromEnum(cell.terrain);
        }
    }
    return 0;
}

/// Get active border conflict count
export fn getActiveConflictCount() u32 {
    if (sim_initialized) {
        return @intCast(global_sim.territory_mgr.getActiveConflictCount());
    }
    return 0;
}

/// Check if two tribes share a border
export fn sharesBorder(tribe_a: u32, tribe_b: u32) bool {
    if (sim_initialized) {
        return global_sim.territory_mgr.sharesBorder(tribe_a, tribe_b);
    }
    return false;
}

// === POPULATION ===

/// Get total births (all time)
export fn getTotalBirths() u64 {
    if (sim_initialized) {
        return global_sim.population_mgr.total_births;
    }
    return 0;
}

/// Get total deaths (all time)
export fn getTotalDeaths() u64 {
    if (sim_initialized) {
        return global_sim.population_mgr.total_deaths;
    }
    return 0;
}

/// Get total disease cases (all time)
export fn getTotalDiseases() u64 {
    if (sim_initialized) {
        return global_sim.population_mgr.total_disease_cases;
    }
    return 0;
}

/// Get tribe births this year
export fn getTribeBirths(tribe_id: u32) u32 {
    if (sim_initialized and tribe_id < tribe.MAX_TRIBES) {
        return global_sim.population_mgr.tribe_births[tribe_id];
    }
    return 0;
}

/// Get tribe deaths this year
export fn getTribeDeaths(tribe_id: u32) u32 {
    if (sim_initialized and tribe_id < tribe.MAX_TRIBES) {
        return global_sim.population_mgr.tribe_deaths[tribe_id];
    }
    return 0;
}

/// Start disease outbreak in tribe (god power)
export fn startOutbreak(tribe_id: u32, disease_type: u8) void {
    if (sim_initialized) {
        const population = @import("population.zig");
        const disease: population.Disease = @enumFromInt(disease_type);
        global_sim.population_mgr.startOutbreak(tribe_id, disease, &global_sim.organisms, &global_sim.rng);
    }
}

// === EXTENDED STATS ===

/// Get extended statistics as packed data
/// Returns: [season, weather, day_lo, day_hi, year_lo, year_hi, wars, treaties, events, ...]
export fn getExtendedStats(out_buffer: [*]u32) void {
    if (sim_initialized) {
        const stats = global_sim.getExtendedStats();
        out_buffer[0] = stats.season;
        out_buffer[1] = stats.weather;
        out_buffer[2] = stats.day;
        out_buffer[3] = stats.year;
        out_buffer[4] = stats.active_wars;
        out_buffer[5] = stats.active_treaties;
        out_buffer[6] = stats.active_events;
        out_buffer[7] = @as(u32, @truncate(stats.total_births));
        out_buffer[8] = @as(u32, @truncate(stats.total_births >> 32));
        out_buffer[9] = @as(u32, @truncate(stats.total_deaths));
        out_buffer[10] = @as(u32, @truncate(stats.total_deaths >> 32));
        out_buffer[11] = @as(u32, @truncate(stats.total_diseases));
        out_buffer[12] = @as(u32, @truncate(stats.total_diseases >> 32));
    }
}

// === TRIBE ENHANCED INFO ===

/// Get tribe technology level
export fn getTribeTechLevel(tribe_id: u32) u32 {
    if (sim_initialized) {
        return global_sim.getTribeTechLevel(tribe_id);
    }
    return 0;
}

/// Get tribe territory count
export fn getTribeTerritoryCount(tribe_id: u32) u32 {
    if (sim_initialized) {
        return global_sim.getTribeTerritoryCount(tribe_id);
    }
    return 0;
}

// === GOD POWERS ===

/// Trigger seasonal event (for testing/god powers)
export fn triggerEvent(event_type: u8) void {
    if (sim_initialized) {
        const event: seasons.EventType = @enumFromInt(event_type);
        global_sim.season_mgr.triggerEvent(event, &global_sim.rng);
    }
}

/// Give resources to tribe
export fn giveResources(tribe_id: u32, food: f32, wood: f32, stone: f32, metal: f32) void {
    if (sim_initialized) {
        if (global_sim.tribes.getTribe(tribe_id)) |t| {
            t.food += food;
            t.wood += wood;
            t.stone += stone;
            t.metal += metal;
        }
    }
}

/// Modify reputation between tribes
export fn modifyReputation(tribe_a: u32, tribe_b: u32, delta: i32) void {
    if (sim_initialized) {
        global_sim.diplomacy_mgr.modifyReputation(tribe_a, tribe_b, delta);
    }
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
