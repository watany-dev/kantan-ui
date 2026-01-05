import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	SessionManager,
	resetSessionManager,
	setSessionManager,
} from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import { number_input, renderNumberInput } from "../../../src/widgets/number-input";
import { resetWidgetCounter } from "../../../src/widgets/registry";

describe("number_input", () => {
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

	describe("number_input function", () => {
		it("should return defaultValue when provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = number_input("Age", 0, 120, 25);

			expect(value).toBe(25);
		});

		it("should return min when no defaultValue provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = number_input("Age", 0, 120);

			expect(value).toBe(0);
		});

		it("should return 0 when no min or defaultValue provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = number_input("Count");

			expect(value).toBe(0);
		});

		it("should throw error when defaultValue is less than min", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			expect(() => number_input("Age", 10, 100, 5)).toThrow(
				"number_input: defaultValue (5) must be between min (10) and max (100)",
			);
		});

		it("should throw error when defaultValue is greater than max", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			expect(() => number_input("Age", 0, 100, 150)).toThrow(
				"number_input: defaultValue (150) must be between min (0) and max (100)",
			);
		});

		it("should throw error when min is greater than max", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			expect(() => number_input("Age", 100, 0, 50)).toThrow(
				"number_input: min (100) must be <= max (0)",
			);
		});

		it("should return stored state value", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			// First call sets default
			number_input("Age", 0, 120, 25);
			resetWidgetCounter();

			// Update the value
			manager.setState(session.id, "widget_0", 30);

			// Second call should return stored value
			const value = number_input("Age", 0, 120, 25);

			expect(value).toBe(30);
		});

		it("should use custom key when provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			manager.setState(session.id, "my_number", 42);

			const value = number_input("Age", 0, 120, 25, { key: "my_number" });

			expect(value).toBe(42);
		});
	});

	describe("renderNumberInput", () => {
		it("should render number input HTML with label", () => {
			const html = renderNumberInput("Age", 0, 120, 25);

			expect(html).toContain("<input");
			expect(html).toContain('type="number"');
			expect(html).toContain("Age");
			expect(html).toContain('data-kt-event="change"');
		});

		it("should include min and max attributes", () => {
			const html = renderNumberInput("Age", 0, 120, 25);

			expect(html).toContain('min="0"');
			expect(html).toContain('max="120"');
		});

		it("should include current value", () => {
			const html = renderNumberInput("Age", 0, 120, 25);

			expect(html).toContain('value="25"');
		});

		it("should include step attribute when configured", () => {
			const html = renderNumberInput("Price", 0, 1000, 100, { step: 10 });

			expect(html).toContain('step="10"');
		});

		it("should use default step of 1", () => {
			const html = renderNumberInput("Age", 0, 120, 25);

			expect(html).toContain('step="1"');
		});

		it("should render disabled attribute when disabled", () => {
			const html = renderNumberInput("Age", 0, 120, 25, { disabled: true });

			expect(html).toContain("disabled");
		});

		it("should use custom key for id", () => {
			const html = renderNumberInput("Age", 0, 120, 25, { key: "my_number" });

			expect(html).toContain('id="my_number"');
		});

		it("should escape HTML in label", () => {
			const html = renderNumberInput("<script>alert('xss')</script>", 0, 100, 50);

			expect(html).not.toContain("<script>");
			expect(html).toContain("&lt;script&gt;");
		});

		it("should handle undefined min/max", () => {
			const html = renderNumberInput("Count", undefined, undefined, 10);

			expect(html).not.toContain('min="');
			expect(html).not.toContain('max="');
		});
	});
});
