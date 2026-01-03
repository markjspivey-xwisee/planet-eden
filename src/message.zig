// Message and communication system with 30 symbol types
// Organisms can send symbolic messages to communicate

const std = @import("std");
const math = @import("math.zig");

/// Message symbols (30 types)
pub const Symbol = enum(u8) {
    // Basic needs
    food = 0,
    water = 1,
    shelter = 2,
    danger = 3,
    safe = 4,

    // Emotions
    happy = 5,
    sad = 6,
    angry = 7,
    fear = 8,
    love = 9,

    // Actions
    come = 10,
    go = 11,
    attack = 12,
    defend = 13,
    build = 14,
    gather = 15,
    hunt = 16,
    rest = 17,

    // Locations/Directions
    here = 18,
    there = 19,
    up = 20,
    down = 21,
    left = 22,
    right = 23,

    // Tribe/Social
    friend = 24,
    enemy = 25,
    leader = 26,
    follow = 27,
    help = 28,
    trade = 29,

    pub fn toString(self: Symbol) []const u8 {
        return switch (self) {
            .food => "food",
            .water => "water",
            .shelter => "shelter",
            .danger => "danger",
            .safe => "safe",
            .happy => "happy",
            .sad => "sad",
            .angry => "angry",
            .fear => "fear",
            .love => "love",
            .come => "come",
            .go => "go",
            .attack => "attack",
            .defend => "defend",
            .build => "build",
            .gather => "gather",
            .hunt => "hunt",
            .rest => "rest",
            .here => "here",
            .there => "there",
            .up => "up",
            .down => "down",
            .left => "left",
            .right => "right",
            .friend => "friend",
            .enemy => "enemy",
            .leader => "leader",
            .follow => "follow",
            .help => "help",
            .trade => "trade",
        };
    }
};

/// A message consists of up to 4 symbols
pub const Message = struct {
    symbols: [4]Symbol,
    symbol_count: u8,
    sender_id: u32,
    receiver_id: u32, // 0 = broadcast
    timestamp: f32,

    pub fn init(sender_id: u32, receiver_id: u32, timestamp: f32) Message {
        return .{
            .symbols = [_]Symbol{.safe} ** 4,
            .symbol_count = 0,
            .sender_id = sender_id,
            .receiver_id = receiver_id,
            .timestamp = timestamp,
        };
    }

    pub fn addSymbol(self: *Message, symbol: Symbol) bool {
        if (self.symbol_count >= 4) return false;
        self.symbols[self.symbol_count] = symbol;
        self.symbol_count += 1;
        return true;
    }

    /// Simple message interpretation for AI
    pub fn getIntent(self: *const Message) MessageIntent {
        if (self.symbol_count == 0) return .unknown;

        // Interpret based on first symbol primarily
        const primary = self.symbols[0];

        return switch (primary) {
            .danger, .fear => .warning,
            .attack, .angry => .threat,
            .help, .come => .request_help,
            .food, .gather => .request_food,
            .build, .shelter => .request_build,
            .trade => .request_trade,
            .friend, .love, .happy => .friendly,
            .enemy, .go => .hostile,
            .leader, .follow => .command,
            else => .unknown,
        };
    }

    /// Get message as string (for debugging)
    pub fn toString(self: *const Message, buffer: []u8) ![]const u8 {
        var stream = std.io.fixedBufferStream(buffer);
        const writer = stream.writer();

        for (0..self.symbol_count) |i| {
            if (i > 0) try writer.writeAll(" ");
            try writer.writeAll(self.symbols[i].toString());
        }

        return stream.getWritten();
    }
};

/// Message intent (simplified interpretation)
pub const MessageIntent = enum {
    unknown,
    warning,
    threat,
    request_help,
    request_food,
    request_build,
    request_trade,
    friendly,
    hostile,
    command,
};

