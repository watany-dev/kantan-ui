import { describe, expect, it } from "vitest";
import { raw, renderHtml } from "../../../src/utils/html";

describe("renderHtml", () => {
	it("returns a primitive string", () => {
		const result = renderHtml`<b>hello</b>`;
		expect(typeof result).toBe("string");
	});

	it("auto-escapes interpolated string values", () => {
		const result = renderHtml`<b>${"<script>alert(1)</script>"}</b>`;
		expect(result).toBe("<b>&lt;script&gt;alert(1)&lt;/script&gt;</b>");
	});

	it("escapes &, <, >, double quotes", () => {
		const result = renderHtml`<span>${'a & b < c > d "e"'}</span>`;
		expect(result).toContain("&amp;");
		expect(result).toContain("&lt;");
		expect(result).toContain("&gt;");
		expect(result).toContain("&quot;");
	});

	it("escapes single quotes as &#39; (Hono encoding)", () => {
		const result = renderHtml`<b>${"it's"}</b>`;
		expect(result).toBe("<b>it&#39;s</b>");
	});

	it("does not escape raw() values", () => {
		const result = renderHtml`<div>${raw("<em>safe</em>")}</div>`;
		expect(result).toBe("<div><em>safe</em></div>");
	});

	it("passes numbers through without escaping", () => {
		const result = renderHtml`<span>${42}</span>`;
		expect(result).toBe("<span>42</span>");
	});

	it("handles mixed raw and plain values", () => {
		const id = "my-id";
		const label = "<b>bold</b>";
		const result = renderHtml`<button id="${raw(id)}">${label}</button>`;
		expect(result).toBe('<button id="my-id">&lt;b&gt;bold&lt;/b&gt;</button>');
	});

	it("handles empty string", () => {
		const result = renderHtml`<span>${""}</span>`;
		expect(result).toBe("<span></span>");
	});

	it("handles boolean false as empty", () => {
		const result = renderHtml`<span>${false}</span>`;
		// Hono renders false as empty string
		expect(result).toBe("<span></span>");
	});

	it("handles null/undefined as empty", () => {
		const r1 = renderHtml`<span>${null}</span>`;
		const r2 = renderHtml`<span>${undefined}</span>`;
		expect(r1).toBe("<span></span>");
		expect(r2).toBe("<span></span>");
	});
});
