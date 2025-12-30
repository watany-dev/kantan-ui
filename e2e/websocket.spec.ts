import { expect, test } from "@playwright/test";

// 各テストで空のストレージ状態を使用
test.use({ storageState: { cookies: [], origins: [] } });

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

		// WebSocket接続が確立されるまで待つ（初期patchを受信するまで）
		await new Promise<void>((resolve) => {
			ws.on("framereceived", () => resolve());
		});

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
		await page.goto("/");

		// 初期カウントを確認
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 0",
		);

		// ボタンをクリック
		await page.click("#btn_inc");

		// replaceRootパッチによりUIが更新されることを確認
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 1",
			{ timeout: 10000 },
		);
	});

	test("should update counter when increment button is clicked", async ({ page }) => {
		await page.goto("/");

		// 初期カウント確認
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 0",
		);

		// インクリメントボタンをクリック
		await page.click("#btn_inc");

		// カウントが増加したことを確認（リトライあり）
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 1",
			{ timeout: 10000 },
		);
	});

	test("should update slider value", async ({ page }) => {
		await page.goto("/");

		// 初期表示を待つ
		await expect(page.locator(".kt-slider-label")).toContainText("Volume: 50");

		const slider = page.locator("#volume_slider");

		// スライダーを操作（inputイベントを発火させる）
		await slider.evaluate((el: HTMLInputElement) => {
			el.value = "75";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});

		// 値が反映されることを確認（リトライあり）
		await expect(page.locator(".kt-slider-label")).toContainText("Volume: 75", { timeout: 10000 });
	});
});
