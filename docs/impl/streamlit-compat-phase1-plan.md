# Phase 1: Streamlit API互換性 - イテレーティブ開発計画

作成日: 2026-01-05

## 概要

`streamlit-compat-phase1.md`に基づき、6つのウィジェットをTDDで実装する。
各イテレーションは独立してCI全パス・コミット可能な単位で設計。

---

## 実装パターン（共通）

既存ウィジェット（selectbox, slider等）のパターンに従う:

```
1. src/widgets/types.ts     - 型定義追加
2. src/widgets/{name}.ts    - imperative API + render関数
3. src/widgets/core.ts      - 共通ロジック（必要時）
4. src/widgets/index.ts     - エクスポート追加
5. src/kt/widgets.ts        - 宣言的API追加
6. src/kt/index.ts          - kt オブジェクトに追加
7. src/index.ts             - 公開エクスポート追加
8. tests/unit/widgets/*.ts  - ユニットテスト
9. tests/unit/kt/widgets.test.ts - kt API テスト
```

コミット前チェック: `bun run lint:fix && bun run ci`

---

## Widget 1: checkbox（優先度: 最高、工数: 小）

### Iteration 1.1: 型定義とimperative API

**目標**: CheckboxConfig型定義 + checkbox関数（値を返す）

**ファイル変更**:
- `src/widgets/types.ts` - CheckboxConfig追加
- `src/widgets/checkbox.ts` - 新規作成
- `src/widgets/core.ts` - initializeCheckboxState追加
- `src/widgets/index.ts` - エクスポート追加
- `tests/unit/widgets/checkbox.test.ts` - 新規作成

**テスト内容**:
```typescript
describe("checkbox function", () => {
  it("should return false by default")
  it("should return defaultValue when provided")
  it("should return stored state value")
  it("should use custom key when provided")
})
```

**コミットメッセージ**: `feat(widgets): add checkbox imperative API`

---

### Iteration 1.2: renderCheckbox実装

**目標**: HTMLレンダリング関数

**ファイル変更**:
- `src/widgets/checkbox.ts` - renderCheckbox追加
- `tests/unit/widgets/checkbox.test.ts` - renderテスト追加

**テスト内容**:
```typescript
describe("renderCheckbox", () => {
  it("should render checkbox HTML with label")
  it("should include checked attribute when value is true")
  it("should use custom key for id")
  it("should render disabled attribute when disabled")
  it("should escape HTML in label")
})
```

**コミットメッセージ**: `feat(widgets): add renderCheckbox function`

---

### Iteration 1.3: kt.checkbox()宣言的API

**目標**: kt.checkboxとして公開

**ファイル変更**:
- `src/kt/widgets.ts` - checkbox関数追加
- `src/kt/index.ts` - kt.checkboxに追加
- `src/index.ts` - エクスポート追加（checkbox, renderCheckbox, CheckboxConfig）
- `tests/unit/kt/widgets.test.ts` - checkboxテスト追加

**テスト内容**:
```typescript
describe("checkbox", () => {
  it("should append checkbox HTML to buffer")
  it("should return false when not checked")
  it("should return true when checked by default")
  it("should use existing stored value")
})
```

**コミットメッセージ**: `feat(kt): add kt.checkbox() declarative API`

---

## Widget 2: radio（優先度: 高、工数: 小）

### Iteration 2.1: 型定義とimperative API

**目標**: RadioConfig型定義 + radio関数

**ファイル変更**:
- `src/widgets/types.ts` - RadioConfig追加
- `src/widgets/radio.ts` - 新規作成
- `src/widgets/core.ts` - validateRadio, initializeRadioState追加
- `src/widgets/index.ts` - エクスポート追加
- `tests/unit/widgets/radio.test.ts` - 新規作成

**テスト内容**:
```typescript
describe("radio function", () => {
  it("should return first option by default")
  it("should return defaultValue when provided")
  it("should throw error when options array is empty")
  it("should throw error when defaultValue is not in options")
  it("should return stored state value")
  it("should use custom key when provided")
})
```

**コミットメッセージ**: `feat(widgets): add radio imperative API`

---

### Iteration 2.2: renderRadio実装

**目標**: HTMLレンダリング関数

**ファイル変更**:
- `src/widgets/radio.ts` - renderRadio追加
- `tests/unit/widgets/radio.test.ts` - renderテスト追加

