// Equipment system with 5 equipment types
// Equipment provides stat bonuses to organisms

const std = @import("std");
const math = @import("math.zig");

/// Equipment types
pub const EquipmentType = enum(u8) {
    spear = 0,   // Melee weapon, medium damage/range
    sword = 1,   // Melee weapon, high damage/low range
    bow = 2,     // Ranged weapon
    shield = 3,  // Defense bonus
    armor = 4,   // Health bonus
};

/// Equipment item
pub const Equipment = struct {
    id: u32,
    equipment_type: EquipmentType,
    active: bool,

    // Stats
    damage_bonus: f32,
    defense_bonus: f32,
    range_bonus: f32,
    health_bonus: f32,
    speed_modifier: f32, // 1.0 = normal, 0.8 = slower, 1.2 = faster

    // Durability
    durability: f32,
    max_durability: f32,

    pub fn init(id: u32, equipment_type: EquipmentType) Equipment {
        var equip = Equipment{
            .id = id,
            .equipment_type = equipment_type,
            .active = true,
            .damage_bonus = 0,
            .defense_bonus = 0,
            .range_bonus = 0,
            .health_bonus = 0,
            .speed_modifier = 1.0,
            .durability = 100.0,
            .max_durability = 100.0,
        };

        // Set stats based on type
        switch (equipment_type) {
            .spear => {
                equip.damage_bonus = 15.0;
                equip.range_bonus = 3.0;
                equip.speed_modifier = 0.95;
                equip.max_durability = 80.0;
            },
            .sword => {
                equip.damage_bonus = 25.0;
                equip.range_bonus = 1.5;
                equip.speed_modifier = 0.9;
                equip.max_durability = 100.0;
            },
            .bow => {
                equip.damage_bonus = 20.0;
                equip.range_bonus = 10.0;
                equip.speed_modifier = 1.0;
                equip.max_durability = 60.0;
            },
            .shield => {
                equip.defense_bonus = 30.0;
                equip.speed_modifier = 0.85;
                equip.max_durability = 150.0;
            },
            .armor => {
                equip.defense_bonus = 20.0;
                equip.health_bonus = 50.0;
                equip.speed_modifier = 0.9;
                equip.max_durability = 120.0;
            },
        }

        equip.durability = equip.max_durability;
        return equip;
    }

    /// Get crafting cost
    pub fn getCraftCost(equipment_type: EquipmentType) struct { wood: f32, stone: f32, metal: f32 } {
        return switch (equipment_type) {
            .spear => .{ .wood = 20, .stone = 5, .metal = 10 },
            .sword => .{ .wood = 10, .stone = 5, .metal = 30 },
            .bow => .{ .wood = 30, .stone = 0, .metal = 5 },
            .shield => .{ .wood = 25, .stone = 10, .metal = 15 },
            .armor => .{ .wood = 10, .stone = 15, .metal = 40 },
        };
    }

    /// Reduce durability (from use)
    pub fn useDurability(self: *Equipment, amount: f32) void {
        self.durability -= amount;
        if (self.durability <= 0) {
            self.durability = 0;
            self.active = false; // Equipment breaks
        }
    }

    /// Repair equipment
    pub fn repair(self: *Equipment, amount: f32) void {
        self.durability = @min(self.max_durability, self.durability + amount);
        if (self.durability > 0) {
            self.active = true;
        }
    }

    /// Check if equipment is broken
    pub fn isBroken(self: *const Equipment) bool {
        return self.durability <= 0;
    }

    /// Get effectiveness percentage (0-100)
    pub fn getEffectiveness(self: *const Equipment) f32 {
        return (self.durability / self.max_durability) * 100.0;
    }
};

/// Equipment manager
pub const EquipmentManager = struct {
    equipment: []Equipment,
    count: usize,
    capacity: usize,
    allocator: std.mem.Allocator,

    pub fn init(allocator: std.mem.Allocator, capacity: usize) !EquipmentManager {
        return .{
            .equipment = try allocator.alloc(Equipment, capacity),
            .count = 0,
            .capacity = capacity,
            .allocator = allocator,
        };
    }

    pub fn deinit(self: *EquipmentManager) void {
        self.allocator.free(self.equipment);
    }

    /// Craft new equipment
    pub fn craft(self: *EquipmentManager, equipment_type: EquipmentType) !u32 {
        if (self.count >= self.capacity) return error.OutOfCapacity;

        const id = @as(u32, @intCast(self.count));
        self.equipment[id] = Equipment.init(id, equipment_type);
        self.count += 1;

        return id;
    }

    /// Get equipment by ID
    pub fn get(self: *EquipmentManager, id: u32) ?*Equipment {
        if (id >= self.count) return null;
        return &self.equipment[id];
    }

    /// Get equipment by ID (const)
    pub fn getConst(self: *const EquipmentManager, id: u32) ?*const Equipment {
        if (id >= self.count) return null;
        return &self.equipment[id];
    }

    /// Calculate total damage bonus for an organism with equipment
    pub fn getTotalDamageBonus(self: *const EquipmentManager, equipment_id: u32) f32 {
        const equip = self.getConst(equipment_id) orelse return 0;
        if (!equip.active) return 0;

        const effectiveness = equip.getEffectiveness() / 100.0;
        return equip.damage_bonus * effectiveness;
    }

    /// Calculate total defense bonus
    pub fn getTotalDefenseBonus(self: *const EquipmentManager, equipment_id: u32) f32 {
        const equip = self.getConst(equipment_id) orelse return 0;
        if (!equip.active) return 0;

        const effectiveness = equip.getEffectiveness() / 100.0;
        return equip.defense_bonus * effectiveness;
    }

    /// Calculate total range bonus
    pub fn getTotalRangeBonus(self: *const EquipmentManager, equipment_id: u32) f32 {
        const equip = self.getConst(equipment_id) orelse return 0;
        if (!equip.active) return 0;

        return equip.range_bonus;
    }

    /// Get speed modifier
    pub fn getSpeedModifier(self: *const EquipmentManager, equipment_id: u32) f32 {
        const equip = self.getConst(equipment_id) orelse return 1.0;
        if (!equip.active) return 1.0;

        return equip.speed_modifier;
    }

    /// Update equipment durability
    pub fn update(self: *EquipmentManager, delta: f32) void {
        // Passive durability decay
        for (self.equipment[0..self.count]) |*equip| {
            if (equip.active) {
                equip.useDurability(delta * 0.1);
            }
        }
    }

    /// Remove broken equipment (compact array)
    pub fn removeBroken(self: *EquipmentManager) void {
        var write_idx: usize = 0;
        for (0..self.count) |read_idx| {
            if (!self.equipment[read_idx].isBroken() or self.equipment[read_idx].active) {
                if (write_idx != read_idx) {
                    self.equipment[write_idx] = self.equipment[read_idx];
                    self.equipment[write_idx].id = @intCast(write_idx);
                }
                write_idx += 1;
            }
        }
        self.count = write_idx;
    }
};

