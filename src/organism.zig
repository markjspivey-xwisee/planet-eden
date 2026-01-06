// Organism management with Structure of Arrays (SoA) layout
// Optimized for SIMD operations and cache efficiency

const std = @import("std");
const math = @import("math.zig");
const nn = @import("neural_network.zig");

/// Organism type enum
pub const OrganismType = enum(u8) {
    plant = 0,
    herbivore = 1,
    carnivore = 2,
    humanoid = 3,
};

/// Structure of Arrays for optimal cache usage and SIMD operations
pub const Organisms = struct {
    // Position data (separate arrays for SIMD)
    positions_x: []f32,
    positions_y: []f32,
    positions_z: []f32,

    // Velocity data
    velocities_x: []f32,
    velocities_y: []f32,
    velocities_z: []f32,

    // Organism stats
    energies: []f32,
    healths: []f32,
    ages: []f32,
    sizes: []f32,

    // Type and tribe info
    types: []u8, // OrganismType
    tribe_ids: []u32,
    equipment_ids: []u32, // Index into equipment array

    // Neural networks (one per organism)
    brains: []?*nn.NeuralNetwork,

    // Flags
    alive: []bool,
    is_attacking: []bool,
    is_eating: []bool,

    // Reproduction cooldown
    reproduction_cooldowns: []f32,

    count: usize,
    capacity: usize,
    allocator: std.mem.Allocator,

    /// Initialize organism container
    pub fn init(allocator: std.mem.Allocator, capacity: usize) !Organisms {
        return .{
            .positions_x = try allocator.alloc(f32, capacity),
            .positions_y = try allocator.alloc(f32, capacity),
            .positions_z = try allocator.alloc(f32, capacity),
            .velocities_x = try allocator.alloc(f32, capacity),
            .velocities_y = try allocator.alloc(f32, capacity),
            .velocities_z = try allocator.alloc(f32, capacity),
            .energies = try allocator.alloc(f32, capacity),
            .healths = try allocator.alloc(f32, capacity),
            .ages = try allocator.alloc(f32, capacity),
            .sizes = try allocator.alloc(f32, capacity),
            .types = try allocator.alloc(u8, capacity),
            .tribe_ids = try allocator.alloc(u32, capacity),
            .equipment_ids = try allocator.alloc(u32, capacity),
            .brains = try allocator.alloc(?*nn.NeuralNetwork, capacity),
            .alive = try allocator.alloc(bool, capacity),
            .is_attacking = try allocator.alloc(bool, capacity),
            .is_eating = try allocator.alloc(bool, capacity),
            .reproduction_cooldowns = try allocator.alloc(f32, capacity),
            .count = 0,
            .capacity = capacity,
            .allocator = allocator,
        };
    }

    pub fn deinit(self: *Organisms) void {
        // Free neural networks
        for (self.brains[0..self.count]) |maybe_brain| {
            if (maybe_brain) |brain| {
                brain.deinit();
                self.allocator.destroy(brain);
            }
        }

        // Free arrays
        self.allocator.free(self.positions_x);
        self.allocator.free(self.positions_y);
        self.allocator.free(self.positions_z);
        self.allocator.free(self.velocities_x);
        self.allocator.free(self.velocities_y);
        self.allocator.free(self.velocities_z);
        self.allocator.free(self.energies);
        self.allocator.free(self.healths);
        self.allocator.free(self.ages);
        self.allocator.free(self.sizes);
        self.allocator.free(self.types);
        self.allocator.free(self.tribe_ids);
        self.allocator.free(self.equipment_ids);
        self.allocator.free(self.brains);
        self.allocator.free(self.alive);
        self.allocator.free(self.is_attacking);
        self.allocator.free(self.is_eating);
        self.allocator.free(self.reproduction_cooldowns);
    }

    /// Spawn a new organism
    pub fn spawn(
        self: *Organisms,
        org_type: OrganismType,
        pos: math.Vec3,
        tribe_id: u32,
        rng: *math.Rng,
    ) !u32 {
        if (self.count >= self.capacity) return error.OutOfCapacity;

        const idx = self.count;
        self.count += 1;

        // Set position
        self.positions_x[idx] = pos.x;
        self.positions_y[idx] = pos.y;
        self.positions_z[idx] = pos.z;

        // Zero velocity
        self.velocities_x[idx] = 0;
        self.velocities_y[idx] = 0;
        self.velocities_z[idx] = 0;

        // Set stats based on type with random variation for genetic diversity
        switch (org_type) {
            .plant => {
                // Plants: no brain, no variation needed (they're environment)
                self.energies[idx] = 50.0;
                self.healths[idx] = 30.0;
                self.sizes[idx] = 0.3 + rng.float() * 0.4; // 0.3-0.7 size variation
                self.brains[idx] = null; // Plants don't have brains
            },
            .herbivore => {
                // Herbivores: variation in size affects energy/health
                const size_var = 0.8 + rng.float() * 0.4; // 0.8-1.2 multiplier
                self.energies[idx] = 80.0 + rng.float() * 40.0; // 80-120 starting energy
                self.healths[idx] = 60.0 + rng.float() * 40.0; // 60-100 health
                self.sizes[idx] = 1.0 * size_var;
                self.brains[idx] = try self.createBrain(rng);
            },
            .carnivore => {
                // Carnivores: larger variation, some are bigger/stronger
                const size_var = 0.7 + rng.float() * 0.6; // 0.7-1.3 multiplier
                self.energies[idx] = 100.0 + rng.float() * 40.0; // 100-140 energy
                self.healths[idx] = 80.0 + rng.float() * 40.0; // 80-120 health
                self.sizes[idx] = 1.5 * size_var;
                self.brains[idx] = try self.createBrain(rng);
            },
            .humanoid => {
                // Humanoids: moderate variation, some stronger/weaker
                const size_var = 0.85 + rng.float() * 0.3; // 0.85-1.15 multiplier
                self.energies[idx] = 90.0 + rng.float() * 30.0; // 90-120 energy
                self.healths[idx] = 80.0 + rng.float() * 40.0; // 80-120 health
                self.sizes[idx] = 1.8 * size_var;
                self.brains[idx] = try self.createBrain(rng);
            },
        }

        self.ages[idx] = 0;
        self.types[idx] = @intFromEnum(org_type);
        self.tribe_ids[idx] = tribe_id;
        self.equipment_ids[idx] = 0; // No equipment
        self.alive[idx] = true;
        self.is_attacking[idx] = false;
        self.is_eating[idx] = false;
        self.reproduction_cooldowns[idx] = 0;

        return @intCast(idx);
    }

    /// Create a neural network for an organism
    fn createBrain(self: *Organisms, rng: *math.Rng) !*nn.NeuralNetwork {
        const brain = try self.allocator.create(nn.NeuralNetwork);
        brain.* = try nn.NeuralNetwork.init(self.allocator, 15, 12, 17, rng);
        return brain;
    }

    /// Get position as Vec3
    pub fn getPosition(self: *const Organisms, idx: usize) math.Vec3 {
        return math.Vec3.init(
            self.positions_x[idx],
            self.positions_y[idx],
            self.positions_z[idx],
        );
    }

    /// Set position from Vec3
    pub fn setPosition(self: *Organisms, idx: usize, pos: math.Vec3) void {
        self.positions_x[idx] = pos.x;
        self.positions_y[idx] = pos.y;
        self.positions_z[idx] = pos.z;
    }

    /// Get velocity as Vec3
    pub fn getVelocity(self: *const Organisms, idx: usize) math.Vec3 {
        return math.Vec3.init(
            self.velocities_x[idx],
            self.velocities_y[idx],
            self.velocities_z[idx],
        );
    }

    /// Set velocity from Vec3
    pub fn setVelocity(self: *Organisms, idx: usize, vel: math.Vec3) void {
        self.velocities_x[idx] = vel.x;
        self.velocities_y[idx] = vel.y;
        self.velocities_z[idx] = vel.z;
    }

    /// Update all organisms (physics, aging, etc.)
    pub fn update(self: *Organisms, delta: f32) void {
        for (0..self.count) |i| {
            if (!self.alive[i]) continue;

            // Update age
            self.ages[i] += delta;

            // Update reproduction cooldown
            if (self.reproduction_cooldowns[i] > 0) {
                self.reproduction_cooldowns[i] -= delta;
            }

            // Drain energy over time (reduced rate for longer survival)
            self.energies[i] -= delta * 0.1;

            // Die if no energy or health
            if (self.energies[i] <= 0 or self.healths[i] <= 0) {
                self.alive[i] = false;
                continue;
            }

            // Update position based on velocity
            self.positions_x[i] += self.velocities_x[i] * delta;
            self.positions_y[i] += self.velocities_y[i] * delta;
            self.positions_z[i] += self.velocities_z[i] * delta;

            // Clamp to world bounds (-100 to 100)
            self.positions_x[i] = math.clamp(self.positions_x[i], -100, 100);
            self.positions_y[i] = math.clamp(self.positions_y[i], 0, 50);
            self.positions_z[i] = math.clamp(self.positions_z[i], -100, 100);

            // Apply friction
            self.velocities_x[i] *= 0.95;
            self.velocities_y[i] *= 0.95;
            self.velocities_z[i] *= 0.95;
        }
    }

    /// Get organism count (alive only)
    pub fn getAliveCount(self: *const Organisms) usize {
        var count: usize = 0;
        for (self.alive[0..self.count]) |is_alive| {
            if (is_alive) count += 1;
        }
        return count;
    }

    /// Compact dead organisms (remove from arrays)
    pub fn compact(self: *Organisms) void {
        var write_idx: usize = 0;
        for (0..self.count) |read_idx| {
            if (self.alive[read_idx]) {
                if (write_idx != read_idx) {
                    // Copy data
                    self.positions_x[write_idx] = self.positions_x[read_idx];
                    self.positions_y[write_idx] = self.positions_y[read_idx];
                    self.positions_z[write_idx] = self.positions_z[read_idx];
                    self.velocities_x[write_idx] = self.velocities_x[read_idx];
                    self.velocities_y[write_idx] = self.velocities_y[read_idx];
                    self.velocities_z[write_idx] = self.velocities_z[read_idx];
                    self.energies[write_idx] = self.energies[read_idx];
                    self.healths[write_idx] = self.healths[read_idx];
                    self.ages[write_idx] = self.ages[read_idx];
                    self.sizes[write_idx] = self.sizes[read_idx];
                    self.types[write_idx] = self.types[read_idx];
                    self.tribe_ids[write_idx] = self.tribe_ids[read_idx];
                    self.equipment_ids[write_idx] = self.equipment_ids[read_idx];
                    self.brains[write_idx] = self.brains[read_idx];
                    self.alive[write_idx] = self.alive[read_idx];
                    self.is_attacking[write_idx] = self.is_attacking[read_idx];
                    self.is_eating[write_idx] = self.is_eating[read_idx];
                    self.reproduction_cooldowns[write_idx] = self.reproduction_cooldowns[read_idx];
                }
                write_idx += 1;
            } else {
                // Free brain of dead organism
                if (self.brains[read_idx]) |brain| {
                    brain.deinit();
                    self.allocator.destroy(brain);
                    self.brains[read_idx] = null;
                }
            }
        }
        self.count = write_idx;
    }
};

// Tests
test "Organisms creation and spawn" {
    var rng = math.Rng.init(42);
    var organisms = try Organisms.init(std.testing.allocator, 100);
    defer organisms.deinit();

    try std.testing.expectEqual(@as(usize, 0), organisms.count);

    const idx = try organisms.spawn(
        .humanoid,
        math.Vec3.init(10, 5, 10),
        1,
        &rng,
    );

    try std.testing.expectEqual(@as(u32, 0), idx);
    try std.testing.expectEqual(@as(usize, 1), organisms.count);
    try std.testing.expect(organisms.alive[0]);
    try std.testing.expectEqual(@as(u8, @intFromEnum(OrganismType.humanoid)), organisms.types[0]);
}

test "Organisms update and death" {
    var rng = math.Rng.init(42);
    var organisms = try Organisms.init(std.testing.allocator, 100);
    defer organisms.deinit();

    _ = try organisms.spawn(.herbivore, math.Vec3.init(0, 5, 0), 0, &rng);

    // Drain energy until death
    for (0..300) |_| {
        organisms.update(1.0);
    }

    try std.testing.expect(!organisms.alive[0]);
}
