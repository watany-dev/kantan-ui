import { expect, test } from "@playwright/test";
import { gotoAndWait, waitForInitialRender } from "./helpers";

// 各テストで空のストレージ状態を使用
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Security", () => {
	test("text input escapes HTML special characters", async ({ page }) => {
		await gotoAndWait(page);

		const textInput = page.locator("#name_input");
		const maliciousInput = "<script>alert('xss')</script>";

		// 悪意のある入力を設定
		await textInput.evaluate((el: HTMLInputElement, value: string) => {
			el.value = value;
			el.dispatchEvent(new Event("input", { bubbles: true }));
		}, maliciousInput);

		// エスケープされた文字列が表示されることを確認
		// HTML内で<script>がテキストとして表示される
		await expect(page.locator("#results-card")).toContainText("<script>");

		// スクリプトが実行されていないことを確認
		let alertFired = false;
		page.on("dialog", () => {
			alertFired = true;
		});
		await page.waitForTimeout(500);
		expect(alertFired).toBe(false);
	});

	test("counter display uses safe HTML rendering", async ({ page }) => {
		await gotoAndWait(page);

		// カウンター操作後もXSSが発生しないことを確認
		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");

		// ページ内にインラインスクリプト（正規のもの以外）が注入されていないことを確認
		const dangerousScripts = await page.evaluate(() => {
			const scripts = document.querySelectorAll("script:not([src])");
			let hasDangerousScript = false;
			for (const script of scripts) {
				if (script.textContent?.includes("alert")) {
					hasDangerousScript = true;
				}
			}
			return hasDangerousScript;
		});
		expect(dangerousScripts).toBe(false);
	});

	test("invalid session ID does not crash the app", async ({ page }) => {
		// 不正なセッションIDをlocalStorageに設定
		await page.goto("/");
		await page.evaluate(() => {
			localStorage.setItem("kt_session_id", "invalid-session-id-12345");
		});

		// ページリロード
		await page.reload();
		await waitForInitialRender(page);

		// アプリが正常に動作することを確認
		await expect(page.locator("#app h1.kt-title")).toBeVisible();
		await expect(page.locator("#btn_inc")).toBeEnabled();
	});

	test("session state is isolated between different sessions", async ({ browser }) => {
		// コンテキスト1: カウンターを増やす
		const context1 = await browser.newContext();
		const page1 = await context1.newPage();
		await page1.goto("/");
		await waitForInitialRender(page1);
		await page1.click("#btn_inc");
		await expect(page1.locator("#counter-display")).toContainText("Current count: 1");

		// コンテキスト2: 別セッションでは0のまま
		const context2 = await browser.newContext();
		const page2 = await context2.newPage();
		await page2.goto("/");
		await waitForInitialRender(page2);
		await expect(page2.locator("#counter-display")).toContainText("Current count: 0");

		await context1.close();
		await context2.close();
	});
});
