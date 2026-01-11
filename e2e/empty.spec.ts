import { expect, test } from "@playwright/test";
import { gotoAndWait } from "./helpers";

// 各テストで空のストレージ状態を使用
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Empty Placeholder API", () => {
	test("kt.empty() creates placeholder container", async ({ page }) => {
		await gotoAndWait(page);

		// プレースホルダーコンテナが存在する
		const placeholder = page.locator("#kt-empty-status_placeholder");
		await expect(placeholder).toBeVisible();
		await expect(placeholder).toHaveClass(/kt-empty/);
	});

	test("spinner() shows loading indicator", async ({ page }) => {
		await gotoAndWait(page);

		// Show Spinnerボタンをクリック
		await page.click('button:has-text("Show Spinner")');

		// スピナーが表示される
		const spinner = page.locator("#kt-empty-status_placeholder .kt-spinner");
		await expect(spinner).toBeVisible({ timeout: 5000 });
		await expect(spinner).toContainText("Processing...");
	});

	test("success() shows success alert", async ({ page }) => {
		await gotoAndWait(page);

		// Show Successボタンをクリック
		await page.click('button:has-text("Show Success")');

		// 成功アラートが表示される
		const alert = page.locator("#kt-empty-status_placeholder .kt-alert-success");
		await expect(alert).toBeVisible({ timeout: 5000 });
		await expect(alert).toContainText("Operation completed!");
	});

	test("error() shows error alert", async ({ page }) => {
		await gotoAndWait(page);

		// Show Errorボタンをクリック
		await page.click('button:has-text("Show Error")');

		// エラーアラートが表示される
		const alert = page.locator("#kt-empty-status_placeholder .kt-alert-error");
		await expect(alert).toBeVisible({ timeout: 5000 });
		await expect(alert).toContainText("Something went wrong!");
	});

	test("empty() clears placeholder content", async ({ page }) => {
		await gotoAndWait(page);

		// まずスピナーを表示
		await page.click('button:has-text("Show Spinner")');
		await expect(page.locator("#kt-empty-status_placeholder .kt-spinner")).toBeVisible({
			timeout: 5000,
		});

		// Clear Statusボタンをクリック
		await page.click('button:has-text("Clear Status")');

		// プレースホルダーが空になる
		const placeholder = page.locator("#kt-empty-status_placeholder");
		await expect(placeholder).toBeEmpty({ timeout: 5000 });
	});

	test("progress() shows progress bar", async ({ page }) => {
		await gotoAndWait(page);

		// Show Progressボタンをクリック
		await page.click('button:has-text("Show Progress")');

		// プログレスバーが表示される
		const progress = page.locator("#kt-empty-progress_placeholder .kt-progress");
		await expect(progress).toBeVisible({ timeout: 5000 });

		// value属性を確認（0.5 = 50% → value="50"）
		await expect(progress).toHaveAttribute("value", "50");

		// プログレステキストが表示される
		const progressText = page.locator("#kt-empty-progress_placeholder .kt-progress-text");
		await expect(progressText).toContainText("50% complete");
	});

	test("placeholder state persists across reruns", async ({ page }) => {
		await gotoAndWait(page);

		// 成功メッセージを表示
		await page.click('button:has-text("Show Success")');
		await expect(page.locator("#kt-empty-status_placeholder .kt-alert-success")).toBeVisible({
			timeout: 5000,
		});

		// カウンターをインクリメント（別のボタン操作でrerunをトリガー）
		await page.click('button:has-text("+ Increment")');

		// 成功メッセージがまだ表示されている（状態が保持されている）
		await expect(page.locator("#kt-empty-status_placeholder .kt-alert-success")).toBeVisible({
			timeout: 5000,
		});
	});

	test("switching between different content types works", async ({ page }) => {
		await gotoAndWait(page);

		// スピナー表示
		await page.click('button:has-text("Show Spinner")');
		await expect(page.locator("#kt-empty-status_placeholder .kt-spinner")).toBeVisible({
			timeout: 5000,
		});

		// 成功に切り替え
		await page.click('button:has-text("Show Success")');
		await expect(page.locator("#kt-empty-status_placeholder .kt-alert-success")).toBeVisible({
			timeout: 5000,
		});
		await expect(page.locator("#kt-empty-status_placeholder .kt-spinner")).not.toBeVisible();

		// エラーに切り替え
		await page.click('button:has-text("Show Error")');
		await expect(page.locator("#kt-empty-status_placeholder .kt-alert-error")).toBeVisible({
			timeout: 5000,
		});
		await expect(page.locator("#kt-empty-status_placeholder .kt-alert-success")).not.toBeVisible();

		// クリア
		await page.click('button:has-text("Clear Status")');
		await expect(page.locator("#kt-empty-status_placeholder")).toBeEmpty({ timeout: 5000 });
	});
});
