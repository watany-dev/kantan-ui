import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import { form } from "../../../src/kt/form";

describe("Form API", () => {
	let ctx: RenderContext;

	beforeEach(() => {
		ctx = new RenderContext();
		setRenderContext(ctx);
	});

	afterEach(() => {
		setRenderContext(null);
	});

	describe("form", () => {
		it("should wrap content in form element with kt-form class", () => {
			form("my_form", () => {
				// empty form
			});
			const html = ctx.getHtml();
			expect(html).toContain("<form");
			expect(html).toContain('class="kt-form"');
			expect(html).toContain("</form>");
		});

		it("should set data-form-key attribute", () => {
			form("user_registration", () => {
				// empty form
			});
			const html = ctx.getHtml();
			expect(html).toContain('data-form-key="user_registration"');
		});

		it("should render content inside form", () => {
			form("test_form", () => {
				ctx.append('<input type="text" name="username">');
			});
			const html = ctx.getHtml();
			expect(html).toContain('<input type="text" name="username">');
			expect(html).toMatch(/<form[^>]*>.*<input.*<\/form>/s);
		});

		it("should escape form key for security", () => {
			form('<script>alert("xss")</script>', () => {
				// empty form
			});
			const html = ctx.getHtml();
			expect(html).toContain("&lt;script&gt;");
			expect(html).not.toContain("<script>");
		});

		it("should accept clear_on_submit option", () => {
			form(
				"test_form",
				() => {
					// empty form
				},
				{ clear_on_submit: true },
			);
			const html = ctx.getHtml();
			expect(html).toContain('data-clear-on-submit="true"');
		});

		it("should default clear_on_submit to false", () => {
			form("test_form", () => {
				// empty form
			});
			const html = ctx.getHtml();
			expect(html).not.toContain("data-clear-on-submit");
		});
	});

	describe("without render context", () => {
		it("should throw error when no context", () => {
			setRenderContext(null);
			expect(() =>
				form("test", () => {
					// empty
				}),
			).toThrow("RenderContext is not available");
		});
	});
});
