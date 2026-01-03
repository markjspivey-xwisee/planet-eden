// Building system with 10 building types
// Each building provides bonuses to tribes

const std = @import("std");
const math = @import("math.zig");
const tribe = @import("tribe.zig");

/// Building types
pub const BuildingType = enum(u8) {
    hut = 0,        // Basic shelter, increases max population
    farm = 1,       // Produces food over time
    tower = 2,      // Defense bonus, vision range
    temple = 3,     // Faith/culture bonus
    wall = 4,       // Defense structure
    barracks = 5,   // Trains warriors faster
    smithy = 6,     // Produces equipment
    mine = 7,       // Produces stone and metal
    market = 8,     // Trades resources
    granary = 9,    // Stores food, reduces spoilage
};

/// Building state
pub const Building = struct {
    id: u32,
    building_type: BuildingType,
    tribe_id: u32,
    active: bool,

    // Position
    pos_x: f32,
    pos_y: f32,
    pos_z: f32,

    // Health/condition
    health: f32,
    max_health: f32,

    // Construction progress (0-100)
    construction_progress: f32,

    // Production timer for buildings that produce resources
    production_timer: f32,

    pub fn init(id: u32, building_type: BuildingType, tribe_id: u32, pos: math.Vec3) Building {
        const max_health: f32 = switch (building_type) {
            .hut => 100.0,
            .farm => 80.0,
            .tower => 200.0,
            .temple => 150.0,
            .wall => 300.0,
            .barracks => 180.0,
            .smithy => 160.0,
            .mine => 200.0,
            .market => 120.0,
            .granary => 140.0,
        };

        return .{
            .id = id,
            .building_type = building_type,
            .tribe_id = tribe_id,
            .active = true,
            .pos_x = pos.x,
            .pos_y = pos.y,
            .pos_z = pos.z,
            .health = max_health,
            .max_health = max_health,
            .construction_progress = 0.0,
            .production_timer = 0.0,
        };
    }

    pub fn getPosition(self: *const Building) math.Vec3 {
        return math.Vec3.init(self.pos_x, self.pos_y, self.pos_z);
    }

    /// Get resource cost to build
    pub fn getBuildCost(building_type: BuildingType) struct { food: f32, wood: f32, stone: f32, metal: f32 } {
        return switch (building_type) {
            .hut => .{ .food = 20, .wood = 50, .stone = 10, .metal = 0 },
            .farm => .{ .food = 10, .wood = 30, .stone = 5, .metal = 0 },
            .tower => .{ .food = 30, .wood = 40, .stone = 80, .metal = 20 },
            .temple => .{ .food = 50, .wood = 60, .stone = 100, .metal = 30 },
            .wall => .{ .food = 0, .wood = 20, .stone = 50, .metal = 10 },
            .barracks => .{ .food = 40, .wood = 70, .stone = 60, .metal = 30 },
            .smithy => .{ .food = 30, .wood = 50, .stone = 40, .metal = 50 },
            .mine => .{ .food = 40, .wood = 80, .stone = 30, .metal = 20 },
            .market => .{ .food = 60, .wood = 80, .stone = 40, .metal = 20 },
            .granary => .{ .food = 30, .wood = 70, .stone = 50, .metal = 10 },
        };
    }

    /// Check if building is fully constructed
    pub fn isConstructed(self: *const Building) bool {
        return self.construction_progress >= 100.0;
    }

    /// Update building (production, decay, etc.)
    pub fn update(self: *Building, delta: f32, tribe_manager: *tribe.Tribes) void {
        if (!self.active) return;

        // Construction progress
        if (!self.isConstructed()) {
            self.construction_progress += delta * 10.0; // 10% per second
            return;
        }

        // Production for resource-generating buildings
        const tribe_obj = tribe_manager.getTribe(self.tribe_id) orelse return;

        self.production_timer += delta;

        switch (self.building_type) {
            .farm => {
                if (self.production_timer >= 5.0) {
                    tribe_obj.addResource(.food, 10.0);
                    self.production_timer = 0.0;
                }
            },
            .mine => {
                if (self.production_timer >= 8.0) {
                    tribe_obj.addResource(.stone, 5.0);
                    tribe_obj.addResource(.metal, 2.0);
                    self.production_timer = 0.0;
                }
            },
            .market => {
                if (self.production_timer >= 10.0) {
                    // Convert excess food to other resources
                    if (tribe_obj.food > 100) {
                        _ = tribe_obj.consumeResource(.food, 20.0);
                        tribe_obj.addResource(.wood, 5.0);
                        tribe_obj.addResource(.stone, 3.0);
                    }
                    self.production_timer = 0.0;
                }
            },
            else => {},
        }
    }

    /// Take damage
    pub fn takeDamage(self: *Building, damage: f32) void {
        self.health -= damage;
        if (self.health <= 0) {
            self.health = 0;
            self.active = false;
        }
    }

    /// Repair building
    pub fn repair(self: *Building, amount: f32) void {
        self.health = @min(self.max_health, self.health + amount);
    }
};

