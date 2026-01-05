// Main simulation loop - coordinates all systems
// This is the heart of the Planet Eden simulation

const std = @import("std");
const math = @import("math.zig");
const organism = @import("organism.zig");
const spatial_grid = @import("spatial_grid.zig");
const tribe = @import("tribe.zig");
const building = @import("building.zig");
const equipment = @import("equipment.zig");
const message = @import("message.zig");
const nn = @import("neural_network.zig");

/// Main simulation state
pub const Simulation = struct {
    organisms: organism.Organisms,
    grid: spatial_grid.SpatialGrid,
    tribes: tribe.Tribes,
    buildings: building.Buildings,
    equipment_mgr: equipment.EquipmentManager,
    messages: message.MessageQueue,
    language_stats: message.LanguageStats,

    rng: math.Rng,
    time: f32,
    frame_count: u64,

    allocator: std.mem.Allocator,

    /// Initialize simulation
    pub fn init(allocator: std.mem.Allocator, seed: u32, max_organisms: usize) !Simulation {
        // Limit capacities to fit in constrained memory
        const org_cap = @min(max_organisms, 50);

        // Build piece by piece to avoid large stack frame
        var sim: Simulation = undefined;
        sim.allocator = allocator;
        sim.rng = math.Rng.init(seed);
        sim.time = 0;
        sim.frame_count = 0;

        sim.organisms = try organism.Organisms.init(allocator, org_cap);
        sim.grid = spatial_grid.SpatialGrid.init(allocator);
        sim.tribes = tribe.Tribes.init();
        sim.buildings = try building.Buildings.init(allocator, 30);
        sim.equipment_mgr = try equipment.EquipmentManager.init(allocator, 30);
        sim.messages = try message.MessageQueue.init(allocator, 50);
        sim.language_stats = message.LanguageStats.init();

        return sim;
    }

    pub fn deinit(self: *Simulation) void {
        self.organisms.deinit();
        self.grid.deinit();
        self.buildings.deinit();
        self.equipment_mgr.deinit();
        self.messages.deinit();
    }

    /// Main update loop
    pub fn update(self: *Simulation, delta: f32) void {
        self.time += delta;
        self.frame_count += 1;

        // Update subsystems
        self.updateSpatialGrid();
        self.updateOrganisms(delta);
        self.updateTribes(delta);
        self.updateBuildings(delta);
        self.updateEquipment(delta);
        self.updateMessages(delta);
        self.updateInteractions(delta);

        // Periodic cleanup
        if (self.frame_count % 600 == 0) { // Every 10 seconds at 60 FPS
            self.organisms.compact();
        }
    }

    /// Rebuild spatial grid with current organism positions
    fn updateSpatialGrid(self: *Simulation) void {
        self.grid.clear();

        for (0..self.organisms.count) |i| {
            if (!self.organisms.alive[i]) continue;

            const pos = self.organisms.getPosition(i);
            self.grid.insert(@intCast(i), pos) catch {};
        }
    }

    /// Update all organisms
    fn updateOrganisms(self: *Simulation, delta: f32) void {
        self.organisms.update(delta);

        // Update organism brains and behavior
        for (0..self.organisms.count) |i| {
            if (!self.organisms.alive[i]) continue;

            const org_type = @as(organism.OrganismType, @enumFromInt(self.organisms.types[i]));

            // Plants don't have brains
            if (org_type == .plant) continue;

            // Run neural network to get behavior
            if (self.organisms.brains[i]) |brain| {
                self.updateOrganismBehavior(i, brain, delta);
            }
        }
    }

    /// Update single organism behavior using neural network
    fn updateOrganismBehavior(self: *Simulation, idx: usize, brain: *nn.NeuralNetwork, _: f32) void {
        // Prepare inputs (15 values)
        var inputs: [15]f32 = undefined;
        var outputs: [17]f32 = undefined;
        var hidden: [12]f32 = undefined;

        // Get organism data
        const pos = self.organisms.getPosition(idx);
        const energy = self.organisms.energies[idx];
        const health = self.organisms.healths[idx];
        const my_type = @as(organism.OrganismType, @enumFromInt(self.organisms.types[idx]));
        const tribe_id = self.organisms.tribe_ids[idx];
        const has_tribe = tribe_id < self.tribes.count;

        // Normalize inputs
        inputs[0] = energy / 100.0;
        inputs[1] = health / 100.0;
        inputs[2] = pos.x / 100.0;
        inputs[3] = pos.y / 50.0;
        inputs[4] = pos.z / 100.0;

        // Find nearby organisms
        var nearby: [32]u32 = undefined;
        const nearby_count = self.grid.queryNeighbors(pos, &nearby);

        // Count food sources, threats, etc.
        var food_count: f32 = 0;
        var threat_count: f32 = 0;
        var ally_count: f32 = 0;

        for (nearby[0..nearby_count]) |other_idx| {
            if (other_idx == idx) continue;
            if (!self.organisms.alive[other_idx]) continue;

            const other_type = @as(organism.OrganismType, @enumFromInt(self.organisms.types[other_idx]));

            if (my_type == .herbivore and other_type == .plant) {
                food_count += 1;
            } else if (my_type == .carnivore and other_type == .herbivore) {
                food_count += 1;
            } else if (other_type == .carnivore and my_type != .carnivore) {
                threat_count += 1;
            } else if (self.organisms.tribe_ids[other_idx] == tribe_id and has_tribe) {
                ally_count += 1;
            }
        }

        inputs[5] = math.clamp(food_count / 5.0, 0, 1);
        inputs[6] = math.clamp(threat_count / 5.0, 0, 1);
        inputs[7] = math.clamp(ally_count / 10.0, 0, 1);
        inputs[8] = self.organisms.ages[idx] / 1000.0;
        inputs[9] = self.organisms.sizes[idx] / 2.0;
        inputs[10] = if (self.organisms.is_attacking[idx]) 1.0 else 0.0;
        inputs[11] = if (self.organisms.is_eating[idx]) 1.0 else 0.0;
        inputs[12] = self.rng.float(); // Random input for variation
        inputs[13] = @sin(self.time); // Temporal input
        inputs[14] = @cos(self.time); // Temporal input

        // Run neural network
        brain.predict(&inputs, &outputs, &hidden);

        // =====================================================
        // Apply outputs (17 total)
        // =====================================================
        // outputs[0-2] = movement direction
        // outputs[3] = speed multiplier
        // outputs[4] = eat action
        // outputs[5] = attack action
        // outputs[6-8] = build (trigger, type, distance)
        // outputs[9-11] = message (trigger, symbol1, symbol2)
        // outputs[12] = reproduce
        // outputs[13] = flee intensity
        // outputs[14] = gather resources
        // outputs[15] = share with tribe
        // outputs[16] = recruit/call allies

        // === MOVEMENT (outputs 0-3) ===
        const move_dir = math.Vec3.init(outputs[0], 0, outputs[2]).normalize();
        var speed = math.clamp(outputs[3], 0, 1) * 5.0;

        // Flee behavior (output 13) - boost speed away from threats
        if (outputs[13] > 0.3 and threat_count > 0) {
            speed *= 1.0 + outputs[13]; // Up to 2x speed when fleeing
        }

        var vel = move_dir.mul(speed);
        vel.y = self.organisms.velocities_y[idx] * 0.9;
        self.organisms.setVelocity(idx, vel);

        // === BASIC ACTIONS (outputs 4-5) ===
        self.organisms.is_eating[idx] = outputs[4] > 0.5;
        self.organisms.is_attacking[idx] = outputs[5] > 0.5;

        // === BUILDING (outputs 6-8) ===
        // Only humanoids with tribes can build
        if (outputs[6] > 0.7 and has_tribe and my_type == .humanoid) {
            // Map output[7] to building type (0-9)
            const building_type_idx = @as(u8, @intFromFloat(math.clamp((outputs[7] + 1.0) * 5.0, 0, 9)));
            const building_type = @as(building.BuildingType, @enumFromInt(building_type_idx));

            // Build at offset from current position
            const build_offset = (outputs[8] + 1.0) * 3.0; // 0-6 units away
            const build_pos = math.Vec3.init(
                pos.x + move_dir.x * build_offset,
                pos.y,
                pos.z + move_dir.z * build_offset,
            );

            // Try to create building (may fail due to resources/capacity)
            _ = self.buildings.create(building_type, tribe_id, build_pos, &self.tribes) catch {};
        }

        // === MESSAGING (outputs 9-11) ===
        if (outputs[9] > 0.5) {
            // Map outputs to symbol indices (0-29)
            const symbol1_idx = @as(u8, @intFromFloat(math.clamp((outputs[10] + 1.0) * 15.0, 0, 29)));
            const symbol2_idx = @as(u8, @intFromFloat(math.clamp((outputs[11] + 1.0) * 15.0, 0, 29)));

            const symbol1 = @as(message.Symbol, @enumFromInt(symbol1_idx));
            const symbol2 = @as(message.Symbol, @enumFromInt(symbol2_idx));

            // Send message to nearby organisms (receiver 0 = broadcast)
            self.messages.sendPair(@intCast(idx), 0, symbol1, symbol2) catch {};
        }

        // === REPRODUCTION (output 12) ===
        if (outputs[12] > 0.7 and self.organisms.reproduction_cooldowns[idx] <= 0) {
            // Need enough energy to reproduce
            if (energy > 60.0 and self.organisms.count < self.organisms.capacity) {
                // Find nearby ally of same type for reproduction
                for (nearby[0..nearby_count]) |other_idx| {
                    if (other_idx == idx) continue;
                    if (!self.organisms.alive[other_idx]) continue;

                    const other_type = @as(organism.OrganismType, @enumFromInt(self.organisms.types[other_idx]));
                    if (other_type != my_type) continue;

                    // Same tribe or both tribeless
                    const other_tribe = self.organisms.tribe_ids[other_idx];
                    if (has_tribe and other_tribe != tribe_id) continue;

                    // Spawn offspring near parent
                    const offspring_pos = math.Vec3.init(
                        pos.x + self.rng.range(-2, 2),
                        pos.y,
                        pos.z + self.rng.range(-2, 2),
                    );

                    _ = self.spawnOrganism(my_type, offspring_pos, tribe_id) catch {};

                    // Cost energy and set cooldown
                    self.organisms.energies[idx] -= 30.0;
                    self.organisms.reproduction_cooldowns[idx] = 60.0; // 60 second cooldown
                    break;
                }
            }
        }

        // === GATHER RESOURCES (output 14) ===
        // Humanoids can gather resources for their tribe
        if (outputs[14] > 0.5 and has_tribe and my_type == .humanoid) {
            if (self.tribes.getTribe(tribe_id)) |t| {
                // Passive resource gathering based on output strength
                const gather_rate = (outputs[14] + 1.0) * 0.05;
                t.food += gather_rate;
                t.wood += gather_rate * 0.5;
            }
        }

        // === SHARE WITH TRIBE (output 15) ===
        if (outputs[15] > 0.6 and has_tribe and energy > 50.0) {
            if (self.tribes.getTribe(tribe_id)) |t| {
                const share_amount: f32 = 2.0;
                self.organisms.energies[idx] -= share_amount;
                t.food += share_amount;
            }
        }

        // === RECRUIT (output 16) ===
        // Try to recruit nearby tribeless humanoids
        if (outputs[16] > 0.6 and has_tribe and my_type == .humanoid) {
            for (nearby[0..nearby_count]) |other_idx| {
                if (other_idx == idx) continue;
                if (!self.organisms.alive[other_idx]) continue;

                const other_type = @as(organism.OrganismType, @enumFromInt(self.organisms.types[other_idx]));
                if (other_type != .humanoid) continue;

                // Only recruit tribeless (tribe_id >= tribes.count means no tribe)
                if (self.organisms.tribe_ids[other_idx] < self.tribes.count) continue;

                // Recruit to our tribe
                self.organisms.tribe_ids[other_idx] = tribe_id;
                if (self.tribes.getTribe(tribe_id)) |t| {
                    _ = t.addMember(@intCast(other_idx));
                }
                break; // Only recruit one at a time
            }
        }

        // Update reproduction cooldown (decrease by frame time ~0.016s)
        if (self.organisms.reproduction_cooldowns[idx] > 0) {
            self.organisms.reproduction_cooldowns[idx] -= 0.016;
        }
    }

    /// Update all tribes
    fn updateTribes(self: *Simulation, delta: f32) void {
        self.tribes.update(delta);
    }

    /// Update all buildings
    fn updateBuildings(self: *Simulation, delta: f32) void {
        self.buildings.update(delta, &self.tribes);
    }

    /// Update equipment
    fn updateEquipment(self: *Simulation, delta: f32) void {
        self.equipment_mgr.update(delta);
    }

    /// Update messages
    fn updateMessages(self: *Simulation, delta: f32) void {
        self.messages.update(delta);
    }

    /// Update interactions (eating, combat, reproduction)
    fn updateInteractions(self: *Simulation, delta: f32) void {
        for (0..self.organisms.count) |i| {
            if (!self.organisms.alive[i]) continue;

            const pos = self.organisms.getPosition(i);
            var nearby: [32]u32 = undefined;
            const nearby_count = self.grid.queryRadius(pos, 2.0, &nearby);

            for (nearby[0..nearby_count]) |j| {
                if (i == j) continue;
                if (!self.organisms.alive[j]) continue;

                self.handleInteraction(i, j, delta);
            }
        }
    }

    /// Handle interaction between two organisms
    fn handleInteraction(self: *Simulation, i: usize, j: usize, delta: f32) void {
        const type_i = @as(organism.OrganismType, @enumFromInt(self.organisms.types[i]));
        const type_j = @as(organism.OrganismType, @enumFromInt(self.organisms.types[j]));

        // Eating
        if (self.organisms.is_eating[i]) {
            if (type_i == .herbivore and type_j == .plant) {
                self.organisms.energies[i] += delta * 20.0;
                self.organisms.energies[j] -= delta * 20.0;
            } else if (type_i == .carnivore and type_j == .herbivore) {
                self.organisms.energies[i] += delta * 30.0;
                self.organisms.healths[j] -= delta * 10.0;
            }
        }

        // Combat
        if (self.organisms.is_attacking[i] and type_j != .plant) {
            const same_tribe = self.organisms.tribe_ids[i] == self.organisms.tribe_ids[j];
            if (!same_tribe) {
                const damage = delta * 5.0;
                self.organisms.healths[j] -= damage;
                self.organisms.energies[i] -= delta * 2.0; // Attacking costs energy
            }
        }
    }

    /// Spawn a new organism
    pub fn spawnOrganism(
        self: *Simulation,
        org_type: organism.OrganismType,
        pos: math.Vec3,
        tribe_id: u32,
    ) !u32 {
        const organism_id = try self.organisms.spawn(org_type, pos, tribe_id, &self.rng);

        // Add organism to tribe if tribe_id is valid
        if (tribe_id < self.tribes.count) {
            if (self.tribes.getTribe(tribe_id)) |t| {
                _ = t.addMember(organism_id);
            }
        }

        return organism_id;
    }

    /// Create a new tribe
    pub fn createTribe(self: *Simulation) ?u32 {
        return self.tribes.createTribe(&self.rng);
    }

    /// Get statistics
    pub fn getStats(self: *const Simulation) SimulationStats {
        return .{
            .organism_count = self.organisms.count,
            .alive_count = self.organisms.getAliveCount(),
            .tribe_count = self.tribes.getActiveCount(),
            .building_count = self.buildings.count,
            .message_count = self.messages.count,
            .time = self.time,
            .frame_count = self.frame_count,
        };
    }
};

/// Simulation statistics
pub const SimulationStats = struct {
    organism_count: usize,
    alive_count: usize,
    tribe_count: usize,
    building_count: usize,
    message_count: usize,
    time: f32,
    frame_count: u64,
};

// Tests
test "Simulation creation" {
    var sim = try Simulation.init(std.testing.allocator, 42, 100);
    defer sim.deinit();

    try std.testing.expectEqual(@as(usize, 0), sim.organisms.count);
    try std.testing.expectEqual(@as(f32, 0), sim.time);
}

test "Simulation spawn and update" {
    var sim = try Simulation.init(std.testing.allocator, 42, 100);
    defer sim.deinit();

    const tribe_id = sim.createTribe().?;
    const org_id = try sim.spawnOrganism(.herbivore, math.Vec3.init(0, 5, 0), tribe_id);

    try std.testing.expectEqual(@as(u32, 0), org_id);
    try std.testing.expectEqual(@as(usize, 1), sim.organisms.count);

    // Run simulation for 1 second
    for (0..60) |_| {
        sim.update(1.0 / 60.0);
    }

    try std.testing.expect(sim.time > 0);
    try std.testing.expectEqual(@as(u64, 60), sim.frame_count);
}
