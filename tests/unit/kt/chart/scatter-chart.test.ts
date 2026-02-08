import { describe, expect, it } from "vitest";
import { normalizeScatterData, renderScatterChart } from "../../../../src/kt/chart/scatter-chart";

describe("normalizeScatterData", () => {
	it("normalizes object array with auto column detection", () => {
		const data = [
			{ x: 1, y: 10 },
			{ x: 2, y: 20 },
			{ x: 3, y: 30 },
		];
		const result = normalizeScatterData(data);
		expect(result.groups).toHaveLength(1);
		expect(result.groups[0]?.points).toHaveLength(3);
		expect(result.groups[0]?.points[0]).toEqual({ x: 1, y: 10, size: 5 });
	});

	it("normalizes 2D array as [x, y] pairs", () => {
		const data = [
			[1, 10],
			[2, 20],
			[3, 30],
		];
		const result = normalizeScatterData(data);
		expect(result.groups).toHaveLength(1);
		expect(result.groups[0]?.points).toHaveLength(3);
	});

	it("creates groups from multiple y columns", () => {
		const data = [
			{ x: 1, math: 85, science: 90 },
			{ x: 2, math: 70, science: 75 },
		];
		const result = normalizeScatterData(data, {
			x: "x",
			y: ["math", "science"],
		});
		expect(result.groups).toHaveLength(2);
		expect(result.groups[0]?.name).toBe("math");
		expect(result.groups[1]?.name).toBe("science");
	});

	it("creates groups from color column", () => {
		const data = [
			{ x: 1, y: 10, species: "A" },
			{ x: 2, y: 20, species: "B" },
			{ x: 3, y: 30, species: "A" },
		];
		const result = normalizeScatterData(data, {
			x: "x",
			y: "y",
			color: "species",
		});
		expect(result.groups).toHaveLength(2);
		expect(result.groups[0]?.name).toBe("A");
		expect(result.groups[0]?.points).toHaveLength(2);
	});

	it("handles explicit format { columns, data }", () => {
		const data = {
			columns: ["x", "y"],
			data: [
				[1, 10],
				[2, 20],
			],
		};
		const result = normalizeScatterData(data);
		expect(result.groups[0]?.points).toHaveLength(2);
	});

	it("filters out NaN and Infinity", () => {
		const data = [
			{ x: 1, y: 10 },
			{ x: Number.NaN, y: 20 },
			{ x: 3, y: Number.POSITIVE_INFINITY },
		];
		const result = normalizeScatterData(data);
		expect(result.groups[0]?.points).toHaveLength(1);
	});

	it("returns empty groups for empty data", () => {
		const result = normalizeScatterData([]);
		expect(result.groups).toHaveLength(0);
	});

	it("returns empty groups for unrecognized data format", () => {
		// Passing a non-array, non-{columns,data} value
		const result = normalizeScatterData("invalid" as never);
		expect(result.groups).toHaveLength(0);
	});

	it("handles 2D array with only 1 column (too few for scatter)", () => {
		const data = [[1], [2], [3]];
		const result = normalizeScatterData(data);
		expect(result.groups).toHaveLength(0);
	});

	it("handles 2D array with multiple y columns", () => {
		const data = [
			[1, 10, 20],
			[2, 15, 25],
		];
		const result = normalizeScatterData(data);
		expect(result.groups).toHaveLength(2);
	});
});

