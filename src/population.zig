// Population Dynamics System - Birth, aging, disease, starvation, and death mechanics
// Provides realistic population growth and survival challenges

const std = @import("std");
const math = @import("math.zig");
const tribe = @import("tribe.zig");
const organism = @import("organism.zig");

/// Age stages for humanoids
pub const AgeStage = enum(u8) {
    infant = 0,    // 0-5 game-years (very vulnerable)
    child = 1,     // 5-15 game-years (can't work/fight)
    adult = 2,     // 15-50 game-years (productive)
    elder = 3,     // 50+ game-years (wisdom but frail)

    pub fn fromAge(age: f32) AgeStage {
        // 1 real second = 1 game day, so 365 seconds = 1 game year
        // But we use simplified scaling: 60 seconds = 1 game year
        const years = age / 60.0;

        if (years < 5) return .infant;
        if (years < 15) return .child;
        if (years < 50) return .adult;
        return .elder;
    }

    pub fn getProductivity(self: AgeStage) f32 {
        return switch (self) {
            .infant => 0,
            .child => 0.3,
            .adult => 1.0,
            .elder => 0.6,
        };
    }

    pub fn getVulnerability(self: AgeStage) f32 {
        return switch (self) {
            .infant => 2.0,  // Very vulnerable to disease/starvation
            .child => 1.3,
            .adult => 1.0,
            .elder => 1.5,
        };
    }
};

/// Disease types
pub const Disease = enum(u8) {
    none = 0,
    cold = 1,         // Minor, quick recovery
    fever = 2,        // Moderate
    plague = 3,       // Severe, contagious
    food_poisoning = 4,
    infection = 5,    // From wounds

    pub fn getSeverity(self: Disease) f32 {
        return switch (self) {
            .none => 0,
            .cold => 0.1,
            .fever => 0.3,
            .plague => 0.8,
            .food_poisoning => 0.4,
            .infection => 0.5,
        };
    }

    pub fn getContagiousness(self: Disease) f32 {
        return switch (self) {
            .none => 0,
            .cold => 0.3,
            .fever => 0.2,
            .plague => 0.7,
            .food_poisoning => 0,
            .infection => 0,
        };
    }

    pub fn getBaseRecoveryTime(self: Disease) f32 {
        return switch (self) {
            .none => 0,
            .cold => 30.0,        // 30 seconds
            .fever => 60.0,       // 1 minute
            .plague => 180.0,     // 3 minutes
            .food_poisoning => 45.0,
            .infection => 90.0,
        };
    }
};

/// Hunger levels
pub const HungerLevel = enum(u8) {
    full = 0,        // Recently ate, bonus energy regen
    satisfied = 1,   // Normal
    hungry = 2,      // Need food soon
    starving = 3,    // Losing health
    critical = 4,    // Near death

    pub fn fromEnergy(energy: f32) HungerLevel {
        if (energy > 80) return .full;
        if (energy > 50) return .satisfied;
        if (energy > 25) return .hungry;
        if (energy > 10) return .starving;
        return .critical;
    }

    pub fn getHealthDrain(self: HungerLevel) f32 {
        return switch (self) {
            .full => 0,
            .satisfied => 0,
            .hungry => 0.05,
            .starving => 0.3,
            .critical => 1.0,
        };
    }

    pub fn getMovementPenalty(self: HungerLevel) f32 {
        return switch (self) {
            .full => 1.0,
            .satisfied => 1.0,
            .hungry => 0.9,
            .starving => 0.7,
            .critical => 0.4,
        };
    }
};

/// Population statistics for a tribe
pub const PopulationStats = struct {
    total: u32,
    infants: u32,
    children: u32,
    adults: u32,
    elders: u32,

    male: u32,
    female: u32,

    healthy: u32,
    sick: u32,
    starving: u32,

    births_this_year: u32,
    deaths_this_year: u32,

    avg_age: f32,
    avg_health: f32,

    pub fn init() PopulationStats {
        return .{
            .total = 0,
            .infants = 0,
            .children = 0,
            .adults = 0,
            .elders = 0,
            .male = 0,
            .female = 0,
            .healthy = 0,
            .sick = 0,
            .starving = 0,
            .births_this_year = 0,
            .deaths_this_year = 0,
            .avg_age = 0,
            .avg_health = 0,
        };
    }
};

