import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearContext, setContext } from "../../../src/runtime/context";
import { button, renderButton } from "../../../src/widgets/button";
import { resetWidgetCounter } from "../../../src/widgets/registry";

describe("button", () => {
	beforeEach(() => {
		resetWidgetCounter();
		clearContext();
	});

	afterEach(() => {
		clearContext();
	});

	describe("button function", () => {
		it("should return false when not pressed", () => {
			setContext({ event: undefined });

			const result = button("Click me");

			expect(result).toBe(false);
		});

		it("should return true when pressed", () => {
			setContext({ event: { widgetId: "widget_0", value: "clicked" } });

			const result = button("Click me");

			expect(result).toBe(true);
		});

		it("should return false when different widget pressed", () => {
			setContext({ event: { widgetId: "other_widget", value: "clicked" } });

			const result = button("Click me");

			expect(result).toBe(false);
		});

		it("should use custom key when provided", () => {
			setContext({ event: { widgetId: "my_button", value: "clicked" } });

			const result = button("Click me", { key: "my_button" });

			expect(result).toBe(true);
		});

		it("should generate sequential ids for multiple buttons", () => {
			setContext({ event: { widgetId: "widget_1", value: "clicked" } });

			const result1 = button("First");
			const result2 = button("Second");

			expect(result1).toBe(false);
			expect(result2).toBe(true);
		});
	});

	describe("renderButton", () => {
		it("should render button HTML", () => {
			const html = renderButton("Click me");

			expect(html).toContain("<button");
			expect(html).toContain("Click me");
			expect(html).toContain("sendEvent");
			expect(html).toContain("kt-button");
		});

		it("should escape HTML in label", () => {
			const html = renderButton("<script>alert('xss')</script>");

			expect(html).not.toContain("<script>");
			expect(html).toContain("&lt;script&gt;");
		});

		it("should use custom key in id", () => {
			const html = renderButton("Click me", { key: "my_button" });

			expect(html).toContain('id="my_button"');
		});
	});
});
