// Main simulation loop - coordinates all systems
// This is the heart of the Planet Eden simulation
// Version: 2.0 - AAA Strategic Systems (Diplomacy, Tech, Seasons, Territory, Population)

const std = @import("std");
const math = @import("math.zig");
const organism = @import("organism.zig");
const spatial_grid = @import("spatial_grid.zig");
const tribe = @import("tribe.zig");
const building = @import("building.zig");
const equipment = @import("equipment.zig");
const message = @import("message.zig");
const nn = @import("neural_network.zig");

// New AAA systems
const diplomacy = @import("diplomacy.zig");
const technology = @import("technology.zig");
const seasons = @import("seasons.zig");
const territory = @import("territory.zig");
const population = @import("population.zig");

/// Main simulation state
pub const Simulation = struct {
    // Core systems
    organisms: organism.Organisms,
    grid: spatial_grid.SpatialGrid,
    tribes: tribe.Tribes,
    buildings: building.Buildings,
    equipment_mgr: equipment.EquipmentManager,
    messages: message.MessageQueue,
    language_stats: message.LanguageStats,

    // AAA Strategic Systems
    diplomacy_mgr: diplomacy.DiplomacyManager,
    tech_mgr: technology.TechnologyManager,
    season_mgr: seasons.SeasonManager,
    territory_mgr: territory.TerritoryManager,
    population_mgr: population.PopulationManager,

    rng: math.Rng,
    time: f32,
    frame_count: u64,

    allocator: std.mem.Allocator,

    /// Initialize simulation
    pub fn init(allocator: std.mem.Allocator, seed: u32, max_organisms: usize) !Simulation {
        // Limit capacities - plants are cheap (no neural net), animals need ~1.6KB each for brain
        // With 512KB buffer, we can handle ~500 organisms (most being plants)
        const org_cap = @min(max_organisms, 500);

        // Build piece by piece to avoid large stack frame
        var sim: Simulation = undefined;
        sim.allocator = allocator;
        sim.rng = math.Rng.init(seed);
        sim.time = 0;
        sim.frame_count = 0;

        // Core systems
        sim.organisms = try organism.Organisms.init(allocator, org_cap);
        sim.grid = spatial_grid.SpatialGrid.init(allocator);
        sim.tribes = tribe.Tribes.init();
        sim.buildings = try building.Buildings.init(allocator, 30);
        sim.equipment_mgr = try equipment.EquipmentManager.init(allocator, 30);
        sim.messages = try message.MessageQueue.init(allocator, 50);
        sim.language_stats = message.LanguageStats.init();

        // AAA Strategic Systems
        sim.diplomacy_mgr = diplomacy.DiplomacyManager.init();
        sim.tech_mgr = technology.TechnologyManager.init();
        sim.season_mgr = seasons.SeasonManager.init();
        sim.territory_mgr = territory.TerritoryManager.init(&sim.rng);
        sim.population_mgr = population.PopulationManager.init();

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

        // Update subsystems (core)
        self.updateSpatialGrid();
        self.updateOrganisms(delta);
        self.updateTribes(delta);
        self.updateBuildings(delta);
        self.updateEquipment(delta);
        self.updateMessages(delta);
        self.updateInteractions(delta);

        // Update AAA Strategic Systems
        self.updateSeasons(delta);
        self.updateDiplomacy(delta);
        self.updateTechnology(delta);
        self.updateTerritory(delta);
        self.updatePopulation(delta);

        // AI decision making (less frequent to save CPU)
        if (self.frame_count % 60 == 0) {
            self.updateTribeAI();
        }

        // Yearly statistics reset
        if (self.frame_count % 3600 == 0) { // ~60 seconds at 60fps
            self.population_mgr.resetYearlyStats();
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

        // Get seasonal and environmental modifiers
        const movement_mod = self.season_mgr.movement_modifier;
        const is_harsh = self.season_mgr.isHarshConditions(pos.x, pos.z);

        // Normalize inputs
        inputs[0] = energy / 100.0;
        inputs[1] = health / 100.0;
        inputs[2] = pos.x / 100.0;
        inputs[3] = pos.y / 50.0;
        inputs[4] = pos.z / 100.0;

        // Find nearby organisms
        var nearby: [32]u32 = undefined;
        const nearby_count = self.grid.queryNeighbors(pos, &nearby);

        // Count food sources, threats, enemies (enhanced with diplomacy)
        var food_count: f32 = 0;
        var threat_count: f32 = 0;
        var ally_count: f32 = 0;
        var enemy_count: f32 = 0;

        for (nearby[0..nearby_count]) |other_idx| {
            if (other_idx == idx) continue;
            if (!self.organisms.alive[other_idx]) continue;

            const other_type = @as(organism.OrganismType, @enumFromInt(self.organisms.types[other_idx]));
            const other_tribe = self.organisms.tribe_ids[other_idx];

            if (my_type == .herbivore and other_type == .plant) {
                food_count += 1;
            } else if (my_type == .carnivore and other_type == .herbivore) {
                food_count += 1;
            } else if (other_type == .carnivore and my_type != .carnivore) {
                threat_count += 1;
            } else if (self.organisms.tribe_ids[other_idx] == tribe_id and has_tribe) {
                ally_count += 1;
            }

            // Check diplomatic status for enemies
            if (has_tribe and other_tribe < self.tribes.count and other_tribe != tribe_id) {
                if (self.diplomacy_mgr.isAtWar(tribe_id, other_tribe)) {
                    enemy_count += 1;
                    threat_count += 0.5; // War enemies are threats
                }
            }
        }

        inputs[5] = math.clamp(food_count / 5.0, 0, 1);
        inputs[6] = math.clamp((threat_count + enemy_count) / 5.0, 0, 1);
        inputs[7] = math.clamp(ally_count / 10.0, 0, 1);
        inputs[8] = self.organisms.ages[idx] / 1000.0;
        inputs[9] = self.organisms.sizes[idx] / 2.0;
        inputs[10] = if (self.organisms.is_attacking[idx]) 1.0 else 0.0;
        inputs[11] = if (self.organisms.is_eating[idx]) 1.0 else 0.0;
        inputs[12] = if (is_harsh) 0.0 else self.rng.float(); // Harsh conditions affect behavior
        inputs[13] = @sin(self.time); // Temporal input
        inputs[14] = @cos(self.time); // Temporal input

        // Run neural network
        brain.predict(&inputs, &outputs, &hidden);

        // =====================================================
        // Apply outputs (17 total) - Enhanced with new systems
        // =====================================================

        // === MOVEMENT (outputs 0-3) ===
        const move_dir = math.Vec3.init(outputs[0], 0, outputs[2]).normalize();
        var speed = math.clamp(outputs[3], 0, 1) * 5.0;

        // Apply seasonal movement modifier
        speed *= movement_mod;

        // Flee behavior (output 13) - boost speed away from threats
        if (outputs[13] > 0.3 and (threat_count > 0 or enemy_count > 0)) {
            speed *= 1.0 + outputs[13]; // Up to 2x speed when fleeing
        }

        var target_vel = move_dir.mul(speed);
        target_vel.y = self.organisms.velocities_y[idx] * 0.9;

        // Smooth velocity changes to reduce jerky movement
        const current_vel = self.organisms.getVelocity(idx);
        const smoothed_vel = math.Vec3.lerp(current_vel, target_vel, 0.15);
        self.organisms.setVelocity(idx, smoothed_vel);

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

        // === REPRODUCTION (output 12) - Enhanced with population system ===
        if (outputs[12] > 0.7 and self.organisms.reproduction_cooldowns[idx] <= 0) {
            // Check seasonal birth modifier
            const birth_mod = self.season_mgr.birth_rate_modifier;

            // Need enough energy to reproduce (harder in winter)
            const energy_threshold = 60.0 / birth_mod;
            if (energy > energy_threshold and self.organisms.count < self.organisms.capacity) {
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

                    const child_id = self.spawnOrganism(my_type, offspring_pos, tribe_id) catch break;

                    // Initialize health state for new organism
                    self.population_mgr.initOrganism(child_id, &self.rng);

                    // Cost energy and set cooldown
                    self.organisms.energies[idx] -= 30.0;
                    self.organisms.reproduction_cooldowns[idx] = 60.0; // 60 second cooldown
                    break;
                }
            }
        }

        // === GATHER RESOURCES (output 14) - Enhanced with territory/tech ===
        if (outputs[14] > 0.5 and has_tribe and my_type == .humanoid) {
            if (self.tribes.getTribe(tribe_id)) |t| {
                // Get tech bonuses
                const bonuses = self.tech_mgr.getBonuses(tribe_id);

                // Base gathering rates with seasonal modifiers
                const gather_rate = (outputs[14] + 1.0) * 0.05 * self.season_mgr.food_modifier;

                // Apply technology bonuses
                t.food += gather_rate * bonuses.food_mult;
                t.wood += gather_rate * 0.5 * bonuses.wood_mult;

                // Claim territory where gathering
                _ = self.territory_mgr.claimTerritory(pos.x, pos.z, tribe_id);
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

        // === RECRUIT (output 16) - Enhanced with diplomacy ===
        if (outputs[16] > 0.6 and has_tribe and my_type == .humanoid) {
            for (nearby[0..nearby_count]) |other_idx| {
                if (other_idx == idx) continue;
                if (!self.organisms.alive[other_idx]) continue;

                const other_type = @as(organism.OrganismType, @enumFromInt(self.organisms.types[other_idx]));
                if (other_type != .humanoid) continue;

                const other_tribe = self.organisms.tribe_ids[other_idx];

                // Record first contact between tribes
                if (other_tribe < self.tribes.count and other_tribe != tribe_id) {
                    self.diplomacy_mgr.recordFirstContact(tribe_id, other_tribe);
                }

                // Only recruit tribeless (tribe_id >= tribes.count means no tribe)
                if (other_tribe < self.tribes.count) continue;

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

    // === AAA STRATEGIC SYSTEMS UPDATE ===

    /// Update seasons and weather
    fn updateSeasons(self: *Simulation, delta: f32) void {
        self.season_mgr.update(delta, &self.rng);
    }

    /// Update diplomacy system
    fn updateDiplomacy(self: *Simulation, delta: f32) void {
        self.diplomacy_mgr.update(delta, self.time);
    }

    /// Update technology research
    fn updateTechnology(self: *Simulation, delta: f32) void {
        self.tech_mgr.update(delta, &self.tribes);
    }

    /// Update territory control
    fn updateTerritory(self: *Simulation, delta: f32) void {
        self.territory_mgr.update(delta);

        // Apply territory yields to tribes (every 60 frames)
        if (self.frame_count % 60 == 0) {
            for (0..self.tribes.count) |i| {
                if (self.tribes.getTribe(@intCast(i))) |t| {
                    const yields = self.territory_mgr.getTotalYield(@intCast(i));
                    const bonuses = self.tech_mgr.getBonuses(@intCast(i));

                    // Add yields with tech multipliers
                    t.food += yields.food * bonuses.food_mult * 0.1;
                    t.wood += yields.wood * bonuses.wood_mult * 0.1;
                    t.stone += yields.stone * bonuses.stone_mult * 0.1;
                    t.metal += yields.metal * bonuses.metal_mult * 0.1;
                }
            }
        }
    }

    /// Update population dynamics
    fn updatePopulation(self: *Simulation, delta: f32) void {
        self.population_mgr.update(
            delta,
            &self.organisms,
            &self.tribes,
            &self.rng,
            self.season_mgr.birth_rate_modifier,
            if (self.season_mgr.current_weather == .rain) 1.2 else 1.0,
        );

        // Record deaths
        for (0..self.organisms.count) |i| {
            if (self.organisms.alive[i]) continue;
            if (self.organisms.healths[i] <= 0) {
                self.population_mgr.recordDeath(i, self.organisms.tribe_ids[i]);
            }
        }
    }

    /// Update tribe AI decision making
    fn updateTribeAI(self: *Simulation) void {
        for (0..self.tribes.count) |i| {
            const tribe_id: u32 = @intCast(i);
            if (self.tribes.getTribe(tribe_id) == null) continue;

            // Auto-select research if not researching
            self.tech_mgr.autoSelectResearch(tribe_id, &self.rng);

            // Diplomatic AI decisions
            self.updateTribeDiplomacyAI(tribe_id);
        }
    }

    /// Tribe diplomatic AI
    fn updateTribeDiplomacyAI(self: *Simulation, tribe_id: u32) void {
        const t = self.tribes.getTribe(tribe_id) orelse return;

        // Check relationships with other tribes
        for (0..self.tribes.count) |j| {
            const other_id: u32 = @intCast(j);
            if (other_id == tribe_id) continue;
            if (self.tribes.getTribe(other_id) == null) continue;

            // Only act if we've met
            if (!self.diplomacy_mgr.haveMet(tribe_id, other_id)) continue;

            const rep = self.diplomacy_mgr.getReputation(tribe_id, other_id);
            const at_war = self.diplomacy_mgr.isAtWar(tribe_id, other_id);

            // Consider declaring war if hostile and we share a border
            if (!at_war and rep < -40 and self.territory_mgr.sharesBorder(tribe_id, other_id)) {
                if (self.rng.float() < 0.01) { // 1% chance per AI tick
                    // Only declare if we have more members
                    const other_t = self.tribes.getTribe(other_id) orelse continue;
                    if (t.member_count > other_t.member_count) {
                        _ = self.diplomacy_mgr.declareWar(tribe_id, other_id, .conquest, self.time);
                    }
                }
            }

            // Consider peace if war is going badly
            if (at_war) {
                if (self.diplomacy_mgr.getWar(tribe_id, other_id)) |war| {
                    const losing = (war.isAttacker(tribe_id) and war.war_score < -30) or
                                   (!war.isAttacker(tribe_id) and war.war_score > 30);

                    if (losing and self.rng.float() < 0.05) {
                        // Sue for peace
                        self.diplomacy_mgr.modifyReputation(tribe_id, other_id, 10);
                    }
                }
            }

            // Consider alliance if friendly
            if (!at_war and rep > 50 and !self.diplomacy_mgr.hasTreaty(tribe_id, other_id, .military_alliance)) {
                if (self.rng.float() < 0.02) { // 2% chance per AI tick
                    _ = self.diplomacy_mgr.createTreaty(.military_alliance, tribe_id, other_id, self.time);
                }
            }

            // Consider trade if neutral or better
            if (!at_war and rep >= 0) {
                if (self.rng.float() < 0.01) { // 1% chance
                    if (self.diplomacy_mgr.createTradeOffer(tribe_id, other_id, self.time)) |offer| {
                        // Set up simple trade: food for other resources
                        if (t.food > 50) {
                            offer.offer_food = 20;
                            offer.request_wood = 10;
                            offer.request_stone = 5;
                        }
                    }
                }
            }
        }
    }

    /// Update interactions (eating, combat, reproduction) - Enhanced with diplomacy
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

    /// Handle interaction between two organisms - Enhanced with diplomacy/war
    fn handleInteraction(self: *Simulation, i: usize, j: usize, delta: f32) void {
        const type_i = @as(organism.OrganismType, @enumFromInt(self.organisms.types[i]));
        const type_j = @as(organism.OrganismType, @enumFromInt(self.organisms.types[j]));

        const tribe_i = self.organisms.tribe_ids[i];
        const tribe_j = self.organisms.tribe_ids[j];

        // Get tech bonuses for combat
        const bonuses_i = self.tech_mgr.getBonuses(tribe_i);
        const bonuses_j = self.tech_mgr.getBonuses(tribe_j);

        // Eating
        if (self.organisms.is_eating[i]) {
            if (type_i == .herbivore and type_j == .plant) {
                // Apply seasonal food gathering modifier
                const food_amount = delta * 20.0 * self.season_mgr.food_modifier;
                self.organisms.energies[i] += food_amount;
                self.organisms.energies[j] -= food_amount;
            } else if (type_i == .carnivore and type_j == .herbivore) {
                self.organisms.energies[i] += delta * 30.0;
                self.organisms.healths[j] -= delta * 10.0;
            }
        }

        // Combat - Enhanced with diplomacy, war, and tech
        if (self.organisms.is_attacking[i] and type_j != .plant) {
            const same_tribe = tribe_i == tribe_j;
            const at_war = self.diplomacy_mgr.isAtWar(tribe_i, tribe_j);
            const is_allied = self.diplomacy_mgr.hasTreaty(tribe_i, tribe_j, .military_alliance);

            // Don't attack same tribe or allies
            if (same_tribe or is_allied) return;

            // Base damage with tech bonus
            var damage = delta * 5.0;
            damage += bonuses_i.attack_bonus * delta * 0.1;

            // Apply defender's defense bonus
            const defense_reduction = bonuses_j.defense_bonus * delta * 0.05;
            damage = @max(0, damage - defense_reduction);

            self.organisms.healths[j] -= damage;
            self.organisms.energies[i] -= delta * 2.0; // Attacking costs energy

            // If at war, record casualty if killed
            if (at_war and self.organisms.healths[j] <= 0) {
                if (self.diplomacy_mgr.getWar(tribe_i, tribe_j)) |war| {
                    war.recordCasualty(war.isAttacker(tribe_j));
                }
            }

            // Combat reduces reputation
            if (tribe_i < self.tribes.count and tribe_j < self.tribes.count) {
                self.diplomacy_mgr.modifyReputation(tribe_i, tribe_j, -1);
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

        // Initialize population health state
        self.population_mgr.initOrganism(organism_id, &self.rng);

        return organism_id;
    }

    /// Create a new tribe
    pub fn createTribe(self: *Simulation) ?u32 {
        const tribe_id = self.tribes.createTribe(&self.rng);

        if (tribe_id) |id| {
            // Give starting technologies
            if (self.tech_mgr.getResearch(id)) |research| {
                // Start with fire and stone tools discovered
                _ = research.startResearch(.fire);
                _ = research.addResearchPoints(100); // Complete it
                _ = research.startResearch(.stone_tools);
            }
        }

        return tribe_id;
    }

    // === PUBLIC ACCESSORS FOR NEW SYSTEMS ===

    /// Get current season
    pub fn getCurrentSeason(self: *const Simulation) seasons.Season {
        return self.season_mgr.current_season;
    }

    /// Get current weather
    pub fn getCurrentWeather(self: *const Simulation) seasons.Weather {
        return self.season_mgr.current_weather;
    }

    /// Get current day
    pub fn getCurrentDay(self: *const Simulation) u32 {
        return self.season_mgr.current_day;
    }

    /// Get current year
    pub fn getCurrentYear(self: *const Simulation) u32 {
        return self.season_mgr.current_year;
    }

    /// Get time of day (0-1)
    pub fn getTimeOfDay(self: *const Simulation) f32 {
        return self.season_mgr.getTimeOfDay();
    }

    /// Get tribe technology level
    pub fn getTribeTechLevel(self: *const Simulation, tribe_id: u32) u32 {
        return self.tech_mgr.getTechLevel(tribe_id);
    }

    /// Get tribe territory count
    pub fn getTribeTerritoryCount(self: *const Simulation, tribe_id: u32) u32 {
        return self.territory_mgr.getTerritoryCount(tribe_id);
    }

    /// Check if tribes are at war
    pub fn areTribesAtWar(self: *const Simulation, tribe_a: u32, tribe_b: u32) bool {
        return self.diplomacy_mgr.isAtWar(tribe_a, tribe_b);
    }

    /// Get reputation between tribes
    pub fn getTribesReputation(self: *const Simulation, tribe_a: u32, tribe_b: u32) i8 {
        return self.diplomacy_mgr.getReputation(tribe_a, tribe_b);
    }

    /// Get active war count
    pub fn getActiveWarCount(self: *const Simulation) usize {
        return self.diplomacy_mgr.getActiveWarCount();
    }

    /// Get active treaty count
    pub fn getActiveTreatyCount(self: *const Simulation) usize {
        return self.diplomacy_mgr.getActiveTreatyCount();
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

    /// Get extended statistics
    pub fn getExtendedStats(self: *const Simulation) ExtendedStats {
        return .{
            .season = @intFromEnum(self.season_mgr.current_season),
            .weather = @intFromEnum(self.season_mgr.current_weather),
            .day = self.season_mgr.current_day,
            .year = self.season_mgr.current_year,
            .active_wars = @intCast(self.diplomacy_mgr.getActiveWarCount()),
            .active_treaties = @intCast(self.diplomacy_mgr.getActiveTreatyCount()),
            .active_events = @intCast(self.season_mgr.event_count),
            .total_births = self.population_mgr.total_births,
            .total_deaths = self.population_mgr.total_deaths,
            .total_diseases = self.population_mgr.total_disease_cases,
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

/// Extended statistics for AAA systems
pub const ExtendedStats = struct {
    season: u8,
    weather: u8,
    day: u32,
    year: u32,
    active_wars: u32,
    active_treaties: u32,
    active_events: u32,
    total_births: u64,
    total_deaths: u64,
    total_diseases: u64,
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

test "Simulation new systems initialized" {
    var sim = try Simulation.init(std.testing.allocator, 42, 100);
    defer sim.deinit();

    // Check new systems are initialized
    try std.testing.expectEqual(seasons.Season.spring, sim.getCurrentSeason());
    try std.testing.expectEqual(@as(u32, 1), sim.getCurrentYear());
    try std.testing.expectEqual(@as(usize, 0), sim.getActiveWarCount());
}
