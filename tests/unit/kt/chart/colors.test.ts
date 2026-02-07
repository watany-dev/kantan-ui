import { describe, expect, it } from "vitest";
import {
	DEFAULT_CHART_COLORS,
	isValidColor,
	resolveChartColors,
	validateColors,
} from "../../../../src/kt/chart/colors";

describe("DEFAULT_CHART_COLORS", () => {
	it("has 10 colors (Tableau 10)", () => {
		expect(DEFAULT_CHART_COLORS).toHaveLength(10);
	});

	it("starts with blue (#4e79a7)", () => {
		expect(DEFAULT_CHART_COLORS[0]).toBe("#4e79a7");
	});
});

describe("resolveChartColors", () => {
	it("returns default palette colors for count without custom color", () => {
		const colors = resolveChartColors(3);
		expect(colors).toEqual(["#4e79a7", "#f28e2b", "#e15759"]);
	});

	it("wraps around when count exceeds palette length", () => {
		const colors = resolveChartColors(12);
		expect(colors).toHaveLength(12);
		expect(colors[10]).toBe(DEFAULT_CHART_COLORS[0]);
		expect(colors[11]).toBe(DEFAULT_CHART_COLORS[1]);
	});

	it("applies single color string to all series", () => {
		const colors = resolveChartColors(3, "#ff0000");
		expect(colors).toEqual(["#ff0000", "#ff0000", "#ff0000"]);
	});

	it("applies color array to corresponding series", () => {
		const colors = resolveChartColors(2, ["#ff0000", "#00ff00"]);
		expect(colors).toEqual(["#ff0000", "#00ff00"]);
	});

	it("fills missing colors with defaults when array is shorter", () => {
		const colors = resolveChartColors(3, ["#ff0000"]);
		expect(colors[0]).toBe("#ff0000");
		expect(colors[1]).toBe(DEFAULT_CHART_COLORS[1]);
		expect(colors[2]).toBe(DEFAULT_CHART_COLORS[2]);
	});
});

describe("isValidColor", () => {
	it("accepts 3-digit hex colors", () => {
		expect(isValidColor("#fff")).toBe(true);
		expect(isValidColor("#ABC")).toBe(true);
	});

	it("accepts 6-digit hex colors", () => {
		expect(isValidColor("#ffffff")).toBe(true);
		expect(isValidColor("#AABBCC")).toBe(true);
	});

	it("accepts CSS color names", () => {
		expect(isValidColor("red")).toBe(true);
		expect(isValidColor("blue")).toBe(true);
		expect(isValidColor("steelblue")).toBe(true);
	});

	it("accepts rgb() values", () => {
		expect(isValidColor("rgb(255,0,0)")).toBe(true);
		expect(isValidColor("rgb(255, 0, 0)")).toBe(true);
	});

	it("accepts rgba() values", () => {
		expect(isValidColor("rgba(0,0,0,0.5)")).toBe(true);
		expect(isValidColor("rgba(0, 0, 0, 0.5)")).toBe(true);
	});

	it("rejects javascript: URLs", () => {
		expect(isValidColor("javascript:alert(1)")).toBe(false);
	});

	it("rejects url() values", () => {
		expect(isValidColor("url(http://evil.com)")).toBe(false);
	});

	it("rejects expression() values", () => {
		expect(isValidColor("expression(alert(1))")).toBe(false);
	});

	it("rejects empty strings", () => {
		expect(isValidColor("")).toBe(false);
	});

	it("rejects strings with HTML tags", () => {
		expect(isValidColor("<script>")).toBe(false);
	});
});

describe("validateColors", () => {
	it("does not throw for valid single color", () => {
		expect(() => validateColors("#ff0000")).not.toThrow();
	});

	it("does not throw for valid color array", () => {
		expect(() => validateColors(["#ff0000", "blue"])).not.toThrow();
	});

	it("throws for invalid single color", () => {
		expect(() => validateColors("javascript:alert(1)")).toThrow();
	});

	it("throws for invalid color in array", () => {
		expect(() => validateColors(["#ff0000", "url(evil)"])).toThrow();
	});
});
