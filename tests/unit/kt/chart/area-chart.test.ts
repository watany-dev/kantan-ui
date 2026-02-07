import { describe, expect, it } from "vitest";
import { renderAreaChart } from "../../../../src/kt/chart/area-chart";

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
});
