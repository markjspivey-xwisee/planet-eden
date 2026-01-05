// Tribe management system
// Handles tribe resources, members, and relationships

const std = @import("std");
const math = @import("math.zig");

/// Maximum number of tribes
pub const MAX_TRIBES: usize = 8;

/// Maximum members tracked per tribe
pub const MAX_MEMBERS_PER_TRIBE: usize = 32;

/// Tribe data
pub const Tribe = struct {
    id: u32,
    active: bool,

    // Tribe stats
    food: f32,
    wood: f32,
    stone: f32,
    metal: f32,

    // Members
    member_ids: [MAX_MEMBERS_PER_TRIBE]u32,
    member_count: usize,

    // Buildings (indices into building array)
    building_ids: [16]u32,
    building_count: usize,

    // Color for rendering
    color_r: u8,
    color_g: u8,
    color_b: u8,

    // Diplomatic relationships (0-100, 50=neutral, 0=hostile, 100=allied)
    relationships: [MAX_TRIBES]u8,

    // Technology/advancement level
    tech_level: u32,

    pub fn init(id: u32, rng: *math.Rng) Tribe {
        var tribe = Tribe{
            .id = id,
            .active = true,
            .food = 100.0,
            .wood = 50.0,
            .stone = 20.0,
            .metal = 0.0,
            .member_ids = undefined,
            .member_count = 0,
            .building_ids = undefined,
            .building_count = 0,
            .color_r = @intFromFloat(rng.range(100, 255)),
            .color_g = @intFromFloat(rng.range(100, 255)),
            .color_b = @intFromFloat(rng.range(100, 255)),
            .relationships = [_]u8{50} ** MAX_TRIBES,
            .tech_level = 0,
        };

        // Set own relationship to max
        tribe.relationships[id] = 100;

        return tribe;
    }

    pub fn addMember(self: *Tribe, organism_id: u32) bool {
        if (self.member_count >= MAX_MEMBERS_PER_TRIBE) return false;
        self.member_ids[self.member_count] = organism_id;
        self.member_count += 1;
        return true;
    }

    pub fn removeMember(self: *Tribe, organism_id: u32) void {
        for (0..self.member_count) |i| {
            if (self.member_ids[i] == organism_id) {
                // Swap with last and decrement count
                self.member_ids[i] = self.member_ids[self.member_count - 1];
                self.member_count -= 1;
                return;
            }
        }
    }

    pub fn addBuilding(self: *Tribe, building_id: u32) bool {
        if (self.building_count >= 64) return false;
        self.building_ids[self.building_count] = building_id;
        self.building_count += 1;
        return true;
    }

    pub fn removeBuilding(self: *Tribe, building_id: u32) void {
        for (0..self.building_count) |i| {
            if (self.building_ids[i] == building_id) {
                self.building_ids[i] = self.building_ids[self.building_count - 1];
                self.building_count -= 1;
                return;
            }
        }
    }

    /// Add resources
    pub fn addResource(self: *Tribe, resource_type: ResourceType, amount: f32) void {
        switch (resource_type) {
            .food => self.food += amount,
            .wood => self.wood += amount,
            .stone => self.stone += amount,
            .metal => self.metal += amount,
        }
    }

    /// Try to consume resources
    pub fn consumeResource(self: *Tribe, resource_type: ResourceType, amount: f32) bool {
        const available = switch (resource_type) {
            .food => &self.food,
            .wood => &self.wood,
            .stone => &self.stone,
            .metal => &self.metal,
        };

        if (available.* >= amount) {
            available.* -= amount;
            return true;
        }
        return false;
    }

    /// Check if tribe has enough resources
    pub fn hasResources(self: *const Tribe, food: f32, wood: f32, stone: f32, metal: f32) bool {
        return self.food >= food and
               self.wood >= wood and
               self.stone >= stone and
               self.metal >= metal;
    }

    /// Update relationship with another tribe
    pub fn updateRelationship(self: *Tribe, other_tribe_id: u32, delta: i32) void {
        if (other_tribe_id >= MAX_TRIBES) return;
        if (other_tribe_id == self.id) return;

        const current = self.relationships[other_tribe_id];
        if (delta > 0) {
            self.relationships[other_tribe_id] = @min(100, current + @as(u8, @intCast(delta)));
        } else {
            const abs_delta = @as(u8, @intCast(-delta));
            if (current > abs_delta) {
                self.relationships[other_tribe_id] = current - abs_delta;
            } else {
                self.relationships[other_tribe_id] = 0;
            }
        }
    }

    /// Check if tribes are hostile
    pub fn isHostile(self: *const Tribe, other_tribe_id: u32) bool {
        if (other_tribe_id >= MAX_TRIBES) return false;
        return self.relationships[other_tribe_id] < 30;
    }

    /// Check if tribes are allied
    pub fn isAllied(self: *const Tribe, other_tribe_id: u32) bool {
        if (other_tribe_id >= MAX_TRIBES) return false;
        return self.relationships[other_tribe_id] > 70;
    }
};