**テスト内容**:
```typescript
describe("renderRadio", () => {
  it("should render radio buttons for all options")
  it("should mark selected option as checked")
  it("should render horizontal layout when configured")
  it("should render disabled attribute when disabled")
  it("should escape HTML in options and label")
})
```

**コミットメッセージ**: `feat(widgets): add renderRadio function`

---

### Iteration 2.3: kt.radio()宣言的API

**目標**: kt.radioとして公開

**ファイル変更**:
- `src/kt/widgets.ts` - radio関数追加
- `src/kt/index.ts` - kt.radioに追加
- `src/index.ts` - エクスポート追加
- `tests/unit/kt/widgets.test.ts` - radioテスト追加

**コミットメッセージ**: `feat(kt): add kt.radio() declarative API`

---

## Widget 3: number_input（優先度: 高、工数: 中）

### Iteration 3.1: 型定義とimperative API

**目標**: NumberInputConfig型定義 + number_input関数

**ファイル変更**:
- `src/widgets/types.ts` - NumberInputConfig追加
- `src/widgets/number-input.ts` - 新規作成
- `src/widgets/core.ts` - validateNumberInput, initializeNumberInputState追加
- `src/widgets/index.ts` - エクスポート追加
- `tests/unit/widgets/number-input.test.ts` - 新規作成

**テスト内容**:
```typescript
describe("number_input function", () => {
  it("should return defaultValue when provided")
  it("should return min when no defaultValue")
  it("should return 0 when no min or defaultValue")
  it("should throw error when defaultValue out of range")
  it("should return stored state value")
})
```

**コミットメッセージ**: `feat(widgets): add number_input imperative API`

---

### Iteration 3.2: renderNumberInput実装

**目標**: HTMLレンダリング関数

**ファイル変更**:
- `src/widgets/number-input.ts` - renderNumberInput追加
- `tests/unit/widgets/number-input.test.ts` - renderテスト追加

**テスト内容**:
```typescript
describe("renderNumberInput", () => {
  it("should render number input with min/max attributes")
  it("should include step attribute")
  it("should render current value")
  it("should render disabled attribute when disabled")
  it("should escape HTML in label")
})
```

**コミットメッセージ**: `feat(widgets): add renderNumberInput function`

---

### Iteration 3.3: kt.number_input()宣言的API

**目標**: kt.number_inputとして公開

**ファイル変更**:
- `src/kt/widgets.ts` - number_input関数追加
- `src/kt/index.ts` - kt.number_inputに追加
- `src/index.ts` - エクスポート追加
- `tests/unit/kt/widgets.test.ts` - number_inputテスト追加

**コミットメッセージ**: `feat(kt): add kt.number_input() declarative API`

---

## Widget 4: text_area（優先度: 高、工数: 小）

### Iteration 4.1: 型定義とimperative API

**目標**: TextAreaConfig型定義 + text_area関数

**ファイル変更**:
- `src/widgets/types.ts` - TextAreaConfig追加
- `src/widgets/text-area.ts` - 新規作成
- `src/widgets/core.ts` - initializeTextAreaState追加（text_inputと共通化可能）
- `src/widgets/index.ts` - エクスポート追加
- `tests/unit/widgets/text-area.test.ts` - 新規作成

**テスト内容**:
```typescript
describe("text_area function", () => {
  it("should return empty string by default")
  it("should return defaultValue when provided")
  it("should return stored state value")
  it("should use custom key when provided")
})
```

**コミットメッセージ**: `feat(widgets): add text_area imperative API`

---

### Iteration 4.2: renderTextArea実装

**目標**: HTMLレンダリング関数

**ファイル変更**:
- `src/widgets/text-area.ts` - renderTextArea追加
- `tests/unit/widgets/text-area.test.ts` - renderテスト追加

**テスト内容**:
```typescript
describe("renderTextArea", () => {
  it("should render textarea HTML with label")
  it("should include height style when configured")
  it("should include placeholder attribute")
  it("should include maxlength attribute when maxChars configured")
  it("should render disabled attribute when disabled")
  it("should escape HTML in value and label")
})
```

**コミットメッセージ**: `feat(widgets): add renderTextArea function`

---

### Iteration 4.3: kt.text_area()宣言的API

**目標**: kt.text_areaとして公開

