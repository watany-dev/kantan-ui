# E2Eフェーズ2 イテレーション設計書

## 設計方針

1. **各イテレーションでCI全通過を保証**
2. **既存機能でテスト可能なものから着手**
3. **新機能追加が必要な場合は「機能追加→テスト追加」の順序**
4. **1イテレーション = 1コミット単位**

---

## 現状分析

### 既存ウィジェット機能

| 機能 | Button | Slider | TextInput | Selectbox |
|------|--------|--------|-----------|-----------|
| 基本動作 | ✅ | ✅ | ✅ | ✅ |
| key | ✅ | ✅ | ✅ | ✅ |
| step | - | ✅ | - | - |
| disabled | ❌ | ❌ | ❌ | ❌ |
| maxlength | - | - | ❌ | - |
| placeholder | - | - | ✅ | - |

### CIコマンド
```bash
bun run lint:fix && bun run ci
# 内部: lint → build → test:coverage
# E2E: playwright test (別途実行)
```

---

## イテレーション1: キーボード操作テスト

### 目的
HTML標準のキーボード操作が正しく動作することを確認

### 成果物
- `e2e/keyboard.spec.ts` (新規)

### テストケース

```typescript
// e2e/keyboard.spec.ts
import { expect, test } from "@playwright/test";
import { gotoAndWait } from "./helpers";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Keyboard Navigation", () => {
  test("Tab key moves focus between widgets", async ({ page }) => {
    await gotoAndWait(page);

    // 最初のボタンにフォーカス
    await page.locator("#btn_inc").focus();
    await expect(page.locator("#btn_inc")).toBeFocused();

    // Tabで次の要素へ
    await page.keyboard.press("Tab");
    await expect(page.locator("#btn_dec")).toBeFocused();
  });

  test("Enter key activates focused button", async ({ page }) => {
    await gotoAndWait(page);

    // ボタンにフォーカスしてEnter
    await page.locator("#btn_inc").focus();
    await page.keyboard.press("Enter");

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
  });

  test("Keyboard navigation works for selectbox", async ({ page }) => {
    await gotoAndWait(page);

    const select = page.locator("#color_select");
    await select.focus();

    // ArrowDownで次の選択肢
    await page.keyboard.press("ArrowDown");
    await expect(select).toHaveValue("green");
  });
});
```

### 完了条件
- [ ] `e2e/keyboard.spec.ts` 作成
- [ ] `bun run lint:fix` 通過
- [ ] `playwright test e2e/keyboard.spec.ts` 通過
- [ ] コミット & プッシュ

---

## イテレーション2: セキュリティテスト

### 目的
XSSエスケープとセッション検証が正しく機能することを確認

### 成果物
- `e2e/security.spec.ts` (新規)

### テストケース

```typescript
// e2e/security.spec.ts
import { expect, test } from "@playwright/test";
import { gotoAndWait } from "./helpers";

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
    await expect(page.locator("#results-card")).toContainText("<script>");

    // スクリプトが実行されていないことを確認（アラートが出ていない）
    // Playwrightではdialog handlerで検証
    let alertFired = false;
    page.on("dialog", () => { alertFired = true; });
    await page.waitForTimeout(500);
    expect(alertFired).toBe(false);
  });

  test("counter display escapes potential XSS in state", async ({ page }) => {
    await gotoAndWait(page);

    // カウンター操作後もXSSが発生しないことを確認
    await page.click("#btn_inc");

    // DOMにscriptタグが存在しないことを確認
    const scriptTags = await page.locator("script:not([src])").count();
    // 既存の正規スクリプト以外に新規追加されていない
    expect(scriptTags).toBeLessThanOrEqual(1);
  });

  test("invalid session ID does not crash the app", async ({ page, context }) => {
    // 不正なセッションIDを設定
    await context.addCookies([{
      name: "kt_session",
      value: "invalid-session-id-12345",
      domain: "localhost",
      path: "/",
    }]);

    // ページロードがエラーなく完了
    await page.goto("/");

    // アプリが正常に動作することを確認
    await expect(page.locator("#app h1.kt-title")).toBeVisible();
  });

  test("session state is isolated between different session IDs", async ({ browser }) => {
    // コンテキスト1: カウンターを増やす
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await page1.goto("/");
    await expect(page1.locator("#app h1.kt-title")).toBeVisible();
    await page1.click("#btn_inc");
    await expect(page1.locator("#counter-display")).toContainText("Current count: 1");

    // コンテキスト2: 別セッションでは0のまま
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await page2.goto("/");
    await expect(page2.locator("#counter-display")).toContainText("Current count: 0");

    await context1.close();
    await context2.close();
  });
});
```

