import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	resetSessionManager,
	SessionManager,
	setSessionManager,
} from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import { radio, renderRadio } from "../../../src/widgets/radio";
import { resetWidgetCounter } from "../../../src/widgets/registry";

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

	describe("renderRadio", () => {
		it("should render radio buttons for all options", () => {
			const html = renderRadio("Size", ["S", "M", "L"], "S");

			expect(html).toContain('type="radio"');
			expect(html).toContain("Size");
			expect(html).toContain("S");
			expect(html).toContain("M");
			expect(html).toContain("L");
		});

		it("should mark selected option as checked", () => {
			const html = renderRadio("Size", ["S", "M", "L"], "M");

			// M should be checked
			expect(html).toMatch(/value="M"[^>]*checked/);
			// S and L should not be checked
			expect(html).not.toMatch(/value="S"[^>]*checked/);
			expect(html).not.toMatch(/value="L"[^>]*checked/);
		});

		it("should render vertical layout by default", () => {
			const html = renderRadio("Size", ["S", "M", "L"], "S");

			expect(html).toContain("kt-radio-vertical");
			expect(html).not.toContain("kt-radio-horizontal");
		});

		it("should render horizontal layout when configured", () => {
			const html = renderRadio("Size", ["S", "M", "L"], "S", { horizontal: true });

			expect(html).toContain("kt-radio-horizontal");
		});

		it("should render disabled attribute when disabled", () => {
			const html = renderRadio("Size", ["S", "M", "L"], "S", { disabled: true });

			expect(html).toContain("disabled");
		});

		it("should use custom key for name attribute", () => {
			const html = renderRadio("Size", ["S", "M", "L"], "S", { key: "my_radio" });

			expect(html).toContain('name="my_radio"');
		});

		it("should escape HTML in options and label", () => {
			const html = renderRadio("<script>", ["<b>Bold</b>"], "<b>Bold</b>");

			expect(html).not.toContain("<script>");
			expect(html).not.toContain("<b>Bold</b>");
			expect(html).toContain("&lt;script&gt;");
			expect(html).toContain("&lt;b&gt;Bold&lt;/b&gt;");
		});
	});
});
