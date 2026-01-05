# Phase 1: Streamlit API互換性 - 基本ウィジェット追加

作成日: 2026-01-04

## 概要

Streamlitとの互換性を高めるため、頻出する基本ウィジェットを追加する。
既存の実装パターン（`kt.*` + imperative API）に従い、TDDで実装する。

---

## 追加ウィジェット一覧

| # | ウィジェット | Streamlit API | 工数 | 優先度 |
|---|-------------|---------------|------|--------|
| 1 | checkbox | `st.checkbox(label, value?)` | 小 | 最高 |
| 2 | radio | `st.radio(label, options, index?)` | 小 | 高 |
| 3 | number_input | `st.number_input(label, min?, max?, value?)` | 中 | 高 |
| 4 | text_area | `st.text_area(label, value?, height?)` | 小 | 高 |
| 5 | toggle | `st.toggle(label, value?)` | 小 | 中 |
| 6 | multiselect | `st.multiselect(label, options, default?)` | 中 | 中 |

---

## 1. kt.checkbox()

### API設計

```typescript
// Streamlit互換API
kt.checkbox(label: string, defaultValue?: boolean, config?: CheckboxConfig): boolean

// 設定
interface CheckboxConfig {
  key?: string;
  disabled?: boolean;
  help?: string;  // ツールチップ（将来対応）
}
```

### 使用例

```typescript
const agree = kt.checkbox("I agree to the terms");
if (agree) {
  kt.write("Thank you for agreeing!");
}

// デフォルト値付き
const enabled = kt.checkbox("Enable feature", true);
```

### 実装ステップ

#### Step 1.1: テスト作成（Red）

```typescript
// tests/widgets/checkbox.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { checkbox, renderCheckbox } from "../../src/widgets/checkbox";
import { resetWidgetCounter } from "../../src/widgets/registry";
import { setCurrentSessionId, clearCurrentSessionId } from "../../src/session/state";
import { getSessionManager } from "../../src/session/manager";

describe("checkbox", () => {
  beforeEach(() => {
    resetWidgetCounter();
    clearCurrentSessionId();
  });

  describe("renderCheckbox", () => {
    it("should render unchecked checkbox by default", () => {
      const html = renderCheckbox("Accept terms");
      expect(html).toContain('type="checkbox"');
      expect(html).toContain("Accept terms");
      expect(html).not.toContain("checked");
    });

    it("should render checked checkbox when defaultValue is true", () => {
      const html = renderCheckbox("Accept terms", true);
      expect(html).toContain("checked");
    });

    it("should use provided key for widget id", () => {
      const html = renderCheckbox("Test", false, { key: "my_checkbox" });
      expect(html).toContain('data-widget-id="my_checkbox"');
    });
  });

  describe("checkbox state", () => {
    it("should return false by default", () => {
      const result = checkbox("Test");
      expect(result).toBe(false);
    });

    it("should return defaultValue when no state exists", () => {
      const result = checkbox("Test", true);
      expect(result).toBe(true);
    });

    it("should return stored state value", () => {
      setCurrentSessionId("test-session");
      const manager = getSessionManager();
      manager.createSession("test-session");
      manager.setState("test-session", "widget_0", true);

      const result = checkbox("Test");
      expect(result).toBe(true);

      clearCurrentSessionId();
    });
  });
});
```

#### Step 1.2: 実装（Green）

```typescript
// src/widgets/checkbox.ts
import { getWidgetState, registerWidget } from "./core";
import type { CheckboxConfig } from "./types";

export function renderCheckbox(
  label: string,
  defaultValue = false,
  config: CheckboxConfig = {}
): string {
  const widgetId = registerWidget(config.key);
  const currentValue = getWidgetState<boolean>(widgetId) ?? defaultValue;
  const checkedAttr = currentValue ? " checked" : "";
  const disabledAttr = config.disabled ? " disabled" : "";

  return `
    <div class="kt-widget kt-checkbox" data-widget-id="${widgetId}">
      <label>
        <input
          type="checkbox"
          ${checkedAttr}
          ${disabledAttr}
          onchange="ktSendEvent('${widgetId}', this.checked)"
        />
        <span>${label}</span>
      </label>
    </div>
  `.trim();
}

export function checkbox(
  label: string,
  defaultValue = false,
  config: CheckboxConfig = {}
): boolean {
  const widgetId = registerWidget(config.key);
  return getWidgetState<boolean>(widgetId) ?? defaultValue;
}
```

#### Step 1.3: kt API統合

