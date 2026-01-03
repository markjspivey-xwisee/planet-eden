// Neural Network - Feedforward with 17 outputs
// Optimized for WebAssembly with batch processing

const std = @import("std");
const math = @import("math.zig");

/// Neural Network brain for organisms
/// Architecture: 15 inputs → Hidden layer → 17 outputs
pub const NeuralNetwork = struct {
    inputs_count: u32,
    hidden_count: u32,
    outputs_count: u32,

    // Weights stored as flat arrays for cache efficiency
    weights_ih: []f32, // Input → Hidden
    weights_ho: []f32, // Hidden → Output
    bias_h: []f32,     // Hidden layer biases
    bias_o: []f32,     // Output layer biases

    allocator: std.mem.Allocator,

    /// Initialize neural network with Xavier initialization
    pub fn init(allocator: std.mem.Allocator, inputs: u32, hidden: u32, outputs: u32, rng: *math.Rng) !NeuralNetwork {
        // Allocate weight matrices
        const weights_ih = try allocator.alloc(f32, inputs * hidden);
        const weights_ho = try allocator.alloc(f32, hidden * outputs);
        const bias_h = try allocator.alloc(f32, hidden);
        const bias_o = try allocator.alloc(f32, outputs);

        // Xavier initialization for better learning
        const xavier_ih = @sqrt(2.0 / @as(f32, @floatFromInt(inputs)));
        const xavier_ho = @sqrt(2.0 / @as(f32, @floatFromInt(hidden)));

        for (weights_ih) |*w| {
            w.* = rng.range(-xavier_ih, xavier_ih);
        }
        for (weights_ho) |*w| {
            w.* = rng.range(-xavier_ho, xavier_ho);
        }
        for (bias_h) |*b| {
            b.* = rng.range(-0.1, 0.1);
        }
        for (bias_o) |*b| {
            b.* = rng.range(-0.1, 0.1);
        }

        return .{
            .inputs_count = inputs,
            .hidden_count = hidden,
            .outputs_count = outputs,
            .weights_ih = weights_ih,
            .weights_ho = weights_ho,
            .bias_h = bias_h,
            .bias_o = bias_o,
            .allocator = allocator,
        };
    }

    pub fn deinit(self: *NeuralNetwork) void {
        self.allocator.free(self.weights_ih);
        self.allocator.free(self.weights_ho);
        self.allocator.free(self.bias_h);
        self.allocator.free(self.bias_o);
    }

    /// Forward pass - compute outputs from inputs
    /// inputs: 15 values (energy, health, food proximity, etc.)
    /// outputs: 17 values (moveX, moveY, moveZ, speed, eat, attack, etc.)
    pub fn predict(self: *const NeuralNetwork, inputs: []const f32, outputs: []f32, hidden_buf: []f32) void {
        std.debug.assert(inputs.len == self.inputs_count);
        std.debug.assert(outputs.len == self.outputs_count);
        std.debug.assert(hidden_buf.len == self.hidden_count);

        // Input → Hidden layer
        for (0..self.hidden_count) |h| {
            var sum: f32 = self.bias_h[h];
            for (0..self.inputs_count) |i| {
                sum += inputs[i] * self.weights_ih[i * self.hidden_count + h];
            }
            hidden_buf[h] = math.tanhFast(sum);
        }

        // Hidden → Output layer
        for (0..self.outputs_count) |o| {
            var sum: f32 = self.bias_o[o];
            for (0..self.hidden_count) |h| {
                sum += hidden_buf[h] * self.weights_ho[h * self.outputs_count + o];
            }
            outputs[o] = math.tanhFast(sum);
        }
    }

    /// Mutate weights slightly for evolution
    pub fn mutate(self: *NeuralNetwork, rng: *math.Rng, mutation_rate: f32) void {
        // Mutate input→hidden weights
        for (self.weights_ih) |*w| {
            if (rng.float() < mutation_rate) {
                w.* += rng.range(-0.4, 0.4);
                w.* = math.clamp(w.*, -2.0, 2.0);
            }
        }

        // Mutate hidden→output weights
        for (self.weights_ho) |*w| {
            if (rng.float() < mutation_rate) {
                w.* += rng.range(-0.4, 0.4);
                w.* = math.clamp(w.*, -2.0, 2.0);
            }
        }

        // Mutate biases
        for (self.bias_h) |*b| {
            if (rng.float() < mutation_rate) {
                b.* += rng.range(-0.2, 0.2);
                b.* = math.clamp(b.*, -1.0, 1.0);
            }
        }
        for (self.bias_o) |*b| {
            if (rng.float() < mutation_rate) {
                b.* += rng.range(-0.2, 0.2);
                b.* = math.clamp(b.*, -1.0, 1.0);
            }
        }
    }

    /// Clone neural network (for reproduction)
    pub fn clone(self: *const NeuralNetwork, allocator: std.mem.Allocator) !NeuralNetwork {
        const weights_ih = try allocator.alloc(f32, self.weights_ih.len);
        const weights_ho = try allocator.alloc(f32, self.weights_ho.len);
        const bias_h = try allocator.alloc(f32, self.bias_h.len);
        const bias_o = try allocator.alloc(f32, self.bias_o.len);

        @memcpy(weights_ih, self.weights_ih);
        @memcpy(weights_ho, self.weights_ho);
        @memcpy(bias_h, self.bias_h);
        @memcpy(bias_o, self.bias_o);

        return .{
            .inputs_count = self.inputs_count,
            .hidden_count = self.hidden_count,
            .outputs_count = self.outputs_count,
            .weights_ih = weights_ih,
            .weights_ho = weights_ho,
            .bias_h = bias_h,
            .bias_o = bias_o,
            .allocator = allocator,
        };
    }

    /// Get total number of weights (for debugging)
    pub fn getTotalWeights(self: *const NeuralNetwork) usize {
        return self.weights_ih.len + self.weights_ho.len + self.bias_h.len + self.bias_o.len;
    }
};

