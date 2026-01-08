import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import {
	form,
	form_submit_button,
	validation_error,
	validation_errors,
} from "../../../src/kt/form";
import * as registry from "../../../src/widgets/registry";

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

	describe("form_submit_button", () => {
		it("should output button with type=submit", () => {
			form_submit_button("Submit");
			const html = ctx.getHtml();
			expect(html).toContain('type="submit"');
			expect(html).toContain('class="kt-form-submit"');
		});

		it("should display button label", () => {
			form_submit_button("Send Message");
			const html = ctx.getHtml();
			expect(html).toContain("Send Message");
		});

		it("should escape HTML in label", () => {
			form_submit_button('<script>alert("xss")</script>');
			const html = ctx.getHtml();
			expect(html).toContain("&lt;script&gt;");
		});

		it("should support disabled option", () => {
			form_submit_button("Submit", { disabled: true });
			const html = ctx.getHtml();
			expect(html).toContain("disabled");
		});

		it("should return false when not pressed", () => {
			const result = form_submit_button("Submit");
			expect(result).toBe(false);
		});

		it("should return true when button is pressed", () => {
			// Mock the isButtonPressed to return true
			const mockIsPressed = vi.spyOn(registry, "getWidgetValue");
			mockIsPressed.mockReturnValue(true);

			const result = form_submit_button("Submit", { key: "test_submit" });
			expect(result).toBe(true);

			mockIsPressed.mockRestore();
		});

		it("should use kt-form-submit class", () => {
			form_submit_button("Submit");
			const html = ctx.getHtml();
			expect(html).toContain('class="kt-form-submit"');
		});

		it("should have data-kt-event=submit attribute", () => {
			form_submit_button("Submit");
			const html = ctx.getHtml();
			expect(html).toContain('data-kt-event="submit"');
		});
	});

	describe("validation_error", () => {
		it("should display single error message", () => {
			validation_error("Email is required");
			const html = ctx.getHtml();
			expect(html).toContain("Email is required");
			expect(html).toContain('class="kt-validation-error"');
		});

		it("should have role=alert for accessibility", () => {
			validation_error("Field is required");
			const html = ctx.getHtml();
			expect(html).toContain('role="alert"');
		});

		it("should escape HTML in error message", () => {
			validation_error('<script>alert("xss")</script>');
			const html = ctx.getHtml();
			expect(html).toContain("&lt;script&gt;");
			expect(html).not.toContain("<script>alert");
		});
	});

	describe("validation_errors", () => {
		it("should display multiple error messages as list", () => {
			validation_errors(["Name is required", "Email is required"]);
			const html = ctx.getHtml();
			expect(html).toContain("Name is required");
			expect(html).toContain("Email is required");
			expect(html).toContain("<ul>");
			expect(html).toContain("<li>");
		});

		it("should have kt-validation-errors class", () => {
			validation_errors(["Error 1", "Error 2"]);
			const html = ctx.getHtml();
			expect(html).toContain('class="kt-validation-errors"');
		});

		it("should have role=alert for accessibility", () => {
			validation_errors(["Error"]);
			const html = ctx.getHtml();
			expect(html).toContain('role="alert"');
		});

		it("should escape HTML in error messages", () => {
			validation_errors(['<script>alert("xss")</script>', "Normal error"]);
			const html = ctx.getHtml();
			expect(html).toContain("&lt;script&gt;");
			expect(html).not.toContain("<script>alert");
		});

		it("should not output anything for empty array", () => {
			validation_errors([]);
			const html = ctx.getHtml();
			expect(html).toBe("");
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

		it("should throw error for form_submit_button when no context", () => {
			setRenderContext(null);
			expect(() => form_submit_button("Submit")).toThrow("RenderContext is not available");
		});

		it("should throw error for validation_error when no context", () => {
			setRenderContext(null);
			expect(() => validation_error("Error")).toThrow("RenderContext is not available");
		});

		it("should throw error for validation_errors when no context", () => {
			setRenderContext(null);
			expect(() => validation_errors(["Error"])).toThrow("RenderContext is not available");
		});
	});
});
