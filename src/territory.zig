// Territory System - Land claims, borders, and territorial conflicts
// Tribes claim and defend territory, gaining bonuses from controlled land

const std = @import("std");
const math = @import("math.zig");
const tribe = @import("tribe.zig");

/// Grid cell size for territory (10 units per cell)
pub const CELL_SIZE: f32 = 10.0;

/// Grid dimensions (20x20 cells covering -100 to 100)
pub const GRID_WIDTH: usize = 20;
pub const GRID_HEIGHT: usize = 20;

/// Total cells
pub const TOTAL_CELLS: usize = GRID_WIDTH * GRID_HEIGHT;

/// Territory cell types
pub const TerrainType = enum(u8) {
    plains = 0,     // Normal land
    forest = 1,     // Wood bonus
    mountain = 2,   // Stone/metal bonus
    river = 3,      // Water, food bonus
    coast = 4,      // Fish bonus
    desert = 5,     // Low resources
    fertile = 6,    // High food bonus
    tundra = 7,     // Cold, low resources
};

/// Cell state
pub const TerritoryCell = struct {
    owner_tribe: u32,       // Tribe ID or 0xFFFFFFFF for unclaimed
    terrain: TerrainType,
    control_strength: f32,  // 0-100, how strongly controlled
    contested: bool,        // Multiple tribes fighting for it
    contesting_tribe: u32,  // Who is contesting (if any)

    // Resource yields
    food_yield: f32,
    wood_yield: f32,
    stone_yield: f32,
    metal_yield: f32,

    // Buildings/improvements
    has_building: bool,

    pub fn init(terrain: TerrainType) TerritoryCell {
        var cell = TerritoryCell{
            .owner_tribe = 0xFFFFFFFF,
            .terrain = terrain,
            .control_strength = 0,
            .contested = false,
            .contesting_tribe = 0xFFFFFFFF,
            .food_yield = 1.0,
            .wood_yield = 0.5,
            .stone_yield = 0.2,
            .metal_yield = 0.1,
            .has_building = false,
        };

        // Apply terrain modifiers
        switch (terrain) {
            .plains => {},
            .forest => {
                cell.wood_yield = 2.0;
                cell.food_yield = 0.8;
            },
            .mountain => {
                cell.stone_yield = 2.0;
                cell.metal_yield = 1.0;
                cell.food_yield = 0.3;
                cell.wood_yield = 0.1;
            },
            .river => {
                cell.food_yield = 1.5;
                cell.wood_yield = 0.3;
            },
            .coast => {
                cell.food_yield = 1.3;
                cell.stone_yield = 0.1;
            },
            .desert => {
                cell.food_yield = 0.2;
                cell.wood_yield = 0.1;
                cell.stone_yield = 0.5;
            },
            .fertile => {
                cell.food_yield = 2.0;
                cell.wood_yield = 0.8;
            },
            .tundra => {
                cell.food_yield = 0.3;
                cell.wood_yield = 0.2;
                cell.stone_yield = 0.4;
            },
        }

        return cell;
    }

    pub fn isOwned(self: *const TerritoryCell) bool {
        return self.owner_tribe != 0xFFFFFFFF;
    }

    pub fn isOwnedBy(self: *const TerritoryCell, tribe_id: u32) bool {
        return self.owner_tribe == tribe_id;
    }
};

