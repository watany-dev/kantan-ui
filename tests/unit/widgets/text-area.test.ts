import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	SessionManager,
	resetSessionManager,
	setSessionManager,
} from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import { resetWidgetCounter } from "../../../src/widgets/registry";
import { text_area } from "../../../src/widgets/text-area";

describe("text_area", () => {
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

	describe("text_area function", () => {
		it("should return empty string by default", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = text_area("Bio");

			expect(value).toBe("");
		});

		it("should return defaultValue when provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = text_area("Bio", "Hello World");

			expect(value).toBe("Hello World");
		});

		it("should return stored state value", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			// First call sets default
			text_area("Bio", "default");
			resetWidgetCounter();

			// Update the value
			manager.setState(session.id, "widget_0", "new value");

			// Second call should return stored value
			const value = text_area("Bio", "default");

			expect(value).toBe("new value");
		});

		it("should use custom key when provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			manager.setState(session.id, "my_textarea", "custom value");

			const value = text_area("Bio", "default", { key: "my_textarea" });

			expect(value).toBe("custom value");
		});
	});
});
