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
		const showSpinnerBtn = page.locator('[data-kt-event="click"]', { hasText: "Show Spinner" });
		await showSpinnerBtn.click();

		// スピナーが表示される
		const spinner = page.locator(".kt-spinner");
		await expect(spinner).toBeVisible({ timeout: 5000 });
		await expect(spinner).toContainText("Processing...");
	});

	test("success() shows success alert", async ({ page }) => {
		await gotoAndWait(page);

		// Show Successボタンをクリック
		const showSuccessBtn = page.locator('[data-kt-event="click"]', { hasText: "Show Success" });
		await showSuccessBtn.click();

		// 成功アラートが表示される
		const alert = page.locator("#kt-empty-status_placeholder .kt-alert-success");
		await expect(alert).toBeVisible({ timeout: 5000 });
		await expect(alert).toContainText("Operation completed!");
	});

	test("error() shows error alert", async ({ page }) => {
		await gotoAndWait(page);

		// Show Errorボタンをクリック
		const showErrorBtn = page.locator('[data-kt-event="click"]', { hasText: "Show Error" });
		await showErrorBtn.click();

		// エラーアラートが表示される
		const alert = page.locator("#kt-empty-status_placeholder .kt-alert-error");
		await expect(alert).toBeVisible({ timeout: 5000 });
		await expect(alert).toContainText("Something went wrong!");
	});

	test("empty() clears placeholder content", async ({ page }) => {
		await gotoAndWait(page);

		// まずスピナーを表示
		const showSpinnerBtn = page.locator('[data-kt-event="click"]', { hasText: "Show Spinner" });
		await showSpinnerBtn.click();
		await expect(page.locator(".kt-spinner")).toBeVisible({ timeout: 5000 });

		// Clear Statusボタンをクリック
		const clearBtn = page.locator('[data-kt-event="click"]', { hasText: "Clear Status" });
		await clearBtn.click();

		// プレースホルダーが空になる
		const placeholder = page.locator("#kt-empty-status_placeholder");
		await expect(placeholder).toBeEmpty({ timeout: 5000 });
	});

	test("progress() shows progress bar", async ({ page }) => {
		await gotoAndWait(page);

		// Show Progressボタンをクリック
		const showProgressBtn = page.locator('[data-kt-event="click"]', { hasText: "Show Progress" });
		await showProgressBtn.click();

		// プログレスバーが表示される
		const progress = page.locator("#kt-empty-progress_placeholder .kt-progress");
		await expect(progress).toBeVisible({ timeout: 5000 });
		await expect(progress).toHaveAttribute("value", "50");

		// プログレステキストが表示される
		const progressText = page.locator("#kt-empty-progress_placeholder .kt-progress-text");
		await expect(progressText).toContainText("50% complete");
	});

	test("placeholder state persists across reruns", async ({ page }) => {
		await gotoAndWait(page);

		// 成功メッセージを表示
		const showSuccessBtn = page.locator('[data-kt-event="click"]', { hasText: "Show Success" });
		await showSuccessBtn.click();
		await expect(page.locator("#kt-empty-status_placeholder .kt-alert-success")).toBeVisible({
			timeout: 5000,
		});

		// カウンターをインクリメント（別のボタン操作でrerunをトリガー）
		const incrementBtn = page.locator('[data-kt-event="click"]', { hasText: "+ Increment" });
		await incrementBtn.click();

		// 成功メッセージがまだ表示されている（状態が保持されている）
		await expect(page.locator("#kt-empty-status_placeholder .kt-alert-success")).toBeVisible({
			timeout: 5000,
		});
	});

	test("switching between different content types works", async ({ page }) => {
		await gotoAndWait(page);

		// スピナー → 成功 → エラー → クリア の順にテスト
		const showSpinnerBtn = page.locator('[data-kt-event="click"]', { hasText: "Show Spinner" });
		const showSuccessBtn = page.locator('[data-kt-event="click"]', { hasText: "Show Success" });
		const showErrorBtn = page.locator('[data-kt-event="click"]', { hasText: "Show Error" });
		const clearBtn = page.locator('[data-kt-event="click"]', { hasText: "Clear Status" });

		// スピナー表示
		await showSpinnerBtn.click();
		await expect(page.locator("#kt-empty-status_placeholder .kt-spinner")).toBeVisible({
			timeout: 5000,
		});

		// 成功に切り替え
		await showSuccessBtn.click();
		await expect(page.locator("#kt-empty-status_placeholder .kt-alert-success")).toBeVisible({
			timeout: 5000,
		});
		await expect(page.locator("#kt-empty-status_placeholder .kt-spinner")).not.toBeVisible();

		// エラーに切り替え
		await showErrorBtn.click();
		await expect(page.locator("#kt-empty-status_placeholder .kt-alert-error")).toBeVisible({
			timeout: 5000,
		});
		await expect(page.locator("#kt-empty-status_placeholder .kt-alert-success")).not.toBeVisible();

		// クリア
		await clearBtn.click();
		await expect(page.locator("#kt-empty-status_placeholder")).toBeEmpty({ timeout: 5000 });
	});
});
