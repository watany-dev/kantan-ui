import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	SessionManager,
	resetSessionManager,
	setSessionManager,
} from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import { resetWidgetCounter } from "../../../src/widgets/registry";
import { checkbox, renderCheckbox } from "../../../src/widgets/checkbox";

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

	describe("renderCheckbox", () => {
		it("should render checkbox HTML with label", () => {
			const html = renderCheckbox("Accept terms", false);

			expect(html).toContain("<input");
			expect(html).toContain('type="checkbox"');
			expect(html).toContain("Accept terms");
			expect(html).toContain('data-kt-event="change"');
		});

		it("should include checked attribute when value is true", () => {
			const html = renderCheckbox("Accept terms", true);

			expect(html).toContain("checked");
		});

		it("should not include checked attribute when value is false", () => {
			const html = renderCheckbox("Accept terms", false);

			expect(html).not.toContain("checked");
		});

		it("should use custom key for id", () => {
			const html = renderCheckbox("Accept terms", false, { key: "my_checkbox" });

			expect(html).toContain('id="my_checkbox"');
		});

		it("should render disabled attribute when disabled", () => {
			const html = renderCheckbox("Accept terms", false, { disabled: true });

			expect(html).toContain("disabled");
		});

		it("should not render disabled attribute when not disabled", () => {
			const html = renderCheckbox("Accept terms", false, { disabled: false });

			expect(html).not.toContain("disabled");
		});

		it("should escape HTML in label", () => {
			const html = renderCheckbox("<script>alert('xss')</script>", false);

			expect(html).not.toContain("<script>");
			expect(html).toContain("&lt;script&gt;");
		});
	});
});
