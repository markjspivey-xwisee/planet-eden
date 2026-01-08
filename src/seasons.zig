// Seasons System - Dynamic seasonal events affecting survival and gameplay
// Includes weather, harvests, migrations, disasters, and environmental effects

const std = @import("std");
const math = @import("math.zig");
const tribe = @import("tribe.zig");

/// Season types
pub const Season = enum(u8) {
    spring = 0,
    summer = 1,
    autumn = 2,
    winter = 3,

    pub fn getName(self: Season) []const u8 {
        return switch (self) {
            .spring => "Spring",
            .summer => "Summer",
            .autumn => "Autumn",
            .winter => "Winter",
        };
    }

    pub fn getNext(self: Season) Season {
        return @enumFromInt((@intFromEnum(self) + 1) % 4);
    }
};

/// Weather conditions
pub const Weather = enum(u8) {
    clear = 0,
    cloudy = 1,
    rain = 2,
    storm = 3,
    snow = 4,
    blizzard = 5,
    drought = 6,
    fog = 7,
    heat_wave = 8,

    pub fn getName(self: Weather) []const u8 {
        return switch (self) {
            .clear => "Clear",
            .cloudy => "Cloudy",
            .rain => "Rain",
            .storm => "Storm",
            .snow => "Snow",
            .blizzard => "Blizzard",
            .drought => "Drought",
            .fog => "Fog",
            .heat_wave => "Heat Wave",
        };
    }

    /// Get movement speed modifier
    pub fn getMovementMod(self: Weather) f32 {
        return switch (self) {
            .clear => 1.0,
            .cloudy => 1.0,
            .rain => 0.85,
            .storm => 0.6,
            .snow => 0.7,
            .blizzard => 0.3,
            .drought => 0.9,
            .fog => 0.8,
            .heat_wave => 0.75,
        };
    }

    /// Get food gathering modifier
    pub fn getFoodGatherMod(self: Weather) f32 {
        return switch (self) {
            .clear => 1.0,
            .cloudy => 1.0,
            .rain => 1.2,  // Rain helps plants
            .storm => 0.5,
            .snow => 0.3,
            .blizzard => 0.1,
            .drought => 0.4,
            .fog => 0.8,
            .heat_wave => 0.6,
        };
    }

    /// Get health drain per second (harsh weather)
    pub fn getHealthDrain(self: Weather) f32 {
        return switch (self) {
            .clear => 0,
            .cloudy => 0,
            .rain => 0.1,
            .storm => 0.5,
            .snow => 0.3,
            .blizzard => 1.5,
            .drought => 0.4,
            .fog => 0,
            .heat_wave => 0.6,
        };
    }
};

/// Event types that can occur
pub const EventType = enum(u8) {
    // Positive events
    bountiful_harvest = 0,    // Extra food
    migration_arrival = 1,    // New animals arrive
    discovery = 2,            // Random tech progress
    celebration = 3,          // Morale boost

    // Neutral events
    seasonal_change = 4,      // Season transition
    eclipse = 5,              // Rare celestial event
    migration_departure = 6,  // Animals leave

    // Negative events
    famine = 7,               // Food shortage
    disease_outbreak = 8,     // Plague/sickness
    predator_attack = 9,      // Carnivore surge
    natural_disaster = 10,    // Earthquake, flood, etc.
    harsh_winter = 11,        // Extra cold
    drought = 12,             // Water shortage
    fire = 13,                // Forest fire

    // Special events
    meteor = 14,              // Rare, destructive
    aurora = 15,              // Rare, beautiful
    flood = 16,               // River overflow

    pub fn getName(self: EventType) []const u8 {
        return switch (self) {
            .bountiful_harvest => "Bountiful Harvest",
            .migration_arrival => "Animal Migration",
            .discovery => "Discovery",
            .celebration => "Celebration",
            .seasonal_change => "Season Change",
            .eclipse => "Eclipse",
            .migration_departure => "Migration Departure",
            .famine => "Famine",
            .disease_outbreak => "Disease Outbreak",
            .predator_attack => "Predator Attack",
            .natural_disaster => "Natural Disaster",
            .harsh_winter => "Harsh Winter",
            .drought => "Drought",
            .fire => "Forest Fire",
            .meteor => "Meteor Strike",
            .aurora => "Northern Lights",
            .flood => "Flood",
        };
    }

    pub fn isPositive(self: EventType) bool {
        return switch (self) {
            .bountiful_harvest, .migration_arrival, .discovery, .celebration, .aurora => true,
            else => false,
        };
    }

    pub fn isNegative(self: EventType) bool {
        return switch (self) {
            .famine, .disease_outbreak, .predator_attack, .natural_disaster,
            .harsh_winter, .drought, .fire, .meteor, .flood => true,
            else => false,
        };
    }
};

