import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	SessionManager,
	resetSessionManager,
	setSessionManager,
} from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import { resetWidgetCounter } from "../../../src/widgets/registry";
import { radio } from "../../../src/widgets/radio";

describe("radio", () => {
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

	describe("radio function", () => {
		it("should return first option by default", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = radio("Size", ["S", "M", "L"]);

			expect(value).toBe("S");
		});

		it("should return defaultValue when provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = radio("Size", ["S", "M", "L"], "M");

			expect(value).toBe("M");
		});

		it("should throw error when options array is empty", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			expect(() => radio("Size", [])).toThrow("radio: options array must not be empty");
		});

		it("should throw error when defaultValue is not in options", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			expect(() => radio("Size", ["S", "M", "L"], "XL")).toThrow(
				'radio: defaultValue "XL" must be one of the options',
			);
		});

		it("should return stored state value", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			// First call sets default
			radio("Size", ["S", "M", "L"], "S");
			resetWidgetCounter();

			// Update the value
			manager.setState(session.id, "widget_0", "L");

			// Second call should return stored value
			const value = radio("Size", ["S", "M", "L"], "S");

			expect(value).toBe("L");
		});

		it("should use custom key when provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			manager.setState(session.id, "my_radio", "L");

			const value = radio("Size", ["S", "M", "L"], "S", { key: "my_radio" });

			expect(value).toBe("L");
		});
	});
});
