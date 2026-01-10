import { expect, test } from "@playwright/test";
import { gotoAndWait } from "./helpers";

// 各テストで空のストレージ状態を使用
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Media API - kt.image", () => {
	test.describe("Basic URL Image", () => {
		test("renders image with figure element", async ({ page }) => {
			await gotoAndWait(page);

			// kt.image() が <figure class="kt-image"> を出力することを確認
			const figure = page.locator("figure.kt-image").first();
			await expect(figure).toBeVisible();
		});

		test("renders img element with correct src", async ({ page }) => {
			await gotoAndWait(page);

			// 画像が正しいsrcで表示されることを確認
			const img = page.locator("figure.kt-image img.kt-image-img").first();
			await expect(img).toBeVisible();
			await expect(img).toHaveAttribute("loading", "lazy");
		});

		test("displays caption when specified", async ({ page }) => {
			await gotoAndWait(page);

			// キャプションが表示されることを確認
			const caption = page.locator("figcaption.kt-image-caption").filter({
				hasText: "A placeholder image",
			});
			await expect(caption).toBeVisible();
		});

		test("applies width style when specified", async ({ page }) => {
			await gotoAndWait(page);

			// widthが適用されることを確認
			const figure = page.locator("figure.kt-image").first();
			await expect(figure).toHaveAttribute("style", /--kt-image-width: 300px/);
		});
	});

	test.describe("Data URI Image", () => {
		test("renders data URI image correctly", async ({ page }) => {
			await gotoAndWait(page);

			// data URI画像がキャプションで表示されることを確認
			const caption = page.locator("figcaption.kt-image-caption").filter({
				hasText: "A 1x1 red pixel",
			});
			await expect(caption).toBeVisible();
		});

		test("data URI image has correct src attribute", async ({ page }) => {
			await gotoAndWait(page);

			// data URI画像のsrc属性を確認
			const caption = page.locator("figcaption.kt-image-caption").filter({
				hasText: "A 1x1 red pixel",
			});
			const figure = caption.locator("..");
			const img = figure.locator("img.kt-image-img");
			await expect(img).toHaveAttribute("src", /^data:image\/png;base64,/);
		});
	});

	test.describe("SVG Image", () => {
		test("renders SVG as data URI image", async ({ page }) => {
			await gotoAndWait(page);

			// SVGがdata URIとして表示されることを確認
			const svgCaption = page.locator("figcaption.kt-image-caption").filter({
				hasText: "A simple SVG circle",
			});
			await expect(svgCaption).toBeVisible();

			// 親のfigure内のimgがdata URIであることを確認
			const figure = svgCaption.locator("..");
			const img = figure.locator("img.kt-image-img");
			await expect(img).toHaveAttribute("src", /^data:image\/svg\+xml,/);
		});

		test("SVG is not rendered as raw HTML (XSS prevention)", async ({ page }) => {
			await gotoAndWait(page);

			// SVGタグが直接DOMに存在しないことを確認
			const rawSvg = page.locator("svg circle");
			await expect(rawSvg).toHaveCount(0);
		});
	});

	test.describe("Image Gallery", () => {
		test("renders gallery container for multiple images", async ({ page }) => {
			await gotoAndWait(page);

			// ギャラリーコンテナが表示されることを確認
			const gallery = page.locator("div.kt-image-gallery");
			await expect(gallery).toBeVisible();
		});

		test("displays all images in gallery", async ({ page }) => {
			await gotoAndWait(page);

			// ギャラリー内に3つの画像があることを確認
			const gallery = page.locator("div.kt-image-gallery");
			const figures = gallery.locator("figure.kt-image");
			await expect(figures).toHaveCount(3);
		});

		test("displays individual captions for gallery images", async ({ page }) => {
			await gotoAndWait(page);

			// 個別のキャプションが表示されることを確認
			const gallery = page.locator("div.kt-image-gallery");
			await expect(gallery.locator("figcaption").filter({ hasText: "First image" })).toBeVisible();
			await expect(gallery.locator("figcaption").filter({ hasText: "Second image" })).toBeVisible();
			await expect(gallery.locator("figcaption").filter({ hasText: "Third image" })).toBeVisible();
		});

		test("applies width to all gallery images", async ({ page }) => {
			await gotoAndWait(page);

			// すべてのギャラリー画像にwidthが適用されることを確認
			const gallery = page.locator("div.kt-image-gallery");
			const figures = gallery.locator("figure.kt-image");

			const count = await figures.count();
			for (let i = 0; i < count; i++) {
				await expect(figures.nth(i)).toHaveAttribute("style", /--kt-image-width: 150px/);
			}
		});
	});
});
