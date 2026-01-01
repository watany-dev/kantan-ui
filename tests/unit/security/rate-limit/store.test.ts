import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RateLimitStore } from "../../../../src/security/rate-limit/store";

describe("RateLimitStore", () => {
	let store: RateLimitStore;

	beforeEach(() => {
		vi.useFakeTimers();
		store = new RateLimitStore(0); // クリーンアップなし
	});

	afterEach(() => {
		store.stop();
		vi.useRealTimers();
	});

	describe("check", () => {
		it("should allow first request and return remaining count", () => {
			const result = store.check("key1", 60000, 10);

			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(9);
			expect(result.resetAt).toBeGreaterThan(Date.now());
		});

		it("should count multiple requests", () => {
			store.check("key1", 60000, 10);
			store.check("key1", 60000, 10);
			const result = store.check("key1", 60000, 10);

			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(7);
		});

		it("should deny request when limit exceeded", () => {
			// 10回リクエスト
			for (let i = 0; i < 10; i++) {
				store.check("key1", 60000, 10);
			}

			// 11回目は拒否
			const result = store.check("key1", 60000, 10);
			expect(result.allowed).toBe(false);
			expect(result.remaining).toBe(0);
		});

		it("should reset counter after window expires", () => {
			// 最初のリクエスト
			store.check("key1", 1000, 5);
			store.check("key1", 1000, 5);

			// ウィンドウ期限切れ
			vi.advanceTimersByTime(1001);

			// 新しいウィンドウ
			const result = store.check("key1", 1000, 5);
			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(4);
		});

		it("should track different keys independently", () => {
			store.check("key1", 60000, 5);
			store.check("key1", 60000, 5);

			const result1 = store.check("key1", 60000, 5);
			const result2 = store.check("key2", 60000, 5);

			expect(result1.remaining).toBe(2);
			expect(result2.remaining).toBe(4);
		});

		it("should handle zero maxRequests", () => {
			const result = store.check("key1", 60000, 0);
			expect(result.allowed).toBe(false);
			expect(result.remaining).toBe(0);
		});

		it("should handle single request limit", () => {
			const result1 = store.check("key1", 60000, 1);
			expect(result1.allowed).toBe(true);
			expect(result1.remaining).toBe(0);

			const result2 = store.check("key1", 60000, 1);
			expect(result2.allowed).toBe(false);
		});
	});

	describe("get", () => {
		it("should return entry for existing key", () => {
			store.check("key1", 60000, 10);
			const entry = store.get("key1");

			expect(entry).toBeDefined();
			expect(entry?.count).toBe(1);
		});

		it("should return undefined for non-existing key", () => {
			const entry = store.get("nonexistent");
			expect(entry).toBeUndefined();
		});
	});

	describe("cleanup", () => {
		it("should remove expired entries", () => {
			store.check("key1", 1000, 10);
			store.check("key2", 5000, 10);

			// 2秒後、key1は期限切れ
			vi.advanceTimersByTime(2000);

			const cleaned = store.cleanup();

			expect(cleaned).toBe(1);
			expect(store.get("key1")).toBeUndefined();
			expect(store.get("key2")).toBeDefined();
		});

		it("should return 0 when no expired entries", () => {
			store.check("key1", 60000, 10);

			const cleaned = store.cleanup();
			expect(cleaned).toBe(0);
		});

		it("should handle empty store", () => {
			const cleaned = store.cleanup();
			expect(cleaned).toBe(0);
		});
	});

	describe("size", () => {
		it("should return correct size", () => {
			expect(store.size()).toBe(0);

			store.check("key1", 60000, 10);
			expect(store.size()).toBe(1);

			store.check("key2", 60000, 10);
			expect(store.size()).toBe(2);
		});
	});

	describe("clear", () => {
		it("should clear all entries", () => {
			store.check("key1", 60000, 10);
			store.check("key2", 60000, 10);

			store.clear();

			expect(store.size()).toBe(0);
			expect(store.get("key1")).toBeUndefined();
		});
	});

	describe("auto cleanup", () => {
		it("should run cleanup periodically when enabled", () => {
			const autoStore = new RateLimitStore(1000);

			autoStore.check("key1", 500, 10);

			// 1秒後にクリーンアップ実行
			vi.advanceTimersByTime(1000);

			expect(autoStore.get("key1")).toBeUndefined();
			autoStore.stop();
		});

		it("should not auto cleanup when interval is 0", () => {
			const manualStore = new RateLimitStore(0);

			manualStore.check("key1", 100, 10);
			vi.advanceTimersByTime(1000);

			// 手動クリーンアップが必要
			expect(manualStore.get("key1")).toBeDefined();
			manualStore.cleanup();
			expect(manualStore.get("key1")).toBeUndefined();

			manualStore.stop();
		});
	});

	describe("stop", () => {
		it("should stop cleanup interval", () => {
			const autoStore = new RateLimitStore(1000);
			autoStore.check("key1", 60000, 10);

			autoStore.stop();

			// インターバル停止後はクリーンアップされない
			vi.advanceTimersByTime(2000);

			// stopを再度呼び出しても問題ない
			autoStore.stop();
		});
	});
});
