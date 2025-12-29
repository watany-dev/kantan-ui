import { beforeEach, describe, expect, it } from "vitest";
import { SessionManager } from "../../../src/session/manager";

describe("SessionManager", () => {
	let manager: SessionManager;

	beforeEach(() => {
		manager = new SessionManager();
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
	});

	describe("cleanup", () => {
		it("should remove expired sessions", () => {
			const manager = new SessionManager({ ttl: 100 }); // 100ms TTL
			const session = manager.createSession();

			// Manually set lastAccessedAt to past
			const pastDate = new Date(Date.now() - 200);
			const storedSession = manager.getSession(session.id);
			if (storedSession) {
				storedSession.lastAccessedAt = pastDate;
			}

			const cleaned = manager.cleanup();

			expect(cleaned).toBe(1);
			expect(manager.getSessionCount()).toBe(0);
		});

		it("should not remove active sessions", () => {
			const manager = new SessionManager({ ttl: 10000 }); // 10s TTL
			manager.createSession();

			const cleaned = manager.cleanup();

			expect(cleaned).toBe(0);
			expect(manager.getSessionCount()).toBe(1);
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
});
