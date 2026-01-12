import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CacheStore } from "../../../../src/kt/cache/cache-store.js";

describe("CacheStore", () => {
	describe("basic CRUD operations", () => {
		it("stores and retrieves values", () => {
			const store = new CacheStore<number>();
			store.set("key1", 42);
			expect(store.get("key1")).toBe(42);
		});

		it("returns undefined for missing keys", () => {
			const store = new CacheStore<number>();
			expect(store.get("missing")).toBeUndefined();
		});

		it("deletes entries", () => {
			const store = new CacheStore<number>();
			store.set("key1", 42);
			expect(store.delete("key1")).toBe(true);
			expect(store.get("key1")).toBeUndefined();
		});

		it("returns false when deleting non-existent key", () => {
			const store = new CacheStore<number>();
			expect(store.delete("missing")).toBe(false);
		});

		it("clears all entries", () => {
			const store = new CacheStore<number>();
			store.set("key1", 1);
			store.set("key2", 2);
			store.clear();
			expect(store.get("key1")).toBeUndefined();
			expect(store.get("key2")).toBeUndefined();
		});

		it("tracks entry count", () => {
			const store = new CacheStore<number>();
			expect(store.size).toBe(0);

			store.set("key1", 1);
			expect(store.size).toBe(1);

			store.set("key2", 2);
			expect(store.size).toBe(2);

			store.delete("key1");
			expect(store.size).toBe(1);
		});

		it("overwrites existing values", () => {
			const store = new CacheStore<number>();
			store.set("key1", 1);
			store.set("key1", 2);
			expect(store.get("key1")).toBe(2);
			expect(store.size).toBe(1);
		});
	});

	describe("has() method", () => {
		it("returns true for existing keys", () => {
			const store = new CacheStore<number>();
			store.set("key1", 42);
			expect(store.has("key1")).toBe(true);
		});

		it("returns false for missing keys", () => {
			const store = new CacheStore<number>();
			expect(store.has("missing")).toBe(false);
		});
	});

	describe("TTL support", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("returns undefined for expired entries", () => {
			const store = new CacheStore<number>({ ttl: 1 }); // 1 second
			store.set("key1", 42);

			expect(store.get("key1")).toBe(42);

			vi.advanceTimersByTime(1100); // 1.1 seconds
			expect(store.get("key1")).toBeUndefined();
		});

		it("keeps entries before TTL expires", () => {
			const store = new CacheStore<number>({ ttl: 1 });
			store.set("key1", 42);

			vi.advanceTimersByTime(500); // 0.5 seconds
			expect(store.get("key1")).toBe(42);
		});

		it("allows per-entry TTL override", () => {
			const store = new CacheStore<number>({ ttl: 10 }); // default 10 seconds
			store.set("short", 1, { ttl: 1 }); // 1 second
			store.set("long", 2); // uses default 10 seconds

			vi.advanceTimersByTime(1100);
			expect(store.get("short")).toBeUndefined();
			expect(store.get("long")).toBe(2);
		});

		it("has() respects TTL", () => {
			const store = new CacheStore<number>({ ttl: 1 });
			store.set("key1", 42);

			expect(store.has("key1")).toBe(true);

			vi.advanceTimersByTime(1100);
			expect(store.has("key1")).toBe(false);
		});

		it("entries without TTL never expire", () => {
			const store = new CacheStore<number>(); // no default TTL
			store.set("key1", 42);

			vi.advanceTimersByTime(100000); // 100 seconds
			expect(store.get("key1")).toBe(42);
		});
	});

	describe("LRU eviction", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("evicts least recently used entry when max_entries exceeded", () => {
			const store = new CacheStore<number>({ max_entries: 3 });

			store.set("a", 1);
			vi.advanceTimersByTime(10);
			store.set("b", 2);
			vi.advanceTimersByTime(10);
			store.set("c", 3);
			vi.advanceTimersByTime(10);

			// Access "a" to make it recently used
			store.get("a");

			vi.advanceTimersByTime(10);
			// Add new entry, should evict "b" (least recently accessed)
			store.set("d", 4);

			expect(store.get("a")).toBe(1); // recently accessed
			expect(store.get("b")).toBeUndefined(); // evicted
			expect(store.get("c")).toBe(3);
			expect(store.get("d")).toBe(4);
		});

		it("updates lastAccessedAt on get", () => {
			const store = new CacheStore<number>({ max_entries: 2 });

			store.set("a", 1);
			vi.advanceTimersByTime(10);
			store.set("b", 2);
			vi.advanceTimersByTime(10);

			// Access "a" to update its lastAccessedAt
			store.get("a");

			vi.advanceTimersByTime(10);
			store.set("c", 3); // should evict "b"

			expect(store.get("a")).toBe(1);
			expect(store.get("b")).toBeUndefined();
			expect(store.get("c")).toBe(3);
		});

		it("respects max_entries limit", () => {
			const store = new CacheStore<number>({ max_entries: 2 });

			store.set("a", 1);
			store.set("b", 2);
			store.set("c", 3);

			expect(store.size).toBe(2);
		});
	});

	describe("pruneExpired", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("removes all expired entries", () => {
			const store = new CacheStore<number>();
			store.set("a", 1, { ttl: 1 });
			store.set("b", 2, { ttl: 1 });
			store.set("c", 3, { ttl: 10 });

			vi.advanceTimersByTime(1100);

			const pruned = store.pruneExpired();
			expect(pruned).toBe(2);
			expect(store.size).toBe(1);
			expect(store.get("c")).toBe(3);
		});

		it("returns 0 when no entries are expired", () => {
			const store = new CacheStore<number>({ ttl: 10 });
			store.set("a", 1);
			store.set("b", 2);

			const pruned = store.pruneExpired();
			expect(pruned).toBe(0);
			expect(store.size).toBe(2);
		});
	});

	describe("generic type support", () => {
		it("works with object values", () => {
			const store = new CacheStore<{ id: number; name: string }>();
			store.set("user1", { id: 1, name: "Alice" });

			const result = store.get("user1");
			expect(result?.id).toBe(1);
			expect(result?.name).toBe("Alice");
		});

		it("works with array values", () => {
			const store = new CacheStore<number[]>();
			store.set("numbers", [1, 2, 3]);

			expect(store.get("numbers")).toEqual([1, 2, 3]);
		});

		it("works with function values", () => {
			const store = new CacheStore<() => number>();
			const fn = () => 42;
			store.set("fn", fn);

			expect(store.get("fn")).toBe(fn);
		});
	});
});
