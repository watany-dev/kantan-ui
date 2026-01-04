import { expect, test } from "@playwright/test";

// 各テストで空のストレージ状態を使用
test.use({ storageState: { cookies: [], origins: [] } });

/**
 * ページに遷移し、初期レンダリング完了まで待機するヘルパー
 */
async function gotoAndWait(page: import("@playwright/test").Page): Promise<void> {
	await page.goto("/");
	// タイトルが表示されるまで待機
	await expect(page.locator("h1.kt-title")).toBeVisible();
	// WebSocket接続完了を待機
	await expect(page.locator("#kt-connection-status")).toContainText("Connected", {
		timeout: 10000,
	});
}

test.describe("Patch Operations - removeNode", () => {
	test("Remove Last button removes the last item from list", async ({ page }) => {
		await gotoAndWait(page);

		// 初期状態を確認（3アイテム）
		const itemList = page.locator("#item-list li.list-item");
		await expect(itemList).toHaveCount(3);
		await expect(page.locator("#item-count")).toContainText("Total items: 3");

		// 最後のアイテムを削除
		await page.click("#btn_remove");

		// アイテムが削除されたことを確認
		await expect(itemList).toHaveCount(2);
		await expect(page.locator("#item-count")).toContainText("Total items: 2");
	});

	test("DOM integrity is maintained after removing items", async ({ page }) => {
		await gotoAndWait(page);

		// 初期アイテムを確認
		const itemList = page.locator("#item-list li.list-item");
		await expect(itemList).toHaveCount(3);

		// 2つアイテムを削除
		await page.click("#btn_remove");
		await expect(itemList).toHaveCount(2);

		await page.click("#btn_remove");
		await expect(itemList).toHaveCount(1);

		// 残りの1つが正しく表示されていることを確認
		await expect(itemList.first()).toContainText("Item 1");

		// ボタンがまだ機能することを確認
		await page.click("#btn_remove");
		await expect(itemList).toHaveCount(0);
		await expect(page.locator("#item-count")).toContainText("Total items: 0");
	});
});
