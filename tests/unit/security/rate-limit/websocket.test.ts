import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { WebSocketRateLimiter } from "../../../../src/security/rate-limit/websocket";

describe("WebSocketRateLimiter", () => {
	let limiter: WebSocketRateLimiter;

	beforeEach(() => {
		vi.useFakeTimers();
		limiter = new WebSocketRateLimiter({
			windowMs: 1000,
			maxMessages: 5,
			maxConnectionsPerIp: 3,
		});
	});

	afterEach(() => {
		limiter.stop();
		vi.useRealTimers();
	});

	describe("onConnect", () => {
		it("should allow first connection", () => {
			const result = limiter.onConnect("conn1", "192.168.1.1");
			expect(result).toBe(true);
		});

		it("should allow multiple connections up to limit", () => {
			expect(limiter.onConnect("conn1", "192.168.1.1")).toBe(true);
			expect(limiter.onConnect("conn2", "192.168.1.1")).toBe(true);
			expect(limiter.onConnect("conn3", "192.168.1.1")).toBe(true);
		});

		it("should reject connections exceeding limit", () => {
			limiter.onConnect("conn1", "192.168.1.1");
			limiter.onConnect("conn2", "192.168.1.1");
			limiter.onConnect("conn3", "192.168.1.1");

			const result = limiter.onConnect("conn4", "192.168.1.1");
			expect(result).toBe(false);
		});

		it("should track different IPs independently", () => {
			// IP1: 3接続
			limiter.onConnect("conn1", "192.168.1.1");
			limiter.onConnect("conn2", "192.168.1.1");
			limiter.onConnect("conn3", "192.168.1.1");

			// IP1: 4回目は拒否
			expect(limiter.onConnect("conn4", "192.168.1.1")).toBe(false);

			// IP2: まだ許可
			expect(limiter.onConnect("conn5", "192.168.1.2")).toBe(true);
		});
	});

	describe("onDisconnect", () => {
		it("should decrement connection count", () => {
			limiter.onConnect("conn1", "192.168.1.1");
			limiter.onConnect("conn2", "192.168.1.1");

			expect(limiter.getConnectionCount("192.168.1.1")).toBe(2);

			limiter.onDisconnect("conn1");

			expect(limiter.getConnectionCount("192.168.1.1")).toBe(1);
		});

		it("should remove IP when last connection disconnects", () => {
			limiter.onConnect("conn1", "192.168.1.1");

			limiter.onDisconnect("conn1");

			expect(limiter.getConnectionCount("192.168.1.1")).toBe(0);
		});

		it("should allow new connection after disconnect frees up slot", () => {
			// 3接続（上限）
			limiter.onConnect("conn1", "192.168.1.1");
			limiter.onConnect("conn2", "192.168.1.1");
			limiter.onConnect("conn3", "192.168.1.1");

			// 4回目は拒否
			expect(limiter.onConnect("conn4", "192.168.1.1")).toBe(false);

			// 1接続切断
			limiter.onDisconnect("conn1");

			// 再度接続可能
			expect(limiter.onConnect("conn4", "192.168.1.1")).toBe(true);
		});

		it("should handle disconnecting unknown connection", () => {
			// エラーにならないことを確認
			limiter.onDisconnect("unknown");
			expect(limiter.getConnectionCount("192.168.1.1")).toBe(0);
		});
	});

	describe("onMessage", () => {
		beforeEach(() => {
			limiter.onConnect("conn1", "192.168.1.1");
		});

		it("should allow messages within limit", () => {
			for (let i = 0; i < 5; i++) {
				const result = limiter.onMessage("conn1");
				expect(result.allowed).toBe(true);
			}
		});

		it("should return remaining count", () => {
			const result1 = limiter.onMessage("conn1");
			expect(result1.remaining).toBe(4);

			const result2 = limiter.onMessage("conn1");
			expect(result2.remaining).toBe(3);
		});

		it("should reject messages exceeding limit", () => {
			// 5回メッセージ
			for (let i = 0; i < 5; i++) {
				limiter.onMessage("conn1");
			}

			// 6回目は拒否
			const result = limiter.onMessage("conn1");
			expect(result.allowed).toBe(false);
			expect(result.remaining).toBe(0);
		});

		it("should reset counter after window expires", () => {
			// 5回メッセージ（上限）
			for (let i = 0; i < 5; i++) {
				limiter.onMessage("conn1");
			}

			// ウィンドウ期限切れ
			vi.advanceTimersByTime(1001);

			// 新しいウィンドウで許可
			const result = limiter.onMessage("conn1");
			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(4);
		});

		it("should track different connections with same IP together", () => {
			limiter.onConnect("conn2", "192.168.1.1");

			// conn1から3メッセージ
			for (let i = 0; i < 3; i++) {
				limiter.onMessage("conn1");
			}

			// conn2から2メッセージ（合計5、上限）
			limiter.onMessage("conn2");
			limiter.onMessage("conn2");

			// どちらからも追加は拒否
			expect(limiter.onMessage("conn1").allowed).toBe(false);
			expect(limiter.onMessage("conn2").allowed).toBe(false);
		});

		it("should track different IPs independently", () => {
			limiter.onConnect("conn2", "192.168.1.2");

			// IP1から5メッセージ
			for (let i = 0; i < 5; i++) {
				limiter.onMessage("conn1");
			}

			// IP1は上限
			expect(limiter.onMessage("conn1").allowed).toBe(false);

			// IP2はまだ許可
			expect(limiter.onMessage("conn2").allowed).toBe(true);
		});

		it("should handle unknown connection", () => {
			const result = limiter.onMessage("unknown");
			// unknownのIPとして処理される
			expect(result.allowed).toBe(true);
		});
	});

	describe("getConnectionCount", () => {
		it("should return 0 for unknown IP", () => {
			expect(limiter.getConnectionCount("unknown")).toBe(0);
		});

		it("should return correct count", () => {
			limiter.onConnect("conn1", "192.168.1.1");
			limiter.onConnect("conn2", "192.168.1.1");

			expect(limiter.getConnectionCount("192.168.1.1")).toBe(2);
		});
	});

	describe("getOptions", () => {
		it("should return current options", () => {
			const options = limiter.getOptions();

			expect(options.windowMs).toBe(1000);
			expect(options.maxMessages).toBe(5);
			expect(options.maxConnectionsPerIp).toBe(3);
		});

		it("should return copy of options", () => {
			const options = limiter.getOptions();
			options.maxMessages = 999;

			expect(limiter.getOptions().maxMessages).toBe(5);
		});
	});

	describe("default options", () => {
		it("should use default values when not specified", () => {
			const defaultLimiter = new WebSocketRateLimiter();
			const options = defaultLimiter.getOptions();

			expect(options.windowMs).toBe(1000);
			expect(options.maxMessages).toBe(30);
			expect(options.maxConnectionsPerIp).toBe(10);

			defaultLimiter.stop();
		});
	});

	describe("stop", () => {
		it("should clean up all resources", () => {
			limiter.onConnect("conn1", "192.168.1.1");
			limiter.onConnect("conn2", "192.168.1.2");

			limiter.stop();

			expect(limiter.getConnectionCount("192.168.1.1")).toBe(0);
			expect(limiter.getConnectionCount("192.168.1.2")).toBe(0);
		});
	});
});
