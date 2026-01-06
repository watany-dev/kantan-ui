import { describe, expect, it } from "vitest";
import { sanitizeMarkdownHtml } from "../../../../src/kt/markdown/sanitizer";

describe("sanitizeMarkdownHtml", () => {
	describe("allowed tags", () => {
		it("should allow h1-h6 tags", () => {
			expect(sanitizeMarkdownHtml("<h1>Title</h1>")).toBe("<h1>Title</h1>");
			expect(sanitizeMarkdownHtml("<h2>Title</h2>")).toBe("<h2>Title</h2>");
			expect(sanitizeMarkdownHtml("<h3>Title</h3>")).toBe("<h3>Title</h3>");
			expect(sanitizeMarkdownHtml("<h4>Title</h4>")).toBe("<h4>Title</h4>");
			expect(sanitizeMarkdownHtml("<h5>Title</h5>")).toBe("<h5>Title</h5>");
			expect(sanitizeMarkdownHtml("<h6>Title</h6>")).toBe("<h6>Title</h6>");
		});

		it("should allow p, br, hr tags", () => {
			expect(sanitizeMarkdownHtml("<p>text</p>")).toBe("<p>text</p>");
			expect(sanitizeMarkdownHtml("<br>")).toBe("<br>");
			expect(sanitizeMarkdownHtml("<br/>")).toBe("<br/>");
			expect(sanitizeMarkdownHtml("<hr>")).toBe("<hr>");
		});

		it("should allow strong and em tags", () => {
			expect(sanitizeMarkdownHtml("<strong>bold</strong>")).toBe("<strong>bold</strong>");
			expect(sanitizeMarkdownHtml("<em>italic</em>")).toBe("<em>italic</em>");
		});

		it("should allow code and pre tags", () => {
			expect(sanitizeMarkdownHtml("<code>code</code>")).toBe("<code>code</code>");
			expect(sanitizeMarkdownHtml("<pre>code</pre>")).toBe("<pre>code</pre>");
		});

		it("should allow list tags", () => {
			expect(sanitizeMarkdownHtml("<ul><li>item</li></ul>")).toBe("<ul><li>item</li></ul>");
			expect(sanitizeMarkdownHtml("<ol><li>item</li></ol>")).toBe("<ol><li>item</li></ol>");
		});

		it("should allow blockquote tag", () => {
			expect(sanitizeMarkdownHtml("<blockquote>quote</blockquote>")).toBe(
				"<blockquote>quote</blockquote>",
			);
		});

		it("should allow a tags with safe href", () => {
			expect(sanitizeMarkdownHtml('<a href="https://example.com">link</a>')).toBe(
				'<a href="https://example.com">link</a>',
			);
			expect(sanitizeMarkdownHtml('<a href="http://example.com">link</a>')).toBe(
				'<a href="http://example.com">link</a>',
			);
			expect(sanitizeMarkdownHtml('<a href="/path">link</a>')).toBe('<a href="/path">link</a>');
		});

		it("should allow img tags with safe src", () => {
			expect(sanitizeMarkdownHtml('<img src="image.png" alt="alt">')).toBe(
				'<img src="image.png" alt="alt">',
			);
			expect(sanitizeMarkdownHtml('<img src="https://example.com/img.png">')).toBe(
				'<img src="https://example.com/img.png">',
			);
		});

		it("should allow table tags", () => {
			const table =
				"<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>";
			expect(sanitizeMarkdownHtml(table)).toBe(table);
		});
	});

	describe("blocked tags", () => {
		it("should remove script tags", () => {
			expect(sanitizeMarkdownHtml("<script>alert(1)</script>")).not.toContain("<script");
			expect(sanitizeMarkdownHtml("<script>alert(1)</script>")).not.toContain("alert");
		});

		it("should remove style tags", () => {
			expect(sanitizeMarkdownHtml("<style>body{}</style>")).not.toContain("<style");
		});

		it("should remove iframe tags", () => {
			expect(sanitizeMarkdownHtml('<iframe src="evil.html"></iframe>')).not.toContain("<iframe");
		});

		it("should remove object tags", () => {
			expect(sanitizeMarkdownHtml('<object data="evil.swf"></object>')).not.toContain("<object");
		});

		it("should remove embed tags", () => {
			expect(sanitizeMarkdownHtml('<embed src="evil.swf">')).not.toContain("<embed");
		});

		it("should remove form tags", () => {
			expect(sanitizeMarkdownHtml('<form action="evil"></form>')).not.toContain("<form");
		});

		it("should remove input tags", () => {
			expect(sanitizeMarkdownHtml('<input type="text">')).not.toContain("<input");
		});
	});

	describe("blocked attributes", () => {
		it("should remove onclick handlers", () => {
			const result = sanitizeMarkdownHtml('<div onclick="alert(1)">text</div>');
			expect(result).not.toContain("onclick");
		});

		it("should remove onerror handlers", () => {
			const result = sanitizeMarkdownHtml('<img src="x" onerror="alert(1)">');
			expect(result).not.toContain("onerror");
		});

		it("should remove onload handlers", () => {
			const result = sanitizeMarkdownHtml('<body onload="alert(1)">');
			expect(result).not.toContain("onload");
		});

		it("should remove onmouseover handlers", () => {
			const result = sanitizeMarkdownHtml('<div onmouseover="alert(1)">text</div>');
			expect(result).not.toContain("onmouseover");
		});
	});

	describe("blocked URLs", () => {
		it("should block javascript: URLs in href", () => {
			const result = sanitizeMarkdownHtml('<a href="javascript:alert(1)">click</a>');
			expect(result).not.toContain("javascript:");
		});

		it("should block javascript: URLs in src", () => {
			const result = sanitizeMarkdownHtml('<img src="javascript:alert(1)">');
			expect(result).not.toContain("javascript:");
		});

		it("should block vbscript: URLs", () => {
			const result = sanitizeMarkdownHtml('<a href="vbscript:msgbox(1)">click</a>');
			expect(result).not.toContain("vbscript:");
		});

		it("should block data: URLs with base64", () => {
			const result = sanitizeMarkdownHtml('<a href="data:text/html;base64,PHNjcmlwdD4=">click</a>');
			expect(result).not.toContain("data:");
		});

		it("should allow data: URLs for images", () => {
			// data: URLs for images should be allowed
			const result = sanitizeMarkdownHtml('<img src="data:image/png;base64,iVBOR...">');
			expect(result).toContain("data:image/png");
		});
	});

	describe("edge cases", () => {
		it("should handle empty string", () => {
			expect(sanitizeMarkdownHtml("")).toBe("");
		});

		it("should handle plain text", () => {
			expect(sanitizeMarkdownHtml("Hello world")).toBe("Hello world");
		});

		it("should handle nested tags", () => {
			const html = "<p><strong><em>text</em></strong></p>";
			expect(sanitizeMarkdownHtml(html)).toBe(html);
		});

		it("should handle mixed allowed and blocked tags", () => {
			const result = sanitizeMarkdownHtml("<p>text</p><script>evil</script><p>more</p>");
			expect(result).toContain("<p>text</p>");
			expect(result).toContain("<p>more</p>");
			expect(result).not.toContain("<script>");
		});

		it("should handle self-closing tags", () => {
			const result = sanitizeMarkdownHtml('<img src="test.png" />');
			expect(result).toContain("<img");
			expect(result).toContain("/>");
		});

		it("should handle attributes with single quotes", () => {
			const result = sanitizeMarkdownHtml("<a href='https://example.com'>link</a>");
			expect(result).toContain('href="https://example.com"');
		});

		it("should handle attributes without quotes", () => {
			const result = sanitizeMarkdownHtml("<a href=https://example.com>link</a>");
			expect(result).toContain('href="https://example.com"');
		});

		it("should handle disallowed tags preserving content", () => {
			const result = sanitizeMarkdownHtml("<div>content</div>");
			expect(result).toBe("content");
			expect(result).not.toContain("<div>");
		});

		it("should handle empty attributes", () => {
			const result = sanitizeMarkdownHtml("<img alt>");
			expect(result).toContain("<img");
		});

		it("should handle malformed tags gracefully", () => {
			const result = sanitizeMarkdownHtml("<p>text<");
			expect(result).toContain("text");
		});
	});
});
