import { expect, test } from "@playwright/test";
import { gotoAndWait } from "./helpers";

// 各テストで空のストレージ状態を使用
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("WebSocket Reconnection", () => {
	test("detects WebSocket disconnection via offline mode", async ({ page, context }) => {
		await gotoAndWait(page);

		// 初期状態で接続済み
		await expect(page.locator("#kt-connection-status")).toContainText("Connected");

		// オフラインモードにして切断をシミュレート
		await context.setOffline(true);

		// 切断状態が検出されることを確認（Disconnectedまたは再接続中の表示）
		// WebSocketの切断検出には少し時間がかかる場合がある
		await expect(page.locator("#kt-connection-status")).not.toContainText("Connected", {
			timeout: 10000,
		});
	});

	test("reconnects after network recovery", async ({ page, context }) => {
		await gotoAndWait(page);

		// 初期状態で接続済み
		await expect(page.locator("#kt-connection-status")).toContainText("Connected");

		// オフラインモードにして切断
		await context.setOffline(true);
		await page.waitForTimeout(1000);

		// オンラインに復帰
		await context.setOffline(false);

		// 再接続されることを確認
		await expect(page.locator("#kt-connection-status")).toContainText("Connected", {
			timeout: 15000,
		});
	});

	test("maintains session state after reconnection", async ({ page, context }) => {
		await gotoAndWait(page);

		// カウンターを増やす
		await page.click("#btn_inc");
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 1",
		);

		// オフラインにして切断
		await context.setOffline(true);
		await page.waitForTimeout(1000);

		// オンラインに復帰
		await context.setOffline(false);

		// 再接続を待つ
		await expect(page.locator("#kt-connection-status")).toContainText("Connected", {
			timeout: 15000,
		});

		// セッション状態が維持されていることを確認
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 1",
		);

		// 操作が正常に機能することを確認
		await page.click("#btn_inc");
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 2",
		);
	});
});
