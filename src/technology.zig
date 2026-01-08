// Technology System - Research tree for tribal advancement
// Tribes discover technologies that unlock new abilities and bonuses

const std = @import("std");
const math = @import("math.zig");
const tribe = @import("tribe.zig");

/// Technology IDs - organized by era
pub const Technology = enum(u8) {
    // Era 0: Stone Age (start)
    fire = 0,              // Enables cooking, warmth, light
    stone_tools = 1,       // Better gathering, basic weapons
    language = 2,          // Better coordination, faster learning
    hunting = 3,           // Better meat acquisition

    // Era 1: Early Agriculture
    agriculture = 4,       // Farms produce more
    pottery = 5,           // Better food storage
    weaving = 6,           // Cloth, nets
    animal_husbandry = 7,  // Domesticated animals

    // Era 2: Bronze Age
    bronze_working = 8,    // Metal tools and weapons
    writing = 9,           // Tech research bonus
    wheel = 10,            // Transportation, pottery wheel
    masonry = 11,          // Better buildings

    // Era 3: Iron Age
    iron_working = 12,     // Iron tools and weapons
    construction = 13,     // Advanced buildings
    mathematics = 14,      // Engineering bonus
    medicine = 15,         // Disease resistance, healing

    // Era 4: Classical
    philosophy = 16,       // Culture bonus
    engineering = 17,      // Siege weapons, aqueducts
    astronomy = 18,        // Navigation, calendar
    currency = 19,         // Trade bonus

    // Special discoveries
    military_tactics = 20, // Combat bonus
    irrigation = 21,       // Farm bonus in dry areas
    calendar = 22,         // Seasonal predictions
    metallurgy = 23,       // Advanced metal working

    pub fn getName(self: Technology) []const u8 {
        return switch (self) {
            .fire => "Fire",
            .stone_tools => "Stone Tools",
            .language => "Language",
            .hunting => "Hunting",
            .agriculture => "Agriculture",
            .pottery => "Pottery",
            .weaving => "Weaving",
            .animal_husbandry => "Animal Husbandry",
            .bronze_working => "Bronze Working",
            .writing => "Writing",
            .wheel => "The Wheel",
            .masonry => "Masonry",
            .iron_working => "Iron Working",
            .construction => "Construction",
            .mathematics => "Mathematics",
            .medicine => "Medicine",
            .philosophy => "Philosophy",
            .engineering => "Engineering",
            .astronomy => "Astronomy",
            .currency => "Currency",
            .military_tactics => "Military Tactics",
            .irrigation => "Irrigation",
            .calendar => "Calendar",
            .metallurgy => "Metallurgy",
        };
    }

    pub fn getEra(self: Technology) u8 {
        return switch (self) {
            .fire, .stone_tools, .language, .hunting => 0,
            .agriculture, .pottery, .weaving, .animal_husbandry => 1,
            .bronze_working, .writing, .wheel, .masonry => 2,
            .iron_working, .construction, .mathematics, .medicine => 3,
            .philosophy, .engineering, .astronomy, .currency => 4,
            .military_tactics, .irrigation, .calendar, .metallurgy => 5,
        };
    }

    pub fn getBaseCost(self: Technology) u32 {
        const era = self.getEra();
        // Base cost increases exponentially with era
        return switch (era) {
            0 => 50,
            1 => 100,
            2 => 200,
            3 => 400,
            4 => 800,
            else => 1600,
        };
    }
};

/// Technology prerequisites
pub const TechPrereqs = struct {
    tech: Technology,
    prereqs: [4]?Technology, // Up to 4 prerequisites

    pub fn getPrereqsFor(tech: Technology) [4]?Technology {
        return switch (tech) {
            // Era 0 - no prereqs
            .fire, .stone_tools, .language, .hunting => .{ null, null, null, null },

            // Era 1 - need basic techs
            .agriculture => .{ .stone_tools, null, null, null },
            .pottery => .{ .fire, null, null, null },
            .weaving => .{ .stone_tools, null, null, null },
            .animal_husbandry => .{ .hunting, .language, null, null },

            // Era 2 - need Era 1
            .bronze_working => .{ .fire, .stone_tools, null, null },
            .writing => .{ .language, null, null, null },
            .wheel => .{ .pottery, null, null, null },
            .masonry => .{ .stone_tools, .agriculture, null, null },

            // Era 3 - need Era 2
            .iron_working => .{ .bronze_working, null, null, null },
            .construction => .{ .masonry, .wheel, null, null },
            .mathematics => .{ .writing, null, null, null },
            .medicine => .{ .agriculture, .pottery, null, null },

            // Era 4 - need Era 3
            .philosophy => .{ .writing, .mathematics, null, null },
            .engineering => .{ .mathematics, .construction, null, null },
            .astronomy => .{ .mathematics, .writing, null, null },
            .currency => .{ .writing, .bronze_working, null, null },

            // Special
            .military_tactics => .{ .hunting, .stone_tools, null, null },
            .irrigation => .{ .agriculture, .masonry, null, null },
            .calendar => .{ .agriculture, .writing, null, null },
            .metallurgy => .{ .iron_working, .mathematics, null, null },
        };
    }

    pub fn hasPrereqs(tech: Technology, researched: *const [24]bool) bool {
        const prereqs = getPrereqsFor(tech);
        for (prereqs) |maybe_prereq| {
            if (maybe_prereq) |prereq| {
                if (!researched[@intFromEnum(prereq)]) {
                    return false;
                }
            }
        }
        return true;
    }
};

