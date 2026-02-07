import { describe, expect, it } from "vitest";
import { normalizeChartData } from "../../../../src/kt/chart/normalize";

describe("normalizeChartData", () => {
	describe("Record<string, unknown>[]", () => {
		it("auto-detects string column as x-axis", () => {
			const data = [
				{ month: "Jan", revenue: 100, cost: 80 },
				{ month: "Feb", revenue: 120, cost: 85 },
			];
			const result = normalizeChartData(data);
			expect(result.xValues).toEqual(["Jan", "Feb"]);
			expect(result.series).toHaveLength(2);
			expect(result.series[0].name).toBe("revenue");
			expect(result.series[1].name).toBe("cost");
		});

		it("uses all numeric columns as y-series", () => {
			const data = [
				{ category: "A", x: 10, y: 20, z: 30 },
				{ category: "B", x: 15, y: 25, z: 35 },
			];
			const result = normalizeChartData(data);
			expect(result.series).toHaveLength(3);
			expect(result.series.map((s) => s.name)).toEqual(["x", "y", "z"]);
		});

		it("respects explicit x config", () => {
			const data = [
				{ a: "X", b: "Y", value: 100 },
				{ a: "P", b: "Q", value: 200 },
			];
			const result = normalizeChartData(data, { x: "b" });
			expect(result.xValues).toEqual(["Y", "Q"]);
		});

		it("respects explicit y config (string)", () => {
			const data = [
				{ month: "Jan", revenue: 100, cost: 80 },
				{ month: "Feb", revenue: 120, cost: 85 },
			];
			const result = normalizeChartData(data, { y: "revenue" });
			expect(result.series).toHaveLength(1);
			expect(result.series[0].name).toBe("revenue");
		});

		it("respects explicit y config (string[])", () => {
			const data = [
				{ month: "Jan", revenue: 100, cost: 80, tax: 10 },
				{ month: "Feb", revenue: 120, cost: 85, tax: 12 },
			];
			const result = normalizeChartData(data, { y: ["revenue", "cost"] });
			expect(result.series).toHaveLength(2);
			expect(result.series[0].name).toBe("revenue");
			expect(result.series[1].name).toBe("cost");
		});

		it("handles all-numeric columns (no string column)", () => {
			const data = [
				{ a: 1, b: 10, c: 20 },
				{ a: 2, b: 15, c: 25 },
			];
			const result = normalizeChartData(data);
			// No string column detected → index as x
			expect(result.xValues).toEqual([0, 1]);
			expect(result.series).toHaveLength(3);
		});

		it("skips NaN values → null", () => {
			const data = [
				{ cat: "A", val: 10 },
				{ cat: "B", val: "not a number" },
				{ cat: "C", val: 30 },
			];
			const result = normalizeChartData(data);
			expect(result.series[0].values).toEqual([10, null, 30]);
		});
	});

	describe("unknown[][]", () => {
		it("uses row index as x-axis", () => {
			const data = [
				[10, 20],
				[15, 25],
			];
			const result = normalizeChartData(data);
			expect(result.xValues).toEqual([0, 1]);
		});

		it("treats each column as a series", () => {
			const data = [
				[10, 20, 30],
				[15, 25, 35],
			];
			const result = normalizeChartData(data);
			expect(result.series).toHaveLength(3);
		});

		it("names series as series_1, series_2, ...", () => {
			const data = [
				[10, 20],
				[15, 25],
			];
			const result = normalizeChartData(data);
			expect(result.series[0].name).toBe("series_1");
			expect(result.series[1].name).toBe("series_2");
		});
	});

	describe("{ columns, data }", () => {
		it("normalizes with all columns as series", () => {
			const data = {
				columns: ["revenue", "cost"],
				data: [
					[100, 80],
					[120, 85],
				],
			};
			const result = normalizeChartData(data);
			expect(result.series).toHaveLength(2);
			expect(result.series[0].name).toBe("revenue");
			expect(result.series[0].values).toEqual([100, 120]);
		});

		it("filters by y config", () => {
			const data = {
				columns: ["revenue", "cost", "tax"],
				data: [
					[100, 80, 10],
					[120, 85, 12],
				],
			};
			const result = normalizeChartData(data, { y: "revenue" });
			expect(result.series).toHaveLength(1);
			expect(result.series[0].name).toBe("revenue");
		});

		it("ignores non-existent y columns", () => {
			const data = {
				columns: ["revenue", "cost"],
				data: [
					[100, 80],
					[120, 85],
				],
			};
			const result = normalizeChartData(data, { y: ["revenue", "nonexistent"] });
			expect(result.series).toHaveLength(1);
			expect(result.series[0].name).toBe("revenue");
		});
	});

	describe("empty data", () => {
		it("returns empty for empty array", () => {
			const result = normalizeChartData([]);
			expect(result.xValues).toEqual([]);
			expect(result.series).toEqual([]);
		});

		it("returns empty for empty object array", () => {
			const result = normalizeChartData([] as Record<string, unknown>[]);
			expect(result.xValues).toEqual([]);
			expect(result.series).toEqual([]);
		});
	});

	describe("color assignment", () => {
		it("assigns default colors to series", () => {
			const data = [
				{ cat: "A", x: 10, y: 20 },
				{ cat: "B", x: 15, y: 25 },
			];
			const result = normalizeChartData(data);
			expect(result.series[0].color).toBe("#4e79a7");
			expect(result.series[1].color).toBe("#f28e2b");
		});

		it("applies custom colors", () => {
			const data = [
				{ cat: "A", x: 10, y: 20 },
				{ cat: "B", x: 15, y: 25 },
			];
			const result = normalizeChartData(data, { color: ["red", "blue"] });
			expect(result.series[0].color).toBe("red");
			expect(result.series[1].color).toBe("blue");
		});
	});
});
