import { describe, expect, it } from "vitest";
import {
	buildAreaPath,
	buildStackedAreaPath,
	renderAreaChart,
} from "../../../../src/kt/chart/area-chart";

describe("renderAreaChart", () => {
	describe("basic structure", () => {
		it("generates valid SVG with area path", () => {
			const data = [
				{ month: "Jan", revenue: 100 },
				{ month: "Feb", revenue: 120 },
				{ month: "Mar", revenue: 90 },
			];
			const html = renderAreaChart(data);
			expect(html).toContain("<svg");
			expect(html).toContain("kt-chart-area");
			expect(html).toContain("<path");
			// 塗りつぶしパスと境界線パスの両方が存在
			expect(html).toContain("fill-opacity");
			expect(html).toContain('fill="none"');
		});

		it("wraps chart in figure with kt-area-chart class", () => {
			const html = renderAreaChart([10, 20, 15]);
			expect(html).toContain("<figure");
			expect(html).toContain("kt-area-chart");
		});

		it("generates SVG with viewBox", () => {
			const html = renderAreaChart([10, 20, 30]);
			expect(html).toContain("viewBox");
			expect(html).toContain("<svg");
		});
	});

	describe("number[] shorthand", () => {
		it("accepts number[] shorthand", () => {
			const html = renderAreaChart([10, 20, 15, 30]);
			expect(html).toContain("<svg");
			expect(html).toContain("kt-chart-area");
		});

		it("uses index as x-axis for number[] data", () => {
			const html = renderAreaChart([10, 20, 15]);
			// Should have index-based x values
			expect(html).toContain("0");
			expect(html).toContain("1");
			expect(html).toContain("2");
		});
	});

	describe("rendering details", () => {
		it("renders stroke line on top of filled area", () => {
			const data = [
				{ month: "Jan", revenue: 100 },
				{ month: "Feb", revenue: 120 },
			];
			const html = renderAreaChart(data);
			expect(html).toContain('stroke-width="2"');
		});

		it("renders data points with tooltips", () => {
			const data = [
				{ month: "Jan", revenue: 100 },
				{ month: "Feb", revenue: 120 },
			];
			const html = renderAreaChart(data);
			expect(html).toContain("<circle");
			expect(html).toContain("<title>");
		});

		it("applies default fill-opacity of 0.3", () => {
			const html = renderAreaChart([10, 20, 30]);
			expect(html).toContain('fill-opacity="0.3"');
		});

		it("applies default color #4e79a7", () => {
			const html = renderAreaChart([10, 20, 30]);
			expect(html).toContain("#4e79a7");
		});

		it("skips fill-opacity for rgba colors (already has alpha)", () => {
			const html = renderAreaChart([10, 20, 30], { color: "rgba(255,0,0,0.5)" });
			expect(html).toContain("rgba(255,0,0,0.5)");
			// Should not add fill-opacity since color already has alpha
			expect(html).not.toContain("fill-opacity");
		});

		it("skips fill-opacity for 8-digit hex colors", () => {
			const html = renderAreaChart([10, 20, 30], { color: "#ff000080" });
			expect(html).toContain("#ff000080");
			expect(html).not.toContain("fill-opacity");
		});
	});

	describe("axes and grid", () => {
		it("renders grid lines", () => {
			const html = renderAreaChart([10, 20, 30]);
			expect(html).toContain("kt-chart-grid");
		});

		it("renders x-axis with labels", () => {
			const data = [
				{ month: "Jan", revenue: 100 },
				{ month: "Feb", revenue: 120 },
			];
			const html = renderAreaChart(data);
			expect(html).toContain("Jan");
			expect(html).toContain("Feb");
		});

		it("renders y-axis with tick values", () => {
			const html = renderAreaChart([10, 20, 30]);
			expect(html).toContain("kt-chart-axis-y");
		});
	});

	describe("accessibility", () => {
		it("has role=img on figure", () => {
			const html = renderAreaChart([10, 20]);
			expect(html).toContain('role="img"');
		});

		it("has aria-label on figure", () => {
			const html = renderAreaChart([10, 20]);
			expect(html).toContain("aria-label");
		});

		it("has SVG title and desc elements", () => {
			const html = renderAreaChart([10, 20]);
			expect(html).toContain("<title>");
			expect(html).toContain("<desc>");
		});
	});

	describe("multi-series area chart", () => {
		const multiSeriesData = [
			{ month: "Jan", revenue: 100, cost: 60 },
			{ month: "Feb", revenue: 120, cost: 70 },
		];

		it("renders multiple areas with different colors", () => {
			const html = renderAreaChart(multiSeriesData);
			expect(html).toContain('data-series="revenue"');
			expect(html).toContain('data-series="cost"');
		});

		it("applies default opacity to overlapping areas", () => {
			const html = renderAreaChart(multiSeriesData);
			expect(html).toContain('fill-opacity="0.3"');
		});

		it("renders legend for multi-series", () => {
			const html = renderAreaChart(multiSeriesData);
			expect(html).toContain("kt-chart-legend");
			expect(html).toContain("revenue");
			expect(html).toContain("cost");
		});

		it("does not render legend for single series", () => {
			const html = renderAreaChart([10, 20, 30]);
			expect(html).not.toContain("kt-chart-legend");
		});

		it("draws areas in back-to-front order (first series in front)", () => {
			const html = renderAreaChart(multiSeriesData);
			const revenuePos = html.indexOf('data-series="revenue"');
			const costPos = html.indexOf('data-series="cost"');
			// cost is drawn first (background), revenue last (foreground)
			expect(costPos).toBeLessThan(revenuePos);
		});

		it("uses different default colors per series", () => {
			const html = renderAreaChart(multiSeriesData);
			// Tableau 10 first two colors
			expect(html).toContain("#4e79a7");
			expect(html).toContain("#f28e2b");
		});

		it("applies custom colors to series", () => {
			const html = renderAreaChart(multiSeriesData, {
				color: ["#ff0000", "#0000ff"],
			});
			expect(html).toContain("#ff0000");
			expect(html).toContain("#0000ff");
		});
	});

	describe("stacked area chart", () => {
		const stackedData = [
			{ month: "Jan", a: 10, b: 20 },
			{ month: "Feb", a: 15, b: 25 },
		];

		it("renders stacked areas with stack: true", () => {
			const html = renderAreaChart(stackedData, { stack: true });
			expect(html).toContain("kt-chart-area");
			expect(html).toContain("<svg");
		});

		it("stacks values cumulatively", () => {
			const data = [
				{ x: "0", a: 10, b: 20 },
				{ x: "1", a: 15, b: 25 },
			];
			const html = renderAreaChart(data, { stack: true });
			// 最大値は 40 (15+25) に基づくスケール
			expect(html).toContain("40");
		});

		it("renders both series in stacked mode", () => {
			const html = renderAreaChart(stackedData, { stack: true });
			expect(html).toContain('data-series="a"');
			expect(html).toContain('data-series="b"');
		});

		it("draws stacked areas bottom to top order", () => {
			const html = renderAreaChart(stackedData, { stack: true });
			const aPos = html.indexOf('data-series="a"');
			const bPos = html.indexOf('data-series="b"');
			// First series (a) drawn first, then b on top
			expect(aPos).toBeLessThan(bPos);
		});

		it("renders legend for stacked multi-series", () => {
			const html = renderAreaChart(stackedData, { stack: true });
			expect(html).toContain("kt-chart-legend");
		});

		it("handles rgba color without adding extra opacity in stacked mode", () => {
			const data = [
				{ month: "Jan", a: 10, b: 20 },
				{ month: "Feb", a: 15, b: 25 },
			];
			const html = renderAreaChart(data, {
				stack: true,
				color: ["rgba(255,0,0,0.5)", "#0000ff"],
			});
			expect(html).toContain("rgba(255,0,0,0.5)");
			// rgba already has alpha, so no fill-opacity should be added for that series
		});

		it("ignores stack: true for single series", () => {
			const html = renderAreaChart([10, 20, 30], { stack: true });
			// Single series, stack has no effect
			expect(html).toContain("kt-area-chart");
			expect(html).not.toContain("kt-chart-legend");
		});

		it("handles null values in stacked mode", () => {
			const data = [
				{ month: "Jan", a: 10, b: 20 },
				{ month: "Feb", a: Number.NaN, b: 25 },
				{ month: "Mar", a: 20, b: 30 },
			];
			const html = renderAreaChart(data, { stack: true });
			expect(html).toContain("kt-area-chart");
			expect(html).not.toContain("NaN");
		});

		it("handles all-null series values in stacked mode", () => {
			const data = [
				{ month: "Jan", a: Number.NaN, b: 20 },
				{ month: "Feb", a: Number.NaN, b: 25 },
			];
			const html = renderAreaChart(data, { stack: true });
			expect(html).toContain("kt-area-chart");
		});

		it("defaults to non-stacked (stack: false)", () => {
			const html1 = renderAreaChart(stackedData);
			const html2 = renderAreaChart(stackedData, { stack: false });
			// Both should have the same drawing order (back-to-front for non-stacked)
			const costFirst1 = html1.indexOf('data-series="b"') < html1.indexOf('data-series="a"');
			const costFirst2 = html2.indexOf('data-series="b"') < html2.indexOf('data-series="a"');
			expect(costFirst1).toBe(costFirst2);
		});
	});

	describe("config options", () => {
		it("renders with custom height", () => {
			const html = renderAreaChart([10, 20], { height: 500 });
			expect(html).toContain("500");
		});

		it("renders x_label", () => {
			const html = renderAreaChart([10, 20], { x_label: "Month" });
			expect(html).toContain("Month");
		});

		it("renders y_label", () => {
			const html = renderAreaChart([10, 20], { y_label: "Values" });
			expect(html).toContain("Values");
			expect(html).toContain("rotate");
		});

		it("renders title as figcaption", () => {
			const html = renderAreaChart([10, 20], { title: "My Area Chart" });
			expect(html).toContain("<figcaption");
			expect(html).toContain("My Area Chart");
		});
	});

	describe("path building", () => {
		it("buildAreaPath returns empty string for empty points", () => {
			expect(buildAreaPath([], 300)).toBe("");
		});

		it("buildAreaPath generates closed path", () => {
			const path = buildAreaPath(
				[
					{ x: 10, y: 50 },
					{ x: 20, y: 30 },
				],
				300,
			);
			expect(path).toContain("M");
			expect(path).toContain("Z");
		});

		it("buildStackedAreaPath returns empty string for empty points", () => {
			expect(buildStackedAreaPath([], [], 300)).toBe("");
		});

		it("buildStackedAreaPath uses prevPoints as bottom edge", () => {
			const path = buildStackedAreaPath(
				[
					{ x: 10, y: 30 },
					{ x: 20, y: 20 },
				],
				[
					{ x: 10, y: 50 },
					{ x: 20, y: 40 },
				],
				300,
			);
			expect(path).toContain("M");
			expect(path).toContain("Z");
		});

		it("buildStackedAreaPath falls back to baseline without prevPoints", () => {
			const path = buildStackedAreaPath(
				[
					{ x: 10, y: 30 },
					{ x: 20, y: 20 },
				],
				[],
				300,
			);
			expect(path).toContain("300");
			expect(path).toContain("Z");
		});
	});

	describe("security", () => {
		it("escapes title for XSS prevention", () => {
			const html = renderAreaChart([10], { title: "<script>alert(1)</script>" });
			expect(html).not.toContain("<script>");
			expect(html).toContain("&lt;script&gt;");
		});

		it("escapes axis labels for XSS prevention", () => {
			const html = renderAreaChart([10], { x_label: "<img onerror=alert(1)>" });
			expect(html).not.toContain("<img");
		});

		it("escapes category names in x-axis", () => {
			const data = [{ "<script>": 10, cat: "A" }] as Record<string, unknown>[];
			const html = renderAreaChart(data);
			expect(html).not.toContain("<script>");
		});

		it("escapes series names in legend", () => {
			const data = {
				columns: ["x", "<script>", "normal"],
				data: [
					["A", 10, 20],
					["B", 15, 25],
				],
			};
			const html = renderAreaChart(data, { x: "x" });
			expect(html).not.toContain("<script>");
		});
	});

	describe("edge cases", () => {
		describe("empty and minimal data", () => {
			it("handles empty array []", () => {
				const html = renderAreaChart([]);
				expect(html).toContain("No data");
			});

			it("handles single data point [42]", () => {
				const html = renderAreaChart([42]);
				expect(html).toContain("kt-area-chart");
				expect(html).toContain("<circle");
			});
		});

		describe("data validation", () => {
			it("limits data points to MAX_DATA_POINTS (10,000)", () => {
				const data: number[] = [];
				for (let i = 0; i < 10_050; i++) {
					data.push(i);
				}
				const html = renderAreaChart(data);
				expect(html).toContain("kt-area-chart");
				const circleCount = (html.match(/<circle /g) || []).length;
				expect(circleCount).toBeLessThanOrEqual(10_000);
			});

			it("limits series to MAX_SERIES (20)", () => {
				const row: Record<string, unknown> = { cat: "A" };
				for (let i = 0; i < 25; i++) {
					row[`series_${i}`] = i * 10;
				}
				const html = renderAreaChart([row] as Record<string, unknown>[], { x: "cat" });
				expect(html).toContain("kt-area-chart");
				const seriesGroups = (html.match(/data-series="/g) || []).length;
				expect(seriesGroups).toBeLessThanOrEqual(20);
			});

			it("handles NaN values gracefully (treated as null)", () => {
				const data = [
					{ cat: "A", val: 10 },
					{ cat: "B", val: Number.NaN },
					{ cat: "C", val: 30 },
				];
				const html = renderAreaChart(data, { x: "cat" });
				expect(html).toContain("kt-area-chart");
				expect(html).not.toContain("NaN");
			});

			it("handles Infinity values gracefully", () => {
				const data = [
					{ cat: "A", val: 10 },
					{ cat: "B", val: Number.POSITIVE_INFINITY },
					{ cat: "C", val: 30 },
				];
				const html = renderAreaChart(data, { x: "cat" });
				expect(html).toContain("kt-area-chart");
				expect(html).not.toContain("Infinity");
			});
		});

		describe("color validation", () => {
			it("rejects javascript: in color parameter", () => {
				const html = renderAreaChart([10, 20], { color: "javascript:alert(1)" });
				expect(html).toContain("#4e79a7");
				expect(html).not.toContain("javascript:");
			});

			it("rejects url() in color parameter", () => {
				const html = renderAreaChart([10, 20], { color: "url(evil)" });
				expect(html).toContain("#4e79a7");
				expect(html).not.toContain("url(");
			});

			it("rejects expression() in color parameter", () => {
				const html = renderAreaChart([10, 20], { color: "expression(alert(1))" });
				expect(html).toContain("#4e79a7");
				expect(html).not.toContain("expression(");
			});

			it("rejects invalid colors in array and keeps valid ones", () => {
				const data = [
					{ cat: "A", x: 10, y: 20 },
					{ cat: "B", x: 15, y: 25 },
				];
				const html = renderAreaChart(data, { x: "cat", color: ["#ff0000", "javascript:alert(1)"] });
				expect(html).toContain("#ff0000");
				expect(html).not.toContain("javascript:");
			});

			it("falls back to default when all colors in array are invalid", () => {
				const html = renderAreaChart([10, 20], {
					color: ["javascript:alert(1)", "url(evil)"],
				});
				expect(html).toContain("#4e79a7");
			});

			it("accepts valid hex, rgb, named colors", () => {
				const html1 = renderAreaChart([10], { color: "#ff0000" });
				expect(html1).toContain("#ff0000");

				const html2 = renderAreaChart([10], { color: "rgb(255, 0, 0)" });
				expect(html2).toContain("rgb(255, 0, 0)");

				const html3 = renderAreaChart([10], { color: "red" });
				expect(html3).toContain("red");
			});
		});

		describe("config edge cases", () => {
			it("handles height: 0 (uses default)", () => {
				const html = renderAreaChart([10, 20], { height: 0 });
				expect(html).toContain("400");
			});

			it("handles negative height (uses default)", () => {
				const html = renderAreaChart([10, 20], { height: -100 });
				expect(html).toContain("400");
			});

			it("handles non-existent x column (falls back to auto)", () => {
				const data = [
					{ cat: "A", val: 10 },
					{ cat: "B", val: 20 },
				];
				const html = renderAreaChart(data, { x: "nonexistent" });
				expect(html).toContain("kt-area-chart");
			});

			it("handles non-existent y column (empty series)", () => {
				const data = [
					{ cat: "A", val: 10 },
					{ cat: "B", val: 20 },
				];
				const html = renderAreaChart(data, { x: "cat", y: "nonexistent" });
				expect(html).toContain("No data");
			});
		});

		describe("data formats", () => {
			it("handles 2D array format", () => {
				const html = renderAreaChart([
					[10, 20],
					[15, 25],
					[20, 30],
				]);
				expect(html).toContain("kt-area-chart");
				expect(html).toContain("<svg");
			});

			it("handles explicit columns+data format", () => {
				const html = renderAreaChart({
					columns: ["revenue", "cost"],
					data: [
						[100, 60],
						[120, 70],
					],
				});
				expect(html).toContain("kt-area-chart");
				expect(html).toContain("kt-chart-legend");
			});
		});
	});
});
