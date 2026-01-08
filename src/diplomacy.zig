// Diplomacy System - Tribal relationships, alliances, wars, treaties, trade
// AAA-quality strategic depth for inter-tribe interactions

const std = @import("std");
const math = @import("math.zig");
const tribe = @import("tribe.zig");

/// Maximum active treaties
pub const MAX_TREATIES: usize = 32;

/// Maximum trade agreements
pub const MAX_TRADES: usize = 16;

/// Maximum wars tracked
pub const MAX_WARS: usize = 8;

/// Diplomatic status between two tribes
pub const DiplomaticStatus = enum(u8) {
    unknown = 0,      // Never met
    hostile = 1,      // At war (-100 to -50 rep)
    unfriendly = 2,   // Tense relations (-50 to -20 rep)
    neutral = 3,      // Default state (-20 to +20 rep)
    friendly = 4,     // Good relations (+20 to +50 rep)
    allied = 5,       // Military alliance (+50 to +100 rep)
    vassal = 6,       // Subservient tribe
    overlord = 7,     // Dominant tribe
};

/// Treaty types between tribes
pub const TreatyType = enum(u8) {
    non_aggression = 0,   // No attacking each other
    trade_agreement = 1,  // Resource exchange bonus
    military_alliance = 2, // Fight together
    tribute = 3,          // Regular resource payment
    border_agreement = 4, // Defined territory
    marriage = 5,         // Royal marriage (stronger bond)
};

/// War declaration reasons
pub const WarReason = enum(u8) {
    conquest = 0,        // Want their territory
    resources = 1,       // Want their resources
    revenge = 2,         // They wronged us
    holy_war = 3,        // Religious differences
    defensive = 4,       // They attacked us
    liberation = 5,      // Free a vassal
    honor = 6,           // Broken treaty
};

/// Active treaty between tribes
pub const Treaty = struct {
    active: bool,
    treaty_type: TreatyType,
    tribe_a: u32,
    tribe_b: u32,
    start_time: f32,
    duration: f32,        // 0 = permanent until broken
    terms: TreatyTerms,

    pub const TreatyTerms = struct {
        resource_amount: f32,   // For trade/tribute
        resource_type: u8,      // Which resource
        territory_id: u32,      // For border agreements
    };

    pub fn init(treaty_type: TreatyType, tribe_a: u32, tribe_b: u32, time: f32) Treaty {
        return .{
            .active = true,
            .treaty_type = treaty_type,
            .tribe_a = tribe_a,
            .tribe_b = tribe_b,
            .start_time = time,
            .duration = switch (treaty_type) {
                .non_aggression => 300.0,    // 5 minutes
                .trade_agreement => 600.0,   // 10 minutes
                .military_alliance => 900.0, // 15 minutes
                .tribute => 0.0,             // Until broken
                .border_agreement => 0.0,    // Permanent
                .marriage => 0.0,            // Permanent
            },
            .terms = .{
                .resource_amount = 0,
                .resource_type = 0,
                .territory_id = 0,
            },
        };
    }

    pub fn isExpired(self: *const Treaty, current_time: f32) bool {
        if (!self.active) return true;
        if (self.duration == 0) return false; // Permanent
        return current_time > self.start_time + self.duration;
    }

    pub fn involves(self: *const Treaty, tribe_id: u32) bool {
        return self.tribe_a == tribe_id or self.tribe_b == tribe_id;
    }

    pub fn getPartner(self: *const Treaty, tribe_id: u32) ?u32 {
        if (self.tribe_a == tribe_id) return self.tribe_b;
        if (self.tribe_b == tribe_id) return self.tribe_a;
        return null;
    }
};

