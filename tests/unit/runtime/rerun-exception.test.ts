import { describe, expect, it } from "vitest";
import { isRerunException, RerunException } from "../../../src/runtime/rerun-exception";

describe("RerunException", () => {
	it("should be an instance of Error", () => {
		const error = new RerunException();
		expect(error).toBeInstanceOf(Error);
	});

	it("should have name 'RerunException'", () => {
		const error = new RerunException();
		expect(error.name).toBe("RerunException");
	});

	it("should have default message", () => {
		const error = new RerunException();
		expect(error.message).toBe("Rerun requested");
	});

	it("should accept custom message", () => {
		const error = new RerunException("Custom rerun message");
		expect(error.message).toBe("Custom rerun message");
	});
});

describe("isRerunException", () => {
	it("should return true for RerunException", () => {
		const error = new RerunException();
		expect(isRerunException(error)).toBe(true);
	});

	it("should return false for regular Error", () => {
		const error = new Error("Regular error");
		expect(isRerunException(error)).toBe(false);
	});

	it("should return false for non-error values", () => {
		expect(isRerunException("string")).toBe(false);
		expect(isRerunException(null)).toBe(false);
		expect(isRerunException(undefined)).toBe(false);
		expect(isRerunException(42)).toBe(false);
	});
});
