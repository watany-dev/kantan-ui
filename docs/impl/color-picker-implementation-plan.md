# color_picker 実装計画

作成日: 2026-01-12

## 概要

本計画は `docs/design/color-picker-api.md` の設計書に基づき、TDDサイクルと Tidy First? の原則に従って color_picker を実装する。

---

## イテレーション一覧

| # | 内容 | ファイル | 完了条件 |
|---|------|---------|---------|
| 1 | 型定義 | `src/widgets/types.ts` | `ColorPickerConfig` 追加 |
| 2 | テスト作成（Red） | `tests/unit/widgets/color-picker.test.ts` | テストが失敗する |
| 3 | 命令型関数（Green） | `src/widgets/color-picker.ts`, `src/widgets/core.ts` | テストが通る |
| 4 | エクスポート追加 | `src/widgets/index.ts` | エクスポート完了 |
| 5 | 宣言的API | `src/kt/widgets.ts` | `kt.color_picker()` 動作 |
| 6 | スタイル | `src/styles/default.ts` | CSS追加 |
| 7 | E2Eテスト（オプション） | `tests/e2e/` | 手動確認 or E2E |

---

## Iteration 1: 型定義

### 目標
`ColorPickerConfig` インターフェースを定義する。

### 作業内容

**ファイル**: `src/widgets/types.ts`

```typescript
// 追加位置: 他のConfig定義の後（TextAreaConfig等の後）

export interface ColorPickerConfig {
  /** ウィジェットの一意キー（状態保持用） */
  key?: string;
  /** 無効化フラグ */
  disabled?: boolean;
}
```

### 完了チェック
- [ ] `bun run lint:fix`
- [ ] `bun run test`
- [ ] コミット: `feat(widgets): add ColorPickerConfig type`

---

## Iteration 2: テスト作成（Red Phase）

### 目標
失敗するテストを先に作成する（TDD Red Phase）。

### 作業内容

**ファイル**: `tests/unit/widgets/color-picker.test.ts`

```typescript
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  resetSessionManager,
  SessionManager,
  setSessionManager,
} from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import { resetWidgetCounter } from "../../../src/widgets/registry";
// import時点では存在しないためコメントアウトして後でアンコメント
// import { color_picker, renderColorPicker } from "../../../src/widgets/color-picker";

describe("color_picker", () => {
  let manager: SessionManager;

  beforeEach(() => {
    resetWidgetCounter();
    manager = new SessionManager();
    setSessionManager(manager);
  });

  afterEach(() => {
    setCurrentSessionId(null);
    resetSessionManager();
  });

  describe("color_picker function", () => {
    it("should return default value #000000 when no default provided", () => {
      const session = manager.createSession();
      setCurrentSessionId(session.id);

      const value = color_picker("Pick a color");

      expect(value).toBe("#000000");
    });

    it("should return custom default value when provided", () => {
      const session = manager.createSession();
      setCurrentSessionId(session.id);

      const value = color_picker("Theme color", "#3498db");

      expect(value).toBe("#3498db");
    });

    it("should return stored value on subsequent calls", () => {
      const session = manager.createSession();
      setCurrentSessionId(session.id);

      // First call sets default
      color_picker("Color", "#ff0000");
      resetWidgetCounter();

      // Update the value
      manager.setState(session.id, "widget_0", "#00ff00");

      // Second call should return stored value
      const value = color_picker("Color", "#ff0000");

      expect(value).toBe("#00ff00");
    });

    it("should use custom key when provided", () => {
      const session = manager.createSession();
      setCurrentSessionId(session.id);

      manager.setState(session.id, "my_color", "#0000ff");

      const value = color_picker("Color", "#ff0000", { key: "my_color" });

      expect(value).toBe("#0000ff");
    });
  });

  describe("renderColorPicker", () => {
    it("should render color input HTML", () => {
      const html = renderColorPicker("Pick a color", "#ff0000");

      expect(html).toContain('<input type="color"');
      expect(html).toContain('value="#ff0000"');
      expect(html).toContain("Pick a color");
      expect(html).toContain('data-kt-event="change"');
      expect(html).toContain('class="kt-color-picker"');
    });

    it("should render container with correct class", () => {
      const html = renderColorPicker("Color", "#000000");

      expect(html).toContain('class="kt-color-picker-container"');
      expect(html).toContain('class="kt-color-picker-label"');
    });

    it("should escape HTML in label", () => {
      const html = renderColorPicker("<script>alert(1)</script>", "#000000");

      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });

    it("should render disabled attribute when disabled", () => {
      const html = renderColorPicker("Color", "#000000", { disabled: true });

      expect(html).toContain("disabled");
    });

    it("should not render disabled attribute when not disabled", () => {
      const html = renderColorPicker("Color", "#000000", { disabled: false });

      // Check that "disabled" does not appear as an attribute
      // (only appears in class names)
      expect(html).not.toMatch(/disabled(?![-\w])/);
    });

    it("should use custom key in id attribute", () => {
      const html = renderColorPicker("Color", "#000000", { key: "custom_id" });

      expect(html).toContain('id="custom_id"');
      expect(html).toContain('for="custom_id"');
    });

    describe("security: value validation", () => {
      it("should handle invalid hex values gracefully", () => {
        // 不正な値が渡されても安全に処理
        const html = renderColorPicker("Color", "invalid");

        // input[type=color] はブラウザが補正するため、値はそのまま出力しても安全
        expect(html).toContain('value="invalid"');
      });

      it("should escape potential XSS in value", () => {
        const html = renderColorPicker("Color", '"><script>alert(1)</script>');

        expect(html).not.toContain("<script>");
        expect(html).toContain("&quot;");
      });
    });
  });
});
```

