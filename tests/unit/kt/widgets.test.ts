import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import { button, selectbox, slider, text_input } from "../../../src/kt/widgets";
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

			expect(() => selectbox("Empty", [])).toThrow(
				"selectbox: options array must not be empty",
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
	});
});
