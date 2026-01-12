import { describe, expectTypeOf, it } from "vitest";
import type {
	CacheDataFunction,
	CacheDataOptions,
	CachedFunction,
	CacheEntry,
	CacheResourceFunction,
	CacheResourceOptions,
	CacheStoreOptions,
} from "../../../../src/kt/cache/types.js";

describe("Cache Types", () => {
	describe("CacheEntry", () => {
		it("has correct structure", () => {
			const entry: CacheEntry<string> = {
				value: "test",
				createdAt: Date.now(),
				lastAccessedAt: Date.now(),
			};

			expectTypeOf(entry.value).toBeString();
			expectTypeOf(entry.createdAt).toBeNumber();
			expectTypeOf(entry.lastAccessedAt).toBeNumber();
			expectTypeOf(entry.expiresAt).toEqualTypeOf<number | undefined>();
		});

		it("supports generic types", () => {
			const numberEntry: CacheEntry<number> = {
				value: 42,
				createdAt: 0,
				lastAccessedAt: 0,
			};

			const objectEntry: CacheEntry<{ id: number; name: string }> = {
				value: { id: 1, name: "test" },
				createdAt: 0,
				lastAccessedAt: 0,
			};

			expectTypeOf(numberEntry.value).toBeNumber();
			expectTypeOf(objectEntry.value).toEqualTypeOf<{
				id: number;
				name: string;
			}>();
		});
	});

	describe("CacheDataOptions", () => {
		it("has optional properties", () => {
			const empty: CacheDataOptions = {};
			const full: CacheDataOptions = {
				ttl: 3600,
				max_entries: 100,
				hash_func: (args) => JSON.stringify(args),
				show_spinner: true,
			};

			expectTypeOf(empty).toMatchTypeOf<CacheDataOptions>();
			expectTypeOf(full).toMatchTypeOf<CacheDataOptions>();
		});

		it("hash_func has correct signature", () => {
			const options: CacheDataOptions = {
				hash_func: (args: unknown[]) => {
					expectTypeOf(args).toEqualTypeOf<unknown[]>();
					return "key";
				},
			};

			expectTypeOf(options.hash_func).toEqualTypeOf<((args: unknown[]) => string) | undefined>();
		});
	});

	describe("CacheResourceOptions", () => {
		it("has validate function", () => {
			const options: CacheResourceOptions = {
				validate: (resource) => {
					expectTypeOf(resource).toBeUnknown();
					return true;
				},
			};

			expectTypeOf(options.validate).toEqualTypeOf<((resource: unknown) => boolean) | undefined>();
		});
	});

	describe("CacheStoreOptions", () => {
		it("has optional ttl and max_entries", () => {
			const options: CacheStoreOptions = {
				ttl: 60,
				max_entries: 50,
			};

			expectTypeOf(options.ttl).toEqualTypeOf<number | undefined>();
			expectTypeOf(options.max_entries).toEqualTypeOf<number | undefined>();
		});
	});

	describe("CachedFunction", () => {
		it("preserves original function signature", () => {
			// CachedFunction preserves the original function's signature
			// while adding a clear() method
			type Cached = CachedFunction<[number, string], { result: boolean }>;

			const fn: Cached = Object.assign(
				(x: number, y: string) => ({ result: x > 0 && y.length > 0 }),
				{ clear: () => {} },
			);

			expectTypeOf(fn).toBeCallableWith(42, "test");
			expectTypeOf(fn(1, "a")).toEqualTypeOf<{ result: boolean }>();
		});

		it("has clear method", () => {
			type Cached = CachedFunction<[number], number>;

			const fn: Cached = Object.assign((x: number) => x * 2, {
				clear: () => {},
			});

			expectTypeOf(fn.clear).toBeFunction();
			expectTypeOf(fn.clear()).toBeVoid();
		});
	});

	describe("CacheDataFunction", () => {
		it("wraps function with correct types", () => {
			const cacheData: CacheDataFunction = Object.assign(
				<TArgs extends unknown[], TReturn>(
					fn: (...args: TArgs) => TReturn,
					_options?: CacheDataOptions,
				) => Object.assign(fn, { clear: () => {} }),
				{ clear: () => {} },
			);

			const cached = cacheData((x: number) => x * 2);

			expectTypeOf(cached).toBeCallableWith(5);
			expectTypeOf(cached(5)).toBeNumber();
			expectTypeOf(cached.clear).toBeFunction();
		});

		it("has static clear method", () => {
			const cacheData: CacheDataFunction = Object.assign(
				<TArgs extends unknown[], TReturn>(fn: (...args: TArgs) => TReturn) =>
					Object.assign(fn, { clear: () => {} }),
				{ clear: () => {} },
			);

			expectTypeOf(cacheData.clear).toBeFunction();
		});
	});

	describe("CacheResourceFunction", () => {
		it("wraps function with correct types", () => {
			const cacheResource: CacheResourceFunction = Object.assign(
				<TArgs extends unknown[], TReturn>(
					fn: (...args: TArgs) => TReturn,
					_options?: CacheResourceOptions,
				) => Object.assign(fn, { clear: () => {} }),
				{ clear: () => {} },
			);

			const cached = cacheResource(() => ({ connection: "active" }));

			expectTypeOf(cached()).toEqualTypeOf<{ connection: string }>();
			expectTypeOf(cached.clear).toBeFunction();
		});
	});
});
