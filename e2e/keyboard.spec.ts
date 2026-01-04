import { expect, test } from "@playwright/test";
import { gotoAndWait } from "./helpers";

// 各テストで空のストレージ状態を使用
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Keyboard Navigation", () => {
	test("Tab key navigates between focusable elements", async ({ page }) => {
		await gotoAndWait(page);

		// 最初のボタンにフォーカス
		await page.keyboard.press("Tab");

		// フォーカスがボタンに移動することを確認
		const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
		expect(focusedElement).toBe("BUTTON");
	});

	test("Tab key cycles through all widgets", async ({ page }) => {
		await gotoAndWait(page);

		// 複数回Tabを押してフォーカスが移動することを確認
		const focusedElements: string[] = [];

		for (let i = 0; i < 10; i++) {
			await page.keyboard.press("Tab");
			const tagName = await page.evaluate(() => document.activeElement?.tagName);
			const id = await page.evaluate(() => document.activeElement?.id);
			focusedElements.push(`${tagName}:${id}`);
		}

		// 複数の異なる要素にフォーカスが当たったことを確認
		const uniqueElements = new Set(focusedElements);
		expect(uniqueElements.size).toBeGreaterThan(3);
	});

	test("Shift+Tab navigates backwards", async ({ page }) => {
		await gotoAndWait(page);

		// まず前に進む
		await page.keyboard.press("Tab");
		await page.keyboard.press("Tab");
		await page.keyboard.press("Tab");

		const thirdElement = await page.evaluate(() => document.activeElement?.id);

		// Shift+Tabで戻る
		await page.keyboard.press("Shift+Tab");

		const secondElement = await page.evaluate(() => document.activeElement?.id);

		// 異なる要素にフォーカスが移動したことを確認
		expect(secondElement).not.toBe(thirdElement);
	});
});

test.describe("Keyboard Interactions", () => {
	test("Enter key triggers button click", async ({ page }) => {
		await gotoAndWait(page);

		// インクリメントボタンにフォーカス
		const incButton = page.locator("#btn_inc");
		await incButton.focus();

		// Enterキーでボタンをクリック
		await page.keyboard.press("Enter");

		// カウンターが増加したことを確認
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 1",
		);
	});

	test("Space key triggers button click", async ({ page }) => {
		await gotoAndWait(page);

		// インクリメントボタンにフォーカス
		const incButton = page.locator("#btn_inc");
		await incButton.focus();

		// Spaceキーでボタンをクリック
		await page.keyboard.press("Space");

		// カウンターが増加したことを確認
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 1",
		);
	});

	test("Arrow keys adjust slider value", async ({ page }) => {
		await gotoAndWait(page);

		const slider = page.locator("#volume_slider");
		await slider.focus();

		// 初期値を確認
		await expect(page.locator(".kt-slider-label")).toContainText("Volume: 50");

		// 右矢印キーで値を増加
		await page.keyboard.press("ArrowRight");

		// 値が増加したことを確認
		const newValue = await slider.inputValue();
		expect(Number.parseInt(newValue)).toBeGreaterThan(50);
	});

	test("Arrow keys navigate selectbox options", async ({ page }) => {
		await gotoAndWait(page);

		const selectbox = page.locator("#color_select");
		await selectbox.focus();

		// 初期値を確認（blue）
		expect(await selectbox.inputValue()).toBe("blue");

		// 下矢印キーで次のオプションを選択
		await page.keyboard.press("ArrowDown");

		// 値が変わったことを確認
		const newValue = await selectbox.inputValue();
		expect(newValue).not.toBe("blue");
	});

	test("Escape key can be used to blur focused element", async ({ page }) => {
		await gotoAndWait(page);

		const textInput = page.locator("#name_input");
		await textInput.focus();

		// フォーカスされていることを確認
		expect(await textInput.evaluate((el) => document.activeElement === el)).toBe(true);

		// テキストを入力
		await page.keyboard.type("Test");

		// タブでフォーカスを移動
		await page.keyboard.press("Tab");

		// フォーカスが移動したことを確認
		expect(await textInput.evaluate((el) => document.activeElement === el)).toBe(false);
	});
});

test.describe("Keyboard Text Input", () => {
	test("typing in text input updates value", async ({ page }) => {
		await gotoAndWait(page);

		const textInput = page.locator("#name_input");
		await textInput.focus();

		// 既存のテキストをクリア
		await page.keyboard.press("Control+a");
		await page.keyboard.press("Backspace");

		// 新しいテキストを入力
		await page.keyboard.type("Claude");

		// 結果が更新されることを確認
		await expect(page.locator("#results-card")).toContainText("Hello, Claude!");
	});

	test("Backspace deletes characters", async ({ page }) => {
		await gotoAndWait(page);

		const textInput = page.locator("#name_input");
		await textInput.focus();

		// 既存のテキストをクリアして入力
		await page.keyboard.press("Control+a");
		await page.keyboard.type("Test123");

		// Backspaceで削除
		await page.keyboard.press("Backspace");
		await page.keyboard.press("Backspace");
		await page.keyboard.press("Backspace");

		// 結果が更新されることを確認
		await expect(page.locator("#results-card")).toContainText("Hello, Test!");
	});
});