/// Equipment set (for an organism that can hold multiple equipment)
pub const EquipmentSet = struct {
    weapon_id: u32,      // Spear, sword, or bow
    armor_id: u32,       // Armor
    shield_id: u32,      // Shield
    accessory_id: u32,   // Future: rings, amulets, etc.

    pub fn init() EquipmentSet {
        return .{
            .weapon_id = 0,
            .armor_id = 0,
            .shield_id = 0,
            .accessory_id = 0,
        };
    }

    pub fn equip(self: *EquipmentSet, equipment_id: u32, equipment_type: EquipmentType) void {
        switch (equipment_type) {
            .spear, .sword, .bow => self.weapon_id = equipment_id,
            .armor => self.armor_id = equipment_id,
            .shield => self.shield_id = equipment_id,
        }
    }

    pub fn unequip(self: *EquipmentSet, equipment_type: EquipmentType) void {
        switch (equipment_type) {
            .spear, .sword, .bow => self.weapon_id = 0,
            .armor => self.armor_id = 0,
            .shield => self.shield_id = 0,
        }
    }

    pub fn getTotalDamageBonus(self: *const EquipmentSet, equipment_mgr: *const EquipmentManager) f32 {
        return equipment_mgr.getTotalDamageBonus(self.weapon_id);
    }

    pub fn getTotalDefenseBonus(self: *const EquipmentSet, equipment_mgr: *const EquipmentManager) f32 {
        var total: f32 = 0;
        total += equipment_mgr.getTotalDefenseBonus(self.armor_id);
        total += equipment_mgr.getTotalDefenseBonus(self.shield_id);
        return total;
    }
};

// Tests
test "Equipment creation and stats" {
    var mgr = try EquipmentManager.init(std.testing.allocator, 100);
    defer mgr.deinit();

    const sword_id = try mgr.craft(.sword);
    const sword = mgr.get(sword_id).?;

    try std.testing.expectEqual(EquipmentType.sword, sword.equipment_type);
    try std.testing.expectEqual(@as(f32, 25.0), sword.damage_bonus);
    try std.testing.expect(sword.active);
}

test "Equipment durability" {
    var mgr = try EquipmentManager.init(std.testing.allocator, 100);
    defer mgr.deinit();

    const spear_id = try mgr.craft(.spear);
    const spear = mgr.get(spear_id).?;

    try std.testing.expectEqual(@as(f32, 80.0), spear.durability);

    spear.useDurability(50.0);
    try std.testing.expectEqual(@as(f32, 30.0), spear.durability);
    try std.testing.expect(!spear.isBroken());

    spear.useDurability(50.0);
    try std.testing.expect(spear.isBroken());
    try std.testing.expect(!spear.active);
}

test "Equipment bonuses with effectiveness" {
    var mgr = try EquipmentManager.init(std.testing.allocator, 100);
    defer mgr.deinit();

    const sword_id = try mgr.craft(.sword);
    const sword = mgr.get(sword_id).?;

    // Full durability = full bonus
    const bonus1 = mgr.getTotalDamageBonus(sword_id);
    try std.testing.expectEqual(@as(f32, 25.0), bonus1);

    // Half durability = half bonus
    sword.durability = 50.0;
    const bonus2 = mgr.getTotalDamageBonus(sword_id);
    try std.testing.expectApproxEqRel(@as(f32, 12.5), bonus2, 0.01);
}

test "Equipment set" {
    var mgr = try EquipmentManager.init(std.testing.allocator, 100);
    defer mgr.deinit();

    var set = EquipmentSet.init();

    const sword_id = try mgr.craft(.sword);
    const shield_id = try mgr.craft(.shield);

    set.equip(sword_id, .sword);
    set.equip(shield_id, .shield);

    const damage = set.getTotalDamageBonus(&mgr);
    const defense = set.getTotalDefenseBonus(&mgr);

    try std.testing.expectEqual(@as(f32, 25.0), damage);
    try std.testing.expectEqual(@as(f32, 30.0), defense);
}
