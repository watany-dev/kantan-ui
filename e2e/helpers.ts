import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * WebSocket接続が確立され、初期パッチを受信するまで待機するヘルパー
 */
export async function waitForInitialRender(page: Page): Promise<void> {
	await expect(page.locator("#app h1.kt-title")).toBeVisible();
}

/**
 * ページに遷移し、初期レンダリング完了まで待機するヘルパー
 */
export async function gotoAndWait(page: Page): Promise<void> {
	await page.goto("/");
	await waitForInitialRender(page);
}

/**
 * rerunの完了（DOM更新）を待機する
 * 指定したテキストが含まれる要素が現れるまで待機
 */
export async function waitForRerun(
	page: Page,
	selector: string,
	expectedText: string,
): Promise<void> {
	await expect(page.locator(selector)).toContainText(expectedText, { timeout: 5000 });
}

/**
 * テキスト入力をrerun対応で行う
 * replaceRootによるDOM置換と競合しないよう、1文字ずつ入力して
 * 各文字の反映を待機する
 */
export async function typeWithRerun(
	page: Page,
	inputLocator: Locator,
	text: string,
	options: {
		/** 各文字入力後の遅延（ミリ秒） */
		delay?: number;
	} = {},
): Promise<void> {
	const { delay = 150 } = options;

	// 入力フィールドをクリックしてフォーカス
	await inputLocator.click();

	// 既存のテキストをクリア（Ctrl+Aで全選択してBackspace）
	await page.keyboard.press("Control+a");
	await page.keyboard.press("Backspace");
	await page.waitForTimeout(delay);

	// 1文字ずつ入力
	for (const char of text) {
		await page.keyboard.type(char);
		// rerun完了を待機
		await page.waitForTimeout(delay);
	}
}

/**
 * セレクトボックスをrerun対応で変更する
 * Playwrightのネイティブ selectOption() を使用し、
 * 反映を待機する
 */
export async function selectWithRerun(
	page: Page,
	selectLocator: Locator,
	value: string,
	options: {
		/** 変更後の待機時間（ミリ秒） */
		delay?: number;
	} = {},
): Promise<void> {
	const { delay = 200 } = options;

	// Playwrightのネイティブ selectOption を使用
	await selectLocator.selectOption(value);

	// rerun完了を待機
	await page.waitForTimeout(delay);
}

/**
 * 要素がフォーカスされるまで待機（リトライ付き）
 */
export async function waitForFocus(locator: Locator, timeout = 2000): Promise<boolean> {
	const startTime = Date.now();
	while (Date.now() - startTime < timeout) {
		const isFocused = await locator.evaluate((el) => document.activeElement === el);
		if (isFocused) return true;
		await locator.page().waitForTimeout(50);
	}
	return false;
}
