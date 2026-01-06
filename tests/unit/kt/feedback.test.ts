import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import { progress, spinner, toast } from "../../../src/kt/feedback";

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

		it("should add animated class when animated option is true", () => {
			progress(0.5, { animated: true });
			const html = ctx.getHtml();
			expect(html).toContain("kt-progress-animated");
		});

		it("should not add animated class by default", () => {
			progress(0.5);
			const html = ctx.getHtml();
			expect(html).not.toContain("kt-progress-animated");
		});

		it("should combine animated with color option", () => {
			progress(0.75, { animated: true, color: "#ff0000" });
			const html = ctx.getHtml();
			expect(html).toContain("kt-progress-animated");
			expect(html).toContain("background: #ff0000");
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

		it("should use kt-spinner-icon class for animation (external CSS)", () => {
			spinner();
			const html = ctx.getHtml();
			// Animation is provided by external CSS (default.ts), not inline
			expect(html).toContain('class="kt-spinner-icon"');
			// Should NOT contain inline keyframes (prevents duplication)
			expect(html).not.toContain("@keyframes");
		});
	});

	describe("toast", () => {
		it("should output toast with kt-toast class", () => {
			toast("Message saved!");
			const html = ctx.getHtml();
			expect(html).toContain('class="kt-toast');
		});

		it("should display message text", () => {
			toast("Operation completed");
			const html = ctx.getHtml();
			expect(html).toContain("Operation completed");
		});

		it("should escape HTML in message", () => {
			toast('<script>alert("xss")</script>');
			const html = ctx.getHtml();
			expect(html).toContain("&lt;script&gt;");
		});

		it("should use success type by default", () => {
			toast("Success!");
			const html = ctx.getHtml();
			expect(html).toContain("kt-toast-success");
		});

		it("should support info type", () => {
			toast("Info message", { type: "info" });
			const html = ctx.getHtml();
			expect(html).toContain("kt-toast-info");
		});

		it("should support warning type", () => {
			toast("Warning message", { type: "warning" });
			const html = ctx.getHtml();
			expect(html).toContain("kt-toast-warning");
		});

		it("should support error type", () => {
			toast("Error message", { type: "error" });
			const html = ctx.getHtml();
			expect(html).toContain("kt-toast-error");
		});

		it("should have data-duration attribute for auto-dismiss", () => {
			toast("Message", { duration: 3000 });
			const html = ctx.getHtml();
			expect(html).toContain('data-duration="3000"');
		});

		it("should use default duration of 4000ms", () => {
			toast("Message");
			const html = ctx.getHtml();
			expect(html).toContain('data-duration="4000"');
		});

		it("should include icon based on type", () => {
			toast("Success!", { type: "success" });
			const html = ctx.getHtml();
			expect(html).toContain("kt-toast-icon");
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

		it("should throw error for toast when no context", () => {
			setRenderContext(null);
			expect(() => toast("Test")).toThrow("RenderContext is not available");
		});
	});
});
