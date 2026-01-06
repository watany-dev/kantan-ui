import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import {
	code,
	divider,
	error,
	header,
	html,
	info,
	json,
	markdown,
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

	describe("json", () => {
		it("should render with kt-json class", () => {
			json({ a: 1 });
			expect(ctx.getHtml()).toContain('class="kt-json"');
		});

		it("should render null", () => {
			json(null);
			expect(ctx.getHtml()).toContain("kt-json-null");
			expect(ctx.getHtml()).toContain("null");
		});

		it("should render boolean true", () => {
			json(true);
			expect(ctx.getHtml()).toContain("kt-json-boolean");
			expect(ctx.getHtml()).toContain("true");
		});

		it("should render boolean false", () => {
			json(false);
			expect(ctx.getHtml()).toContain("kt-json-boolean");
			expect(ctx.getHtml()).toContain("false");
		});

		it("should render number", () => {
			json(42);
			expect(ctx.getHtml()).toContain("kt-json-number");
			expect(ctx.getHtml()).toContain("42");
		});

		it("should render string with quotes", () => {
			json("hello");
			expect(ctx.getHtml()).toContain("kt-json-string");
			expect(ctx.getHtml()).toContain('"hello"');
		});

		it("should escape HTML in string values", () => {
			json("<script>xss</script>");
			expect(ctx.getHtml()).toContain("&lt;script&gt;");
			expect(ctx.getHtml()).not.toContain("<script>");
		});

		it("should render empty array as []", () => {
			json([]);
			expect(ctx.getHtml()).toContain("[]");
		});

		it("should render empty object as {}", () => {
			json({});
			expect(ctx.getHtml()).toContain("{}");
		});

		it("should render array with details/summary", () => {
			json([1, 2, 3]);
			expect(ctx.getHtml()).toContain("<details");
			expect(ctx.getHtml()).toContain("<summary>");
			expect(ctx.getHtml()).toContain("[3]");
		});

		it("should render object with details/summary", () => {
			json({ a: 1, b: 2 });
			expect(ctx.getHtml()).toContain("<details");
			expect(ctx.getHtml()).toContain("{2}");
		});

		it("should render object keys", () => {
			json({ name: "Alice" });
			expect(ctx.getHtml()).toContain("kt-json-key");
			expect(ctx.getHtml()).toContain('"name"');
		});

		it("should expand to depth 1 by default", () => {
			json({ a: { b: 1 } });
			const output = ctx.getHtml();
			// 最初のdetailsタグはopen属性を持つ（depth 0）
			expect(output).toMatch(/<details[^>]*open/);
		});

		it("should not expand beyond default depth", () => {
			json({ a: { b: 1 } });
			const output = ctx.getHtml();
			// 2番目のdetailsタグはopen属性を持たない（depth 1）
			const matches = output.match(/<details/g);
			expect(matches?.length).toBe(2);
		});

		it("should respect expanded option", () => {
			json({ a: { b: { c: 1 } } }, { expanded: 2 });
			const output = ctx.getHtml();
			// expanded: 2 なので depth 0, 1 のdetailsはopen
			const openMatches = output.match(/<details[^>]*open/g);
			expect(openMatches?.length).toBe(2);
		});

		it("should render nested arrays", () => {
			json([
				[1, 2],
				[3, 4],
			]);
			expect(ctx.getHtml()).toContain("[2]");
		});

		it("should render mixed content", () => {
			json({ str: "text", num: 42, bool: true, nil: null });
			const output = ctx.getHtml();
			expect(output).toContain("kt-json-string");
			expect(output).toContain("kt-json-number");
			expect(output).toContain("kt-json-boolean");
			expect(output).toContain("kt-json-null");
		});
	});

	describe("code", () => {
		it("should render code block with kt-code class", () => {
			code("const x = 1;");
			expect(ctx.getHtml()).toContain('class="kt-code"');
		});

		it("should render with pre and code tags", () => {
			code("const x = 1;");
			expect(ctx.getHtml()).toContain("<pre>");
			expect(ctx.getHtml()).toContain("<code");
		});

		it("should escape HTML in code content", () => {
			code("<script>alert('xss')</script>");
			expect(ctx.getHtml()).toContain("&lt;script&gt;");
			expect(ctx.getHtml()).not.toContain("<script>alert");
		});

		it("should set data-language attribute when language provided", () => {
			code("x = 1", "python");
			expect(ctx.getHtml()).toContain('data-language="python"');
		});

		it("should set empty data-language when no language provided", () => {
			code("plain text");
			expect(ctx.getHtml()).toContain('data-language=""');
		});

		it("should escape language attribute", () => {
			code("text", '"><script>xss</script>');
			expect(ctx.getHtml()).not.toContain("<script>xss");
		});

		it("should add wrap class when wrap_lines is true", () => {
			code("text", undefined, { wrap_lines: true });
			expect(ctx.getHtml()).toContain("kt-code-wrap");
		});

		it("should not add wrap class by default", () => {
			code("text");
			expect(ctx.getHtml()).not.toContain("kt-code-wrap");
		});

		it("should render line numbers when enabled", () => {
			code("line1\nline2\nline3", undefined, { line_numbers: true });
			const output = ctx.getHtml();
			expect(output).toContain("kt-code-line-numbers");
			expect(output).toContain(">1<");
			expect(output).toContain(">2<");
			expect(output).toContain(">3<");
		});

		it("should not render line numbers by default", () => {
			code("line1\nline2");
			expect(ctx.getHtml()).not.toContain("kt-code-line-numbers");
		});

		it("should preserve newlines in code", () => {
			code("line1\nline2");
			expect(ctx.getHtml()).toContain("line1\nline2");
		});

		it("should handle empty code", () => {
			code("");
			expect(ctx.getHtml()).toContain('class="kt-code"');
		});

		it("should apply syntax highlighting for typescript", () => {
			code("const x = 1;", "typescript");
			expect(ctx.getHtml()).toContain('class="kt-code-keyword"');
		});

		it("should apply syntax highlighting for python", () => {
			code("def foo():", "python");
			expect(ctx.getHtml()).toContain('class="kt-code-keyword"');
		});

		it("should not apply highlighting for unknown language", () => {
			code("const x = 1;", "unknown");
			expect(ctx.getHtml()).not.toContain('class="kt-code-keyword"');
		});
	});

	describe("markdown", () => {
		it("should render with kt-markdown class", () => {
			markdown("# Hello");
			expect(ctx.getHtml()).toContain('class="kt-markdown"');
		});

		it("should render heading", () => {
			markdown("# Hello");
			expect(ctx.getHtml()).toContain("<h1>Hello</h1>");
		});

		it("should render bold text", () => {
			markdown("**bold**");
			expect(ctx.getHtml()).toContain("<strong>bold</strong>");
		});

		it("should render links", () => {
			markdown("[link](https://example.com)");
			expect(ctx.getHtml()).toContain('<a href="https://example.com">link</a>');
		});

		it("should sanitize by default", () => {
			markdown("<script>alert('xss')</script>");
			expect(ctx.getHtml()).not.toContain("<script>");
		});

		it("should block javascript: URLs", () => {
			markdown("[click](javascript:alert('xss'))");
			expect(ctx.getHtml()).not.toContain("javascript:");
		});

		it("should remove onclick handlers", () => {
			markdown('<div onclick="alert(1)">text</div>');
			expect(ctx.getHtml()).not.toContain("onclick");
		});

		it("should allow HTML when unsafe_allow_html is true", () => {
			markdown('<span class="custom">text</span>', { unsafe_allow_html: true });
			expect(ctx.getHtml()).toContain("<span");
		});

		it("should render complex markdown", () => {
			const md = `# Title

This is **bold** and *italic*.

- Item 1
- Item 2
`;
			markdown(md);
			const output = ctx.getHtml();
			expect(output).toContain("<h1>Title</h1>");
			expect(output).toContain("<strong>bold</strong>");
			expect(output).toContain("<em>italic</em>");
			expect(output).toContain("<ul>");
		});
	});
});
