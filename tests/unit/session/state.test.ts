import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	SessionManager,
	resetSessionManager,
	setSessionManager,
} from "../../../src/session/manager";
import {
	createSessionState,
	getCurrentSessionId,
	setCurrentSessionId,
} from "../../../src/session/state";

describe("session_state", () => {
	let manager: SessionManager;

	beforeEach(() => {
		manager = new SessionManager();
		setSessionManager(manager);
	});

	afterEach(() => {
		setCurrentSessionId(null);
		resetSessionManager();
	});

	describe("setCurrentSessionId / getCurrentSessionId", () => {
		it("should set and get current session id", () => {
			setCurrentSessionId("test-session-id");

			expect(getCurrentSessionId()).toBe("test-session-id");
		});

		it("should return null when not set", () => {
			expect(getCurrentSessionId()).toBeNull();
		});
	});

	describe("createSessionState proxy", () => {
		it("should get value from session state", () => {
			const session = manager.createSession();
			manager.setState(session.id, "counter", 42);
			setCurrentSessionId(session.id);

			const state = createSessionState();

			expect(state.counter).toBe(42);
		});

		it("should set value to session state", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const state = createSessionState();
			state.counter = 100;

			expect(manager.getState(session.id)?.counter).toBe(100);
		});

		it("should return undefined when no session", () => {
			const state = createSessionState();

			expect(state.counter).toBeUndefined();
		});

		it("should check if property exists", () => {
			const session = manager.createSession();
			manager.setState(session.id, "existing", true);
			setCurrentSessionId(session.id);

			const state = createSessionState();

			expect("existing" in state).toBe(true);
			expect("nonExisting" in state).toBe(false);
		});

		it("should return false for 'in' check when no session", () => {
			const state = createSessionState();

			expect("anything" in state).toBe(false);
		});

		it("should return keys of session state", () => {
			const session = manager.createSession();
			manager.setState(session.id, "a", 1);
			manager.setState(session.id, "b", 2);
			setCurrentSessionId(session.id);

			const state = createSessionState();
			const keys = Object.keys(state);

			expect(keys).toContain("a");
			expect(keys).toContain("b");
		});

		it("should return empty keys when no session", () => {
			const state = createSessionState();
			const keys = Object.keys(state);

			expect(keys).toEqual([]);
		});

		it("should warn when setting value without session", () => {
			const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const state = createSessionState();

			state.counter = 100;

			expect(warnSpy).toHaveBeenCalledWith("session_state への書き込みは rerun 中のみ有効です");
			warnSpy.mockRestore();
		});

		it("should return undefined from getOwnPropertyDescriptor when property not in state", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const state = createSessionState();
			const descriptor = Object.getOwnPropertyDescriptor(state, "nonExistent");

			expect(descriptor).toBeUndefined();
		});

		it("should return descriptor when property exists", () => {
			const session = manager.createSession();
			manager.setState(session.id, "counter", 42);
			setCurrentSessionId(session.id);

			const state = createSessionState();
			const descriptor = Object.getOwnPropertyDescriptor(state, "counter");

			expect(descriptor?.enumerable).toBe(true);
			expect(descriptor?.configurable).toBe(true);
			expect(descriptor?.value).toBe(42);
		});

		it("should return undefined from getOwnPropertyDescriptor when no session", () => {
			const state = createSessionState();
			const descriptor = Object.getOwnPropertyDescriptor(state, "anything");

			expect(descriptor).toBeUndefined();
		});

		it("should return false for 'in' check when session exists but state is empty", () => {
			// Set a non-existent session ID
			setCurrentSessionId("non-existent-session-id");

			const state = createSessionState();

			// getState will return undefined, so the branch `state ? prop in state : false` returns false
			expect("anything" in state).toBe(false);
		});

		it("should return empty keys when session ID is set but session does not exist", () => {
			// Set a non-existent session ID
			setCurrentSessionId("non-existent-session-id");

			const state = createSessionState();
			const keys = Object.keys(state);

			// getState returns undefined, so the branch `state ? Object.keys(state) : []` returns []
			expect(keys).toEqual([]);
		});
	});
});
