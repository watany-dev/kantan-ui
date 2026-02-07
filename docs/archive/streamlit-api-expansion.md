# Streamlit API拡張計画（Phase 3-B）

作成日: 2025-01-06
更新日: 2026-02-07

## 実装状況サマリー

| Iteration | API | 状態 |
|-----------|-----|------|
| 1 | markdown, code, json | ✅ 実装済み |
| 2 | image, audio, video | ✅ 実装済み |
| 3 | metric | ✅ 実装済み |
| 4 | line_chart, bar_chart | ✅ 実装済み |
| 5 | date_input, time_input | ✅ 実装済み |
| 5b | color_picker | ✅ 実装済み |
| 6 | dataframe | ✅ 実装済み |
| 7 | file_uploader | ✅ 実装済み |
| 8 | sidebar | ✅ 実装済み |

---

## 概要

Streamlitチュートリアル相当の機能を実現するため、不足しているAPIを段階的に実装する。

---

## 現状の実装済みAPI

### 出力系
write, title, header, subheader, text, divider, html, **markdown**, **code**, **json**, **image**, **metric**, **write_stream**, **empty**

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
text_input, text_area, number_input, slider, **date_input**, **time_input**, **color_picker**, **chat_input**

### 選択ウィジェット
button, checkbox, toggle, radio, selectbox, multiselect

### ファイル
**file_uploader**

### キャッシュ
**cache_data**, **cache_resource**

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

## Iteration 2: メディア表示 ✅ 実装済み

### kt.image() ✅ 実装済み

`src/widgets/image.ts` に実装済み。詳細は `docs/impl/image-design.md` を参照。

### kt.audio() ✅ 実装済み

`src/widgets/audio.ts` に実装済み。URL、data URI、バイナリ対応。loop/autoplay対応。

### kt.video() ✅ 実装済み

`src/widgets/video.ts` に実装済み。詳細は `docs/design/video-api.md` を参照。
ポスター画像、字幕トラック、時間範囲（Media Fragment URI）対応。

---

## Iteration 3: メトリクス表示 ✅ 実装済み

### kt.metric() ✅

`src/kt/metric.ts` に実装済み。詳細は `docs/design/metric-api.md` を参照。

delta方向判定、色モード（normal/inverse/off）、ヘルプテキスト対応済み。

---

## Iteration 4: チャート基盤 ✅ 実装済み

### kt.line_chart() ✅ 実装済み

SVGベースで実装。複数データフォーマット対応。詳細は `docs/design/line-chart-api.md` を参照。

### kt.bar_chart() ✅ 実装済み

SVGベースで実装。単一/複数シリーズ、積み上げ/グループ化、横向き対応。
詳細は `docs/design/bar-chart-api.md` を参照。

**採用方式**: 自作SVG（0KB、最小依存、カスタマイズ自由）

---

## Iteration 5: 日付・時刻入力・カラーピッカー ✅ 実装済み

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

### kt.color_picker() ✅ 実装済み

`src/widgets/color-picker.ts` に実装済み。詳細は `docs/design/color-picker-api.md` および `docs/impl/color-picker-implementation-plan.md` を参照。

---

## Iteration 6: データフレーム拡張 ✅ 実装済み

### kt.dataframe() ✅ 実装済み

`src/widgets/dataframe.ts` および `src/kt/data.ts` に実装済み。詳細は `docs/design/dataframe-api.md` を参照。

実装機能:
| 機能 | 状態 |
|------|------|
| 基本表示 | ✅ |
| ソート（クライアントサイド） | ✅ |
| テキスト検索フィルタ | ✅ |
| 行選択（single/multi） | ✅ |
| カラム並べ替え | ✅ |
| インデックス列非表示 | ✅ |

---

## Iteration 7: ファイルアップロード ✅ 実装済み

### kt.file_uploader() ✅

`src/widgets/file-uploader.ts` に実装済み。詳細は `docs/design/file-uploader-api.md` を参照。

セキュリティユーティリティ（ファイル名サニタイズ、マジックバイト検証、Polyglot検出）、セッション管理、クライアント側処理が全て実装済み。

---

## Iteration 8: サイドバー ✅ 実装済み

**詳細**: `sidebar-design.md` を参照

実装コミット:
- `e1c0967` feat(kt): add kt.sidebar() callback-style API
- `a268314` feat(client): add sidebar toggle functionality

---

## 今後の優先順位

全Iterationが完了。本計画は完了。

### 実装済み
- ✅ markdown, code, json (Iteration 1)
- ✅ image, audio, video (Iteration 2)
- ✅ metric (Iteration 3)
- ✅ line_chart, bar_chart (Iteration 4)
- ✅ date_input, time_input (Iteration 5)
- ✅ color_picker (Iteration 5b)
- ✅ dataframe (Iteration 6)
- ✅ file_uploader (Iteration 7)
- ✅ sidebar (Iteration 8)

---

## 完了基準

- [x] 全ユニットテストパス
- [x] 全E2Eテストパス
- [x] `bun run ci` 成功
- [x] Streamlitチュートリアル相当のサンプルが動作

---

## 参考リンク

- [Streamlit API Reference](https://docs.streamlit.io/develop/api-reference)
