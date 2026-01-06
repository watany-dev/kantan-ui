import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	resetSessionManager,
	SessionManager,
	setSessionManager,
} from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import { resetWidgetCounter } from "../../../src/widgets/registry";
import { renderToggle, toggle } from "../../../src/widgets/toggle";

describe("toggle", () => {
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

	describe("toggle function", () => {
		it("should return false by default", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = toggle("Dark mode");

			expect(value).toBe(false);
		});

		it("should return defaultValue when provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = toggle("Dark mode", true);

			expect(value).toBe(true);
		});

		it("should return stored state value", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			// First call sets default
			toggle("Dark mode", false);
			resetWidgetCounter();

			// Update the value
			manager.setState(session.id, "widget_0", true);

			// Second call should return stored value
			const value = toggle("Dark mode", false);

			expect(value).toBe(true);
		});

		it("should use custom key when provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			manager.setState(session.id, "my_toggle", true);

			const value = toggle("Dark mode", false, { key: "my_toggle" });

			expect(value).toBe(true);
		});
	});

	describe("renderToggle", () => {
		it("should render toggle HTML with label", () => {
			const html = renderToggle("Dark mode", false);

			expect(html).toContain('class="kt-toggle-container"');
			expect(html).toContain('type="checkbox"');
			expect(html).toContain("Dark mode");
			expect(html).toContain('class="kt-toggle-switch"');
			expect(html).toContain('class="kt-toggle-slider"');
		});

		it("should render checked toggle when value is true", () => {
			const html = renderToggle("Dark mode", true);

			expect(html).toContain("checked");
		});

		it("should not include checked when value is false", () => {
			const html = renderToggle("Dark mode", false);

			expect(html).not.toContain("checked");
		});

		it("should render disabled attribute when disabled", () => {
			const html = renderToggle("Dark mode", false, { disabled: true });

			expect(html).toContain("disabled");
		});

		it("should use custom key for id", () => {
			const html = renderToggle("Dark mode", false, { key: "my_toggle" });

			expect(html).toContain('id="my_toggle"');
		});

		it("should escape HTML in label", () => {
			const html = renderToggle("<script>alert('xss')</script>", false);

			expect(html).not.toContain("<script>alert");
			expect(html).toContain("&lt;script&gt;");
		});

		it("should include data-kt-event attribute", () => {
			const html = renderToggle("Dark mode", false);

			expect(html).toContain('data-kt-event="change"');
		});
	});
});