**ファイル変更**:
- `src/kt/widgets.ts` - text_area関数追加
- `src/kt/index.ts` - kt.text_areaに追加
- `src/index.ts` - エクスポート追加
- `tests/unit/kt/widgets.test.ts` - text_areaテスト追加

**コミットメッセージ**: `feat(kt): add kt.text_area() declarative API`

---

## Widget 5: toggle（優先度: 中、工数: 小）

### Iteration 5.1: 型定義とimperative API

**目標**: ToggleConfig型定義 + toggle関数

**ファイル変更**:
- `src/widgets/types.ts` - ToggleConfig追加
- `src/widgets/toggle.ts` - 新規作成
- `src/widgets/index.ts` - エクスポート追加
- `tests/unit/widgets/toggle.test.ts` - 新規作成

**注意**: checkboxと同じロジック、異なるUIスタイルのみ

**テスト内容**:
```typescript
describe("toggle function", () => {
  it("should return false by default")
  it("should return defaultValue when provided")
  it("should return stored state value")
})
```

**コミットメッセージ**: `feat(widgets): add toggle imperative API`

---

### Iteration 5.2: renderToggle実装

**目標**: トグルスイッチ風HTMLレンダリング

**ファイル変更**:
- `src/widgets/toggle.ts` - renderToggle追加
- `tests/unit/widgets/toggle.test.ts` - renderテスト追加

**テスト内容**:
```typescript
describe("renderToggle", () => {
  it("should render toggle switch HTML structure")
  it("should include checked attribute when value is true")
  it("should have kt-toggle class for styling")
  it("should render disabled attribute when disabled")
})
```

**コミットメッセージ**: `feat(widgets): add renderToggle function`

---

### Iteration 5.3: kt.toggle()宣言的API

**目標**: kt.toggleとして公開

**ファイル変更**:
- `src/kt/widgets.ts` - toggle関数追加
- `src/kt/index.ts` - kt.toggleに追加
- `src/index.ts` - エクスポート追加
- `tests/unit/kt/widgets.test.ts` - toggleテスト追加

**コミットメッセージ**: `feat(kt): add kt.toggle() declarative API`

---

## Widget 6: multiselect（優先度: 中、工数: 中）

### Iteration 6.1: 型定義とimperative API

**目標**: MultiselectConfig型定義 + multiselect関数

**ファイル変更**:
- `src/widgets/types.ts` - MultiselectConfig追加
- `src/widgets/multiselect.ts` - 新規作成
- `src/widgets/core.ts` - validateMultiselect, initializeMultiselectState追加
- `src/widgets/index.ts` - エクスポート追加
- `tests/unit/widgets/multiselect.test.ts` - 新規作成

**テスト内容**:
```typescript
describe("multiselect function", () => {
  it("should return empty array by default")
  it("should return defaultValue when provided")
  it("should throw error when options array is empty")
  it("should throw error when defaultValue contains invalid option")
  it("should respect maxSelections config")
  it("should return stored state value")
})
```

**コミットメッセージ**: `feat(widgets): add multiselect imperative API`

---

### Iteration 6.2: renderMultiselect実装

**目標**: チェックボックスリスト形式のHTML

**ファイル変更**:
- `src/widgets/multiselect.ts` - renderMultiselect追加
- `tests/unit/widgets/multiselect.test.ts` - renderテスト追加

**テスト内容**:
```typescript
describe("renderMultiselect", () => {
  it("should render checkbox list for all options")
  it("should mark selected options as checked")
  it("should render disabled attribute when disabled")
  it("should escape HTML in options and label")
})
```

**コミットメッセージ**: `feat(widgets): add renderMultiselect function`

---

### Iteration 6.3: kt.multiselect()宣言的API

**目標**: kt.multiselectとして公開

**ファイル変更**:
- `src/kt/widgets.ts` - multiselect関数追加
- `src/kt/index.ts` - kt.multiselectに追加
- `src/index.ts` - エクスポート追加
- `tests/unit/kt/widgets.test.ts` - multiselectテスト追加

**コミットメッセージ**: `feat(kt): add kt.multiselect() declarative API`

---

## E2Eテスト（全ウィジェット完了後）

### Iteration 7.1: checkbox/toggle E2E

**目標**: チェックボックスとトグルのブラウザ動作確認

