import { expect, test } from "@playwright/test";

test.describe("WebSocket connection and replaceRoot", () => {
	test("should load initial HTML", async ({ page }) => {
		await page.goto("/");

		// 初期HTMLの確認（新しいデモアプリ）
		await expect(page.locator("#app h1.kt-title")).toHaveText("kantan-ui Demo");
		await expect(page.locator("#app .kt-write").first()).toContainText("Streamlit風の宣言的API");
	});

	test("should have buttons that can trigger sendEvent", async ({ page }) => {
		await page.goto("/");

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
		const wsPromise = page.waitForEvent("websocket");

		await page.goto("/");

		const ws = await wsPromise;

		// 最初のinitメッセージを待つ
		await page.waitForTimeout(100);

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

		// 初期ロードの後、ボタンクリックでpatchを受信することを確認
		await page.waitForTimeout(100);

		// サーバからのメッセージを監視
		const responsePromise = new Promise<string>((resolve) => {
			ws.on("framereceived", (frame) => {
				resolve(frame.payload.toString());
			});
		});

		// ボタンをクリックしてイベントを発火
		await page.click("#btn_inc");

		// サーバからのレスポンスを確認
		const receivedMessage = await responsePromise;
		const parsed = JSON.parse(receivedMessage);
		expect(parsed.type).toBe("patch");
		expect(parsed.patches).toHaveLength(1);
		expect(parsed.patches[0].type).toBe("replaceRoot");
		expect(parsed.patches[0].html).toContain("kantan-ui");
	});

	test("should update counter when increment button is clicked", async ({ page }) => {
		await page.goto("/");

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
		await page.goto("/");

		// スライダーを操作
		const slider = page.locator("#volume_slider");
		await slider.fill("75");

		// 値が反映されることを確認
		await expect(page.locator(".kt-slider-label")).toContainText("Volume: 75");
	});
});
