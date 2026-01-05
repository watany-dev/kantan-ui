import { expect, test } from "@playwright/test";
import { gotoAndWait } from "./helpers";

// 各テストで空のストレージ状態を使用
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Feedback API - Progress bar", () => {
	test("kt.progress() outputs progress bar with kt-progress class", async ({ page }) => {
		await gotoAndWait(page);

		const progressBars = page.locator(".kt-progress");
		await expect(progressBars.first()).toBeVisible();

		// 複数のプログレスバーが存在することを確認
		const count = await progressBars.count();
		expect(count).toBeGreaterThanOrEqual(3);
	});

	test("progress bar displays correct width for value 0.25", async ({ page }) => {
		await gotoAndWait(page);

		// 最初のプログレスバー（0.25 = 25%）
		const firstProgressFill = page.locator(".kt-progress").first().locator(".kt-progress-fill");
		// インラインスタイルで width: 25% が設定されていることを確認
		await expect(firstProgressFill).toHaveAttribute("style", /width:\s*25%/);
	});

	test("progress bar displays label when provided", async ({ page }) => {
		await gotoAndWait(page);

		// ラベル付きプログレスバー
		const labeledProgress = page.locator(".kt-progress-label");
		await expect(labeledProgress.first()).toBeVisible();
		await expect(labeledProgress.first()).toContainText("Downloading... 50%");
	});

	test("progress bar uses custom color when provided", async ({ page }) => {
		await gotoAndWait(page);

		// カスタム色（緑 #27ae60）のプログレスバー
		const greenProgress = page.locator(".kt-progress").nth(2).locator(".kt-progress-fill");
		await expect(greenProgress).toHaveCSS("background", /rgb\(39, 174, 96\)/);
	});

	test("progress bar has proper structure", async ({ page }) => {
		await gotoAndWait(page);

		const progress = page.locator(".kt-progress").first();

		// kt-progress-bar が存在することを確認
		await expect(progress.locator(".kt-progress-bar")).toBeVisible();

		// kt-progress-fill が存在することを確認
		await expect(progress.locator(".kt-progress-fill")).toBeVisible();
	});
});
