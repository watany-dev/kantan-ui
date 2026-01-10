import { describe, expect, it } from "vitest";
import { toDateString, toTimeString } from "../../../src/utils/date";

describe("toDateString", () => {
	it("should return empty string for undefined", () => {
		expect(toDateString(undefined)).toBe("");
	});

	it("should return string as-is", () => {
		expect(toDateString("2024-01-15")).toBe("2024-01-15");
	});

	it("should convert Date to YYYY-MM-DD format", () => {
		const date = new Date(2024, 0, 15); // January 15, 2024
		expect(toDateString(date)).toBe("2024-01-15");
	});

	it("should pad single digit month and day", () => {
		const date = new Date(2024, 0, 5); // January 5, 2024
		expect(toDateString(date)).toBe("2024-01-05");
	});

	it("should handle December correctly", () => {
		const date = new Date(2024, 11, 25); // December 25, 2024
		expect(toDateString(date)).toBe("2024-12-25");
	});
});

describe("toTimeString", () => {
	it("should return empty string for undefined", () => {
		expect(toTimeString(undefined)).toBe("");
	});

	it("should return string as-is", () => {
		expect(toTimeString("08:30")).toBe("08:30");
	});

	it("should convert Date to HH:MM format by default", () => {
		const date = new Date(2024, 0, 1, 14, 30, 45);
		expect(toTimeString(date)).toBe("14:30");
	});

	it("should convert Date to HH:MM:SS format when includeSeconds is true", () => {
		const date = new Date(2024, 0, 1, 14, 30, 45);
		expect(toTimeString(date, true)).toBe("14:30:45");
	});

	it("should pad single digit hours, minutes, and seconds", () => {
		const date = new Date(2024, 0, 1, 8, 5, 3);
		expect(toTimeString(date)).toBe("08:05");
		expect(toTimeString(date, true)).toBe("08:05:03");
	});

	it("should handle midnight correctly", () => {
		const date = new Date(2024, 0, 1, 0, 0, 0);
		expect(toTimeString(date)).toBe("00:00");
		expect(toTimeString(date, true)).toBe("00:00:00");
	});

	it("should handle 23:59:59 correctly", () => {
		const date = new Date(2024, 0, 1, 23, 59, 59);
		expect(toTimeString(date)).toBe("23:59");
		expect(toTimeString(date, true)).toBe("23:59:59");
	});
});
