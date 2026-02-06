import { describe, expect, it } from "vitest";
import { niceScale, normalizeChartData, renderLineChart } from "../../../src/widgets/line-chart";
import type { LineChartData } from "../../../src/widgets/types";

describe("normalizeChartData", () => {
	describe("empty data", () => {
		it("should return empty series for empty array", () => {
			const result = normalizeChartData([]);
			expect(result.series).toEqual([]);
			expect(result.xLabels).toEqual([]);
		});
	});

	describe("number[]", () => {
		it("should create single series with index as x", () => {
			const result = normalizeChartData([10, 20, 30]);
			expect(result.series).toHaveLength(1);
			expect(result.series[0].name).toBe("value");
			expect(result.series[0].points).toEqual([
				[0, 10],
				[1, 20],
				[2, 30],
			]);
		});

		it("should generate string xLabels from index", () => {
			const result = normalizeChartData([10, 20, 30]);
			expect(result.xLabels).toEqual(["0", "1", "2"]);
		});

		it("should use y_label as series name when provided", () => {
			const result = normalizeChartData([10, 20], { y_label: "Temperature" });
			expect(result.series[0].name).toBe("Temperature");
		});
	});

	describe("number[][]", () => {
		it("should treat each column as a series", () => {
			const data: number[][] = [
				[10, 100],
				[20, 200],
				[30, 300],
			];
			const result = normalizeChartData(data);
			expect(result.series).toHaveLength(2);
			expect(result.series[0].name).toBe("series_1");
			expect(result.series[1].name).toBe("series_2");
		});

		it("should map data correctly", () => {
			const data: number[][] = [
				[10, 100],
				[20, 200],
			];
			const result = normalizeChartData(data);
			expect(result.series[0].points).toEqual([
				[0, 10],
				[1, 20],
			]);
			expect(result.series[1].points).toEqual([
				[0, 100],
				[1, 200],
			]);
		});

		it("should use y config for series names", () => {
			const data: number[][] = [
				[10, 100],
				[20, 200],
			];
			const result = normalizeChartData(data, { y: ["Sales", "Profit"] });
			expect(result.series[0].name).toBe("Sales");
			expect(result.series[1].name).toBe("Profit");
		});
	});

	describe("{ columns, data }", () => {
		it("should normalize explicit format", () => {
			const data: LineChartData = {
				columns: ["sales", "profit"],
				data: [
					[100, 50],
					[120, 60],
				],
			};
			const result = normalizeChartData(data);
			expect(result.series).toHaveLength(2);
			expect(result.series[0].name).toBe("sales");
			expect(result.series[1].name).toBe("profit");
		});

		it("should filter by y config", () => {
			const data: LineChartData = {
				columns: ["sales", "profit", "cost"],
				data: [
					[100, 50, 30],
					[120, 60, 40],
				],
			};
			const result = normalizeChartData(data, { y: "profit" });
			expect(result.series).toHaveLength(1);
			expect(result.series[0].name).toBe("profit");
			expect(result.series[0].points).toEqual([
				[0, 50],
				[1, 60],
			]);
		});

		it("should ignore non-existent y columns", () => {
			const data: LineChartData = {
				columns: ["sales"],
				data: [[100], [120]],
			};
			const result = normalizeChartData(data, { y: "nonexistent" });
			expect(result.series).toHaveLength(0);
		});
	});

	describe("Record<string, unknown>[]", () => {
		it("should auto-detect x column (first string column)", () => {
			const data = [
				{ month: "Jan", sales: 100, profit: 50 },
				{ month: "Feb", sales: 120, profit: 60 },
			];
			const result = normalizeChartData(data);
			expect(result.xLabels).toEqual(["Jan", "Feb"]);
			expect(result.series).toHaveLength(2);
			expect(result.series[0].name).toBe("sales");
			expect(result.series[1].name).toBe("profit");
		});

		it("should use explicit x config", () => {
			const data = [
				{ month: "Jan", year: 2024, sales: 100 },
				{ month: "Feb", year: 2024, sales: 120 },
			];
			const result = normalizeChartData(data, { x: "month" });
			expect(result.xLabels).toEqual(["Jan", "Feb"]);
		});

		it("should use explicit y config", () => {
			const data = [
				{ month: "Jan", sales: 100, profit: 50, cost: 30 },
				{ month: "Feb", sales: 120, profit: 60, cost: 40 },
			];
			const result = normalizeChartData(data, { y: ["sales", "profit"] });
			expect(result.series).toHaveLength(2);
			expect(result.series[0].name).toBe("sales");
			expect(result.series[1].name).toBe("profit");
		});

		it("should use single y string config", () => {
			const data = [
				{ month: "Jan", sales: 100, profit: 50 },
				{ month: "Feb", sales: 120, profit: 60 },
			];
			const result = normalizeChartData(data, { y: "sales" });
			expect(result.series).toHaveLength(1);
			expect(result.series[0].name).toBe("sales");
		});

		it("should handle numeric x values", () => {
			const data = [
				{ x: 0, y: 10 },
				{ x: 1, y: 20 },
				{ x: 2, y: 30 },
			];
			const result = normalizeChartData(data, { x: "x", y: "y" });
			expect(result.series[0].points).toEqual([
				[0, 10],
				[1, 20],
				[2, 30],
			]);
		});

		it("should skip NaN values", () => {
			const data = [
				{ x: 0, y: 10 },
				{ x: 1, y: "invalid" },
				{ x: 2, y: 30 },
			];
			const result = normalizeChartData(data, { x: "x", y: "y" });
			expect(result.series[0].points).toHaveLength(2);
		});

		it("should handle all-numeric columns with no string column", () => {
			const data = [
				{ a: 1, b: 10, c: 100 },
				{ a: 2, b: 20, c: 200 },
			];
			const result = normalizeChartData(data);
			// No string column, so all columns become y-series with index x
			expect(result.series).toHaveLength(3);
			expect(result.xLabels).toEqual(["0", "1"]);
		});
	});
});

