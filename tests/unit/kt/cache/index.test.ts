import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	cache_data,
	cache_resource,
	clear_all_caches,
	resetCacheDataStores,
	resetCacheResourceStores,
} from "../../../../src/kt/cache/index.js";

describe("cache index", () => {
	beforeEach(() => {
		resetCacheDataStores();
		resetCacheResourceStores();
	});

	afterEach(() => {
		resetCacheDataStores();
		resetCacheResourceStores();
	});

	describe("clear_all_caches", () => {
		it("clears all cache_data caches", () => {
			let count = 0;
			const fn = cache_data(() => ++count);

			fn();
			expect(count).toBe(1);

			clear_all_caches();

			fn();
			expect(count).toBe(2);
		});

		it("clears all cache_resource caches", () => {
			let count = 0;
			const fn = cache_resource(() => ({ id: ++count }));

			fn();
			expect(count).toBe(1);

			clear_all_caches();

			fn();
			expect(count).toBe(2);
		});

		it("clears both cache_data and cache_resource at once", () => {
			let dataCount = 0;
			let resourceCount = 0;

			const dataFn = cache_data(() => ++dataCount);
			const resourceFn = cache_resource(() => ({ id: ++resourceCount }));

			dataFn();
			resourceFn();
			expect(dataCount).toBe(1);
			expect(resourceCount).toBe(1);

			clear_all_caches();

			dataFn();
			resourceFn();
			expect(dataCount).toBe(2);
			expect(resourceCount).toBe(2);
		});
	});

	describe("exports", () => {
		it("exports cache_data", () => {
			expect(typeof cache_data).toBe("function");
			expect(typeof cache_data.clear).toBe("function");
		});

		it("exports cache_resource", () => {
			expect(typeof cache_resource).toBe("function");
			expect(typeof cache_resource.clear).toBe("function");
		});

		it("exports clear_all_caches", () => {
			expect(typeof clear_all_caches).toBe("function");
		});
	});
});
