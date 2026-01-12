import { expect, test } from "@playwright/test";

/**
 * write_stream E2Eテスト
 *
 * kt.write_stream() APIのストリーミングテキスト表示機能をテスト
 */
test.describe("write_stream", () => {
	test("should load initial page correctly", async ({ page }) => {
		await page.goto("/");

		// Title should be visible
		await expect(page.locator(".kt-title")).toHaveText("write_stream Test");

		// Description should be visible
		await expect(page.locator(".kt-write").first()).toContainText(
			"Testing kt.write_stream() functionality",
		);
	});

	test("should display stream container on button click", async ({ page }) => {
		await page.goto("/");

		// Wait for WebSocket connection
		const button = page.getByRole("button", { name: "Start Stream" });
		await expect(button).toBeEnabled();

		// Click to start stream
		await button.click();

		// Stream container should appear
		const streamEl = page.locator(".kt-stream.test-stream");
		await expect(streamEl).toBeVisible();

		// Should have content and cursor elements
		await expect(streamEl.locator(".kt-stream-content")).toBeVisible();
	});

	test("should complete stream with final content", async ({ page }) => {
		await page.goto("/");

		const button = page.getByRole("button", { name: "Start Stream" });
		await expect(button).toBeEnabled();

		await button.click();

		// Wait for stream to complete (has kt-stream-complete class)
		const streamEl = page.locator(".kt-stream.test-stream");
		await expect(streamEl).toHaveClass(/kt-stream-complete/);

		// Content should be "Hello, World!"
		const content = streamEl.locator(".kt-stream-content");
		await expect(content).toHaveText("Hello, World!");

		// Cursor should be removed
		await expect(streamEl.locator(".kt-stream-cursor")).toHaveCount(0);
	});

	test("should display array stream content", async ({ page }) => {
		await page.goto("/");

		const button = page.getByRole("button", { name: "Array Stream" });
		await expect(button).toBeEnabled();

		await button.click();

		// Wait for stream to complete
		const streamEl = page.locator(".kt-stream.array-stream");
		await expect(streamEl).toHaveClass(/kt-stream-complete/);

		// Content should be concatenated
		const content = streamEl.locator(".kt-stream-content");
		await expect(content).toHaveText("Item 1, Item 2, Item 3");
	});

	test("should render markdown on completion", async ({ page }) => {
		await page.goto("/");

		const button = page.getByRole("button", { name: "Start Markdown Stream" });
		await expect(button).toBeEnabled();

		await button.click();

		// Wait for stream to complete
		const streamEl = page.locator(".kt-stream.markdown-stream");
		await expect(streamEl).toHaveClass(/kt-stream-complete/);

		// Content should contain rendered markdown (h1 and bold)
		const content = streamEl.locator(".kt-stream-content");
		await expect(content.locator("h1")).toContainText("Title");
		await expect(content.locator("strong")).toHaveText("bold");
	});

	test("should have blinking cursor during stream", async ({ page }) => {
		await page.goto("/");

		const button = page.getByRole("button", { name: "Start Delayed Stream" });
		await expect(button).toBeEnabled();

		await button.click();

		// Stream container should appear
		const streamEl = page.locator(".kt-stream.delayed-stream");
		await expect(streamEl).toBeVisible();

		// Cursor should be visible during streaming
		const cursor = streamEl.locator(".kt-stream-cursor");
		await expect(cursor).toBeVisible();
	});

	test("should handle multiple streams", async ({ page }) => {
		await page.goto("/");

		// Start first stream
		const button1 = page.getByRole("button", { name: "Start Stream" });
		await expect(button1).toBeEnabled();
		await button1.click();

		// Start second stream
		const button2 = page.getByRole("button", { name: "Array Stream" });
		await button2.click();

		// Both streams should be visible and complete
		await expect(page.locator(".kt-stream.test-stream")).toHaveClass(/kt-stream-complete/);
		await expect(page.locator(".kt-stream.array-stream")).toHaveClass(/kt-stream-complete/);
	});
});
