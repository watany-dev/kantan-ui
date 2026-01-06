import { describe, expect, it } from "vitest";
import { parseMarkdown } from "../../../../src/kt/markdown/parser";

describe("parseMarkdown", () => {
	describe("headings", () => {
		it("should parse h1", () => {
			expect(parseMarkdown("# Title")).toBe("<h1>Title</h1>");
		});

		it("should parse h2", () => {
			expect(parseMarkdown("## Title")).toBe("<h2>Title</h2>");
		});

		it("should parse h3", () => {
			expect(parseMarkdown("### Title")).toBe("<h3>Title</h3>");
		});

		it("should parse h4", () => {
			expect(parseMarkdown("#### Title")).toBe("<h4>Title</h4>");
		});

		it("should parse h5", () => {
			expect(parseMarkdown("##### Title")).toBe("<h5>Title</h5>");
		});

		it("should parse h6", () => {
			expect(parseMarkdown("###### Title")).toBe("<h6>Title</h6>");
		});

		it("should handle heading with extra spaces", () => {
			expect(parseMarkdown("#  Title")).toBe("<h1>Title</h1>");
		});

		it("should not parse heading without space after #", () => {
			expect(parseMarkdown("#Title")).toContain("#Title");
		});
	});

	describe("bold", () => {
		it("should parse bold with **", () => {
			expect(parseMarkdown("**bold**")).toContain("<strong>bold</strong>");
		});

		it("should parse bold with __", () => {
			expect(parseMarkdown("__bold__")).toContain("<strong>bold</strong>");
		});

		it("should parse bold in middle of text", () => {
			const result = parseMarkdown("This is **bold** text");
			expect(result).toContain("<strong>bold</strong>");
		});
	});

	describe("italic", () => {
		it("should parse italic with *", () => {
			expect(parseMarkdown("*italic*")).toContain("<em>italic</em>");
		});

		it("should parse italic with _", () => {
			expect(parseMarkdown("_italic_")).toContain("<em>italic</em>");
		});

		it("should parse italic in middle of text", () => {
			const result = parseMarkdown("This is *italic* text");
			expect(result).toContain("<em>italic</em>");
		});
	});

	describe("inline code", () => {
		it("should parse inline code", () => {
			expect(parseMarkdown("`code`")).toContain("<code>code</code>");
		});

		it("should parse inline code in middle of text", () => {
			const result = parseMarkdown("Use `const` keyword");
			expect(result).toContain("<code>const</code>");
		});

		it("should preserve special characters in inline code", () => {
			const result = parseMarkdown("`<div>`");
			expect(result).toContain("<code>");
		});
	});

	describe("horizontal rule", () => {
		it("should parse --- as hr", () => {
			expect(parseMarkdown("---")).toBe("<hr>");
		});

		it("should parse *** as hr", () => {
			expect(parseMarkdown("***")).toBe("<hr>");
		});

		it("should parse ___ as hr", () => {
			expect(parseMarkdown("___")).toBe("<hr>");
		});

		it("should require at least 3 characters", () => {
			expect(parseMarkdown("--")).not.toBe("<hr>");
		});
	});

	describe("paragraphs", () => {
		it("should wrap text in p tags", () => {
			expect(parseMarkdown("Hello world")).toBe("<p>Hello world</p>");
		});

		it("should handle multiple paragraphs", () => {
			const result = parseMarkdown("Para 1\n\nPara 2");
			expect(result).toContain("<p>Para 1</p>");
			expect(result).toContain("<p>Para 2</p>");
		});

		it("should handle single line break as same paragraph", () => {
			const result = parseMarkdown("Line 1\nLine 2");
			// Single line break should create <br> or be in same paragraph
			expect(result).toMatch(/<p>.*Line 1.*Line 2.*<\/p>|<br>/);
		});
	});

	describe("edge cases", () => {
		it("should handle empty string", () => {
			expect(parseMarkdown("")).toBe("");
		});

		it("should handle whitespace only", () => {
			expect(parseMarkdown("   ")).toBe("");
		});

		it("should handle mixed formatting", () => {
			const result = parseMarkdown("**bold** and *italic*");
			expect(result).toContain("<strong>bold</strong>");
			expect(result).toContain("<em>italic</em>");
		});
	});
});
