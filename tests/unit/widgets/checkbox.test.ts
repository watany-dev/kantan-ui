import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	SessionManager,
	resetSessionManager,
	setSessionManager,
} from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import { resetWidgetCounter } from "../../../src/widgets/registry";
import { checkbox } from "../../../src/widgets/checkbox";

describe("checkbox", () => {
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

	describe("checkbox function", () => {
		it("should return false by default", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = checkbox("Accept terms");

			expect(value).toBe(false);
		});

		it("should return defaultValue when provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = checkbox("Accept terms", true);

			expect(value).toBe(true);
		});

		it("should return stored state value", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			// First call sets default
			checkbox("Accept terms", false);
			resetWidgetCounter();

			// Update the value
			manager.setState(session.id, "widget_0", true);

			// Second call should return stored value
			const value = checkbox("Accept terms", false);

			expect(value).toBe(true);
		});

		it("should use custom key when provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			manager.setState(session.id, "my_checkbox", true);

			const value = checkbox("Accept terms", false, { key: "my_checkbox" });

			expect(value).toBe(true);
		});
	});
});
