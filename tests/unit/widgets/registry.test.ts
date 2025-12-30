import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	SessionManager,
	resetSessionManager,
	setSessionManager,
} from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import {
	generateWidgetId,
	getWidgetValue,
	hasWidgetValue,
	resetWidgetCounter,
	setWidgetValue,
} from "../../../src/widgets/registry";

describe("widgets/registry", () => {
	let manager: SessionManager;

	beforeEach(() => {
		resetWidgetCounter();
		manager = new SessionManager();
		setSessionManager(manager);
	});

	afterEach(() => {
		setCurrentSessionId(null);
		resetSessionManager();
	});

	describe("generateWidgetId", () => {
		it("should generate sequential IDs", () => {
			expect(generateWidgetId()).toBe("widget_0");
			expect(generateWidgetId()).toBe("widget_1");
			expect(generateWidgetId()).toBe("widget_2");
		});

		it("should return custom key when provided", () => {
			expect(generateWidgetId("my-button")).toBe("my-button");
		});

		it("should continue sequence after custom key", () => {
			expect(generateWidgetId()).toBe("widget_0");
			expect(generateWidgetId("custom")).toBe("custom");
			expect(generateWidgetId()).toBe("widget_1");
		});
	});

	describe("resetWidgetCounter", () => {
		it("should reset counter to 0", () => {
			generateWidgetId();
			generateWidgetId();
			resetWidgetCounter();
			expect(generateWidgetId()).toBe("widget_0");
		});
	});

	describe("getWidgetValue", () => {
		it("should return default value when no session", () => {
			const value = getWidgetValue("widget_0", 42);
			expect(value).toBe(42);
		});

		it("should return default value when widget not in state", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = getWidgetValue("non_existent_widget", "default");
			expect(value).toBe("default");
		});

		it("should return stored value when widget exists in state", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);
			manager.setState(session.id, "widget_0", 100);

			const value = getWidgetValue("widget_0", 42);
			expect(value).toBe(100);
		});

		it("should return default value when state is empty", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = getWidgetValue("widget_0", "fallback");
			expect(value).toBe("fallback");
		});

		it("should return default value when stored value has wrong type (number expected)", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);
			// Store a string when number is expected
			manager.setState(session.id, "widget_0", "not a number");

			const value = getWidgetValue("widget_0", 42);
			expect(value).toBe(42);
		});

		it("should return default value when stored value has wrong type (string expected)", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);
			// Store a number when string is expected
			manager.setState(session.id, "widget_0", 123);

			const value = getWidgetValue("widget_0", "default");
			expect(value).toBe("default");
		});

		it("should return default value when stored value has wrong type (boolean expected)", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);
			// Store a string when boolean is expected
			manager.setState(session.id, "widget_0", "true");

			const value = getWidgetValue("widget_0", false);
			expect(value).toBe(false);
		});

		it("should return stored value when types match", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);
			manager.setState(session.id, "num_widget", 100);
			manager.setState(session.id, "str_widget", "hello");
			manager.setState(session.id, "bool_widget", true);

			expect(getWidgetValue("num_widget", 0)).toBe(100);
			expect(getWidgetValue("str_widget", "")).toBe("hello");
			expect(getWidgetValue("bool_widget", false)).toBe(true);
		});

		it("should return stored value for non-primitive types without validation", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);
			const defaultObj = { key: "default" };
			const storedObj = { key: "stored" };
			manager.setState(session.id, "obj_widget", storedObj);

			// Non-primitive types bypass type validation
			const value = getWidgetValue("obj_widget", defaultObj);
			expect(value).toEqual(storedObj);
		});
	});

	describe("setWidgetValue", () => {
		it("should do nothing when no session", () => {
			// Should not throw
			setWidgetValue("widget_0", 100);

			// Value should not be stored anywhere
			expect(getWidgetValue("widget_0", 42)).toBe(42);
		});

		it("should store value in session state", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			setWidgetValue("widget_0", 100);

			expect(manager.getState(session.id)?.widget_0).toBe(100);
		});
	});

	describe("hasWidgetValue", () => {
		it("should return false when no session", () => {
			expect(hasWidgetValue("widget_0")).toBe(false);
		});

		it("should return false when widget not in state", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			expect(hasWidgetValue("non_existent")).toBe(false);
		});

		it("should return true when widget exists in state", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);
			manager.setState(session.id, "widget_0", 100);

			expect(hasWidgetValue("widget_0")).toBe(true);
		});

		it("should return false when session ID is set but session does not exist", () => {
			// Set a non-existent session ID
			setCurrentSessionId("non-existent-session-id");

			// getState returns undefined, so `state ? widgetId in state : false` returns false
			expect(hasWidgetValue("widget_0")).toBe(false);
		});
	});
});
