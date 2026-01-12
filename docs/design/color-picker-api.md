# kt.color_picker API 設計書

作成日: 2026-01-12

## 実装ステータス

> **📋 設計中**

---

## 1. 概要

### 1.1 目的

Streamlit の `st.color_picker()` に相当する機能を kantan-ui に実装する。ユーザーが色を選択できるカラーピッカーウィジェットを提供する。

### 1.2 ユースケース

| ユースケース | 説明 |
|-------------|------|
| テーマカスタマイズ | ユーザーがUIの色を選択 |
| データ可視化 | グラフやチャートの色指定 |
| デザインツール | 背景色・文字色の選択 |

### 1.3 設計原則

| 原則 | 説明 |
|------|------|
| **最小実装** | ブラウザネイティブの `input[type=color]` を使用 |
| **Streamlit互換** | `st.color_picker()` と同様の使用感 |
| **既存パターン準拠** | kantan-ui の既存ウィジェットパターンに従う |

---

## 2. API設計

### 2.1 基本API

```typescript
const color = kt.color_picker("Pick a color");
// → "#000000"

const color = kt.color_picker("Theme color", "#3498db");
// → "#3498db"

const color = kt.color_picker("Background", "#ffffff", { key: "bg_color" });
```

### 2.2 シグネチャ

```typescript
function color_picker(
  label: string,
  defaultValue?: string,
  config?: Partial<ColorPickerConfig>
): string
```

### 2.3 パラメータ

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|------|------|-----------|------|
| `label` | `string` | ✅ | - | ラベルテキスト |
| `defaultValue` | `string` | - | `"#000000"` | 初期色（HEX形式） |
| `config` | `Partial<ColorPickerConfig>` | - | `{}` | 設定オプション |

### 2.4 戻り値

| 型 | 説明 |
|------|------|
| `string` | 選択された色（HEX形式 `#RRGGBB`） |

---

## 3. 型定義

### 3.1 ColorPickerConfig

```typescript
export interface ColorPickerConfig {
  /** ウィジェットキー（状態保持用） */
  key?: string;
  /** 無効化フラグ */
  disabled?: boolean;
}
```

---

## 4. HTML構造

```html
<div id="widget_0-container" class="kt-color-picker-container">
  <label for="widget_0" class="kt-color-picker-label">Pick a color</label>
  <input
    type="color"
    id="widget_0"
    value="#ff0000"
    data-kt-event="change"
    class="kt-color-picker" />
</div>
```

### 4.1 属性

| 属性 | 値 | 説明 |
|------|------|------|
| `type` | `"color"` | ブラウザネイティブのカラーピッカー |
| `data-kt-event` | `"change"` | 値変更時にrerunをトリガー |
| `class` | `"kt-color-picker"` | スタイリング用クラス |

---

## 5. ファイル構成

```
src/widgets/
├── types.ts              # ColorPickerConfig を追加
├── color-picker.ts       # 新規作成
└── index.ts              # エクスポート追加

src/kt/
└── widgets.ts            # 宣言的API追加

tests/unit/widgets/
└── color-picker.test.ts  # 新規作成
```

---

## 6. イテレーション計画

### Iteration 1: 型定義とテスト

**目標**: ColorPickerConfig の型定義とテスト作成

**作業内容**:
- `src/widgets/types.ts` に `ColorPickerConfig` を追加
- `tests/unit/widgets/color-picker.test.ts` を作成

---

### Iteration 2: 命令型関数

**目標**: `color_picker()` 命令型関数の実装

**作業内容**:
- `src/widgets/color-picker.ts` を作成
- `initializeColorPickerState()` を `src/widgets/core.ts` に追加
- `src/widgets/index.ts` にエクスポート追加

---

### Iteration 3: 宣言的API

**目標**: `kt.color_picker()` の実装

**作業内容**:
- `src/kt/widgets.ts` に `color_picker` を追加

---

### Iteration 4: スタイル

**目標**: CSSスタイルの追加

**作業内容**:
- `src/styles/default.ts` に `.kt-color-picker-*` スタイルを追加

---

## 7. 非実装項目（将来検討）

| 項目 | 理由 |
|------|------|
| アルファチャンネル対応 | `input[type=color]` は非対応。カスタムUI必要 |
| 出力フォーマット選択 | HEX統一でシンプルに。ユーザー側でパース可能 |
| カラーパレット | 初期実装では不要 |
| カラープレビュー拡張 | ブラウザネイティブUIで十分 |

---

## 8. チェックリスト

### 実装前

- [ ] 既存ウィジェット実装パターンを確認（text-input.ts 等）

### 各イテレーション後

- [ ] `bun run lint:fix` 実行
- [ ] `bun run test` 実行
- [ ] コミット

### 完了時

- [ ] `bun run ci` 全パス
- [ ] 単体テスト作成済み
- [ ] ドキュメント更新

---

## 9. 参考資料

- [Streamlit st.color_picker](https://docs.streamlit.io/develop/api-reference/widgets/st.color_picker)
- [MDN input type="color"](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/color)
- kantan-ui 既存実装
  - `src/widgets/text-input.ts` - 標準的な入力ウィジェットパターン
  - `src/widgets/types.ts` - Config インターフェース定義
