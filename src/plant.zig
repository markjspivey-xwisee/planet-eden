// Plant system with varieties, growth stages, and genetics
// Supports grass, trees, bushes, flowers, and crops

const std = @import("std");
const math = @import("math.zig");

/// Plant variety types
pub const PlantType = enum(u8) {
    grass = 0,
    tree = 1,
    bush = 2,
    flower = 3,
    crop = 4,
};

/// Growth stages for plants
pub const GrowthStage = enum(u8) {
    seed = 0,
    sprout = 1,
    juvenile = 2,
    mature = 3,
    flowering = 4,
    fruiting = 5,
    dying = 6,
};

/// Plant genetics - determines appearance and behavior
pub const PlantGenetics = struct {
    // Growth characteristics
    growth_rate: f32, // 0.5 - 2.0 multiplier
    max_size: f32, // 0.5 - 3.0 multiplier
    lifespan: f32, // Base lifespan multiplier

    // Reproduction
    seed_production: f32, // Seeds per flowering cycle
    seed_spread: f32, // How far seeds spread

    // Appearance genes (0-1 values)
    color_hue: f32, // Base color hue shift
    color_saturation: f32,
    leaf_density: f32,
    trunk_thickness: f32, // For trees

    // Environmental adaptation
    drought_resistance: f32,
    cold_resistance: f32,

    // Resource production
    food_value: f32,
    wood_value: f32,

    /// Create random genetics
    pub fn random(rng: *math.Rng) PlantGenetics {
        return .{
            .growth_rate = 0.5 + rng.float() * 1.5,
            .max_size = 0.5 + rng.float() * 2.5,
            .lifespan = 0.5 + rng.float() * 1.5,
            .seed_production = 1.0 + rng.float() * 4.0,
            .seed_spread = 5.0 + rng.float() * 15.0,
            .color_hue = rng.float(),
            .color_saturation = 0.3 + rng.float() * 0.7,
            .leaf_density = 0.3 + rng.float() * 0.7,
            .trunk_thickness = 0.5 + rng.float() * 1.0,
            .drought_resistance = rng.float(),
            .cold_resistance = rng.float(),
            .food_value = 0.5 + rng.float() * 1.5,
            .wood_value = 0.5 + rng.float() * 1.5,
        };
    }

    /// Create genetics for specific plant type with sensible defaults
    pub fn forType(plant_type: PlantType, rng: *math.Rng) PlantGenetics {
        var genetics = random(rng);

        switch (plant_type) {
            .grass => {
                genetics.max_size = 0.2 + rng.float() * 0.3;
                genetics.growth_rate = 1.5 + rng.float() * 0.5;
                genetics.lifespan = 0.3 + rng.float() * 0.3;
                genetics.wood_value = 0;
                genetics.food_value = 0.2 + rng.float() * 0.3;
            },
            .tree => {
                genetics.max_size = 2.0 + rng.float() * 2.0;
                genetics.growth_rate = 0.3 + rng.float() * 0.4;
                genetics.lifespan = 2.0 + rng.float() * 2.0;
                genetics.wood_value = 1.5 + rng.float() * 1.5;
                genetics.food_value = 0.5 + rng.float() * 0.5; // Fruit
            },
            .bush => {
                genetics.max_size = 0.5 + rng.float() * 0.5;
                genetics.growth_rate = 0.8 + rng.float() * 0.4;
                genetics.lifespan = 1.0 + rng.float() * 0.5;
                genetics.wood_value = 0.3 + rng.float() * 0.3;
                genetics.food_value = 0.8 + rng.float() * 0.4; // Berries
            },
            .flower => {
                genetics.max_size = 0.2 + rng.float() * 0.2;
                genetics.growth_rate = 1.2 + rng.float() * 0.5;
                genetics.lifespan = 0.5 + rng.float() * 0.3;
                genetics.wood_value = 0;
                genetics.food_value = 0.1;
                genetics.color_saturation = 0.7 + rng.float() * 0.3; // Vibrant colors
            },
            .crop => {
                genetics.max_size = 0.4 + rng.float() * 0.4;
                genetics.growth_rate = 1.0 + rng.float() * 0.5;
                genetics.lifespan = 0.4 + rng.float() * 0.2;
                genetics.wood_value = 0.1;
                genetics.food_value = 1.5 + rng.float() * 1.0; // High food value
                genetics.seed_production = 3.0 + rng.float() * 3.0;
            },
        }

        return genetics;
    }

    /// Breed two plants to create offspring genetics
    pub fn breed(parent1: PlantGenetics, parent2: PlantGenetics, rng: *math.Rng) PlantGenetics {
        const mutation_rate: f32 = 0.1;
        const mutation_strength: f32 = 0.2;

        return .{
            .growth_rate = blendWithMutation(parent1.growth_rate, parent2.growth_rate, rng, mutation_rate, mutation_strength),
            .max_size = blendWithMutation(parent1.max_size, parent2.max_size, rng, mutation_rate, mutation_strength),
            .lifespan = blendWithMutation(parent1.lifespan, parent2.lifespan, rng, mutation_rate, mutation_strength),
            .seed_production = blendWithMutation(parent1.seed_production, parent2.seed_production, rng, mutation_rate, mutation_strength),
            .seed_spread = blendWithMutation(parent1.seed_spread, parent2.seed_spread, rng, mutation_rate, mutation_strength),
            .color_hue = blendWithMutation(parent1.color_hue, parent2.color_hue, rng, mutation_rate, mutation_strength),
            .color_saturation = blendWithMutation(parent1.color_saturation, parent2.color_saturation, rng, mutation_rate, mutation_strength),
            .leaf_density = blendWithMutation(parent1.leaf_density, parent2.leaf_density, rng, mutation_rate, mutation_strength),
            .trunk_thickness = blendWithMutation(parent1.trunk_thickness, parent2.trunk_thickness, rng, mutation_rate, mutation_strength),
            .drought_resistance = blendWithMutation(parent1.drought_resistance, parent2.drought_resistance, rng, mutation_rate, mutation_strength),
            .cold_resistance = blendWithMutation(parent1.cold_resistance, parent2.cold_resistance, rng, mutation_rate, mutation_strength),
            .food_value = blendWithMutation(parent1.food_value, parent2.food_value, rng, mutation_rate, mutation_strength),
            .wood_value = blendWithMutation(parent1.wood_value, parent2.wood_value, rng, mutation_rate, mutation_strength),
        };
    }

    /// Pack genetics into a compact format for export
    pub fn pack(self: PlantGenetics) PackedGenetics {
        return .{
            .growth_rate = @intFromFloat(math.clamp(self.growth_rate / 4.0, 0, 1) * 255),
            .max_size = @intFromFloat(math.clamp(self.max_size / 4.0, 0, 1) * 255),
            .lifespan = @intFromFloat(math.clamp(self.lifespan / 4.0, 0, 1) * 255),
            .color_hue = @intFromFloat(self.color_hue * 255),
            .color_saturation = @intFromFloat(self.color_saturation * 255),
            .leaf_density = @intFromFloat(self.leaf_density * 255),
            .food_value = @intFromFloat(math.clamp(self.food_value / 3.0, 0, 1) * 255),
            .wood_value = @intFromFloat(math.clamp(self.wood_value / 3.0, 0, 1) * 255),
        };
    }
};