### 完了チェック
- [ ] テストファイル作成
- [ ] テストが**失敗**することを確認（import エラー）
- [ ] コミット: `test(widgets): add color_picker tests (Red phase)`

---

## Iteration 3: 命令型関数（Green Phase）

### 目標
テストを通すための最小限の実装。

### 作業内容

#### 3.1 core.ts に state 初期化関数を追加

**ファイル**: `src/widgets/core.ts`

```typescript
// 追加: initializeColorPickerState

/**
 * カラーピッカーのstate管理
 * 初期値をstateに保存し、現在値を返す
 * デフォルト値が指定されない場合は "#000000" を使用
 */
export function initializeColorPickerState(widgetId: string, defaultValue?: string): string {
  return initializeWidgetState(widgetId, defaultValue ?? "#000000");
}
```

#### 3.2 color-picker.ts を新規作成

**ファイル**: `src/widgets/color-picker.ts`

```typescript
import { escapeHtml } from "../utils/html";
import { initializeColorPickerState } from "./core";
import { generateWidgetId } from "./registry";
import type { ColorPickerConfig } from "./types";

/**
 * カラーピッカーウィジェット
 * 現在の色を返す（初回はデフォルト値）
 */
export function color_picker(
  label: string,
  defaultValue?: string,
  config?: Partial<ColorPickerConfig>,
): string {
  const id = generateWidgetId(config?.key);
  return initializeColorPickerState(id, defaultValue);
}

/**
 * カラーピッカーのHTMLをレンダリング
 */
export function renderColorPicker(
  label: string,
  value: string,
  config?: Partial<ColorPickerConfig>,
): string {
  const id = generateWidgetId(config?.key);
  const disabled = config?.disabled ? " disabled" : "";

  return `<div id="${id}-container" class="kt-color-picker-container">
  <label for="${id}" class="kt-color-picker-label">${escapeHtml(label)}</label>
  <input type="color" id="${id}" value="${escapeHtml(value)}" data-kt-event="change" class="kt-color-picker"${disabled} />
</div>`;
}
```

### 完了チェック
- [ ] `bun run lint:fix`
- [ ] `bun run test` - 全テストが**パス**
- [ ] コミット: `feat(widgets): implement color_picker (Green phase)`

---

## Iteration 4: エクスポート追加

### 目標
color_picker を widgets から公開する。

### 作業内容

**ファイル**: `src/widgets/index.ts`

```typescript
// 追加行
export { color_picker, renderColorPicker } from "./color-picker";
```

### 完了チェック
- [ ] `bun run lint:fix`
- [ ] `bun run test`
- [ ] コミット: `feat(widgets): export color_picker`

---

## Iteration 5: 宣言的 API

### 目標
`kt.color_picker()` を実装する。

### 作業内容

**ファイル**: `src/kt/widgets.ts`

```typescript
// import 追加
import { color_picker as imperativeColorPicker, renderColorPicker } from "../widgets/color-picker";
import type { ColorPickerConfig } from "../widgets/types";

// 関数追加（ファイル末尾）

/**
 * カラーピッカーウィジェット（宣言的API）
 * HTMLを自動出力し、選択された色を返す
 *
 * @param label - ラベル
 * @param defaultValue - デフォルト色（HEX形式、例: "#ff0000"）
 * @param config - 設定
 * @returns 選択された色（HEX形式 "#RRGGBB"）
 *
 * @example
 * ```typescript
 * const color = kt.color_picker("Pick a color");
 * // → "#000000"
 *
 * const themeColor = kt.color_picker("Theme color", "#3498db");
 * // → "#3498db"
 * ```
 */
export function color_picker(
  label: string,
  defaultValue?: string,
  config?: Partial<ColorPickerConfig>,
): string {
  return wrapWidget(
    config,
    (cfg) => imperativeColorPicker(label, defaultValue, cfg),
    (value, cfg) => renderColorPicker(label, value, cfg),
  );
}
```

