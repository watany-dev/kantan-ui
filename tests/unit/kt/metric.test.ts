import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import { metric } from "../../../src/kt/metric";

describe("kt.metric", () => {
	let ctx: RenderContext;

	beforeEach(() => {
		ctx = new RenderContext();
		setRenderContext(ctx);
	});

	afterEach(() => {
		setRenderContext(null);
	});

	describe("basic rendering", () => {
		it("should render label and value", () => {
			metric("Revenue", "$1,234");
			const html = ctx.getHtml();
			expect(html).toContain("kt-metric");
			expect(html).toContain("Revenue");
			expect(html).toContain("$1,234");
		});

		it("should render with correct structure", () => {
			metric("Revenue", "$1,234");
			const html = ctx.getHtml();
			expect(html).toContain("kt-metric-label");
			expect(html).toContain("kt-metric-value");
		});

		it("should accept number value", () => {
			metric("Count", 1234);
			expect(ctx.getHtml()).toContain("1234");
		});

		it("should escape HTML in label", () => {
			metric("<script>alert(1)</script>", "100");
			const html = ctx.getHtml();
			expect(html).not.toContain("<script>");
			expect(html).toContain("&lt;script&gt;");
		});

		it("should escape HTML in value", () => {
			metric("Test", "<img onerror=alert(1)>");
			const html = ctx.getHtml();
			expect(html).not.toContain("<img");
			expect(html).toContain("&lt;img");
		});
	});

	describe("without render context", () => {
		it("should throw error when no context", () => {
			setRenderContext(null);
			expect(() => metric("Test", "100")).toThrow("RenderContext is not available");
		});
	});
});