describe("renderScatterChart", () => {
	describe("basic structure", () => {
		it("generates valid SVG with circle elements", () => {
			const data = [
				{ x: 1, y: 10 },
				{ x: 2, y: 20 },
				{ x: 3, y: 30 },
			];
			const html = renderScatterChart(data);
			expect(html).toContain("<svg");
			expect(html).toContain("<circle");
			expect(html).toContain("kt-scatter-chart");
			expect(html).toContain("kt-chart-scatter-group");
		});

		it("renders numeric x-axis ticks", () => {
			const data = [
				{ x: 10, y: 100 },
				{ x: 50, y: 200 },
			];
			const html = renderScatterChart(data);
			expect(html).toContain("kt-chart-axis-x");
		});

		it("renders both horizontal and vertical grid lines", () => {
			const data = [
				{ x: 1, y: 10 },
				{ x: 2, y: 20 },
			];
			const html = renderScatterChart(data);
			expect(html).toContain("kt-chart-grid");
		});

		it("renders tooltips on data points", () => {
			const data = [
				{ x: 1, y: 10 },
				{ x: 2, y: 20 },
			];
			const html = renderScatterChart(data);
			expect(html).toContain("<title>");
		});

		it("accepts 2D array format", () => {
			const html = renderScatterChart([
				[1, 10],
				[2, 20],
			]);
			expect(html).toContain("<svg");
			expect(html).toContain("<circle");
		});

		it("applies default opacity", () => {
			const data = [{ x: 1, y: 10 }];
			const html = renderScatterChart(data);
			expect(html).toContain('fill-opacity="0.7"');
		});

		it("wraps chart in figure with accessibility attributes", () => {
			const data = [{ x: 1, y: 10 }];
			const html = renderScatterChart(data);
			expect(html).toContain("<figure");
			expect(html).toContain('role="img"');
			expect(html).toContain("aria-label");
		});

		it("renders SVG title and desc", () => {
			const data = [{ x: 1, y: 10 }];
			const html = renderScatterChart(data);
			expect(html).toContain("<title>");
			expect(html).toContain("<desc>");
		});
	});

	describe("multi-group scatter chart", () => {
		it("renders multiple groups with different colors", () => {
			const data = [
				{ x: 1, math: 85, science: 90 },
				{ x: 2, math: 70, science: 75 },
			];
			const html = renderScatterChart(data, {
				x: "x",
				y: ["math", "science"],
			});
			expect(html).toContain('data-group="math"');
			expect(html).toContain('data-group="science"');
		});

		it("groups by color column", () => {
			const data = [
				{ x: 1, y: 10, species: "A" },
				{ x: 2, y: 20, species: "B" },
			];
			const html = renderScatterChart(data, {
				x: "x",
				y: "y",
				color: "species",
			});
			expect(html).toContain('data-group="A"');
			expect(html).toContain('data-group="B"');
		});

		it("renders legend for multi-group", () => {
			const data = [
				{ x: 1, math: 85, science: 90 },
				{ x: 2, math: 70, science: 75 },
			];
			const html = renderScatterChart(data, {
				x: "x",
				y: ["math", "science"],
			});
			expect(html).toContain("kt-chart-legend");
		});

		it("does not render legend for single group", () => {
			const data = [
				{ x: 1, y: 10 },
				{ x: 2, y: 20 },
			];
			const html = renderScatterChart(data);
			expect(html).not.toContain("kt-chart-legend");
		});

		it("applies color string as direct color (not column)", () => {
			const data = [{ x: 1, y: 10 }];
			const html = renderScatterChart(data, { color: "#ff0000" });
			expect(html).toContain("#ff0000");
		});

		it("applies color array to groups", () => {
			const data = [
				{ x: 1, math: 85, science: 90 },
				{ x: 2, math: 70, science: 75 },
			];
			const html = renderScatterChart(data, {
				x: "x",
				y: ["math", "science"],
				color: ["#4e79a7", "#e15759"],
			});
			expect(html).toContain("#4e79a7");
			expect(html).toContain("#e15759");
		});
	});

	describe("bubble chart (variable size)", () => {
		it("maps size column values to pixel radii", () => {
			const data = [
				{ x: 1, y: 10, pop: 100 },
				{ x: 2, y: 20, pop: 1000 },
				{ x: 3, y: 30, pop: 500 },
			];
			const html = renderScatterChart(data, {
				x: "x",
				y: "y",
				size: "pop",
			});
			expect(html).toContain("<circle");
			// 異なるr値を持つcircleが存在
			const rValues = html.match(/r="([^"]+)"/g);
			const uniqueR = new Set(rValues);
			expect(uniqueR.size).toBeGreaterThan(1);
		});

		it("applies fixed size when number is given", () => {
			const data = [{ x: 1, y: 10 }];
			const html = renderScatterChart(data, { size: 8 });
			expect(html).toContain('r="8"');
		});

		it("clamps size within valid range", () => {
			const extremeData = [
				{ x: 1, y: 10, pop: 0.001 },
				{ x: 2, y: 20, pop: 999999999 },
			];
			const html = renderScatterChart(extremeData, {
				x: "x",
				y: "y",
				size: "pop",
			});
			expect(html).toContain("<circle");
		});

		it("handles all same size values (uniform sizing)", () => {
			const data = [
				{ x: 1, y: 10, pop: 500 },
				{ x: 2, y: 20, pop: 500 },
				{ x: 3, y: 30, pop: 500 },
			];
			const html = renderScatterChart(data, {
				x: "x",
				y: "y",
				size: "pop",
			});
			expect(html).toContain("<circle");
			// Extract r values from data-point circles inside scatter-group
			const groupSection = html.match(/kt-chart-scatter-group[\s\S]*?<\/g>/)?.[0] ?? "";
			const rMatches = [...groupSection.matchAll(/r="([^"]+)"/g)].map((m) => m[1]);
			const uniqueR = new Set(rMatches);
			expect(rMatches.length).toBe(3);
			expect(uniqueR.size).toBe(1);
		});
	});

	describe("config options", () => {
		it("renders with title", () => {
			const data = [{ x: 1, y: 10 }];
			const html = renderScatterChart(data, {
				title: "My Scatter Chart",
			});
			expect(html).toContain("My Scatter Chart");
			expect(html).toContain("<figcaption");
		});

		it("renders with axis labels", () => {
			const data = [{ x: 1, y: 10 }];
			const html = renderScatterChart(data, {
				x_label: "X Label",
				y_label: "Y Label",
			});
			expect(html).toContain("X Label");
			expect(html).toContain("Y Label");
		});

		it("handles custom height", () => {
			const data = [{ x: 1, y: 10 }];
			const html = renderScatterChart(data, { height: 600 });
			expect(html).toContain('viewBox="0 0 600 600"');
		});

		it("handles custom opacity", () => {
			const data = [{ x: 1, y: 10 }];
			const html = renderScatterChart(data, { opacity: 0.3 });
			expect(html).toContain('fill-opacity="0.3"');
		});
	});

	describe("edge cases", () => {
		it("handles empty data", () => {
			const html = renderScatterChart([]);
			expect(html).toContain("kt-chart-empty");
		});

		it("handles single data point", () => {
			const html = renderScatterChart([{ x: 42, y: 99 }]);
			expect(html).toContain("<svg");
			expect(html).toContain("<circle");
		});

		it("handles all same x values", () => {
			const data = [
				{ x: 5, y: 10 },
				{ x: 5, y: 20 },
				{ x: 5, y: 30 },
			];
			const html = renderScatterChart(data);
			expect(html).toContain("<svg");
		});

		it("handles all same y values", () => {
			const data = [
				{ x: 1, y: 42 },
				{ x: 2, y: 42 },
				{ x: 3, y: 42 },
			];
			const html = renderScatterChart(data);
			expect(html).toContain("<svg");
		});

		it("handles negative values on both axes", () => {
			const data = [
				{ x: -10, y: -20 },
				{ x: 10, y: 20 },
			];
			const html = renderScatterChart(data);
			expect(html).toContain("<svg");
		});

		it("handles data with only non-numeric columns", () => {
			const data = [
				{ name: "Alice", city: "Tokyo" },
				{ name: "Bob", city: "Osaka" },
			];
			const html = renderScatterChart(data as Record<string, unknown>[]);
			expect(html).toContain("kt-chart-empty");
		});

		it("handles data where all values are NaN", () => {
			const data = [
				{ x: Number.NaN, y: Number.NaN },
				{ x: Number.NaN, y: Number.NaN },
			];
			const html = renderScatterChart(data);
			expect(html).toContain("kt-chart-empty");
		});

		it("handles size column with negative values", () => {
			const data = [
				{ x: 1, y: 10, size: -100 },
				{ x: 2, y: 20, size: 100 },
			];
			const html = renderScatterChart(data, {
				x: "x",
				y: "y",
				size: "size",
			});
			expect(html).toContain("<circle");
		});
	});

	describe("validation and fallbacks", () => {
		it("falls back on invalid opacity (<= 0)", () => {
			const data = [{ x: 1, y: 10 }];
			const html = renderScatterChart(data, { opacity: -1 });
			expect(html).toContain('fill-opacity="0.7"');
		});

		it("falls back on invalid opacity (> 1)", () => {
			const data = [{ x: 1, y: 10 }];
			const html = renderScatterChart(data, { opacity: 2 });
			expect(html).toContain('fill-opacity="0.7"');
		});

		it("falls back on invalid height", () => {
			const data = [{ x: 1, y: 10 }];
			const html = renderScatterChart(data, { height: -100 });
			expect(html).toContain('viewBox="0 0 600 400"');
		});

		it("falls back on invalid fixed size", () => {
			const data = [{ x: 1, y: 10 }];
			const html = renderScatterChart(data, { size: -5 });
			expect(html).toContain('r="5"');
		});
	});

	describe("security", () => {
		it("escapes title for XSS prevention", () => {
			const data = [{ x: 1, y: 10 }];
			const html = renderScatterChart(data, {
				title: "<script>alert(1)</script>",
			});
			expect(html).not.toContain("<script>");
		});

		it("escapes group names from color column", () => {
			const data = [{ x: 1, y: 10, cat: '<img onerror="alert(1)">' }];
			const html = renderScatterChart(data, {
				x: "x",
				y: "y",
				color: "cat",
			});
			// Raw <img> tag must not appear (should be escaped)
			expect(html).not.toContain("<img");
		});

		it("rejects invalid single color string", () => {
			const data = [{ x: 1, y: 10 }];
			const html = renderScatterChart(data, {
				color: "javascript:alert(1)",
			});
			expect(html).not.toContain("javascript:");
			expect(html).toContain("#4e79a7"); // falls back to default
		});

		it("validates color parameter", () => {
			const data = [{ x: 1, y: 10 }];
			const html = renderScatterChart(data, {
				color: ["url(javascript:alert(1))"],
			});
			expect(html).not.toContain("javascript:");
		});

		it("escapes axis labels for XSS prevention", () => {
			const data = [{ x: 1, y: 10 }];
			const html = renderScatterChart(data, {
				x_label: '<img onerror="alert(1)">',
			});
			expect(html).not.toContain("<img");
		});
	});

	describe("data limits", () => {
		it("limits data points to MAX_DATA_POINTS", () => {
			const large = Array.from({ length: 20000 }, (_, i) => ({
				x: i,
				y: i * 2,
			}));
			const html = renderScatterChart(large);
			expect(html).toContain("<svg");
		});

		it("limits groups to MAX_GROUPS", () => {
			const data = Array.from({ length: 25 }, (_, i) => ({
				x: i,
				y: i,
				group: `g${i}`,
			}));
			const html = renderScatterChart(data, {
				x: "x",
				y: "y",
				color: "group",
			});
			expect(html).toContain("<svg");
		});
	});
});