/// Technology bonuses (effects when researched)
pub const TechBonus = struct {
    // Resource gathering multipliers
    food_mult: f32,
    wood_mult: f32,
    stone_mult: f32,
    metal_mult: f32,

    // Combat bonuses
    attack_bonus: f32,
    defense_bonus: f32,

    // Population bonuses
    birth_rate_mult: f32,
    death_rate_mult: f32,
    disease_resist: f32,

    // Research speed
    research_mult: f32,

    // Building bonuses
    build_speed_mult: f32,
    building_health_mult: f32,

    // Trade bonuses
    trade_bonus: f32,

    pub fn init() TechBonus {
        return .{
            .food_mult = 1.0,
            .wood_mult = 1.0,
            .stone_mult = 1.0,
            .metal_mult = 1.0,
            .attack_bonus = 0,
            .defense_bonus = 0,
            .birth_rate_mult = 1.0,
            .death_rate_mult = 1.0,
            .disease_resist = 0,
            .research_mult = 1.0,
            .build_speed_mult = 1.0,
            .building_health_mult = 1.0,
            .trade_bonus = 0,
        };
    }

    pub fn addTechBonus(self: *TechBonus, tech: Technology) void {
        switch (tech) {
            .fire => {
                self.food_mult += 0.15;   // Cooked food
                self.death_rate_mult -= 0.1; // Warmth
            },
            .stone_tools => {
                self.wood_mult += 0.2;
                self.stone_mult += 0.2;
                self.attack_bonus += 2;
            },
            .language => {
                self.research_mult += 0.2;
                self.birth_rate_mult += 0.1;
            },
            .hunting => {
                self.food_mult += 0.25;
                self.attack_bonus += 3;
            },
            .agriculture => {
                self.food_mult += 0.4;
                self.death_rate_mult -= 0.15;
            },
            .pottery => {
                self.food_mult += 0.1; // Better storage
                self.trade_bonus += 0.1;
            },
            .weaving => {
                self.defense_bonus += 2;
                self.trade_bonus += 0.15;
            },
            .animal_husbandry => {
                self.food_mult += 0.3;
                self.wood_mult += 0.1; // Hauling
            },
            .bronze_working => {
                self.metal_mult += 0.3;
                self.attack_bonus += 5;
                self.defense_bonus += 5;
            },
            .writing => {
                self.research_mult += 0.3;
                self.trade_bonus += 0.2;
            },
            .wheel => {
                self.wood_mult += 0.2;
                self.stone_mult += 0.2;
                self.build_speed_mult += 0.2;
            },
            .masonry => {
                self.stone_mult += 0.3;
                self.building_health_mult += 0.3;
                self.defense_bonus += 5;
            },
            .iron_working => {
                self.metal_mult += 0.5;
                self.attack_bonus += 8;
                self.defense_bonus += 8;
            },
            .construction => {
                self.build_speed_mult += 0.3;
                self.building_health_mult += 0.4;
            },
            .mathematics => {
                self.research_mult += 0.25;
                self.build_speed_mult += 0.15;
            },
            .medicine => {
                self.disease_resist += 0.4;
                self.death_rate_mult -= 0.2;
                self.birth_rate_mult += 0.1;
            },
            .philosophy => {
                self.research_mult += 0.2;
                // Cultural benefits handled elsewhere
            },
            .engineering => {
                self.build_speed_mult += 0.3;
                self.attack_bonus += 5; // Siege
                self.defense_bonus += 10; // Walls
            },
            .astronomy => {
                self.research_mult += 0.15;
                self.trade_bonus += 0.2; // Navigation
            },
            .currency => {
                self.trade_bonus += 0.4;
            },
            .military_tactics => {
                self.attack_bonus += 10;
                self.defense_bonus += 5;
            },
            .irrigation => {
                self.food_mult += 0.35;
            },
            .calendar => {
                self.food_mult += 0.2; // Better planting
                self.research_mult += 0.1;
            },
            .metallurgy => {
                self.metal_mult += 0.4;
                self.attack_bonus += 5;
                self.defense_bonus += 5;
            },
        }
    }
};

