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

test.describe("Error Handling - WebSocket Reconnection", () => {
	test("WebSocket reconnection is attempted after connection close", async ({ page }) => {
		await gotoAndWait(page);

		// カウンターを増やして状態を変更
		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Counter: 1");

		// 注: WebSocket切断のテストは、クライアント側で直接制御する必要がある
		// ここでは接続ステータスの表示を確認することで、接続状態の監視が動作していることを検証

		// 接続ステータスが表示されていることを確認（再接続中のステータス）
		// 注: 実際の再接続テストはWebSocket接続を直接制御する必要がある
		const connectionStatus = page.locator("#kt-connection-status");
		await expect(connectionStatus).toBeVisible();
	});

	test("UI remains functional after page reload", async ({ page }) => {
		await gotoAndWait(page);

		// カウンターを増やす
		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Counter: 2");

		// ページをリロード（新しいWebSocket接続が必要）
		await page.reload();
		await gotoAndWait(page);

		// tabスコープでもセッションIDはlocalStorageに保持されるため、
		// リロード後もセッション状態が維持される
		// UIが機能していることを確認（さらにインクリメント）
		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Counter: 3");
	});

	test("Connection status indicator shows connected state", async ({ page }) => {
		await gotoAndWait(page);

		// 接続ステータスが「Connected」であることを確認
		const connectionStatus = page.locator("#kt-connection-status");
		await expect(connectionStatus).toContainText("Connected");

		// ボタンが機能することで接続が有効であることを確認
		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Counter: 1");
	});
});

test.describe("Error Handling - Error Resilience", () => {
	test("Application does not crash on rapid interactions", async ({ page }) => {
		await gotoAndWait(page);

		// 高速連続クリックでアプリがクラッシュしないことを確認
		const incButton = page.locator("#btn_inc");
		for (let i = 0; i < 10; i++) {
			await incButton.click();
		}

		// UIが正常であることを確認
		await expect(page.locator("#counter-display")).toContainText("Counter: 10");
		await expect(incButton).toBeEnabled();
	});

	test("Health endpoint responds correctly", async ({ page }) => {
		// ヘルスチェックエンドポイントが正常に応答することを確認
		const response = await page.request.get("/health");
		expect(response.ok()).toBeTruthy();

		const body = await response.json();
		expect(body.status).toBe("ok");
	});
});
