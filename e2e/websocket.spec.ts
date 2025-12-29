import { expect, test } from "@playwright/test";

test.describe("WebSocket connection and replaceRoot", () => {
	test("should load initial HTML", async ({ page }) => {
		await page.goto("/");

		// 初期HTMLの確認
		await expect(page.locator("#app h1")).toHaveText("kantan-ui");
		await expect(page.locator("#app p")).toHaveText(
			"WebSocket connection established!",
		);
	});

	test("should have button that can trigger sendEvent", async ({ page }) => {
		await page.goto("/");

		// ボタンが存在することを確認
		const button = page.locator("#app button");
		await expect(button).toHaveText("Click me");
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
				resolve(frame.payload.toString());
			});
		});

		// ボタンをクリック
		await page.click("#app button");

		// 送信されたメッセージを確認
		const sentMessage = await messagePromise;
		const parsed = JSON.parse(sentMessage);
		expect(parsed.type).toBe("event");
		expect(parsed.widgetId).toBe("btn1");
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

		// ボタンをクリックしてイベントを発火
		await page.click("#app button");

		// サーバからのレスポンスを確認
		const receivedMessage = await responsePromise;
		const parsed = JSON.parse(receivedMessage);
		expect(parsed.type).toBe("patch");
		expect(parsed.patches).toHaveLength(1);
		expect(parsed.patches[0].type).toBe("replaceRoot");
		expect(parsed.patches[0].html).toContain("kantan-ui");
	});

	test("should serve client.js", async ({ page }) => {
		const response = await page.goto("/client.js");
		expect(response?.status()).toBe(200);
		expect(response?.headers()["content-type"]).toContain("javascript");

		const content = await response?.text();
		expect(content).toContain("WebSocket");
		expect(content).toContain("sendEvent");
	});
});
