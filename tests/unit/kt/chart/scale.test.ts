import { describe, expect, it } from "vitest";
import { calculateAxisScale, formatTickValue } from "../../../../src/kt/chart/scale";

describe("calculateAxisScale", () => {
	it("generates nice ticks for 0-100 range", () => {
		const scale = calculateAxisScale([0, 50, 100]);
		expect(scale.min).toBe(0);
		expect(scale.max).toBe(100);
		expect(scale.ticks.length).toBeGreaterThanOrEqual(3);
		// All ticks should be nice numbers
		for (const tick of scale.ticks) {
			expect(tick).toBeGreaterThanOrEqual(0);
			expect(tick).toBeLessThanOrEqual(100);
		}
	});

	it("always includes 0 when min >= 0 (bar chart convention)", () => {
		const scale = calculateAxisScale([50, 80, 100]);
		expect(scale.min).toBe(0);
	});

	it("handles negative values", () => {
		const scale = calculateAxisScale([-30, -10, 20]);
		expect(scale.min).toBeLessThanOrEqual(-30);
		expect(scale.max).toBeGreaterThanOrEqual(20);
	});

	it("fixes max to 0 when all values are negative", () => {
		const scale = calculateAxisScale([-100, -50, -20]);
		expect(scale.max).toBe(0);
	});

	it("handles single value", () => {
		const scale = calculateAxisScale([42]);
		expect(scale.min).toBe(0);
		expect(scale.max).toBeGreaterThan(42);
		expect(scale.ticks.length).toBeGreaterThanOrEqual(2);
	});

	it("handles all-zero values", () => {
		const scale = calculateAxisScale([0, 0, 0]);
		expect(scale.min).toBeLessThan(scale.max);
		expect(scale.ticks.length).toBeGreaterThanOrEqual(2);
	});

	it("handles decimal ranges (0.1-0.9)", () => {
		const scale = calculateAxisScale([0.1, 0.5, 0.9]);
		expect(scale.min).toBe(0);
		expect(scale.max).toBeGreaterThanOrEqual(0.9);
	});

	it("respects maxTicks parameter", () => {
		const scale = calculateAxisScale([0, 1000], 3);
		expect(scale.ticks.length).toBeLessThanOrEqual(4);
	});
});

describe("formatTickValue", () => {
	it("formats integers without decimal point", () => {
		expect(formatTickValue(100)).toBe("100");
		expect(formatTickValue(0)).toBe("0");
	});

	it("formats large numbers in exponential notation", () => {
		const result = formatTickValue(1000000);
		expect(result).toContain("e");
	});

	it("formats decimals with appropriate precision", () => {
		const result = formatTickValue(0.123456);
		// Should not have excessive decimal places
		expect(result.length).toBeLessThan(10);
	});
});