/// Active war between tribes
pub const War = struct {
    active: bool,
    attacker: u32,
    defender: u32,
    reason: WarReason,
    start_time: f32,

    // War score (-100 to +100, positive = attacker winning)
    war_score: i32,

    // Casualties
    attacker_casualties: u32,
    defender_casualties: u32,

    // Battles fought
    battles_won_attacker: u32,
    battles_won_defender: u32,

    pub fn init(attacker: u32, defender: u32, reason: WarReason, time: f32) War {
        return .{
            .active = true,
            .attacker = attacker,
            .defender = defender,
            .reason = reason,
            .start_time = time,
            .war_score = 0,
            .attacker_casualties = 0,
            .defender_casualties = 0,
            .battles_won_attacker = 0,
            .battles_won_defender = 0,
        };
    }

    pub fn involves(self: *const War, tribe_id: u32) bool {
        return self.attacker == tribe_id or self.defender == tribe_id;
    }

    pub fn isAttacker(self: *const War, tribe_id: u32) bool {
        return self.attacker == tribe_id;
    }

    pub fn recordCasualty(self: *War, is_attacker: bool) void {
        if (is_attacker) {
            self.attacker_casualties += 1;
            self.war_score -= 5;
        } else {
            self.defender_casualties += 1;
            self.war_score += 5;
        }
        self.war_score = std.math.clamp(self.war_score, -100, 100);
    }

    pub fn recordBattle(self: *War, attacker_won: bool) void {
        if (attacker_won) {
            self.battles_won_attacker += 1;
            self.war_score += 15;
        } else {
            self.battles_won_defender += 1;
            self.war_score -= 15;
        }
        self.war_score = std.math.clamp(self.war_score, -100, 100);
    }

    /// Check if war should end (one side surrenders)
    pub fn shouldEnd(self: *const War) bool {
        return self.war_score >= 80 or self.war_score <= -80;
    }
};

/// Trade offer between tribes
pub const TradeOffer = struct {
    active: bool,
    from_tribe: u32,
    to_tribe: u32,

    // What they offer
    offer_food: f32,
    offer_wood: f32,
    offer_stone: f32,
    offer_metal: f32,

    // What they want
    request_food: f32,
    request_wood: f32,
    request_stone: f32,
    request_metal: f32,

    // Timing
    created_time: f32,
    expires_time: f32,

    pub fn init(from: u32, to: u32, time: f32) TradeOffer {
        return .{
            .active = true,
            .from_tribe = from,
            .to_tribe = to,
            .offer_food = 0,
            .offer_wood = 0,
            .offer_stone = 0,
            .offer_metal = 0,
            .request_food = 0,
            .request_wood = 0,
            .request_stone = 0,
            .request_metal = 0,
            .created_time = time,
            .expires_time = time + 60.0, // 1 minute to accept
        };
    }

    pub fn isExpired(self: *const TradeOffer, current_time: f32) bool {
        return current_time > self.expires_time;
    }

    /// Calculate trade value ratio (1.0 = fair trade)
    pub fn getValueRatio(self: *const TradeOffer) f32 {
        const offer_value = self.offer_food + self.offer_wood * 1.5 +
                           self.offer_stone * 2.0 + self.offer_metal * 4.0;
        const request_value = self.request_food + self.request_wood * 1.5 +
                             self.request_stone * 2.0 + self.request_metal * 4.0;

        if (request_value < 0.01) return 100.0; // Free gift
        return offer_value / request_value;
    }
};

/// Reputation event types
pub const ReputationEvent = enum(u8) {
    first_contact = 0,       // +10 initial meeting
    trade_completed = 1,     // +5 per trade
    gift_given = 2,          // +10 for gifts
    treaty_signed = 3,       // +15 for treaties
    treaty_broken = 4,       // -30 for breaking treaty
    war_declared = 5,        // -40 for declaring war
    war_ended_peace = 6,     // +10 for peace
    battle_won = 7,          // -5 (fear/respect)
    battle_lost = 8,         // +5 (sympathy)
    territory_violation = 9, // -15 for border crossing
    ally_attacked = 10,      // -25 for attacking ally
    defended_ally = 11,      // +20 for defending ally
    tribute_paid = 12,       // +5 for paying tribute
    tribute_missed = 13,     // -20 for missing tribute
};