/// Border conflict between tribes
pub const BorderConflict = struct {
    active: bool,
    tribe_a: u32,
    tribe_b: u32,
    cell_x: u8,
    cell_z: u8,
    strength_a: f32,      // Tribe A's pressure
    strength_b: f32,      // Tribe B's pressure
    start_time: f32,
    skirmishes: u32,      // Number of fights

    pub fn init(tribe_a: u32, tribe_b: u32, cell_x: u8, cell_z: u8, time: f32) BorderConflict {
        return .{
            .active = true,
            .tribe_a = tribe_a,
            .tribe_b = tribe_b,
            .cell_x = cell_x,
            .cell_z = cell_z,
            .strength_a = 50,
            .strength_b = 50,
            .start_time = time,
            .skirmishes = 0,
        };
    }

    /// Add pressure from one side
    pub fn addPressure(self: *BorderConflict, is_tribe_a: bool, amount: f32) void {
        if (is_tribe_a) {
            self.strength_a += amount;
            self.strength_b -= amount * 0.5;
        } else {
            self.strength_b += amount;
            self.strength_a -= amount * 0.5;
        }

        self.strength_a = math.clamp(self.strength_a, 0, 100);
        self.strength_b = math.clamp(self.strength_b, 0, 100);
    }

    /// Check if conflict is resolved
    pub fn isResolved(self: *const BorderConflict) bool {
        return self.strength_a <= 0 or self.strength_b <= 0;
    }

    /// Get winner (0xFFFFFFFF if not resolved)
    pub fn getWinner(self: *const BorderConflict) u32 {
        if (self.strength_a <= 0) return self.tribe_b;
        if (self.strength_b <= 0) return self.tribe_a;
        return 0xFFFFFFFF;
    }
};

/// Maximum active border conflicts
pub const MAX_CONFLICTS: usize = 32;

