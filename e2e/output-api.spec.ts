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

test.describe("Output API - kt.html and XSS escaping", () => {
	test("kt.html() outputs raw HTML without escaping", async ({ page }) => {
		await gotoAndWait(page);

		// kt.html() が生のHTMLを出力することを確認
		// デモアプリの results-card はkt.html()で出力されている
		const resultsCard = page.locator("#results-card");
		await expect(resultsCard).toBeVisible();

		// HTMLの構造が保持されていることを確認
		await expect(resultsCard.locator("h2")).toBeVisible();
		await expect(resultsCard.locator("p")).toBeVisible();
	});

	test("user input is escaped to prevent XSS", async ({ page }) => {
		await gotoAndWait(page);

		const textInput = page.locator("#name_input");

		// XSSペイロードを入力
		const xssPayload = '<script>alert("xss")</script>';
		await textInput.evaluate((el: HTMLInputElement, payload: string) => {
			el.value = payload;
			el.dispatchEvent(new Event("input", { bubbles: true }));
		}, xssPayload);

		// 結果カードを確認（エスケープされているはず）
		const resultsCard = page.locator("#results-card");

		// scriptタグが実行可能な形で存在しないことを確認
		const scriptTags = page.locator("#results-card script");
		const scriptCount = await scriptTags.count();
		expect(scriptCount).toBe(0);

		// エスケープされたテキストが表示されることを確認
		// escapeHtml により < は &lt; に変換されている
		const h2Text = await resultsCard.locator("h2").textContent();
		expect(h2Text).toContain("<script>");
	});
});