### 完了チェック
- [ ] `bun run lint:fix`
- [ ] `bun run test`
- [ ] コミット: `feat(kt): add color_picker declarative API`

---

## Iteration 6: スタイル

### 目標
color_picker 用のCSSを追加する。

### 作業内容

**ファイル**: `src/styles/default.ts`

```typescript
// 新しいスタイルセクションを追加

/** カラーピッカースタイル */
const colorPickerStyles = `
  /* Color Picker Container */
  .kt-color-picker-container {
    margin: 10px 0;
  }

  /* Color Picker Label */
  .kt-color-picker-label {
    display: block;
    margin-bottom: 4px;
  }

  /* Color Picker Input */
  .kt-color-picker {
    width: 60px;
    height: 32px;
    padding: 2px;
    border: 1px solid #ced4da;
    border-radius: 4px;
    cursor: pointer;
    background: none;
  }

  .kt-color-picker:hover {
    border-color: #adb5bd;
  }

  .kt-color-picker:focus {
    outline: none;
    border-color: #4a90d9;
    box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.2);
  }

  .kt-color-picker:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Webkit系ブラウザ用のカスタマイズ */
  .kt-color-picker::-webkit-color-swatch-wrapper {
    padding: 2px;
  }

  .kt-color-picker::-webkit-color-swatch {
    border: none;
    border-radius: 2px;
  }

  /* Firefox用のカスタマイズ */
  .kt-color-picker::-moz-color-swatch {
    border: none;
    border-radius: 2px;
  }
`;

// defaultStyles の配列に追加
export const defaultStyles = [
  baseStyles,
  alertStyles,
  jsonStyles,
  codeStyles,
  markdownStyles,
  feedbackStyles,
  layoutStyles,
  tableStyles,
  chatStyles,
  sidebarStyles,
  imageStyles,
  metricStyles,
  formStyles,
  emptyStyles,
  streamStyles,
  fileUploaderStyles,
  colorPickerStyles,  // 追加
].join("\n");
```

### 完了チェック
- [ ] `bun run lint:fix`
- [ ] `bun run test`
- [ ] コミット: `style(widgets): add color_picker CSS`

---

## Iteration 7: 最終確認と設計書更新

### 目標
全体的な動作確認と設計書のステータス更新。

### 作業内容

1. **CI 実行**
   ```bash
   bun run ci
   ```

2. **設計書ステータス更新**

   **ファイル**: `docs/design/color-picker-api.md`

   ```markdown
   ## 実装ステータス

   > **✅ 実装完了**
   ```

3. **チェックリスト更新**
   ```markdown
   ### 実装前

   - [x] 既存ウィジェット実装パターンを確認（text-input.ts 等）

   ### 各イテレーション後

   - [x] `bun run lint:fix` 実行
   - [x] `bun run test` 実行
   - [x] コミット

   ### 完了時

   - [x] `bun run ci` 全パス
   - [x] 単体テスト作成済み
   - [x] ドキュメント更新
   ```

### 完了チェック
- [ ] `bun run ci` 全パス
- [ ] 設計書更新
- [ ] コミット: `docs: update color_picker status to implemented`

---

## コミット履歴（予定）

```
1. feat(widgets): add ColorPickerConfig type
2. test(widgets): add color_picker tests (Red phase)
3. feat(widgets): implement color_picker (Green phase)
4. feat(widgets): export color_picker
5. feat(kt): add color_picker declarative API
6. style(widgets): add color_picker CSS
7. docs: update color_picker status to implemented
```

---

## 参考: 実装パターン対照表

| 項目 | text_input | color_picker |
|------|-----------|--------------|
| Config | `TextInputConfig` | `ColorPickerConfig` |
| デフォルト値 | `""` | `"#000000"` |
| イベント | `input` | `change` |
| state初期化 | `initializeTextInputState` | `initializeColorPickerState` |
| 入力タイプ | `type="text"` | `type="color"` |

---

## 補足: Tidy First? の適用

本実装では以下の整理は**不要**と判断：

1. **Dead Code**: 関連する死んだコードは確認されず
2. **Guard Clauses**: 条件分岐が少なく適用不要
3. **Extract Helper**: `initializeWidgetState` を再利用するため追加ヘルパー不要

既存パターンに従った実装のため、大きなリファクタリングは行わない。
