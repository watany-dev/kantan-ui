import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import {
	divider,
	error,
	header,
	html,
	info,
	subheader,
	success,
	text,
	title,
	warning,
	write,
} from "../../../src/kt/output";

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

	describe("success", () => {
		it("should output success alert with kt-alert-success class", () => {
			success("Operation completed");
			const html = ctx.getHtml();
			expect(html).toContain('class="kt-alert kt-alert-success"');
			expect(html).toContain("Operation completed");
		});

		it("should escape HTML in message", () => {
			success("<script>alert('xss')</script>");
			expect(ctx.getHtml()).toContain("&lt;script&gt;");
		});

		it("should include default success icon", () => {
			success("Done");
			expect(ctx.getHtml()).toContain("✓");
		});

		it("should use custom icon when provided", () => {
			success("Done", { icon: "👍" });
			const html = ctx.getHtml();
			expect(html).toContain("👍");
			expect(html).not.toContain("✓");
		});

		it("should escape HTML in custom icon", () => {
			success("Done", { icon: '<script>alert("xss")</script>' });
			const html = ctx.getHtml();
			expect(html).toContain("&lt;script&gt;");
			expect(html).not.toContain("<script>");
		});
	});

	describe("error", () => {
		it("should output error alert with kt-alert-error class", () => {
			error("Something went wrong");
			const html = ctx.getHtml();
			expect(html).toContain('class="kt-alert kt-alert-error"');
			expect(html).toContain("Something went wrong");
		});

		it("should include default error icon", () => {
			error("Failed");
			expect(ctx.getHtml()).toContain("✕");
		});
	});

	describe("warning", () => {
		it("should output warning alert with kt-alert-warning class", () => {
			warning("Please check your input");
			const html = ctx.getHtml();
			expect(html).toContain('class="kt-alert kt-alert-warning"');
			expect(html).toContain("Please check your input");
		});

		it("should include default warning icon", () => {
			warning("Caution");
			expect(ctx.getHtml()).toContain("⚠");
		});
	});

	describe("info", () => {
		it("should output info alert with kt-alert-info class", () => {
			info("FYI: New features available");
			const html = ctx.getHtml();
			expect(html).toContain('class="kt-alert kt-alert-info"');
			expect(html).toContain("FYI: New features available");
		});

		it("should include default info icon", () => {
			info("Information");
			expect(ctx.getHtml()).toContain("ℹ");
		});
	});
});
