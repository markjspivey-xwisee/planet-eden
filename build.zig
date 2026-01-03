const std = @import("std");

pub fn build(b: *std.Build) void {
    // Target WebAssembly for browser
    const target = b.resolveTargetQuery(.{
        .cpu_arch = .wasm32,
        .os_tag = .freestanding,
        .abi = .none,
    });

    // Optimize for small binary size (ReleaseSmall) or speed (ReleaseFast)
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
    wasm.import_memory = true; // Let JS manage memory
    wasm.stack_size = 14752; // 14KB stack

    // Enable SIMD if available
    const simd_feature = std.Target.wasm.Feature.simd128;
    var enabled_features = std.Target.Cpu.Feature.Set.empty;
    enabled_features.addFeature(@intFromEnum(simd_feature));
    wasm.root_module.resolved_target.?.result.cpu.features = enabled_features;

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