/// Territory manager
pub const TerritoryManager = struct {
    // Territory grid
    cells: [TOTAL_CELLS]TerritoryCell,

    // Border conflicts
    conflicts: [MAX_CONFLICTS]BorderConflict,
    conflict_count: usize,

    // Statistics per tribe
    tribe_territory_count: [tribe.MAX_TRIBES]u32,

    pub fn init(rng: *math.Rng) TerritoryManager {
        var tm = TerritoryManager{
            .cells = undefined,
            .conflicts = undefined,
            .conflict_count = 0,
            .tribe_territory_count = [_]u32{0} ** tribe.MAX_TRIBES,
        };

        // Initialize cells with varied terrain
        for (0..TOTAL_CELLS) |i| {
            const x = i % GRID_WIDTH;
            const z = i / GRID_WIDTH;

            // Generate terrain based on position and randomness
            const terrain = tm.generateTerrain(x, z, rng);
            tm.cells[i] = TerritoryCell.init(terrain);
        }

        return tm;
    }

    /// Generate terrain type for a cell
    fn generateTerrain(self: *TerritoryManager, x: usize, z: usize, rng: *math.Rng) TerrainType {
        _ = self;

        // Convert to world coordinates (-100 to 100)
        const world_x = @as(f32, @floatFromInt(x)) * CELL_SIZE - 100.0;
        const world_z = @as(f32, @floatFromInt(z)) * CELL_SIZE - 100.0;

        // Distance from center (for variety)
        const dist_from_center = @sqrt(world_x * world_x + world_z * world_z);

        // Edge tiles are more likely to be harsh terrain
        if (dist_from_center > 80) {
            if (rng.float() < 0.4) return .mountain;
            if (rng.float() < 0.5) return .tundra;
            if (rng.float() < 0.3) return .desert;
        }

        // River running through middle-ish
        if (@abs(world_x) < 15 and rng.float() < 0.4) {
            return .river;
        }

        // Random terrain distribution
        const roll = rng.float();
        if (roll < 0.35) return .plains;
        if (roll < 0.55) return .forest;
        if (roll < 0.70) return .fertile;
        if (roll < 0.80) return .mountain;
        if (roll < 0.90) return .coast;
        return .desert;
    }

    /// Convert world position to cell index
    pub fn worldToCell(x: f32, z: f32) ?usize {
        // Clamp to world bounds
        const cx = x + 100.0; // Shift to 0-200 range
        const cz = z + 100.0;

        if (cx < 0 or cz < 0 or cx >= 200 or cz >= 200) return null;

        const cell_x = @as(usize, @intFromFloat(cx / CELL_SIZE));
        const cell_z = @as(usize, @intFromFloat(cz / CELL_SIZE));

        if (cell_x >= GRID_WIDTH or cell_z >= GRID_HEIGHT) return null;

        return cell_z * GRID_WIDTH + cell_x;
    }

    /// Convert cell index to world position (center of cell)
    pub fn cellToWorld(idx: usize) math.Vec3 {
        const x = idx % GRID_WIDTH;
        const z = idx / GRID_WIDTH;

        return math.Vec3.init(
            @as(f32, @floatFromInt(x)) * CELL_SIZE - 100.0 + CELL_SIZE / 2.0,
            0,
            @as(f32, @floatFromInt(z)) * CELL_SIZE - 100.0 + CELL_SIZE / 2.0,
        );
    }

    /// Get cell at position
    pub fn getCellAt(self: *TerritoryManager, x: f32, z: f32) ?*TerritoryCell {
        const idx = worldToCell(x, z) orelse return null;
        return &self.cells[idx];
    }

    /// Get cell at position (const)
    pub fn getCellAtConst(self: *const TerritoryManager, x: f32, z: f32) ?*const TerritoryCell {
        const idx = worldToCell(x, z) orelse return null;
        return &self.cells[idx];
    }

    /// Claim territory for a tribe
    pub fn claimTerritory(self: *TerritoryManager, x: f32, z: f32, tribe_id: u32) bool {
        const idx = worldToCell(x, z) orelse return false;
        const cell = &self.cells[idx];

        // Already owned by this tribe
        if (cell.owner_tribe == tribe_id) {
            cell.control_strength = @min(100, cell.control_strength + 5);
            return true;
        }

        // Unclaimed - take it
        if (!cell.isOwned()) {
            cell.owner_tribe = tribe_id;
            cell.control_strength = 50;

            if (tribe_id < tribe.MAX_TRIBES) {
                self.tribe_territory_count[tribe_id] += 1;
            }
            return true;
        }

        // Owned by another tribe - start contesting
        if (!cell.contested) {
            cell.contested = true;
            cell.contesting_tribe = tribe_id;

            // Start border conflict
            self.startConflict(cell.owner_tribe, tribe_id, idx);
        }

        return false;
    }

    /// Start a border conflict
    fn startConflict(self: *TerritoryManager, defender: u32, attacker: u32, cell_idx: usize) void {
        if (self.conflict_count >= MAX_CONFLICTS) return;

        // Check if conflict already exists
        for (self.conflicts[0..self.conflict_count]) |*c| {
            if (c.active and
                ((c.tribe_a == defender and c.tribe_b == attacker) or
                    (c.tribe_a == attacker and c.tribe_b == defender)))
            {
                return;
            }
        }

        const cell_x = @as(u8, @intCast(cell_idx % GRID_WIDTH));
        const cell_z = @as(u8, @intCast(cell_idx / GRID_WIDTH));

        self.conflicts[self.conflict_count] = BorderConflict.init(defender, attacker, cell_x, cell_z, 0);
        self.conflict_count += 1;
    }

    /// Update territory system
    pub fn update(self: *TerritoryManager, delta: f32) void {
        _ = delta;

        // Update conflicts
        var write_idx: usize = 0;
        for (0..self.conflict_count) |read_idx| {
            const c = &self.conflicts[read_idx];

            if (c.active and c.isResolved()) {
                // Resolve conflict - transfer territory
                const cell_idx = @as(usize, c.cell_z) * GRID_WIDTH + @as(usize, c.cell_x);
                const winner = c.getWinner();

                if (winner != 0xFFFFFFFF) {
                    self.transferTerritory(cell_idx, winner);
                }

                c.active = false;
            }

            if (c.active) {
                if (write_idx != read_idx) {
                    self.conflicts[write_idx] = self.conflicts[read_idx];
                }
                write_idx += 1;
            }
        }
        self.conflict_count = write_idx;

        // Decay control strength over time for contested territories
        for (&self.cells) |*cell| {
            if (cell.contested and cell.isOwned()) {
                cell.control_strength -= 0.1;
                if (cell.control_strength <= 0) {
                    // Lost control
                    const old_owner = cell.owner_tribe;
                    cell.owner_tribe = cell.contesting_tribe;
                    cell.contesting_tribe = 0xFFFFFFFF;
                    cell.contested = false;
                    cell.control_strength = 30;

                    // Update counts
                    if (old_owner < tribe.MAX_TRIBES) {
                        self.tribe_territory_count[old_owner] -|= 1;
                    }
                    if (cell.owner_tribe < tribe.MAX_TRIBES) {
                        self.tribe_territory_count[cell.owner_tribe] += 1;
                    }
                }
            }
        }
    }

    /// Transfer territory to new owner
    fn transferTerritory(self: *TerritoryManager, cell_idx: usize, new_owner: u32) void {
        const cell = &self.cells[cell_idx];

        const old_owner = cell.owner_tribe;

        // Update counts
        if (old_owner < tribe.MAX_TRIBES) {
            self.tribe_territory_count[old_owner] -|= 1;
        }
        if (new_owner < tribe.MAX_TRIBES) {
            self.tribe_territory_count[new_owner] += 1;
        }

        cell.owner_tribe = new_owner;
        cell.contesting_tribe = 0xFFFFFFFF;
        cell.contested = false;
        cell.control_strength = 50;
    }

    /// Get number of cells owned by tribe
    pub fn getTerritoryCount(self: *const TerritoryManager, tribe_id: u32) u32 {
        if (tribe_id >= tribe.MAX_TRIBES) return 0;
        return self.tribe_territory_count[tribe_id];
    }

    /// Calculate total resource yield for tribe
    pub fn getTotalYield(self: *const TerritoryManager, tribe_id: u32) struct { food: f32, wood: f32, stone: f32, metal: f32 } {
        var food: f32 = 0;
        var wood: f32 = 0;
        var stone: f32 = 0;
        var metal: f32 = 0;

        for (&self.cells) |*cell| {
            if (cell.isOwnedBy(tribe_id)) {
                const control_mult = cell.control_strength / 100.0;
                food += cell.food_yield * control_mult;
                wood += cell.wood_yield * control_mult;
                stone += cell.stone_yield * control_mult;
                metal += cell.metal_yield * control_mult;
            }
        }

        return .{ .food = food, .wood = wood, .stone = stone, .metal = metal };
    }

    /// Get adjacent cells (for expansion)
    pub fn getAdjacentCells(cell_idx: usize, adjacent: *[4]?usize) void {
        const x = cell_idx % GRID_WIDTH;
        const z = cell_idx / GRID_WIDTH;

        // North
        if (z > 0) {
            adjacent[0] = cell_idx - GRID_WIDTH;
        } else {
            adjacent[0] = null;
        }

        // South
        if (z < GRID_HEIGHT - 1) {
            adjacent[1] = cell_idx + GRID_WIDTH;
        } else {
            adjacent[1] = null;
        }

        // West
        if (x > 0) {
            adjacent[2] = cell_idx - 1;
        } else {
            adjacent[2] = null;
        }

        // East
        if (x < GRID_WIDTH - 1) {
            adjacent[3] = cell_idx + 1;
        } else {
            adjacent[3] = null;
        }
    }

    /// Check if tribe can expand to cell (must be adjacent to existing territory)
    pub fn canExpandTo(self: *const TerritoryManager, tribe_id: u32, cell_idx: usize) bool {
        // Must be unclaimed or contested
        const cell = &self.cells[cell_idx];
        if (cell.isOwnedBy(tribe_id)) return false;

        // Must be adjacent to owned territory
        var adjacent: [4]?usize = undefined;
        getAdjacentCells(cell_idx, &adjacent);

        for (adjacent) |maybe_adj| {
            if (maybe_adj) |adj_idx| {
                if (self.cells[adj_idx].isOwnedBy(tribe_id)) {
                    return true;
                }
            }
        }

        return false;
    }

    /// Get border cells for tribe (cells adjacent to other tribes)
    pub fn getBorderCells(self: *const TerritoryManager, tribe_id: u32, borders: *[TOTAL_CELLS]usize) usize {
        var count: usize = 0;

        for (0..TOTAL_CELLS) |i| {
            if (!self.cells[i].isOwnedBy(tribe_id)) continue;

            var adjacent: [4]?usize = undefined;
            getAdjacentCells(i, &adjacent);

            for (adjacent) |maybe_adj| {
                if (maybe_adj) |adj_idx| {
                    const adj_cell = &self.cells[adj_idx];
                    if (adj_cell.isOwned() and !adj_cell.isOwnedBy(tribe_id)) {
                        borders[count] = i;
                        count += 1;
                        break;
                    }
                }
            }
        }

        return count;
    }

    /// Get active conflict count
    pub fn getActiveConflictCount(self: *const TerritoryManager) usize {
        var count: usize = 0;
        for (self.conflicts[0..self.conflict_count]) |*c| {
            if (c.active) count += 1;
        }
        return count;
    }

    /// Check if tribes share a border
    pub fn sharesBorder(self: *const TerritoryManager, tribe_a: u32, tribe_b: u32) bool {
        for (0..TOTAL_CELLS) |i| {
            if (!self.cells[i].isOwnedBy(tribe_a)) continue;

            var adjacent: [4]?usize = undefined;
            getAdjacentCells(i, &adjacent);

            for (adjacent) |maybe_adj| {
                if (maybe_adj) |adj_idx| {
                    if (self.cells[adj_idx].isOwnedBy(tribe_b)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /// Get territory map as byte array (for WASM export)
    pub fn getTerritoryMap(self: *const TerritoryManager, map: *[TOTAL_CELLS]u8) void {
        for (0..TOTAL_CELLS) |i| {
            const owner = self.cells[i].owner_tribe;
            if (owner == 0xFFFFFFFF) {
                map[i] = 255;
            } else {
                map[i] = @as(u8, @intCast(@min(254, owner)));
            }
        }
    }

    /// Get terrain map as byte array (for WASM export)
    pub fn getTerrainMap(self: *const TerritoryManager, map: *[TOTAL_CELLS]u8) void {
        for (0..TOTAL_CELLS) |i| {
            map[i] = @intFromEnum(self.cells[i].terrain);
        }
    }
};

// Tests
test "Territory position conversion" {
    // Center should be cell (10, 10)
    const center_idx = TerritoryManager.worldToCell(0, 0);
    try std.testing.expect(center_idx != null);
    try std.testing.expectEqual(@as(usize, 10 * GRID_WIDTH + 10), center_idx.?);

    // Edge should be valid
    const edge_idx = TerritoryManager.worldToCell(-95, -95);
    try std.testing.expect(edge_idx != null);

    // Out of bounds should be null
    const oob_idx = TerritoryManager.worldToCell(-150, 0);
    try std.testing.expectEqual(@as(?usize, null), oob_idx);
}

test "Territory claiming" {
    var rng = math.Rng.init(42);
    var tm = TerritoryManager.init(&rng);

    // Claim a cell
    try std.testing.expect(tm.claimTerritory(0, 0, 0));
    try std.testing.expectEqual(@as(u32, 1), tm.getTerritoryCount(0));

    // Claim same cell - should strengthen
    try std.testing.expect(tm.claimTerritory(0, 0, 0));
    try std.testing.expectEqual(@as(u32, 1), tm.getTerritoryCount(0));

    // Different tribe can't claim same cell directly
    try std.testing.expect(!tm.claimTerritory(0, 0, 1));
}

test "Territory yields" {
    var rng = math.Rng.init(42);
    var tm = TerritoryManager.init(&rng);

    // Claim some cells
    _ = tm.claimTerritory(0, 0, 0);
    _ = tm.claimTerritory(10, 0, 0);
    _ = tm.claimTerritory(-10, 0, 0);

    const yields = tm.getTotalYield(0);
    try std.testing.expect(yields.food > 0);
}
