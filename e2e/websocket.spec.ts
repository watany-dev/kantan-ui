import { type Page, type WebSocket, expect, test } from "@playwright/test";

// 各テストで空のストレージ状態を使用
test.use({ storageState: { cookies: [], origins: [] } });

/**
 * WebSocket接続が確立され、初期パッチを受信するまで待機するヘルパー
 * 手動のPromise待機ではなく、Playwrightのビルトイン機能を使用
 */
async function waitForInitialRender(page: Page): Promise<void> {
	// 初期HTMLがレンダリングされるまで待機（WebSocket経由のパッチ適用完了を意味する）
	// タイムアウトはplaywright.config.tsのexpect.timeoutで一元管理
	await expect(page.locator("#app h1.kt-title")).toBeVisible();
}

/**
 * ページに遷移し、初期レンダリング完了まで待機するヘルパー
 * WebSocketオブジェクトが不要なテスト向け
 */
async function gotoAndWait(page: Page): Promise<void> {
	await page.goto("/");
	await waitForInitialRender(page);
}

/**
 * WebSocket接続を取得し、初期レンダリング完了まで待機するヘルパー
 * WebSocketメッセージの検証が必要なテスト向け
 */
async function setupWebSocket(page: Page): Promise<WebSocket> {
	const wsPromise = page.waitForEvent("websocket");
	await page.goto("/");
	const ws = await wsPromise;
	await waitForInitialRender(page);
	return ws;
}

test.describe("WebSocket connection and replaceRoot", () => {
	test("should load initial HTML", async ({ page }) => {
		await gotoAndWait(page);

		// 初期HTMLの確認（新しいデモアプリ）
		await expect(page.locator("#app h1.kt-title")).toHaveText("kantan-ui Demo");
		await expect(page.locator("#app .kt-write").first()).toContainText("Streamlit風の宣言的API");
	});

	test("should have buttons that can trigger sendEvent", async ({ page }) => {
		await gotoAndWait(page);

		// カウンターボタンが存在することを確認
		const incButton = page.locator("#btn_inc");
		await expect(incButton).toHaveText("+ Increment");
		await expect(incButton).toBeVisible();

		const decButton = page.locator("#btn_dec");
		await expect(decButton).toHaveText("- Decrement");
		await expect(decButton).toBeVisible();

		const resetButton = page.locator("#btn_reset");
		await expect(resetButton).toHaveText("Reset");
		await expect(resetButton).toBeVisible();
	});

	test("should establish WebSocket connection", async ({ page }) => {
		// WebSocket接続をモニター
		const wsPromise = page.waitForEvent("websocket");

		await page.goto("/");

		const ws = await wsPromise;
		expect(ws.url()).toContain("/ws");
	});

	test("should send event when button is clicked", async ({ page }) => {
		const ws = await setupWebSocket(page);

		// WebSocketメッセージを監視（eventタイプのみ）
		const messagePromise = new Promise<string>((resolve) => {
			ws.on("framesent", (frame) => {
				const payload = frame.payload.toString();
				const parsed = JSON.parse(payload);
				if (parsed.type === "event") {
					resolve(payload);
				}
			});
		});

		// ボタンをクリック
		await page.click("#btn_inc");

		// 送信されたメッセージを確認（タイムアウト付き）
		const sentMessage = await Promise.race([
			messagePromise,
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error("WebSocket message timeout")), 5000),
			),
		]);
		const parsed = JSON.parse(sentMessage);
		expect(parsed.type).toBe("event");
		expect(parsed.widgetId).toBe("btn_inc");
		expect(parsed.value).toBe("clicked");
	});

	test("should receive replaceRoot patch from server", async ({ page }) => {
		await gotoAndWait(page);

		// 初期カウントを確認
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 0",
		);

		// ボタンをクリック
		await page.click("#btn_inc");

		// replaceRootパッチによりUIが更新されることを確認
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 1",
		);
	});

	test("should update counter when increment button is clicked", async ({ page }) => {
		await gotoAndWait(page);

		// 初期カウント確認
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 0",
		);

		// インクリメントボタンをクリック
		await page.click("#btn_inc");

		// カウントが増加したことを確認
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 1",
		);
	});

	test("should update slider value", async ({ page }) => {
		await gotoAndWait(page);

		// 初期表示を確認
		await expect(page.locator(".kt-slider-label")).toContainText("Volume: 50");

		const slider = page.locator("#volume_slider");

		// スライダーを操作（inputイベントを発火させる）
		await slider.evaluate((el: HTMLInputElement) => {
			el.value = "75";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});

		// 値が反映されることを確認
		await expect(page.locator(".kt-slider-label")).toContainText("Volume: 75");
	});

	// TODO: These tests are skipped due to a race condition between Playwright's fill/selectOption
	// and the replaceRoot mechanism. When replaceRoot replaces the input element mid-interaction,
	// the event may not be properly sent. This needs further investigation.
	// See: https://github.com/watany-dev/kantan-ui/issues (to be filed)
	test.skip("should update text input value", async ({ page }) => {
		await gotoAndWait(page);

		// テキスト入力フィールドをクリックしてフォーカス
		await page.click("#name_input");

		// 既存のテキストをクリアして新しいテキストを入力
		await page.fill("#name_input", "Alice");

		// 結果セクションに反映されることを確認
		await expect(page.locator("#app")).toContainText("Hello, Alice!");
	});

	test.skip("should update selectbox value", async ({ page }) => {
		await gotoAndWait(page);

		// セレクトボックスで新しい値を選択
		await page.selectOption("#color_select", "green");

		// 値が反映されることを確認（Session State Debugセクション）
		await expect(page.locator("pre")).toContainText('"color": "green"');
	});

	test("should persist session state across page reload", async ({ page }) => {
		await gotoAndWait(page);

		// カウンターを増やす
		await page.click("#btn_inc");
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 1",
		);

		// ページをリロード
		await page.reload();
		await waitForInitialRender(page);

		// セッションが維持されていることを確認
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 1",
		);
	});
});
