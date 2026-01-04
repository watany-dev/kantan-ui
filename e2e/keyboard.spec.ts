import { expect, test } from "@playwright/test";
import { gotoAndWait } from "./helpers";

// 各テストで空のストレージ状態を使用
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Keyboard Navigation", () => {
	test("Tab key moves focus between buttons", async ({ page }) => {
		await gotoAndWait(page);

		// 最初のボタンにフォーカス
		await page.locator("#btn_inc").focus();
		await expect(page.locator("#btn_inc")).toBeFocused();

		// Tabで次の要素へ
		await page.keyboard.press("Tab");
		await expect(page.locator("#btn_dec")).toBeFocused();

		// さらにTab
		await page.keyboard.press("Tab");
		await expect(page.locator("#btn_reset")).toBeFocused();
	});

	test("Enter key activates focused button", async ({ page }) => {
		await gotoAndWait(page);

		// ボタンにフォーカスしてEnter
		await page.locator("#btn_inc").focus();
		await page.keyboard.press("Enter");

		// カウンターが増加
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");
	});

	test("Space key activates focused button", async ({ page }) => {
		await gotoAndWait(page);

		// ボタンにフォーカスしてSpace
		await page.locator("#btn_inc").focus();
		await page.keyboard.press("Space");

		// カウンターが増加
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");
	});

	test("Arrow keys adjust slider value", async ({ page }) => {
		await gotoAndWait(page);

		const slider = page.locator("#volume_slider");
		await slider.focus();

		// 初期値確認
		await expect(page.locator(".kt-slider-label")).toContainText("Volume: 50");

		// ArrowRightで増加
		await page.keyboard.press("ArrowRight");
		await expect(slider).toHaveValue("51");

		// ArrowLeftで減少
		await page.keyboard.press("ArrowLeft");
		await expect(slider).toHaveValue("50");
	});
});
