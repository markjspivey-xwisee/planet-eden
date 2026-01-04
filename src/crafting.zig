// Crafting system for tools, weapons, and items
// Humanoids can craft items to improve their capabilities

const std = @import("std");
const math = @import("math.zig");
const resource = @import("resource.zig");

/// Tool types that can be crafted
pub const ToolType = enum(u8) {
    none = 0,
    hand_axe = 1, // Basic tool, 1.5x wood gathering
    pickaxe = 2, // 1.5x stone/metal gathering
    hoe = 3, // For farming
    fishing_rod = 4, // For catching fish
    hammer = 5, // For construction speed
    knife = 6, // General purpose
};

/// Weapon types that can be crafted
pub const WeaponType = enum(u8) {
    none = 0,
    club = 1, // Basic, +10 damage
    spear = 2, // +15 damage, some range
    bow = 3, // Ranged weapon, +12 damage
    sword = 4, // +20 damage
    axe = 5, // +18 damage, also works as tool
    shield = 6, // +30 defense
};

/// Armor types that can be crafted
pub const ArmorType = enum(u8) {
    none = 0,
    hide_armor = 1, // Basic, +10 defense
    leather_armor = 2, // +15 defense
    wooden_armor = 3, // +20 defense
    bone_armor = 4, // +25 defense
    metal_armor = 5, // +40 defense
};

/// Item quality affects stats
pub const Quality = enum(u8) {
    crude = 0, // 0.7x stats
    normal = 1, // 1.0x stats
    fine = 2, // 1.3x stats
    masterwork = 3, // 1.6x stats
    legendary = 4, // 2.0x stats

    pub fn getMultiplier(self: Quality) f32 {
        return switch (self) {
            .crude => 0.7,
            .normal => 1.0,
            .fine => 1.3,
            .masterwork => 1.6,
            .legendary => 2.0,
        };
    }
};

/// Crafted item
pub const CraftedItem = struct {
    item_type: ItemType,
    quality: Quality,
    durability: f32, // Current durability
    max_durability: f32,
    owner_id: u32, // Organism ID that owns this
    equipped: bool,

    pub const ItemType = union(enum) {
        tool: ToolType,
        weapon: WeaponType,
        armor: ArmorType,
    };

    /// Get damage bonus from weapon
    pub fn getDamageBonus(self: *const CraftedItem) f32 {
        const base: f32 = switch (self.item_type) {
            .weapon => |w| switch (w) {
                .none => 0.0,
                .club => 10.0,
                .spear => 15.0,
                .bow => 12.0,
                .sword => 20.0,
                .axe => 18.0,
                .shield => 0.0,
            },
            else => 0.0,
        };
        return base * self.quality.getMultiplier();
    }

    /// Get defense bonus from armor/shield
    pub fn getDefenseBonus(self: *const CraftedItem) f32 {
        const base: f32 = switch (self.item_type) {
            .armor => |a| switch (a) {
                .none => 0.0,
                .hide_armor => 10.0,
                .leather_armor => 15.0,
                .wooden_armor => 20.0,
                .bone_armor => 25.0,
                .metal_armor => 40.0,
            },
            .weapon => |w| if (w == .shield) @as(f32, 30.0) else @as(f32, 0.0),
            else => 0.0,
        };
        return base * self.quality.getMultiplier();
    }

    /// Get gathering multiplier from tool
    pub fn getGatheringMultiplier(self: *const CraftedItem, gather_type: resource.ResourceType) f32 {
        const tool = switch (self.item_type) {
            .tool => |t| t,
            else => return 1.0,
        };

        const base: f32 = switch (tool) {
            .hand_axe => if (gather_type == .wood) 1.5 else 1.0,
            .pickaxe => if (gather_type == .stone or gather_type == .metal) 1.5 else 1.0,
            .knife => 1.2, // General bonus
            else => 1.0,
        };

        return 1.0 + (base - 1.0) * self.quality.getMultiplier();
    }

    /// Use the item (reduces durability)
    pub fn use(self: *CraftedItem, amount: f32) void {
        self.durability = @max(0, self.durability - amount);
    }

    /// Check if item is broken
    pub fn isBroken(self: *const CraftedItem) bool {
        return self.durability <= 0;
    }

    /// Repair item
    pub fn repair(self: *CraftedItem, amount: f32) void {
        self.durability = @min(self.max_durability, self.durability + amount);
    }
};

