# API簡素化レビュー計画

## 概要
直近1週間（2026-02-01〜02-08）で作成されたAPIを全件レビューし、過剰な処理やロジックを特定してシンプルにする。

## 対象API一覧（新規作成・大幅変更）

| API | ファイル | 作成日 | 行数 |
|-----|---------|--------|------|
| `kt.area_chart()` | `src/kt/chart/area-chart.ts` | 02-07 | 619行 |
| `kt.bar_chart()` | `src/kt/chart/bar-chart.ts` | 02-07 | 633行 |
| `kt.line_chart()` | `src/widgets/line-chart.ts` | 02-06 | 559行 |
| `kt.caption()` | `src/kt/output.ts` | 02-08 | (output.ts全体436行) |
| `kt.link_button()` | `src/kt/output.ts` | 02-08 | (同上) |
| `kt.dataframe()` | `src/kt/data.ts` | 02-06 | 181行 |
| `kt.video()` | `src/kt/media.ts` | 02-04 | (media.ts全体86行) |
| `kt.audio()` | `src/kt/media.ts` | 02-04 | (同上) |
| Chart共通ユーティリティ | `src/kt/chart/normalize.ts` | 02-07 | 170行 |
| Chart共通ユーティリティ | `src/kt/chart/scale.ts` | 02-07 | 90行 |
| Chart共通ユーティリティ | `src/kt/chart/colors.ts` | 02-07 | 94行 |
| Chart共通ユーティリティ | `src/kt/chart/render-utils.ts` | 02-07 | 102行 |
| renderHtml移行 | `src/utils/html.ts` | 02-07 | 181行 |
| getEnvVar | `src/utils/env.ts` | 02-07 | 25行 |

**合計: 約3,175行のコード**

---

## レビュー項目

### Review 1: Chart共通ユーティリティの重複排除 [優先度: 最高]

**問題:** `bar-chart.ts` と `area-chart.ts` に同一関数が4つコピーされている

| 重複関数 | 行数 | 場所 |
|----------|------|------|
| `sanitizeConfig()` | 25行 × 2 | bar-chart.ts, area-chart.ts |
| `sanitizeValues()` | 14行 × 2 | bar-chart.ts, area-chart.ts |
| `getAllValues()` | 3行 × 2 | bar-chart.ts, area-chart.ts |
| `getStackedMaxValues()` | 11行 × 2 | bar-chart.ts, area-chart.ts |

**修正方針:**
- `src/kt/chart/shared.ts` に共通関数を抽出
- bar-chart.ts, area-chart.ts から import に切り替え
- **削減見込み: 約106行**

---

### Review 2: line-chart.ts の正規化ロジック重複 [優先度: 高]

**問題:** `line-chart.ts` が独自に正規化ロジックを持ち、`normalize.ts` と機能が重複

| 重複箇所 | line-chart.ts | normalize.ts |
|----------|--------------|-------------|
| `normalizeChartData()` | 92行(独自実装) | 独自実装 |
| `findXColumn()` | あり | あり |
| `isNumericColumn()` | あり | あり |
| `resolveYKeys()` | あり | 類似 |

**修正方針:**
- `normalize.ts` を正規の正規化モジュールとして統一
- `line-chart.ts` 内の重複ヘルパーを削除し、`normalize.ts` を使用
- line-chart固有のフォーマット(number[], number[][])は normalize.ts に統合
- **削減見込み: 約100行**

---

### Review 3: renderLineChart() 巨大関数の分割 [優先度: 高]

**問題:** `renderLineChart()` が114行で、正規化・スケーリング・色解決・SVG構築・レイアウトを一関数に詰め込んでいる

**現在の構造:**
```
renderLineChart() [114行]
├── データ正規化 (15行)
├── スケール計算 (10行)
├── 色解決 (5行)
├── SVGヘッダー + グリッド (15行)
├── 軸描画 (20行)
├── ライン描画 (25行)
├── 凡例 (10行)
└── HTML wrapper (14行)
```

**修正方針:**
- render-utils.ts の共通関数(renderGrid, renderYAxis, renderXAxis, renderLegend)を活用
- line-chart.ts 固有のライン描画ロジックのみを残す
- Review 2の正規化統合と合わせて実施
- **削減見込み: 50〜70行**

---

### Review 4: bar-chart.ts Vertical/Horizontal 描画の重複 [優先度: 中]

**問題:** 縦棒と横棒で152行のほぼ同じSVG生成ロジックが存在

| 関数 | 行数 |
|------|------|
| `renderVerticalBarChartHtml()` | 71行 |
| `renderHorizontalBarChartHtml()` | 81行 |
| `renderGroupedBars()` | 34行 |
| `renderHorizontalGroupedBars()` | 34行 |
| `renderStackedBars()` | 40行 |
| `renderHorizontalStackedBars()` | 37行 |