/// Resource types
pub const ResourceType = enum {
    food,
    wood,
    stone,
    metal,
};

/// Tribe manager
pub const Tribes = struct {
    tribes: [MAX_TRIBES]Tribe,
    count: usize,

    pub fn init() Tribes {
        return .{
            .tribes = undefined,
            .count = 0,
        };
    }

    /// Create a new tribe
    pub fn createTribe(self: *Tribes, rng: *math.Rng) ?u32 {
        if (self.count >= MAX_TRIBES) return null;

        const id = @as(u32, @intCast(self.count));
        self.tribes[id] = Tribe.init(id, rng);
        self.count += 1;

        return id;
    }

    /// Get tribe by ID
    pub fn getTribe(self: *Tribes, id: u32) ?*Tribe {
        if (id >= self.count) return null;
        if (!self.tribes[id].active) return null;
        return &self.tribes[id];
    }

    /// Get tribe by ID (const)
    pub fn getTribeConst(self: *const Tribes, id: u32) ?*const Tribe {
        if (id >= self.count) return null;
        if (!self.tribes[id].active) return null;
        return &self.tribes[id];
    }

    /// Update all tribes
    pub fn update(self: *Tribes, delta: f32) void {
        for (self.tribes[0..self.count]) |*tribe| {
            if (!tribe.active) continue;

            // Passive food consumption
            const food_drain = @as(f32, @floatFromInt(tribe.member_count)) * delta * 0.1;
            tribe.food = @max(0, tribe.food - food_drain);

            // Deactivate tribe if no members
            if (tribe.member_count == 0) {
                tribe.active = false;
            }
        }
    }

    /// Get active tribe count
    pub fn getActiveCount(self: *const Tribes) usize {
        var count: usize = 0;
        for (self.tribes[0..self.count]) |*tribe| {
            if (tribe.active) count += 1;
        }
        return count;
    }
};

// Tests
test "Tribe creation and resources" {
    var rng = math.Rng.init(42);
    var tribes = Tribes.init();

    const id = tribes.createTribe(&rng).?;
    try std.testing.expectEqual(@as(u32, 0), id);

    const tribe = tribes.getTribe(id).?;
    try std.testing.expect(tribe.active);
    try std.testing.expectEqual(@as(f32, 100.0), tribe.food);

    tribe.addResource(.wood, 50);
    try std.testing.expectEqual(@as(f32, 100.0), tribe.wood);

    const consumed = tribe.consumeResource(.wood, 30);
    try std.testing.expect(consumed);
    try std.testing.expectEqual(@as(f32, 70.0), tribe.wood);
}

test "Tribe members" {
    var rng = math.Rng.init(42);
    var tribes = Tribes.init();
    const id = tribes.createTribe(&rng).?;
    const tribe = tribes.getTribe(id).?;

    _ = tribe.addMember(100);
    _ = tribe.addMember(101);
    try std.testing.expectEqual(@as(usize, 2), tribe.member_count);

    tribe.removeMember(100);
    try std.testing.expectEqual(@as(usize, 1), tribe.member_count);
}

test "Tribe relationships" {
    var rng = math.Rng.init(42);
    var tribes = Tribes.init();

    const id1 = tribes.createTribe(&rng).?;
    const id2 = tribes.createTribe(&rng).?;

    const tribe1 = tribes.getTribe(id1).?;

    try std.testing.expectEqual(@as(u8, 50), tribe1.relationships[id2]);

    tribe1.updateRelationship(id2, -30);
    try std.testing.expectEqual(@as(u8, 20), tribe1.relationships[id2]);
    try std.testing.expect(tribe1.isHostile(id2));

    tribe1.updateRelationship(id2, 60);
    try std.testing.expectEqual(@as(u8, 80), tribe1.relationships[id2]);
    try std.testing.expect(tribe1.isAllied(id2));
}
