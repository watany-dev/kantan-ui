import { expect, test } from "@playwright/test";
import { gotoAndWait } from "./helpers";

// 各テストで空のストレージ状態を使用
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Empty Placeholder API", () => {
	test("kt.empty() creates placeholder container in DOM", async ({ page }) => {
		await gotoAndWait(page);

		// プレースホルダーコンテナがDOMに存在する
		const placeholder = page.locator("#kt-empty-status_placeholder");
		await expect(placeholder).toBeAttached();
		await expect(placeholder).toHaveClass(/kt-empty/);
	});

	test("placeholder buttons exist on page", async ({ page }) => {
		await gotoAndWait(page);

		// Empty Placeholder関連のボタンが存在する
		await expect(page.locator('button:has-text("Show Spinner")')).toBeVisible();
		await expect(page.locator('button:has-text("Show Success")')).toBeVisible();
		await expect(page.locator('button:has-text("Show Error")')).toBeVisible();
		await expect(page.locator('button:has-text("Clear Status")')).toBeVisible();
		await expect(page.locator('button:has-text("Show Progress")')).toBeVisible();
	});

	test("progress placeholder container exists", async ({ page }) => {
		await gotoAndWait(page);

		// プログレス用プレースホルダーがDOMに存在する
		const progressPlaceholder = page.locator("#kt-empty-progress_placeholder");
		await expect(progressPlaceholder).toBeAttached();
		await expect(progressPlaceholder).toHaveClass(/kt-empty/);
	});
});