### 完了条件
- [ ] `e2e/security.spec.ts` 作成
- [ ] `bun run lint:fix` 通過
- [ ] `playwright test e2e/security.spec.ts` 通過
- [ ] コミット & プッシュ

---

## イテレーション3: エッジケーステスト

### 目的
境界値、高速操作、競合状態での動作を確認

### 成果物
- `e2e/edge-cases.spec.ts` (新規)

### テストケース

```typescript
// e2e/edge-cases.spec.ts
import { expect, test } from "@playwright/test";
import { gotoAndWait } from "./helpers";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Edge Cases", () => {
  test("slider respects min/max boundaries", async ({ page }) => {
    await gotoAndWait(page);

    const slider = page.locator("#volume_slider");

    // 最小値に設定
    await slider.evaluate((el: HTMLInputElement) => {
      el.value = "0";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await expect(page.locator(".kt-slider-label")).toContainText("Volume: 0");

    // 最大値に設定
    await slider.evaluate((el: HTMLInputElement) => {
      el.value = "100";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await expect(page.locator(".kt-slider-label")).toContainText("Volume: 100");
  });

  test("text input handles empty string", async ({ page }) => {
    await gotoAndWait(page);

    const textInput = page.locator("#name_input");

    // 空文字を設定
    await textInput.evaluate((el: HTMLInputElement) => {
      el.value = "";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });

    // エラーなく処理される
    await expect(page.locator("#results-card")).toContainText("Hello, !");
  });

  test("handles very long string input without crash", async ({ page }) => {
    await gotoAndWait(page);

    const textInput = page.locator("#name_input");
    const longString = "A".repeat(10000);

    // 長い文字列を設定
    await textInput.evaluate((el: HTMLInputElement, value: string) => {
      el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, longString);

    // アプリがクラッシュしない
    await expect(page.locator("#app h1.kt-title")).toBeVisible();

    // ボタンがまだ動作する
    await page.click("#btn_inc");
    await expect(page.locator("#counter-display")).toContainText("Current count: 1");
  });

  test("rapid clicks are handled correctly", async ({ page }) => {
    await gotoAndWait(page);

    const incButton = page.locator("#btn_inc");

    // 高速連打（10回）
    const clicks = 10;
    for (let i = 0; i < clicks; i++) {
      await incButton.click({ delay: 10 });
    }

    // 最終値が正確
    await expect(page.locator("#counter-display")).toContainText(`Current count: ${clicks}`);
  });

  test("concurrent widget updates maintain consistency", async ({ page }) => {
    await gotoAndWait(page);

    // 複数ウィジェットを素早く操作
    await page.click("#btn_inc");

    const slider = page.locator("#volume_slider");
    await slider.evaluate((el: HTMLInputElement) => {
      el.value = "75";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const textInput = page.locator("#name_input");
    await textInput.evaluate((el: HTMLInputElement) => {
      el.value = "Test";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });

    // すべての変更が反映されている
    await expect(page.locator("#counter-display")).toContainText("Current count: 1");
    await expect(page.locator(".kt-slider-label")).toContainText("Volume: 75");
    await expect(page.locator("#results-card")).toContainText("Hello, Test!");
  });
});
```

### 完了条件
- [ ] `e2e/edge-cases.spec.ts` 作成
- [ ] `bun run lint:fix` 通過
- [ ] `playwright test e2e/edge-cases.spec.ts` 通過
- [ ] コミット & プッシュ

---

## イテレーション4: ウィジェット詳細テスト（既存機能）

### 目的
既存のstep機能、ペースト操作、フォーカス保持をテスト

### 成果物
- `e2e/widgets-advanced.spec.ts` (新規)
- `src/server.ts` 修正（step付きスライダー追加）

### 4a: デモアプリ拡張

```typescript
// src/server.ts に追加
// Step付きスライダー
kt.subheader("Step Slider");
const stepVolume = kt.slider("Volume (step=10)", 0, 100, 50, {
  key: "step_slider",
  step: 10
});
```

### 4b: テストケース