/// Research state for a tribe
pub const TribeResearch = struct {
    // Which techs are researched
    researched: [24]bool,

    // Current research target
    current_research: ?Technology,

    // Progress on current research (0-cost)
    research_progress: u32,

    // Total research points generated
    total_research_generated: u64,

    // Calculated bonuses
    bonuses: TechBonus,

    pub fn init() TribeResearch {
        return TribeResearch{
            .researched = [_]bool{false} ** 24,
            .current_research = null,
            .research_progress = 0,
            .total_research_generated = 0,
            .bonuses = TechBonus.init(),
        };
    }

    /// Start researching a technology
    pub fn startResearch(self: *TribeResearch, tech: Technology) bool {
        // Check if already researched
        if (self.researched[@intFromEnum(tech)]) return false;

        // Check prerequisites
        if (!TechPrereqs.hasPrereqs(tech, &self.researched)) return false;

        self.current_research = tech;
        self.research_progress = 0;
        return true;
    }

    /// Add research points (returns true if completed)
    pub fn addResearchPoints(self: *TribeResearch, points: u32) bool {
        self.total_research_generated += points;

        if (self.current_research) |tech| {
            const cost = tech.getBaseCost();
            const effective_points = @as(u32, @intFromFloat(@as(f32, @floatFromInt(points)) * self.bonuses.research_mult));

            self.research_progress += effective_points;

            if (self.research_progress >= cost) {
                self.completeResearch(tech);
                return true;
            }
        }

        return false;
    }

    /// Complete current research
    fn completeResearch(self: *TribeResearch, tech: Technology) void {
        self.researched[@intFromEnum(tech)] = true;
        self.current_research = null;
        self.research_progress = 0;

        // Recalculate bonuses
        self.recalculateBonuses();
    }

    /// Grant technology directly (e.g., from trading)
    pub fn grantTech(self: *TribeResearch, tech: Technology) void {
        if (self.researched[@intFromEnum(tech)]) return;

        self.researched[@intFromEnum(tech)] = true;
        self.recalculateBonuses();
    }

    /// Check if tech is researched
    pub fn hasTech(self: *const TribeResearch, tech: Technology) bool {
        return self.researched[@intFromEnum(tech)];
    }

    /// Check if tech can be researched (prereqs met)
    pub fn canResearch(self: *const TribeResearch, tech: Technology) bool {
        if (self.researched[@intFromEnum(tech)]) return false;
        return TechPrereqs.hasPrereqs(tech, &self.researched);
    }

    /// Get current era (highest era with any tech)
    pub fn getCurrentEra(self: *const TribeResearch) u8 {
        var max_era: u8 = 0;
        for (0..24) |i| {
            if (self.researched[i]) {
                const tech: Technology = @enumFromInt(i);
                max_era = @max(max_era, tech.getEra());
            }
        }
        return max_era;
    }

    /// Get number of researched technologies
    pub fn getResearchedCount(self: *const TribeResearch) usize {
        var count: usize = 0;
        for (self.researched) |r| {
            if (r) count += 1;
        }
        return count;
    }

    /// Get available techs to research
    pub fn getAvailableTechs(self: *const TribeResearch, available: *[24]Technology) usize {
        var count: usize = 0;
        for (0..24) |i| {
            const tech: Technology = @enumFromInt(i);
            if (self.canResearch(tech)) {
                available[count] = tech;
                count += 1;
            }
        }
        return count;
    }

    /// Recalculate bonuses from all researched techs
    fn recalculateBonuses(self: *TribeResearch) void {
        self.bonuses = TechBonus.init();

        for (0..24) |i| {
            if (self.researched[i]) {
                const tech: Technology = @enumFromInt(i);
                self.bonuses.addTechBonus(tech);
            }
        }
    }

    /// Get progress percentage on current research
    pub fn getResearchProgress(self: *const TribeResearch) f32 {
        if (self.current_research) |tech| {
            const cost = tech.getBaseCost();
            return @as(f32, @floatFromInt(self.research_progress)) / @as(f32, @floatFromInt(cost)) * 100.0;
        }
        return 0;
    }
};

