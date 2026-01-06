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

	describe("links", () => {
		it("should parse links", () => {
			expect(parseMarkdown("[text](https://example.com)")).toContain(
				'<a href="https://example.com">text</a>',
			);
		});

		it("should parse links in text", () => {
			const result = parseMarkdown("Check [this link](https://example.com) out");
			expect(result).toContain('<a href="https://example.com">this link</a>');
		});

		it("should handle relative URLs", () => {
			expect(parseMarkdown("[link](/path/to/page)")).toContain('href="/path/to/page"');
		});
	});

	describe("images", () => {
		it("should parse images", () => {
			expect(parseMarkdown("![alt text](image.png)")).toContain(
				'<img src="image.png" alt="alt text">',
			);
		});

		it("should parse images with URLs", () => {
			const result = parseMarkdown("![logo](https://example.com/logo.png)");
			expect(result).toContain('src="https://example.com/logo.png"');
		});

		it("should handle empty alt text", () => {
			expect(parseMarkdown("![](image.png)")).toContain('alt=""');
		});
	});

	describe("unordered lists", () => {
		it("should parse unordered list with -", () => {
			const result = parseMarkdown("- item1\n- item2");
			expect(result).toContain("<ul>");
			expect(result).toContain("<li>item1</li>");
			expect(result).toContain("<li>item2</li>");
			expect(result).toContain("</ul>");
		});

		it("should parse unordered list with *", () => {
			const result = parseMarkdown("* item1\n* item2");
			expect(result).toContain("<ul>");
			expect(result).toContain("<li>item1</li>");
		});

		it("should handle inline formatting in list items", () => {
			const result = parseMarkdown("- **bold** item");
			expect(result).toContain("<strong>bold</strong>");
		});
	});

	describe("ordered lists", () => {
		it("should parse ordered list", () => {
			const result = parseMarkdown("1. first\n2. second");
			expect(result).toContain("<ol>");
			expect(result).toContain("<li>first</li>");
			expect(result).toContain("<li>second</li>");
			expect(result).toContain("</ol>");
		});

		it("should handle any numbers", () => {
			const result = parseMarkdown("1. item\n1. item\n1. item");
			expect(result).toContain("<ol>");
		});
	});

	describe("blockquotes", () => {
		it("should parse blockquote", () => {
			expect(parseMarkdown("> quote")).toContain("<blockquote>quote</blockquote>");
		});

		it("should parse multi-line blockquote", () => {
			const result = parseMarkdown("> line1\n> line2");
			expect(result).toContain("<blockquote>");
			expect(result).toContain("line1");
			expect(result).toContain("line2");
		});

		it("should handle formatting in blockquote", () => {
			const result = parseMarkdown("> **bold** quote");
			expect(result).toContain("<strong>bold</strong>");
		});
	});

	describe("code blocks", () => {
		it("should parse fenced code block", () => {
			const md = "```\ncode here\n```";
			const result = parseMarkdown(md);
			expect(result).toContain("<pre>");
			expect(result).toContain("<code>");
			expect(result).toContain("code here");
		});

		it("should parse fenced code block with language", () => {
			const md = "```typescript\nconst x = 1;\n```";
			const result = parseMarkdown(md);
			expect(result).toContain("<pre>");
			expect(result).toContain("<code");
			expect(result).toContain("const x = 1;");
		});

		it("should preserve whitespace in code blocks", () => {
			const md = "```\n  indented\n```";
			const result = parseMarkdown(md);
			expect(result).toContain("  indented");
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

		it("should handle complex document", () => {
			const md = `# Title

This is a paragraph with **bold** and *italic*.

- Item 1
- Item 2

> A quote

\`\`\`js
code()
\`\`\`
`;
			const result = parseMarkdown(md);
			expect(result).toContain("<h1>Title</h1>");
			expect(result).toContain("<strong>bold</strong>");
			expect(result).toContain("<ul>");
			expect(result).toContain("<blockquote>");
			expect(result).toContain("<pre>");
		});
	});
});