**ファイル変更**:
- `e2e/widgets-checkbox.spec.ts` - 新規作成
- テスト用サンプルアプリ追加（必要時）

**テスト内容**:
```typescript
test("checkbox interaction updates value", async ({ page }) => {
  // チェック操作でrerun発火、値が変わることを確認
})
test("toggle interaction updates value", async ({ page }) => {
  // トグル操作でrerun発火、値が変わることを確認
})
```

**コミットメッセージ**: `test(e2e): add checkbox and toggle E2E tests`

---

### Iteration 7.2: radio/selectbox E2E

**目標**: ラジオボタンのブラウザ動作確認

**ファイル変更**:
- `e2e/widgets-radio.spec.ts` - 新規作成

**テスト内容**:
```typescript
test("radio selection updates value", async ({ page }) => {
  // ラジオ選択でrerun発火、値が変わることを確認
})
```

**コミットメッセージ**: `test(e2e): add radio E2E tests`

---

### Iteration 7.3: number_input/text_area E2E

**目標**: 数値入力とテキストエリアのブラウザ動作確認

**ファイル変更**:
- `e2e/widgets-input.spec.ts` - 新規作成

**テスト内容**:
```typescript
test("number_input updates value", async ({ page }) => {
  // 数値変更でrerun発火、値が変わることを確認
})
test("text_area updates value", async ({ page }) => {
  // テキスト入力でrerun発火、値が変わることを確認
})
```

**コミットメッセージ**: `test(e2e): add number_input and text_area E2E tests`

---

### Iteration 7.4: multiselect E2E

**目標**: マルチセレクトのブラウザ動作確認

**ファイル変更**:
- `e2e/widgets-multiselect.spec.ts` - 新規作成

**テスト内容**:
```typescript
test("multiselect updates selected values", async ({ page }) => {
  // 複数選択でrerun発火、配列が更新されることを確認
})
```

**コミットメッセージ**: `test(e2e): add multiselect E2E tests`

---

## 実装順序サマリー

| # | イテレーション | 成果物 | 予想変更ファイル数 |
|---|---------------|--------|-------------------|
| 1.1 | checkbox imperative | checkbox関数 | 5 |
| 1.2 | checkbox render | renderCheckbox | 2 |
| 1.3 | checkbox kt API | kt.checkbox | 4 |
| 2.1 | radio imperative | radio関数 | 5 |
| 2.2 | radio render | renderRadio | 2 |
| 2.3 | radio kt API | kt.radio | 4 |
| 3.1 | number_input imperative | number_input関数 | 5 |
| 3.2 | number_input render | renderNumberInput | 2 |
| 3.3 | number_input kt API | kt.number_input | 4 |
| 4.1 | text_area imperative | text_area関数 | 5 |
| 4.2 | text_area render | renderTextArea | 2 |
| 4.3 | text_area kt API | kt.text_area | 4 |
| 5.1 | toggle imperative | toggle関数 | 4 |
| 5.2 | toggle render | renderToggle | 2 |
| 5.3 | toggle kt API | kt.toggle | 4 |
| 6.1 | multiselect imperative | multiselect関数 | 5 |
| 6.2 | multiselect render | renderMultiselect | 2 |
| 6.3 | multiselect kt API | kt.multiselect | 4 |
| 7.1 | E2E checkbox/toggle | ブラウザテスト | 1 |
| 7.2 | E2E radio | ブラウザテスト | 1 |
| 7.3 | E2E input widgets | ブラウザテスト | 1 |
| 7.4 | E2E multiselect | ブラウザテスト | 1 |

**合計: 22イテレーション、22コミット**

---

## 完了チェックリスト

各イテレーション後に確認:

```bash
# 1. Lint修正
bun run lint:fix

# 2. CI実行（lint + build + test）
bun run ci

# 3. コミット
git add -A
git commit -m "コミットメッセージ"
```

Phase 1完了時の最終確認:

- [ ] 6ウィジェット全てのimperative API実装
- [ ] 6ウィジェット全てのrender関数実装
- [ ] 6ウィジェット全てのkt.* API実装
- [ ] 全ユニットテストパス
- [ ] 全E2Eテストパス
- [ ] `bun run ci` 成功
- [ ] 全コミット完了・プッシュ完了

---

*対象バージョン: kantan-ui v0.2.0*