/// Recipe for crafting an item
pub const ItemRecipe = struct {
    result_type: CraftedItem.ItemType,
    base_durability: f32,
    craft_time: f32,
    skill_required: f32, // 0-100, affects quality
    inputs: [4]RecipeInput,
    input_count: u8,

    pub const RecipeInput = struct {
        resource: resource.ResourceType,
        amount: f32,
    };

    /// Determine quality based on skill
    pub fn determineQuality(self: *const ItemRecipe, skill: f32, rng: *math.Rng) Quality {
        _ = self;
        const roll = skill + rng.float() * 20.0 - 10.0; // Some randomness
        if (roll >= 90) return .legendary;
        if (roll >= 70) return .masterwork;
        if (roll >= 50) return .fine;
        if (roll >= 30) return .normal;
        return .crude;
    }
};

/// Standard item recipes
pub const ITEM_RECIPES = [_]ItemRecipe{
    // Tools
    // Hand Axe: 2 stone + 1 wood
    .{
        .result_type = .{ .tool = .hand_axe },
        .base_durability = 100,
        .craft_time = 10,
        .skill_required = 0,
        .inputs = .{
            .{ .resource = .stone, .amount = 2 },
            .{ .resource = .wood, .amount = 1 },
            .{ .resource = .wood, .amount = 0 },
            .{ .resource = .wood, .amount = 0 },
        },
        .input_count = 2,
    },
    // Pickaxe: 3 stone + 2 wood
    .{
        .result_type = .{ .tool = .pickaxe },
        .base_durability = 120,
        .craft_time = 15,
        .skill_required = 10,
        .inputs = .{
            .{ .resource = .stone, .amount = 3 },
            .{ .resource = .wood, .amount = 2 },
            .{ .resource = .wood, .amount = 0 },
            .{ .resource = .wood, .amount = 0 },
        },
        .input_count = 2,
    },
    // Hoe: 1 stone + 2 wood
    .{
        .result_type = .{ .tool = .hoe },
        .base_durability = 80,
        .craft_time = 8,
        .skill_required = 5,
        .inputs = .{
            .{ .resource = .stone, .amount = 1 },
            .{ .resource = .wood, .amount = 2 },
            .{ .resource = .wood, .amount = 0 },
            .{ .resource = .wood, .amount = 0 },
        },
        .input_count = 2,
    },

    // Weapons
    // Club: 2 wood
    .{
        .result_type = .{ .weapon = .club },
        .base_durability = 60,
        .craft_time = 5,
        .skill_required = 0,
        .inputs = .{
            .{ .resource = .wood, .amount = 2 },
            .{ .resource = .wood, .amount = 0 },
            .{ .resource = .wood, .amount = 0 },
            .{ .resource = .wood, .amount = 0 },
        },
        .input_count = 1,
    },
    // Spear: 2 wood + 1 stone
    .{
        .result_type = .{ .weapon = .spear },
        .base_durability = 80,
        .craft_time = 12,
        .skill_required = 15,
        .inputs = .{
            .{ .resource = .wood, .amount = 2 },
            .{ .resource = .stone, .amount = 1 },
            .{ .resource = .wood, .amount = 0 },
            .{ .resource = .wood, .amount = 0 },
        },
        .input_count = 2,
    },
    // Bow: 2 wood + 2 fiber
    .{
        .result_type = .{ .weapon = .bow },
        .base_durability = 70,
        .craft_time = 20,
        .skill_required = 25,
        .inputs = .{
            .{ .resource = .wood, .amount = 2 },
            .{ .resource = .fiber, .amount = 2 },
            .{ .resource = .wood, .amount = 0 },
            .{ .resource = .wood, .amount = 0 },
        },
        .input_count = 2,
    },
    // Sword: 3 metal + 1 wood
    .{
        .result_type = .{ .weapon = .sword },
        .base_durability = 150,
        .craft_time = 30,
        .skill_required = 50,
        .inputs = .{
            .{ .resource = .metal, .amount = 3 },
            .{ .resource = .wood, .amount = 1 },
            .{ .resource = .wood, .amount = 0 },
            .{ .resource = .wood, .amount = 0 },
        },
        .input_count = 2,
    },
    // Shield: 3 wood + 1 metal
    .{
        .result_type = .{ .weapon = .shield },
        .base_durability = 120,
        .craft_time = 25,
        .skill_required = 30,
        .inputs = .{
            .{ .resource = .wood, .amount = 3 },
            .{ .resource = .metal, .amount = 1 },
            .{ .resource = .wood, .amount = 0 },
            .{ .resource = .wood, .amount = 0 },
        },
        .input_count = 2,
    },

    // Armor
    // Hide armor: 3 hide
    .{
        .result_type = .{ .armor = .hide_armor },
        .base_durability = 80,
        .craft_time = 15,
        .skill_required = 10,
        .inputs = .{
            .{ .resource = .hide, .amount = 3 },
            .{ .resource = .hide, .amount = 0 },
            .{ .resource = .hide, .amount = 0 },
            .{ .resource = .hide, .amount = 0 },
        },
        .input_count = 1,
    },
    // Bone armor: 5 bone + 2 hide
    .{
        .result_type = .{ .armor = .bone_armor },
        .base_durability = 100,
        .craft_time = 25,
        .skill_required = 35,
        .inputs = .{
            .{ .resource = .bone, .amount = 5 },
            .{ .resource = .hide, .amount = 2 },
            .{ .resource = .hide, .amount = 0 },
            .{ .resource = .hide, .amount = 0 },
        },
        .input_count = 2,
    },
    // Metal armor: 5 metal + 2 cloth
    .{
        .result_type = .{ .armor = .metal_armor },
        .base_durability = 200,
        .craft_time = 45,
        .skill_required = 60,
        .inputs = .{
            .{ .resource = .metal, .amount = 5 },
            .{ .resource = .cloth, .amount = 2 },
            .{ .resource = .hide, .amount = 0 },
            .{ .resource = .hide, .amount = 0 },
        },
        .input_count = 2,
    },
};

