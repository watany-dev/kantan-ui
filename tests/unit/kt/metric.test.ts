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

	describe("delta", () => {
		it("should render positive string delta with green color", () => {
			metric("Revenue", "$1,234", { delta: "+12%" });
			const html = ctx.getHtml();
			expect(html).toContain("kt-metric-delta");
			expect(html).toContain("kt-metric-delta-positive");
			expect(html).toContain("+12%");
			expect(html).toContain("▲");
		});

		it("should render negative string delta with red color", () => {
			metric("Revenue", "$1,234", { delta: "-5%" });
			const html = ctx.getHtml();
			expect(html).toContain("kt-metric-delta-negative");
			expect(html).toContain("-5%");
			expect(html).toContain("▼");
		});

		it("should render positive number delta", () => {
			metric("Users", 100, { delta: 15 });
			const html = ctx.getHtml();
			expect(html).toContain("kt-metric-delta-positive");
			expect(html).toContain("+15");
		});

		it("should render negative number delta", () => {
			metric("Users", 100, { delta: -15 });
			const html = ctx.getHtml();
			expect(html).toContain("kt-metric-delta-negative");
			expect(html).toContain("-15");
		});

		it("should render zero delta as neutral", () => {
			metric("Users", 100, { delta: 0 });
			const html = ctx.getHtml();
			expect(html).toContain("kt-metric-delta-neutral");
		});

		it("should escape HTML in delta", () => {
			metric("Test", "100", { delta: "<script>xss</script>" });
			const html = ctx.getHtml();
			expect(html).not.toContain("<script>");
			expect(html).toContain("&lt;script&gt;");
		});

		it("should not render delta section when delta is undefined", () => {
			metric("Revenue", "$1,234");
			const html = ctx.getHtml();
			expect(html).not.toContain("kt-metric-delta");
		});

		it("should handle string delta that parses as positive number", () => {
			metric("Users", 100, { delta: "12" });
			const html = ctx.getHtml();
			expect(html).toContain("kt-metric-delta-positive");
		});

		it("should handle string delta with minus sign (em dash)", () => {
			metric("Users", 100, { delta: "−5" });
			const html = ctx.getHtml();
			expect(html).toContain("kt-metric-delta-negative");
		});

		it("should handle non-numeric string delta as neutral", () => {
			metric("Users", 100, { delta: "N/A" });
			const html = ctx.getHtml();
			expect(html).toContain("kt-metric-delta-neutral");
		});
	});
});
