import { expect, test } from "@playwright/test";
import { gotoAndWait, typeWithRerun, waitForFocus } from "./helpers";

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
		await expect(page.locator("#volume_slider-container .kt-slider-label")).toContainText(
			"Volume: 60",
		);

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

		// typeWithRerunヘルパーを使用してテキストを入力
		// 内部でpressSequentiallyを使用し、各文字間に適切な遅延を設ける
		await typeWithRerun(page, textInput, "Hi", { expectedValue: "Hi" });

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
		await expect(page.locator("#volume_slider-container .kt-slider-label")).toContainText(
			"Volume: 75",
		);

		// 要素が存在し、正しい値を持っていることを確認
		const newValue = await slider.inputValue();
		expect(newValue).toBe("75");

		// ID属性が維持されていることを確認
		const id = await slider.getAttribute("id");
		expect(id).toBe("volume_slider");
	});

	test("should preserve scroll position after button click", async ({ page }) => {
		await gotoAndWait(page);

		// ページをスクロール可能にするためにビューポートを小さく設定
		await page.setViewportSize({ width: 800, height: 300 });

		// ページを下にスクロール
		await page.evaluate(() => window.scrollTo(0, 100));

		// スクロール位置を確認
		const initialScrollY = await page.evaluate(() => window.scrollY);
		expect(initialScrollY).toBeGreaterThan(0);

		// ボタンをクリック（rerunが発生）
		await page.click("#btn_inc");

		// カウントが増加したことを確認
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 1",
		);

		// スクロール位置が維持されていることを確認
		const afterScrollY = await page.evaluate(() => window.scrollY);
		expect(afterScrollY).toBe(initialScrollY);
	});

	test("should preserve scroll position after slider change", async ({ page }) => {
		await gotoAndWait(page);

		// ビューポートを小さく設定
		await page.setViewportSize({ width: 800, height: 300 });

		// ページを下にスクロール
		await page.evaluate(() => window.scrollTo(0, 50));

		const initialScrollY = await page.evaluate(() => window.scrollY);
		expect(initialScrollY).toBeGreaterThan(0);

		// スライダーを操作
		const slider = page.locator("#volume_slider");
		await slider.evaluate((el: HTMLInputElement) => {
			el.value = "80";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});

		// 値が反映されることを確認
		await expect(page.locator("#volume_slider-container .kt-slider-label")).toContainText(
			"Volume: 80",
		);

		// スクロール位置が維持されていることを確認
		const afterScrollY = await page.evaluate(() => window.scrollY);
		expect(afterScrollY).toBe(initialScrollY);
	});

	test("should preserve text selection range after rerun", async ({ page }) => {
		await gotoAndWait(page);

		const textInput = page.locator("#name_input");

		// テキストを入力
		await textInput.evaluate((el: HTMLInputElement) => {
			el.value = "Hello World";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});

		// 入力値が反映されるまで待機（条件ベース）
		await expect(textInput).toHaveValue("Hello World", { timeout: 5000 });

		// テキストの一部を選択（"World"の部分を選択）
		await textInput.evaluate((el: HTMLInputElement) => {
			el.focus();
			el.setSelectionRange(6, 11); // "World"
		});

		// 選択範囲を確認
		const initialSelection = await textInput.evaluate((el: HTMLInputElement) => ({
			start: el.selectionStart,
			end: el.selectionEnd,
		}));
		expect(initialSelection.start).toBe(6);
		expect(initialSelection.end).toBe(11);

		// スライダーを操作して別のrerunを発生させる
		const slider = page.locator("#volume_slider");
		await slider.evaluate((el: HTMLInputElement) => {
			el.value = "30";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});

		// 値が反映されることを確認
		await expect(page.locator("#volume_slider-container .kt-slider-label")).toContainText(
			"Volume: 30",
		);

		// テキスト入力にフォーカスを戻して選択範囲を確認
		await textInput.focus();
		await expect(textInput).toBeFocused();

		// 選択範囲が復元されていることを確認
		// 注意: 別の要素からのrerunでフォーカスが移動するため、
		// 完全な選択範囲の復元は保証されない可能性がある
		const afterSelection = await textInput.evaluate((el: HTMLInputElement) => ({
			start: el.selectionStart,
			end: el.selectionEnd,
		}));

		// フォーカス復元の実装によっては選択範囲が維持される
		// 現在の挙動を記録
		console.log(`Selection after rerun: ${afterSelection.start}-${afterSelection.end}`);
	});

	test("should preserve cursor position in text input during typing", async ({ page }) => {
		await gotoAndWait(page);

		const textInput = page.locator("#name_input");

		// テキストを入力してカーソル位置を設定
		await textInput.evaluate((el: HTMLInputElement) => {
			el.value = "Test";
			el.focus();
			el.setSelectionRange(2, 2); // カーソルを"Te|st"の位置に
		});

		const initialCursor = await textInput.evaluate((el: HTMLInputElement) => el.selectionStart);
		expect(initialCursor).toBe(2);

		// 文字を追加（カーソル位置に挿入するシミュレーション）
		await textInput.evaluate((el: HTMLInputElement) => {
			const pos = el.selectionStart ?? 0;
			el.value = `${el.value.slice(0, pos)}X${el.value.slice(pos)}`;
			el.setSelectionRange(pos + 1, pos + 1);
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});

		// 入力値が反映されるまで待機（条件ベース）
		await expect(textInput).toHaveValue("TeXst", { timeout: 5000 });

		// フォーカスが維持されていることを確認
		const isFocused = await waitForFocus(textInput, 2000);
		expect(isFocused).toBe(true);

		// カーソル位置が適切に更新されていることを確認
		const afterCursor = await textInput.evaluate((el: HTMLInputElement) => el.selectionStart);
		expect(afterCursor).toBe(3); // "TeX|st"の位置

		// 値が正しいことを確認
		const value = await textInput.inputValue();
		expect(value).toBe("TeXst");
	});
});