/// Technology manager for all tribes
pub const TechnologyManager = struct {
    tribe_research: [tribe.MAX_TRIBES]TribeResearch,

    pub fn init() TechnologyManager {
        var tm = TechnologyManager{
            .tribe_research = undefined,
        };

        for (0..tribe.MAX_TRIBES) |i| {
            tm.tribe_research[i] = TribeResearch.init();
        }

        return tm;
    }

    /// Get research state for tribe
    pub fn getResearch(self: *TechnologyManager, tribe_id: u32) ?*TribeResearch {
        if (tribe_id >= tribe.MAX_TRIBES) return null;
        return &self.tribe_research[tribe_id];
    }

    /// Get research state (const)
    pub fn getResearchConst(self: *const TechnologyManager, tribe_id: u32) ?*const TribeResearch {
        if (tribe_id >= tribe.MAX_TRIBES) return null;
        return &self.tribe_research[tribe_id];
    }

    /// Update technology system
    pub fn update(self: *TechnologyManager, delta: f32, tribes: *tribe.Tribes) void {
        _ = delta;

        for (0..tribes.count) |i| {
            const t = tribes.getTribe(@intCast(i)) orelse continue;

            // Generate research points based on population and buildings
            const base_research: u32 = @intCast(@max(1, t.member_count));

            // Add bonus from buildings (temples, libraries, etc.)
            const building_bonus: u32 = 0; // TODO: integrate with building system

            const total_research = base_research + building_bonus;

            // Add research every "tick" (roughly every second at 60fps)
            if (self.tribe_research[i].addResearchPoints(total_research)) {
                // Research completed - could trigger notification
            }
        }
    }

    /// Auto-select next research for AI tribes
    pub fn autoSelectResearch(self: *TechnologyManager, tribe_id: u32, rng: *math.Rng) void {
        if (tribe_id >= tribe.MAX_TRIBES) return;

        const research = &self.tribe_research[tribe_id];
        if (research.current_research != null) return;

        var available: [24]Technology = undefined;
        const count = research.getAvailableTechs(&available);

        if (count > 0) {
            // Pick random available tech
            const idx = @as(usize, @intFromFloat(rng.float() * @as(f32, @floatFromInt(count))));
            _ = research.startResearch(available[@min(idx, count - 1)]);
        }
    }

    /// Get tech level (number of techs researched)
    pub fn getTechLevel(self: *const TechnologyManager, tribe_id: u32) u32 {
        if (tribe_id >= tribe.MAX_TRIBES) return 0;
        return @intCast(self.tribe_research[tribe_id].getResearchedCount());
    }

    /// Check if tribe has specific tech
    pub fn hasTech(self: *const TechnologyManager, tribe_id: u32, tech: Technology) bool {
        if (tribe_id >= tribe.MAX_TRIBES) return false;
        return self.tribe_research[tribe_id].hasTech(tech);
    }

    /// Get bonuses for tribe
    pub fn getBonuses(self: *const TechnologyManager, tribe_id: u32) TechBonus {
        if (tribe_id >= tribe.MAX_TRIBES) return TechBonus.init();
        return self.tribe_research[tribe_id].bonuses;
    }

    /// Transfer technology (from trade, conquest, etc.)
    pub fn transferTech(self: *TechnologyManager, from_tribe: u32, to_tribe: u32, tech: Technology) bool {
        if (from_tribe >= tribe.MAX_TRIBES or to_tribe >= tribe.MAX_TRIBES) return false;

        // Must have the tech to transfer
        if (!self.tribe_research[from_tribe].hasTech(tech)) return false;

        // Must not already have it
        if (self.tribe_research[to_tribe].hasTech(tech)) return false;

        // Must have prerequisites
        if (!TechPrereqs.hasPrereqs(tech, &self.tribe_research[to_tribe].researched)) return false;

        self.tribe_research[to_tribe].grantTech(tech);
        return true;
    }
};

// Tests
test "Technology prerequisites" {
    try std.testing.expect(!TechPrereqs.hasPrereqs(.agriculture, &[_]bool{false} ** 24));

    var researched = [_]bool{false} ** 24;
    researched[@intFromEnum(Technology.stone_tools)] = true;
    try std.testing.expect(TechPrereqs.hasPrereqs(.agriculture, &researched));
}

test "Technology research" {
    var tr = TribeResearch.init();

    // Start with fire
    try std.testing.expect(tr.startResearch(.fire));
    try std.testing.expect(tr.current_research == .fire);

    // Add enough points to complete
    _ = tr.addResearchPoints(100);
    try std.testing.expect(tr.hasTech(.fire));
    try std.testing.expect(tr.current_research == null);

    // Bonuses should be applied
    try std.testing.expect(tr.bonuses.food_mult > 1.0);
}

test "Technology eras" {
    try std.testing.expectEqual(@as(u8, 0), Technology.fire.getEra());
    try std.testing.expectEqual(@as(u8, 1), Technology.agriculture.getEra());
    try std.testing.expectEqual(@as(u8, 2), Technology.bronze_working.getEra());
    try std.testing.expectEqual(@as(u8, 3), Technology.iron_working.getEra());
    try std.testing.expectEqual(@as(u8, 4), Technology.philosophy.getEra());
}
