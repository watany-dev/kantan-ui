import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import { button, checkbox, multiselect, number_input, radio, selectbox, slider, text_area, text_input, toggle } from "../../../src/kt/widgets";
import { clearContext, setContext } from "../../../src/runtime/context";
import {
	SessionManager,
	resetSessionManager,
	setSessionManager,
} from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import { resetWidgetCounter } from "../../../src/widgets/registry";

describe("Declarative Widget APIs", () => {
	let ctx: RenderContext;

	beforeEach(() => {
		ctx = new RenderContext();
		setRenderContext(ctx);
		setContext({});
		resetWidgetCounter();
	});

	afterEach(() => {
		setRenderContext(null);
		clearContext();
	});

	describe("button", () => {
		it("should append button HTML to buffer", () => {
			button("Click me");
			const html = ctx.getHtml();
			expect(html).toContain('<button id="widget_0"');
			expect(html).toContain("Click me");
			expect(html).toContain('class="kt-button"');
		});

		it("should return false when not pressed", () => {
			setContext({ event: undefined });
			const result = button("Click");
			expect(result).toBe(false);
		});

		it("should return true when pressed", () => {
			setContext({ event: { widgetId: "widget_0", value: "clicked" } });
			const result = button("Click");
			expect(result).toBe(true);
		});

		it("should use custom key", () => {
			button("Click", { key: "my_btn" });
			const html = ctx.getHtml();
			expect(html).toContain('id="my_btn"');
		});
	});

	describe("slider", () => {
		it("should append slider HTML to buffer", () => {
			slider("Volume", 0, 100, 50);
			const html = ctx.getHtml();
			expect(html).toContain('class="kt-slider-container"');
			expect(html).toContain("Volume: 50");
			expect(html).toContain('min="0"');
			expect(html).toContain('max="100"');
		});

		it("should return default value initially", () => {
			const value = slider("Volume", 0, 100, 50);
			expect(value).toBe(50);
		});

		it("should use min as default when not specified", () => {
			const value = slider("Volume", 10, 100);
			expect(value).toBe(10);
		});

		it("should include step attribute", () => {
			slider("Volume", 0, 100, 50, { step: 5 });
			const html = ctx.getHtml();
			expect(html).toContain('step="5"');
		});
	});

	describe("text_input", () => {
		it("should append text input HTML to buffer", () => {
			text_input("Name", "John");
			const html = ctx.getHtml();
			expect(html).toContain('class="kt-text-input-container"');
			expect(html).toContain('value="John"');
		});

		it("should return default value initially", () => {
			const value = text_input("Name", "John");
			expect(value).toBe("John");
		});

		it("should use empty string when no default", () => {
			const value = text_input("Name");
			expect(value).toBe("");
		});

		it("should include placeholder", () => {
			text_input("Name", "", { placeholder: "Enter name" });
			const html = ctx.getHtml();
			expect(html).toContain('placeholder="Enter name"');
		});
	});

	describe("selectbox", () => {
		it("should append selectbox HTML to buffer", () => {
			selectbox("Color", ["Red", "Green", "Blue"]);
			const html = ctx.getHtml();
			expect(html).toContain('class="kt-selectbox-container"');
			expect(html).toContain("<option");
			expect(html).toContain("Red");
			expect(html).toContain("Green");
			expect(html).toContain("Blue");
		});

		it("should return first option as default", () => {
			const value = selectbox("Color", ["Red", "Green", "Blue"]);
			expect(value).toBe("Red");
		});

		it("should use specified default value", () => {
			const value = selectbox("Color", ["Red", "Green", "Blue"], "Blue");
			expect(value).toBe("Blue");
		});

		it("should mark selected option", () => {
			selectbox("Color", ["Red", "Green", "Blue"], "Green");
			const html = ctx.getHtml();
			expect(html).toContain('value="Green" selected');
		});
	});

	describe("checkbox", () => {
		it("should append checkbox HTML to buffer", () => {
			checkbox("Accept terms");
			const html = ctx.getHtml();
			expect(html).toContain('class="kt-checkbox-container"');
			expect(html).toContain('type="checkbox"');
			expect(html).toContain("Accept terms");
		});

		it("should return false by default", () => {
			const value = checkbox("Accept terms");
			expect(value).toBe(false);
		});

		it("should return true when defaultValue is true", () => {
			const value = checkbox("Accept terms", true);
			expect(value).toBe(true);
		});

		it("should include checked attribute when value is true", () => {
			checkbox("Accept terms", true);
			const html = ctx.getHtml();
			expect(html).toContain("checked");
		});

		it("should use custom key", () => {
			checkbox("Accept terms", false, { key: "my_checkbox" });
			const html = ctx.getHtml();
			expect(html).toContain('id="my_checkbox"');
		});
	});

	describe("radio", () => {
		it("should append radio HTML to buffer", () => {
			radio("Size", ["S", "M", "L"]);
			const html = ctx.getHtml();
			expect(html).toContain('class="kt-radio-container');
			expect(html).toContain('type="radio"');
			expect(html).toContain("Size");
			expect(html).toContain("S");
			expect(html).toContain("M");
			expect(html).toContain("L");
		});

		it("should return first option by default", () => {
			const value = radio("Size", ["S", "M", "L"]);
			expect(value).toBe("S");
		});

		it("should return defaultValue when provided", () => {
			const value = radio("Size", ["S", "M", "L"], "M");
			expect(value).toBe("M");
		});

		it("should mark selected option as checked", () => {
			radio("Size", ["S", "M", "L"], "M");
			const html = ctx.getHtml();
			expect(html).toMatch(/value="M"[^>]*checked/);
		});

		it("should use custom key", () => {
			radio("Size", ["S", "M", "L"], "S", { key: "my_radio" });
			const html = ctx.getHtml();
			expect(html).toContain('name="my_radio"');
		});
	});

	describe("number_input", () => {
		it("should append number input HTML to buffer", () => {
			number_input("Age", 0, 120, 25);
			const html = ctx.getHtml();
			expect(html).toContain('class="kt-number-input-container"');
			expect(html).toContain('type="number"');
			expect(html).toContain("Age");
		});

		it("should return defaultValue when provided", () => {
			const value = number_input("Age", 0, 120, 25);
			expect(value).toBe(25);
		});

		it("should return min when no defaultValue", () => {
			const value = number_input("Age", 10, 120);
			expect(value).toBe(10);
		});

		it("should return 0 when no min or defaultValue", () => {
			const value = number_input("Count");
			expect(value).toBe(0);
		});

		it("should include min and max attributes", () => {
			number_input("Age", 0, 120, 25);
			const html = ctx.getHtml();
			expect(html).toContain('min="0"');
			expect(html).toContain('max="120"');
		});

		it("should use custom key", () => {
			number_input("Age", 0, 120, 25, { key: "my_number" });
			const html = ctx.getHtml();
			expect(html).toContain('id="my_number"');
		});
	});

	describe("text_area", () => {
		it("should append text_area HTML to buffer", () => {
			text_area("Bio", "Hello");
			const html = ctx.getHtml();
			expect(html).toContain('class="kt-text-area-container"');
			expect(html).toContain("<textarea");
			expect(html).toContain("Bio");
			expect(html).toContain("Hello");
		});

		it("should return empty string by default", () => {
			const value = text_area("Bio");
			expect(value).toBe("");
		});

		it("should return defaultValue when provided", () => {
			const value = text_area("Bio", "My bio");
			expect(value).toBe("My bio");
		});

		it("should include height style", () => {
			text_area("Bio", "", { height: 200 });
			const html = ctx.getHtml();
			expect(html).toContain("height: 200px");
		});

		it("should use custom key", () => {
			text_area("Bio", "", { key: "my_textarea" });
			const html = ctx.getHtml();
			expect(html).toContain('id="my_textarea"');
		});
	});

	describe("toggle", () => {
		it("should append toggle HTML to buffer", () => {
			toggle("Dark mode");
			const html = ctx.getHtml();
			expect(html).toContain('class="kt-toggle-container"');
			expect(html).toContain('type="checkbox"');
			expect(html).toContain("Dark mode");
			expect(html).toContain('class="kt-toggle-switch"');
		});

		it("should return false by default", () => {
			const value = toggle("Dark mode");
			expect(value).toBe(false);
		});

		it("should return true when defaultValue is true", () => {
			const value = toggle("Dark mode", true);
			expect(value).toBe(true);
		});

		it("should include checked when value is true", () => {
			toggle("Dark mode", true);
			const html = ctx.getHtml();
			expect(html).toContain("checked");
		});

		it("should use custom key", () => {
			toggle("Dark mode", false, { key: "my_toggle" });
			const html = ctx.getHtml();
			expect(html).toContain('id="my_toggle"');
		});
	});

	describe("multiselect", () => {
		it("should append multiselect HTML to buffer", () => {
			multiselect("Tags", ["A", "B", "C"]);
			const html = ctx.getHtml();
			expect(html).toContain('class="kt-multiselect-container"');
			expect(html).toContain('type="checkbox"');
			expect(html).toContain("Tags");
			expect(html).toContain("A");
			expect(html).toContain("B");
			expect(html).toContain("C");
		});

		it("should return empty array by default", () => {
			const value = multiselect("Tags", ["A", "B", "C"]);
			expect(value).toEqual([]);
		});

		it("should return defaultValue when provided", () => {
			const value = multiselect("Tags", ["A", "B", "C"], ["A", "C"]);
			expect(value).toEqual(["A", "C"]);
		});

		it("should mark selected options as checked", () => {
			multiselect("Tags", ["A", "B", "C"], ["A", "C"]);
			const html = ctx.getHtml();
			expect(html).toMatch(/value="A"[^>]*checked/);
			expect(html).toMatch(/value="C"[^>]*checked/);
		});

		it("should use custom key", () => {
			multiselect("Tags", ["A", "B"], [], { key: "my_multiselect" });
			const html = ctx.getHtml();
			expect(html).toContain('id="my_multiselect"');
		});

		it("should throw error for empty options", () => {
			expect(() => multiselect("Tags", [])).toThrow(
				"multiselect: options array must not be empty",
			);
		});

		it("should throw error when defaultValue contains invalid option", () => {
			expect(() => multiselect("Tags", ["A", "B"], ["C"])).toThrow(
				'multiselect: defaultValue "C" must be one of the options',
			);
		});
	});

	describe("multiple widgets", () => {
		it("should append multiple widgets in order", () => {
			button("Click");
			slider("Volume", 0, 100, 50);
			const html = ctx.getHtml();
			expect(html).toContain("kt-button");
			expect(html).toContain("kt-slider-container");
			expect(html.indexOf("kt-button")).toBeLessThan(html.indexOf("kt-slider-container"));
		});
	});

	describe("without render context", () => {
		it("should throw error when no context", () => {
			setRenderContext(null);
			expect(() => button("Click")).toThrow("RenderContext is not available");
		});
	});

	describe("with session state", () => {
		let manager: SessionManager;

		beforeEach(() => {
			manager = new SessionManager();
			setSessionManager(manager);
		});

		afterEach(() => {
			setCurrentSessionId(null);
			resetSessionManager();
		});

		it("slider should use existing stored value", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);
			manager.setState(session.id, "widget_0", 75);

			const value = slider("Volume", 0, 100, 50);

			expect(value).toBe(75);
		});

		it("text_input should use existing stored value", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);
			manager.setState(session.id, "widget_0", "stored text");

			const value = text_input("Name", "default");

			expect(value).toBe("stored text");
		});

		it("selectbox should use existing stored value", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);
			manager.setState(session.id, "widget_0", "Blue");

			const value = selectbox("Color", ["Red", "Green", "Blue"], "Red");

			expect(value).toBe("Blue");
		});

		it("selectbox should throw error for empty options array", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			expect(() => selectbox("Empty", [])).toThrow("selectbox: options array must not be empty");
		});

		it("selectbox should throw error when defaultValue is not in options", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			expect(() => selectbox("Color", ["Red", "Green", "Blue"], "Yellow")).toThrow(
				'selectbox: defaultValue "Yellow" must be one of the options',
			);
		});

		it("slider should throw error when min > max", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			expect(() => slider("Volume", 100, 0, 50)).toThrow("slider: min (100) must be <= max (0)");
		});

		it("slider should throw error when defaultValue out of range", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			expect(() => slider("Volume", 0, 100, 150)).toThrow(
				"slider: defaultValue (150) must be between min (0) and max (100)",
			);
		});

		it("selectbox should use custom key with stored value", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);
			manager.setState(session.id, "my_select", "Green");

			const value = selectbox("Color", ["Red", "Green", "Blue"], "Red", {
				key: "my_select",
			});

			expect(value).toBe("Green");
		});

		it("checkbox should use existing stored value", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);
			manager.setState(session.id, "widget_0", true);

			const value = checkbox("Accept terms", false);

			expect(value).toBe(true);
		});

		it("checkbox should use custom key with stored value", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);
			manager.setState(session.id, "my_checkbox", true);

			const value = checkbox("Accept terms", false, { key: "my_checkbox" });

			expect(value).toBe(true);
		});

		it("radio should use existing stored value", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);
			manager.setState(session.id, "widget_0", "L");

			const value = radio("Size", ["S", "M", "L"], "S");

			expect(value).toBe("L");
		});

		it("radio should throw error for empty options array", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			expect(() => radio("Size", [])).toThrow("radio: options array must not be empty");
		});

		it("radio should throw error when defaultValue is not in options", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			expect(() => radio("Size", ["S", "M", "L"], "XL")).toThrow(
				'radio: defaultValue "XL" must be one of the options',
			);
		});

		it("number_input should use existing stored value", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);
			manager.setState(session.id, "widget_0", 42);

			const value = number_input("Age", 0, 120, 25);

			expect(value).toBe(42);
		});

		it("number_input should throw error when min > max", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			expect(() => number_input("Age", 100, 0, 50)).toThrow(
				"number_input: min (100) must be <= max (0)",
			);
		});

		it("number_input should throw error when defaultValue out of range", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);

			expect(() => number_input("Age", 0, 100, 150)).toThrow(
				"number_input: defaultValue (150) must be between min (0) and max (100)",
			);
		});

		it("text_area should use existing stored value", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);
			manager.setState(session.id, "widget_0", "stored bio");

			const value = text_area("Bio", "default");

			expect(value).toBe("stored bio");
		});

		it("text_area should use custom key with stored value", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);
			manager.setState(session.id, "my_textarea", "custom bio");

			const value = text_area("Bio", "default", { key: "my_textarea" });

			expect(value).toBe("custom bio");
		});

		it("toggle should use existing stored value", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);
			manager.setState(session.id, "widget_0", true);

			const value = toggle("Dark mode", false);

			expect(value).toBe(true);
		});

		it("toggle should use custom key with stored value", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);
			manager.setState(session.id, "my_toggle", true);

			const value = toggle("Dark mode", false, { key: "my_toggle" });

			expect(value).toBe(true);
		});

		it("multiselect should use existing stored value", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);
			manager.setState(session.id, "widget_0", ["B", "C"]);

			const value = multiselect("Tags", ["A", "B", "C"], []);

			expect(value).toEqual(["B", "C"]);
		});

		it("multiselect should use custom key with stored value", () => {
			const session = manager.createSession();
			setCurrentSessionId(session.id);
			manager.setState(session.id, "my_multiselect", ["A", "C"]);

			const value = multiselect("Tags", ["A", "B", "C"], [], { key: "my_multiselect" });

			expect(value).toEqual(["A", "C"]);
		});
	});
});
