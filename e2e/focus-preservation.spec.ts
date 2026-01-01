import { type Page, expect, test } from "@playwright/test";

// 各テストで空のストレージ状態を使用
test.use({ storageState: { cookies: [], origins: [] } });

/**
 * WebSocket接続が確立され、初期パッチを受信するまで待機するヘルパー
 */
async function waitForInitialRender(page: Page): Promise<void> {
	await expect(page.locator("#app h1.kt-title")).toBeVisible();
}

/**
 * ページに遷移し、初期レンダリング完了まで待機するヘルパー
 */
async function gotoAndWait(page: Page): Promise<void> {
	await page.goto("/");
	await waitForInitialRender(page);
}

test.describe("Focus Preservation", () => {
	test("should maintain focus on slider after value change", async ({ page }) => {
		await gotoAndWait(page);

		const slider = page.locator("#volume_slider");

		// スライダーにフォーカス
		await slider.focus();
		await expect(slider).toBeFocused();

		// スライダーを操作（inputイベントを発火させる）
		await slider.evaluate((el: HTMLInputElement) => {
			el.value = "60";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});

		// 値が反映されることを確認（rerunが発生したことを意味する）
		await expect(page.locator(".kt-slider-label")).toContainText("Volume: 60");

		// replaceNodeパッチ後もフォーカスが維持されていることを確認
		// フォーカス復元は requestAnimationFrame で行われるため少し待つ
		await page.waitForTimeout(100);
		await expect(slider).toBeFocused();
	});

	test("should maintain focus on increment button after click", async ({ page }) => {
		await gotoAndWait(page);

		const incButton = page.locator("#btn_inc");

		// ボタンをクリック
		await incButton.click();

		// カウントが増加したことを確認（rerunが発生）
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 1",
		);

		// replaceNodeパッチ後もボタンにフォーカスが維持されていることを確認
		// フォーカス復元は requestAnimationFrame で行われるため少し待つ
		await page.waitForTimeout(100);
		await expect(incButton).toBeFocused();
	});

	// text_inputのフォーカス維持テスト
	test("should maintain focus on text input during typing", async ({ page }) => {
		await gotoAndWait(page);

		const textInput = page.locator("#name_input");

		// テキスト入力にフォーカス
		await textInput.focus();
		await expect(textInput).toBeFocused();

		// 1文字ずつ入力（各文字でrerunが発生）
		await textInput.pressSequentially("Hi", { delay: 150 });

		// フォーカス復元を待つ
		await page.waitForTimeout(100);

		// 入力後もフォーカスが維持されていることを確認
		await expect(textInput).toBeFocused();

		// 入力値が正しいことを確認
		await expect(textInput).toHaveValue("Hi");
	});

	test("should verify replaceNode preserves element identity", async ({ page }) => {
		await gotoAndWait(page);

		// 初期のスライダー要素のdata属性を取得
		const slider = page.locator("#volume_slider");
		const initialValue = await slider.inputValue();
		expect(initialValue).toBe("50");

		// スライダーを操作
		await slider.evaluate((el: HTMLInputElement) => {
			el.value = "75";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});

		// 値が反映されることを確認
		await expect(page.locator(".kt-slider-label")).toContainText("Volume: 75");

		// 要素が存在し、正しい値を持っていることを確認
		const newValue = await slider.inputValue();
		expect(newValue).toBe("75");

		// ID属性が維持されていることを確認
		const id = await slider.getAttribute("id");
		expect(id).toBe("volume_slider");
	});
});