/// Compact packed genetics for export to JS
pub const PackedGenetics = struct {
    growth_rate: u8,
    max_size: u8,
    lifespan: u8,
    color_hue: u8,
    color_saturation: u8,
    leaf_density: u8,
    food_value: u8,
    wood_value: u8,
};

/// Blend two values with possible mutation
fn blendWithMutation(v1: f32, v2: f32, rng: *math.Rng, mutation_rate: f32, mutation_strength: f32) f32 {
    // Random blend between parents
    const blend = rng.float();
    var result = v1 * blend + v2 * (1.0 - blend);

    // Apply mutation
    if (rng.float() < mutation_rate) {
        result += (rng.float() - 0.5) * 2.0 * mutation_strength * result;
    }

    return @max(0.01, result); // Ensure positive
}

/// Plant data stored in SoA format
pub const Plants = struct {
    // Plant type and stage
    plant_types: []u8, // PlantType
    growth_stages: []u8, // GrowthStage

    // Growth progress (0-1 for current stage)
    growth_progress: []f32,

    // Current size (affected by genetics and growth)
    current_sizes: []f32,

    // Age in simulation time
    ages: []f32,

    // Genetics index (into genetics array)
    genetics_indices: []u16,

    // Reproduction cooldown
    seed_cooldowns: []f32,

    // Genetics storage
    genetics: []PlantGenetics,
    genetics_count: usize,

    count: usize,
    capacity: usize,
    allocator: std.mem.Allocator,

    pub fn init(allocator: std.mem.Allocator, capacity: usize) !Plants {
        const genetics_capacity = capacity / 4; // Fewer unique genetics than plants

        return .{
            .plant_types = try allocator.alloc(u8, capacity),
            .growth_stages = try allocator.alloc(u8, capacity),
            .growth_progress = try allocator.alloc(f32, capacity),
            .current_sizes = try allocator.alloc(f32, capacity),
            .ages = try allocator.alloc(f32, capacity),
            .genetics_indices = try allocator.alloc(u16, capacity),
            .seed_cooldowns = try allocator.alloc(f32, capacity),
            .genetics = try allocator.alloc(PlantGenetics, genetics_capacity),
            .genetics_count = 0,
            .count = 0,
            .capacity = capacity,
            .allocator = allocator,
        };
    }

    pub fn deinit(self: *Plants) void {
        self.allocator.free(self.plant_types);
        self.allocator.free(self.growth_stages);
        self.allocator.free(self.growth_progress);
        self.allocator.free(self.current_sizes);
        self.allocator.free(self.ages);
        self.allocator.free(self.genetics_indices);
        self.allocator.free(self.seed_cooldowns);
        self.allocator.free(self.genetics);
    }

    /// Add new genetics and return index
    pub fn addGenetics(self: *Plants, gen: PlantGenetics) !u16 {
        if (self.genetics_count >= self.genetics.len) return error.OutOfCapacity;
        const idx = self.genetics_count;
        self.genetics[idx] = gen;
        self.genetics_count += 1;
        return @intCast(idx);
    }

    /// Get genetics for a plant
    pub fn getGenetics(self: *const Plants, plant_idx: usize) PlantGenetics {
        return self.genetics[self.genetics_indices[plant_idx]];
    }

    /// Get growth time for current stage
    pub fn getStageTime(plant_type: PlantType, stage: GrowthStage) f32 {
        const base_times = switch (plant_type) {
            .grass => [_]f32{ 5, 10, 15, 30, 10, 20, 30 },
            .tree => [_]f32{ 20, 40, 100, 200, 50, 100, 150 },
            .bush => [_]f32{ 10, 20, 40, 80, 30, 50, 80 },
            .flower => [_]f32{ 5, 10, 20, 30, 20, 10, 20 },
            .crop => [_]f32{ 8, 15, 25, 40, 20, 30, 20 },
        };
        return base_times[@intFromEnum(stage)];
    }

    /// Get size multiplier for growth stage
    pub fn getStageSizeMultiplier(stage: GrowthStage) f32 {
        return switch (stage) {
            .seed => 0.1,
            .sprout => 0.2,
            .juvenile => 0.5,
            .mature => 1.0,
            .flowering => 1.0,
            .fruiting => 1.0,
            .dying => 0.8,
        };
    }
};

// Tests
test "PlantGenetics random" {
    var rng = math.Rng.init(42);
    const genetics = PlantGenetics.random(&rng);

    try std.testing.expect(genetics.growth_rate >= 0.5);
    try std.testing.expect(genetics.growth_rate <= 2.0);
}

test "PlantGenetics breeding" {
    var rng = math.Rng.init(42);
    const parent1 = PlantGenetics.random(&rng);
    const parent2 = PlantGenetics.random(&rng);
    const child = PlantGenetics.breed(parent1, parent2, &rng);

    // Child should have values somewhere between parents (mostly)
    try std.testing.expect(child.growth_rate > 0);
}
