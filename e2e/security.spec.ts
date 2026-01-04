import { expect, test } from "@playwright/test";
import { gotoAndWait } from "./helpers";

// 各テストで空のストレージ状態を使用
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Security - XSS Prevention", () => {
	test("kt.write() prevents script injection", async ({ page }) => {
		await gotoAndWait(page);

		// テキスト入力にスクリプトを入力
		const textInput = page.locator("#name_input");
		await textInput.evaluate((el: HTMLInputElement) => {
			el.value = "<script>alert('xss')</script>";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});

		// 結果にスクリプトがエスケープされて表示されることを確認
		const resultsCard = page.locator("#results-card");
		await expect(resultsCard).toContainText("<script>");

		// スクリプトが実行されていないことを確認（テキストとして表示されている）
		const html = await resultsCard.innerHTML();
		expect(html).not.toContain("<script>alert");
		expect(html).toContain("&lt;script&gt;");
	});

	test("text input with HTML entities is escaped", async ({ page }) => {
		await gotoAndWait(page);

		const textInput = page.locator("#name_input");
		await textInput.evaluate((el: HTMLInputElement) => {
			el.value = '<img src="x" onerror="alert(1)">';
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});

		// imgタグがエスケープされていることを確認
		const resultsCard = page.locator("#results-card");
		await expect(resultsCard).toContainText("<img");

		// 画像要素が作成されていないことを確認
		const imgCount = await page.locator("#results-card img").count();
		expect(imgCount).toBe(0);
	});
});

test.describe("Security - CSP", () => {
	test("page has Content-Security-Policy header", async ({ page }) => {
		const response = await page.goto("/");
		const cspHeader = response?.headers()["content-security-policy"];

		expect(cspHeader).toBeDefined();
		expect(cspHeader).toContain("default-src 'self'");
		expect(cspHeader).toContain("script-src");
	});
});

test.describe("Security - Session", () => {
	test("session ID is generated for each new session", async ({ page, context }) => {
		await gotoAndWait(page);

		// localStorageからセッションIDを取得
		const sessionId1 = await page.evaluate(() => {
			return localStorage.getItem("kt-session-id");
		});

		expect(sessionId1).toBeTruthy();

		// 新しいページ（同じコンテキスト）では同じセッションID
		const page2 = await context.newPage();
		await page2.goto("/");
		await expect(page2.locator("#kt-connection-status")).toContainText("Connected", {
			timeout: 10000,
		});

		const sessionId2 = await page2.evaluate(() => {
			return localStorage.getItem("kt-session-id");
		});

		// タブスコープなので異なるセッションID
		expect(sessionId2).toBeTruthy();
		expect(sessionId2).not.toBe(sessionId1);

		await page2.close();
	});

	test("session state is isolated between tabs", async ({ page, context }) => {
		await gotoAndWait(page);

		// タブ1でカウンターを増やす
		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 2",
		);

		// 新しいタブを開く
		const page2 = await context.newPage();
		await page2.goto("/");
		await expect(page2.locator("#kt-connection-status")).toContainText("Connected", {
			timeout: 10000,
		});

		// タブ2では初期状態（0）であることを確認
		await expect(page2.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 0",
		);

		await page2.close();
	});
});