**差分分析:** 軸の向きとx/y座標の入れ替えが主な差異。SVGのrect属性でx↔y, width↔heightを交換するだけの箇所が多い。

**修正方針:**
- 方向(orientation)をパラメータ化し、座標マッピング関数で統一
- Grouped/Stacked も同様に方向パラメータで統合
- **削減見込み: 100〜120行**

---

### Review 5: scale計算の重複 [優先度: 中]

**問題:** Nice Numbers アルゴリズムが2箇所に実装されている

| 実装 | ファイル | 行数 | 特徴 |
|------|---------|------|------|
| `niceScale()` | line-chart.ts | 29行 | シンプル、再帰で同値ケース対応 |
| `calculateAxisScale()` | scale.ts | 55行 | bar-chart用、0包含ルールあり |

**修正方針:**
- `calculateAxisScale()` にオプション `includeZero: boolean` を追加
- line-chart.ts の `niceScale()` を削除し `calculateAxisScale()` に統一
- **削減見込み: 25〜30行**

---

### Review 6: output.ts renderJsonTree() の複雑さ [優先度: 低]

**問題:** 52行の再帰関数で、HTML文字列の手動構築が多い

**現状の処理:**
- null/undefined/boolean/number/string/array/object を再帰的に処理
- 折りたたみ可能な`<details>`要素をインラインHTMLで生成
- 各型ごとに`<span>`でカラーリング

**評価:** 再帰的なJSON→HTMLレンダリングとしては妥当な複雑さ。renderHtml()への移行が難しい（再帰的に文字列結合するため）。現状維持が適切。

**修正方針:** 修正不要。現状のままで問題なし。

---

### Review 7: html.ts containsUnsafeHtml() の過剰なregex [優先度: 低]

**問題:** 17個の個別regexパターンでXSS検出を行っている

**現状パターン数:**
- Fast-path チェック: 4個
- 詳細パターン: 13個

**評価:** セキュリティ関連コードの冗長性はバグ防止の観点で許容される。パターンの集約は可読性を下げるリスクがある。PBT(property-based testing)で十分にテストされている。

**修正方針:** 修正不要。セキュリティコードの「過剰」は安全側の設計判断として妥当。

---

### Review 8: 型定義の整理 [優先度: 低]

**問題:** inline型の繰り返し使用

| 重複箇所 | 型 | 回数 |
|----------|-----|------|
| normalize.ts | `{ x?: string; y?: string \| string[]; color?: string \| string[] }` | 4回 |
| 複数チャートファイル | `{ columns: string[]; data: unknown[][] }` | 3回 |

**修正方針:**
- `NormalizeConfig` インターフェースを `src/kt/chart/types.ts` に定義
- `ExplicitChartFormat` を同ファイルに定義
- Review 1〜2の修正と合わせて実施

---

## 問題なしと判断したAPI

以下はシンプルで適切な実装であり、修正不要:

| API | 理由 |
|-----|------|
| `kt.caption()` | 4行のシンプルなHTML出力 |
| `kt.link_button()` | 6行のシンプルなHTML出力 |
| `kt.video()` | media.tsの薄いラッパー |
| `kt.audio()` | media.tsの薄いラッパー |
| `kt.dataframe()` | data.tsのクリーンな実装 |
| `charts.ts` | 3関数×3行のエントリポイント |
| `render-utils.ts` | 適切に抽出された共通関数群 |
| `colors.ts` | セキュリティ考慮の適切な実装 |
| `getEnvVar` | 25行のミニマルな実装 |

---

## 実施順序

```
Phase 1: 基盤整備 (Review 1 + Review 8)
  └── chart/shared.ts に共通関数を抽出
  └── chart/types.ts に共通型を定義

Phase 2: 正規化統合 (Review 2 + Review 5)
  └── normalize.ts に正規化を統一
  └── scale.ts にスケール計算を統一

Phase 3: 巨大関数の分割 (Review 3)
  └── line-chart.ts を render-utils 活用で簡素化

Phase 4: 描画ロジック統合 (Review 4)
  └── bar-chart.ts のVertical/Horizontal統合
```

## 期待される効果

| 指標 | Before | After (見込み) |
|------|--------|--------------|
| 重複コード | 約400行 | 0行 |
| 合計行数 | 約3,175行 | 約2,750行 (13%削減) |
| 30行超の関数 | 8個 | 3個以下 |
| 同一ロジックの実装数 | 2〜3箇所 | 1箇所 |

---

## 判断基準

各レビュー項目で修正するかどうかの判断基準:

1. **修正する:** 同一ロジックが2箇所以上に存在 → 共通化
2. **修正する:** 30行を大幅に超える関数 → 分割
3. **修正しない:** セキュリティ関連の防御的コード → 安全側を維持
4. **修正しない:** 再帰的アルゴリズムの本質的複雑さ → 可読性を損なわない
5. **修正しない:** 既にテストが充実しており影響範囲が大きい → コスト対効果を考慮
