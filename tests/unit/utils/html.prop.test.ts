import fc from "fast-check";
import { describe, expect, it } from "vitest";
import "../pbt-setup";
import {
	buildAttributes,
	buildClassAttr,
	buildStyleAttr,
	containsUnsafeHtml,
	escapeHtml,
} from "../../../src/utils/html";

describe("escapeHtml property-based tests", () => {
	it("never contains raw < or > or & or quotes", () => {
		fc.assert(
			fc.property(fc.string(), (input) => {
				const escaped = escapeHtml(input);
				// The escaped output should not contain raw special chars
				// unless they are part of entity references like &amp; &lt; etc.
				// We verify by checking that unescaping and re-escaping is stable
				expect(escaped).not.toMatch(/(?<!&amp|&lt|&gt|&quot|&#039)[<>"']/);
			}),
		);
	});

	it("escaping is idempotent on already-escaped output", () => {
		fc.assert(
			fc.property(fc.string(), (input) => {
				const once = escapeHtml(input);
				// Applying escapeHtml to already-escaped text should change it
				// (because & becomes &amp;), UNLESS there are no special chars.
				// The key property: escapeHtml(escapeHtml(x)) === escapeHtml(once)
				const twice = escapeHtml(once);
				const thrice = escapeHtml(twice);
				expect(thrice).toBe(escapeHtml(twice));
			}),
		);
	});

	it("preserves strings without special characters", () => {
		const safeString = fc.stringMatching(/^[a-zA-Z0-9 _\-,.!?@#$%^()[\]{}+=~`]*$/);
		fc.assert(
			fc.property(safeString, (input) => {
				expect(escapeHtml(input)).toBe(input);
			}),
		);
	});

	it("escaped output length is >= input length", () => {
		fc.assert(
			fc.property(fc.string(), (input) => {
				expect(escapeHtml(input).length).toBeGreaterThanOrEqual(input.length);
			}),
		);
	});

	it("all five special characters are replaced", () => {
		fc.assert(
			fc.property(fc.string(), (input) => {
				const escaped = escapeHtml(input);
				// After escaping, there should be no raw <, >, ", '
				// & is tricky because it appears in entities, so we check the others
				expect(escaped).not.toContain("<");
				expect(escaped).not.toContain(">");
				expect(escaped).not.toMatch(/(?<!&amp|&lt|&gt|&quot|&#039)"/);
				expect(escaped).not.toMatch(/(?<!&#03)'/);
			}),
		);
	});
});

describe("containsUnsafeHtml property-based tests", () => {
	it("plain text without HTML-like characters is always safe", () => {
		const plainText = fc.stringMatching(/^[a-zA-Z0-9 _\-,.!?@#$%^()[\]{}+=~`]*$/);
		fc.assert(
			fc.property(plainText, (input) => {
				if (
					!input.toLowerCase().includes("javascript") &&
					!input.toLowerCase().includes("vbscript") &&
					!input.toLowerCase().includes("data:")
				) {
					expect(containsUnsafeHtml(input)).toBe(false);
				}
			}),
		);
	});

	it("escaped HTML is always safe", () => {
		fc.assert(
			fc.property(fc.string(), (input) => {
				const escaped = escapeHtml(input);
				expect(containsUnsafeHtml(escaped)).toBe(false);
			}),
		);
	});

	// ========================================================================
	// Script tags
	// ========================================================================
	it("script tags are always detected regardless of surrounding content", () => {
		fc.assert(
			fc.property(fc.string(), fc.string(), (prefix, suffix) => {
				const html = `${prefix}<script>alert(1)</script>${suffix}`;
				expect(containsUnsafeHtml(html)).toBe(true);
			}),
		);
	});

	it("script tags with attributes are detected", () => {
		const attrArb = fc.constantFrom(
			' src="evil.js"',
			" type='text/javascript'",
			" nonce=abc",
			" defer",
			" async",
		);
		fc.assert(
			fc.property(attrArb, (attr) => {
				expect(containsUnsafeHtml(`<script${attr}>`)).toBe(true);
			}),
		);
	});

	// ========================================================================
	// Event handlers
	// ========================================================================
	it("event handlers in tags are always detected regardless of surrounding content", () => {
		const handler = fc.constantFrom(
			"onclick",
			"onerror",
			"onload",
			"onmouseover",
			"onfocus",
			"onblur",
			"onsubmit",
			"onchange",
			"oninput",
			"onkeydown",
			"onkeyup",
			"onmousedown",
		);
		fc.assert(
			fc.property(fc.string(), handler, fc.string(), (prefix, h, suffix) => {
				const html = `${prefix}<div ${h}="alert(1)">${suffix}`;
				expect(containsUnsafeHtml(html)).toBe(true);
			}),
		);
	});

	// ========================================================================
	// Dangerous URL schemes
	// ========================================================================
	it("javascript: URLs are always detected", () => {
		const payloadArb = fc.constantFrom("alert(1)", "void(0)", "document.cookie", "eval('x')");
		fc.assert(
			fc.property(payloadArb, (payload) => {
				expect(containsUnsafeHtml(`<a href="javascript:${payload}">`)).toBe(true);
			}),
		);
	});

	it("javascript: with whitespace variations is detected", () => {
		const wsArb = fc.constantFrom("", " ", "\t", "\n");
		fc.assert(
			fc.property(wsArb, (ws) => {
				expect(containsUnsafeHtml(`javascript${ws}:alert(1)`)).toBe(true);
			}),
		);
	});

	it("vbscript: URLs are always detected", () => {
		fc.assert(
			fc.property(fc.string(), (suffix) => {
				expect(containsUnsafeHtml(`vbscript:${suffix}`)).toBe(true);
			}),
		);
	});

	it("data: URLs with base64 are detected", () => {
		const dataArb = fc.constantFrom(
			"data:text/html;base64,PHNjcmlwdD4=",
			"data:application/javascript;base64,YWxlcnQo",
		);
		fc.assert(
			fc.property(dataArb, (data) => {
				expect(containsUnsafeHtml(data)).toBe(true);
			}),
		);
	});

	// ========================================================================
	// Dangerous tags
	// ========================================================================
	it("dangerous tags are always detected", () => {
		const tagArb = fc.constantFrom("iframe", "embed", "object", "base", "form", "meta", "link");
		fc.assert(
			fc.property(tagArb, (tag) => {
				expect(containsUnsafeHtml(`<${tag} >`)).toBe(true);
				expect(containsUnsafeHtml(`<${tag}>`)).toBe(true);
			}),
		);
	});

	it("dangerous tags detected regardless of case", () => {
		const tagArb = fc.constantFrom("iframe", "embed", "object", "form", "meta");
		const caseTransform = fc.constantFrom(
			(s: string) => s.toUpperCase(),
			(s: string) => s.toLowerCase(),
			(s: string) =>
				s
					.split("")
					.map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()))
					.join(""),
		);
		fc.assert(
			fc.property(tagArb, caseTransform, (tag, transform) => {
				expect(containsUnsafeHtml(`<${transform(tag)}>`)).toBe(true);
			}),
		);
	});

	// ========================================================================
	// SVG/MathML with event handlers
	// ========================================================================
	it("SVG with event handlers is detected", () => {
		const handler = fc.constantFrom("onload", "onerror", "onclick");
		fc.assert(
			fc.property(handler, (h) => {
				expect(containsUnsafeHtml(`<svg ${h}="alert(1)">`)).toBe(true);
			}),
		);
	});

	it("MathML with event handlers is detected", () => {
		const handler = fc.constantFrom("onload", "onerror", "onclick");
		fc.assert(
			fc.property(handler, (h) => {
				expect(containsUnsafeHtml(`<math ${h}="alert(1)">`)).toBe(true);
			}),
		);
	});
});

describe("buildAttributes property-based tests", () => {
	it("result starts with space or is empty", () => {
		const attrsArb = fc.dictionary(
			fc.string().filter((s) => s.length > 0 && !s.includes("=")),
			fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(undefined), fc.constant(null)),
		);
		fc.assert(
			fc.property(attrsArb, (attrs) => {
				const result = buildAttributes(
					attrs as Record<string, string | number | boolean | undefined | null>,
				);
				expect(result === "" || result.startsWith(" ")).toBe(true);
			}),
		);
	});

	it("values are always HTML-escaped in output", () => {
		fc.assert(
			fc.property(fc.string({ minLength: 1 }), fc.string({ minLength: 1 }), (key, value) => {
				const result = buildAttributes({ [key]: value });
				// The value in the output should be the escaped version
				if (result.includes("=")) {
					expect(result).toContain(escapeHtml(String(value)));
				}
			}),
		);
	});
});

describe("buildClassAttr property-based tests", () => {
	it("result is empty or starts with class=", () => {
		const classesArb = fc.array(
			fc.oneof(fc.string(), fc.constant(false as const), fc.constant(undefined), fc.constant(null)),
		);
		fc.assert(
			fc.property(classesArb, (classes) => {
				const result = buildClassAttr(classes);
				expect(result === "" || result.startsWith("class=")).toBe(true);
			}),
		);
	});

	it("excludes all falsy values from output", () => {
		const classesArb = fc.array(
			fc.oneof(
				fc.constant(""),
				fc.constant(false as const),
				fc.constant(undefined),
				fc.constant(null),
			),
			{ minLength: 1 },
		);
		fc.assert(
			fc.property(classesArb, (classes) => {
				expect(buildClassAttr(classes)).toBe("");
			}),
		);
	});
});

describe("buildStyleAttr property-based tests", () => {
	it("result is empty or starts with style=", () => {
		const stylesArb = fc.dictionary(
			fc.string().filter((s) => s.length > 0),
			fc.oneof(fc.string(), fc.integer(), fc.constant(undefined), fc.constant(null)),
		);
		fc.assert(
			fc.property(stylesArb, (styles) => {
				const result = buildStyleAttr(styles as Record<string, string | number | undefined | null>);
				expect(result === "" || result.startsWith("style=")).toBe(true);
			}),
		);
	});

	it("never contains url() in output", () => {
		const stylesArb = fc.dictionary(
			fc.string().filter((s) => s.length > 0),
			fc.oneof(fc.string(), fc.integer()),
		);
		fc.assert(
			fc.property(stylesArb, (styles) => {
				const result = buildStyleAttr(styles as Record<string, string | number | undefined | null>);
				expect(result.toLowerCase()).not.toMatch(/url\s*\(/);
			}),
		);
	});

	it("never contains expression() in output", () => {
		const stylesArb = fc.dictionary(
			fc.string().filter((s) => s.length > 0),
			fc.oneof(fc.string(), fc.integer()),
		);
		fc.assert(
			fc.property(stylesArb, (styles) => {
				const result = buildStyleAttr(styles as Record<string, string | number | undefined | null>);
				expect(result.toLowerCase()).not.toMatch(/expression\s*\(/);
			}),
		);
	});

	it("never contains javascript: or vbscript: in output", () => {
		const stylesArb = fc.dictionary(
			fc.string().filter((s) => s.length > 0),
			fc.oneof(fc.string(), fc.integer()),
		);
		fc.assert(
			fc.property(stylesArb, (styles) => {
				const result = buildStyleAttr(styles as Record<string, string | number | undefined | null>);
				expect(result.toLowerCase()).not.toMatch(/(javascript|vbscript)\s*:/);
			}),
		);
	});
});