/// Individual health state
pub const HealthState = struct {
    disease: Disease,
    disease_progress: f32,   // 0-100, 100 = recovered/died
    immunity: [6]f32,        // Immunity to each disease (0-1)
    fertility: f32,          // 0-1 chance modifier
    is_pregnant: bool,
    pregnancy_progress: f32,
    last_meal_time: f32,
    consecutive_starve_time: f32,

    pub fn init(rng: *math.Rng) HealthState {
        return .{
            .disease = .none,
            .disease_progress = 0,
            .immunity = .{
                0,
                rng.range(0, 0.3), // Some natural immunity to cold
                rng.range(0, 0.1),
                0,
                rng.range(0, 0.2),
                0,
            },
            .fertility = 0.8 + rng.float() * 0.4, // 0.8-1.2
            .is_pregnant = false,
            .pregnancy_progress = 0,
            .last_meal_time = 0,
            .consecutive_starve_time = 0,
        };
    }
};

/// Maximum organisms tracked for health
pub const MAX_HEALTH_TRACKED: usize = 500;

/// Population dynamics manager
pub const PopulationManager = struct {
    // Health states for each organism
    health_states: [MAX_HEALTH_TRACKED]HealthState,

    // Birth/death tracking per tribe
    tribe_births: [tribe.MAX_TRIBES]u32,
    tribe_deaths: [tribe.MAX_TRIBES]u32,

    // Global statistics
    total_births: u64,
    total_deaths: u64,
    total_disease_cases: u64,

    // Configuration
    base_birth_rate: f32,
    base_death_rate: f32,
    disease_spread_rate: f32,
    starvation_rate: f32,

    pub fn init() PopulationManager {
        var pm = PopulationManager{
            .health_states = undefined,
            .tribe_births = [_]u32{0} ** tribe.MAX_TRIBES,
            .tribe_deaths = [_]u32{0} ** tribe.MAX_TRIBES,
            .total_births = 0,
            .total_deaths = 0,
            .total_disease_cases = 0,
            .base_birth_rate = 0.001,     // Per second per fertile adult
            .base_death_rate = 0.0001,    // Per second (natural)
            .disease_spread_rate = 0.1,   // Per second per contact
            .starvation_rate = 0.5,       // Health drain per second when starving
        };

        // Initialize with dummy RNG (will be overwritten on spawn)
        var rng = math.Rng.init(42);
        for (0..MAX_HEALTH_TRACKED) |i| {
            pm.health_states[i] = HealthState.init(&rng);
        }

        return pm;
    }

    /// Initialize health state for new organism
    pub fn initOrganism(self: *PopulationManager, idx: usize, rng: *math.Rng) void {
        if (idx >= MAX_HEALTH_TRACKED) return;
        self.health_states[idx] = HealthState.init(rng);
    }

    /// Update population dynamics
    pub fn update(
        self: *PopulationManager,
        delta: f32,
        organisms: *organism.Organisms,
        _: *tribe.Tribes,
        rng: *math.Rng,
        season_birth_modifier: f32,
        season_disease_modifier: f32,
    ) void {
        for (0..organisms.count) |i| {
            if (!organisms.alive[i]) continue;

            const org_type = @as(organism.OrganismType, @enumFromInt(organisms.types[i]));
            if (org_type == .plant) continue;

            if (i >= MAX_HEALTH_TRACKED) continue;
            const hs = &self.health_states[i];

            // === Hunger/Starvation ===
            const hunger = HungerLevel.fromEnergy(organisms.energies[i]);

            if (hunger == .starving or hunger == .critical) {
                hs.consecutive_starve_time += delta;
                organisms.healths[i] -= hunger.getHealthDrain() * delta * self.starvation_rate;

                // Prolonged starvation is deadly
                if (hs.consecutive_starve_time > 60.0) {
                    organisms.healths[i] -= delta * 0.5;
                }
            } else {
                hs.consecutive_starve_time = 0;
            }

            // === Disease ===
            if (hs.disease != .none) {
                // Disease progression
                const severity = hs.disease.getSeverity();
                organisms.healths[i] -= severity * delta * 0.5;
                organisms.energies[i] -= severity * delta * 2.0;

                hs.disease_progress += delta;

                // Recovery check
                const recovery_time = hs.disease.getBaseRecoveryTime();
                if (hs.disease_progress >= recovery_time) {
                    // Survived - gain immunity
                    const disease_idx = @intFromEnum(hs.disease);
                    hs.immunity[disease_idx] = @min(1.0, hs.immunity[disease_idx] + 0.3);
                    hs.disease = .none;
                    hs.disease_progress = 0;
                }
            }

            // === Age-based effects ===
            const age_stage = AgeStage.fromAge(organisms.ages[i]);
            const vulnerability = age_stage.getVulnerability();

            // Natural death chance (increases with age)
            if (age_stage == .elder) {
                const years = organisms.ages[i] / 60.0;
                if (years > 60) {
                    // Increasing chance of natural death past 60
                    const death_chance = self.base_death_rate * (years - 60) * 0.1;
                    if (rng.float() < death_chance * delta) {
                        organisms.healths[i] = 0;
                    }
                }
            }

            // === Reproduction (humanoids only) ===
            if (org_type == .humanoid and age_stage == .adult) {
                self.updateReproduction(i, delta, organisms, rng, season_birth_modifier);
            }

            // === Disease spreading ===
            if (hs.disease != .none and hs.disease.getContagiousness() > 0) {
                self.spreadDisease(i, organisms, rng, vulnerability * season_disease_modifier);
            }
        }
    }

    /// Update reproduction for an organism
    fn updateReproduction(
        self: *PopulationManager,
        idx: usize,
        delta: f32,
        organisms: *organism.Organisms,
        rng: *math.Rng,
        season_modifier: f32,
    ) void {
        const hs = &self.health_states[idx];

        // Pregnancy progress
        if (hs.is_pregnant) {
            hs.pregnancy_progress += delta;

            // Birth after ~120 seconds (2 game years)
            if (hs.pregnancy_progress >= 120.0) {
                // Give birth
                self.giveBirth(idx, organisms, rng);
                hs.is_pregnant = false;
                hs.pregnancy_progress = 0;
            }
            return;
        }

        // Check for conception
        if (organisms.reproduction_cooldowns[idx] > 0) return;
        if (organisms.energies[idx] < 50) return;
        if (organisms.healths[idx] < 50) return;

        // Random conception chance
        const conception_chance = self.base_birth_rate * hs.fertility * season_modifier;
        if (rng.float() < conception_chance * delta) {
            hs.is_pregnant = true;
            hs.pregnancy_progress = 0;
            organisms.reproduction_cooldowns[idx] = 180.0; // 3 minute cooldown after pregnancy starts
        }
    }

    /// Handle birth
    fn giveBirth(self: *PopulationManager, parent_idx: usize, organisms: *organism.Organisms, rng: *math.Rng) void {
        if (organisms.count >= organisms.capacity) return;

        const parent_pos = organisms.getPosition(parent_idx);
        const tribe_id = organisms.tribe_ids[parent_idx];

        // Spawn infant near parent
        const child_pos = math.Vec3.init(
            parent_pos.x + rng.range(-2, 2),
            parent_pos.y,
            parent_pos.z + rng.range(-2, 2),
        );

        // Spawn as humanoid
        const child_idx = organisms.spawn(.humanoid, child_pos, tribe_id, rng) catch return;

        // Initialize health state
        self.initOrganism(child_idx, rng);

        // Track birth
        if (tribe_id < tribe.MAX_TRIBES) {
            self.tribe_births[tribe_id] += 1;
        }
        self.total_births += 1;

        // Parent loses energy
        organisms.energies[parent_idx] -= 30;
    }

    /// Spread disease to nearby organisms
    fn spreadDisease(
        self: *PopulationManager,
        infected_idx: usize,
        organisms: *organism.Organisms,
        rng: *math.Rng,
        modifier: f32,
    ) void {
        const hs = &self.health_states[infected_idx];
        const disease = hs.disease;
        const contagiousness = disease.getContagiousness();

        const pos = organisms.getPosition(infected_idx);

        // Check nearby organisms
        for (0..organisms.count) |i| {
            if (i == infected_idx) continue;
            if (!organisms.alive[i]) continue;
            if (i >= MAX_HEALTH_TRACKED) continue;

            const other_hs = &self.health_states[i];

            // Already sick
            if (other_hs.disease != .none) continue;

            // Check distance
            const other_pos = organisms.getPosition(i);
            const dist = pos.distance(other_pos);

            if (dist < 5.0) { // 5 unit infection radius
                // Infection chance based on distance, contagiousness, immunity
                const immunity = other_hs.immunity[@intFromEnum(disease)];
                const infection_chance = contagiousness * (1.0 - immunity) * modifier * (1.0 - dist / 5.0);

                if (rng.float() < infection_chance * 0.01) { // Per-frame check
                    other_hs.disease = disease;
                    other_hs.disease_progress = 0;
                    self.total_disease_cases += 1;
                }
            }
        }
    }

    /// Infect organism with disease
    pub fn infectOrganism(self: *PopulationManager, idx: usize, disease: Disease) void {
        if (idx >= MAX_HEALTH_TRACKED) return;

        const hs = &self.health_states[idx];
        if (hs.disease != .none) return; // Already sick

        // Check immunity
        const immunity = hs.immunity[@intFromEnum(disease)];
        if (immunity >= 0.9) return; // Immune

        hs.disease = disease;
        hs.disease_progress = 0;
        self.total_disease_cases += 1;
    }

    /// Start disease outbreak in tribe
    pub fn startOutbreak(self: *PopulationManager, tribe_id: u32, disease: Disease, organisms: *organism.Organisms, rng: *math.Rng) void {
        var infected: u32 = 0;

        for (0..organisms.count) |i| {
            if (!organisms.alive[i]) continue;
            if (organisms.tribe_ids[i] != tribe_id) continue;
            if (i >= MAX_HEALTH_TRACKED) continue;

            // Randomly infect ~20% of tribe
            if (rng.float() < 0.2) {
                self.infectOrganism(i, disease);
                infected += 1;
            }

            if (infected >= 5) break; // Cap initial infections
        }
    }

    /// Record death
    pub fn recordDeath(self: *PopulationManager, idx: usize, tribe_id: u32) void {
        _ = idx;

        if (tribe_id < tribe.MAX_TRIBES) {
            self.tribe_deaths[tribe_id] += 1;
        }
        self.total_deaths += 1;
    }

    /// Calculate population stats for a tribe
    pub fn calculateStats(self: *const PopulationManager, tribe_id: u32, organisms: *const organism.Organisms) PopulationStats {
        var stats = PopulationStats.init();

        var total_age: f32 = 0;
        var total_health: f32 = 0;

        for (0..organisms.count) |i| {
            if (!organisms.alive[i]) continue;
            if (organisms.tribe_ids[i] != tribe_id) continue;

            const org_type = @as(organism.OrganismType, @enumFromInt(organisms.types[i]));
            if (org_type != .humanoid) continue;

            stats.total += 1;

            // Age distribution
            const age_stage = AgeStage.fromAge(organisms.ages[i]);
            switch (age_stage) {
                .infant => stats.infants += 1,
                .child => stats.children += 1,
                .adult => stats.adults += 1,
                .elder => stats.elders += 1,
            }

            // Health status
            if (i < MAX_HEALTH_TRACKED) {
                const hs = &self.health_states[i];
                if (hs.disease != .none) {
                    stats.sick += 1;
                } else {
                    stats.healthy += 1;
                }
            }

            // Hunger status
            if (HungerLevel.fromEnergy(organisms.energies[i]) == .starving or
                HungerLevel.fromEnergy(organisms.energies[i]) == .critical)
            {
                stats.starving += 1;
            }

            total_age += organisms.ages[i];
            total_health += organisms.healths[i];
        }

        if (stats.total > 0) {
            stats.avg_age = total_age / @as(f32, @floatFromInt(stats.total));
            stats.avg_health = total_health / @as(f32, @floatFromInt(stats.total));
        }

        stats.births_this_year = self.tribe_births[tribe_id];
        stats.deaths_this_year = self.tribe_deaths[tribe_id];

        return stats;
    }

    /// Reset yearly statistics
    pub fn resetYearlyStats(self: *PopulationManager) void {
        for (0..tribe.MAX_TRIBES) |i| {
            self.tribe_births[i] = 0;
            self.tribe_deaths[i] = 0;
        }
    }

    /// Get health state for organism
    pub fn getHealthState(self: *const PopulationManager, idx: usize) ?*const HealthState {
        if (idx >= MAX_HEALTH_TRACKED) return null;
        return &self.health_states[idx];
    }

    /// Get disease name
    pub fn getDiseaseName(disease: Disease) []const u8 {
        return switch (disease) {
            .none => "Healthy",
            .cold => "Cold",
            .fever => "Fever",
            .plague => "Plague",
            .food_poisoning => "Food Poisoning",
            .infection => "Infection",
        };
    }
};