```typescript
// src/kt/widgets.ts に追加
export function checkbox(
  label: string,
  defaultValue = false,
  config: CheckboxConfig = {}
): boolean {
  return wrapWidget(() => widgetsCheckbox(label, defaultValue, config), () =>
    renderCheckbox(label, defaultValue, config)
  );
}
```

#### Step 1.4: 型定義追加

```typescript
// src/widgets/types.ts に追加
export interface CheckboxConfig {
  key?: string;
  disabled?: boolean;
}
```

### 成果物

- [ ] `src/widgets/checkbox.ts` 作成
- [ ] `src/widgets/types.ts` に `CheckboxConfig` 追加
- [ ] `src/kt/widgets.ts` に `checkbox` 追加
- [ ] `src/kt/index.ts` にエクスポート追加
- [ ] `src/index.ts` にエクスポート追加
- [ ] `tests/widgets/checkbox.test.ts` 作成
- [ ] E2Eテスト追加

---

## 2. kt.radio()

### API設計

```typescript
// Streamlit互換API
kt.radio(
  label: string,
  options: string[],
  defaultValue?: string,
  config?: RadioConfig
): string

interface RadioConfig {
  key?: string;
  disabled?: boolean;
  horizontal?: boolean;  // 横並び表示
}
```

### 使用例

```typescript
const choice = kt.radio("Select size", ["S", "M", "L"], "M");
kt.write(`You selected: ${choice}`);

// 横並び
const color = kt.radio("Color", ["Red", "Green", "Blue"], "Red", { horizontal: true });
```

### 実装ステップ

#### Step 2.1: テスト作成（Red）

```typescript
// tests/widgets/radio.test.ts
describe("radio", () => {
  it("should render radio buttons for all options", () => {
    const html = renderRadio("Size", ["S", "M", "L"]);
    expect(html).toContain('type="radio"');
    expect(html).toContain("S");
    expect(html).toContain("M");
    expect(html).toContain("L");
  });

  it("should select first option by default", () => {
    const result = radio("Size", ["S", "M", "L"]);
    expect(result).toBe("S");
  });

  it("should use defaultValue when provided", () => {
    const result = radio("Size", ["S", "M", "L"], "M");
    expect(result).toBe("M");
  });

  it("should render horizontally when configured", () => {
    const html = renderRadio("Size", ["S", "M", "L"], "S", { horizontal: true });
    expect(html).toContain("kt-radio-horizontal");
  });
});
```

#### Step 2.2: 実装（Green）

```typescript
// src/widgets/radio.ts
export function renderRadio(
  label: string,
  options: string[],
  defaultValue?: string,
  config: RadioConfig = {}
): string {
  const widgetId = registerWidget(config.key);
  const currentValue = getWidgetState<string>(widgetId) ?? defaultValue ?? options[0];
  const layoutClass = config.horizontal ? "kt-radio-horizontal" : "kt-radio-vertical";

  const optionsHtml = options
    .map((opt) => {
      const checked = opt === currentValue ? " checked" : "";
      return `
        <label class="kt-radio-option">
          <input
            type="radio"
            name="${widgetId}"
            value="${opt}"
            ${checked}
            onchange="ktSendEvent('${widgetId}', this.value)"
          />
          <span>${opt}</span>
        </label>
      `;
    })
    .join("");

  return `
    <div class="kt-widget kt-radio ${layoutClass}" data-widget-id="${widgetId}">
      <div class="kt-radio-label">${label}</div>
      <div class="kt-radio-options">${optionsHtml}</div>
    </div>
  `.trim();
}

export function radio(
  label: string,
  options: string[],
  defaultValue?: string,
  config: RadioConfig = {}
): string {
  const widgetId = registerWidget(config.key);
  return getWidgetState<string>(widgetId) ?? defaultValue ?? options[0] ?? "";
}
```

### 成果物

- [ ] `src/widgets/radio.ts` 作成
- [ ] `src/widgets/types.ts` に `RadioConfig` 追加
- [ ] `src/kt/widgets.ts` に `radio` 追加
- [ ] テスト作成

---

## 3. kt.number_input()

### API設計

```typescript
// Streamlit互換API
kt.number_input(
  label: string,
  min?: number,
  max?: number,
  defaultValue?: number,
  config?: NumberInputConfig
): number

interface NumberInputConfig {
  key?: string;
  step?: number;
  disabled?: boolean;
  format?: string;  // 将来対応（例: "%.2f"）
}
```

### 使用例

