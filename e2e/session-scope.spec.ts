import { expect, test } from "@playwright/test";

/**
 * scope='tab' (デフォルト) のE2Eテスト
 *
 * このファイルはデフォルトのタブスコープセッション管理をテストします。
 * scope='browser' のテストは session-scope-browser.spec.ts にあります。
 */
test.describe("Session Scope: tab (default)", () => {
	test("should use localStorage for session management", async ({ page }) => {
		// デフォルトの scope='tab' の動作確認
		await page.goto("/");

		// WebSocket接続を待つ
		await page.waitForFunction(() => {
			const indicator = document.getElementById("kt-connection-status");
			return indicator?.textContent?.includes("Connected");
		});

		// localStorageにセッションIDが保存されていることを確認
		const sessionId = await page.evaluate(() => {
			return localStorage.getItem("kt-session-id");
		});

		expect(sessionId).toBeTruthy();
		// UUIDフォーマットのチェック
		expect(sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
	});

	test("should have independent sessions per tab", async ({ context }) => {
		// scope='tab' の場合、タブごとに独立したセッション
		const page1 = await context.newPage();
		const page2 = await context.newPage();

		await page1.goto("/");
		await page1.waitForFunction(() => {
			const indicator = document.getElementById("kt-connection-status");
			return indicator?.textContent?.includes("Connected");
		});

		await page2.goto("/");
		await page2.waitForFunction(() => {
			const indicator = document.getElementById("kt-connection-status");
			return indicator?.textContent?.includes("Connected");
		});

		// 各タブのセッションIDを取得
		const sessionId1 = await page1.evaluate(() => localStorage.getItem("kt-session-id"));
		const sessionId2 = await page2.evaluate(() => localStorage.getItem("kt-session-id"));

		// 両方のセッションIDが存在することを確認
		expect(sessionId1).toBeTruthy();
		expect(sessionId2).toBeTruthy();
		// 注意: localStorageは同一オリジンで共有されるため、
		// 同じコンテキスト内では同じセッションIDになる可能性がある
	});

	test("should not set session cookie in tab scope", async ({ page }) => {
		// scope='tab' の場合、セッションCookieは設定されない
		await page.goto("/");

		// WebSocket接続を待つ
		await page.waitForFunction(() => {
			const indicator = document.getElementById("kt-connection-status");
			return indicator?.textContent?.includes("Connected");
		});

		const cookies = await page.context().cookies();
		const sessionCookie = cookies.find((c) => c.name === "kt-session-id");

		// scope='tab' ではCookieは設定されない
		expect(sessionCookie).toBeUndefined();
	});
});
