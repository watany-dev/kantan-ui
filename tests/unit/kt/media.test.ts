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

		it("should append to render context without error", () => {
			// スケルトンテスト: 現時点では空のHTMLが追加される
			image("https://example.com/photo.jpg");
			expect(ctx.getHtml()).toBe("");
		});
	});
});
