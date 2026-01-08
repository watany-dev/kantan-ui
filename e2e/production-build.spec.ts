/**
 * 本番ビルド検証テスト
 *
 * dist/ からビルドされたコードが正常に動作することを確認する。
 * 開発環境（src/）とは異なるコードパスをテストするため重要。
 */
import { expect, test } from "@playwright/test";

test.describe("Production Build Verification", () => {
	test("page loads successfully from dist/", async ({ page }) => {
		await page.goto("/");
		await expect(page.locator("body")).toContainText("kantan-ui");
		await expect(page.locator("body")).toContainText("Production Build");
	});

	test("button click updates counter", async ({ page }) => {
		await page.goto("/");

		// 初期状態を確認
		await expect(page.locator("#counter-display")).toContainText("Current count: 0");

		// インクリメント
		await page.click('button:has-text("+ Increment")');
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");

		// デクリメント
		await page.click('button:has-text("- Decrement")');
		await expect(page.locator("#counter-display")).toContainText("Current count: 0");
	});

	test("text input works", async ({ page }) => {
		await page.goto("/");

		const input = page.locator('input[type="text"]').first();
		await input.fill("Test User");

		// 入力が反映されることを確認
		await expect(page.locator("#results-card")).toContainText("Hello, Test User!");
	});

	test("slider widget works", async ({ page }) => {
		await page.goto("/");

		const slider = page.locator('input[type="range"]').first();
		await slider.fill("75");

		// スライダーの値が反映されることを確認
		await expect(page.locator("#results-card")).toContainText("Volume: 75%");
	});

	test("selectbox widget works", async ({ page }) => {
		await page.goto("/");

		const select = page.locator("select").first();
		await select.selectOption("green");

		// 選択が反映されることを確認（背景色が変わる）
		await expect(page.locator("#results-card")).toHaveCSS("background-color", "rgb(0, 128, 0)");
	});
});
