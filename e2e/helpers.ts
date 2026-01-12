import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * WebSocket接続が確立され、初期パッチを受信するまで待機するヘルパー
 */
export async function waitForInitialRender(page: Page): Promise<void> {
	// まずタイトルが表示されるのを待つ（HTTP応答）
	await expect(page.locator("#app h1.kt-title")).toBeVisible();
	// WebSocket接続が完了するまで待つ（接続インジケーターが"Connected"になる）
	await expect(page.locator("#kt-connection-status")).toContainText("Connected", {
		timeout: 10000,
	});
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
 *
 * @param options.expectedValue - 入力完了後に期待される値（指定時は値の反映を待機）
 */
export async function typeWithRerun(
	page: Page,
	inputLocator: Locator,
	text: string,
	options: {
		/** 入力完了後に期待される値（条件待機に使用） */
		expectedValue?: string;
	} = {},
): Promise<void> {
	// 入力フィールドをクリックしてフォーカス
	await inputLocator.click();

	// 既存のテキストをクリア（Ctrl+Aで全選択してBackspace）
	await page.keyboard.press("Control+a");
	await page.keyboard.press("Backspace");

	// テキストを入力（Playwrightのtype()は内部で適切に待機）
	await inputLocator.pressSequentially(text, { delay: 50 });

	// 期待値が指定されている場合は値の反映を待機
	if (options.expectedValue !== undefined) {
		await expect(inputLocator).toHaveValue(options.expectedValue, { timeout: 5000 });
	}
}

/**
 * セレクトボックスをrerun対応で変更する
 * Playwrightのネイティブ selectOption() を使用し、
 * 反映を待機する
 *
 * @param options.waitForSelector - 変更後に待機するセレクター（DOM更新完了の確認用）
 * @param options.waitForText - 変更後に待機するテキスト（waitForSelectorと併用）
 */
export async function selectWithRerun(
	selectLocator: Locator,
	value: string,
	options: {
		/** 変更後に待機するセレクター */
		waitForSelector?: string;
		/** 変更後に待機するテキスト */
		waitForText?: string;
	} = {},
): Promise<void> {
	const page = selectLocator.page();

	// Playwrightのネイティブ selectOption を使用
	await selectLocator.selectOption(value);

	// 条件が指定されている場合はDOM更新を待機
	if (options.waitForSelector && options.waitForText) {
		await expect(page.locator(options.waitForSelector)).toContainText(options.waitForText, {
			timeout: 5000,
		});
	}
}

/**
 * 要素がフォーカスされるまで待機（Playwrightのリトライ機構を使用）
 */
export async function waitForFocus(locator: Locator, timeout = 2000): Promise<boolean> {
	try {
		await expect(locator).toBeFocused({ timeout });
		return true;
	} catch {
		return false;
	}
}

/**
 * セッションが完全に確立されるまで待機するヘルパー
 * WebSocketで sessionId を受信するまで待機する
 */
export async function waitForSessionEstablished(page: Page, timeout = 5000): Promise<void> {
	const sessionKey = "__kt_session_id__";
	await page.waitForFunction(
		(key) => {
			const value = localStorage.getItem(key);
			return value !== null && value.length > 0;
		},
		sessionKey,
		{ timeout },
	);
}
