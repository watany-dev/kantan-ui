import { describe, expect, it } from "vitest";
import type {
	BarChartConfig,
	BarChartData,
	BarChartSeries,
	NormalizedBarChartData,
} from "../../../../src/kt/chart/types";

describe("BarChartData type", () => {
	it("accepts number[]", () => {
		const data: BarChartData = [10, 20, 30];
		expect(Array.isArray(data)).toBe(true);
	});

	it("accepts Record<string, number>", () => {
		const data: BarChartData = { A: 10, B: 20 };
		expect(typeof data).toBe("object");
	});

	it("accepts Record<string, unknown>[]", () => {
		const data: BarChartData = [
			{ month: "Jan", revenue: 100 },
			{ month: "Feb", revenue: 120 },
		];
		expect(Array.isArray(data)).toBe(true);
	});

	it("accepts unknown[][]", () => {
		const data: BarChartData = [
			[10, 20],
			[15, 25],
		];
		expect(Array.isArray(data)).toBe(true);
	});

	it("accepts explicit format { columns, data }", () => {
		const data: BarChartData = {
			columns: ["a", "b"],
			data: [
				[1, 2],
				[3, 4],
			],
		};
		expect("columns" in data).toBe(true);
	});
});

describe("BarChartConfig type", () => {
	it("has correct defaults conceptually", () => {
		const config: BarChartConfig = {};
		expect(config.stack).toBeUndefined();
		expect(config.horizontal).toBeUndefined();
		expect(config.height).toBeUndefined();
	});

	it("accepts all config options", () => {
		const config: BarChartConfig = {
			x: "month",
			y: ["revenue", "cost"],
			x_label: "Month",
			y_label: "Amount",
			color: ["#ff0000", "#0000ff"],
			stack: true,
			horizontal: false,
			sort: "descending",
			height: 500,
			title: "Sales Chart",
		};
		expect(config.x).toBe("month");
		expect(config.sort).toBe("descending");
	});
});

describe("NormalizedBarChartData type", () => {
	it("has correct structure", () => {
		const normalized: NormalizedBarChartData = {
			xValues: ["Jan", "Feb", "Mar"],
			series: [{ name: "revenue", values: [100, 120, 90], color: "#4e79a7" }],
		};
		expect(normalized.xValues).toHaveLength(3);
		expect(normalized.series).toHaveLength(1);
		expect(normalized.series[0].name).toBe("revenue");
	});

	it("supports null values in series", () => {
		const series: BarChartSeries = {
			name: "test",
			values: [10, null, 30],
			color: "#000",
		};
		expect(series.values[1]).toBeNull();
	});
});