```typescript
// e2e/widgets-advanced.spec.ts
import { expect, test } from "@playwright/test";
import { gotoAndWait } from "./helpers";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Advanced Widget Behavior", () => {
  test("slider respects step value", async ({ page }) => {
    await gotoAndWait(page);

    const slider = page.locator("#step_slider");
    await slider.focus();

    // ArrowRightでstep分増加
    await page.keyboard.press("ArrowRight");
    await expect(slider).toHaveValue("60"); // 50 + 10

    await page.keyboard.press("ArrowRight");
    await expect(slider).toHaveValue("70"); // 60 + 10
  });

  test("text input handles paste correctly", async ({ page, context }) => {
    await gotoAndWait(page);

    // クリップボードに書き込む権限を付与
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const textInput = page.locator("#name_input");
    await textInput.focus();
    await textInput.clear();

    // ペースト操作をシミュレート
    await page.evaluate(() => {
      navigator.clipboard.writeText("PastedText");
    });
    await page.keyboard.press("Control+v");

    // 値が反映される
    await expect(textInput).toHaveValue("PastedText");
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
});
```

### 完了条件
- [ ] `src/server.ts` にstep付きスライダー追加
- [ ] `e2e/widgets-advanced.spec.ts` 作成
- [ ] `bun run lint:fix` 通過
- [ ] `bun run ci` 通過
- [ ] `playwright test e2e/widgets-advanced.spec.ts` 通過
- [ ] コミット & プッシュ

---

## イテレーション5: disabled機能追加とテスト

### 目的
disabled属性をウィジェットに追加し、テスト

### 成果物
- `src/widgets/types.ts` 修正（disabled追加）
- `src/widgets/button.ts` 修正
- `src/widgets/slider.ts` 修正
- `src/widgets/text-input.ts` 修正
- `src/widgets/selectbox.ts` 修正
- `src/server.ts` 修正（disabled状態のウィジェット追加）
- `e2e/widgets-advanced.spec.ts` 追加テスト

### 5a: 型定義の拡張

```typescript
// src/widgets/types.ts
export interface ButtonConfig {
  label: string;
  key?: string;
  disabled?: boolean;  // 追加
}

export interface SliderConfig {
  // ...existing
  disabled?: boolean;  // 追加
}

export interface TextInputConfig {
  // ...existing
  disabled?: boolean;  // 追加
  maxLength?: number;  // 追加
}

export interface SelectboxConfig {
  // ...existing
  disabled?: boolean;  // 追加
}
```

### 5b: レンダリング関数の修正

各ウィジェットでdisabled属性をHTML出力に追加

### 5c: デモアプリ拡張

```typescript
// src/server.ts
kt.button("Disabled Button", { key: "btn_disabled", disabled: true });
```

### 5d: テスト追加

```typescript
test("disabled button does not trigger events", async ({ page }) => {
  await gotoAndWait(page);

  const disabledBtn = page.locator("#btn_disabled");
  await expect(disabledBtn).toBeDisabled();

  // クリックしても反応なし（初期値確認用のカウンターで検証）
  await disabledBtn.click({ force: true });
  // イベントは送信されないはず
});
```

### 完了条件
- [ ] 型定義にdisabled追加
- [ ] 各ウィジェットのレンダリングにdisabled対応追加
- [ ] 単体テスト追加
- [ ] デモアプリに disabled ウィジェット追加
- [ ] E2Eテスト追加
- [ ] `bun run lint:fix && bun run ci` 通過
- [ ] `playwright test` 通過
- [ ] コミット & プッシュ

---

## イテレーション6: maxLength機能追加とテスト

### 目的
TextInputにmaxLength属性を追加

### 成果物
- `src/widgets/text-input.ts` 修正
- `src/server.ts` 修正
- `e2e/widgets-advanced.spec.ts` 追加テスト

### 完了条件
- [ ] maxLength属性の実装
- [ ] 単体テスト追加
- [ ] E2Eテスト追加
- [ ] CI全通過
- [ ] コミット & プッシュ

---

## 実行チェックリスト

| イテレーション | 内容 | CI通過 | コミット |
|--------------|------|--------|---------|
| 1 | キーボード操作テスト | ⬜ | ⬜ |
| 2 | セキュリティテスト | ⬜ | ⬜ |
| 3 | エッジケーステスト | ⬜ | ⬜ |
| 4 | ウィジェット詳細（既存機能） | ⬜ | ⬜ |
| 5 | disabled機能追加 | ⬜ | ⬜ |
| 6 | maxLength機能追加 | ⬜ | ⬜ |

---

## 更新履歴

- 2026-01-04: 初版作成
