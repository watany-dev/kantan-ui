import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import { divider, header, html, subheader, text, title, write } from "../../../src/kt/output";

describe("Output APIs", () => {
	let ctx: RenderContext;

	beforeEach(() => {
		ctx = new RenderContext();
		setRenderContext(ctx);
	});

	afterEach(() => {
		setRenderContext(null);
	});

	describe("write", () => {
		it("should output text with kt-write class", () => {
			write("Hello World");
			expect(ctx.getHtml()).toBe('<div class="kt-write">Hello World</div>');
		});

		it("should escape HTML in content", () => {
			write("<script>alert('xss')</script>");
			expect(ctx.getHtml()).toContain("&lt;script&gt;");
		});

		it("should convert numbers to string", () => {
			write(42);
			expect(ctx.getHtml()).toBe('<div class="kt-write">42</div>');
		});
	});

	describe("title", () => {
		it("should output h1 with kt-title class", () => {
			title("My App");
			expect(ctx.getHtml()).toBe('<h1 class="kt-title">My App</h1>');
		});
	});

	describe("header", () => {
		it("should output h2 with kt-header class", () => {
			header("Section");
			expect(ctx.getHtml()).toBe('<h2 class="kt-header">Section</h2>');
		});
	});

	describe("subheader", () => {
		it("should output h3 with kt-subheader class", () => {
			subheader("Subsection");
			expect(ctx.getHtml()).toBe('<h3 class="kt-subheader">Subsection</h3>');
		});
	});

	describe("text", () => {
		it("should be an alias for write", () => {
			text("Some text");
			expect(ctx.getHtml()).toBe('<div class="kt-write">Some text</div>');
		});
	});

	describe("divider", () => {
		it("should output hr with kt-divider class", () => {
			divider();
			expect(ctx.getHtml()).toBe('<hr class="kt-divider" />');
		});
	});

	describe("html", () => {
		it("should output raw HTML without escaping", () => {
			html('<div class="custom"><b>Bold</b></div>');
			expect(ctx.getHtml()).toBe('<div class="custom"><b>Bold</b></div>');
		});
	});

	describe("multiple outputs", () => {
		it("should combine outputs with newlines", () => {
			title("Title");
			write("Content");
			expect(ctx.getHtml()).toBe(
				'<h1 class="kt-title">Title</h1>\n<div class="kt-write">Content</div>',
			);
		});
	});

	describe("without render context", () => {
		it("should throw error when no context", () => {
			setRenderContext(null);
			expect(() => write("test")).toThrow("RenderContext is not available");
		});
	});
});
