import fc from "fast-check";
import { describe, expect, it } from "vitest";
import "../pbt-setup";
import { toDateString, toDatetimeString, toTimeString } from "../../../src/utils/date";

// Practical date range (4-digit years, valid Date objects, no NaN)
const validDate = fc
	.date({
		min: new Date("1000-01-01T00:00:00Z"),
		max: new Date("9999-12-31T23:59:59Z"),
	})
	.filter((d) => !Number.isNaN(d.getTime()));

describe("toDateString property-based tests", () => {
	it("always matches YYYY-MM-DD format for Date objects", () => {
		fc.assert(
			fc.property(validDate, (date) => {
				const result = toDateString(date);
				expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			}),
		);
	});

	it("month is always 01-12", () => {
		fc.assert(
			fc.property(validDate, (date) => {
				const result = toDateString(date);
				const month = Number.parseInt(result.split("-")[1], 10);
				expect(month).toBeGreaterThanOrEqual(1);
				expect(month).toBeLessThanOrEqual(12);
			}),
		);
	});

	it("day is always 01-31", () => {
		fc.assert(
			fc.property(validDate, (date) => {
				const result = toDateString(date);
				const day = Number.parseInt(result.split("-")[2], 10);
				expect(day).toBeGreaterThanOrEqual(1);
				expect(day).toBeLessThanOrEqual(31);
			}),
		);
	});

	it("returns string as-is for string input", () => {
		fc.assert(
			fc.property(fc.string(), (input) => {
				expect(toDateString(input)).toBe(input);
			}),
		);
	});

	it("round-trips correctly for valid dates", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 2000, max: 2099 }),
				fc.integer({ min: 1, max: 12 }),
				fc.integer({ min: 1, max: 28 }), // 28 to avoid invalid day issues
				(year, month, day) => {
					const date = new Date(year, month - 1, day);
					const result = toDateString(date);
					const [y, m, d] = result.split("-").map(Number);
					expect(y).toBe(year);
					expect(m).toBe(month);
					expect(d).toBe(day);
				},
			),
		);
	});
});

describe("toTimeString property-based tests", () => {
	it("always matches HH:MM format by default for Date objects", () => {
		fc.assert(
			fc.property(validDate, (date) => {
				const result = toTimeString(date);
				expect(result).toMatch(/^\d{2}:\d{2}$/);
			}),
		);
	});

	it("always matches HH:MM:SS format when includeSeconds is true", () => {
		fc.assert(
			fc.property(validDate, (date) => {
				const result = toTimeString(date, true);
				expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
			}),
		);
	});

	it("hours are always 00-23", () => {
		fc.assert(
			fc.property(validDate, (date) => {
				const result = toTimeString(date);
				const hours = Number.parseInt(result.split(":")[0], 10);
				expect(hours).toBeGreaterThanOrEqual(0);
				expect(hours).toBeLessThanOrEqual(23);
			}),
		);
	});

	it("minutes are always 00-59", () => {
		fc.assert(
			fc.property(validDate, (date) => {
				const result = toTimeString(date);
				const minutes = Number.parseInt(result.split(":")[1], 10);
				expect(minutes).toBeGreaterThanOrEqual(0);
				expect(minutes).toBeLessThanOrEqual(59);
			}),
		);
	});

	it("seconds are always 00-59", () => {
		fc.assert(
			fc.property(validDate, (date) => {
				const result = toTimeString(date, true);
				const seconds = Number.parseInt(result.split(":")[2], 10);
				expect(seconds).toBeGreaterThanOrEqual(0);
				expect(seconds).toBeLessThanOrEqual(59);
			}),
		);
	});

	it("returns string as-is for string input", () => {
		fc.assert(
			fc.property(fc.string(), fc.boolean(), (input, includeSeconds) => {
				expect(toTimeString(input, includeSeconds)).toBe(input);
			}),
		);
	});

	it("HH:MM is a prefix of HH:MM:SS for the same date", () => {
		fc.assert(
			fc.property(validDate, (date) => {
				const short = toTimeString(date);
				const long = toTimeString(date, true);
				expect(long.startsWith(short)).toBe(true);
			}),
		);
	});
});

describe("toDatetimeString property-based tests", () => {
	it("should always match YYYY-MM-DDTHH:MM format", () => {
		fc.assert(
			fc.property(validDate, (date) => {
				const result = toDatetimeString(date);
				expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
			}),
		);
	});

	it("should always match YYYY-MM-DDTHH:MM:SS format with seconds", () => {
		fc.assert(
			fc.property(validDate, (date) => {
				const result = toDatetimeString(date, true);
				expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
			}),
		);
	});

	it("should pass through strings unchanged", () => {
		fc.assert(
			fc.property(fc.string(), (str) => {
				expect(toDatetimeString(str)).toBe(str);
			}),
		);
	});

	it("without seconds should be prefix of with seconds", () => {
		fc.assert(
			fc.property(validDate, (date) => {
				const withoutSec = toDatetimeString(date);
				const withSec = toDatetimeString(date, true);
				expect(withSec.startsWith(withoutSec)).toBe(true);
			}),
		);
	});

	it("should equal toDateString + T + toTimeString", () => {
		fc.assert(
			fc.property(validDate, (date) => {
				const result = toDatetimeString(date);
				const expected = `${toDateString(date)}T${toTimeString(date)}`;
				expect(result).toBe(expected);
			}),
		);
	});
});
