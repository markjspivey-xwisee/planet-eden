// Resource system for gathering, storing, and using resources
// Resources are used for building, crafting, and survival

const std = @import("std");
const math = @import("math.zig");

/// Types of resources that can be gathered
pub const ResourceType = enum(u8) {
    // Natural resources
    wood = 0,
    stone = 1,
    fiber = 2, // From plants, for rope/cloth
    food = 3,
    water = 4,

    // Processed resources
    plank = 5, // Processed wood
    brick = 6, // Processed stone
    rope = 7, // Processed fiber
    cloth = 8,
    tool = 9,
    weapon = 10,

    // Special resources
    seed = 11, // For planting
    hide = 12, // From animals
    bone = 13,
    metal = 14, // Rare, from specific locations
};

/// Resource drop from a source
pub const ResourceDrop = struct {
    resource_type: ResourceType,
    amount: f32,
    chance: f32, // 0-1 probability

    pub fn roll(self: ResourceDrop, rng: *math.Rng) ?f32 {
        if (rng.float() < self.chance) {
            return self.amount * (0.8 + rng.float() * 0.4); // 80-120% of base
        }
        return null;
    }
};

/// Inventory for organisms/buildings
pub const Inventory = struct {
    resources: [16]f32, // Amount of each ResourceType
    capacity: f32, // Max total resources

    pub fn init(capacity: f32) Inventory {
        return .{
            .resources = [_]f32{0} ** 16,
            .capacity = capacity,
        };
    }

    /// Get current total resources
    pub fn getTotal(self: *const Inventory) f32 {
        var total: f32 = 0;
        for (self.resources) |amount| {
            total += amount;
        }
        return total;
    }

    /// Get remaining capacity
    pub fn getRemaining(self: *const Inventory) f32 {
        return self.capacity - self.getTotal();
    }

    /// Add resources, returns amount actually added
    pub fn add(self: *Inventory, resource: ResourceType, amount: f32) f32 {
        const remaining = self.getRemaining();
        const to_add = @min(amount, remaining);
        self.resources[@intFromEnum(resource)] += to_add;
        return to_add;
    }

    /// Remove resources, returns amount actually removed
    pub fn remove(self: *Inventory, resource: ResourceType, amount: f32) f32 {
        const idx = @intFromEnum(resource);
        const available = self.resources[idx];
        const to_remove = @min(amount, available);
        self.resources[idx] -= to_remove;
        return to_remove;
    }

    /// Check if has enough of a resource
    pub fn has(self: *const Inventory, resource: ResourceType, amount: f32) bool {
        return self.resources[@intFromEnum(resource)] >= amount;
    }

    /// Get amount of a resource
    pub fn get(self: *const Inventory, resource: ResourceType) f32 {
        return self.resources[@intFromEnum(resource)];
    }

    /// Transfer resources to another inventory
    pub fn transferTo(self: *Inventory, other: *Inventory, resource: ResourceType, amount: f32) f32 {
        const removed = self.remove(resource, amount);
        const added = other.add(resource, removed);
        // Return any excess back
        if (added < removed) {
            _ = self.add(resource, removed - added);
        }
        return added;
    }

    /// Pack inventory for export (just the amounts)
    pub fn pack(self: *const Inventory) [16]u16 {
        var result: [16]u16 = undefined;
        for (self.resources, 0..) |amount, i| {
            result[i] = @intFromFloat(@min(amount, 65535));
        }
        return result;
    }
};

/// Recipe for crafting items
pub const Recipe = struct {
    inputs: [4]RecipeInput, // Up to 4 input resources
    input_count: u8,
    output_type: ResourceType,
    output_amount: f32,
    craft_time: f32, // Time to craft in seconds

    pub const RecipeInput = struct {
        resource: ResourceType,
        amount: f32,
    };

    /// Check if can craft with given inventory
    pub fn canCraft(self: *const Recipe, inventory: *const Inventory) bool {
        for (self.inputs[0..self.input_count]) |input| {
            if (!inventory.has(input.resource, input.amount)) {
                return false;
            }
        }
        return true;
    }

    /// Consume inputs from inventory (call after canCraft check)
    pub fn consumeInputs(self: *const Recipe, inventory: *Inventory) void {
        for (self.inputs[0..self.input_count]) |input| {
            _ = inventory.remove(input.resource, input.amount);
        }
    }
};

