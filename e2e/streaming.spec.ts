import { expect, test } from "@playwright/test";

/**
 * ストリーミング機能のE2Eテスト
 * ストリーミング有効時にアプリが正常に動作することを確認
 *
 * Note: ストリーミング時はstreamAppend + 最終diff でDOMが構築されるため、
 * 一時的に重複要素が発生する可能性がある。テストは最終状態を検証する。
 */
test.describe("Streaming enabled server", () => {
	test("should load initial page correctly", async ({ page }) => {
		await page.goto("/");

		// Title should be visible
		await expect(page.locator(".kt-title").first()).toHaveText("Streaming Test");

		// Description should be visible
		await expect(page.locator(".kt-write").first()).toContainText("streaming enabled");
	});

	test("should display counter", async ({ page }) => {
		await page.goto("/");

		// Counter display should show initial value (use first() for streaming compatibility)
		await expect(page.locator("#counter-display").first()).toHaveText("Count: 0");
	});

	test("should increment counter on button click", async ({ page }) => {
		await page.goto("/");

		// Wait for button to be ready (WebSocket connection established)
		const button = page.getByRole("button", { name: "Increment" }).first();
		await expect(button).toBeEnabled();

		// Click increment button
		await button.click();

		// Wait for update - check that at least one counter shows updated value
		await expect(page.locator("#counter-display").first()).toHaveText("Count: 1");
	});

	test("should display all streamed items", async ({ page }) => {
		await page.goto("/");

		// All items should be rendered (even with streaming, final state should be complete)
		const writeElements = page.locator(".kt-write");

		// Wait for content to load - at least 6 elements (description + 5 items)
		// With streaming, there may be more due to partial updates
		await expect(writeElements.first()).toBeVisible();
		const count = await writeElements.count();
		expect(count).toBeGreaterThanOrEqual(6);
	});

	test("should handle multiple button clicks with streaming", async ({ page }) => {
		await page.goto("/");

		// Wait for button to be ready (WebSocket connection established)
		const button = page.getByRole("button", { name: "Increment" }).first();
		await expect(button).toBeEnabled();

		await button.click();
		await expect(page.locator("#counter-display").first()).toHaveText("Count: 1");

		await button.click();
		await expect(page.locator("#counter-display").first()).toHaveText("Count: 2");

		await button.click();
		await expect(page.locator("#counter-display").first()).toHaveText("Count: 3");
	});
});