/// Building manager
pub const Buildings = struct {
    buildings: []Building,
    count: usize,
    capacity: usize,
    allocator: std.mem.Allocator,

    pub fn init(allocator: std.mem.Allocator, capacity: usize) !Buildings {
        return .{
            .buildings = try allocator.alloc(Building, capacity),
            .count = 0,
            .capacity = capacity,
            .allocator = allocator,
        };
    }

    pub fn deinit(self: *Buildings) void {
        self.allocator.free(self.buildings);
    }

    /// Create a new building
    pub fn create(
        self: *Buildings,
        building_type: BuildingType,
        tribe_id: u32,
        pos: math.Vec3,
        tribe_manager: *tribe.Tribes,
    ) !u32 {
        if (self.count >= self.capacity) return error.OutOfCapacity;

        // Check if tribe has resources
        const cost = Building.getBuildCost(building_type);
        const tribe_obj = tribe_manager.getTribe(tribe_id) orelse return error.InvalidTribe;

        if (!tribe_obj.hasResources(cost.food, cost.wood, cost.stone, cost.metal)) {
            return error.InsufficientResources;
        }

        // Consume resources
        _ = tribe_obj.consumeResource(.food, cost.food);
        _ = tribe_obj.consumeResource(.wood, cost.wood);
        _ = tribe_obj.consumeResource(.stone, cost.stone);
        _ = tribe_obj.consumeResource(.metal, cost.metal);

        const id = @as(u32, @intCast(self.count));
        self.buildings[id] = Building.init(id, building_type, tribe_id, pos);
        self.count += 1;

        // Add to tribe
        _ = tribe_obj.addBuilding(id);

        return id;
    }

    /// Get building by ID
    pub fn get(self: *Buildings, id: u32) ?*Building {
        if (id >= self.count) return null;
        return &self.buildings[id];
    }

    /// Update all buildings
    pub fn update(self: *Buildings, delta: f32, tribe_manager: *tribe.Tribes) void {
        for (self.buildings[0..self.count]) |*building| {
            building.update(delta, tribe_manager);
        }
    }

    /// Get building count by type for a tribe
    pub fn getCountByType(self: *const Buildings, tribe_id: u32, building_type: BuildingType) usize {
        var count: usize = 0;
        for (self.buildings[0..self.count]) |*building| {
            if (building.tribe_id == tribe_id and
                building.building_type == building_type and
                building.active and
                building.isConstructed())
            {
                count += 1;
            }
        }
        return count;
    }

    /// Calculate total defense bonus for a tribe
    pub fn getDefenseBonus(self: *const Buildings, tribe_id: u32) f32 {
        var bonus: f32 = 0;
        for (self.buildings[0..self.count]) |*building| {
            if (building.tribe_id != tribe_id or !building.active or !building.isConstructed()) {
                continue;
            }

            switch (building.building_type) {
                .tower => bonus += 20.0,
                .wall => bonus += 15.0,
                .barracks => bonus += 10.0,
                else => {},
            }
        }
        return bonus;
    }

    /// Calculate food production rate for a tribe
    pub fn getFoodProductionRate(self: *const Buildings, tribe_id: u32) f32 {
        const farm_count = self.getCountByType(tribe_id, .farm);
        return @as(f32, @floatFromInt(farm_count)) * 2.0; // 2 food/sec per farm
    }
};

// Tests
test "Building creation and costs" {
    var rng = math.Rng.init(42);
    var tribes = tribe.Tribes.init();
    const tribe_id = tribes.createTribe(&rng).?;

    var buildings = try Buildings.init(std.testing.allocator, 100);
    defer buildings.deinit();

    // Give tribe resources
    const t = tribes.getTribe(tribe_id).?;
    t.addResource(.wood, 100);
    t.addResource(.stone, 100);

    const building_id = try buildings.create(.hut, tribe_id, math.Vec3.init(10, 0, 10), &tribes);
    try std.testing.expectEqual(@as(u32, 0), building_id);

    const building = buildings.get(building_id).?;
    try std.testing.expect(building.active);
    try std.testing.expectEqual(BuildingType.hut, building.building_type);
}

test "Building production" {
    var rng = math.Rng.init(42);
    var tribes = tribe.Tribes.init();
    const tribe_id = tribes.createTribe(&rng).?;

    var buildings = try Buildings.init(std.testing.allocator, 100);
    defer buildings.deinit();

    const t = tribes.getTribe(tribe_id).?;
    t.addResource(.wood, 100);
    t.addResource(.stone, 100);

    const building_id = try buildings.create(.farm, tribe_id, math.Vec3.init(0, 0, 0), &tribes);
    const building = buildings.get(building_id).?;

    // Complete construction
    building.construction_progress = 100.0;

    const initial_food = t.food;

    // Update for 6 seconds (should produce food)
    for (0..6) |_| {
        buildings.update(1.0, &tribes);
    }

    try std.testing.expect(t.food > initial_food);
}

test "Building defense bonus" {
    var rng = math.Rng.init(42);
    var tribes = tribe.Tribes.init();
    const tribe_id = tribes.createTribe(&rng).?;

    var buildings = try Buildings.init(std.testing.allocator, 100);
    defer buildings.deinit();

    const t = tribes.getTribe(tribe_id).?;
    t.addResource(.wood, 500);
    t.addResource(.stone, 500);
    t.addResource(.metal, 100);

    const tower_id = try buildings.create(.tower, tribe_id, math.Vec3.init(0, 0, 0), &tribes);
    buildings.get(tower_id).?.construction_progress = 100.0;

    const defense = buildings.getDefenseBonus(tribe_id);
    try std.testing.expectEqual(@as(f32, 20.0), defense);
}
