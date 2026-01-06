import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SessionStateError } from "../../../src/session/errors";
import {
	resetSessionManager,
	SessionManager,
	setSessionManager,
} from "../../../src/session/manager";
import {
	createSessionState,
	createTypedSessionState,
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

		it("should throw SessionStateError when setting value without session", () => {
			const state = createSessionState();

			expect(() => {
				state.counter = 100;
			}).toThrow(SessionStateError);
		});

		it("should include property name in error message", () => {
			const state = createSessionState();

			expect(() => {
				state.myProperty = "value";
			}).toThrow(/myProperty/);
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

	describe("createTypedSessionState", () => {
		interface TestState {
			counter: number;
			name: string;
		}

		const defaults: TestState = {
			counter: 0,
			name: "World",
		};

		it("should return default values when no session", () => {
			const state = createTypedSessionState(defaults);

			expect(state.counter).toBe(0);
			expect(state.name).toBe("World");
		});

		it("should return default values without modifying session state", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const state = createTypedSessionState(defaults);

			// Accessing a default value should return it without setting it in session state
			expect(state.counter).toBe(0);
			expect(manager.getState(session.id)?.counter).toBeUndefined();
		});

		it("should get stored value instead of default", () => {
			const session = manager.createSession();
			manager.setState(session.id, "counter", 42);
			setCurrentSessionId(session.id);

			const state = createTypedSessionState(defaults);

			expect(state.counter).toBe(42);
		});

		it("should set value to session state", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const state = createTypedSessionState(defaults);
			state.counter = 100;

			expect(manager.getState(session.id)?.counter).toBe(100);
		});

		it("should include default keys in 'in' check", () => {
			const state = createTypedSessionState(defaults);

			expect("counter" in state).toBe(true);
			expect("name" in state).toBe(true);
			expect("unknown" in state).toBe(false);
		});

		it("should include default keys in Object.keys()", () => {
			const state = createTypedSessionState(defaults);
			const keys = Object.keys(state);

			expect(keys).toContain("counter");
			expect(keys).toContain("name");
		});

		it("should merge session keys with default keys", () => {
			const session = manager.createSession();
			manager.setState(session.id, "extra", "value");
			setCurrentSessionId(session.id);

			const state = createTypedSessionState(defaults);
			const keys = Object.keys(state);

			expect(keys).toContain("counter");
			expect(keys).toContain("name");
			expect(keys).toContain("extra");
		});

		it("should return descriptor for default keys when no session", () => {
			const state = createTypedSessionState(defaults);
			const descriptor = Object.getOwnPropertyDescriptor(state, "counter");

			expect(descriptor?.enumerable).toBe(true);
			expect(descriptor?.configurable).toBe(true);
			expect(descriptor?.value).toBe(0);
		});

		it("should return descriptor for session value when exists", () => {
			const session = manager.createSession();
			manager.setState(session.id, "counter", 42);
			setCurrentSessionId(session.id);

			const state = createTypedSessionState(defaults);
			const descriptor = Object.getOwnPropertyDescriptor(state, "counter");

			expect(descriptor?.value).toBe(42);
		});

		it("should throw SessionStateError when setting value without session", () => {
			const state = createTypedSessionState(defaults);

			expect(() => {
				state.counter = 100;
			}).toThrow(SessionStateError);
		});

		it("should include property name in TypedSessionState error message", () => {
			const state = createTypedSessionState(defaults);

			expect(() => {
				state.name = "test";
			}).toThrow(/name/);
		});

		it("should return false for 'in' check on non-default key with session but no state", () => {
			// Set a non-existent session ID
			setCurrentSessionId("non-existent-session-id");

			const state = createTypedSessionState(defaults);

			// "counter" is in defaults, so it returns true
			expect("counter" in state).toBe(true);
			// "unknown" is not in defaults and state is undefined
			expect("unknown" in state).toBe(false);
		});

		it("should return undefined from getOwnPropertyDescriptor for non-default key when no session", () => {
			const state = createTypedSessionState(defaults);
			const descriptor = Object.getOwnPropertyDescriptor(state, "unknown");

			expect(descriptor).toBeUndefined();
		});

		it("should return undefined from getOwnPropertyDescriptor for non-existent key with session", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const state = createTypedSessionState(defaults);
			// "unknown" is not in defaults and not in session state
			const descriptor = Object.getOwnPropertyDescriptor(state, "unknown");

			expect(descriptor).toBeUndefined();
		});

		it("should return default value descriptor when session exists but key only in defaults", () => {
			const session = manager.createSession();
			// Don't set "counter" in session state, only in defaults
			setCurrentSessionId(session.id);

			const state = createTypedSessionState(defaults);
			// Access "name" which is in defaults but not set in session yet
			// First access counter to not trigger auto-initialization for name
			const descriptor = Object.getOwnPropertyDescriptor(state, "name");

			expect(descriptor?.value).toBe("World");
		});
	});

	describe("array and object mutation support", () => {
		interface StateWithArray {
			items: string[];
			nested: { count: number };
		}

		const arrayDefaults: StateWithArray = {
			items: [],
			nested: { count: 0 },
		};

		it("should clone and store array on first access", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const state = createTypedSessionState(arrayDefaults);

			// First access should clone and store the array
			const items = state.items;
			expect(items).toEqual([]);

			// Should be stored in session state
			expect(manager.getState(session.id)?.items).toEqual([]);
		});

		it("should preserve array mutations in session state", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const state = createTypedSessionState(arrayDefaults);

			// Push to array
			state.items.push("item1");
			state.items.push("item2");

			// Verify mutations are preserved
			expect(state.items).toEqual(["item1", "item2"]);
			expect(manager.getState(session.id)?.items).toEqual(["item1", "item2"]);
		});

		it("should not share arrays between sessions", () => {
			const session1 = manager.createSession();
			const session2 = manager.createSession();

			// Use a single state proxy (as would happen in a real app)
			const state = createTypedSessionState(arrayDefaults);

			// Session 1: add item
			setCurrentSessionId(session1.id);
			state.items.push("session1-item");
			expect(state.items).toEqual(["session1-item"]);

			// Session 2: should have empty array (cloned separately)
			setCurrentSessionId(session2.id);
			expect(state.items).toEqual([]);

			// Session 2 mutations should not affect session 1
			state.items.push("session2-item");
			expect(state.items).toEqual(["session2-item"]);

			// Switch back to session 1 - should still have its own items
			setCurrentSessionId(session1.id);
			expect(state.items).toEqual(["session1-item"]);
		});

		it("should clone nested objects on first access", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const state = createTypedSessionState(arrayDefaults);

			// Access nested object
			const nested = state.nested;
			expect(nested).toEqual({ count: 0 });

			// Modify nested object
			nested.count = 42;

			// Verify mutation is preserved
			expect(state.nested.count).toBe(42);
			expect(manager.getState(session.id)?.nested).toEqual({ count: 42 });
		});

		it("should not store primitive defaults in session state", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const primitiveDefaults = { counter: 0, name: "World" };
			const state = createTypedSessionState(primitiveDefaults);

			// Access primitives
			expect(state.counter).toBe(0);
			expect(state.name).toBe("World");

			// Primitives should NOT be stored in session state
			expect(manager.getState(session.id)?.counter).toBeUndefined();
			expect(manager.getState(session.id)?.name).toBeUndefined();
		});

		it("should not mutate the original defaults object", () => {
			const originalDefaults: StateWithArray = {
				items: ["original"],
				nested: { count: 100 },
			};

			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const state = createTypedSessionState(originalDefaults);

			// Mutate through state
			state.items.push("new-item");
			state.nested.count = 999;

			// Original defaults should be unchanged
			expect(originalDefaults.items).toEqual(["original"]);
			expect(originalDefaults.nested.count).toBe(100);
		});
	});
});