/// Message queue for communication
pub const MessageQueue = struct {
    messages: []Message,
    count: usize,
    capacity: usize,
    allocator: std.mem.Allocator,
    current_time: f32,

    pub fn init(allocator: std.mem.Allocator, capacity: usize) !MessageQueue {
        return .{
            .messages = try allocator.alloc(Message, capacity),
            .count = 0,
            .capacity = capacity,
            .allocator = allocator,
            .current_time = 0,
        };
    }

    pub fn deinit(self: *MessageQueue) void {
        self.allocator.free(self.messages);
    }

    /// Send a message
    pub fn send(self: *MessageQueue, message: Message) !void {
        if (self.count >= self.capacity) {
            // Remove oldest message
            self.removeOldest();
        }

        self.messages[self.count] = message;
        self.count += 1;
    }

    /// Get messages for a receiver
    pub fn getMessagesFor(self: *const MessageQueue, receiver_id: u32, results: []Message) usize {
        var count: usize = 0;
        for (self.messages[0..self.count]) |msg| {
            if ((msg.receiver_id == receiver_id or msg.receiver_id == 0) and count < results.len) {
                results[count] = msg;
                count += 1;
            }
        }
        return count;
    }

    /// Get messages from a sender
    pub fn getMessagesFrom(self: *const MessageQueue, sender_id: u32, results: []Message) usize {
        var count: usize = 0;
        for (self.messages[0..self.count]) |msg| {
            if (msg.sender_id == sender_id and count < results.len) {
                results[count] = msg;
                count += 1;
            }
        }
        return count;
    }

    /// Update time and remove old messages
    pub fn update(self: *MessageQueue, delta: f32) void {
        self.current_time += delta;

        // Remove messages older than 10 seconds
        const cutoff_time = self.current_time - 10.0;

        var write_idx: usize = 0;
        for (0..self.count) |read_idx| {
            if (self.messages[read_idx].timestamp >= cutoff_time) {
                if (write_idx != read_idx) {
                    self.messages[write_idx] = self.messages[read_idx];
                }
                write_idx += 1;
            }
        }
        self.count = write_idx;
    }

    /// Clear all messages
    pub fn clear(self: *MessageQueue) void {
        self.count = 0;
    }

    /// Remove oldest message
    fn removeOldest(self: *MessageQueue) void {
        if (self.count == 0) return;

        // Shift all messages down
        for (1..self.count) |i| {
            self.messages[i - 1] = self.messages[i];
        }
        self.count -= 1;
    }

    /// Create a simple message (1 symbol)
    pub fn sendSimple(self: *MessageQueue, sender: u32, receiver: u32, symbol: Symbol) !void {
        var msg = Message.init(sender, receiver, self.current_time);
        _ = msg.addSymbol(symbol);
        try self.send(msg);
    }

    /// Create a two-symbol message
    pub fn sendPair(self: *MessageQueue, sender: u32, receiver: u32, s1: Symbol, s2: Symbol) !void {
        var msg = Message.init(sender, receiver, self.current_time);
        _ = msg.addSymbol(s1);
        _ = msg.addSymbol(s2);
        try self.send(msg);
    }
};

/// Language evolution - tracks symbol usage frequency
pub const LanguageStats = struct {
    symbol_usage: [30]u32, // Count for each symbol
    total_messages: u32,

    pub fn init() LanguageStats {
        return .{
            .symbol_usage = [_]u32{0} ** 30,
            .total_messages = 0,
        };
    }

    pub fn recordMessage(self: *LanguageStats, message: *const Message) void {
        for (0..message.symbol_count) |i| {
            const symbol_idx = @intFromEnum(message.symbols[i]);
            self.symbol_usage[symbol_idx] += 1;
        }
        self.total_messages += 1;
    }

    /// Get most used symbol
    pub fn getMostUsedSymbol(self: *const LanguageStats) ?Symbol {
        var max_count: u32 = 0;
        var max_idx: usize = 0;

        for (self.symbol_usage, 0..) |count, i| {
            if (count > max_count) {
                max_count = count;
                max_idx = i;
            }
        }

        if (max_count == 0) return null;
        return @enumFromInt(max_idx);
    }

    /// Get symbol usage percentage
    pub fn getSymbolUsage(self: *const LanguageStats, symbol: Symbol) f32 {
        if (self.total_messages == 0) return 0;

        const idx = @intFromEnum(symbol);
        const count = self.symbol_usage[idx];
        return (@as(f32, @floatFromInt(count)) / @as(f32, @floatFromInt(self.total_messages))) * 100.0;
    }
};

// Tests
test "Message creation and symbols" {
    var msg = Message.init(1, 2, 0);

    try std.testing.expect(msg.addSymbol(.danger));
    try std.testing.expect(msg.addSymbol(.come));
    try std.testing.expectEqual(@as(u8, 2), msg.symbol_count);

    const intent = msg.getIntent();
    try std.testing.expectEqual(MessageIntent.warning, intent);
}

test "MessageQueue send and receive" {
    var queue = try MessageQueue.init(std.testing.allocator, 100);
    defer queue.deinit();

    try queue.sendSimple(1, 2, .food);
    try queue.sendSimple(3, 2, .help);

    var results: [10]Message = undefined;
    const count = queue.getMessagesFor(2, &results);

    try std.testing.expectEqual(@as(usize, 2), count);
}

test "MessageQueue expiration" {
    var queue = try MessageQueue.init(std.testing.allocator, 100);
    defer queue.deinit();

    try queue.sendSimple(1, 2, .food);
    try std.testing.expectEqual(@as(usize, 1), queue.count);

    // Advance time by 11 seconds
    queue.update(11.0);

    // Message should be expired
    try std.testing.expectEqual(@as(usize, 0), queue.count);
}

test "LanguageStats tracking" {
    var stats = LanguageStats.init();

    var msg = Message.init(1, 2, 0);
    _ = msg.addSymbol(.food);
    _ = msg.addSymbol(.food);

    stats.recordMessage(&msg);

    const usage = stats.getSymbolUsage(.food);
    try std.testing.expect(usage > 0);
}