/// Active event
pub const Event = struct {
    event_type: EventType,
    start_time: f32,
    duration: f32,
    intensity: f32,        // 0-1 strength of effect
    affected_tribe: u32,   // 0xFFFFFFFF = affects all
    position_x: f32,       // Center of effect
    position_z: f32,
    radius: f32,           // Affected area

    pub fn init(event_type: EventType, time: f32, rng: *math.Rng) Event {
        return .{
            .event_type = event_type,
            .start_time = time,
            .duration = getDefaultDuration(event_type),
            .intensity = 0.5 + rng.float() * 0.5, // 0.5-1.0
            .affected_tribe = 0xFFFFFFFF, // All tribes
            .position_x = rng.range(-80, 80),
            .position_z = rng.range(-80, 80),
            .radius = getDefaultRadius(event_type),
        };
    }

    fn getDefaultDuration(event_type: EventType) f32 {
        return switch (event_type) {
            .bountiful_harvest => 120.0,   // 2 minutes
            .migration_arrival => 60.0,
            .discovery => 10.0,
            .celebration => 30.0,
            .seasonal_change => 5.0,
            .eclipse => 30.0,
            .migration_departure => 60.0,
            .famine => 180.0,              // 3 minutes
            .disease_outbreak => 120.0,
            .predator_attack => 45.0,
            .natural_disaster => 20.0,
            .harsh_winter => 240.0,        // 4 minutes
            .drought => 300.0,             // 5 minutes
            .fire => 60.0,
            .meteor => 5.0,
            .aurora => 60.0,
            .flood => 90.0,
        };
    }

    fn getDefaultRadius(event_type: EventType) f32 {
        return switch (event_type) {
            .bountiful_harvest => 50.0,
            .migration_arrival => 100.0,
            .discovery => 20.0,
            .celebration => 30.0,
            .seasonal_change => 200.0,     // Global
            .eclipse => 200.0,
            .migration_departure => 100.0,
            .famine => 80.0,
            .disease_outbreak => 40.0,
            .predator_attack => 30.0,
            .natural_disaster => 60.0,
            .harsh_winter => 200.0,
            .drought => 100.0,
            .fire => 40.0,
            .meteor => 25.0,
            .aurora => 200.0,
            .flood => 50.0,
        };
    }

    pub fn isExpired(self: *const Event, current_time: f32) bool {
        return current_time > self.start_time + self.duration;
    }

    pub fn isInRange(self: *const Event, x: f32, z: f32) bool {
        const dx = x - self.position_x;
        const dz = z - self.position_z;
        return (dx * dx + dz * dz) <= (self.radius * self.radius);
    }

    pub fn getProgress(self: *const Event, current_time: f32) f32 {
        const elapsed = current_time - self.start_time;
        return math.clamp(elapsed / self.duration, 0, 1);
    }
};

/// Maximum active events
pub const MAX_EVENTS: usize = 16;

