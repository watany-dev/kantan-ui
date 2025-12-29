import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
	});
});