// Tests
test "NeuralNetwork creation" {
    var rng = math.Rng.init(42);
    var nn = try NeuralNetwork.init(std.testing.allocator, 15, 12, 17, &rng);
    defer nn.deinit();

    try std.testing.expectEqual(@as(u32, 15), nn.inputs_count);
    try std.testing.expectEqual(@as(u32, 12), nn.hidden_count);
    try std.testing.expectEqual(@as(u32, 17), nn.outputs_count);
    try std.testing.expectEqual(@as(usize, 15 * 12), nn.weights_ih.len);
    try std.testing.expectEqual(@as(usize, 12 * 17), nn.weights_ho.len);
}

test "NeuralNetwork predict" {
    var rng = math.Rng.init(42);
    var nn = try NeuralNetwork.init(std.testing.allocator, 15, 12, 17, &rng);
    defer nn.deinit();

    var inputs: [15]f32 = undefined;
    for (&inputs, 0..) |*inp, i| {
        inp.* = @as(f32, @floatFromInt(i)) / 15.0;
    }

    var outputs: [17]f32 = undefined;
    var hidden: [12]f32 = undefined;

    nn.predict(&inputs, &outputs, &hidden);

    // Outputs should be in range [-1, 1] due to tanh
    for (outputs) |out| {
        try std.testing.expect(out >= -1.0 and out <= 1.0);
    }
}

test "NeuralNetwork clone and mutate" {
    var rng = math.Rng.init(42);
    var nn = try NeuralNetwork.init(std.testing.allocator, 15, 12, 17, &rng);
    defer nn.deinit();

    var clone = try nn.clone(std.testing.allocator);
    defer clone.deinit();

    // Should be identical before mutation
    try std.testing.expectEqualSlices(f32, nn.weights_ih, clone.weights_ih);

    clone.mutate(&rng, 0.1);

    // Should be different after mutation
    var different = false;
    for (nn.weights_ih, clone.weights_ih) |a, b| {
        if (a != b) {
            different = true;
            break;
        }
    }
    try std.testing.expect(different);
}