/// Season and weather manager
pub const SeasonManager = struct {
    // Current state
    current_season: Season,
    current_weather: Weather,
    current_day: u32,
    current_year: u32,

    // Timing
    season_timer: f32,        // Time in current season
    weather_timer: f32,       // Time until weather change
    day_timer: f32,           // Day/night cycle

    // Season configuration
    season_length: f32,       // Seconds per season (default 120)
    day_length: f32,          // Seconds per day (default 60)

    // Active events
    events: [MAX_EVENTS]Event,
    event_count: usize,

    // Environmental modifiers (cumulative from weather + events)
    food_modifier: f32,
    movement_modifier: f32,
    health_modifier: f32,     // Positive = healing, negative = damage
    birth_rate_modifier: f32,

    // Statistics
    total_events_triggered: u32,

    pub fn init() SeasonManager {
        return .{
            .current_season = .spring,
            .current_weather = .clear,
            .current_day = 1,
            .current_year = 1,
            .season_timer = 0,
            .weather_timer = 30.0,
            .day_timer = 0,
            .season_length = 120.0, // 2 minutes per season = 8 minute year
            .day_length = 60.0,     // 1 minute per day
            .events = undefined,
            .event_count = 0,
            .food_modifier = 1.0,
            .movement_modifier = 1.0,
            .health_modifier = 0,
            .birth_rate_modifier = 1.0,
            .total_events_triggered = 0,
        };
    }

    /// Update season system
    pub fn update(self: *SeasonManager, delta: f32, rng: *math.Rng) void {
        // Update timers
        self.season_timer += delta;
        self.weather_timer -= delta;
        self.day_timer += delta;

        // Day/night cycle
        if (self.day_timer >= self.day_length) {
            self.day_timer -= self.day_length;
            self.current_day += 1;
        }

        // Season change
        if (self.season_timer >= self.season_length) {
            self.season_timer -= self.season_length;
            self.changeSeason(rng);
        }

        // Weather change
        if (self.weather_timer <= 0) {
            self.changeWeather(rng);
        }

        // Random event chance (roughly every 30 seconds on average)
        if (rng.float() < delta / 30.0) {
            self.triggerRandomEvent(rng);
        }

        // Update/expire events
        self.updateEvents(delta);

        // Recalculate modifiers
        self.recalculateModifiers();
    }

    /// Change to next season
    fn changeSeason(self: *SeasonManager, rng: *math.Rng) void {
        const old_season = self.current_season;
        self.current_season = old_season.getNext();

        // Year change
        if (self.current_season == .spring and old_season == .winter) {
            self.current_year += 1;
        }

        // Trigger season change event
        self.triggerEvent(.seasonal_change, rng);

        // Reset weather for new season
        self.changeWeather(rng);
    }

    /// Change weather based on season
    fn changeWeather(self: *SeasonManager, rng: *math.Rng) void {
        const roll = rng.float();

        self.current_weather = switch (self.current_season) {
            .spring => blk: {
                if (roll < 0.3) break :blk .clear;
                if (roll < 0.6) break :blk .cloudy;
                if (roll < 0.85) break :blk .rain;
                break :blk .storm;
            },
            .summer => blk: {
                if (roll < 0.5) break :blk .clear;
                if (roll < 0.7) break :blk .cloudy;
                if (roll < 0.85) break :blk .heat_wave;
                if (roll < 0.95) break :blk .rain;
                break :blk .drought;
            },
            .autumn => blk: {
                if (roll < 0.2) break :blk .clear;
                if (roll < 0.5) break :blk .cloudy;
                if (roll < 0.7) break :blk .fog;
                if (roll < 0.9) break :blk .rain;
                break :blk .storm;
            },
            .winter => blk: {
                if (roll < 0.2) break :blk .clear;
                if (roll < 0.4) break :blk .cloudy;
                if (roll < 0.7) break :blk .snow;
                if (roll < 0.9) break :blk .storm;
                break :blk .blizzard;
            },
        };

        // Set next weather change time
        self.weather_timer = 20.0 + rng.range(0, 40); // 20-60 seconds
    }

    /// Trigger a random event based on season
    fn triggerRandomEvent(self: *SeasonManager, rng: *math.Rng) void {
        const roll = rng.float();

        const event_type: ?EventType = switch (self.current_season) {
            .spring => blk: {
                if (roll < 0.3) break :blk .migration_arrival;
                if (roll < 0.5) break :blk .bountiful_harvest;
                if (roll < 0.6) break :blk .flood;
                if (roll < 0.7) break :blk .disease_outbreak;
                break :blk null;
            },
            .summer => blk: {
                if (roll < 0.2) break :blk .drought;
                if (roll < 0.4) break :blk .fire;
                if (roll < 0.6) break :blk .bountiful_harvest;
                if (roll < 0.7) break :blk .celebration;
                break :blk null;
            },
            .autumn => blk: {
                if (roll < 0.35) break :blk .bountiful_harvest;
                if (roll < 0.5) break :blk .migration_departure;
                if (roll < 0.6) break :blk .predator_attack;
                if (roll < 0.7) break :blk .discovery;
                break :blk null;
            },
            .winter => blk: {
                if (roll < 0.3) break :blk .harsh_winter;
                if (roll < 0.5) break :blk .famine;
                if (roll < 0.6) break :blk .disease_outbreak;
                if (roll < 0.65) break :blk .aurora;
                break :blk null;
            },
        };

        if (event_type) |et| {
            self.triggerEvent(et, rng);
        }
    }

    /// Trigger a specific event
    pub fn triggerEvent(self: *SeasonManager, event_type: EventType, rng: *math.Rng) void {
        if (self.event_count >= MAX_EVENTS) {
            // Remove oldest event
            for (1..self.event_count) |i| {
                self.events[i - 1] = self.events[i];
            }
            self.event_count -= 1;
        }

        const current_time = self.season_timer + @as(f32, @floatFromInt(self.current_year * 4)) * self.season_length;

        self.events[self.event_count] = Event.init(event_type, current_time, rng);
        self.event_count += 1;
        self.total_events_triggered += 1;
    }

    /// Update active events
    fn updateEvents(self: *SeasonManager, delta: f32) void {
        _ = delta;

        const current_time = self.season_timer + @as(f32, @floatFromInt(self.current_year * 4)) * self.season_length;

        // Remove expired events
        var write_idx: usize = 0;
        for (0..self.event_count) |read_idx| {
            if (!self.events[read_idx].isExpired(current_time)) {
                if (write_idx != read_idx) {
                    self.events[write_idx] = self.events[read_idx];
                }
                write_idx += 1;
            }
        }
        self.event_count = write_idx;
    }

    /// Recalculate environmental modifiers
    fn recalculateModifiers(self: *SeasonManager) void {
        // Start with weather effects
        self.food_modifier = self.current_weather.getFoodGatherMod();
        self.movement_modifier = self.current_weather.getMovementMod();
        self.health_modifier = -self.current_weather.getHealthDrain();

        // Season base modifiers
        switch (self.current_season) {
            .spring => {
                self.food_modifier *= 1.1;
                self.birth_rate_modifier = 1.3; // Breeding season
            },
            .summer => {
                self.food_modifier *= 1.2;
                self.birth_rate_modifier = 1.1;
            },
            .autumn => {
                self.food_modifier *= 1.4; // Harvest
                self.birth_rate_modifier = 0.9;
            },
            .winter => {
                self.food_modifier *= 0.5;
                self.birth_rate_modifier = 0.5;
                self.health_modifier -= 0.2; // Cold damage
            },
        }

        // Apply event modifiers
        for (self.events[0..self.event_count]) |*e| {
            switch (e.event_type) {
                .bountiful_harvest => self.food_modifier += 0.5 * e.intensity,
                .famine => self.food_modifier -= 0.4 * e.intensity,
                .drought => self.food_modifier -= 0.3 * e.intensity,
                .harsh_winter => {
                    self.health_modifier -= 0.5 * e.intensity;
                    self.movement_modifier *= 0.7;
                },
                .disease_outbreak => {
                    self.health_modifier -= 1.0 * e.intensity;
                    self.birth_rate_modifier *= 0.5;
                },
                .celebration => {
                    self.birth_rate_modifier += 0.3 * e.intensity;
                },
                .fire => {
                    self.food_modifier -= 0.2 * e.intensity;
                    self.health_modifier -= 0.3 * e.intensity;
                },
                .flood => {
                    self.movement_modifier *= 0.5;
                    self.health_modifier -= 0.2 * e.intensity;
                },
                else => {},
            }
        }
    }

    // === Query Functions ===

    /// Get current time of day (0-1, 0=midnight, 0.5=noon)
    pub fn getTimeOfDay(self: *const SeasonManager) f32 {
        return self.day_timer / self.day_length;
    }

    /// Is it daytime?
    pub fn isDaytime(self: *const SeasonManager) bool {
        const time = self.getTimeOfDay();
        return time > 0.25 and time < 0.75; // 6am to 6pm
    }

    /// Get night/day light level (0=dark, 1=bright)
    pub fn getLightLevel(self: *const SeasonManager) f32 {
        const time = self.getTimeOfDay();

        // Smooth day/night transition
        if (time < 0.2) {
            return 0.2 + (time / 0.2) * 0.5; // Dawn
        } else if (time < 0.3) {
            return 0.7 + ((time - 0.2) / 0.1) * 0.3; // Morning
        } else if (time < 0.7) {
            return 1.0; // Day
        } else if (time < 0.8) {
            return 1.0 - ((time - 0.7) / 0.1) * 0.3; // Evening
        } else {
            return 0.7 - ((time - 0.8) / 0.2) * 0.5; // Night
        }
    }

    /// Get active event at position
    pub fn getEventAtPosition(self: *const SeasonManager, x: f32, z: f32) ?*const Event {
        for (self.events[0..self.event_count]) |*e| {
            if (e.isInRange(x, z)) {
                return e;
            }
        }
        return null;
    }

    /// Check if harsh conditions at position
    pub fn isHarshConditions(self: *const SeasonManager, x: f32, z: f32) bool {
        // Weather-based
        if (self.current_weather == .blizzard or
            self.current_weather == .storm or
            self.current_weather == .heat_wave)
        {
            return true;
        }

        // Event-based
        for (self.events[0..self.event_count]) |*e| {
            if (e.isInRange(x, z) and e.event_type.isNegative()) {
                return true;
            }
        }

        return false;
    }

    /// Get season bonus for farming
    pub fn getFarmingBonus(self: *const SeasonManager) f32 {
        return switch (self.current_season) {
            .spring => 1.2,
            .summer => 1.0,
            .autumn => 1.5, // Harvest
            .winter => 0.2,
        };
    }

    /// Get total elapsed time in seconds
    pub fn getTotalTime(self: *const SeasonManager) f32 {
        return @as(f32, @floatFromInt((self.current_year - 1) * 4)) * self.season_length +
               @as(f32, @floatFromInt(@intFromEnum(self.current_season))) * self.season_length +
               self.season_timer;
    }
};

// Tests
test "Season cycle" {
    var sm = SeasonManager.init();
    var rng = math.Rng.init(42);

    try std.testing.expectEqual(Season.spring, sm.current_season);
    try std.testing.expectEqual(@as(u32, 1), sm.current_year);

    // Advance through all seasons
    for (0..4) |_| {
        sm.update(sm.season_length, &rng);
    }

    // Should be back to spring, year 2
    try std.testing.expectEqual(Season.spring, sm.current_season);
    try std.testing.expectEqual(@as(u32, 2), sm.current_year);
}

test "Weather modifiers" {
    try std.testing.expectEqual(@as(f32, 1.0), Weather.clear.getMovementMod());
    try std.testing.expect(Weather.blizzard.getMovementMod() < 0.5);
    try std.testing.expect(Weather.blizzard.getHealthDrain() > 0);
}

test "Event creation" {
    var sm = SeasonManager.init();
    var rng = math.Rng.init(42);

    sm.triggerEvent(.bountiful_harvest, &rng);
    try std.testing.expectEqual(@as(usize, 1), sm.event_count);

    const e = &sm.events[0];
    try std.testing.expectEqual(EventType.bountiful_harvest, e.event_type);
    try std.testing.expect(e.intensity >= 0.5);
}
