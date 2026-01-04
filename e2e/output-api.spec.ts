import { expect, test } from "@playwright/test";

// 各テストで空のストレージ状態を使用
test.use({ storageState: { cookies: [], origins: [] } });

/**
 * WebSocket接続が確立され、初期パッチを受信するまで待機するヘルパー
 */
async function waitForInitialRender(page: import("@playwright/test").Page): Promise<void> {
	await expect(page.locator("#app h1.kt-title")).toBeVisible();
	await expect(page.locator("#kt-connection-status")).toContainText("Connected", {
		timeout: 10000,
	});
}

test.describe("Output API - Basic", () => {
	test("kt.title() displays h1 element", async ({ page }) => {
		await page.goto("/");
		await waitForInitialRender(page);

		await expect(page.locator("h1.kt-title")).toHaveText("Output API Test");
	});

	test("kt.write() displays string content", async ({ page }) => {
		await page.goto("/");
		await waitForInitialRender(page);

		await expect(page.locator(".kt-write").first()).toContainText("This is a write output");
	});

	test("kt.write() displays number content", async ({ page }) => {
		await page.goto("/");
		await waitForInitialRender(page);

		// 数値42が出力されていることを確認
		const writeElements = page.locator(".kt-write");
		await expect(writeElements.nth(1)).toHaveText("42");
	});

	test("kt.write() displays boolean content", async ({ page }) => {
		await page.goto("/");
		await waitForInitialRender(page);

		// 真偽値trueが出力されていることを確認
		const writeElements = page.locator(".kt-write");
		await expect(writeElements.nth(2)).toHaveText("true");
	});

	test("kt.header() displays h2 element", async ({ page }) => {
		await page.goto("/");
		await waitForInitialRender(page);

		await expect(page.locator("h2.kt-header").first()).toHaveText("Header Section");
	});

	test("kt.subheader() displays h3 element", async ({ page }) => {
		await page.goto("/");
		await waitForInitialRender(page);

		await expect(page.locator("h3.kt-subheader")).toHaveText("Subheader Section");
	});

	test("kt.text() displays content (alias for write)", async ({ page }) => {
		await page.goto("/");
		await waitForInitialRender(page);

		await expect(page.locator(".kt-write")).toContainText("This is text output");
	});

	test("kt.divider() displays hr element", async ({ page }) => {
		await page.goto("/");
		await waitForInitialRender(page);

		const dividers = page.locator("hr.kt-divider");
		await expect(dividers.first()).toBeVisible();
		// 複数のdividerが存在することを確認
		expect(await dividers.count()).toBeGreaterThanOrEqual(3);
	});
});

test.describe("Output API - HTML Escape", () => {
	test("kt.write() escapes HTML special characters", async ({ page }) => {
		await page.goto("/");
		await waitForInitialRender(page);

		// <script>タグがエスケープされて表示されることを確認
		const xssElement = page.locator(".kt-write").filter({
			hasText: "<script>alert('xss')</script>",
		});
		await expect(xssElement).toBeVisible();

		// スクリプトが実行されていないことを確認（alertが呼ばれていない）
		// エスケープされたテキストとして表示されていることで確認
		await expect(xssElement).toContainText("<script>");
		await expect(xssElement).toContainText("</script>");
	});
});

test.describe("Output API - Raw HTML", () => {
	test("kt.html() renders raw HTML content", async ({ page }) => {
		await page.goto("/");
		await waitForInitialRender(page);

		// カスタムHTMLが正しくレンダリングされることを確認
		const customElement = page.locator("#custom-html");
		await expect(customElement).toBeVisible();
		await expect(customElement).toHaveClass(/custom-class/);
		await expect(customElement).toHaveText("Custom HTML Content");
	});
});

test.describe("Output API - Toggle Element (removeNode)", () => {
	test("toggle button removes and restores element", async ({ page }) => {
		await page.goto("/");
		await waitForInitialRender(page);

		// 初期状態で要素が表示されている
		await expect(page.locator("#removable-element")).toBeVisible();
		await expect(page.locator("#toggle-status")).toContainText("Element visible: true");

		// トグルボタンをクリック
		await page.click("#btn_toggle");

		// 要素が非表示になる
		await expect(page.locator("#removable-element")).not.toBeVisible();
		await expect(page.locator("#toggle-status")).toContainText("Element visible: false");

		// 再度トグルボタンをクリック
		await page.click("#btn_toggle");

		// 要素が再表示される
		await expect(page.locator("#removable-element")).toBeVisible();
		await expect(page.locator("#toggle-status")).toContainText("Element visible: true");
	});
});
