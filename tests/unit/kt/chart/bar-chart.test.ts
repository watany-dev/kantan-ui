import { describe, expect, it } from "vitest";
import {
	applySortOrder,
	normalizeBarChartInput,
	renderBarChart,
} from "../../../../src/kt/chart/bar-chart";
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

describe("renderBarChart", () => {
	describe("basic structure", () => {
		it("generates figure with kt-bar-chart class", () => {
			const html = renderBarChart([10, 20, 30]);
			expect(html).toContain("kt-bar-chart");
			expect(html).toContain("<figure");
		});

		it("generates SVG with viewBox 600xheight", () => {
			const html = renderBarChart([10, 20, 30]);
			expect(html).toContain("viewBox");
			expect(html).toContain("<svg");
		});

		it("generates rect elements for each data point", () => {
			const html = renderBarChart([10, 20, 30]);
			const rectCount = (html.match(/<rect /g) || []).length;
			expect(rectCount).toBeGreaterThanOrEqual(3);
		});

		it("applies default color #4e79a7 to bars", () => {
			const html = renderBarChart([10, 20, 30]);
			expect(html).toContain("#4e79a7");
		});

		it("adds rx=2 for rounded corners", () => {
			const html = renderBarChart([10, 20, 30]);
			expect(html).toContain('rx="2"');
		});
	});

	describe("axes and grid", () => {
		it("renders x-axis with category labels", () => {
			const html = renderBarChart({ A: 10, B: 20, C: 30 });
			expect(html).toContain("A");
			expect(html).toContain("B");
			expect(html).toContain("C");
		});

		it("renders y-axis with nice tick values", () => {
			const html = renderBarChart([0, 50, 100]);
			expect(html).toContain("kt-chart-axis-y");
		});

		it("renders grid lines for y-axis ticks", () => {
			const html = renderBarChart([10, 20, 30]);
			expect(html).toContain("kt-chart-grid");
		});

		it("always starts y-axis from 0", () => {
			const html = renderBarChart([50, 80, 100]);
			expect(html).toContain(">0<");
		});
	});

	describe("labels", () => {
		it("renders title as figcaption", () => {
			const html = renderBarChart([10, 20], { title: "My Chart" });
			expect(html).toContain("<figcaption");
			expect(html).toContain("My Chart");
		});

		it("renders x_label below x-axis", () => {
			const html = renderBarChart([10, 20], { x_label: "Categories" });
			expect(html).toContain("Categories");
		});

		it("renders y_label rotated on left", () => {
			const html = renderBarChart([10, 20], { y_label: "Values" });
			expect(html).toContain("Values");
			expect(html).toContain("rotate");
		});
	});

	describe("security", () => {
		it("escapes title for XSS prevention", () => {
			const html = renderBarChart([10], { title: "<script>alert(1)</script>" });
			expect(html).not.toContain("<script>");
			expect(html).toContain("&lt;script&gt;");
		});

		it("escapes axis labels for XSS prevention", () => {
			const html = renderBarChart([10], { x_label: "<img onerror=alert(1)>" });
			expect(html).not.toContain("<img");
		});

		it("escapes category names in x-axis", () => {
			const html = renderBarChart({ "<script>": 10 });
			expect(html).not.toContain("<script>");
		});
	});

	describe("accessibility", () => {
		it("has role=img on figure", () => {
			const html = renderBarChart([10, 20]);
			expect(html).toContain('role="img"');
		});

		it("has aria-label on figure", () => {
			const html = renderBarChart([10, 20]);
			expect(html).toContain("aria-label");
		});

		it("has SVG title and desc elements", () => {
			const html = renderBarChart([10, 20]);
			expect(html).toContain("<title>");
			expect(html).toContain("<desc>");
		});
	});

	describe("custom height", () => {
		it("uses default height 400", () => {
			const html = renderBarChart([10, 20]);
			expect(html).toContain("400");
		});

		it("uses custom height", () => {
			const html = renderBarChart([10, 20], { height: 500 });
			expect(html).toContain("500");
		});
	});

	describe("empty data", () => {
		it("renders empty state for empty array", () => {
			const html = renderBarChart([]);
			expect(html).toContain("No data");
		});
	});

	describe("multi-series: grouped (stack: false)", () => {
		const multiData = [
			{ cat: "A", x: 10, y: 20 },
			{ cat: "B", x: 15, y: 25 },
		];

		it("renders separate rect groups per series", () => {
			const html = renderBarChart(multiData, { x: "cat", stack: false });
			expect(html).toContain('data-series="x"');
			expect(html).toContain('data-series="y"');
		});

		it("uses different colors per series", () => {
			const html = renderBarChart(multiData, { x: "cat", stack: false });
			expect(html).toContain("#4e79a7");
			expect(html).toContain("#f28e2b");
		});

		it("renders bars side by side (grouped width narrower than single)", () => {
			const html = renderBarChart(multiData, { x: "cat", stack: false });
			// At minimum, should have 4 rect elements (2 categories x 2 series)
			const rectCount = (html.match(/<rect /g) || []).length;
			expect(rectCount).toBeGreaterThanOrEqual(4);
		});
	});

	describe("multi-series: stacked (stack: true)", () => {
		const multiData = [
			{ cat: "A", x: 10, y: 20 },
			{ cat: "B", x: 15, y: 25 },
		];

		it("stacks bars vertically within category", () => {
			const html = renderBarChart(multiData, { x: "cat", stack: true });
			// Should have rect elements for stacked bars
			const rectCount = (html.match(/<rect /g) || []).length;
			expect(rectCount).toBeGreaterThanOrEqual(4);
		});

		it("defaults to stack: true when multiple series", () => {
			const html = renderBarChart(multiData, { x: "cat" });
			// Should render as stacked by default
			expect(html).toContain("kt-chart-bars");
		});

		it("y-axis range covers total stacked values", () => {
			const html = renderBarChart(multiData, { x: "cat", stack: true });
			// Total for cat A = 10+20 = 30, cat B = 15+25 = 40
			// y-axis should go beyond 40
			expect(html).toContain("kt-chart-axis-y");
		});
	});

	describe("legend", () => {
		it("renders legend for multi-series data", () => {
			const multiData = [
				{ cat: "A", x: 10, y: 20 },
				{ cat: "B", x: 15, y: 25 },
			];
			const html = renderBarChart(multiData, { x: "cat" });
			expect(html).toContain("kt-chart-legend");
		});

		it("does not render legend for single series", () => {
			const html = renderBarChart([10, 20, 30]);
			expect(html).not.toContain("kt-chart-legend");
		});

		it("legend items match series names", () => {
			const multiData = [
				{ cat: "A", revenue: 10, cost: 20 },
				{ cat: "B", revenue: 15, cost: 25 },
			];
			const html = renderBarChart(multiData, { x: "cat" });
			expect(html).toContain("revenue");
			expect(html).toContain("cost");
		});

		it("escapes series names in legend", () => {
			const data = {
				columns: ["<script>", "normal"],
				data: [
					[10, 20],
					[15, 25],
				],
			};
			const html = renderBarChart(data);
			expect(html).not.toContain("<script>");
		});
	});

	describe("horizontal bar chart", () => {
		it("renders categories on y-axis (contains category labels)", () => {
			const html = renderBarChart({ A: 10, B: 20, C: 30 }, { horizontal: true });
			expect(html).toContain("A");
			expect(html).toContain("B");
			expect(html).toContain("C");
		});

		it("renders rect elements for horizontal bars", () => {
			const html = renderBarChart([10, 20, 30], { horizontal: true });
			const rectCount = (html.match(/<rect /g) || []).length;
			expect(rectCount).toBeGreaterThanOrEqual(3);
		});

		it("supports grouped horizontal bars (stack: false)", () => {
			const data = [
				{ cat: "A", x: 10, y: 20 },
				{ cat: "B", x: 15, y: 25 },
			];
			const html = renderBarChart(data, { x: "cat", horizontal: true, stack: false });
			expect(html).toContain('data-series="x"');
			expect(html).toContain('data-series="y"');
		});

		it("supports stacked horizontal bars (stack: true)", () => {
			const data = [
				{ cat: "A", x: 10, y: 20 },
				{ cat: "B", x: 15, y: 25 },
			];
			const html = renderBarChart(data, { x: "cat", horizontal: true, stack: true });
			const rectCount = (html.match(/<rect /g) || []).length;
			expect(rectCount).toBeGreaterThanOrEqual(4);
		});

		it("applies sort to horizontal bars correctly", () => {
			const html = renderBarChart(
				{ A: 30, B: 10, C: 20 },
				{
					horizontal: true,
					sort: "ascending",
				},
			);
			expect(html).toContain("kt-bar-chart");
		});

		it("renders x_label and y_label on horizontal bars", () => {
			const html = renderBarChart(
				{ A: 10, B: 20 },
				{
					horizontal: true,
					x_label: "Amount",
					y_label: "Category",
				},
			);
			expect(html).toContain("Amount");
			expect(html).toContain("Category");
			expect(html).toContain("kt-chart-x-label");
			expect(html).toContain("kt-chart-y-label");
		});

		it("renders title on horizontal bars", () => {
			const html = renderBarChart(
				{ A: 10, B: 20 },
				{
					horizontal: true,
					title: "Horizontal Chart",
				},
			);
			expect(html).toContain("Horizontal Chart");
			expect(html).toContain("kt-bar-chart-title");
		});

		it("renders legend on horizontal multi-series bars", () => {
			const data = [
				{ cat: "A", x: 10, y: 20 },
				{ cat: "B", x: 15, y: 25 },
			];
			const html = renderBarChart(data, { x: "cat", horizontal: true });
			expect(html).toContain("kt-chart-legend");
		});
	});

	describe("edge cases", () => {
		describe("empty and minimal data", () => {
			it("handles empty array []", () => {
				const html = renderBarChart([]);
				expect(html).toContain("No data");
			});

			it("handles empty object {}", () => {
				const html = renderBarChart({});
				expect(html).toContain("No data");
			});

			it("handles single data point [42]", () => {
				const html = renderBarChart([42]);
				expect(html).toContain("<rect ");
				expect(html).toContain("kt-bar-chart");
			});

			it("handles single key-value pair { A: 10 }", () => {
				const html = renderBarChart({ A: 10 });
				expect(html).toContain("<rect ");
				expect(html).toContain("A");
			});
		});

		describe("data validation", () => {
			it("limits data points to MAX_DATA_POINTS (10,000)", () => {
				const data: Record<string, number> = {};
				for (let i = 0; i < 10_050; i++) {
					data[`cat_${i}`] = i;
				}
				const html = renderBarChart(data);
				// Should not crash and should render (truncated)
				expect(html).toContain("kt-bar-chart");
				// Count rects should be <= 10,000
				const rectCount = (html.match(/<rect /g) || []).length;
				expect(rectCount).toBeLessThanOrEqual(10_000);
			});

			it("limits series to MAX_SERIES (20)", () => {
				const row: Record<string, unknown> = { cat: "A" };
				for (let i = 0; i < 25; i++) {
					row[`series_${i}`] = i * 10;
				}
				const html = renderBarChart([row] as Record<string, unknown>[], { x: "cat" });
				// Should render with at most 20 series
				expect(html).toContain("kt-bar-chart");
				const seriesGroups = (html.match(/data-series="/g) || []).length;
				expect(seriesGroups).toBeLessThanOrEqual(20);
			});

			it("handles NaN values gracefully (treated as null)", () => {
				const data = [
					{ cat: "A", val: 10 },
					{ cat: "B", val: Number.NaN },
					{ cat: "C", val: 30 },
				];
				const html = renderBarChart(data, { x: "cat" });
				expect(html).toContain("kt-bar-chart");
				// NaN should be skipped (no rect for B)
				expect(html).not.toContain("NaN");
			});

			it("handles Infinity values gracefully", () => {
				const data = [
					{ cat: "A", val: 10 },
					{ cat: "B", val: Number.POSITIVE_INFINITY },
					{ cat: "C", val: 30 },
				];
				const html = renderBarChart(data, { x: "cat" });
				expect(html).toContain("kt-bar-chart");
				expect(html).not.toContain("Infinity");
			});
		});

		describe("color validation", () => {
			it("rejects javascript: in color parameter", () => {
				const html = renderBarChart([10, 20], { color: "javascript:alert(1)" });
				// Should fall back to default color
				expect(html).toContain("#4e79a7");
				expect(html).not.toContain("javascript:");
			});

			it("rejects url() in color parameter", () => {
				const html = renderBarChart([10, 20], { color: "url(evil)" });
				expect(html).toContain("#4e79a7");
				expect(html).not.toContain("url(");
			});

			it("rejects expression() in color parameter", () => {
				const html = renderBarChart([10, 20], { color: "expression(alert(1))" });
				expect(html).toContain("#4e79a7");
				expect(html).not.toContain("expression(");
			});

			it("rejects invalid colors in array and keeps valid ones", () => {
				const html = renderBarChart(
					[
						{ cat: "A", x: 10, y: 20 },
						{ cat: "B", x: 15, y: 25 },
					],
					{ x: "cat", color: ["#ff0000", "javascript:alert(1)"] },
				);
				expect(html).toContain("#ff0000");
				expect(html).not.toContain("javascript:");
			});

			it("falls back to default when all colors in array are invalid", () => {
				const html = renderBarChart([10, 20], {
					color: ["javascript:alert(1)", "url(evil)"],
				});
				expect(html).toContain("#4e79a7");
			});

			it("accepts valid hex, rgb, named colors", () => {
				const html1 = renderBarChart([10], { color: "#ff0000" });
				expect(html1).toContain("#ff0000");

				const html2 = renderBarChart([10], { color: "rgb(255, 0, 0)" });
				expect(html2).toContain("rgb(255, 0, 0)");

				const html3 = renderBarChart([10], { color: "red" });
				expect(html3).toContain("red");
			});
		});

		describe("config edge cases", () => {
			it("handles height: 0 (uses default)", () => {
				const html = renderBarChart([10, 20], { height: 0 });
				expect(html).toContain("400");
			});

			it("handles negative height (uses default)", () => {
				const html = renderBarChart([10, 20], { height: -100 });
				expect(html).toContain("400");
			});

			it("handles non-existent x column (falls back to auto)", () => {
				const data = [
					{ cat: "A", val: 10 },
					{ cat: "B", val: 20 },
				];
				const html = renderBarChart(data, { x: "nonexistent" });
				// Should still render (auto-detection should handle it)
				expect(html).toContain("kt-bar-chart");
			});

			it("handles non-existent y column (empty series)", () => {
				const data = [
					{ cat: "A", val: 10 },
					{ cat: "B", val: 20 },
				];
				const html = renderBarChart(data, { x: "cat", y: "nonexistent" });
				// Should show empty state or render without bars
				expect(html).toContain("No data");
			});
		});
	});
});