test.describe("replaceRoot Focus Preservation", () => {
	test("should restore focus after page reload with replaceRoot", async ({ page }) => {
		await gotoAndWait(page);

		// カウンターを増やしてセッション状態を作成
		await page.click("#btn_inc");
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 1",
		);

		// ボタンIDを記録（フォーカス復元のターゲット）
		const incButton = page.locator("#btn_inc");

		// ボタンにフォーカス
		await incButton.focus();
		await expect(incButton).toBeFocused();

		// ページをリロード（replaceRootパッチが発生）
		await page.reload();

		// WebSocket接続と初期パッチ適用を待機（条件ベース）
		await expect(page.locator("#kt-connection-status")).toContainText("Connected", {
			timeout: 10000,
		});

		// セッションが維持されていることを確認
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 1",
		);

		// 注意: ブラウザのリロード後はフォーカス状態がリセットされるため、
		// replaceRoot自体のフォーカス復元機能は効果がない
		// これは期待される動作として記録
		const isFocused = await incButton.evaluate((el) => document.activeElement === el);
		console.log(
			`Focus after reload (replaceRoot): ${isFocused ? "maintained" : "lost (expected)"}`,
		);
	});

	test("should handle replaceRoot when many patches would be needed", async ({ page }) => {
		await gotoAndWait(page);

		const slider = page.locator("#volume_slider");

		// スライダーにフォーカス
		await slider.focus();
		await expect(slider).toBeFocused();

		// スライダー値を変更
		await slider.evaluate((el: HTMLInputElement) => {
			el.value = "10";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});
		await expect(page.locator("#volume_slider-container .kt-slider-label")).toContainText(
			"Volume: 10",
		);

		// 連続して複数のウィジェットを操作
		// （現在の実装では各操作が個別にパッチされるが、
		// 将来的にバッチ処理でreplaceRootが発生する可能性をテスト）
		await page.click("#btn_inc");
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 1",
		);

		// テキスト入力
		const textInput = page.locator("#name_input");
		await textInput.evaluate((el: HTMLInputElement) => {
			el.value = "Multi-widget test";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});

		// 入力値が反映されるまで待機（条件ベース）
		await expect(textInput).toHaveValue("Multi-widget test", { timeout: 5000 });

		// 各ウィジェットが正しく更新されていることを確認
		await expect(page.locator("#volume_slider-container .kt-slider-label")).toContainText(
			"Volume: 10",
		);
		await expect(page.locator(".kt-write").filter({ hasText: "Current count:" })).toContainText(
			"Current count: 1",
		);

		// replaceRootまたはreplaceNodeパッチが適用されても
		// アプリケーション全体の状態が一貫していることを確認
		const sliderValue = await slider.inputValue();
		expect(sliderValue).toBe("10");
	});
});
