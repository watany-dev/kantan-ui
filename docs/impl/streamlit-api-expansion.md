# Streamlit API拡張計画（Phase 3-B）

作成日: 2025-01-06
更新日: 2026-01-08

## 実装状況サマリー

| Iteration | API | 状態 |
|-----------|-----|------|
| 1 | markdown, code, json | ✅ 実装済み |
| 2 | image, audio, video | ❌ 未実装 |
| 3 | metric | ❌ 未実装 |
| 4 | line_chart, bar_chart | ❌ 未実装 |
| 5 | date_input, time_input | ✅ 実装済み |
| 5b | color_picker | ❌ 未実装 |
| 6 | dataframe | ❌ 未実装 |
| 7 | file_uploader | ❌ 未実装 |
| 8 | sidebar | ✅ 実装済み |

---

## 概要

Streamlitチュートリアル相当の機能を実現するため、不足しているAPIを段階的に実装する。

---

## 現状の実装済みAPI

### 出力系
write, title, header, subheader, text, divider, html, **markdown**, **code**, **json**

### アラート
success, error, warning, info

### フィードバック
progress, spinner, toast

### データ
table

### レイアウト
container, columns, expander, tabs, **sidebar**

### フォーム
form, form_submit_button

### 入力ウィジェット
text_input, text_area, number_input, slider, **date_input**, **time_input**

### 選択ウィジェット
button, checkbox, toggle, radio, selectbox, multiselect

### その他
download_button, rerun, set_page_config

---

## Iteration 1: 出力系拡張 ✅ 実装済み

### kt.markdown() ✅

実装コミット:
- `7d5b631` feat(kt): add basic markdown parser
- `e8218a9` feat(kt): extend markdown parser with lists, links, and code blocks
- `95d6942` feat(kt): integrate kt.markdown() API
- `e1a38ab` feat: add table syntax support to markdown parser

### kt.code() ✅

実装コミット:
- `1e50a63` feat(kt): add code() API for code block display
- `dc4c176` feat(kt): add syntax highlighting for code()
- `d3fe9c9` feat: add copy button feature to code blocks

### kt.json() ✅

実装コミット:
- `cba932c` feat(kt): add json() API for collapsible JSON viewer

---

## Iteration 2: メディア表示 ❌ 未実装

### kt.image()

**工数**: 0.5日

```typescript
interface ImageConfig {
  caption?: string;
  width?: number | string;
  use_column_width?: boolean;
}

export function image(
  src: string | ArrayBuffer,
  config?: ImageConfig
): void;
```

### kt.audio()

**工数**: 0.5日

### kt.video()

**工数**: 0.5日

---

## Iteration 3: メトリクス表示 ❌ 未実装

### kt.metric()

**工数**: 0.5日

```typescript
interface MetricConfig {
  delta_color?: "normal" | "inverse" | "off";
  help?: string;
}

export function metric(
  label: string,
  value: string | number,
  delta?: string | number,
  config?: MetricConfig
): void;
```

---

## Iteration 4: チャート基盤 ❌ 未実装

### kt.line_chart()

**工数**: 1.5日

### kt.bar_chart()

**工数**: 0.5日

**ライブラリ選定**:
| Option | サイズ | 特徴 |
|--------|--------|------|
| Chart.js | ~60KB | 高機能、広く使われている |
| uPlot | ~30KB | 高速、軽量 |
| 自作SVG | 0KB | 最小依存、カスタマイズ自由 |

---

## Iteration 5: 日付・時刻入力 ✅ 部分実装

### kt.date_input() ✅

**工数**: 1日

実装コミット:
- `3fc0955` feat: add date_input and time_input widgets

```typescript
interface DateInputConfig {
  key?: string;
  min?: string;      // "YYYY-MM-DD"形式
  max?: string;      // "YYYY-MM-DD"形式
  disabled?: boolean;
}

// 使用例
const birthday = kt.date_input("誕生日", "2000-01-15", {
  min: "1900-01-01",
  max: "2024-12-31",
});
// 戻り値: "YYYY-MM-DD" 形式の文字列
```

### kt.time_input() ✅

**工数**: 0.5日

```typescript
interface TimeInputConfig {
  key?: string;
  step?: number;     // 秒単位（1 = 秒表示、60 = 分刻み、900 = 15分刻み）
  disabled?: boolean;
}

// 使用例
const alarm = kt.time_input("アラーム", "08:30", { step: 60 });
// 戻り値: "HH:MM" または "HH:MM:SS" 形式の文字列
```

### kt.color_picker() ❌ 未実装

**工数**: 0.5日

---

## Iteration 6: データフレーム拡張 ❌ 未実装

### kt.dataframe()

**工数**: 1.5日

既存tableとの差分:
| 機能 | table | dataframe |
|------|-------|-----------|
| 基本表示 | ✓ | ✓ |
| ソート | - | ✓ |
| フィルタ | - | ✓ |
| ページング | - | ✓ |
| 行選択 | - | ✓ |

---

## Iteration 7: ファイルアップロード ❌ 未実装

### kt.file_uploader()

**工数**: 2.5日

```typescript
interface FileUploaderConfig {
  key?: string;
  type?: string | string[];
  accept_multiple_files?: boolean;
  max_size?: number;
}

interface UploadedFile {
  name: string;
  type: string;
  size: number;
  getBytes(): ArrayBuffer;
  getText(): string;
}

export function file_uploader(
  label: string,
  config?: FileUploaderConfig
): UploadedFile | UploadedFile[] | null;
```

---

## Iteration 8: サイドバー ✅ 実装済み

**詳細**: `sidebar-design.md` を参照

実装コミット:
- `e1c0967` feat(kt): add kt.sidebar() callback-style API
- `a268314` feat(client): add sidebar toggle functionality

---

## 今後の優先順位

1. **高**: file_uploader - ファイルアップロードは需要が高い
2. **中**: metric - ダッシュボード用途に有用
3. **中**: color_picker - フォーム機能の充実
4. **低**: image, audio, video - シンプルなHTMLタグ生成
5. **低**: dataframe - table()で代替可能
6. **低**: charts - 工数が大きい

### 実装済み
- ✅ date_input, time_input (Iteration 5)

---

## 完了基準

- [ ] 全ユニットテストパス
- [ ] 全E2Eテストパス
- [ ] `bun run ci` 成功
- [ ] Streamlitチュートリアル相当のサンプルが動作

---

## 参考リンク

- [Streamlit API Reference](https://docs.streamlit.io/develop/api-reference)
