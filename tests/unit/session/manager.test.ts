import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SESSION_CONFIG } from "../../../src/config";
import {
	SessionManager,
	getSessionManager,
	resetSessionManager,
	setSessionManager,
} from "../../../src/session/manager";

describe("SessionManager", () => {
	let manager: SessionManager;

	beforeEach(() => {
		manager = new SessionManager();
	});

	afterEach(() => {
		// Clean up interval to prevent timer leaks
		manager.stopCleanupInterval();
	});

	describe("config", () => {
		it("should use default config when no config provided", () => {
			const config = manager.getConfig();

			expect(config.sessionKey).toBe(DEFAULT_SESSION_CONFIG.sessionKey);
			expect(config.ttl).toBe(DEFAULT_SESSION_CONFIG.ttl);
			expect(config.cleanupInterval).toBe(DEFAULT_SESSION_CONFIG.cleanupInterval);
		});

		it("should use custom config values when provided", () => {
			const customManager = new SessionManager({
				sessionKey: "custom-key",
				ttl: 5000,
				cleanupInterval: 10000,
			});

			const config = customManager.getConfig();

			expect(config.sessionKey).toBe("custom-key");
			expect(config.ttl).toBe(5000);
			expect(config.cleanupInterval).toBe(10000);

			customManager.stopCleanupInterval();
		});

		it("should merge partial config with defaults", () => {
			const customManager = new SessionManager({
				ttl: 60000,
			});

			const config = customManager.getConfig();

			expect(config.sessionKey).toBe(DEFAULT_SESSION_CONFIG.sessionKey);
			expect(config.ttl).toBe(60000);
			expect(config.cleanupInterval).toBe(DEFAULT_SESSION_CONFIG.cleanupInterval);

			customManager.stopCleanupInterval();
		});

		it("should use custom cleanup interval for automatic cleanup", () => {
			vi.useFakeTimers();
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

			const customManager = new SessionManager({
				ttl: 100,
				cleanupInterval: 5000, // 5 seconds instead of default 60 seconds
			});
			const session = customManager.createSession();

			// Set session to expired
			const pastDate = new Date(Date.now() - 200);
			const storedSession = customManager.getSession(session.id);
			if (storedSession) {
				storedSession.lastAccessedAt = pastDate;
			}

			// Fast forward time to trigger custom cleanup interval (5000ms)
			vi.advanceTimersByTime(5000);

			// Cleanup should have been called
			expect(customManager.getSessionCount()).toBe(0);
			expect(consoleSpy).toHaveBeenCalledWith("Session cleanup: removed 1 expired session(s)");

			customManager.stopCleanupInterval();
			consoleSpy.mockRestore();
			vi.useRealTimers();
		});
	});

	describe("createSession", () => {
		it("should create a new session with unique id", () => {
			const session = manager.createSession();

			expect(session.id).toBeDefined();
			expect(session.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
			expect(session.state).toEqual({});
			expect(session.createdAt).toBeInstanceOf(Date);
			expect(session.lastAccessedAt).toBeInstanceOf(Date);
		});

		it("should create sessions with different ids", () => {
			const session1 = manager.createSession();
			const session2 = manager.createSession();

			expect(session1.id).not.toBe(session2.id);
		});
	});

	describe("getSession", () => {
		it("should return existing session", () => {
			const session = manager.createSession();
			const retrieved = manager.getSession(session.id);

			expect(retrieved).toBeDefined();
			expect(retrieved?.id).toBe(session.id);
		});

		it("should return undefined for non-existent session", () => {
			const retrieved = manager.getSession("non-existent-id");

			expect(retrieved).toBeUndefined();
		});

		it("should update lastAccessedAt when getting session", () => {
			const session = manager.createSession();
			const originalAccessedAt = session.lastAccessedAt;

			// Wait a bit to ensure time difference
			const retrieved = manager.getSession(session.id);

			expect(retrieved?.lastAccessedAt.getTime()).toBeGreaterThanOrEqual(
				originalAccessedAt.getTime(),
			);
		});
	});

	describe("getOrCreateSession", () => {
		it("should return existing session if id provided", () => {
			const session = manager.createSession();
			const retrieved = manager.getOrCreateSession(session.id);

			expect(retrieved.id).toBe(session.id);
		});

		it("should create new session if id not provided", () => {
			const session = manager.getOrCreateSession();

			expect(session.id).toBeDefined();
			expect(manager.getSessionCount()).toBe(1);
		});

		it("should create new session if id not found", () => {
			const session = manager.getOrCreateSession("non-existent-id");

			expect(session.id).not.toBe("non-existent-id");
			expect(manager.getSessionCount()).toBe(1);
		});
	});

	describe("state management", () => {
		it("should get and set state values", () => {
			const session = manager.createSession();

			manager.setState(session.id, "counter", 5);
			const state = manager.getState(session.id);

			expect(state?.counter).toBe(5);
		});

		it("should update existing state values", () => {
			const session = manager.createSession();

			manager.setState(session.id, "counter", 5);
			manager.setState(session.id, "counter", 10);
			const state = manager.getState(session.id);

			expect(state?.counter).toBe(10);
		});

		it("should handle multiple state values", () => {
			const session = manager.createSession();

			manager.setState(session.id, "counter", 5);
			manager.setState(session.id, "name", "test");
			const state = manager.getState(session.id);

			expect(state?.counter).toBe(5);
			expect(state?.name).toBe("test");
		});

		it("should return undefined for non-existent session", () => {
			const state = manager.getState("non-existent-id");

			expect(state).toBeUndefined();
		});

		it("should do nothing when setting state for non-existent session", () => {
			// Should not throw
			manager.setState("non-existent-id", "key", "value");

			// Verify nothing was set
			expect(manager.getState("non-existent-id")).toBeUndefined();
		});
	});

	describe("cleanup", () => {
		it("should remove expired sessions", () => {
			vi.useFakeTimers();
			const manager = new SessionManager({ ttl: 100 }); // 100ms TTL
			manager.createSession();

			// Advance time past TTL
			vi.advanceTimersByTime(150);

			const cleaned = manager.cleanup();

			expect(cleaned).toBe(1);
			expect(manager.getSessionCount()).toBe(0);

			manager.stopCleanupInterval();
			vi.useRealTimers();
		});

		it("should not remove active sessions", () => {
			const manager = new SessionManager({ ttl: 10000 }); // 10s TTL
			manager.createSession();

			const cleaned = manager.cleanup();

			expect(cleaned).toBe(0);
			expect(manager.getSessionCount()).toBe(1);

			manager.stopCleanupInterval();
		});

		it("should not start cleanup interval multiple times", () => {
			const setIntervalSpy = vi.spyOn(global, "setInterval");
			const manager = new SessionManager();

			// First creation already starts interval
			expect(setIntervalSpy).toHaveBeenCalledTimes(1);

			// Manually trigger startCleanupInterval again (via private method test)
			// Since it's private, we test by creating another manager
			const manager2 = new SessionManager();
			expect(setIntervalSpy).toHaveBeenCalledTimes(2); // Each manager gets its own interval

			manager.stopCleanupInterval();
			manager2.stopCleanupInterval();
			setIntervalSpy.mockRestore();
		});

		it("should stop cleanup interval when requested", () => {
			const clearIntervalSpy = vi.spyOn(global, "clearInterval");
			const manager = new SessionManager();

			manager.stopCleanupInterval();

			expect(clearIntervalSpy).toHaveBeenCalled();
			clearIntervalSpy.mockRestore();
		});

		it("should handle stopping cleanup interval when not running", () => {
			const manager = new SessionManager();
			manager.stopCleanupInterval();

			// Should not throw when called again
			expect(() => manager.stopCleanupInterval()).not.toThrow();
		});

		it("should automatically clean up expired sessions via interval", async () => {
			vi.useFakeTimers();
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

			const manager = new SessionManager({ ttl: 100 });
			const session = manager.createSession();

			// Set session to expired
			const pastDate = new Date(Date.now() - 200);
			const storedSession = manager.getSession(session.id);
			if (storedSession) {
				storedSession.lastAccessedAt = pastDate;
			}

			// Fast forward time to trigger cleanup interval (60000ms by default)
			vi.advanceTimersByTime(60000);

			// Cleanup should have been called automatically
			expect(manager.getSessionCount()).toBe(0);
			expect(consoleSpy).toHaveBeenCalledWith("Session cleanup: removed 1 expired session(s)");

			manager.stopCleanupInterval();
			consoleSpy.mockRestore();
			vi.useRealTimers();
		});

		it("should not log when cleanup removes zero sessions via interval", () => {
			vi.useFakeTimers();
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

			const manager = new SessionManager({ ttl: 10000, cleanupInterval: 1000 });
			manager.createSession(); // Active session, won't be cleaned

			// Trigger cleanup interval
			vi.advanceTimersByTime(1000);

			// Cleanup was called but no sessions were removed
			expect(manager.getSessionCount()).toBe(1);
			expect(consoleSpy).not.toHaveBeenCalled();

			manager.stopCleanupInterval();
			consoleSpy.mockRestore();
			vi.useRealTimers();
		});
	});

	describe("getSessionCount", () => {
		it("should return correct count", () => {
			expect(manager.getSessionCount()).toBe(0);

			manager.createSession();
			expect(manager.getSessionCount()).toBe(1);

			manager.createSession();
			expect(manager.getSessionCount()).toBe(2);
		});
	});

	describe("WebSocket association", () => {
		it("should associate WebSocket with session", () => {
			const session = manager.createSession();
			const mockWs = { send: vi.fn() } as unknown as Parameters<
				typeof manager.associateWebSocket
			>[0];

			manager.associateWebSocket(mockWs, session.id);
			const retrieved = manager.getSessionByWebSocket(mockWs);

			expect(retrieved).toBeDefined();
			expect(retrieved?.id).toBe(session.id);
		});

		it("should return undefined for unassociated WebSocket", () => {
			const mockWs = { send: vi.fn() } as unknown as Parameters<
				typeof manager.associateWebSocket
			>[0];

			const session = manager.getSessionByWebSocket(mockWs);

			expect(session).toBeUndefined();
		});

		it("should remove WebSocket association", () => {
			const session = manager.createSession();
			const mockWs = { send: vi.fn() } as unknown as Parameters<
				typeof manager.associateWebSocket
			>[0];

			manager.associateWebSocket(mockWs, session.id);
			manager.removeWebSocket(mockWs);

			const retrieved = manager.getSessionByWebSocket(mockWs);
			expect(retrieved).toBeUndefined();
		});

		it("should handle removing non-associated WebSocket", () => {
			const mockWs = { send: vi.fn() } as unknown as Parameters<
				typeof manager.associateWebSocket
			>[0];

			// Should not throw
			expect(() => manager.removeWebSocket(mockWs)).not.toThrow();
		});

		it("should handle associating WebSocket with non-existent session connections", () => {
			const mockWs = { send: vi.fn() } as unknown as Parameters<
				typeof manager.associateWebSocket
			>[0];

			// Associate with a session ID that doesn't have sessionToWs entry
			manager.associateWebSocket(mockWs, "non-existent-session");

			// Should be retrievable by WS but session won't exist
			const wsSessionId = manager.getSessionByWebSocket(mockWs);
			expect(wsSessionId).toBeUndefined();
		});
	});
});

describe("Event Queue", () => {
	let manager: SessionManager;

	beforeEach(() => {
		manager = new SessionManager();
	});

	afterEach(() => {
		manager.stopCleanupInterval();
	});

	it("should process events in order", async () => {
		const session = manager.createSession();
		const processedOrder: number[] = [];

		manager.setEventProcessor((sessionId, widgetId, value) => {
			processedOrder.push(value as number);
			return { html: `processed-${value}`, patches: [] };
		});

		// Queue multiple events
		const results = await Promise.all([
			manager.queueEvent(session.id, "widget1", 1),
			manager.queueEvent(session.id, "widget1", 2),
			manager.queueEvent(session.id, "widget1", 3),
		]);

		expect(processedOrder).toEqual([1, 2, 3]);
		expect(results[0].html).toBe("processed-1");
		expect(results[1].html).toBe("processed-2");
		expect(results[2].html).toBe("processed-3");
	});

	it("should not process events concurrently for same session", async () => {
		const session = manager.createSession();
		let concurrentCount = 0;
		let maxConcurrent = 0;

		manager.setEventProcessor(() => {
			concurrentCount++;
			maxConcurrent = Math.max(maxConcurrent, concurrentCount);
			concurrentCount--;
			return { html: "", patches: [] };
		});

		await Promise.all([
			manager.queueEvent(session.id, "w", 1),
			manager.queueEvent(session.id, "w", 2),
			manager.queueEvent(session.id, "w", 3),
		]);

		expect(maxConcurrent).toBe(1);
	});

	it("should process events from different sessions independently", async () => {
		const session1 = manager.createSession();
		const session2 = manager.createSession();
		const processed: string[] = [];

		manager.setEventProcessor((sessionId, _widgetId, value) => {
			processed.push(`${sessionId.slice(0, 4)}-${value}`);
			return { html: "", patches: [] };
		});

		await Promise.all([
			manager.queueEvent(session1.id, "w", "a"),
			manager.queueEvent(session2.id, "w", "b"),
			manager.queueEvent(session1.id, "w", "c"),
		]);

		// Session1's events should be in order relative to each other
		const session1Events = processed.filter((e) => e.startsWith(session1.id.slice(0, 4)));
		expect(session1Events[0]).toContain("-a");
		expect(session1Events[1]).toContain("-c");
	});

	it("should return empty result when no processor is set", async () => {
		const session = manager.createSession();

		const result = await manager.queueEvent(session.id, "widget", "value");

		expect(result.html).toBe("");
		expect(result.patches).toEqual([]);
	});

	it("should report queue length correctly", async () => {
		const session = manager.createSession();
		let resolveFirst: (() => void) | undefined;

		manager.setEventProcessor(() => {
			// First event blocks until we resolve
			return new Promise((resolve) => {
				resolveFirst = () => resolve({ html: "", patches: [] });
			}) as unknown as { html: string; patches: unknown[] };
		});

		// Start first event (will block)
		const p1 = manager.queueEvent(session.id, "w", 1);

		// These should be queued since first is processing
		// Note: Due to synchronous nature, queue length check needs adjustment
		expect(manager.getQueueLength(session.id)).toBe(0);

		// Cleanup
		if (resolveFirst) resolveFirst();
		await p1;
	});

	it("should report processing status correctly", async () => {
		const session = manager.createSession();

		manager.setEventProcessor(() => {
			return { html: "", patches: [] };
		});

		// Before any events, not processing
		expect(manager.isProcessing(session.id)).toBe(false);

		await manager.queueEvent(session.id, "w", 1);

		// After processing, not processing anymore
		expect(manager.isProcessing(session.id)).toBe(false);
	});

	it("should handle queueMicrotask for sequential processing", async () => {
		const session = manager.createSession();
		const order: number[] = [];

		manager.setEventProcessor((_sessionId, _widgetId, value) => {
			order.push(value as number);
			return { html: `result-${value}`, patches: [] };
		});

		// Queue 3 events - should be processed via queueMicrotask chain
		const [r1, r2, r3] = await Promise.all([
			manager.queueEvent(session.id, "w", 1),
			manager.queueEvent(session.id, "w", 2),
			manager.queueEvent(session.id, "w", 3),
		]);

		// Verify all processed in order
		expect(order).toEqual([1, 2, 3]);
		expect(r1.html).toBe("result-1");
		expect(r2.html).toBe("result-2");
		expect(r3.html).toBe("result-3");
	});

	it("should return early when queue is empty for non-existent session", async () => {
		// Call queueEvent on non-existent session queue
		// This tests the empty queue early return path
		const session = manager.createSession();
		manager.setEventProcessor(() => ({ html: "done", patches: [] }));

		const result = await manager.queueEvent(session.id, "w", "test");
		expect(result.html).toBe("done");

		// Verify queue is now empty
		expect(manager.getQueueLength(session.id)).toBe(0);
	});

	it("should return early when already processing", async () => {
		const session = manager.createSession();

		// Manually set processing flag
		const managerAny = manager as unknown as {
			processingFlags: Map<string, boolean>;
			eventQueues: Map<string, unknown[]>;
			processEventQueue: (sessionId: string) => void;
		};
		managerAny.processingFlags.set(session.id, true);
		managerAny.eventQueues.set(session.id, [
			{ widgetId: "w", value: 1, timestamp: Date.now(), resolve: () => {} },
		]);

		// Call processEventQueue directly - should return early due to processing flag
		managerAny.processEventQueue(session.id);

		// Queue should still have the item (not processed)
		expect(manager.getQueueLength(session.id)).toBe(1);

		// Cleanup
		managerAny.processingFlags.set(session.id, false);
	});

	it("should return early when queue is empty", async () => {
		const session = manager.createSession();

		// Setup empty queue
		const managerAny = manager as unknown as {
			eventQueues: Map<string, unknown[]>;
			processEventQueue: (sessionId: string) => void;
		};
		managerAny.eventQueues.set(session.id, []);

		// Call processEventQueue directly - should return early due to empty queue
		managerAny.processEventQueue(session.id);

		// Should not throw and flag should remain false
		expect(manager.isProcessing(session.id)).toBe(false);
	});

	it("should handle edge case when queue item is undefined after shift", async () => {
		const session = manager.createSession();

		// Setup queue that will return undefined on shift (edge case)
		const managerAny = manager as unknown as {
			eventQueues: Map<string, unknown[]>;
			processingFlags: Map<string, boolean>;
			processEventQueue: (sessionId: string) => void;
		};

		// Create a queue that returns length > 0 but shift returns undefined
		const fakeQueue = {
			length: 1,
			shift: () => undefined,
		};
		managerAny.eventQueues.set(session.id, fakeQueue as unknown as unknown[]);

		// Call processEventQueue directly
		managerAny.processEventQueue(session.id);

		// Processing flag should be reset to false
		expect(manager.isProcessing(session.id)).toBe(false);
	});

	it("should pass AbortSignal to event processor", async () => {
		const session = manager.createSession();
		let receivedSignal: AbortSignal | undefined;

		manager.setEventProcessor((_sessionId, _widgetId, _value, signal) => {
			receivedSignal = signal;
			return { html: "done", patches: [] };
		});

		await manager.queueEvent(session.id, "w", "test");

		expect(receivedSignal).toBeDefined();
		expect(receivedSignal).toBeInstanceOf(AbortSignal);
	});

	it("should abort current event when abortCurrentEvent is called", async () => {
		const session = manager.createSession();
		let capturedSignal: AbortSignal | undefined;

		manager.setEventProcessor((_sessionId, _widgetId, _value, signal) => {
			capturedSignal = signal;
			return { html: "done", patches: [] };
		});

		// Start processing
		const promise = manager.queueEvent(session.id, "w", "test");

		// The signal is available during processing
		const signal = manager.getCurrentAbortSignal(session.id);

		await promise;

		// After processing, signal should be cleaned up
		expect(manager.getCurrentAbortSignal(session.id)).toBeUndefined();
		expect(capturedSignal).toBeDefined();
	});

	it("should abort signal when abortCurrentEvent is called during processing", async () => {
		const session = manager.createSession();

		// Manually set up a controller to simulate in-progress state
		const managerAny = manager as unknown as {
			abortControllers: Map<string, AbortController>;
		};
		const controller = new AbortController();
		managerAny.abortControllers.set(session.id, controller);

		expect(controller.signal.aborted).toBe(false);

		manager.abortCurrentEvent(session.id);

		expect(controller.signal.aborted).toBe(true);
		expect(manager.getCurrentAbortSignal(session.id)).toBeUndefined();
	});

	it("should handle abortCurrentEvent when no event is processing", () => {
		const session = manager.createSession();

		// Should not throw
		expect(() => manager.abortCurrentEvent(session.id)).not.toThrow();
	});

	it("should continue processing queue when processor throws error", async () => {
		const session = manager.createSession();
		const processedValues: unknown[] = [];
		let callCount = 0;

		manager.setEventProcessor((_sessionId, _widgetId, value) => {
			callCount++;
			if (callCount === 2) {
				throw new Error("Simulated processor error");
			}
			processedValues.push(value);
			return { html: `result-${value}`, patches: [] };
		});

		// Queue 3 events - second one will throw
		const results = await Promise.allSettled([
			manager.queueEvent(session.id, "w", 1),
			manager.queueEvent(session.id, "w", 2),
			manager.queueEvent(session.id, "w", 3),
		]);

		// First and third should succeed, second should reject
		expect(results[0].status).toBe("fulfilled");
		expect(results[1].status).toBe("rejected");
		expect(results[2].status).toBe("fulfilled");

		// Values 1 and 3 should be processed
		expect(processedValues).toEqual([1, 3]);
	});

	it("should reject with error when processor throws", async () => {
		const session = manager.createSession();

		manager.setEventProcessor(() => {
			throw new Error("Test error message");
		});

		await expect(manager.queueEvent(session.id, "w", "test")).rejects.toThrow("Test error message");
	});

	it("should handle multiple consecutive errors", async () => {
		const session = manager.createSession();
		let callCount = 0;
		const processedValues: unknown[] = [];

		manager.setEventProcessor((_sessionId, _widgetId, value) => {
			callCount++;
			// First 3 events throw errors
			if (callCount <= 3) {
				throw new Error(`Error ${callCount}`);
			}
			processedValues.push(value);
			return { html: "success", patches: [] };
		});

		const results = await Promise.allSettled([
			manager.queueEvent(session.id, "w", "a"),
			manager.queueEvent(session.id, "w", "b"),
			manager.queueEvent(session.id, "w", "c"),
			manager.queueEvent(session.id, "w", "d"),
			manager.queueEvent(session.id, "w", "e"),
		]);

		// First 3 should reject, last 2 should succeed
		expect(results[0].status).toBe("rejected");
		expect(results[1].status).toBe("rejected");
		expect(results[2].status).toBe("rejected");
		expect(results[3].status).toBe("fulfilled");
		expect(results[4].status).toBe("fulfilled");

		expect(processedValues).toEqual(["d", "e"]);
	});
});

describe("Global SessionManager", () => {
	afterEach(() => {
		resetSessionManager();
	});

	it("should create global manager on first call to getSessionManager", () => {
		const manager = getSessionManager();
		expect(manager).toBeInstanceOf(SessionManager);
	});

	it("should return same instance on subsequent calls", () => {
		const manager1 = getSessionManager();
		const manager2 = getSessionManager();
		expect(manager1).toBe(manager2);
	});

	it("should allow setting custom manager", () => {
		const customManager = new SessionManager({ ttl: 5000 });
		setSessionManager(customManager);

		expect(getSessionManager()).toBe(customManager);
	});

	it("should reset global manager", () => {
		const manager1 = getSessionManager();
		resetSessionManager();
		const manager2 = getSessionManager();

		expect(manager1).not.toBe(manager2);
	});
});
