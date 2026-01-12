import { expect, test } from "@playwright/test";

// 各テストで空のストレージ状態を使用し、シリアル実行を強制
test.use({ storageState: { cookies: [], origins: [] } });
// WebSocketベースのテストは並列実行で競合するためシリアル実行
test.describe.configure({ mode: "serial" });

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
	// WebSocket初期化完了後の安定化待機
	await page.waitForTimeout(100);
}

/**
 * ボタンをJavaScriptでクリックするヘルパー
 * Playwright標準のclickはDOM更新を待機するため、WebSocketベースのUIでタイムアウトする場合がある
 */
async function clickButton(page: import("@playwright/test").Page, selector: string): Promise<void> {
	await page.evaluate((sel) => {
		const btn = document.querySelector(sel);
		if (btn instanceof HTMLElement) {
			btn.click();
		}
	}, selector);
}

/**
 * write_stream E2Eテスト
 *
 * kt.write_stream() APIのストリーミングテキスト表示機能をテスト
 */
test.describe("write_stream", () => {
	test("should load initial page correctly", async ({ page }) => {
		await gotoAndWait(page);

		// Title should be visible
		await expect(page.locator(".kt-title")).toHaveText("write_stream Test");

		// Description should be visible
		await expect(page.locator(".kt-write").first()).toContainText(
			"Testing kt.write_stream() functionality",
		);

		// All buttons should be present
		await expect(page.locator("#start_stream")).toBeVisible();
		await expect(page.locator("#start_delayed")).toBeVisible();
		await expect(page.locator("#start_markdown")).toBeVisible();
		await expect(page.locator("#array_stream")).toBeVisible();
	});

	test("should display stream container on button click", async ({ page }) => {
		await gotoAndWait(page);

		// Click to start stream using JavaScript click
		await clickButton(page, "#start_stream");

		// Stream container should appear
		const streamEl = page.locator(".kt-stream.test-stream");
		await expect(streamEl).toBeVisible();

		// Should have content element
		await expect(streamEl.locator(".kt-stream-content")).toBeVisible();
	});

	test("should complete stream with final content", async ({ page }) => {
		await gotoAndWait(page);

		await clickButton(page, "#start_stream");

		// Wait for stream to complete (has kt-stream-complete class)
		const streamEl = page.locator(".kt-stream.test-stream");
		await expect(streamEl).toHaveClass(/kt-stream-complete/, { timeout: 10000 });

		// Content should be "Hello, World!"
		const content = streamEl.locator(".kt-stream-content");
		await expect(content).toHaveText("Hello, World!");

		// Cursor should be removed after completion
		await expect(streamEl.locator(".kt-stream-cursor")).toHaveCount(0);
	});

	test("should display array stream content", async ({ page }) => {
		await gotoAndWait(page);

		await clickButton(page, "#array_stream");

		// Wait for stream to complete
		const streamEl = page.locator(".kt-stream.array-stream");
		await expect(streamEl).toHaveClass(/kt-stream-complete/, { timeout: 10000 });

		// Content should be concatenated
		const content = streamEl.locator(".kt-stream-content");
		await expect(content).toHaveText("Item 1, Item 2, Item 3");
	});

	test("should render markdown on completion", async ({ page }) => {
		await gotoAndWait(page);

		await clickButton(page, "#start_markdown");

		// Wait for stream to complete
		const streamEl = page.locator(".kt-stream.markdown-stream");
		await expect(streamEl).toHaveClass(/kt-stream-complete/, { timeout: 10000 });

		// Content should contain rendered markdown (h1 and bold)
		const content = streamEl.locator(".kt-stream-content");
		await expect(content.locator("h1")).toContainText("Title");
		await expect(content.locator("strong")).toHaveText("bold");
	});

	test("should have blinking cursor during stream", async ({ page }) => {
		await gotoAndWait(page);

		await clickButton(page, "#start_delayed");

		// Stream container should appear
		const streamEl = page.locator(".kt-stream.delayed-stream");
		await expect(streamEl).toBeVisible();

		// Cursor should be visible during streaming
		const cursor = streamEl.locator(".kt-stream-cursor");
		await expect(cursor).toBeVisible();
	});

	test("should handle sequential streams", async ({ page }) => {
		await gotoAndWait(page);

		// Start first stream and wait for completion
		await clickButton(page, "#start_stream");
		await expect(page.locator(".kt-stream.test-stream")).toHaveClass(/kt-stream-complete/, {
			timeout: 10000,
		});
		await expect(page.locator(".kt-stream-content")).toHaveText("Hello, World!");

		// Start second stream (replaces previous UI state)
		await clickButton(page, "#array_stream");
		await expect(page.locator(".kt-stream.array-stream")).toHaveClass(/kt-stream-complete/, {
			timeout: 10000,
		});
		await expect(page.locator(".kt-stream.array-stream .kt-stream-content")).toHaveText(
			"Item 1, Item 2, Item 3",
		);
	});
});
