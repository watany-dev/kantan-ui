import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import { progress, spinner } from "../../../src/kt/feedback";

describe("Feedback APIs", () => {
	let ctx: RenderContext;

	beforeEach(() => {
		ctx = new RenderContext();
		setRenderContext(ctx);
	});

	afterEach(() => {
		setRenderContext(null);
	});

	describe("progress", () => {
		it("should output progress bar with kt-progress class", () => {
			progress(0.5);
			const html = ctx.getHtml();
			expect(html).toContain('class="kt-progress"');
			expect(html).toContain('class="kt-progress-bar"');
			expect(html).toContain('class="kt-progress-fill"');
		});

		it("should display 50% width for value 0.5", () => {
			progress(0.5);
			const html = ctx.getHtml();
			expect(html).toContain("width: 50%");
		});

		it("should normalize values > 1 as percentage (75 -> 75%)", () => {
			progress(75);
			const html = ctx.getHtml();
			expect(html).toContain("width: 75%");
		});

		it("should clamp values to 0-100 range", () => {
			progress(-10);
			expect(ctx.getHtml()).toContain("width: 0%");

			// Reset context
			ctx = new RenderContext();
			setRenderContext(ctx);

			progress(150);
			expect(ctx.getHtml()).toContain("width: 100%");
		});

		it("should display label when provided", () => {
			progress(0.5, { label: "Downloading... 50%" });
			const html = ctx.getHtml();
			expect(html).toContain('class="kt-progress-label"');
			expect(html).toContain("Downloading... 50%");
		});

		it("should escape HTML in label", () => {
			progress(0.5, { label: '<script>alert("xss")</script>' });
			const html = ctx.getHtml();
			expect(html).toContain("&lt;script&gt;");
		});

		it("should use custom color when provided", () => {
			progress(0.5, { color: "#ff0000" });
			const html = ctx.getHtml();
			expect(html).toContain("background: #ff0000");
		});

		it("should use default color when not provided", () => {
			progress(0.5);
			const html = ctx.getHtml();
			expect(html).toContain("background: #3498db");
		});

		it("should handle edge case values", () => {
			progress(0);
			expect(ctx.getHtml()).toContain("width: 0%");

			ctx = new RenderContext();
			setRenderContext(ctx);

			progress(1);
			expect(ctx.getHtml()).toContain("width: 100%");
		});
	});

	describe("spinner", () => {
		it("should output spinner with kt-spinner class", () => {
			spinner();
			const html = ctx.getHtml();
			expect(html).toContain('class="kt-spinner"');
			expect(html).toContain('class="kt-spinner-icon"');
		});

		it("should display default text 'Loading...'", () => {
			spinner();
			const html = ctx.getHtml();
			expect(html).toContain("Loading...");
		});

		it("should display custom text", () => {
			spinner("Processing data...");
			const html = ctx.getHtml();
			expect(html).toContain("Processing data...");
		});

		it("should escape HTML in text", () => {
			spinner('<script>alert("xss")</script>');
			const html = ctx.getHtml();
			expect(html).toContain("&lt;script&gt;");
		});

		it("should render nothing when show=false", () => {
			spinner("Loading...", { show: false });
			const html = ctx.getHtml();
			expect(html).toBe("");
		});

		it("should use small size when specified", () => {
			spinner("Loading...", { size: "small" });
			const html = ctx.getHtml();
			expect(html).toContain("16px");
		});

		it("should use medium size by default", () => {
			spinner();
			const html = ctx.getHtml();
			expect(html).toContain("24px");
		});

		it("should use large size when specified", () => {
			spinner("Loading...", { size: "large" });
			const html = ctx.getHtml();
			expect(html).toContain("32px");
		});

		it("should include CSS animation keyframes", () => {
			spinner();
			const html = ctx.getHtml();
			expect(html).toContain("@keyframes kt-spin");
			expect(html).toContain("animation:");
		});
	});

	describe("without render context", () => {
		it("should throw error when no context", () => {
			setRenderContext(null);
			expect(() => progress(0.5)).toThrow("RenderContext is not available");
		});

		it("should throw error for spinner when no context", () => {
			setRenderContext(null);
			expect(() => spinner()).toThrow("RenderContext is not available");
		});
	});
});
