import { describe, expect, it } from "vitest";
import {
	assertType,
	isArray,
	isBoolean,
	isNull,
	isNumber,
	isObject,
	isString,
	isUndefined,
	validateType,
} from "../../../src/utils/type-guards";

describe("type-guards", () => {
	describe("isString", () => {
		it("should return true for strings", () => {
			expect(isString("hello")).toBe(true);
			expect(isString("")).toBe(true);
		});

		it("should return false for non-strings", () => {
			expect(isString(123)).toBe(false);
			expect(isString(null)).toBe(false);
			expect(isString(undefined)).toBe(false);
			expect(isString({})).toBe(false);
		});
	});

	describe("isNumber", () => {
		it("should return true for numbers", () => {
			expect(isNumber(123)).toBe(true);
			expect(isNumber(0)).toBe(true);
			expect(isNumber(-5.5)).toBe(true);
		});

		it("should return false for NaN", () => {
			expect(isNumber(Number.NaN)).toBe(false);
		});

		it("should return false for non-numbers", () => {
			expect(isNumber("123")).toBe(false);
			expect(isNumber(null)).toBe(false);
		});
	});

	describe("isBoolean", () => {
		it("should return true for booleans", () => {
			expect(isBoolean(true)).toBe(true);
			expect(isBoolean(false)).toBe(true);
		});

		it("should return false for non-booleans", () => {
			expect(isBoolean(1)).toBe(false);
			expect(isBoolean("true")).toBe(false);
		});
	});

	describe("isNull", () => {
		it("should return true for null", () => {
			expect(isNull(null)).toBe(true);
		});

		it("should return false for non-null", () => {
			expect(isNull(undefined)).toBe(false);
			expect(isNull(0)).toBe(false);
		});
	});

	describe("isUndefined", () => {
		it("should return true for undefined", () => {
			expect(isUndefined(undefined)).toBe(true);
		});

		it("should return false for non-undefined", () => {
			expect(isUndefined(null)).toBe(false);
			expect(isUndefined(0)).toBe(false);
		});
	});

	describe("isObject", () => {
		it("should return true for objects", () => {
			expect(isObject({})).toBe(true);
			expect(isObject({ a: 1 })).toBe(true);
		});

		it("should return false for arrays", () => {
			expect(isObject([])).toBe(false);
		});

		it("should return false for null", () => {
			expect(isObject(null)).toBe(false);
		});
	});

	describe("isArray", () => {
		it("should return true for arrays", () => {
			expect(isArray([])).toBe(true);
			expect(isArray([1, 2, 3])).toBe(true);
		});

		it("should return false for non-arrays", () => {
			expect(isArray({})).toBe(false);
			expect(isArray("array")).toBe(false);
		});
	});

	describe("validateType", () => {
		it("should return value if validation passes", () => {
			expect(validateType("hello", isString, "default")).toBe("hello");
			expect(validateType(42, isNumber, 0)).toBe(42);
		});

		it("should return default if validation fails", () => {
			expect(validateType(123, isString, "default")).toBe("default");
			expect(validateType("not a number", isNumber, 0)).toBe(0);
		});
	});

	describe("assertType", () => {
		it("should return true if type matches", () => {
			expect(assertType("hello", isString, "test")).toBe(true);
		});

		it("should return false if type does not match", () => {
			expect(assertType(123, isString, "test")).toBe(false);
		});

		it("should return false for undefined without warning", () => {
			expect(assertType(undefined, isString, "test")).toBe(false);
		});
	});
});
