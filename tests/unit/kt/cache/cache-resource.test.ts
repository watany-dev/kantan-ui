import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	cache_resource,
	resetCacheResourceStores,
} from "../../../../src/kt/cache/cache-resource.js";

describe("cache_resource", () => {
	beforeEach(() => {
		resetCacheResourceStores();
	});

	afterEach(() => {
		resetCacheResourceStores();
	});

	describe("basic caching", () => {
		it("returns same instance", () => {
			const fn = cache_resource(() => ({ id: Math.random() }));

			const a = fn();
			const b = fn();
			expect(a).toBe(b); // same reference
		});

		it("uses different instance for different args", () => {
			const fn = cache_resource((host: string) => ({
				host,
				id: Math.random(),
			}));

			const a = fn("localhost");
			const b = fn("127.0.0.1");
			expect(a).not.toBe(b);
			expect(a.host).toBe("localhost");
			expect(b.host).toBe("127.0.0.1");
		});

		it("caches function results", () => {
			let callCount = 0;
			const fn = cache_resource(() => {
				callCount++;
				return { value: 42 };
			});

			fn();
			fn();
			fn();
			expect(callCount).toBe(1);
		});

		it("handles multiple arguments", () => {
			let callCount = 0;
			const fn = cache_resource((host: string, port: number) => {
				callCount++;
				return { host, port };
			});

			fn("localhost", 3000);
			fn("localhost", 3000);
			fn("localhost", 4000); // different port
			expect(callCount).toBe(2);
		});
	});

	describe("reference identity", () => {
		it("does NOT copy value (unlike cache_data)", () => {
			const fn = cache_resource(() => ({ count: 0 }));

			const result1 = fn();
			result1.count = 999;

			const result2 = fn();
			// cache_resource returns same instance, so mutation is visible
			expect(result2.count).toBe(999);
			expect(result1).toBe(result2);
		});
	});

	describe("clear() method", () => {
		it("clears cache for specific function", () => {
			let callCount = 0;
			const fn = cache_resource(() => {
				callCount++;
				return { id: callCount };
			});

			const first = fn();
			expect(first.id).toBe(1);

			fn.clear();

			const second = fn();
			expect(second.id).toBe(2);
			expect(first).not.toBe(second);
		});

		it("only clears its own cache", () => {
			let count1 = 0;
			let count2 = 0;
			const fn1 = cache_resource(() => ({ id: ++count1 }));
			const fn2 = cache_resource(() => ({ id: ++count2 }));

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
		it("clears all cache_resource caches", () => {
			let count1 = 0;
			let count2 = 0;
			const fn1 = cache_resource(() => ({ id: ++count1 }));
			const fn2 = cache_resource(() => ({ id: ++count2 }));

			fn1();
			fn2();

			cache_resource.clear();

			fn1();
			fn2();

			expect(count1).toBe(2);
			expect(count2).toBe(2);
		});
	});

	describe("validate option", () => {
		it("invalidates when validate returns false", () => {
			let valid = true;
			let callCount = 0;
			const fn = cache_resource(
				() => {
					callCount++;
					return { created: Date.now() };
				},
				{ validate: () => valid },
			);

			const first = fn();
			expect(callCount).toBe(1);

			fn(); // validate = true, cache hit
			expect(callCount).toBe(1);

			valid = false;
			const second = fn(); // validate = false, regenerate
			expect(callCount).toBe(2);
			expect(second).not.toBe(first);
		});

		it("passes resource to validate function", () => {
			const validateCalls: unknown[] = [];
			const fn = cache_resource(() => ({ isConnected: true }), {
				validate: (resource) => {
					validateCalls.push(resource);
					return (resource as { isConnected: boolean }).isConnected;
				},
			});

			fn();
			fn(); // should call validate

			expect(validateCalls).toHaveLength(1);
			expect(validateCalls[0]).toEqual({ isConnected: true });
		});

		it("recaches after validation failure", () => {
			let connectionValid = true;
			let callCount = 0;

			const fn = cache_resource(
				() => {
					callCount++;
					return { id: callCount };
				},
				{ validate: () => connectionValid },
			);

			fn();
			expect(callCount).toBe(1);

			connectionValid = false;
			fn();
			expect(callCount).toBe(2);

			connectionValid = true;
			fn();
			expect(callCount).toBe(2); // cached again
		});
	});

	describe("max_entries option", () => {
		it("has default max_entries of 10", () => {
			let callCount = 0;
			const fn = cache_resource((x: number) => {
				callCount++;
				return { x };
			});

			// Create 11 entries
			for (let i = 0; i < 11; i++) {
				fn(i);
			}

			// First entry should be evicted
			callCount = 0;
			fn(0); // recalculate
			expect(callCount).toBe(1);
		});

		it("respects custom max_entries", () => {
			let callCount = 0;
			const fn = cache_resource(
				(x: number) => {
					callCount++;
					return { x };
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

	describe("TTL option", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("respects TTL", () => {
			let callCount = 0;
			const fn = cache_resource(
				() => {
					callCount++;
					return { id: callCount };
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

	describe("custom hash_func option", () => {
		it("uses custom hash function", () => {
			let callCount = 0;
			const fn = cache_resource(
				(config: { host: string; port: number }) => {
					callCount++;
					return { connection: `${config.host}:${config.port}` };
				},
				{
					hash_func: (args) => {
						const config = args[0] as { host: string; port: number };
						return `${config.host}:${config.port}`;
					},
				},
			);

			fn({ host: "localhost", port: 3000 });
			fn({ host: "localhost", port: 3000 }); // same, should hit cache

			expect(callCount).toBe(1);
		});
	});

	describe("type inference", () => {
		it("preserves type inference", () => {
			const fn = cache_resource((name: string) => ({
				name,
				createdAt: new Date(),
			}));
			const result = fn("test");

			expect(result.name).toBe("test");
			expect(result.createdAt).toBeInstanceOf(Date);
		});
	});

	describe("edge cases", () => {
		it("handles empty arguments", () => {
			let callCount = 0;
			const fn = cache_resource(() => {
				callCount++;
				return { singleton: true };
			});

			fn();
			fn();
			expect(callCount).toBe(1);
		});

		it("handles null and undefined arguments", () => {
			let callCount = 0;
			const fn = cache_resource((x: unknown) => {
				callCount++;
				return { x };
			});

			fn(null);
			fn(null);
			fn(undefined);
			fn(undefined);

			expect(callCount).toBe(2);
		});
	});
});
