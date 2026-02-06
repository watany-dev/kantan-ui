import fc from "fast-check";
import { describe, expect, it } from "vitest";
import "../../pbt-setup";
import { sanitizeMarkdownHtml } from "../../../../src/kt/markdown/sanitizer";

/** Tags that should be stripped along with their content */
const DANGEROUS_TAGS = ["script", "style", "iframe", "object", "embed", "form"];

describe("sanitizeMarkdownHtml property-based tests", () => {
	// ========================================================================
	// Invariant: output never contains dangerous tags
	// ========================================================================
	it("output never contains <script> tags", () => {
		fc.assert(
			fc.property(fc.string(), fc.string(), (prefix, suffix) => {
				const html = `${prefix}<script>alert(1)</script>${suffix}`;
				const result = sanitizeMarkdownHtml(html);
				expect(result.toLowerCase()).not.toMatch(/<script[\s>]/);
			}),
		);
	});

	it("output never contains any dangerous tags", () => {
		const tagArb = fc.constantFrom(...DANGEROUS_TAGS);
		const contentArb = fc.stringMatching(/^[a-zA-Z0-9 ]{0,30}$/);

		fc.assert(
			fc.property(tagArb, contentArb, (tag, content) => {
				const html = `<${tag}>${content}</${tag}>`;
				const result = sanitizeMarkdownHtml(html);
				const lower = result.toLowerCase();
				expect(lower).not.toMatch(new RegExp(`<${tag}[\\s>]`));
				expect(lower).not.toContain(`</${tag}>`);
			}),
		);
	});

	it("dangerous self-closing tags are also stripped", () => {
		const tagArb = fc.constantFrom(...DANGEROUS_TAGS);
		const attrArb = fc.constantFrom("", ' src="x"', ' type="text"');

		fc.assert(
			fc.property(tagArb, attrArb, (tag, attr) => {
				const html = `before<${tag}${attr}/>after`;
				const result = sanitizeMarkdownHtml(html);
				expect(result.toLowerCase()).not.toMatch(new RegExp(`<${tag}`));
			}),
		);
	});

	// ========================================================================
	// Invariant: event handlers always removed
	// ========================================================================
	it("output never contains event handler attributes", () => {
		const handlerArb = fc.constantFrom(
			"onclick",
			"onerror",
			"onload",
			"onmouseover",
			"onfocus",
			"onblur",
			"onsubmit",
			"onchange",
			"oninput",
		);
		const tagArb = fc.constantFrom("div", "p", "a", "img");

		fc.assert(
			fc.property(tagArb, handlerArb, (tag, handler) => {
				const html = `<${tag} ${handler}="alert(1)">text</${tag}>`;
				const result = sanitizeMarkdownHtml(html);
				expect(result.toLowerCase()).not.toMatch(new RegExp(`${handler}\\s*=`));
			}),
		);
	});

	it("event handlers are removed even with different quote styles", () => {
		const quoteStyleArb = fc.constantFrom(
			'onclick="alert(1)"',
			"onclick='alert(1)'",
			"onclick=alert(1)",
		);

		fc.assert(
			fc.property(quoteStyleArb, (handler) => {
				const html = `<div ${handler}>text</div>`;
				const result = sanitizeMarkdownHtml(html);
				expect(result.toLowerCase()).not.toMatch(/onclick\s*=/);
			}),
		);
	});

	// ========================================================================
	// Invariant: URL safety (javascript:, vbscript:, data:)
	// ========================================================================
	it("javascript: URLs in href are neutralized", () => {
		const payloadArb = fc.constantFrom("alert(1)", "void(0)", "document.cookie");

		fc.assert(
			fc.property(payloadArb, (payload) => {
				const html = `<a href="javascript:${payload}">click</a>`;
				const result = sanitizeMarkdownHtml(html);
				expect(result.toLowerCase()).not.toMatch(/javascript\s*:/);
			}),
		);
	});

	it("vbscript: URLs in href are neutralized", () => {
		fc.assert(
			fc.property(fc.stringMatching(/^[a-zA-Z0-9]{0,20}$/), (payload) => {
				const html = `<a href="vbscript:${payload}">click</a>`;
				const result = sanitizeMarkdownHtml(html);
				expect(result.toLowerCase()).not.toMatch(/vbscript\s*:/);
			}),
		);
	});

	it("data: URLs are blocked except for data:image/", () => {
		const dangerousDataArb = fc.constantFrom(
			"data:text/html;base64,PHNjcmlwdD4=",
			"data:application/javascript;base64,YWxlcnQo",
		);

		fc.assert(
			fc.property(dangerousDataArb, (data) => {
				const html = `<a href="${data}">click</a>`;
				const result = sanitizeMarkdownHtml(html);
				// The dangerous data: URL should be neutralized (set to empty)
				expect(result).not.toContain(data);
			}),
		);
	});

	it("data:image/ URLs in img src are preserved", () => {
		const safeDataArb = fc.constantFrom(
			"data:image/png;base64,iVBOR",
			"data:image/gif;base64,R0lGOD",
		);

		fc.assert(
			fc.property(safeDataArb, (data) => {
				const html = `<img src="${data}" alt="test">`;
				const result = sanitizeMarkdownHtml(html);
				expect(result).toContain(data);
			}),
		);
	});

	// ========================================================================
	// Invariant: allowed tags are preserved
	// ========================================================================
	it("simple allowed tags are preserved in output", () => {
		const tagArb = fc.constantFrom(
			"p",
			"strong",
			"em",
			"code",
			"h1",
			"h2",
			"h3",
			"ul",
			"ol",
			"li",
			"blockquote",
			"hr",
			"br",
			"pre",
			"table",
			"tr",
			"td",
			"th",
		);

		fc.assert(
			fc.property(tagArb, (tag) => {
				const html = `<${tag}>content</${tag}>`;
				const result = sanitizeMarkdownHtml(html);
				expect(result).toContain(`<${tag}>`);
			}),
		);
	});

	// ========================================================================
	// Invariant: non-allowed tags are removed but text content preserved
	// ========================================================================
	it("unknown tags are removed but their text content is kept", () => {
		const tagArb = fc.constantFrom("div", "span", "section", "article", "header", "footer");
		const contentArb = fc.stringMatching(/^[a-zA-Z0-9 ]{1,30}$/);

		fc.assert(
			fc.property(tagArb, contentArb, (tag, content) => {
				const html = `<${tag}>${content}</${tag}>`;
				const result = sanitizeMarkdownHtml(html);
				expect(result).not.toContain(`<${tag}>`);
				expect(result).toContain(content);
			}),
		);
	});

	// ========================================================================
	// Invariant: attribute filtering per tag
	// ========================================================================
	it("a tag preserves href and title but strips other attributes", () => {
		const urlArb = fc.constantFrom("https://example.com", "http://test.org", "/relative/path");

		fc.assert(
			fc.property(urlArb, (url) => {
				const html = `<a href="${url}" title="link" class="bad" style="color:red">text</a>`;
				const result = sanitizeMarkdownHtml(html);
				expect(result).toContain(`href="${url}"`);
				expect(result).toContain('title="link"');
				expect(result).not.toContain("class=");
				expect(result).not.toContain("style=");
			}),
		);
	});

	it("img tag preserves src and alt but strips unknown attributes", () => {
		const srcArb = fc.constantFrom("https://example.com/img.png", "/images/photo.jpg");

		fc.assert(
			fc.property(srcArb, (src) => {
				const html = `<img src="${src}" alt="photo" class="bad" data-id="1">`;
				const result = sanitizeMarkdownHtml(html);
				expect(result).toContain(`src="${src}"`);
				expect(result).toContain('alt="photo"');
				expect(result).not.toContain("class=");
				expect(result).not.toContain("data-id=");
			}),
		);
	});

	it("tags without allowed attributes have all attributes stripped", () => {
		const tagArb = fc.constantFrom("p", "strong", "em", "h1", "ul", "li");

		fc.assert(
			fc.property(tagArb, (tag) => {
				const html = `<${tag} class="x" id="y" style="z">text</${tag}>`;
				const result = sanitizeMarkdownHtml(html);
				expect(result).toContain(`<${tag}>`);
				expect(result).not.toContain("class=");
				expect(result).not.toContain("id=");
				expect(result).not.toContain("style=");
			}),
		);
	});

	// ========================================================================
	// Invariant: empty/falsy input
	// ========================================================================
	it("empty or falsy input returns empty string", () => {
		const emptyArb = fc.constantFrom("", undefined, null, 0, false);

		fc.assert(
			fc.property(emptyArb, (input) => {
				const result = sanitizeMarkdownHtml(input as string);
				expect(result).toBe("");
			}),
		);
	});

	// ========================================================================
	// Algebraic property: idempotency
	// ========================================================================
	it("sanitizing already-sanitized HTML produces the same result", () => {
		const safeHtmlArb = fc.constantFrom(
			"<p>Hello world</p>",
			"<h1>Title</h1><p>text</p>",
			'<a href="https://example.com">link</a>',
			"<ul><li>item1</li><li>item2</li></ul>",
			"<strong>bold</strong> and <em>italic</em>",
			'<img src="https://example.com/img.png" alt="test">',
			"<code>const x = 1;</code>",
		);

		fc.assert(
			fc.property(safeHtmlArb, (html) => {
				const once = sanitizeMarkdownHtml(html);
				const twice = sanitizeMarkdownHtml(once);
				expect(twice).toBe(once);
			}),
		);
	});

	// ========================================================================
	// Determinism
	// ========================================================================
	it("same input always produces the same output", () => {
		fc.assert(
			fc.property(fc.string(), (input) => {
				const r1 = sanitizeMarkdownHtml(input);
				const r2 = sanitizeMarkdownHtml(input);
				expect(r1).toBe(r2);
			}),
		);
	});
});
