import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	resetSessionManager,
	SessionManager,
	setSessionManager,
} from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import { date_input, renderDateInput } from "../../../src/widgets/date-input";
import { resetWidgetCounter } from "../../../src/widgets/registry";

describe("date_input", () => {
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

	describe("date_input function", () => {
		it("should return default value on first call", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = date_input("Birthday", "2000-01-15");

			expect(value).toBe("2000-01-15");
		});

		it("should return empty string when no default provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = date_input("Birthday");

			expect(value).toBe("");
		});

		it("should return stored value on subsequent calls", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			// First call sets default
			date_input("Birthday", "2000-01-15");
			resetWidgetCounter();

			// Update the value
			manager.setState(session.id, "widget_0", "2024-12-25");

			// Second call should return stored value
			const value = date_input("Birthday", "2000-01-15");

			expect(value).toBe("2024-12-25");
		});

		it("should use custom key when provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			manager.setState(session.id, "my_date", "2024-07-04");

			const value = date_input("Birthday", "2000-01-15", { key: "my_date" });

			expect(value).toBe("2024-07-04");
		});
	});

	describe("renderDateInput", () => {
		it("should render date input HTML", () => {
			const html = renderDateInput("Birthday", "2000-01-15");

			expect(html).toContain('<input type="date"');
			expect(html).toContain('value="2000-01-15"');
			expect(html).toContain("Birthday");
			expect(html).toContain('data-kt-event="change"');
		});

		it("should include min attribute when provided", () => {
			const html = renderDateInput("Birthday", "", { min: "1900-01-01" });

			expect(html).toContain('min="1900-01-01"');
		});

		it("should include max attribute when provided", () => {
			const html = renderDateInput("Birthday", "", { max: "2024-12-31" });

			expect(html).toContain('max="2024-12-31"');
		});

		it("should include both min and max attributes when provided", () => {
			const html = renderDateInput("Birthday", "", {
				min: "1900-01-01",
				max: "2024-12-31",
			});

			expect(html).toContain('min="1900-01-01"');
			expect(html).toContain('max="2024-12-31"');
		});

		it("should escape HTML in label", () => {
			const html = renderDateInput("<script>", "2000-01-15");

			expect(html).not.toContain("<script>");
			expect(html).toContain("&lt;script&gt;");
		});

		it("should render disabled attribute when disabled", () => {
			const html = renderDateInput("Birthday", "2000-01-15", { disabled: true });

			expect(html).toContain("disabled");
		});

		it("should not render disabled attribute when not disabled", () => {
			const html = renderDateInput("Birthday", "2000-01-15", { disabled: false });

			expect(html).not.toContain("disabled");
		});

		it("should use custom key for id", () => {
			const html = renderDateInput("Birthday", "2000-01-15", { key: "custom_date" });

			expect(html).toContain('id="custom_date"');
			expect(html).toContain('for="custom_date"');
		});
	});
});
