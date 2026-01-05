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

		// UIの更新を待機
		const resultsCard = page.locator("#results-card");
		await expect(resultsCard.locator("h2")).toContainText(xssPayload, { timeout: 5000 });

		// scriptタグが実行可能な形で存在しないことを確認
		const scriptTags = page.locator("#results-card script");
		const scriptCount = await scriptTags.count();
		expect(scriptCount).toBe(0);

		// エスケープされたテキストが表示されることを確認
		// escapeHtml により < は &lt; に変換されてDOMに挿入されるが、
		// textContent()で取得すると元の文字として表示される
		const h2Text = await resultsCard.locator("h2").textContent();
		expect(h2Text).toContain("<script>");
	});
});

test.describe("Output API - Alert messages", () => {
	test("kt.success() outputs alert with kt-alert-success class", async ({ page }) => {
		await gotoAndWait(page);

		const successAlert = page.locator(".kt-alert-success");
		await expect(successAlert).toBeVisible();
		await expect(successAlert).toContainText("This is a success message");

		// アイコンが表示されていることを確認
		await expect(successAlert.locator(".kt-alert-icon")).toContainText("✓");
	});

	test("kt.error() outputs alert with kt-alert-error class", async ({ page }) => {
		await gotoAndWait(page);

		const errorAlert = page.locator(".kt-alert-error");
		await expect(errorAlert).toBeVisible();
		await expect(errorAlert).toContainText("This is an error message");

		// アイコンが表示されていることを確認
		await expect(errorAlert.locator(".kt-alert-icon")).toContainText("✕");
	});

	test("kt.warning() outputs alert with kt-alert-warning class", async ({ page }) => {
		await gotoAndWait(page);

		const warningAlert = page.locator(".kt-alert-warning");
		await expect(warningAlert).toBeVisible();
		await expect(warningAlert).toContainText("This is a warning message");

		// アイコンが表示されていることを確認
		await expect(warningAlert.locator(".kt-alert-icon")).toContainText("⚠");
	});

	test("kt.info() outputs alert with kt-alert-info class", async ({ page }) => {
		await gotoAndWait(page);

		const infoAlert = page.locator(".kt-alert-info");
		await expect(infoAlert).toBeVisible();
		await expect(infoAlert).toContainText("This is an info message");

		// アイコンが表示されていることを確認
		await expect(infoAlert.locator(".kt-alert-icon")).toContainText("ℹ");
	});

	test("alert messages have proper styling", async ({ page }) => {
		await gotoAndWait(page);

		// 各アラートが適切な背景色を持っていることを確認
		const successAlert = page.locator(".kt-alert-success");
		await expect(successAlert).toHaveCSS("background", /rgb\(212, 237, 218\)/);

		const errorAlert = page.locator(".kt-alert-error");
		await expect(errorAlert).toHaveCSS("background", /rgb\(248, 215, 218\)/);

		const warningAlert = page.locator(".kt-alert-warning");
		await expect(warningAlert).toHaveCSS("background", /rgb\(255, 243, 205\)/);

		const infoAlert = page.locator(".kt-alert-info");
		await expect(infoAlert).toHaveCSS("background", /rgb\(209, 236, 241\)/);
	});
});
