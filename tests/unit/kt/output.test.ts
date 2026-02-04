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
			expect(ctx.getHtml()).toContain("Hello World");
			expect(ctx.getHtml()).toContain('class="kt-write');
		});

		it("should convert numbers to string", () => {
			write(42);
			expect(ctx.getHtml()).toContain("42");
			expect(ctx.getHtml()).toContain('class="kt-write');
		});

		it("should accept multiple arguments", () => {
			write("x =", 42);
			const html = ctx.getHtml();
			expect(html).toContain("x =");
			expect(html).toContain("42");
		});

		it("should accept mixed types", () => {
			write("Name:", "Alice", "Age:", 30);
			const html = ctx.getHtml();
			expect(html).toContain("Name:");
			expect(html).toContain("Alice");
			expect(html).toContain("Age:");
			expect(html).toContain("30");
		});

		it("should render number", () => {
			write(42);
			const html = ctx.getHtml();
			expect(html).toContain("42");
			expect(html).toContain('class="kt-write"');
		});

		it("should render boolean true", () => {
			write(true);
			expect(ctx.getHtml()).toContain("true");
		});

		it("should render boolean false", () => {
			write(false);
			expect(ctx.getHtml()).toContain("false");
		});

		it("should render null as None", () => {
			write(null);
			expect(ctx.getHtml()).toContain("None");
			expect(ctx.getHtml()).toContain('class="kt-write kt-none"');
		});

		it("should render undefined as None", () => {
			write(undefined);
			expect(ctx.getHtml()).toContain("None");
			expect(ctx.getHtml()).toContain("kt-none");
		});

		it("should render bold text in markdown", () => {
			write("Hello **world**!");
			expect(ctx.getHtml()).toContain("<strong>world</strong>");
		});

		it("should render heading in markdown", () => {
			write("# Title");
			expect(ctx.getHtml()).toContain("<h1>");
			expect(ctx.getHtml()).toContain("Title");
		});

		it("should render italic text in markdown", () => {
			write("This is *italic*");
			expect(ctx.getHtml()).toContain("<em>italic</em>");
		});

		it("should render inline code in markdown", () => {
			write("Use `code` here");
			expect(ctx.getHtml()).toContain("<code>code</code>");
		});

		it("should render links in markdown", () => {
			write("[Link](https://example.com)");
			expect(ctx.getHtml()).toContain('href="https://example.com"');
		});

		it("should have kt-markdown class for string", () => {
			write("**bold**");
			expect(ctx.getHtml()).toContain('class="kt-write kt-markdown"');
		});

		it("should sanitize script tags in markdown", () => {
			write("<script>alert('xss')</script>");
			expect(ctx.getHtml()).not.toContain("<script>");
		});

		it("should sanitize onclick handlers", () => {
			write('<a onclick="alert(1)">click</a>');
			expect(ctx.getHtml()).not.toContain("onclick");
		});

		it("should sanitize javascript: URLs", () => {
			write("[link](javascript:alert(1))");
			expect(ctx.getHtml()).not.toContain("javascript:");
		});

		it("should allow safe HTML elements", () => {
			write("**bold** and *italic*");
			expect(ctx.getHtml()).toContain("<strong>");
			expect(ctx.getHtml()).toContain("<em>");
		});

		it("should render object as JSON tree", () => {
			write({ name: "Alice", age: 30 });
			expect(ctx.getHtml()).toContain('class="kt-write kt-json"');
			expect(ctx.getHtml()).toContain('"name"');
			expect(ctx.getHtml()).toContain('"Alice"');
		});

		it("should render nested object", () => {
			write({ user: { name: "Bob" } });
			expect(ctx.getHtml()).toContain("user");
			expect(ctx.getHtml()).toContain("Bob");
		});

		it("should escape HTML in object values", () => {
			write({ html: "<script>alert(1)</script>" });
			expect(ctx.getHtml()).not.toContain("<script>alert");
		});

		it("should render array as JSON tree", () => {
			write([1, 2, 3]);
			expect(ctx.getHtml()).toContain('class="kt-write kt-json"');
			expect(ctx.getHtml()).toContain("1");
			expect(ctx.getHtml()).toContain("2");
		});

		it("should render array of objects", () => {
			write([{ id: 1 }, { id: 2 }]);
			expect(ctx.getHtml()).toContain("id");
		});

		it("should render nested arrays", () => {
			write([
				[1, 2],
				[3, 4],
			]);
			expect(ctx.getHtml()).toContain("kt-json");
		});

		it("should escape HTML in array values", () => {
			write(["<script>alert(1)</script>"]);
			expect(ctx.getHtml()).not.toContain("<script>alert");
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
		it("should render plain text without markdown", () => {
			text("**not bold**");
			expect(ctx.getHtml()).toContain("**not bold**");
			expect(ctx.getHtml()).not.toContain("<strong>");
		});

		it("should use monospace font class", () => {
			text("code output");
			expect(ctx.getHtml()).toContain('class="kt-text"');
		});

		it("should use pre element", () => {
			text("line 1\nline 2");
			expect(ctx.getHtml()).toContain("<pre");
		});

		it("should escape HTML", () => {
			text("<script>alert(1)</script>");
			expect(ctx.getHtml()).toContain("&lt;script&gt;");
			expect(ctx.getHtml()).not.toContain("<script>alert");
		});

		it("should preserve whitespace", () => {
			text("  indented");
			expect(ctx.getHtml()).toContain("  indented");
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
			const output = ctx.getHtml();
			expect(output).toContain('<h1 class="kt-title">Title</h1>');
			expect(output).toContain("Content");
			expect(output).toContain("\n");
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

		it("should apply custom background color", () => {
			success("Done", { background: "#f0f0f0" });
			const html = ctx.getHtml();
			expect(html).toContain('style="background-color:#f0f0f0"');
		});

		it("should apply custom text color", () => {
			success("Done", { color: "#333333" });
			const html = ctx.getHtml();
			expect(html).toContain('style="color:#333333"');
		});

		it("should apply custom border color", () => {
			success("Done", { border: "#cccccc" });
			const html = ctx.getHtml();
			expect(html).toContain('style="border-color:#cccccc"');
		});

		it("should apply multiple custom colors", () => {
			success("Done", { background: "#fff", color: "#000", border: "#ccc" });
			const html = ctx.getHtml();
			expect(html).toContain("background-color:#fff");
			expect(html).toContain("color:#000");
			expect(html).toContain("border-color:#ccc");
		});

		it("should escape HTML in custom colors", () => {
			success("Done", { background: '"><script>xss</script>' });
			const html = ctx.getHtml();
			expect(html).not.toContain("<script>");
			expect(html).toContain("&lt;script&gt;");
		});

		it("should not add style attribute when no custom colors", () => {
			success("Done");
			const html = ctx.getHtml();
			expect(html).not.toContain("style=");
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

	describe("write - exotic types", () => {
		it("should stringify Symbol via fallback path", () => {
			write(Symbol("test"));
			expect(ctx.getHtml()).toContain("Symbol(test)");
			expect(ctx.getHtml()).toContain("kt-write");
		});
	});

	describe("json - renderJsonTree fallback", () => {
		it("should render undefined value inside object", () => {
			json({ key: undefined } as Record<string, unknown>);
			expect(ctx.getHtml()).toContain("undefined");
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
			expect(ctx.getHtml()).toContain('class="kt-hl-keyword"');
		});

		it("should apply syntax highlighting for python", () => {
			code("def foo():", "python");
			expect(ctx.getHtml()).toContain('class="kt-hl-keyword"');
		});

		it("should not apply highlighting for unknown language", () => {
			code("const x = 1;", "unknown");
			expect(ctx.getHtml()).not.toContain('class="kt-hl-keyword"');
		});

		it("should render copy button when copy_button is true", () => {
			code("const x = 1;", "typescript", { copy_button: true });
			const output = ctx.getHtml();
			expect(output).toContain("kt-code-copy");
			expect(output).toContain("data-kt-copy");
		});

		it("should not render copy button by default", () => {
			code("const x = 1;");
			expect(ctx.getHtml()).not.toContain("kt-code-copy");
		});

		it("should include data-code attribute when copy_button is true", () => {
			code("const x = 1;", undefined, { copy_button: true });
			expect(ctx.getHtml()).toContain("data-code=");
		});

		it("should escape HTML in data-code attribute", () => {
			code('<script>alert("xss")</script>', undefined, { copy_button: true });
			const output = ctx.getHtml();
			expect(output).toContain("data-code=");
			expect(output).not.toContain('data-code="<script>');
		});

		it("should combine copy_button with other options", () => {
			code("line1\nline2", "typescript", {
				copy_button: true,
				line_numbers: true,
				wrap_lines: true,
			});
			const output = ctx.getHtml();
			expect(output).toContain("kt-code-copy");
			expect(output).toContain("kt-code-line-numbers");
			expect(output).toContain("kt-code-wrap");
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