/// Crafting manager
pub const CraftingManager = struct {
    items: []CraftedItem,
    count: usize,
    capacity: usize,
    allocator: std.mem.Allocator,

    // Crafting in progress
    active_crafts: []ActiveCraft,
    active_craft_count: usize,

    pub const ActiveCraft = struct {
        recipe_index: u8,
        crafter_id: u32,
        progress: f32, // 0-100
        quality: Quality,
    };

    pub fn init(allocator: std.mem.Allocator, capacity: usize) !CraftingManager {
        return .{
            .items = try allocator.alloc(CraftedItem, capacity),
            .count = 0,
            .capacity = capacity,
            .allocator = allocator,
            .active_crafts = try allocator.alloc(ActiveCraft, 64),
            .active_craft_count = 0,
        };
    }

    pub fn deinit(self: *CraftingManager) void {
        self.allocator.free(self.items);
        self.allocator.free(self.active_crafts);
    }

    /// Start crafting an item
    pub fn startCraft(
        self: *CraftingManager,
        recipe_index: u8,
        crafter_id: u32,
        skill: f32,
        inventory: *resource.Inventory,
        rng: *math.Rng,
    ) !void {
        if (self.active_craft_count >= 64) return error.TooManyCrafts;
        if (recipe_index >= ITEM_RECIPES.len) return error.InvalidRecipe;

        const recipe = &ITEM_RECIPES[recipe_index];

        // Check and consume resources
        for (recipe.inputs[0..recipe.input_count]) |input| {
            if (!inventory.has(input.resource, input.amount)) {
                return error.InsufficientResources;
            }
        }

        for (recipe.inputs[0..recipe.input_count]) |input| {
            _ = inventory.remove(input.resource, input.amount);
        }

        // Determine quality based on skill
        const quality = recipe.determineQuality(skill, rng);

        // Add to active crafts
        self.active_crafts[self.active_craft_count] = .{
            .recipe_index = recipe_index,
            .crafter_id = crafter_id,
            .progress = 0,
            .quality = quality,
        };
        self.active_craft_count += 1;
    }

    /// Update active crafts
    pub fn update(self: *CraftingManager, delta: f32) void {
        var i: usize = 0;
        while (i < self.active_craft_count) {
            const craft = &self.active_crafts[i];
            const recipe = &ITEM_RECIPES[craft.recipe_index];

            craft.progress += (100.0 / recipe.craft_time) * delta;

            if (craft.progress >= 100.0) {
                // Crafting complete - create item
                if (self.count < self.capacity) {
                    const durability = recipe.base_durability * craft.quality.getMultiplier();
                    self.items[self.count] = .{
                        .item_type = recipe.result_type,
                        .quality = craft.quality,
                        .durability = durability,
                        .max_durability = durability,
                        .owner_id = craft.crafter_id,
                        .equipped = false,
                    };
                    self.count += 1;
                }

                // Remove from active crafts
                self.active_crafts[i] = self.active_crafts[self.active_craft_count - 1];
                self.active_craft_count -= 1;
            } else {
                i += 1;
            }
        }
    }

    /// Get items owned by an organism
    pub fn getItemsForOwner(self: *const CraftingManager, owner_id: u32, buffer: []u32) usize {
        var found: usize = 0;
        for (self.items[0..self.count], 0..) |item, idx| {
            if (item.owner_id == owner_id and !item.isBroken() and found < buffer.len) {
                buffer[found] = @intCast(idx);
                found += 1;
            }
        }
        return found;
    }

    /// Get total damage bonus for an organism (from equipped weapons)
    pub fn getDamageBonusForOwner(self: *const CraftingManager, owner_id: u32) f32 {
        var total: f32 = 0;
        for (self.items[0..self.count]) |item| {
            if (item.owner_id == owner_id and item.equipped and !item.isBroken()) {
                total += item.getDamageBonus();
            }
        }
        return total;
    }

    /// Get total defense bonus for an organism (from equipped armor/shields)
    pub fn getDefenseBonusForOwner(self: *const CraftingManager, owner_id: u32) f32 {
        var total: f32 = 0;
        for (self.items[0..self.count]) |item| {
            if (item.owner_id == owner_id and item.equipped and !item.isBroken()) {
                total += item.getDefenseBonus();
            }
        }
        return total;
    }
};

