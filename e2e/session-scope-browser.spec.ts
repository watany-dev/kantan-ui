import { expect, test } from "@playwright/test";

/**
 * scope='browser' のE2Eテスト
 *
 * これらのテストは scope='browser' で設定されたサーバー (port 3001) に対して実行されます。
 * Cookieベースのセッション管理をテストします。
 */
test.describe("Session Scope: browser", () => {
	test("should set HttpOnly cookie on initial page load", async ({ page }) => {
		await page.goto("/");

		// WebSocket接続を待つ
		await page.waitForFunction(() => {
			const indicator = document.getElementById("kt-connection-status");
			return indicator?.textContent?.includes("Connected");
		});

		const cookies = await page.context().cookies();
		const sessionCookie = cookies.find((c) => c.name === "kt-session-id");

		expect(sessionCookie).toBeDefined();
		expect(sessionCookie?.httpOnly).toBe(true);
		expect(sessionCookie?.sameSite).toBe("Lax");
	});

	test("should maintain session across page reloads", async ({ page }) => {
		await page.goto("/");

		// WebSocket接続を待つ
		await page.waitForFunction(() => {
			const indicator = document.getElementById("kt-connection-status");
			return indicator?.textContent?.includes("Connected");
		});

		// 初回Cookieを取得
		const cookiesBefore = await page.context().cookies();
		const sessionIdBefore = cookiesBefore.find((c) => c.name === "kt-session-id")?.value;

		expect(sessionIdBefore).toBeTruthy();

		// ページリロード
		await page.reload();

		// WebSocket再接続を待つ
		await page.waitForFunction(() => {
			const indicator = document.getElementById("kt-connection-status");
			return indicator?.textContent?.includes("Connected");
		});

		// リロード後のCookieを取得
		const cookiesAfter = await page.context().cookies();
		const sessionIdAfter = cookiesAfter.find((c) => c.name === "kt-session-id")?.value;

		// セッションIDが同じであることを確認
		expect(sessionIdAfter).toBe(sessionIdBefore);
	});

	test("should share session across multiple tabs", async ({ context }) => {
		const page1 = await context.newPage();
		const page2 = await context.newPage();

		await page1.goto("/");
		await page1.waitForFunction(() => {
			const indicator = document.getElementById("kt-connection-status");
			return indicator?.textContent?.includes("Connected");
		});

		// Page1のCookieを取得
		const cookies1 = await context.cookies();
		const sessionId1 = cookies1.find((c) => c.name === "kt-session-id")?.value;

		expect(sessionId1).toBeTruthy();

		await page2.goto("/");
		await page2.waitForFunction(() => {
			const indicator = document.getElementById("kt-connection-status");
			return indicator?.textContent?.includes("Connected");
		});

		// Page2のCookieを取得（同じコンテキストなので同じCookie）
		const cookies2 = await context.cookies();
		const sessionId2 = cookies2.find((c) => c.name === "kt-session-id")?.value;

		// 両タブで同じセッションID
		expect(sessionId2).toBe(sessionId1);
	});

	test("should not expose sessionId to client JavaScript", async ({ page }) => {
		await page.goto("/");

		// WebSocket接続を待つ
		await page.waitForFunction(() => {
			const indicator = document.getElementById("kt-connection-status");
			return indicator?.textContent?.includes("Connected");
		});

		// JavaScriptからCookieにアクセスしてもセッションIDは見えない
		const documentCookie = await page.evaluate(() => document.cookie);

		// kt-session-id は HttpOnly なので document.cookie には含まれない
		expect(documentCookie).not.toContain("kt-session-id");
	});

	test("should persist state across tabs with browser scope", async ({ context }) => {
		const page1 = await context.newPage();
		const page2 = await context.newPage();

		// Page1でカウンターを増やす
		await page1.goto("/");
		await page1.waitForFunction(() => {
			const indicator = document.getElementById("kt-connection-status");
			return indicator?.textContent?.includes("Connected");
		});

		await page1.click("#btn_inc");
		await expect(page1.locator("#counter-display")).toContainText("Current count: 1");

		// Page2で同じセッションの状態を確認
		await page2.goto("/");
		await page2.waitForFunction(() => {
			const indicator = document.getElementById("kt-connection-status");
			return indicator?.textContent?.includes("Connected");
		});

		// Page2でもカウンターが1であることを確認（セッション共有）
		await expect(page2.locator("#counter-display")).toContainText("Current count: 1");
	});
});