/// Diplomacy manager - handles all inter-tribe relations
pub const DiplomacyManager = struct {
    // Treaties
    treaties: [MAX_TREATIES]Treaty,
    treaty_count: usize,

    // Wars
    wars: [MAX_WARS]War,
    war_count: usize,

    // Trade offers
    trades: [MAX_TRADES]TradeOffer,
    trade_count: usize,

    // Reputation matrix (tribe_a reputation with tribe_b)
    // Range: -100 (hated) to +100 (beloved)
    reputation: [tribe.MAX_TRIBES][tribe.MAX_TRIBES]i8,

    // Diplomatic status cache (derived from reputation)
    status: [tribe.MAX_TRIBES][tribe.MAX_TRIBES]DiplomaticStatus,

    // First contact tracking
    has_met: [tribe.MAX_TRIBES][tribe.MAX_TRIBES]bool,

    // Trade cooldowns (prevent spam)
    trade_cooldowns: [tribe.MAX_TRIBES][tribe.MAX_TRIBES]f32,

    pub fn init() DiplomacyManager {
        var dm = DiplomacyManager{
            .treaties = undefined,
            .treaty_count = 0,
            .wars = undefined,
            .war_count = 0,
            .trades = undefined,
            .trade_count = 0,
            .reputation = [_][tribe.MAX_TRIBES]i8{[_]i8{0} ** tribe.MAX_TRIBES} ** tribe.MAX_TRIBES,
            .status = [_][tribe.MAX_TRIBES]DiplomaticStatus{[_]DiplomaticStatus{.unknown} ** tribe.MAX_TRIBES} ** tribe.MAX_TRIBES,
            .has_met = [_][tribe.MAX_TRIBES]bool{[_]bool{false} ** tribe.MAX_TRIBES} ** tribe.MAX_TRIBES,
            .trade_cooldowns = [_][tribe.MAX_TRIBES]f32{[_]f32{0} ** tribe.MAX_TRIBES} ** tribe.MAX_TRIBES,
        };

        // Self-relations are always max
        for (0..tribe.MAX_TRIBES) |i| {
            dm.reputation[i][i] = 100;
            dm.status[i][i] = .allied;
            dm.has_met[i][i] = true;
        }

        return dm;
    }

    /// Record first contact between tribes
    pub fn recordFirstContact(self: *DiplomacyManager, tribe_a: u32, tribe_b: u32) void {
        if (tribe_a >= tribe.MAX_TRIBES or tribe_b >= tribe.MAX_TRIBES) return;
        if (tribe_a == tribe_b) return;
        if (self.has_met[tribe_a][tribe_b]) return;

        self.has_met[tribe_a][tribe_b] = true;
        self.has_met[tribe_b][tribe_a] = true;

        // Initial reputation from first contact
        self.modifyReputation(tribe_a, tribe_b, 10);
    }

    /// Modify reputation between tribes
    pub fn modifyReputation(self: *DiplomacyManager, tribe_a: u32, tribe_b: u32, delta: i32) void {
        if (tribe_a >= tribe.MAX_TRIBES or tribe_b >= tribe.MAX_TRIBES) return;
        if (tribe_a == tribe_b) return;

        // Apply change (bidirectional but possibly asymmetric)
        const current_ab = self.reputation[tribe_a][tribe_b];
        const current_ba = self.reputation[tribe_b][tribe_a];

        self.reputation[tribe_a][tribe_b] = @intCast(std.math.clamp(@as(i32, current_ab) + delta, -100, 100));
        // Other side gets slightly less effect (they perceive differently)
        self.reputation[tribe_b][tribe_a] = @intCast(std.math.clamp(@as(i32, current_ba) + @divTrunc(delta * 3, 4), -100, 100));

        // Update diplomatic status
        self.updateStatus(tribe_a, tribe_b);
        self.updateStatus(tribe_b, tribe_a);
    }

    /// Update diplomatic status based on reputation
    fn updateStatus(self: *DiplomacyManager, from: u32, to: u32) void {
        if (from >= tribe.MAX_TRIBES or to >= tribe.MAX_TRIBES) return;

        if (!self.has_met[from][to]) {
            self.status[from][to] = .unknown;
            return;
        }

        const rep = self.reputation[from][to];

        // Check for special status (wars override)
        if (self.isAtWar(from, to)) {
            self.status[from][to] = .hostile;
            return;
        }

        // Check for alliance treaty
        if (self.hasTreaty(from, to, .military_alliance)) {
            self.status[from][to] = .allied;
            return;
        }

        // Based on reputation
        if (rep < -50) {
            self.status[from][to] = .hostile;
        } else if (rep < -20) {
            self.status[from][to] = .unfriendly;
        } else if (rep < 20) {
            self.status[from][to] = .neutral;
        } else if (rep < 50) {
            self.status[from][to] = .friendly;
        } else {
            self.status[from][to] = .allied;
        }
    }

    /// Get reputation between tribes
    pub fn getReputation(self: *const DiplomacyManager, from: u32, to: u32) i8 {
        if (from >= tribe.MAX_TRIBES or to >= tribe.MAX_TRIBES) return 0;
        return self.reputation[from][to];
    }

    /// Get diplomatic status
    pub fn getStatus(self: *const DiplomacyManager, from: u32, to: u32) DiplomaticStatus {
        if (from >= tribe.MAX_TRIBES or to >= tribe.MAX_TRIBES) return .unknown;
        return self.status[from][to];
    }

    /// Check if two tribes have met
    pub fn haveMet(self: *const DiplomacyManager, tribe_a: u32, tribe_b: u32) bool {
        if (tribe_a >= tribe.MAX_TRIBES or tribe_b >= tribe.MAX_TRIBES) return false;
        return self.has_met[tribe_a][tribe_b];
    }

    // === Treaty Management ===

    /// Create a new treaty
    pub fn createTreaty(self: *DiplomacyManager, treaty_type: TreatyType, tribe_a: u32, tribe_b: u32, time: f32) ?usize {
        if (self.treaty_count >= MAX_TREATIES) return null;
        if (tribe_a >= tribe.MAX_TRIBES or tribe_b >= tribe.MAX_TRIBES) return null;
        if (tribe_a == tribe_b) return null;

        // Check if similar treaty already exists
        if (self.hasTreaty(tribe_a, tribe_b, treaty_type)) return null;

        const idx = self.treaty_count;
        self.treaties[idx] = Treaty.init(treaty_type, tribe_a, tribe_b, time);
        self.treaty_count += 1;

        // Reputation boost for signing
        self.modifyReputation(tribe_a, tribe_b, 15);

        return idx;
    }

    /// Break a treaty
    pub fn breakTreaty(self: *DiplomacyManager, treaty_idx: usize) void {
        if (treaty_idx >= self.treaty_count) return;

        const t = &self.treaties[treaty_idx];
        if (!t.active) return;

        // Reputation penalty for breaking treaty
        self.modifyReputation(t.tribe_a, t.tribe_b, -30);

        t.active = false;
    }

    /// Check if treaty exists
    pub fn hasTreaty(self: *const DiplomacyManager, tribe_a: u32, tribe_b: u32, treaty_type: TreatyType) bool {
        for (self.treaties[0..self.treaty_count]) |*t| {
            if (t.active and t.treaty_type == treaty_type and t.involves(tribe_a) and t.involves(tribe_b)) {
                return true;
            }
        }
        return false;
    }

    /// Check if tribes have any treaty
    pub fn hasAnyTreaty(self: *const DiplomacyManager, tribe_a: u32, tribe_b: u32) bool {
        for (self.treaties[0..self.treaty_count]) |*t| {
            if (t.active and t.involves(tribe_a) and t.involves(tribe_b)) {
                return true;
            }
        }
        return false;
    }

    // === War Management ===

    /// Declare war
    pub fn declareWar(self: *DiplomacyManager, attacker: u32, defender: u32, reason: WarReason, time: f32) ?usize {
        if (self.war_count >= MAX_WARS) return null;
        if (attacker >= tribe.MAX_TRIBES or defender >= tribe.MAX_TRIBES) return null;
        if (attacker == defender) return null;

        // Can't declare war if already at war
        if (self.isAtWar(attacker, defender)) return null;

        const idx = self.war_count;
        self.wars[idx] = War.init(attacker, defender, reason, time);
        self.war_count += 1;

        // Major reputation hit
        self.modifyReputation(attacker, defender, -40);

        // Break any treaties
        for (self.treaties[0..self.treaty_count]) |*t| {
            if (t.active and t.involves(attacker) and t.involves(defender)) {
                t.active = false;
            }
        }

        return idx;
    }

    /// End war with peace
    pub fn endWar(self: *DiplomacyManager, war_idx: usize) void {
        if (war_idx >= self.war_count) return;

        const w = &self.wars[war_idx];
        if (!w.active) return;

        // Slight reputation recovery for peace
        self.modifyReputation(w.attacker, w.defender, 10);

        w.active = false;
    }

    /// Check if tribes are at war
    pub fn isAtWar(self: *const DiplomacyManager, tribe_a: u32, tribe_b: u32) bool {
        for (self.wars[0..self.war_count]) |*w| {
            if (w.active and w.involves(tribe_a) and w.involves(tribe_b)) {
                return true;
            }
        }
        return false;
    }

    /// Get active war between tribes
    pub fn getWar(self: *DiplomacyManager, tribe_a: u32, tribe_b: u32) ?*War {
        for (self.wars[0..self.war_count]) |*w| {
            if (w.active and w.involves(tribe_a) and w.involves(tribe_b)) {
                return w;
            }
        }
        return null;
    }

    /// Get war involving tribe
    pub fn getWarForTribe(self: *DiplomacyManager, tribe_id: u32) ?*War {
        for (self.wars[0..self.war_count]) |*w| {
            if (w.active and w.involves(tribe_id)) {
                return w;
            }
        }
        return null;
    }

    // === Trade Management ===

    /// Create trade offer
    pub fn createTradeOffer(self: *DiplomacyManager, from: u32, to: u32, time: f32) ?*TradeOffer {
        if (self.trade_count >= MAX_TRADES) return null;
        if (from >= tribe.MAX_TRIBES or to >= tribe.MAX_TRIBES) return null;
        if (from == to) return null;

        // Check cooldown
        if (self.trade_cooldowns[from][to] > 0) return null;

        const idx = self.trade_count;
        self.trades[idx] = TradeOffer.init(from, to, time);
        self.trade_count += 1;

        return &self.trades[idx];
    }

    /// Accept trade offer (returns true if successful)
    pub fn acceptTrade(self: *DiplomacyManager, trade_idx: usize, tribes_mgr: *tribe.Tribes) bool {
        if (trade_idx >= self.trade_count) return false;

        const t = &self.trades[trade_idx];
        if (!t.active) return false;

        const from_tribe = tribes_mgr.getTribe(t.from_tribe) orelse return false;
        const to_tribe = tribes_mgr.getTribe(t.to_tribe) orelse return false;

        // Check if both sides can fulfill
        if (!from_tribe.hasResources(t.offer_food, 0, 0, 0) or
            from_tribe.wood < t.offer_wood or
            from_tribe.stone < t.offer_stone or
            from_tribe.metal < t.offer_metal) {
            return false;
        }

        if (!to_tribe.hasResources(t.request_food, 0, 0, 0) or
            to_tribe.wood < t.request_wood or
            to_tribe.stone < t.request_stone or
            to_tribe.metal < t.request_metal) {
            return false;
        }

        // Execute trade
        from_tribe.food -= t.offer_food;
        from_tribe.wood -= t.offer_wood;
        from_tribe.stone -= t.offer_stone;
        from_tribe.metal -= t.offer_metal;

        from_tribe.food += t.request_food;
        from_tribe.wood += t.request_wood;
        from_tribe.stone += t.request_stone;
        from_tribe.metal += t.request_metal;

        to_tribe.food -= t.request_food;
        to_tribe.wood -= t.request_wood;
        to_tribe.stone -= t.request_stone;
        to_tribe.metal -= t.request_metal;

        to_tribe.food += t.offer_food;
        to_tribe.wood += t.offer_wood;
        to_tribe.stone += t.offer_stone;
        to_tribe.metal += t.offer_metal;

        // Reputation boost
        self.modifyReputation(t.from_tribe, t.to_tribe, 5);

        // Set cooldown
        self.trade_cooldowns[t.from_tribe][t.to_tribe] = 30.0;

        t.active = false;
        return true;
    }

    /// Decline trade offer
    pub fn declineTrade(self: *DiplomacyManager, trade_idx: usize) void {
        if (trade_idx >= self.trade_count) return;
        self.trades[trade_idx].active = false;
    }

    // === Update ===

    /// Update diplomacy system
    pub fn update(self: *DiplomacyManager, delta: f32, current_time: f32) void {
        // Update trade cooldowns
        for (0..tribe.MAX_TRIBES) |i| {
            for (0..tribe.MAX_TRIBES) |j| {
                if (self.trade_cooldowns[i][j] > 0) {
                    self.trade_cooldowns[i][j] -= delta;
                }
            }
        }

        // Expire treaties
        for (self.treaties[0..self.treaty_count]) |*t| {
            if (t.active and t.isExpired(current_time)) {
                t.active = false;
            }
        }

        // Expire trade offers
        for (self.trades[0..self.trade_count]) |*t| {
            if (t.active and t.isExpired(current_time)) {
                t.active = false;
            }
        }

        // Check for war endings
        for (self.wars[0..self.war_count], 0..) |*w, idx| {
            if (w.active and w.shouldEnd()) {
                self.endWar(idx);
            }
        }

        // Slow reputation drift towards neutral (0.1 per minute)
        if (@as(u64, @intFromFloat(current_time)) % 60 == 0) {
            for (0..tribe.MAX_TRIBES) |i| {
                for (0..tribe.MAX_TRIBES) |j| {
                    if (i == j) continue;
                    if (!self.has_met[i][j]) continue;

                    const rep = self.reputation[i][j];
                    if (rep > 0) {
                        self.reputation[i][j] = @max(0, rep - 1);
                    } else if (rep < 0) {
                        self.reputation[i][j] = @min(0, rep + 1);
                    }
                }
            }
        }
    }

    // === AI Decision Helpers ===

    /// Should tribe consider war? (AI decision helper)
    pub fn shouldConsiderWar(self: *const DiplomacyManager, attacker: u32, defender: u32) bool {
        if (attacker >= tribe.MAX_TRIBES or defender >= tribe.MAX_TRIBES) return false;

        // Don't attack if already at war
        if (self.isAtWar(attacker, defender)) return false;

        // Don't attack allies
        if (self.hasTreaty(attacker, defender, .military_alliance)) return false;

        // More likely if hostile
        return self.reputation[attacker][defender] < -30;
    }

    /// Should tribe accept alliance? (AI decision helper)
    pub fn shouldAcceptAlliance(self: *const DiplomacyManager, tribe_id: u32, other_id: u32) bool {
        if (tribe_id >= tribe.MAX_TRIBES or other_id >= tribe.MAX_TRIBES) return false;

        // Need at least friendly relations
        return self.reputation[tribe_id][other_id] >= 30;
    }

    /// Get allies of a tribe
    pub fn getAllies(self: *const DiplomacyManager, tribe_id: u32, allies: *[tribe.MAX_TRIBES]u32) usize {
        var count: usize = 0;

        for (self.treaties[0..self.treaty_count]) |*t| {
            if (t.active and t.treaty_type == .military_alliance and t.involves(tribe_id)) {
                if (t.getPartner(tribe_id)) |ally_id| {
                    allies[count] = ally_id;
                    count += 1;
                    if (count >= tribe.MAX_TRIBES) break;
                }
            }
        }

        return count;
    }

    /// Get enemies of a tribe (at war with)
    pub fn getEnemies(self: *const DiplomacyManager, tribe_id: u32, enemies: *[tribe.MAX_TRIBES]u32) usize {
        var count: usize = 0;

        for (self.wars[0..self.war_count]) |*w| {
            if (w.active and w.involves(tribe_id)) {
                const enemy_id = if (w.attacker == tribe_id) w.defender else w.attacker;
                enemies[count] = enemy_id;
                count += 1;
                if (count >= tribe.MAX_TRIBES) break;
            }
        }

        return count;
    }

    /// Get total number of active treaties
    pub fn getActiveTreatyCount(self: *const DiplomacyManager) usize {
        var count: usize = 0;
        for (self.treaties[0..self.treaty_count]) |*t| {
            if (t.active) count += 1;
        }
        return count;
    }

    /// Get total number of active wars
    pub fn getActiveWarCount(self: *const DiplomacyManager) usize {
        var count: usize = 0;
        for (self.wars[0..self.war_count]) |*w| {
            if (w.active) count += 1;
        }
        return count;
    }
};