// Tests
test "CraftedItem damage bonus" {
    const sword = CraftedItem{
        .item_type = .{ .weapon = .sword },
        .quality = .fine,
        .durability = 100,
        .max_durability = 100,
        .owner_id = 0,
        .equipped = true,
    };

    const damage = sword.getDamageBonus();
    try std.testing.expectApproxEqRel(@as(f32, 26.0), damage, 0.01); // 20 * 1.3
}

test "CraftingManager workflow" {
    var rng = math.Rng.init(42);
    var mgr = try CraftingManager.init(std.testing.allocator, 100);
    defer mgr.deinit();

    var inventory = resource.Inventory.init(100);
    _ = inventory.add(.wood, 10);
    _ = inventory.add(.stone, 10);

    // Start crafting a hand axe
    try mgr.startCraft(0, 1, 50.0, &inventory, &rng);
    try std.testing.expectEqual(@as(usize, 1), mgr.active_craft_count);

    // Resources should be consumed
    try std.testing.expectEqual(@as(f32, 9), inventory.get(.wood));
    try std.testing.expectEqual(@as(f32, 8), inventory.get(.stone));

    // Update until complete
    for (0..15) |_| {
        mgr.update(1.0);
    }

    // Item should be created
    try std.testing.expectEqual(@as(usize, 1), mgr.count);
    try std.testing.expectEqual(@as(usize, 0), mgr.active_craft_count);
}
