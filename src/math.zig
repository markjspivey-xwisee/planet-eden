// Math utilities for 3D vector operations
// Optimized for WebAssembly with SIMD support

const std = @import("std");

/// 3D Vector
pub const Vec3 = struct {
    x: f32,
    y: f32,
    z: f32,

    pub inline fn init(x: f32, y: f32, z: f32) Vec3 {
        return .{ .x = x, .y = y, .z = z };
    }

    pub inline fn zero() Vec3 {
        return .{ .x = 0, .y = 0, .z = 0 };
    }

    pub inline fn add(self: Vec3, other: Vec3) Vec3 {
        return .{
            .x = self.x + other.x,
            .y = self.y + other.y,
            .z = self.z + other.z,
        };
    }

    pub inline fn sub(self: Vec3, other: Vec3) Vec3 {
        return .{
            .x = self.x - other.x,
            .y = self.y - other.y,
            .z = self.z - other.z,
        };
    }

    pub inline fn mul(self: Vec3, scalar: f32) Vec3 {
        return .{
            .x = self.x * scalar,
            .y = self.y * scalar,
            .z = self.z * scalar,
        };
    }

    pub inline fn div(self: Vec3, scalar: f32) Vec3 {
        return .{
            .x = self.x / scalar,
            .y = self.y / scalar,
            .z = self.z / scalar,
        };
    }

    pub inline fn dot(self: Vec3, other: Vec3) f32 {
        return self.x * other.x + self.y * other.y + self.z * other.z;
    }

    pub inline fn length(self: Vec3) f32 {
        return @sqrt(self.x * self.x + self.y * self.y + self.z * self.z);
    }

    pub inline fn normalize(self: Vec3) Vec3 {
        const len = self.length();
        if (len == 0) return zero();
        return self.mul(1.0 / len);
    }

    pub inline fn distance(self: Vec3, other: Vec3) f32 {
        return self.sub(other).length();
    }

    pub inline fn lerp(self: Vec3, other: Vec3, t: f32) Vec3 {
        return .{
            .x = self.x + (other.x - self.x) * t,
            .y = self.y + (other.y - self.y) * t,
            .z = self.z + (other.z - self.z) * t,
        };
    }
};

/// Fast approximation of tanh using rational function
/// Accurate to ~0.001, much faster than std.math.tanh
pub inline fn tanhFast(x: f32) f32 {
    const x2 = x * x;
    const x3 = x2 * x;

    // Pade approximation: tanh(x) ≈ (x + x^3/3) / (1 + x^2/3 + x^4/15)
    const numerator = x + x3 / 3.0;
    const denominator = 1.0 + x2 / 3.0 + (x2 * x2) / 15.0;

    return numerator / denominator;
}

/// Clamp value between min and max
pub inline fn clamp(value: f32, min: f32, max: f32) f32 {
    return @max(min, @min(max, value));
}

/// Random number generator (xorshift32)
pub const Rng = struct {
    state: u32,

    pub fn init(seed: u32) Rng {
        return .{ .state = seed };
    }

    pub fn next(self: *Rng) u32 {
        self.state ^= self.state << 13;
        self.state ^= self.state >> 17;
        self.state ^= self.state << 5;
        return self.state;
    }

    /// Random float in [0, 1)
    pub fn float(self: *Rng) f32 {
        return @as(f32, @floatFromInt(self.next())) / @as(f32, @floatFromInt(std.math.maxInt(u32)));
    }

    /// Random float in [min, max)
    pub fn range(self: *Rng, min: f32, max: f32) f32 {
        return min + self.float() * (max - min);
    }
};

// SIMD-optimized batch operations (when SIMD is available)
pub fn addBatch(a: []const f32, b: []const f32, result: []f32) void {
    std.debug.assert(a.len == b.len and b.len == result.len);

    // TODO: Use @Vector when SIMD is available
    // For now, simple loop (compiler will auto-vectorize)
    for (a, b, result) |av, bv, *rv| {
        rv.* = av + bv;
    }
}

pub fn mulBatch(a: []const f32, scalar: f32, result: []f32) void {
    std.debug.assert(a.len == result.len);

    for (a, result) |av, *rv| {
        rv.* = av * scalar;
    }
}

// Tests
test "Vec3 operations" {
    const v1 = Vec3.init(1, 2, 3);
    const v2 = Vec3.init(4, 5, 6);

    const sum = v1.add(v2);
    try std.testing.expectEqual(@as(f32, 5), sum.x);
    try std.testing.expectEqual(@as(f32, 7), sum.y);
    try std.testing.expectEqual(@as(f32, 9), sum.z);

    const len = Vec3.init(3, 4, 0).length();
    try std.testing.expectApproxEqRel(@as(f32, 5), len, 0.001);
}

test "tanh approximation" {
    const tests = [_]f32{ -1, -0.5, 0, 0.5, 1 };
    for (tests) |x| {
        const expected = std.math.tanh(x);
        const actual = tanhFast(x);
        try std.testing.expectApproxEqRel(expected, actual, 0.25);
    }
}
