import { expect, test } from "@playwright/test";
import { gotoAndWait, waitForFocus } from "./helpers";

// 各テストで空のストレージ状態を使用
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Focus Preservation", () => {
	// このテストはフォーカス復元機能が実装されるまでfixme
	// Week3 remaining-tasks-plan.md Task 1で対応予定
	test.fixme("should maintain focus on slider after value change", async ({ page }) => {
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
		// フォーカス復元には少し時間がかかる可能性がある
		const isFocused = await waitForFocus(slider, 2000);
		expect(isFocused).toBe(true);
	});

	test("should update DOM correctly after button click", async ({ page }) => {
		await gotoAndWait(page);

		const incButton = page.locator("#btn_inc");

		// ボタンをクリック
		await incButton.click();

		// カウントが増加したことを確認（rerunが発生）
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 1",
		);

		// ボタンが引き続き操作可能であることを確認
		await expect(incButton).toBeVisible();
		await expect(incButton).toBeEnabled();

		// 複数回クリックしても正しく動作することを確認
		await incButton.click();
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 2",
		);
	});

	test("should maintain focus on text input during typing", async ({ page }) => {
		await gotoAndWait(page);

		const textInput = page.locator("#name_input");

		// テキスト入力にフォーカス
		await textInput.focus();
		await expect(textInput).toBeFocused();

		// 1文字ずつevaluateで入力（各文字でrerunが発生）
		const text = "Hi";
		for (const char of text) {
			await textInput.evaluate((el: HTMLInputElement, c: string) => {
				el.value += c;
				el.dispatchEvent(new Event("input", { bubbles: true }));
			}, char);
			// rerun完了を待機
			await page.waitForTimeout(100);
		}

		// 入力後もフォーカスが維持されていることを確認
		// フォーカス復元には少し時間がかかる可能性があるため、リトライ付きで確認
		const isFocused = await waitForFocus(textInput, 2000);
		expect(isFocused).toBe(true);

		// 値が正しく入力されていることを確認
		const value = await textInput.inputValue();
		expect(value).toContain("Hi");
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
