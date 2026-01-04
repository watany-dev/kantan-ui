import { expect, test } from "@playwright/test";
import { gotoAndWait } from "./helpers";

// 各テストで空のストレージ状態を使用
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Output API - kt.title and kt.write", () => {
	test("kt.title() outputs h1 with kt-title class", async ({ page }) => {
		await gotoAndWait(page);

		// kt.title() が <h1 class="kt-title"> を出力することを確認
		const title = page.locator("h1.kt-title");
		await expect(title).toBeVisible();
		await expect(title).toHaveText("kantan-ui Demo");
	});

	test("kt.write() outputs div with kt-write class", async ({ page }) => {
		await gotoAndWait(page);

		// kt.write() が <div class="kt-write"> を出力することを確認
		const writeElements = page.locator("div.kt-write");
		await expect(writeElements.first()).toBeVisible();

		// 最初のkt.write()の内容を確認
		await expect(writeElements.first()).toContainText("Streamlit風の宣言的API");
	});

	test("kt.write() converts numbers and booleans to strings", async ({ page }) => {
		await gotoAndWait(page);

		// カウンターの表示で数値が文字列化されていることを確認
		// Current count: 0 という形式で表示される
		const counterDisplay = page.locator("#counter-display");
		await expect(counterDisplay).toContainText("Current count: 0");

		// インクリメントして数値が正しく文字列化されることを確認
		await page.click("#btn_inc");
		await expect(counterDisplay).toContainText("Current count: 1");
	});
});

test.describe("Output API - kt.header, kt.subheader, kt.divider", () => {
	test("kt.header() outputs h2 with kt-header class", async ({ page }) => {
		await gotoAndWait(page);

		// kt.header() が <h2 class="kt-header"> を出力することを確認
		const headers = page.locator("h2.kt-header");
		await expect(headers.first()).toBeVisible();

		// "Counter" ヘッダーが存在することを確認
		await expect(page.locator("h2.kt-header").filter({ hasText: "Counter" })).toBeVisible();
	});

	test("kt.subheader() outputs h3 with kt-subheader class", async ({ page }) => {
		await gotoAndWait(page);

		// kt.subheader() が <h3 class="kt-subheader"> を出力することを確認
		const subheaders = page.locator("h3.kt-subheader");
		await expect(subheaders.first()).toBeVisible();

		// "Text Input" サブヘッダーが存在することを確認
		await expect(page.locator("h3.kt-subheader").filter({ hasText: "Text Input" })).toBeVisible();
	});

	test("kt.divider() outputs hr with kt-divider class", async ({ page }) => {
		await gotoAndWait(page);

		// kt.divider() が <hr class="kt-divider"> を出力することを確認
		const dividers = page.locator("hr.kt-divider");
		await expect(dividers.first()).toBeVisible();

		// 複数のdividerが存在することを確認
		const count = await dividers.count();
		expect(count).toBeGreaterThanOrEqual(3);
	});
});
