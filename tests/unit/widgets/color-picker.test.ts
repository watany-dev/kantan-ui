import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	resetSessionManager,
	SessionManager,
	setSessionManager,
} from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import { resetWidgetCounter } from "../../../src/widgets/registry";
import {
	color_picker,
	renderColorPicker,
} from "../../../src/widgets/color-picker";

describe("color_picker", () => {
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

	describe("color_picker function", () => {
		it("should return default value #000000 when no default provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = color_picker("Pick a color");

			expect(value).toBe("#000000");
		});

		it("should return custom default value when provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			const value = color_picker("Theme color", "#3498db");

			expect(value).toBe("#3498db");
		});

		it("should return stored value on subsequent calls", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			// First call sets default
			color_picker("Color", "#ff0000");
			resetWidgetCounter();

			// Update the value
			manager.setState(session.id, "widget_0", "#00ff00");

			// Second call should return stored value
			const value = color_picker("Color", "#ff0000");

			expect(value).toBe("#00ff00");
		});

		it("should use custom key when provided", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			manager.setState(session.id, "my_color", "#0000ff");

			const value = color_picker("Color", "#ff0000", { key: "my_color" });

			expect(value).toBe("#0000ff");
		});
	});

	describe("renderColorPicker", () => {
		it("should render color input HTML", () => {
			const html = renderColorPicker("Pick a color", "#ff0000");

			expect(html).toContain('<input type="color"');
			expect(html).toContain('value="#ff0000"');
			expect(html).toContain("Pick a color");
			expect(html).toContain('data-kt-event="change"');
			expect(html).toContain('class="kt-color-picker"');
		});

		it("should render container with correct class", () => {
			const html = renderColorPicker("Color", "#000000");

			expect(html).toContain('class="kt-color-picker-container"');
			expect(html).toContain('class="kt-color-picker-label"');
		});

		it("should escape HTML in label", () => {
			const html = renderColorPicker("<script>alert(1)</script>", "#000000");

			expect(html).not.toContain("<script>");
			expect(html).toContain("&lt;script&gt;");
		});

		it("should render disabled attribute when disabled", () => {
			const html = renderColorPicker("Color", "#000000", { disabled: true });

			expect(html).toContain("disabled");
		});

		it("should not render disabled attribute when not disabled", () => {
			const html = renderColorPicker("Color", "#000000", { disabled: false });

			// Check that "disabled" does not appear as an attribute
			expect(html).not.toMatch(/\sdisabled(?:\s|>|=)/);
		});

		it("should use custom key in id attribute", () => {
			const html = renderColorPicker("Color", "#000000", { key: "custom_id" });

			expect(html).toContain('id="custom_id"');
			expect(html).toContain('for="custom_id"');
		});

		describe("security: value validation", () => {
			it("should handle invalid hex values gracefully", () => {
				// Invalid value is passed through (browser will correct)
				const html = renderColorPicker("Color", "invalid");

				expect(html).toContain('value="invalid"');
			});

			it("should escape potential XSS in value", () => {
				const html = renderColorPicker(
					"Color",
					'"><script>alert(1)</script>',
				);

				expect(html).not.toContain("<script>");
				expect(html).toContain("&quot;");
			});
		});
	});
});
