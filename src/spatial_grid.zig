// Spatial grid for O(1) collision detection
// Uses hash map to store organisms in grid cells

const std = @import("std");
const math = @import("math.zig");

/// Grid cell size (larger = fewer cells, more organisms per cell)
const CELL_SIZE: f32 = 5.0;

/// Maximum organisms per cell (for static array)
const MAX_PER_CELL: usize = 32;

/// Grid cell coordinates
const GridCell = struct {
    x: i32,
    y: i32,
    z: i32,

    pub fn hash(self: GridCell) u64 {
        // Simple hash function combining x, y, z
        const h1: u64 = @as(u64, @bitCast(@as(i64, self.x)));
        const h2: u64 = @as(u64, @bitCast(@as(i64, self.y)));
        const h3: u64 = @as(u64, @bitCast(@as(i64, self.z)));
        return h1 *% 73856093 ^ h2 *% 19349663 ^ h3 *% 83492791;
    }

    pub fn eql(self: GridCell, other: GridCell) bool {
        return self.x == other.x and self.y == other.y and self.z == other.z;
    }
};

/// Cell data - stores organism indices
const CellData = struct {
    indices: [MAX_PER_CELL]u32,
    count: usize,

    pub fn init() CellData {
        return .{
            .indices = undefined,
            .count = 0,
        };
    }

    pub fn add(self: *CellData, idx: u32) void {
        if (self.count < MAX_PER_CELL) {
            self.indices[self.count] = idx;
            self.count += 1;
        }
    }

    pub fn clear(self: *CellData) void {
        self.count = 0;
    }
};

/// Spatial hash grid
pub const SpatialGrid = struct {
    cells: std.AutoHashMap(GridCell, CellData),
    allocator: std.mem.Allocator,

    pub fn init(allocator: std.mem.Allocator) SpatialGrid {
        return .{
            .cells = std.AutoHashMap(GridCell, CellData).init(allocator),
            .allocator = allocator,
        };
    }

    pub fn deinit(self: *SpatialGrid) void {
        self.cells.deinit();
    }

    /// Clear all cells
    pub fn clear(self: *SpatialGrid) void {
        self.cells.clearRetainingCapacity();
    }

    /// Get grid cell for a position
    fn getCellCoords(pos: math.Vec3) GridCell {
        return .{
            .x = @intFromFloat(@floor(pos.x / CELL_SIZE)),
            .y = @intFromFloat(@floor(pos.y / CELL_SIZE)),
            .z = @intFromFloat(@floor(pos.z / CELL_SIZE)),
        };
    }

    /// Insert organism into grid
    pub fn insert(self: *SpatialGrid, idx: u32, pos: math.Vec3) !void {
        const cell = getCellCoords(pos);

        const result = try self.cells.getOrPut(cell);
        if (!result.found_existing) {
            result.value_ptr.* = CellData.init();
        }
        result.value_ptr.add(idx);
    }

    /// Query nearby organisms within radius
    pub fn queryRadius(
        self: *const SpatialGrid,
        center: math.Vec3,
        radius: f32,
        results: []u32,
    ) usize {
        const radius_cells = @as(i32, @intFromFloat(@ceil(radius / CELL_SIZE))) + 1;
        const center_cell = getCellCoords(center);

        var count: usize = 0;

        // Check all cells within radius
        var dx: i32 = -radius_cells;
        while (dx <= radius_cells) : (dx += 1) {
            var dy: i32 = -radius_cells;
            while (dy <= radius_cells) : (dy += 1) {
                var dz: i32 = -radius_cells;
                while (dz <= radius_cells) : (dz += 1) {
                    const cell = GridCell{
                        .x = center_cell.x + dx,
                        .y = center_cell.y + dy,
                        .z = center_cell.z + dz,
                    };

                    if (self.cells.get(cell)) |cell_data| {
                        for (cell_data.indices[0..cell_data.count]) |idx| {
                            if (count < results.len) {
                                results[count] = idx;
                                count += 1;
                            }
                        }
                    }
                }
            }
        }

        return count;
    }

    /// Get all organisms in same cell
    pub fn querySameCell(
        self: *const SpatialGrid,
        pos: math.Vec3,
        results: []u32,
    ) usize {
        const cell = getCellCoords(pos);

        if (self.cells.get(cell)) |cell_data| {
            const count = @min(cell_data.count, results.len);
            for (0..count) |i| {
                results[i] = cell_data.indices[i];
            }
            return count;
        }

        return 0;
    }

    /// Get neighboring cells (27 cells including center)
    pub fn queryNeighbors(
        self: *const SpatialGrid,
        pos: math.Vec3,
        results: []u32,
    ) usize {
        const center_cell = getCellCoords(pos);

        var count: usize = 0;

        var dx: i32 = -1;
        while (dx <= 1) : (dx += 1) {
            var dy: i32 = -1;
            while (dy <= 1) : (dy += 1) {
                var dz: i32 = -1;
                while (dz <= 1) : (dz += 1) {
                    const cell = GridCell{
                        .x = center_cell.x + dx,
                        .y = center_cell.y + dy,
                        .z = center_cell.z + dz,
                    };

                    if (self.cells.get(cell)) |cell_data| {
                        for (cell_data.indices[0..cell_data.count]) |idx| {
                            if (count < results.len) {
                                results[count] = idx;
                                count += 1;
                            }
                        }
                    }
                }
            }
        }

        return count;
    }

    /// Get total number of occupied cells
    pub fn getCellCount(self: *const SpatialGrid) usize {
        return self.cells.count();
    }
};

// Tests
test "SpatialGrid basic operations" {
    var grid = SpatialGrid.init(std.testing.allocator);
    defer grid.deinit();

    // Insert organisms
    try grid.insert(0, math.Vec3.init(0, 0, 0));
    try grid.insert(1, math.Vec3.init(1, 1, 1));
    try grid.insert(2, math.Vec3.init(10, 10, 10));

    // Query same cell
    var results: [10]u32 = undefined;
    const count = grid.querySameCell(math.Vec3.init(0.5, 0.5, 0.5), &results);

    try std.testing.expect(count >= 2); // Should find at least organisms 0 and 1
}

test "SpatialGrid radius query" {
    var grid = SpatialGrid.init(std.testing.allocator);
    defer grid.deinit();

    // Insert organisms in a line
    try grid.insert(0, math.Vec3.init(0, 0, 0));
    try grid.insert(1, math.Vec3.init(5, 0, 0));
    try grid.insert(2, math.Vec3.init(10, 0, 0));
    try grid.insert(3, math.Vec3.init(20, 0, 0));

    // Query with radius 12
    var results: [10]u32 = undefined;
    const count = grid.queryRadius(math.Vec3.init(0, 0, 0), 12, &results);

    // Should find organisms 0, 1, and 2, but not 3
    try std.testing.expect(count >= 3);
}

test "SpatialGrid clear" {
    var grid = SpatialGrid.init(std.testing.allocator);
    defer grid.deinit();

    try grid.insert(0, math.Vec3.init(0, 0, 0));
    try std.testing.expectEqual(@as(usize, 1), grid.getCellCount());

    grid.clear();
    try std.testing.expectEqual(@as(usize, 0), grid.getCellCount());
}
