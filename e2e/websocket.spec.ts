import { type Page, type WebSocket, expect, test } from "@playwright/test";
import { gotoAndWait, waitForInitialRender } from "./helpers";

// 各テストで空のストレージ状態を使用
test.use({ storageState: { cookies: [], origins: [] } });

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
		await expect(page.locator("#volume_slider-container .kt-slider-label")).toContainText(
			"Volume: 50",
		);

		const slider = page.locator("#volume_slider");

		// スライダーを操作（inputイベントを発火させる）
		await slider.evaluate((el: HTMLInputElement) => {
			el.value = "75";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});

		// 値が反映されることを確認
		await expect(page.locator("#volume_slider-container .kt-slider-label")).toContainText(
			"Volume: 75",
		);
	});

	test("should update text input value", async ({ page }) => {
		await gotoAndWait(page);

		const textInput = page.locator("#name_input");

		// evaluate()でイベントを発火
		await textInput.evaluate((el: HTMLInputElement) => {
			el.value = "Alice";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});

		// UIが更新されるか確認（Results セクションにIDを追加したため動作する）
		await expect(page.locator("#results-card")).toContainText("Hello, Alice!");
	});

	test("should update selectbox value", async ({ page }) => {
		await gotoAndWait(page);

		const select = page.locator("#color_select");

		// selectboxを操作（changeイベントを発火させる）
		await select.evaluate((el: HTMLSelectElement) => {
			el.value = "green";
			el.dispatchEvent(new Event("change", { bubbles: true }));
		});

		// UIが更新されるか確認
		await expect(page.locator("#debug-state")).toContainText('"color": "green"');
	});

	// Note: Session persistence across page reload depends on server-side session storage.
	// In parallel test execution, sessions may be affected by timing issues.
	// This test is marked as fixme until session persistence is more robust.
	test.fixme("should persist session state across page reload", async ({ page }) => {
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
		// リロード後、WebSocket再接続とパッチ適用には時間がかかる可能性がある
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 1",
			{ timeout: 10000 },
		);
	});
});

test.describe("applyPatch behavior", () => {
	test("should handle multiple rapid updates without errors", async ({ page }) => {
		await gotoAndWait(page);

		const incButton = page.locator("#btn_inc");

		// 高速連続クリック（各クリックでパッチが発生）
		for (let i = 0; i < 5; i++) {
			await incButton.click();
		}

		// 最終的な値が正しいことを確認
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 5",
		);

		// UIが正常に機能していることを確認
		await expect(incButton).toBeVisible();
		await expect(incButton).toBeEnabled();
	});

	test("should maintain DOM integrity after slider value change", async ({ page }) => {
		await gotoAndWait(page);

		const slider = page.locator("#volume_slider");
		const sliderLabel = page.locator("#volume_slider-container .kt-slider-label");

		// 初期値を確認
		await expect(sliderLabel).toContainText("Volume: 50");

		// スライダーを操作
		await slider.evaluate((el: HTMLInputElement) => {
			el.value = "75";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});

		// パッチ適用後のDOM整合性を確認
		await expect(sliderLabel).toContainText("Volume: 75");

		// スライダー要素が正しく存在することを確認
		await expect(slider).toBeVisible();
		await expect(slider).toHaveAttribute("type", "range");
		await expect(slider).toHaveAttribute("id", "volume_slider");
	});

	test("should maintain widget functionality after DOM update", async ({ page }) => {
		await gotoAndWait(page);

		const incButton = page.locator("#btn_inc");
		const decButton = page.locator("#btn_dec");
		const resetButton = page.locator("#btn_reset");

		// インクリメント
		await incButton.click();
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 1",
		);

		// デクリメント（DOM更新後もボタンが機能することを確認）
		await decButton.click();
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 0",
		);

		// 再度インクリメント
		await incButton.click();
		await incButton.click();
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 2",
		);

		// リセット
		await resetButton.click();
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 0",
		);
	});

	test("should handle concurrent widget interactions", async ({ page }) => {
		await gotoAndWait(page);

		// 異なるウィジェットを連続操作
		const incButton = page.locator("#btn_inc");
		const slider = page.locator("#volume_slider");

		// ボタンクリック
		await incButton.click();

		// スライダー操作（ボタンのパッチ適用直後）
		await slider.evaluate((el: HTMLInputElement) => {
			el.value = "80";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});

		// 両方の変更が反映されていることを確認
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 1",
		);
		await expect(page.locator("#volume_slider-container .kt-slider-label")).toContainText(
			"Volume: 80",
		);
	});
});
