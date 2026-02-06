import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	validateMinMax,
	validateOptionsNotEmpty,
	validateValueInOptions,
	validateValueInRange,
} from "../../../src/utils/validation";

describe("validateMinMax property-based tests", () => {
	it("accepts any pair where min <= max", () => {
		fc.assert(
			fc.property(
				fc.integer(),
				fc.nat(), // non-negative offset
				(min, offset) => {
					const max = min + offset;
					expect(() => validateMinMax(min, max, "test")).not.toThrow();
				},
			),
		);
	});

	it("rejects any pair where min > max", () => {
		fc.assert(
			fc.property(
				fc.integer(),
				fc.integer({ min: 1 }), // positive offset so min > max
				(max, offset) => {
					const min = max + offset;
					expect(() => validateMinMax(min, max, "test")).toThrow();
				},
			),
		);
	});

	it("always accepts min === max", () => {
		fc.assert(
			fc.property(fc.integer(), (value) => {
				expect(() => validateMinMax(value, value, "test")).not.toThrow();
			}),
		);
	});
});

describe("validateValueInRange property-based tests", () => {
	it("accepts values within [min, max]", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: -1000, max: 1000 }),
				fc.integer({ min: -1000, max: 1000 }),
				(a, b) => {
					const min = Math.min(a, b);
					const max = Math.max(a, b);
					// Generate a value in [min, max]
					const value = min + Math.floor(Math.random() * (max - min + 1));
					expect(() => validateValueInRange(value, min, max, "test")).not.toThrow();
				},
			),
		);
	});

	it("rejects values below min", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: -1000, max: 1000 }),
				fc.integer({ min: 1, max: 1000 }),
				(min, offset) => {
					const value = min - offset;
					expect(() => validateValueInRange(value, min, undefined, "test")).toThrow();
				},
			),
		);
	});

	it("rejects values above max", () => {
		fc.assert(
			fc.property(
				fc.integer({ min: -1000, max: 1000 }),
				fc.integer({ min: 1, max: 1000 }),
				(max, offset) => {
					const value = max + offset;
					expect(() => validateValueInRange(value, undefined, max, "test")).toThrow();
				},
			),
		);
	});

	it("accepts any value when both min and max are undefined", () => {
		fc.assert(
			fc.property(fc.integer(), (value) => {
				expect(() => validateValueInRange(value, undefined, undefined, "test")).not.toThrow();
			}),
		);
	});
});

describe("validateOptionsNotEmpty property-based tests", () => {
	it("accepts non-empty arrays", () => {
		fc.assert(
			fc.property(fc.array(fc.string(), { minLength: 1 }), (options) => {
				expect(() => validateOptionsNotEmpty(options, "test")).not.toThrow();
			}),
		);
	});

	it("rejects empty arrays", () => {
		expect(() => validateOptionsNotEmpty([], "test")).toThrow();
	});

	it("rejects null and undefined", () => {
		expect(() => validateOptionsNotEmpty(null, "test")).toThrow();
		expect(() => validateOptionsNotEmpty(undefined, "test")).toThrow();
	});
});

describe("validateValueInOptions property-based tests", () => {
	it("accepts value that exists in options", () => {
		fc.assert(
			fc.property(fc.array(fc.string(), { minLength: 1 }), fc.nat(), (options, indexSeed) => {
				const index = indexSeed % options.length;
				const value = options[index];
				expect(() => validateValueInOptions(value, options, "test")).not.toThrow();
			}),
		);
	});

	it("rejects value not in options", () => {
		fc.assert(
			fc.property(fc.array(fc.string(), { minLength: 1 }), fc.string(), (options, value) => {
				fc.pre(!options.includes(value)); // precondition: value not in options
				expect(() => validateValueInOptions(value, options, "test")).toThrow();
			}),
		);
	});
});
