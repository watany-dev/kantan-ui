import { describe, expect, it } from "vitest";
import {
	renderGrid,
	renderLegend,
	renderNumericXAxis,
	renderScatterLegend,
	renderVerticalGrid,
	renderXAxis,
	renderYAxis,
} from "../../../../src/kt/chart/render-utils";

describe("render-utils", () => {
	const scaleY = (v: number): number => 350 - v * 3;

	describe("renderGrid", () => {
		it("generates grid lines SVG with kt-chart-grid class", () => {
			const svg = renderGrid(
				{ min: 0, max: 100, step: 20, ticks: [0, 20, 40, 60, 80, 100] },
				60,
				520,
				scaleY,
			);
			expect(svg).toContain("kt-chart-grid");
			expect(svg).toContain("<line");
		});

		it("generates one line per tick", () => {
			const svg = renderGrid({ min: 0, max: 100, step: 50, ticks: [0, 50, 100] }, 60, 520, scaleY);
			const lineCount = (svg.match(/<line /g) || []).length;
			expect(lineCount).toBe(3);
		});
	});

	describe("renderXAxis", () => {
		it("generates x-axis labels", () => {
			const svg = renderXAxis(["Jan", "Feb", "Mar"], 60, 520, 350);
			expect(svg).toContain("Jan");
			expect(svg).toContain("Feb");
			expect(svg).toContain("Mar");
		});

		it("has kt-chart-axis-x class", () => {
			const svg = renderXAxis(["A", "B"], 60, 520, 350);
			expect(svg).toContain("kt-chart-axis-x");
		});

		it("renders axis line", () => {
			const svg = renderXAxis(["A"], 60, 520, 350);
			expect(svg).toContain("<line");
		});
	});

	describe("renderYAxis", () => {
		it("generates y-axis with tick labels", () => {
			const svg = renderYAxis({ min: 0, max: 100, step: 50, ticks: [0, 50, 100] }, 60, scaleY);
			expect(svg).toContain("kt-chart-axis-y");
			expect(svg).toContain("0");
			expect(svg).toContain("50");
			expect(svg).toContain("100");
		});

		it("renders axis line", () => {
			const svg = renderYAxis({ min: 0, max: 100, step: 50, ticks: [0, 50, 100] }, 60, scaleY);
			expect(svg).toContain("<line");
		});
	});

	describe("renderLegend", () => {
		it("generates legend for multiple series", () => {
			const svg = renderLegend(
				[
					{ name: "revenue", color: "#4e79a7" },
					{ name: "cost", color: "#e15759" },
				],
				60,
				370,
			);
			expect(svg).toContain("kt-chart-legend");
			expect(svg).toContain("revenue");
			expect(svg).toContain("cost");
		});

		it("renders colored rectangles for each series", () => {
			const svg = renderLegend([{ name: "a", color: "#4e79a7" }], 60, 370);
			expect(svg).toContain("#4e79a7");
			expect(svg).toContain("<rect");
		});

		it("escapes series names to prevent XSS", () => {
			const svg = renderLegend([{ name: "<script>alert(1)</script>", color: "#4e79a7" }], 60, 370);
			expect(svg).not.toContain("<script>");
		});
	});

	describe("renderNumericXAxis", () => {
		it("renders numeric tick labels", () => {
			const scale = { min: 0, max: 100, step: 20, ticks: [0, 20, 40, 60, 80, 100] };
			const scaleX = (v: number) => 60 + (v / 100) * 520;
			const svg = renderNumericXAxis(scale, scaleX, 350, 60, 520);
			expect(svg).toContain("kt-chart-axis-x");
			expect(svg).toContain("20");
			expect(svg).toContain("80");
		});

		it("renders axis line", () => {
			const scale = { min: 0, max: 100, step: 50, ticks: [0, 50, 100] };
			const scaleX = (v: number) => 60 + (v / 100) * 520;
			const svg = renderNumericXAxis(scale, scaleX, 350, 60, 520);
			expect(svg).toContain("<line");
		});
	});

	describe("renderVerticalGrid", () => {
		it("renders vertical grid lines for x-axis ticks", () => {
			const scale = { min: 0, max: 100, step: 20, ticks: [0, 20, 40, 60, 80, 100] };
			const scaleX = (v: number) => 60 + (v / 100) * 520;
			const svg = renderVerticalGrid(scale, scaleX, 20, 330);
			expect(svg).toContain("<line");
		});

		it("generates one line per tick", () => {
			const scale = { min: 0, max: 100, step: 50, ticks: [0, 50, 100] };
			const scaleX = (v: number) => 60 + (v / 100) * 520;
			const svg = renderVerticalGrid(scale, scaleX, 20, 330);
			const lineCount = (svg.match(/<line /g) || []).length;
			expect(lineCount).toBe(3);
		});
	});

	describe("renderScatterLegend", () => {
		it("renders circles instead of rectangles", () => {
			const svg = renderScatterLegend([{ name: "Group A", color: "#4e79a7" }], 60, 370);
			expect(svg).toContain("kt-chart-legend");
			expect(svg).toContain("<circle");
			expect(svg).not.toContain("<rect");
		});

		it("renders group names", () => {
			const svg = renderScatterLegend(
				[
					{ name: "A", color: "#4e79a7" },
					{ name: "B", color: "#e15759" },
				],
				60,
				370,
			);
			expect(svg).toContain("A");
			expect(svg).toContain("B");
		});

		it("escapes group names to prevent XSS", () => {
			const svg = renderScatterLegend(
				[{ name: "<script>alert(1)</script>", color: "#4e79a7" }],
				60,
				370,
			);
			expect(svg).not.toContain("<script>");
		});
	});
});