// Tests
test "Diplomacy reputation system" {
    var dm = DiplomacyManager.init();

    // Initial state
    try std.testing.expectEqual(DiplomaticStatus.unknown, dm.getStatus(0, 1));
    try std.testing.expectEqual(@as(i8, 0), dm.getReputation(0, 1));

    // First contact
    dm.recordFirstContact(0, 1);
    try std.testing.expect(dm.haveMet(0, 1));
    try std.testing.expect(dm.getReputation(0, 1) > 0);

    // Modify reputation
    dm.modifyReputation(0, 1, 50);
    try std.testing.expect(dm.getReputation(0, 1) > 50);
}

test "Diplomacy treaties" {
    var dm = DiplomacyManager.init();

    // Create treaty
    const idx = dm.createTreaty(.non_aggression, 0, 1, 0.0);
    try std.testing.expect(idx != null);
    try std.testing.expect(dm.hasTreaty(0, 1, .non_aggression));

    // Break treaty
    dm.breakTreaty(idx.?);
    try std.testing.expect(!dm.hasTreaty(0, 1, .non_aggression));
}

test "Diplomacy wars" {
    var dm = DiplomacyManager.init();

    // Declare war
    const idx = dm.declareWar(0, 1, .conquest, 0.0);
    try std.testing.expect(idx != null);
    try std.testing.expect(dm.isAtWar(0, 1));
    try std.testing.expectEqual(DiplomaticStatus.hostile, dm.getStatus(0, 1));

    // Record battle
    if (dm.getWar(0, 1)) |w| {
        w.recordBattle(true);
        try std.testing.expect(w.war_score > 0);
    }

    // End war
    dm.endWar(idx.?);
    try std.testing.expect(!dm.isAtWar(0, 1));
}