/// Standard recipes
pub const RECIPES = [_]Recipe{
    // Plank: 2 wood -> 4 planks
    .{
        .inputs = .{
            .{ .resource = .wood, .amount = 2 },
            .{ .resource = .wood, .amount = 0 }, // Unused
            .{ .resource = .wood, .amount = 0 },
            .{ .resource = .wood, .amount = 0 },
        },
        .input_count = 1,
        .output_type = .plank,
        .output_amount = 4,
        .craft_time = 5,
    },
    // Rope: 3 fiber -> 1 rope
    .{
        .inputs = .{
            .{ .resource = .fiber, .amount = 3 },
            .{ .resource = .fiber, .amount = 0 },
            .{ .resource = .fiber, .amount = 0 },
            .{ .resource = .fiber, .amount = 0 },
        },
        .input_count = 1,
        .output_type = .rope,
        .output_amount = 1,
        .craft_time = 3,
    },
    // Tool: 2 wood + 1 stone -> 1 tool
    .{
        .inputs = .{
            .{ .resource = .wood, .amount = 2 },
            .{ .resource = .stone, .amount = 1 },
            .{ .resource = .wood, .amount = 0 },
            .{ .resource = .wood, .amount = 0 },
        },
        .input_count = 2,
        .output_type = .tool,
        .output_amount = 1,
        .craft_time = 10,
    },
    // Weapon: 1 wood + 2 stone + 1 rope -> 1 weapon
    .{
        .inputs = .{
            .{ .resource = .wood, .amount = 1 },
            .{ .resource = .stone, .amount = 2 },
            .{ .resource = .rope, .amount = 1 },
            .{ .resource = .wood, .amount = 0 },
        },
        .input_count = 3,
        .output_type = .weapon,
        .output_amount = 1,
        .craft_time = 15,
    },
    // Cloth: 4 fiber -> 1 cloth
    .{
        .inputs = .{
            .{ .resource = .fiber, .amount = 4 },
            .{ .resource = .fiber, .amount = 0 },
            .{ .resource = .fiber, .amount = 0 },
            .{ .resource = .fiber, .amount = 0 },
        },
        .input_count = 1,
        .output_type = .cloth,
        .output_amount = 1,
        .craft_time = 8,
    },
    // Brick: 3 stone + 1 water -> 2 brick
    .{
        .inputs = .{
            .{ .resource = .stone, .amount = 3 },
            .{ .resource = .water, .amount = 1 },
            .{ .resource = .stone, .amount = 0 },
            .{ .resource = .stone, .amount = 0 },
        },
        .input_count = 2,
        .output_type = .brick,
        .output_amount = 2,
        .craft_time = 20,
    },
};

/// Resource node in the world (stone deposits, water sources, etc.)
pub const ResourceNode = struct {
    position: math.Vec3,
    resource_type: ResourceType,
    amount: f32,
    max_amount: f32,
    regen_rate: f32, // Amount regenerated per second

    pub fn init(pos: math.Vec3, resource: ResourceType, amount: f32, regen: f32) ResourceNode {
        return .{
            .position = pos,
            .resource_type = resource,
            .amount = amount,
            .max_amount = amount,
            .regen_rate = regen,
        };
    }

    pub fn update(self: *ResourceNode, delta: f32) void {
        if (self.amount < self.max_amount) {
            self.amount = @min(self.max_amount, self.amount + self.regen_rate * delta);
        }
    }

    pub fn harvest(self: *ResourceNode, amount: f32) f32 {
        const harvested = @min(amount, self.amount);
        self.amount -= harvested;
        return harvested;
    }
};

/// Resource nodes container
pub const ResourceNodes = struct {
    nodes: []ResourceNode,
    count: usize,
    capacity: usize,
    allocator: std.mem.Allocator,

    pub fn init(allocator: std.mem.Allocator, capacity: usize) !ResourceNodes {
        return .{
            .nodes = try allocator.alloc(ResourceNode, capacity),
            .count = 0,
            .capacity = capacity,
            .allocator = allocator,
        };
    }

    pub fn deinit(self: *ResourceNodes) void {
        self.allocator.free(self.nodes);
    }

    pub fn add(self: *ResourceNodes, node: ResourceNode) !usize {
        if (self.count >= self.capacity) return error.OutOfCapacity;
        const idx = self.count;
        self.nodes[idx] = node;
        self.count += 1;
        return idx;
    }

    pub fn update(self: *ResourceNodes, delta: f32) void {
        for (self.nodes[0..self.count]) |*node| {
            node.update(delta);
        }
    }

    /// Find nearest node of given type within radius
    pub fn findNearest(self: *const ResourceNodes, pos: math.Vec3, resource: ResourceType, radius: f32) ?usize {
        var best_idx: ?usize = null;
        var best_dist: f32 = radius;

        for (self.nodes[0..self.count], 0..) |node, i| {
            if (node.resource_type == resource and node.amount > 0) {
                const dist = pos.distance(node.position);
                if (dist < best_dist) {
                    best_dist = dist;
                    best_idx = i;
                }
            }
        }

        return best_idx;
    }
};

// Tests
test "Inventory operations" {
    var inv = Inventory.init(100);

    try std.testing.expectEqual(@as(f32, 100), inv.getRemaining());

    const added = inv.add(.wood, 50);
    try std.testing.expectEqual(@as(f32, 50), added);
    try std.testing.expectEqual(@as(f32, 50), inv.get(.wood));
    try std.testing.expectEqual(@as(f32, 50), inv.getRemaining());

    const removed = inv.remove(.wood, 30);
    try std.testing.expectEqual(@as(f32, 30), removed);
    try std.testing.expectEqual(@as(f32, 20), inv.get(.wood));
}

test "Recipe crafting" {
    var inv = Inventory.init(100);
    _ = inv.add(.wood, 10);
    _ = inv.add(.stone, 5);

    const tool_recipe = RECIPES[2]; // Tool recipe

    try std.testing.expect(tool_recipe.canCraft(&inv));

    tool_recipe.consumeInputs(&inv);
    try std.testing.expectEqual(@as(f32, 8), inv.get(.wood));
    try std.testing.expectEqual(@as(f32, 4), inv.get(.stone));
}
