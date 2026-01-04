const std = @import("std");

pub fn build(b: *std.Build) void {
    // Target WebAssembly for browser
    const target = b.resolveTargetQuery(.{
        .cpu_arch = .wasm32,
        .os_tag = .freestanding,
        .abi = .none,
    });

    // Optimize for small binary size
    const optimize = b.standardOptimizeOption(.{
        .preferred_optimize_mode = .ReleaseSmall,
    });

    const wasm = b.addExecutable(.{
        .name = "planet-eden",
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
    });

    // WASM-specific settings
    wasm.entry = .disabled; // No _start function needed
    wasm.rdynamic = true; // Export all public functions
    wasm.import_memory = false; // WASM manages its own memory
    wasm.initial_memory = 65536 * 256; // 16 MB initial memory (256 pages)
    wasm.max_memory = 65536 * 2048; // 128 MB max memory
    wasm.stack_size = 65536 * 2; // 128KB stack

    // SIMD disabled for compatibility
    // const simd_feature = std.Target.wasm.Feature.simd128;
    // var enabled_features = std.Target.Cpu.Feature.Set.empty;
    // enabled_features.addFeature(@intFromEnum(simd_feature));
    // wasm.root_module.resolved_target.?.result.cpu.features = enabled_features;

    b.installArtifact(wasm);

    // Test step
    const unit_tests = b.addTest(.{
        .root_source_file = b.path("src/main.zig"),
        .target = b.host,
    });

    const run_unit_tests = b.addRunArtifact(unit_tests);

    const test_step = b.step("test", "Run unit tests");
    test_step.dependOn(&run_unit_tests.step);
}
