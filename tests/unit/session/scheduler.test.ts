import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionManager } from "../../../src/session/manager";
import type { Scheduler } from "../../../src/session/scheduler";
import { defaultScheduler } from "../../../src/session/scheduler";

describe("Scheduler", () => {
	describe("defaultScheduler", () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("should call callback at specified interval", () => {
			const callback = vi.fn();
			const id = defaultScheduler.setInterval(callback, 1000);

			expect(callback).not.toHaveBeenCalled();
			vi.advanceTimersByTime(1000);
			expect(callback).toHaveBeenCalledTimes(1);
			vi.advanceTimersByTime(1000);
			expect(callback).toHaveBeenCalledTimes(2);

			defaultScheduler.clearInterval(id);
		});

		it("should stop calling after clearInterval", () => {
			const callback = vi.fn();
			const id = defaultScheduler.setInterval(callback, 1000);

			vi.advanceTimersByTime(1000);
			expect(callback).toHaveBeenCalledTimes(1);

			defaultScheduler.clearInterval(id);

			vi.advanceTimersByTime(5000);
			expect(callback).toHaveBeenCalledTimes(1);
		});
	});

	describe("SessionManager with custom Scheduler", () => {
		it("should use injected scheduler for cleanup interval", () => {
			const setIntervalMock = vi.fn().mockReturnValue("timer-1");
			const clearIntervalMock = vi.fn();
			const customScheduler: Scheduler = {
				setInterval: setIntervalMock,
				clearInterval: clearIntervalMock,
			};

			const manager = new SessionManager({}, {}, customScheduler);

			// コンストラクタでstartCleanupIntervalが呼ばれ、schedulerのsetIntervalが使われる
			expect(setIntervalMock).toHaveBeenCalledTimes(1);
			expect(setIntervalMock).toHaveBeenCalledWith(expect.any(Function), expect.any(Number));

			manager.stopCleanupInterval();
			expect(clearIntervalMock).toHaveBeenCalledTimes(1);
			expect(clearIntervalMock).toHaveBeenCalledWith("timer-1");
		});

		it("should use injected scheduler for ping interval", () => {
			const setIntervalMock = vi.fn().mockReturnValue("timer-id");
			const clearIntervalMock = vi.fn();
			const customScheduler: Scheduler = {
				setInterval: setIntervalMock,
				clearInterval: clearIntervalMock,
			};

			const manager = new SessionManager({}, {}, customScheduler);

			// cleanupで1回呼ばれている
			expect(setIntervalMock).toHaveBeenCalledTimes(1);

			manager.startPingInterval(30000, 10000);

			// cleanup + ping で2回
			expect(setIntervalMock).toHaveBeenCalledTimes(2);
			expect(setIntervalMock).toHaveBeenCalledWith(expect.any(Function), 30000);

			manager.stopPingInterval();
			manager.stopCleanupInterval();
		});

		it("should work with default scheduler when none is provided", () => {
			vi.useFakeTimers();

			const manager = new SessionManager({ ttl: 100, cleanupInterval: 500 });
			const session = manager.createSession();

			// セッションを期限切れにする
			const storedSession = manager.getSession(session.id);
			if (storedSession) {
				storedSession.lastAccessedAt = new Date(Date.now() - 200);
			}

			vi.advanceTimersByTime(500);

			// クリーンアップでセッションが削除されている
			expect(manager.getSession(session.id)).toBeUndefined();

			manager.stopCleanupInterval();
			vi.useRealTimers();
		});
	});
});
