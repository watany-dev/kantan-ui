import { describe, expect, it } from "vitest";
import { applySortOrder, normalizeBarChartInput } from "../../../../src/kt/chart/bar-chart";
import type { NormalizedBarChartData } from "../../../../src/kt/chart/types";

describe("normalizeBarChartInput", () => {
	it("converts number[] to object array with category/value", () => {
		const result = normalizeBarChartInput([10, 20, 30]);
		expect(result).toEqual([
			{ category: "0", value: 10 },
			{ category: "1", value: 20 },
			{ category: "2", value: 30 },
		]);
	});

	it("converts Record<string, number> to object array", () => {
		const result = normalizeBarChartInput({ A: 10, B: 20 });
		expect(result).toEqual([
			{ category: "A", value: 10 },
			{ category: "B", value: 20 },
		]);
	});

	it("passes through Record<string, unknown>[] unchanged", () => {
		const data = [
			{ month: "Jan", revenue: 100 },
			{ month: "Feb", revenue: 120 },
		];
		const result = normalizeBarChartInput(data);
		expect(result).toBe(data);
	});

	it("passes through unknown[][] unchanged", () => {
		const data = [
			[10, 20],
			[15, 25],
		];
		const result = normalizeBarChartInput(data);
		expect(result).toBe(data);
	});

	it("passes through explicit format unchanged", () => {
		const data = {
			columns: ["a", "b"],
			data: [
				[1, 2],
				[3, 4],
			],
		};
		const result = normalizeBarChartInput(data);
		expect(result).toBe(data);
	});
});

describe("applySortOrder", () => {
	const baseData: NormalizedBarChartData = {
		xValues: ["A", "B", "C"],
		series: [{ name: "v", values: [30, 10, 20], color: "#000" }],
	};

	it("sorts ascending by first series values", () => {
		const sorted = applySortOrder(baseData, "ascending");
		expect(sorted.xValues).toEqual(["B", "C", "A"]);
		expect(sorted.series[0].values).toEqual([10, 20, 30]);
	});

	it("sorts descending by first series values", () => {
		const sorted = applySortOrder(baseData, "descending");
		expect(sorted.xValues).toEqual(["A", "C", "B"]);
		expect(sorted.series[0].values).toEqual([30, 20, 10]);
	});

	it("returns unchanged when sort is undefined", () => {
		const result = applySortOrder(baseData, undefined);
		expect(result).toBe(baseData);
	});

	it("preserves all series alignment after sort", () => {
		const multiSeries: NormalizedBarChartData = {
			xValues: ["X", "Y", "Z"],
			series: [
				{ name: "a", values: [30, 10, 20], color: "#000" },
				{ name: "b", values: [3, 1, 2], color: "#111" },
			],
		};
		const sorted = applySortOrder(multiSeries, "ascending");
		expect(sorted.xValues).toEqual(["Y", "Z", "X"]);
		expect(sorted.series[0].values).toEqual([10, 20, 30]);
		expect(sorted.series[1].values).toEqual([1, 2, 3]);
	});

	it("handles null values in sort (treated as 0)", () => {
		const withNull: NormalizedBarChartData = {
			xValues: ["A", "B", "C"],
			series: [{ name: "v", values: [20, null, 10], color: "#000" }],
		};
		const sorted = applySortOrder(withNull, "ascending");
		expect(sorted.xValues).toEqual(["B", "C", "A"]);
		expect(sorted.series[0].values).toEqual([null, 10, 20]);
	});
});