// Tests
test "Age stages" {
    try std.testing.expectEqual(AgeStage.infant, AgeStage.fromAge(0));
    try std.testing.expectEqual(AgeStage.child, AgeStage.fromAge(400)); // ~6.6 years
    try std.testing.expectEqual(AgeStage.adult, AgeStage.fromAge(1200)); // ~20 years
    try std.testing.expectEqual(AgeStage.elder, AgeStage.fromAge(3600)); // ~60 years
}

test "Hunger levels" {
    try std.testing.expectEqual(HungerLevel.full, HungerLevel.fromEnergy(90));
    try std.testing.expectEqual(HungerLevel.satisfied, HungerLevel.fromEnergy(60));
    try std.testing.expectEqual(HungerLevel.hungry, HungerLevel.fromEnergy(30));
    try std.testing.expectEqual(HungerLevel.starving, HungerLevel.fromEnergy(15));
    try std.testing.expectEqual(HungerLevel.critical, HungerLevel.fromEnergy(5));
}

test "Disease severity" {
    try std.testing.expectEqual(@as(f32, 0), Disease.none.getSeverity());
    try std.testing.expect(Disease.plague.getSeverity() > Disease.cold.getSeverity());
}

test "Population manager init" {
    const pm = PopulationManager.init();
    try std.testing.expectEqual(@as(u64, 0), pm.total_births);
    try std.testing.expectEqual(@as(u64, 0), pm.total_deaths);
}
