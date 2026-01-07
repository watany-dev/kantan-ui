import { expect, test } from "@playwright/test";

/**
 * Counter E2E Tests
 *
 * カウンターの増減操作をテストします。
 * 特に+と-を交互に操作する際のバグを検出するためのテスト。
 */
test.describe("Counter Operations", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		// WebSocket接続を待つ
		await page.waitForFunction(() => {
			const indicator = document.getElementById("kt-connection-status");
			return indicator?.textContent?.includes("Connected");
		});
	});

	test("should increment counter", async ({ page }) => {
		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");

		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 2");

		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 3");
	});

	test("should decrement counter", async ({ page }) => {
		// まず3回インクリメント
		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 3");

		// デクリメント
		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 2");

		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");

		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 0");
	});

	test("should not go below zero", async ({ page }) => {
		await expect(page.locator("#counter-display")).toContainText("Current count: 0");

		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 0");

		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 0");
	});

	test("should handle alternating increment and decrement - pattern 1", async ({ page }) => {
		// + - + - + パターン
		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");

		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 0");

		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");

		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 0");

		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");
	});

	test("should handle alternating increment and decrement - pattern 2", async ({ page }) => {
		// ++ - ++ - パターン
		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 2");

		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");

		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 3");

		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 2");
	});

	test("should handle rapid alternating clicks", async ({ page }) => {
		// 高速で交互にクリック
		await page.click("#btn_inc");
		await page.click("#btn_dec");
		await page.click("#btn_inc");
		await page.click("#btn_dec");
		await page.click("#btn_inc");

		// 最終的に1になるはず（+1 -1 +1 -1 +1 = 1）
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");
	});

	test("should handle multiple rapid increments followed by decrements", async ({ page }) => {
		// 5回インクリメント
		for (let i = 0; i < 5; i++) {
			await page.click("#btn_inc");
		}
		await expect(page.locator("#counter-display")).toContainText("Current count: 5");

		// 3回デクリメント
		for (let i = 0; i < 3; i++) {
			await page.click("#btn_dec");
		}
		await expect(page.locator("#counter-display")).toContainText("Current count: 2");
	});

	test("should correctly track state after complex alternating sequence", async ({ page }) => {
		// 複雑なシーケンス: +++ -- + - ++++ ---
		// 期待値: 3 - 2 + 1 - 1 + 4 - 3 = 2

		// +++ (3)
		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 3");

		// -- (1)
		await page.click("#btn_dec");
		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");

		// + (2)
		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 2");

		// - (1)
		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");

		// ++++ (5)
		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 5");

		// --- (2)
		await page.click("#btn_dec");
		await page.click("#btn_dec");
		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 2");
	});

	test("should handle reset button correctly after alternating operations", async ({ page }) => {
		// + + -
		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");

		// リセット
		await page.click("#btn_reset");
		await expect(page.locator("#counter-display")).toContainText("Current count: 0");

		// リセット後も正常に動作するか
		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");

		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 0");
	});

	test("should maintain correct count with wait between operations", async ({ page }) => {
		// 各操作間に待機を入れて、状態の同期を確認
		await page.click("#btn_inc");
		await page.waitForTimeout(100);
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");

		await page.click("#btn_dec");
		await page.waitForTimeout(100);
		await expect(page.locator("#counter-display")).toContainText("Current count: 0");

		await page.click("#btn_inc");
		await page.waitForTimeout(100);
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");

		await page.click("#btn_inc");
		await page.waitForTimeout(100);
		await expect(page.locator("#counter-display")).toContainText("Current count: 2");

		await page.click("#btn_dec");
		await page.waitForTimeout(100);
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");
	});
});
