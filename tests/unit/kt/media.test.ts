import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderContext, setRenderContext } from "../../../src/kt/context";
import { image } from "../../../src/kt/media";

describe("Media APIs", () => {
	let ctx: RenderContext;

	beforeEach(() => {
		ctx = new RenderContext();
		setRenderContext(ctx);
	});

	afterEach(() => {
		setRenderContext(null);
	});

	describe("image", () => {
		it("should be defined", () => {
			expect(image).toBeDefined();
			expect(typeof image).toBe("function");
		});

		it("should render URL image with figure and img elements", () => {
			image("https://example.com/photo.jpg");
			const html = ctx.getHtml();
			expect(html).toContain('<figure class="kt-image">');
			expect(html).toContain('src="https://example.com/photo.jpg"');
			expect(html).toContain('class="kt-image-img"');
			expect(html).toContain('loading="lazy"');
			expect(html).toContain("</figure>");
		});

		it("should set empty alt when not specified", () => {
			image("https://example.com/photo.jpg");
			const html = ctx.getHtml();
			expect(html).toContain('alt=""');
		});

		it("should not output figcaption when caption not specified", () => {
			image("https://example.com/photo.jpg");
			const html = ctx.getHtml();
			expect(html).not.toContain("<figcaption");
		});

		it("should escape special characters in URL", () => {
			image("https://example.com/photo.jpg?name=<script>");
			const html = ctx.getHtml();
			expect(html).toContain("&lt;script&gt;");
			expect(html).not.toContain("<script>");
		});
	});
});