describe("niceScale", () => {
	it("should produce nice round numbers for typical ranges", () => {
		const result = niceScale(0, 100);
		expect(result.min).toBe(0);
		expect(result.max).toBe(100);
		expect(result.step).toBeGreaterThan(0);
	});

	it("should handle zero range", () => {
		const result = niceScale(50, 50);
		expect(result.min).toBeLessThan(50);
		expect(result.max).toBeGreaterThan(50);
	});

	it("should handle zero at origin", () => {
		const result = niceScale(0, 0);
		expect(result.min).toBeLessThan(0);
		expect(result.max).toBeGreaterThan(0);
	});

	it("should handle negative ranges", () => {
		const result = niceScale(-50, -10);
		expect(result.min).toBeLessThanOrEqual(-50);
		expect(result.max).toBeGreaterThanOrEqual(-10);
		expect(result.step).toBeGreaterThan(0);
	});

	it("should handle decimal ranges", () => {
		const result = niceScale(0.1, 0.9);
		expect(result.min).toBeLessThanOrEqual(0.1);
		expect(result.max).toBeGreaterThanOrEqual(0.9);
		expect(result.step).toBeGreaterThan(0);
	});
});

describe("renderLineChart", () => {
	it("should return empty state for empty data", () => {
		const html = renderLineChart([]);
		expect(html).toContain("kt-line-chart-empty");
		expect(html).toContain("No data");
	});

	it("should render SVG for number array", () => {
		const html = renderLineChart([10, 20, 30]);
		expect(html).toContain("<svg");
		expect(html).toContain("</svg>");
		expect(html).toContain("kt-line-chart-svg");
	});

	it("should render data lines", () => {
		const html = renderLineChart([10, 20, 30]);
		expect(html).toContain("kt-line-chart-line");
		expect(html).toContain("<path");
	});

	it("should render data points", () => {
		const html = renderLineChart([10, 20, 30]);
		expect(html).toContain("kt-line-chart-point");
		expect(html).toContain("<circle");
	});

	it("should render grid lines", () => {
		const html = renderLineChart([10, 20, 30]);
		expect(html).toContain("kt-line-chart-grid");
	});

	it("should render axis", () => {
		const html = renderLineChart([10, 20, 30]);
		expect(html).toContain("kt-line-chart-x-axis");
		expect(html).toContain("kt-line-chart-y-axis");
	});

	it("should render x-axis label when configured", () => {
		const html = renderLineChart([10, 20], { x_label: "Time" });
		expect(html).toContain("kt-line-chart-axis-label");
		expect(html).toContain("Time");
	});

	it("should render y-axis label when configured", () => {
		const html = renderLineChart([10, 20], { y_label: "Value" });
		expect(html).toContain("kt-line-chart-axis-label");
		expect(html).toContain("Value");
	});

	it("should render legend for multiple series", () => {
		const data = [
			{ x: 0, a: 10, b: 20 },
			{ x: 1, a: 30, b: 40 },
		];
		const html = renderLineChart(data, { x: "x" });
		expect(html).toContain("kt-line-chart-legend");
	});

	it("should not render legend for single series", () => {
		const html = renderLineChart([10, 20, 30]);
		expect(html).not.toContain("kt-line-chart-legend");
	});

	it("should apply container width class by default", () => {
		const html = renderLineChart([10, 20]);
		expect(html).toContain("kt-line-chart-container-width");
	});

	it("should not apply container width when disabled", () => {
		const html = renderLineChart([10, 20], { use_container_width: false });
		expect(html).not.toContain("kt-line-chart-container-width");
	});

	it("should use custom colors", () => {
		const html = renderLineChart([10, 20], { color: "#ff0000" });
		expect(html).toContain("#ff0000");
	});

	it("should use custom height via viewBox", () => {
		const html = renderLineChart([10, 20], { height: 300 });
		expect(html).toContain('viewBox="0 0 800 300"');
	});

	it("should escape HTML in labels", () => {
		const html = renderLineChart([10, 20], {
			x_label: '<script>alert("xss")</script>',
		});
		expect(html).toContain("&lt;script&gt;");
		expect(html).not.toContain("<script>alert");
	});

	it("should escape HTML in x-axis tick labels", () => {
		const data = [
			{ label: '<img onerror="alert(1)">', value: 10 },
			{ label: "safe", value: 20 },
		];
		const html = renderLineChart(data);
		expect(html).not.toContain('onerror="alert(1)"');
	});

	it("should render object array with multiple series", () => {
		const data = [
			{ month: "Jan", sales: 100, profit: 50 },
			{ month: "Feb", sales: 120, profit: 60 },
			{ month: "Mar", sales: 150, profit: 80 },
		];
		const html = renderLineChart(data);
		expect(html).toContain("<svg");
		expect(html).toContain("kt-line-chart-legend");
		// Should have path elements for each series
		expect(html.match(/kt-line-chart-line/g)?.length).toBe(2);
	});

	it("should handle aria label from y_label", () => {
		const html = renderLineChart([10, 20], { y_label: "Revenue" });
		expect(html).toContain('aria-label="Revenue"');
	});

	it("should default aria label to 'Line chart'", () => {
		const html = renderLineChart([10, 20]);
		expect(html).toContain('aria-label="Line chart"');
	});
});