```typescript
const age = kt.number_input("Age", 0, 120, 25);
kt.write(`Your age: ${age}`);

// ステップ指定
const price = kt.number_input("Price", 0, 1000, 100, { step: 10 });
```

### 実装ステップ

#### Step 3.1: テスト作成（Red）

```typescript
// tests/widgets/number-input.test.ts
describe("number_input", () => {
  it("should render number input with min/max", () => {
    const html = renderNumberInput("Age", 0, 120);
    expect(html).toContain('type="number"');
    expect(html).toContain('min="0"');
    expect(html).toContain('max="120"');
  });

  it("should return defaultValue when no state", () => {
    const result = numberInput("Age", 0, 120, 25);
    expect(result).toBe(25);
  });

  it("should respect step configuration", () => {
    const html = renderNumberInput("Price", 0, 1000, 100, { step: 10 });
    expect(html).toContain('step="10"');
  });
});
```

#### Step 3.2: 実装（Green）

```typescript
// src/widgets/number-input.ts
export function renderNumberInput(
  label: string,
  min?: number,
  max?: number,
  defaultValue?: number,
  config: NumberInputConfig = {}
): string {
  const widgetId = registerWidget(config.key);
  const currentValue = getWidgetState<number>(widgetId) ?? defaultValue ?? min ?? 0;
  const step = config.step ?? 1;

  const minAttr = min !== undefined ? ` min="${min}"` : "";
  const maxAttr = max !== undefined ? ` max="${max}"` : "";

  return `
    <div class="kt-widget kt-number-input" data-widget-id="${widgetId}">
      <label>
        <span>${label}</span>
        <input
          type="number"
          value="${currentValue}"
          step="${step}"
          ${minAttr}
          ${maxAttr}
          onchange="ktSendEvent('${widgetId}', parseFloat(this.value))"
        />
      </label>
    </div>
  `.trim();
}

export function numberInput(
  label: string,
  min?: number,
  max?: number,
  defaultValue?: number,
  config: NumberInputConfig = {}
): number {
  const widgetId = registerWidget(config.key);
  return getWidgetState<number>(widgetId) ?? defaultValue ?? min ?? 0;
}
```

### 成果物

- [ ] `src/widgets/number-input.ts` 作成
- [ ] `src/widgets/types.ts` に `NumberInputConfig` 追加
- [ ] `src/kt/widgets.ts` に `number_input` 追加
- [ ] テスト作成

---

## 4. kt.text_area()

### API設計

```typescript
// Streamlit互換API
kt.text_area(
  label: string,
  defaultValue?: string,
  config?: TextAreaConfig
): string

interface TextAreaConfig {
  key?: string;
  placeholder?: string;
  height?: number;  // ピクセル
  maxChars?: number;
  disabled?: boolean;
}
```

### 使用例

```typescript
const bio = kt.text_area("Bio", "Tell us about yourself...");
kt.write(`Character count: ${bio.length}`);

// 高さ指定
const code = kt.text_area("Code", "", { height: 300, placeholder: "Enter code here..." });
```

### 実装ステップ

#### Step 4.1: 実装

```typescript
// src/widgets/text-area.ts
export function renderTextArea(
  label: string,
  defaultValue = "",
  config: TextAreaConfig = {}
): string {
  const widgetId = registerWidget(config.key);
  const currentValue = getWidgetState<string>(widgetId) ?? defaultValue;
  const height = config.height ?? 100;
  const placeholder = config.placeholder ?? "";
  const maxLength = config.maxChars ? ` maxlength="${config.maxChars}"` : "";

  return `
    <div class="kt-widget kt-text-area" data-widget-id="${widgetId}">
      <label>
        <span>${label}</span>
        <textarea
          style="height: ${height}px"
          placeholder="${placeholder}"
          ${maxLength}
          onchange="ktSendEvent('${widgetId}', this.value)"
        >${escapeHtml(currentValue)}</textarea>
      </label>
    </div>
  `.trim();
}

export function textArea(
  label: string,
  defaultValue = "",
  config: TextAreaConfig = {}
): string {
  const widgetId = registerWidget(config.key);
  return getWidgetState<string>(widgetId) ?? defaultValue;
}
```

### 成果物

- [ ] `src/widgets/text-area.ts` 作成
- [ ] `src/widgets/types.ts` に `TextAreaConfig` 追加
- [ ] `src/kt/widgets.ts` に `text_area` 追加
- [ ] テスト作成

---

## 5. kt.toggle()

### API設計

