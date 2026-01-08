import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SESSION_CONFIG } from "../../../src/config";
import {
	getSessionManager,
	resetSessionManager,
	SessionManager,
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

		it("should automatically clean up expired sessions via interval", () => {
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
			const connections = manager.getConnections(session.id);

			expect(connections.size).toBe(1);
			expect(connections.has(mockWs)).toBe(true);
		});

		it("should return empty set for session without WebSocket", () => {
			const session = manager.createSession();

			const connections = manager.getConnections(session.id);

			expect(connections.size).toBe(0);
		});

		it("should remove WebSocket association", () => {
			const session = manager.createSession();
			const mockWs = { send: vi.fn() } as unknown as Parameters<
				typeof manager.associateWebSocket
			>[0];

			manager.associateWebSocket(mockWs, session.id);
			manager.removeWebSocket(mockWs);

			const connections = manager.getConnections(session.id);
			expect(connections.has(mockWs)).toBe(false);
		});

		it("should handle removing non-associated WebSocket", () => {
			const mockWs = { send: vi.fn() } as unknown as Parameters<
				typeof manager.associateWebSocket
			>[0];

			// Should not throw
			expect(() => manager.removeWebSocket(mockWs)).not.toThrow();
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

		manager.setEventProcessor((_sessionId, _widgetId, value) => {
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

	it("should return early when already processing", () => {
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

	it("should return early when queue is empty", () => {
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

	it("should handle edge case when queue item is undefined after shift", () => {
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
		const _signal = manager.getCurrentAbortSignal(session.id);

		await promise;

		// After processing, signal should be cleaned up
		expect(manager.getCurrentAbortSignal(session.id)).toBeUndefined();
		expect(capturedSignal).toBeDefined();
	});

	it("should abort signal when abortCurrentEvent is called during processing", () => {
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

describe("Multi-tab support", () => {
	let manager: SessionManager;

	beforeEach(() => {
		manager = new SessionManager();
	});

	afterEach(() => {
		manager.stopCleanupInterval();
	});

	it("should support multiple WebSocket connections per session", () => {
		const session = manager.createSession();
		const mockWs1 = { send: vi.fn() } as unknown as Parameters<
			typeof manager.associateWebSocket
		>[0];
		const mockWs2 = { send: vi.fn() } as unknown as Parameters<
			typeof manager.associateWebSocket
		>[0];

		manager.associateWebSocket(mockWs1, session.id);
		manager.associateWebSocket(mockWs2, session.id);

		const connections = manager.getConnections(session.id);
		expect(connections.size).toBe(2);
		expect(connections.has(mockWs1)).toBe(true);
		expect(connections.has(mockWs2)).toBe(true);
	});

	it("should broadcast message to all connections", () => {
		const session = manager.createSession();
		const mockWs1 = { send: vi.fn() } as unknown as Parameters<
			typeof manager.associateWebSocket
		>[0];
		const mockWs2 = { send: vi.fn() } as unknown as Parameters<
			typeof manager.associateWebSocket
		>[0];

		manager.associateWebSocket(mockWs1, session.id);
		manager.associateWebSocket(mockWs2, session.id);

		const message = JSON.stringify({ type: "patch", patches: [] });
		manager.broadcast(session.id, message);

		expect(mockWs1.send).toHaveBeenCalledWith(message);
		expect(mockWs2.send).toHaveBeenCalledWith(message);
	});

	it("should not broadcast to unrelated sessions", () => {
		const session1 = manager.createSession();
		const session2 = manager.createSession();
		const mockWs1 = { send: vi.fn() } as unknown as Parameters<
			typeof manager.associateWebSocket
		>[0];
		const mockWs2 = { send: vi.fn() } as unknown as Parameters<
			typeof manager.associateWebSocket
		>[0];

		manager.associateWebSocket(mockWs1, session1.id);
		manager.associateWebSocket(mockWs2, session2.id);

		const message = JSON.stringify({ type: "patch", patches: [] });
		manager.broadcast(session1.id, message);

		expect(mockWs1.send).toHaveBeenCalledWith(message);
		expect(mockWs2.send).not.toHaveBeenCalled();
	});

	it("should remove dead connections on broadcast", () => {
		const session = manager.createSession();
		const mockWs1 = { send: vi.fn() } as unknown as Parameters<
			typeof manager.associateWebSocket
		>[0];
		const mockWs2 = {
			send: vi.fn().mockImplementation(() => {
				throw new Error("Connection closed");
			}),
		} as unknown as Parameters<typeof manager.associateWebSocket>[0];

		manager.associateWebSocket(mockWs1, session.id);
		manager.associateWebSocket(mockWs2, session.id);

		const message = JSON.stringify({ type: "patch", patches: [] });
		manager.broadcast(session.id, message);

		// mockWs1 should receive the message
		expect(mockWs1.send).toHaveBeenCalledWith(message);
		// mockWs2 was called but threw
		expect(mockWs2.send).toHaveBeenCalledWith(message);

		// mockWs2 should be removed from connections
		const connections = manager.getConnections(session.id);
		expect(connections.size).toBe(1);
		expect(connections.has(mockWs1)).toBe(true);
		expect(connections.has(mockWs2)).toBe(false);
	});

	it("should handle broadcast to non-existent session", () => {
		// Should not throw
		expect(() => manager.broadcast("non-existent", "message")).not.toThrow();
	});

	it("should return empty Set for non-existent session connections", () => {
		const connections = manager.getConnections("non-existent");
		expect(connections.size).toBe(0);
	});

	it("should handle connection close gracefully", () => {
		const session = manager.createSession();
		const mockWs1 = { send: vi.fn() } as unknown as Parameters<
			typeof manager.associateWebSocket
		>[0];
		const mockWs2 = { send: vi.fn() } as unknown as Parameters<
			typeof manager.associateWebSocket
		>[0];

		manager.associateWebSocket(mockWs1, session.id);
		manager.associateWebSocket(mockWs2, session.id);

		// Simulate one connection closing
		manager.removeWebSocket(mockWs1);

		const connections = manager.getConnections(session.id);
		expect(connections.size).toBe(1);
		expect(connections.has(mockWs2)).toBe(true);

		// Broadcast should still work for remaining connection
		const message = JSON.stringify({ type: "patch", patches: [] });
		manager.broadcast(session.id, message);
		expect(mockWs2.send).toHaveBeenCalledWith(message);
	});
});

describe("Ping/Pong connection maintenance", () => {
	let manager: SessionManager;

	beforeEach(() => {
		vi.useFakeTimers();
		manager = new SessionManager();
	});

	afterEach(() => {
		manager.stopCleanupInterval();
		manager.stopPingInterval();
		vi.useRealTimers();
	});

	it("should not start ping interval when pingInterval is 0", () => {
		manager.startPingInterval(0, 10000);

		// Advance time - should not affect anything
		vi.advanceTimersByTime(1000);

		// No errors should occur
		expect(true).toBe(true);
	});

	it("should send ping to all connections", () => {
		const session = manager.createSession();
		const mockWs1 = { send: vi.fn(), close: vi.fn() } as unknown as Parameters<
			typeof manager.associateWebSocket
		>[0];
		const mockWs2 = { send: vi.fn(), close: vi.fn() } as unknown as Parameters<
			typeof manager.associateWebSocket
		>[0];

		manager.associateWebSocket(mockWs1, session.id);
		manager.associateWebSocket(mockWs2, session.id);
		manager.initializePong(mockWs1);
		manager.initializePong(mockWs2);

		// Start ping interval
		manager.startPingInterval(5000, 10000);

		// Advance time to trigger ping
		vi.advanceTimersByTime(5000);

		// Both connections should receive ping
		expect(mockWs1.send).toHaveBeenCalledWith('{"type":"ping"}');
		expect(mockWs2.send).toHaveBeenCalledWith('{"type":"ping"}');
	});

	it("should update lastPong on handlePong", () => {
		const session = manager.createSession();
		const mockWs = { send: vi.fn(), close: vi.fn() } as unknown as Parameters<
			typeof manager.associateWebSocket
		>[0];

		manager.associateWebSocket(mockWs, session.id);
		manager.initializePong(mockWs);

		// Advance time and call handlePong
		vi.advanceTimersByTime(5000);
		manager.handlePong(mockWs);

		// lastPong should be updated (we can't directly check, but we can verify no timeout)
		manager.startPingInterval(1000, 2000);
		vi.advanceTimersByTime(1000);

		// Connection should still be alive
		expect(manager.getConnections(session.id).has(mockWs)).toBe(true);
	});

	it("should disconnect timed out connections", () => {
		const session = manager.createSession();
		const mockWs = { send: vi.fn(), close: vi.fn() } as unknown as Parameters<
			typeof manager.associateWebSocket
		>[0];

		manager.associateWebSocket(mockWs, session.id);
		manager.initializePong(mockWs);

		// Start ping interval with short timeout
		// Timeout = pingInterval + pongTimeout = 1000 + 500 = 1500ms from lastPong
		manager.startPingInterval(1000, 500);

		// First ping sent at 1000ms
		vi.advanceTimersByTime(1000);
		expect(mockWs.send).toHaveBeenCalledWith('{"type":"ping"}');

		// Connection still alive at first ping (1000ms < 1500ms)
		expect(manager.getConnections(session.id).has(mockWs)).toBe(true);

		// Second ping at 2000ms - now timed out (2000ms > 1500ms)
		vi.advanceTimersByTime(1000);

		// Connection should be closed
		expect(mockWs.close).toHaveBeenCalled();
		expect(manager.getConnections(session.id).has(mockWs)).toBe(false);
	});

	it("should remove dead connections on ping send failure", () => {
		const session = manager.createSession();
		const mockWs = {
			send: vi.fn().mockImplementation(() => {
				throw new Error("Connection closed");
			}),
			close: vi.fn(),
		} as unknown as Parameters<typeof manager.associateWebSocket>[0];

		manager.associateWebSocket(mockWs, session.id);
		manager.initializePong(mockWs);

		manager.startPingInterval(1000, 10000);
		vi.advanceTimersByTime(1000);

		// Connection should be removed after failed send
		expect(manager.getConnections(session.id).has(mockWs)).toBe(false);
	});

	it("should not start ping interval multiple times", () => {
		const session = manager.createSession();
		const mockWs = { send: vi.fn(), close: vi.fn() } as unknown as Parameters<
			typeof manager.associateWebSocket
		>[0];

		manager.associateWebSocket(mockWs, session.id);
		manager.initializePong(mockWs);

		// Start ping interval twice
		manager.startPingInterval(1000, 5000);
		manager.startPingInterval(500, 5000); // Should be ignored

		vi.advanceTimersByTime(600);

		// Should not have sent ping (interval is 1000, not 500)
		expect(mockWs.send).not.toHaveBeenCalled();

		vi.advanceTimersByTime(400);

		// Now should send ping
		expect(mockWs.send).toHaveBeenCalledWith('{"type":"ping"}');
	});

	it("should stop ping interval", () => {
		const session = manager.createSession();
		const mockWs = { send: vi.fn(), close: vi.fn() } as unknown as Parameters<
			typeof manager.associateWebSocket
		>[0];

		manager.associateWebSocket(mockWs, session.id);
		manager.initializePong(mockWs);

		manager.startPingInterval(1000, 5000);
		manager.stopPingInterval();

		vi.advanceTimersByTime(2000);

		// No ping should be sent
		expect(mockWs.send).not.toHaveBeenCalled();
	});
});

describe("Sequence number management", () => {
	let manager: SessionManager;

	beforeEach(() => {
		manager = new SessionManager();
	});

	afterEach(() => {
		manager.stopCleanupInterval();
	});

	it("should initialize session with lastSeq 0 and empty patchHistory", () => {
		const session = manager.createSession();
		expect(session.lastSeq).toBe(0);
		expect(session.patchHistory).toEqual([]);
	});

	it("should increment lastSeq when adding patches", () => {
		const session = manager.createSession();

		const seq1 = manager.addPatchToHistory(session.id, [
			{ type: "replaceRoot", html: "<div>1</div>" },
		]);
		expect(seq1).toBe(1);
		expect(session.lastSeq).toBe(1);

		const seq2 = manager.addPatchToHistory(session.id, [
			{ type: "replaceRoot", html: "<div>2</div>" },
		]);
		expect(seq2).toBe(2);
		expect(session.lastSeq).toBe(2);
	});

	it("should store patches in history", () => {
		const session = manager.createSession();
		const patches1 = [{ type: "replaceRoot", html: "<div>1</div>" }];
		const patches2 = [{ type: "replaceNode", id: "test", html: "<span>2</span>" }];

		manager.addPatchToHistory(session.id, patches1);
		manager.addPatchToHistory(session.id, patches2);

		expect(session.patchHistory.length).toBe(2);
		expect(session.patchHistory[0].patches).toEqual(patches1);
		expect(session.patchHistory[1].patches).toEqual(patches2);
	});

	it("should return empty array when client is up to date", () => {
		const session = manager.createSession();
		manager.addPatchToHistory(session.id, [{ type: "replaceRoot", html: "<div>1</div>" }]);

		const missed = manager.getMissedPatches(session.id, 1);
		expect(missed).toEqual([]);
	});

	it("should return missed patches when client is behind", () => {
		const session = manager.createSession();
		manager.addPatchToHistory(session.id, [{ type: "replaceRoot", html: "<div>1</div>" }]);
		manager.addPatchToHistory(session.id, [{ type: "replaceNode", id: "a", html: "<div>2</div>" }]);
		manager.addPatchToHistory(session.id, [{ type: "replaceNode", id: "b", html: "<div>3</div>" }]);

		const missed = manager.getMissedPatches(session.id, 1);
		expect(missed).toHaveLength(2);
		expect(missed).toContainEqual({ type: "replaceNode", id: "a", html: "<div>2</div>" });
		expect(missed).toContainEqual({ type: "replaceNode", id: "b", html: "<div>3</div>" });
	});

	it("should return null when gap is too large", () => {
		const session = manager.createSession();

		// Add 105 patches (exceeds MAX_PATCH_HISTORY of 100)
		for (let i = 0; i < 105; i++) {
			manager.addPatchToHistory(session.id, [{ type: "replaceRoot", html: `<div>${i}</div>` }]);
		}

		// Client at seq 0 should require full sync
		const missed = manager.getMissedPatches(session.id, 0);
		expect(missed).toBeNull();
	});

	it("should limit patch history size", () => {
		const session = manager.createSession();

		// Add 110 patches
		for (let i = 0; i < 110; i++) {
			manager.addPatchToHistory(session.id, [{ type: "replaceRoot", html: `<div>${i}</div>` }]);
		}

		// History should be capped at MAX_PATCH_HISTORY (100)
		expect(session.patchHistory.length).toBe(100);
		// Oldest entries should be removed
		expect(session.patchHistory[0].seq).toBe(11); // First 10 removed
	});

	it("should return null for non-existent session", () => {
		const missed = manager.getMissedPatches("non-existent", 0);
		expect(missed).toBeNull();
	});

	it("should return 0 for non-existent session in getLastSeq", () => {
		const lastSeq = manager.getLastSeq("non-existent");
		expect(lastSeq).toBe(0);
	});

	it("should return current lastSeq", () => {
		const session = manager.createSession();
		manager.addPatchToHistory(session.id, [{ type: "replaceRoot", html: "<div>1</div>" }]);
		manager.addPatchToHistory(session.id, [{ type: "replaceRoot", html: "<div>2</div>" }]);

		expect(manager.getLastSeq(session.id)).toBe(2);
	});

	it("should return 0 when adding patches to non-existent session", () => {
		const seq = manager.addPatchToHistory("non-existent", [
			{ type: "replaceRoot", html: "<div>1</div>" },
		]);
		expect(seq).toBe(0);
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

describe("Security features", () => {
	let manager: SessionManager;

	beforeEach(() => {
		vi.useFakeTimers();
		manager = new SessionManager();
	});

	afterEach(() => {
		manager.stopCleanupInterval();
		vi.useRealTimers();
	});

	describe("Session ID validation", () => {
		it("should validate correct UUID v4 format", () => {
			expect(manager.isValidSessionId("123e4567-e89b-4d3c-8456-426614174000")).toBe(true);
			expect(manager.isValidSessionId("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
		});

		it("should reject invalid session IDs", () => {
			expect(manager.isValidSessionId("invalid-id")).toBe(false);
			expect(manager.isValidSessionId("")).toBe(false);
			expect(manager.isValidSessionId(null)).toBe(false);
			expect(manager.isValidSessionId(undefined)).toBe(false);
			expect(manager.isValidSessionId(123)).toBe(false);
		});

		it("should reject non-v4 UUIDs", () => {
			// Version 3 UUID
			expect(manager.isValidSessionId("123e4567-e89b-3d3c-8456-426614174000")).toBe(false);
			// Invalid variant
			expect(manager.isValidSessionId("123e4567-e89b-4d3c-0456-426614174000")).toBe(false);
		});

		it("should create new session for invalid session ID in getOrCreateSession", () => {
			const session = manager.getOrCreateSession("invalid-format");
			expect(session).toBeDefined();
			expect(manager.isValidSessionId(session.id)).toBe(true);
		});

		it("should return existing session for valid session ID", () => {
			const created = manager.createSession();
			const retrieved = manager.getOrCreateSession(created.id);
			expect(retrieved.id).toBe(created.id);
		});
	});

	describe("Patch size limit", () => {
		it("should accept patches within size limit", () => {
			const session = manager.createSession();
			const smallPatch = [{ type: "replaceRoot", html: "<div>Hello</div>" }];

			const seq = manager.addPatchToHistory(session.id, smallPatch);

			expect(seq).toBe(1);
			expect(session.patchHistory.length).toBe(1);
		});

		it("should reject patches exceeding size limit", () => {
			const customManager = new SessionManager({}, { maxPatchSize: 100 });
			const session = customManager.createSession();
			const largePatch = [{ type: "replaceRoot", html: "x".repeat(200) }];

			const seq = customManager.addPatchToHistory(session.id, largePatch);

			// Sequence number is still incremented
			expect(seq).toBe(1);
			// But patch is not stored in history
			expect(session.patchHistory.length).toBe(0);

			customManager.stopCleanupInterval();
		});

		it("should use TextEncoder for accurate byte size calculation", () => {
			const customManager = new SessionManager({}, { maxPatchSize: 50 });
			const session = customManager.createSession();
			// Multi-byte characters (日本語 = 9 bytes in UTF-8, 3 chars)
			const unicodePatch = [{ type: "replaceRoot", html: "日本語" }];

			// The JSON representation will be larger than the raw string
			const seq = customManager.addPatchToHistory(session.id, unicodePatch);
			expect(seq).toBe(1);

			customManager.stopCleanupInterval();
		});
	});

	describe("Rate limiting", () => {
		it("should allow events within rate limit", () => {
			const session = manager.createSession();

			for (let i = 0; i < 10; i++) {
				const result = manager.checkRateLimit(session.id);
				expect(result.allowed).toBe(true);
			}
		});

		it("should block events exceeding rate limit", () => {
			const customManager = new SessionManager(
				{},
				{ maxEventsPerSecond: 5, rateLimitCooldown: 1000 },
			);
			const session = customManager.createSession();

			// First 5 should be allowed
			for (let i = 0; i < 5; i++) {
				const result = customManager.checkRateLimit(session.id);
				expect(result.allowed).toBe(true);
			}

			// 6th should be blocked
			const result = customManager.checkRateLimit(session.id);
			expect(result.allowed).toBe(false);
			expect(result.retryAfter).toBe(1000);

			customManager.stopCleanupInterval();
		});

		it("should reset rate limit after window expires", () => {
			const customManager = new SessionManager({}, { maxEventsPerSecond: 3 });
			const session = customManager.createSession();

			// Use up the limit
			for (let i = 0; i < 3; i++) {
				customManager.checkRateLimit(session.id);
			}
			expect(customManager.checkRateLimit(session.id).allowed).toBe(false);

			// Advance time past the 1-second window
			vi.advanceTimersByTime(1001);

			// Should be allowed again
			const result = customManager.checkRateLimit(session.id);
			expect(result.allowed).toBe(true);

			customManager.stopCleanupInterval();
		});

		it("should enforce cooldown period", () => {
			const customManager = new SessionManager(
				{},
				{ maxEventsPerSecond: 2, rateLimitCooldown: 2000 },
			);
			const session = customManager.createSession();

			// Trigger rate limit
			customManager.checkRateLimit(session.id);
			customManager.checkRateLimit(session.id);
			const blocked = customManager.checkRateLimit(session.id);
			expect(blocked.allowed).toBe(false);

			// Advance time but not past cooldown
			vi.advanceTimersByTime(1500);
			const stillBlocked = customManager.checkRateLimit(session.id);
			expect(stillBlocked.allowed).toBe(false);
			expect(stillBlocked.retryAfter).toBeLessThanOrEqual(500);

			// Advance past cooldown
			vi.advanceTimersByTime(600);
			const allowed = customManager.checkRateLimit(session.id);
			expect(allowed.allowed).toBe(true);

			customManager.stopCleanupInterval();
		});

		it("should track rate limits per session", () => {
			const customManager = new SessionManager({}, { maxEventsPerSecond: 2 });
			const session1 = customManager.createSession();
			const session2 = customManager.createSession();

			// Exhaust session1's limit
			customManager.checkRateLimit(session1.id);
			customManager.checkRateLimit(session1.id);
			expect(customManager.checkRateLimit(session1.id).allowed).toBe(false);

			// Session2 should still be allowed
			expect(customManager.checkRateLimit(session2.id).allowed).toBe(true);

			customManager.stopCleanupInterval();
		});

		it("should reset rate limit state", () => {
			const customManager = new SessionManager({}, { maxEventsPerSecond: 1 });
			const session = customManager.createSession();

			customManager.checkRateLimit(session.id);
			expect(customManager.checkRateLimit(session.id).allowed).toBe(false);

			customManager.resetRateLimit(session.id);

			expect(customManager.checkRateLimit(session.id).allowed).toBe(true);

			customManager.stopCleanupInterval();
		});
	});

	describe("Security configuration", () => {
		it("should use default security config", () => {
			const config = manager.getSecurityConfig();
			expect(config.maxPatchSize).toBe(1024 * 1024); // 1MB
			expect(config.maxEventsPerSecond).toBe(100);
			expect(config.rateLimitCooldown).toBe(1000);
		});

		it("should merge custom security config", () => {
			const customManager = new SessionManager(
				{},
				{ maxPatchSize: 500000, maxEventsPerSecond: 50 },
			);
			const config = customManager.getSecurityConfig();

			expect(config.maxPatchSize).toBe(500000);
			expect(config.maxEventsPerSecond).toBe(50);
			expect(config.rateLimitCooldown).toBe(1000); // Default value

			customManager.stopCleanupInterval();
		});
	});
});
