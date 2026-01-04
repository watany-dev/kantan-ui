import { expect, test } from "@playwright/test";
import { gotoAndWait } from "./helpers";

// 各テストで空のストレージ状態を使用
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Advanced Widget Behavior", () => {
	test("slider respects step value with keyboard", async ({ page }) => {
		await gotoAndWait(page);

		const slider = page.locator("#step_slider");
		await slider.focus();

		// 初期値確認
		await expect(slider).toHaveValue("50");

		// ArrowRightでstep分（10）増加
		await page.keyboard.press("ArrowRight");
		await expect(slider).toHaveValue("60");

		// もう一度
		await page.keyboard.press("ArrowRight");
		await expect(slider).toHaveValue("70");

		// ArrowLeftで減少
		await page.keyboard.press("ArrowLeft");
		await expect(slider).toHaveValue("60");
	});

	test("slider respects step value with direct input", async ({ page }) => {
		await gotoAndWait(page);

		const slider = page.locator("#step_slider");

		// 直接値を設定（step=10なので最も近い値にスナップされる）
		await slider.evaluate((el: HTMLInputElement) => {
			el.value = "75";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});

		// step=10なので75がそのまま設定される（HTMLの仕様では75は有効）
		// ただし最も近いstepに丸められる場合がある
		const value = await slider.inputValue();
		expect(Number.parseInt(value) % 10).toBe(0);
	});

	test("selectbox change triggers update", async ({ page }) => {
		await gotoAndWait(page);

		const select = page.locator("#color_select");

		// 各オプションを選択
		for (const color of ["green", "red", "purple", "blue"]) {
			await select.selectOption(color);
			await expect(page.locator("#debug-state")).toContainText(`"color": "${color}"`);
		}
	});

	test("multiple rapid selectbox changes", async ({ page }) => {
		await gotoAndWait(page);

		const select = page.locator("#color_select");

		// 高速で変更
		await select.selectOption("green");
		await select.selectOption("red");
		await select.selectOption("purple");

		// 最終値が正しい
		await expect(page.locator("#debug-state")).toContainText(`"color": "purple"`);
	});

	test("text input clears and accepts new value", async ({ page }) => {
		await gotoAndWait(page);

		const textInput = page.locator("#name_input");

		// クリアしてから新しい値を入力
		await textInput.click();
		await textInput.fill("");
		await textInput.fill("NewName");

		// 値が反映される
		await expect(page.locator("#results-card")).toContainText("Hello, NewName!");
	});

	test("step slider value is reflected in debug state", async ({ page }) => {
		await gotoAndWait(page);

		const slider = page.locator("#step_slider");

		await slider.evaluate((el: HTMLInputElement) => {
			el.value = "80";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});

		// debug-stateに反映される
		await expect(page.locator("#debug-state")).toContainText(`"stepVolume": 80`);
	});

	test("disabled button has disabled attribute", async ({ page }) => {
		await gotoAndWait(page);

		const disabledBtn = page.locator("#btn_disabled");

		// disabled属性が設定されている
		await expect(disabledBtn).toBeDisabled();
		await expect(disabledBtn).toHaveText("Disabled Button");
	});

	test("disabled button does not trigger counter increment", async ({ page }) => {
		await gotoAndWait(page);

		// 初期カウント確認
		await expect(page.locator("#counter-display")).toContainText("Current count: 0");

		// disabledボタンをクリック（force: trueで強制クリック）
		const disabledBtn = page.locator("#btn_disabled");
		await disabledBtn.click({ force: true });

		// 少し待機
		await page.waitForTimeout(200);

		// カウントが変わっていないことを確認
		await expect(page.locator("#counter-display")).toContainText("Current count: 0");
	});
});