```typescript
// Streamlit互換API（st.toggleは比較的新しい）
kt.toggle(label: string, defaultValue?: boolean, config?: ToggleConfig): boolean

interface ToggleConfig {
  key?: string;
  disabled?: boolean;
}
```

### 使用例

```typescript
const darkMode = kt.toggle("Dark mode", false);
if (darkMode) {
  // Apply dark theme
}
```

### 実装

checkboxの実装をベースに、CSSスタイルをトグルスイッチ風に変更。

```typescript
// src/widgets/toggle.ts
export function renderToggle(
  label: string,
  defaultValue = false,
  config: ToggleConfig = {}
): string {
  const widgetId = registerWidget(config.key);
  const currentValue = getWidgetState<boolean>(widgetId) ?? defaultValue;
  const checkedAttr = currentValue ? " checked" : "";

  return `
    <div class="kt-widget kt-toggle" data-widget-id="${widgetId}">
      <label class="kt-toggle-label">
        <span>${label}</span>
        <div class="kt-toggle-switch">
          <input
            type="checkbox"
            ${checkedAttr}
            onchange="ktSendEvent('${widgetId}', this.checked)"
          />
          <span class="kt-toggle-slider"></span>
        </div>
      </label>
    </div>
  `.trim();
}
```

### 成果物

- [ ] `src/widgets/toggle.ts` 作成
- [ ] CSSスタイル追加
- [ ] テスト作成

---

## 6. kt.multiselect()

### API設計

```typescript
// Streamlit互換API
kt.multiselect(
  label: string,
  options: string[],
  defaultValue?: string[],
  config?: MultiselectConfig
): string[]

interface MultiselectConfig {
  key?: string;
  maxSelections?: number;
  disabled?: boolean;
}
```

### 使用例

```typescript
const tags = kt.multiselect("Tags", ["JavaScript", "TypeScript", "Python"], ["TypeScript"]);
kt.write(`Selected: ${tags.join(", ")}`);
```

### 実装方針

- チェックボックスリストとして実装
- 選択された値は配列として管理
- JSON.stringify/parseでWebSocket送受信

### 成果物

- [ ] `src/widgets/multiselect.ts` 作成
- [ ] `src/widgets/types.ts` に `MultiselectConfig` 追加
- [ ] テスト作成

---

## 実装順序

```
Week 1:
├── checkbox（最優先・最も簡単）
├── radio（selectboxに似ている）
└── テスト・ドキュメント

Week 2:
├── number_input（sliderの応用）
├── text_area（text_inputの応用）
└── テスト・ドキュメント

Week 3:
├── toggle（checkboxのスタイル違い）
├── multiselect（やや複雑）
└── E2Eテスト・統合テスト
```

---

## 共通の実装パターン

### 1. ファイル構成

```
src/widgets/
├── checkbox.ts      # renderCheckbox, checkbox
├── radio.ts         # renderRadio, radio
├── number-input.ts  # renderNumberInput, numberInput
├── text-area.ts     # renderTextArea, textArea
├── toggle.ts        # renderToggle, toggle
├── multiselect.ts   # renderMultiselect, multiselect
└── index.ts         # 全エクスポート
```

### 2. kt APIへの統合

```typescript
// src/kt/widgets.ts
import { checkbox as widgetsCheckbox, renderCheckbox } from "../widgets/checkbox";

export function checkbox(...args): boolean {
  return wrapWidget(
    () => widgetsCheckbox(...args),
    () => renderCheckbox(...args)
  );
}
```

### 3. エクスポート

```typescript
// src/index.ts
export { checkbox, renderCheckbox } from "./widgets/checkbox";
// ... 他のウィジェット
```

---

## テスト戦略

### ユニットテスト

各ウィジェットに対して:
1. HTML出力の検証
2. デフォルト値の動作
3. 状態の読み取り
4. 設定オプションの反映

### E2Eテスト

```typescript
// tests/e2e/widgets.spec.ts
test("checkbox interaction", async ({ page }) => {
  await page.goto("/");
  const checkbox = page.locator('[data-widget-id="my_checkbox"] input');
  await checkbox.check();
  await expect(page.locator(".output")).toContainText("checked: true");
});
```

---

## 完了基準

- [ ] 全6ウィジェットの実装完了
- [ ] 各ウィジェットのユニットテスト100%パス
- [ ] E2Eテストで基本操作を確認
- [ ] `bun run lint:fix && bun run ci` パス
- [ ] TUTORIALに使用例追加

---

*対象バージョン: kantan-ui v0.2.0*
