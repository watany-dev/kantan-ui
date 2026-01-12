import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cache_data, resetCacheDataStores } from "../../../../src/kt/cache/cache-data.js";

describe("cache_data", () => {
	beforeEach(() => {
		resetCacheDataStores();
	});

	afterEach(() => {
		resetCacheDataStores();
	});

	describe("basic caching", () => {
		it("caches function results", () => {
			let callCount = 0;
			const fn = cache_data((x: number) => {
				callCount++;
				return x * 2;
			});

			expect(fn(5)).toBe(10);
			expect(fn(5)).toBe(10);
			expect(callCount).toBe(1);
		});

		it("uses different cache for different args", () => {
			let callCount = 0;
			const fn = cache_data((x: number) => {
				callCount++;
				return x * 2;
			});

			fn(1);
			fn(2);
			fn(1);
			expect(callCount).toBe(2);
		});

		it("handles multiple arguments", () => {
			let callCount = 0;
			const fn = cache_data((a: number, b: string) => {
				callCount++;
				return `${a}-${b}`;
			});

			expect(fn(1, "hello")).toBe("1-hello");
			expect(fn(1, "hello")).toBe("1-hello");
			expect(fn(1, "world")).toBe("1-world");
			expect(callCount).toBe(2);
		});

		it("handles object arguments", () => {
			let callCount = 0;
			const fn = cache_data((obj: { id: number }) => {
				callCount++;
				return obj.id * 2;
			});

			expect(fn({ id: 5 })).toBe(10);
			expect(fn({ id: 5 })).toBe(10);
			expect(fn({ id: 10 })).toBe(20);
			expect(callCount).toBe(2);
		});
	});

	describe("mutation safety", () => {
		it("returns copy of cached value (mutation safety)", () => {
			const fn = cache_data(() => ({ count: 0 }));

			const result1 = fn();
			result1.count = 999;

			const result2 = fn();
			expect(result2.count).toBe(0);
		});

		it("returns copy of cached array", () => {
			const fn = cache_data(() => [1, 2, 3]);

			const result1 = fn();
			result1.push(4);

			const result2 = fn();
			expect(result2).toEqual([1, 2, 3]);
		});

		it("returns primitives directly (no copy needed)", () => {
			const fn = cache_data(() => 42);
			expect(fn()).toBe(42);
			expect(fn()).toBe(42);
		});
	});

	describe("clear() method", () => {
		it("clears cache for specific function", () => {
			let callCount = 0;
			const fn = cache_data(() => callCount++);

			fn();
			fn();
			expect(callCount).toBe(1);

			fn.clear();
			fn();
			expect(callCount).toBe(2);
		});

		it("only clears its own cache", () => {
			let count1 = 0;
			let count2 = 0;
			const fn1 = cache_data(() => count1++);
			const fn2 = cache_data(() => count2++);

			fn1();
			fn2();
			fn1.clear();

			fn1();
			fn2();

			expect(count1).toBe(2); // was cleared
			expect(count2).toBe(1); // not affected
		});
	});

	describe("static clear()", () => {
		it("clears all cache_data caches", () => {
			let count1 = 0;
			let count2 = 0;
			const fn1 = cache_data(() => count1++);
			const fn2 = cache_data(() => count2++);

			fn1();
			fn2();

			cache_data.clear();

			fn1();
			fn2();

			expect(count1).toBe(2);
			expect(count2).toBe(2);
		});
	});

	describe("async function support", () => {
		it("caches async function results", async () => {
			let callCount = 0;
			const fn = cache_data(async (x: number) => {
				callCount++;
				await new Promise((r) => setTimeout(r, 10));
				return x * 2;
			});

			expect(await fn(5)).toBe(10);
			expect(await fn(5)).toBe(10);
			expect(callCount).toBe(1);
		});

		it("shares promise for concurrent calls", async () => {
			let callCount = 0;
			const fn = cache_data(async () => {
				callCount++;
				await new Promise((r) => setTimeout(r, 50));
				return "result";
			});

			const results = await Promise.all([fn(), fn(), fn()]);
			expect(results).toEqual(["result", "result", "result"]);
			expect(callCount).toBe(1);
		});

		it("does not cache rejected promises", async () => {
			let callCount = 0;
			let shouldFail = true;
			// biome-ignore lint/suspicious/useAwait: testing async behavior
			const fn = cache_data(async () => {
				callCount++;
				if (shouldFail) {
					shouldFail = false;
					throw new Error("fail");
				}
				return "success";
			});

			await expect(fn()).rejects.toThrow("fail");
			expect(await fn()).toBe("success");
			expect(callCount).toBe(2);
		});

		it("caches after async success", async () => {
			let callCount = 0;
			const fn = cache_data(async () => {
				callCount++;
				await new Promise((r) => setTimeout(r, 10));
				return { value: 42 };
			});

			await fn();
			await fn();

			expect(callCount).toBe(1);
		});

		it("returns copy of async cached value", async () => {
			const fn = cache_data(async () => ({ count: 0 }));

			const result1 = await fn();
			result1.count = 999;

			const result2 = await fn();
			expect(result2.count).toBe(0);
		});
	});

	describe("TTL option", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("respects TTL", () => {
			let callCount = 0;
			const fn = cache_data(
				() => {
					callCount++;
					return Date.now();
				},
				{ ttl: 1 },
			); // 1 second

			fn();
			expect(callCount).toBe(1);

			vi.advanceTimersByTime(500);
			fn();
			expect(callCount).toBe(1); // still cached

			vi.advanceTimersByTime(600);
			fn();
			expect(callCount).toBe(2); // expired
		});
	});

	describe("max_entries option", () => {
		it("uses default max_entries of 100", () => {
			// This is hard to test directly, but we can verify it doesn't crash
			const fn = cache_data((x: number) => x * 2);

			for (let i = 0; i < 150; i++) {
				fn(i);
			}

			// Should not throw and should still work
			expect(fn(149)).toBe(298);
		});

		it("respects custom max_entries", () => {
			let callCount = 0;
			const fn = cache_data(
				(x: number) => {
					callCount++;
					return x;
				},
				{ max_entries: 2 },
			);

			fn(1);
			fn(2);
			fn(3); // evicts 1

			callCount = 0;
			fn(1); // should recalculate
			expect(callCount).toBe(1);

			callCount = 0;
			fn(3); // should be cached
			expect(callCount).toBe(0);
		});
	});

	describe("custom hash_func option", () => {
		it("uses custom hash function", () => {
			let callCount = 0;
			const fn = cache_data(
				(obj: { id: number; name: string }) => {
					callCount++;
					return obj.id;
				},
				{
					hash_func: (args) => {
						const obj = args[0] as { id: number };
						return String(obj.id);
					},
				},
			);

			fn({ id: 1, name: "Alice" });
			fn({ id: 1, name: "Bob" }); // same id, should hit cache

			expect(callCount).toBe(1);
		});
	});

	describe("type inference", () => {
		it("preserves type inference for sync functions", () => {
			const fn = cache_data((x: number, y: string) => ({ x, y }));
			const result = fn(1, "test");

			// TypeScript should infer the correct type
			expect(result.x).toBe(1);
			expect(result.y).toBe("test");
		});

		it("preserves type inference for async functions", async () => {
			const fn = cache_data(async (x: number) => ({ doubled: x * 2 }));
			const result = await fn(5);

			expect(result.doubled).toBe(10);
		});
	});

	describe("edge cases", () => {
		it("handles empty arguments", () => {
			let callCount = 0;
			const fn = cache_data(() => {
				callCount++;
				return "constant";
			});

			fn();
			fn();
			expect(callCount).toBe(1);
		});

		it("handles null and undefined arguments", () => {
			let callCount = 0;
			const fn = cache_data((x: unknown) => {
				callCount++;
				return x;
			});

			fn(null);
			fn(null);
			fn(undefined);
			fn(undefined);

			expect(callCount).toBe(2);
		});
	});
});
