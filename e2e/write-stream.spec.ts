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

		// Click to start stream using ID selector with force option
		await page.locator("#start_stream").click({ force: true });

		// Stream container should appear
		const streamEl = page.locator(".kt-stream.test-stream");
		await expect(streamEl).toBeVisible();

		// Should have content element
		await expect(streamEl.locator(".kt-stream-content")).toBeVisible();
	});

	test("should complete stream with final content", async ({ page }) => {
		await gotoAndWait(page);

		await page.locator("#start_stream").click({ force: true });

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

		await page.locator("#array_stream").click({ force: true });

		// Wait for stream to complete
		const streamEl = page.locator(".kt-stream.array-stream");
		await expect(streamEl).toHaveClass(/kt-stream-complete/, { timeout: 10000 });

		// Content should be concatenated
		const content = streamEl.locator(".kt-stream-content");
		await expect(content).toHaveText("Item 1, Item 2, Item 3");
	});

	test("should render markdown on completion", async ({ page }) => {
		await gotoAndWait(page);

		await page.locator("#start_markdown").click({ force: true });

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

		await page.locator("#start_delayed").click({ force: true });

		// Stream container should appear
		const streamEl = page.locator(".kt-stream.delayed-stream");
		await expect(streamEl).toBeVisible();

		// Cursor should be visible during streaming
		const cursor = streamEl.locator(".kt-stream-cursor");
		await expect(cursor).toBeVisible();
	});

	test("should handle multiple streams", async ({ page }) => {
		await gotoAndWait(page);

		// Start first stream
		await page.locator("#start_stream").click({ force: true });

		// Wait for first stream container to appear
		await expect(page.locator(".kt-stream.test-stream")).toBeVisible();

		// Start second stream
		await page.locator("#array_stream").click({ force: true });

		// Both streams should complete
		await expect(page.locator(".kt-stream.test-stream")).toHaveClass(/kt-stream-complete/, {
			timeout: 10000,
		});
		await expect(page.locator(".kt-stream.array-stream")).toHaveClass(/kt-stream-complete/, {
			timeout: 10000,
		});
	});
});
