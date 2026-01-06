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

	describe("nested lists", () => {
		it("should parse simple nested unordered list", () => {
			const md = "- item1\n  - nested1\n  - nested2\n- item2";
			const result = parseMarkdown(md);
			expect(result).toContain("<ul>");
			expect(result).toContain("<li>item1");
			expect(result).toContain("<li>nested1</li>");
			expect(result).toContain("<li>nested2</li>");
			expect(result).toContain("<li>item2</li>");
		});

		it("should parse deeply nested unordered list", () => {
			const md = "- level1\n  - level2\n    - level3";
			const result = parseMarkdown(md);
			expect(result).toContain("<ul>");
			expect(result).toContain("<li>level1");
			expect(result).toContain("<li>level2");
			expect(result).toContain("<li>level3</li>");
		});

		it("should parse nested ordered list", () => {
			const md = "1. first\n   1. nested first\n   2. nested second\n2. second";
			const result = parseMarkdown(md);
			expect(result).toContain("<ol>");
			expect(result).toContain("<li>first");
			expect(result).toContain("<li>nested first</li>");
			expect(result).toContain("<li>second</li>");
		});

		it("should handle mixed nested lists (ul inside ol)", () => {
			const md = "1. ordered item\n   - unordered nested\n2. another ordered";
			const result = parseMarkdown(md);
			expect(result).toContain("<ol>");
			expect(result).toContain("<ul>");
			expect(result).toContain("<li>ordered item");
			expect(result).toContain("<li>unordered nested</li>");
		});

		it("should handle inline formatting in nested lists", () => {
			const md = "- **bold** item\n  - *italic* nested";
			const result = parseMarkdown(md);
			expect(result).toContain("<strong>bold</strong>");
			expect(result).toContain("<em>italic</em>");
		});

		it("should return to parent level after nested items", () => {
			const md = "- parent1\n  - child\n- parent2";
			const result = parseMarkdown(md);
			// parent2 should be at the same level as parent1
			expect(result).toContain("<li>parent2</li>");
		});
	});

	describe("task lists", () => {
		it("should parse unchecked task item", () => {
			const md = "- [ ] unchecked task";
			const result = parseMarkdown(md);
			expect(result).toContain("<ul>");
			expect(result).toContain('<input type="checkbox" disabled>');
			expect(result).toContain("unchecked task");
			expect(result).toContain('class="kt-task-item"');
		});

		it("should parse checked task item", () => {
			const md = "- [x] checked task";
			const result = parseMarkdown(md);
			expect(result).toContain('<input type="checkbox" checked disabled>');
			expect(result).toContain("checked task");
		});

		it("should parse checked task item with uppercase X", () => {
			const md = "- [X] checked task";
			const result = parseMarkdown(md);
			expect(result).toContain('<input type="checkbox" checked disabled>');
		});

		it("should parse mixed task list", () => {
			const md = "- [ ] todo\n- [x] done\n- [ ] another todo";
			const result = parseMarkdown(md);
			expect(result).toContain('<input type="checkbox" disabled>');
			expect(result).toContain('<input type="checkbox" checked disabled>');
		});

		it("should handle inline formatting in task items", () => {
			const md = "- [ ] **bold** task";
			const result = parseMarkdown(md);
			expect(result).toContain("<strong>bold</strong>");
		});

		it("should work with asterisk syntax", () => {
			const md = "* [ ] task with asterisk";
			const result = parseMarkdown(md);
			expect(result).toContain('<input type="checkbox" disabled>');
			expect(result).toContain("task with asterisk");
		});
	});

	describe("tables", () => {
		it("should parse simple table", () => {
			const md = "| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |";
			const result = parseMarkdown(md);
			expect(result).toContain("<table>");
			expect(result).toContain("<thead>");
			expect(result).toContain("<th>Header 1</th>");
			expect(result).toContain("<th>Header 2</th>");
			expect(result).toContain("<tbody>");
			expect(result).toContain("<td>Cell 1</td>");
			expect(result).toContain("<td>Cell 2</td>");
		});

		it("should parse table with multiple rows", () => {
			const md = "| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |";
			const result = parseMarkdown(md);
			expect(result).toContain("<td>1</td>");
			expect(result).toContain("<td>2</td>");
			expect(result).toContain("<td>3</td>");
			expect(result).toContain("<td>4</td>");
		});

		it("should parse table with left alignment", () => {
			const md = "| Left |\n|:-----|\n| text |";
			const result = parseMarkdown(md);
			expect(result).toContain('style="text-align:left"');
		});

		it("should parse table with right alignment", () => {
			const md = "| Right |\n|------:|\n| text  |";
			const result = parseMarkdown(md);
			expect(result).toContain('style="text-align:right"');
		});

		it("should parse table with center alignment", () => {
			const md = "| Center |\n|:------:|\n| text   |";
			const result = parseMarkdown(md);
			expect(result).toContain('style="text-align:center"');
		});

		it("should handle inline formatting in table cells", () => {
			const md = "| **Bold** | *Italic* |\n|----------|----------|\n| text     | text     |";
			const result = parseMarkdown(md);
			expect(result).toContain("<strong>Bold</strong>");
			expect(result).toContain("<em>Italic</em>");
		});

		it("should handle table without leading/trailing pipes", () => {
			const md = "Header 1 | Header 2\n---------|---------\nCell 1   | Cell 2";
			const result = parseMarkdown(md);
			expect(result).toContain("<table>");
			expect(result).toContain("<th>Header 1</th>");
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

		it("should escape HTML in code block content", () => {
			const md = "```\n<script>alert('xss')</script>\n```";
			const result = parseMarkdown(md);
			expect(result).toContain("&lt;script&gt;");
			expect(result).not.toContain("<script>alert");
		});

		it("should escape HTML in unclosed code block", () => {
			const md = "```\n<img onerror=alert(1)>";
			const result = parseMarkdown(md);
			expect(result).toContain("&lt;img");
			expect(result).not.toContain("<img onerror");
		});

		it("should escape language name to prevent XSS", () => {
			const md = '```"><script>xss</script>\ncode\n```';
			const result = parseMarkdown(md);
			expect(result).not.toContain("<script>xss");
			expect(result).toContain("&gt;");
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

		it("should handle unclosed code block", () => {
			const md = "```typescript\nconst x = 1;";
			const result = parseMarkdown(md);
			expect(result).toContain("<pre>");
			expect(result).toContain("<code");
			expect(result).toContain("const x = 1;");
		});

		it("should handle blockquote followed by text", () => {
			const md = "> quote\ntext after";
			const result = parseMarkdown(md);
			expect(result).toContain("<blockquote>");
			expect(result).toContain("quote");
			expect(result).toContain("text after");
		});

		it("should handle list followed by text", () => {
			const md = "- item1\ntext after";
			const result = parseMarkdown(md);
			expect(result).toContain("<ul>");
			expect(result).toContain("<li>item1</li>");
			expect(result).toContain("text after");
		});
	});
});
