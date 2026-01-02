import { describe, expect, it } from "vitest";
import { AbortError, isAbortError } from "../../../src/runtime/abort";

describe("AbortError", () => {
	it("should create error with default message", () => {
		const error = new AbortError();

		expect(error.message).toBe("Operation was aborted");
		expect(error.name).toBe("AbortError");
	});

	it("should create error with custom message", () => {
		const error = new AbortError("Custom abort message");

		expect(error.message).toBe("Custom abort message");
		expect(error.name).toBe("AbortError");
	});

	it("should be instanceof Error", () => {
		const error = new AbortError();

		expect(error).toBeInstanceOf(Error);
		expect(error).toBeInstanceOf(AbortError);
	});
});

describe("isAbortError", () => {
	it("should return true for AbortError", () => {
		const error = new AbortError();

		expect(isAbortError(error)).toBe(true);
	});

	it("should return false for regular Error", () => {
		const error = new Error("regular error");

		expect(isAbortError(error)).toBe(false);
	});

	it("should return false for non-error values", () => {
		expect(isAbortError(null)).toBe(false);
		expect(isAbortError(undefined)).toBe(false);
		expect(isAbortError("string")).toBe(false);
		expect(isAbortError(123)).toBe(false);
		expect(isAbortError({})).toBe(false);
	});
});
