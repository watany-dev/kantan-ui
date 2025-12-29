import { expect, test } from "@playwright/test";

test.describe("WebSocket connection and replaceRoot", () => {
	test("should load initial HTML", async ({ page }) => {
		await page.goto("/");

		// 初期HTMLの確認 - カウンターアプリのタイトル
		await expect(page.locator("#app h1")).toContainText("Hello");
		await expect(page.locator("#app h2")).toContainText("Counter:");
	});

	test("should have increment button", async ({ page }) => {
		await page.goto("/");

		// インクリメントボタンが存在することを確認
		const button = page.locator("#btn_inc");
		await expect(button).toContainText("Increment");
		await expect(button).toBeVisible();
	});

	test("should establish WebSocket connection", async ({ page }) => {
		// WebSocket接続をモニター
		const wsPromise = page.waitForEvent("websocket");

		await page.goto("/");

		const ws = await wsPromise;
		expect(ws.url()).toContain("/ws");
	});

	test("should send event when button is clicked", async ({ page }) => {
		const wsPromise = page.waitForEvent("websocket");

		await page.goto("/");

		const ws = await wsPromise;

		// WebSocketメッセージを監視
		const messagePromise = new Promise<string>((resolve) => {
			ws.on("framesent", (frame) => {
				const payload = frame.payload.toString();
				// initメッセージをスキップ
				if (payload.includes('"type":"event"')) {
					resolve(payload);
				}
			});
		});

		// インクリメントボタンをクリック
		await page.click("#btn_inc");

		// 送信されたメッセージを確認
		const sentMessage = await messagePromise;
		const parsed = JSON.parse(sentMessage);
		expect(parsed.type).toBe("event");
		expect(parsed.widgetId).toBe("btn_inc");
		expect(parsed.value).toBe("clicked");
	});

	test("should receive replaceRoot patch from server", async ({ page }) => {
		const wsPromise = page.waitForEvent("websocket");

		await page.goto("/");

		const ws = await wsPromise;

		// サーバからのメッセージを監視
		const responsePromise = new Promise<string>((resolve) => {
			ws.on("framereceived", (frame) => {
				resolve(frame.payload.toString());
			});
		});

		// インクリメントボタンをクリックしてイベントを発火
		await page.click("#btn_inc");

		// サーバからのレスポンスを確認
		const receivedMessage = await responsePromise;
		const parsed = JSON.parse(receivedMessage);
		expect(parsed.type).toBe("patch");
		expect(parsed.patches).toHaveLength(1);
		expect(parsed.patches[0].type).toBe("replaceRoot");
		expect(parsed.patches[0].html).toContain("Hello");
	});

	test("should increment counter when clicking increment button", async ({
		page,
	}) => {
		await page.goto("/");

		// 初期カウンターを確認
		await expect(page.locator("#app h2")).toContainText("Counter: 0");

		// インクリメントボタンをクリック
		await page.click("#btn_inc");

		// カウンターが増加したことを確認
		await expect(page.locator("#app h2")).toContainText("Counter: 1");
	});

	test("should decrement counter when clicking decrement button", async ({
		page,
	}) => {
		await page.goto("/");

		// まずインクリメント
		await page.click("#btn_inc");
		await expect(page.locator("#app h2")).toContainText("Counter: 1");

		// デクリメント
		await page.click("#btn_dec");
		await expect(page.locator("#app h2")).toContainText("Counter: 0");
	});
});
