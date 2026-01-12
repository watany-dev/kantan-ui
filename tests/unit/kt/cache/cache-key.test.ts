import { describe, expect, it } from "vitest";
import {
	generateCacheKey,
	generateCacheKeySafe,
	hasCircularReference,
	stableStringify,
} from "../../../../src/kt/cache/cache-key.js";

describe("cache-key", () => {
	describe("generateCacheKey", () => {
		describe("primitives", () => {
			it("handles numbers", () => {
				expect(generateCacheKey([1, 2, 3])).toBe("number:1|number:2|number:3");
			});

			it("handles strings", () => {
				expect(generateCacheKey(["hello", "world"])).toBe("string:hello|string:world");
			});

			it("handles booleans", () => {
				expect(generateCacheKey([true, false])).toBe("boolean:true|boolean:false");
			});

			it("handles mixed primitives", () => {
				expect(generateCacheKey([1, "hello", true])).toBe("number:1|string:hello|boolean:true");
			});
		});

		describe("null and undefined", () => {
			it("handles null", () => {
				expect(generateCacheKey([null])).toBe("null");
			});

			it("handles undefined", () => {
				expect(generateCacheKey([undefined])).toBe("undefined");
			});

			it("handles mixed null and undefined", () => {
				expect(generateCacheKey([null, undefined, null])).toBe("null|undefined|null");
			});
		});

		describe("objects", () => {
			it("handles simple objects", () => {
				const key = generateCacheKey([{ a: 1, b: 2 }]);
				expect(key).toContain("json:");
				expect(key).toContain('"a":1');
				expect(key).toContain('"b":2');
			});

			it("produces same key for objects with different key order", () => {
				const key1 = generateCacheKey([{ b: 2, a: 1 }]);
				const key2 = generateCacheKey([{ a: 1, b: 2 }]);
				expect(key1).toBe(key2);
			});

			it("handles nested objects", () => {
				const key = generateCacheKey([{ user: { id: 1, name: "test" } }]);
				expect(key).toContain("json:");
				expect(key).toContain("user");
			});
		});

		describe("arrays", () => {
			it("handles arrays", () => {
				const key = generateCacheKey([[1, 2, 3]]);
				expect(key).toBe("json:[1,2,3]");
			});

			it("handles nested arrays", () => {
				const key = generateCacheKey([
					[
						[1, 2],
						[3, 4],
					],
				]);
				expect(key).toBe("json:[[1,2],[3,4]]");
			});

			it("handles arrays with objects", () => {
				const key = generateCacheKey([[{ a: 1 }, { b: 2 }]]);
				expect(key).toContain("json:");
			});
		});

		describe("functions and symbols", () => {
			it("handles functions with unique IDs", () => {
				const fn1 = () => {};
				const fn2 = () => {};

				const key1a = generateCacheKey([fn1]);
				const key1b = generateCacheKey([fn1]);
				const key2 = generateCacheKey([fn2]);

				// Same function should produce same key
				expect(key1a).toBe(key1b);
				// Different functions should produce different keys
				expect(key1a).not.toBe(key2);
			});

			it("handles symbols with unique IDs", () => {
				const sym1 = Symbol("test");
				const sym2 = Symbol("test");

				const key1a = generateCacheKey([sym1]);
				const key1b = generateCacheKey([sym1]);
				const key2 = generateCacheKey([sym2]);

				expect(key1a).toBe(key1b);
				expect(key1a).not.toBe(key2);
			});
		});

		describe("empty cases", () => {
			it("handles empty arguments", () => {
				expect(generateCacheKey([])).toBe("");
			});

			it("handles empty object", () => {
				expect(generateCacheKey([{}])).toBe("json:{}");
			});

			it("handles empty array", () => {
				expect(generateCacheKey([[]])).toBe("json:[]");
			});
		});

		describe("edge cases", () => {
			it("handles NaN", () => {
				const key = generateCacheKey([Number.NaN]);
				expect(key).toBe("number:NaN");
			});

			it("handles Infinity", () => {
				expect(generateCacheKey([Number.POSITIVE_INFINITY])).toBe("number:Infinity");
				expect(generateCacheKey([Number.NEGATIVE_INFINITY])).toBe("number:-Infinity");
			});

			it("handles empty string", () => {
				expect(generateCacheKey([""])).toBe("string:");
			});

			it("handles zero", () => {
				expect(generateCacheKey([0])).toBe("number:0");
				expect(generateCacheKey([-0])).toBe("number:0");
			});
		});
	});

	describe("stableStringify", () => {
		it("sorts object keys", () => {
			const obj1 = { c: 3, a: 1, b: 2 };
			const obj2 = { a: 1, b: 2, c: 3 };

			expect(stableStringify(obj1)).toBe(stableStringify(obj2));
		});

		it("handles nested object key sorting", () => {
			const obj1 = { outer: { z: 1, a: 2 } };
			const obj2 = { outer: { a: 2, z: 1 } };

			expect(stableStringify(obj1)).toBe(stableStringify(obj2));
		});

		it("handles primitives", () => {
			expect(stableStringify(42)).toBe("42");
			expect(stableStringify("hello")).toBe('"hello"');
			expect(stableStringify(true)).toBe("true");
			expect(stableStringify(null)).toBe("null");
			expect(stableStringify(undefined)).toBe("undefined");
		});
	});

	describe("hasCircularReference", () => {
		it("returns false for non-circular objects", () => {
			expect(hasCircularReference({ a: 1, b: { c: 2 } })).toBe(false);
			expect(hasCircularReference([1, 2, [3, 4]])).toBe(false);
			expect(hasCircularReference(null)).toBe(false);
			expect(hasCircularReference(42)).toBe(false);
		});

		it("returns true for circular object references", () => {
			const obj: Record<string, unknown> = { a: 1 };
			obj.self = obj;

			expect(hasCircularReference(obj)).toBe(true);
		});

		it("returns true for circular array references", () => {
			const arr: unknown[] = [1, 2];
			arr.push(arr);

			expect(hasCircularReference(arr)).toBe(true);
		});

		it("returns true for deeply nested circular references", () => {
			const obj: Record<string, unknown> = {
				level1: {
					level2: {
						level3: {},
					},
				},
			};
			(obj.level1 as Record<string, unknown>).level2.level3 = obj;

			expect(hasCircularReference(obj)).toBe(true);
		});
	});

	describe("generateCacheKeySafe", () => {
		it("works for normal arguments", () => {
			expect(generateCacheKeySafe([1, "hello", { a: 1 }])).toBe(
				generateCacheKey([1, "hello", { a: 1 }]),
			);
		});

		it("throws for circular references with helpful message", () => {
			const obj: Record<string, unknown> = { a: 1 };
			obj.self = obj;

			expect(() => generateCacheKeySafe([obj])).toThrow(/circular/i);
			expect(() => generateCacheKeySafe([obj])).toThrow(/hash_func/i);
		});
	});
});
