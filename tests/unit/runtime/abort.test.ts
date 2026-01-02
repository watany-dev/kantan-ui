import { describe, expect, it } from "vitest";
import { createAbortError, isAbortError } from "../../../src/runtime/abort";

describe("createAbortError", () => {
	it("should create DOMException with default message", () => {
		const error = createAbortError();

		expect(error.message).toBe("Operation was aborted");
		expect(error.name).toBe("AbortError");
	});

	it("should create DOMException with custom message", () => {
		const error = createAbortError("Custom abort message");

		expect(error.message).toBe("Custom abort message");
		expect(error.name).toBe("AbortError");
	});

	it("should be instanceof DOMException", () => {
		const error = createAbortError();

		expect(error).toBeInstanceOf(DOMException);
	});
});

describe("isAbortError", () => {
	it("should return true for createAbortError result", () => {
		const error = createAbortError();

		expect(isAbortError(error)).toBe(true);
	});

	it("should return true for DOMException with AbortError name", () => {
		const error = new DOMException("test", "AbortError");

		expect(isAbortError(error)).toBe(true);
	});

	it("should return false for DOMException with different name", () => {
		const error = new DOMException("test", "NotFoundError");

		expect(isAbortError(error)).toBe(false);
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
