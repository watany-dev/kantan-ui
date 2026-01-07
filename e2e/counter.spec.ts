import { expect, test } from "@playwright/test";

/**
 * Counter E2E Tests
 *
 * カウンターの増減操作をテストします。
 * 特に+と-を交互に操作する際のバグを検出するためのテスト。
 */
test.describe("Counter Operations", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/");
		// WebSocket接続を待つ
		await page.waitForFunction(() => {
			const indicator = document.getElementById("kt-connection-status");
			return indicator?.textContent?.includes("Connected");
		});
	});

	test("should increment counter", async ({ page }) => {
		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");

		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 2");

		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 3");
	});

	test("should decrement counter", async ({ page }) => {
		// まず3回インクリメント
		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 3");

		// デクリメント
		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 2");

		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");

		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 0");
	});

	test("should not go below zero", async ({ page }) => {
		await expect(page.locator("#counter-display")).toContainText("Current count: 0");

		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 0");

		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 0");
	});

	test("should handle alternating increment and decrement - pattern 1", async ({ page }) => {
		// + - + - + パターン
		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");

		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 0");

		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");

		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 0");

		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");
	});

	test("should handle alternating increment and decrement - pattern 2", async ({ page }) => {
		// ++ - ++ - パターン
		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 2");

		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");

		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 3");

		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 2");
	});

	test("should handle rapid alternating clicks", async ({ page }) => {
		// 高速で交互にクリック
		await page.click("#btn_inc");
		await page.click("#btn_dec");
		await page.click("#btn_inc");
		await page.click("#btn_dec");
		await page.click("#btn_inc");

		// 最終的に1になるはず（+1 -1 +1 -1 +1 = 1）
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");
	});

	test("should handle multiple rapid increments followed by decrements", async ({ page }) => {
		// 5回インクリメント
		for (let i = 0; i < 5; i++) {
			await page.click("#btn_inc");
		}
		await expect(page.locator("#counter-display")).toContainText("Current count: 5");

		// 3回デクリメント
		for (let i = 0; i < 3; i++) {
			await page.click("#btn_dec");
		}
		await expect(page.locator("#counter-display")).toContainText("Current count: 2");
	});

	test("should correctly track state after complex alternating sequence", async ({ page }) => {
		// 複雑なシーケンス: +++ -- + - ++++ ---
		// 期待値: 3 - 2 + 1 - 1 + 4 - 3 = 2

		// +++ (3)
		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 3");

		// -- (1)
		await page.click("#btn_dec");
		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");

		// + (2)
		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 2");

		// - (1)
		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");

		// ++++ (5)
		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 5");

		// --- (2)
		await page.click("#btn_dec");
		await page.click("#btn_dec");
		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 2");
	});

	test("should handle reset button correctly after alternating operations", async ({ page }) => {
		// + + -
		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");

		// リセット
		await page.click("#btn_reset");
		await expect(page.locator("#counter-display")).toContainText("Current count: 0");

		// リセット後も正常に動作するか
		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");

		await page.click("#btn_dec");
		await expect(page.locator("#counter-display")).toContainText("Current count: 0");
	});

	test("should maintain correct count with wait between operations", async ({ page }) => {
		// 各操作間に待機を入れて、状態の同期を確認
		await page.click("#btn_inc");
		await page.waitForTimeout(100);
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");

		await page.click("#btn_dec");
		await page.waitForTimeout(100);
		await expect(page.locator("#counter-display")).toContainText("Current count: 0");

		await page.click("#btn_inc");
		await page.waitForTimeout(100);
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");

		await page.click("#btn_inc");
		await page.waitForTimeout(100);
		await expect(page.locator("#counter-display")).toContainText("Current count: 2");

		await page.click("#btn_dec");
		await page.waitForTimeout(100);
		await expect(page.locator("#counter-display")).toContainText("Current count: 1");
	});

	/**
	 * バグ検出用テスト
	 * 報告されたバグ: 3から-を押すと、2ではなく4,3,2と順番に表示される
	 * このテストは、デクリメント時に一度もインクリメントされないことを確認する
	 */
	test("should NOT show intermediate increment when decrementing from 3", async ({ page }) => {
		// カウンターを3にする
		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 3");

		// DOM変更を監視する
		await page.evaluate(() => {
			const target = document.getElementById("counter-display");
			if (!target) return;

			const observer = new MutationObserver((mutations) => {
				for (const mutation of mutations) {
					if (mutation.type === "characterData" || mutation.type === "childList") {
						const text = target.textContent || "";
						const match = text.match(/Current count: (\d+)/);
						if (match) {
							(window as unknown as { __counterValues: string[] }).__counterValues =
								(window as unknown as { __counterValues: string[] }).__counterValues || [];
							(window as unknown as { __counterValues: string[] }).__counterValues.push(match[1]);
						}
					}
				}
			});
			observer.observe(target, { childList: true, characterData: true, subtree: true });
			(window as unknown as { __counterObserver: MutationObserver }).__counterObserver = observer;
			(window as unknown as { __counterValues: string[] }).__counterValues = [];
		});

		// -ボタンをクリック
		await page.click("#btn_dec");

		// 結果を待つ
		await expect(page.locator("#counter-display")).toContainText("Current count: 2");

		// 観測された値を取得
		const values = await page.evaluate(() => {
			const obs = (window as unknown as { __counterObserver: MutationObserver }).__counterObserver;
			if (obs) obs.disconnect();
			return (window as unknown as { __counterValues: string[] }).__counterValues || [];
		});

		// 観測された値に4が含まれていないことを確認（バグがあれば4が含まれる）
		expect(values).not.toContain("4");

		// 最終的に2になっていることを確認
		await expect(page.locator("#counter-display")).toContainText("Current count: 2");
	});

	/**
	 * バグ検出用テスト
	 * +の直後に-を押す（報告されたバグのシナリオ）
	 */
	test("should correctly handle immediate decrement after increment", async ({ page }) => {
		// カウンターを2にする
		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 2");

		// +を押す
		await page.click("#btn_inc");
		// 即座に-を押す（待機なし）
		await page.click("#btn_dec");

		// 最終的に2になるはず（+1して-1）
		await expect(page.locator("#counter-display")).toContainText("Current count: 2");
	});

	/**
	 * 競合条件テスト
	 * 高速で交互にクリックして、中間状態を検出する
	 */
	test("should not show unexpected intermediate values during rapid alternating", async ({
		page,
	}) => {
		// カウンターを5にする
		for (let i = 0; i < 5; i++) {
			await page.click("#btn_inc");
		}
		await expect(page.locator("#counter-display")).toContainText("Current count: 5");

		// DOM変更を監視
		await page.evaluate(() => {
			const target = document.getElementById("counter-display");
			if (!target) return;

			const observer = new MutationObserver((mutations) => {
				for (const mutation of mutations) {
					if (mutation.type === "characterData" || mutation.type === "childList") {
						const text = target.textContent || "";
						const match = text.match(/Current count: (\d+)/);
						if (match) {
							(window as unknown as { __counterHistory: string[] }).__counterHistory =
								(window as unknown as { __counterHistory: string[] }).__counterHistory || [];
							(window as unknown as { __counterHistory: string[] }).__counterHistory.push(match[1]);
						}
					}
				}
			});
			observer.observe(target, { childList: true, characterData: true, subtree: true });
			(window as unknown as { __historyObserver: MutationObserver }).__historyObserver = observer;
			(window as unknown as { __counterHistory: string[] }).__counterHistory = [];
		});

		// 高速で-+を交互に押す
		await page.click("#btn_dec"); // 5→4
		await page.click("#btn_inc"); // 4→5
		await page.click("#btn_dec"); // 5→4
		await page.click("#btn_inc"); // 4→5
		await page.click("#btn_dec"); // 5→4

		// 結果を待つ
		await expect(page.locator("#counter-display")).toContainText("Current count: 4");

		// 観測された値を取得
		const history = await page.evaluate(() => {
			const obs = (window as unknown as { __historyObserver: MutationObserver }).__historyObserver;
			if (obs) obs.disconnect();
			return (window as unknown as { __counterHistory: string[] }).__counterHistory || [];
		});

		// 値が6以上になっていないことを確認（バグがあれば6以上が出る可能性）
		for (const value of history) {
			expect(Number.parseInt(value, 10)).toBeLessThanOrEqual(5);
		}

		// 値が-1以下になっていないことも確認
		for (const value of history) {
			expect(Number.parseInt(value, 10)).toBeGreaterThanOrEqual(0);
		}
	});

	/**
	 * 単一のデクリメント操作で複数回の更新が発生しないことを確認
	 */
	test("decrement should trigger exactly one state change", async ({ page }) => {
		// カウンターを3にする
		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await page.click("#btn_inc");
		await expect(page.locator("#counter-display")).toContainText("Current count: 3");

		// 少し待機して安定させる
		await page.waitForTimeout(200);

		// DOM変更をカウント
		await page.evaluate(() => {
			const target = document.getElementById("counter-display");
			if (!target) return;

			(window as unknown as { __updateCount: number }).__updateCount = 0;
			const observer = new MutationObserver(() => {
				(window as unknown as { __updateCount: number }).__updateCount++;
			});
			observer.observe(target, { childList: true, characterData: true, subtree: true });
			(window as unknown as { __updateObserver: MutationObserver }).__updateObserver = observer;
		});

		// -ボタンをクリック
		await page.click("#btn_dec");

		// 結果を待つ
		await expect(page.locator("#counter-display")).toContainText("Current count: 2");

		// 少し待機
		await page.waitForTimeout(100);

		// 更新回数を取得
		const updateCount = await page.evaluate(() => {
			const obs = (window as unknown as { __updateObserver: MutationObserver }).__updateObserver;
			if (obs) obs.disconnect();
			return (window as unknown as { __updateCount: number }).__updateCount;
		});

		// 更新回数が1回であることを確認（複数回更新されていたらバグ）
		// 注意: DOMの実装によっては2回（childListとcharacterData）になる可能性があるので、
		// 3回以上はバグと判断
		expect(updateCount).toBeLessThanOrEqual(2);
	});
});
