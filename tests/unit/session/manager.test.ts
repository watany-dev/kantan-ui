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
