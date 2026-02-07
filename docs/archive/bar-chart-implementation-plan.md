# BarChart 実装計画書

## 実装ステータス

> **✅ 全イテレーション完了** (2026-02-07)
>
> 9イテレーションすべてを TDD サイクルで完了。全 120 テストパス。

## 概要

`docs/design/bar-chart-api.md` の設計に基づき、`kt.bar_chart()` を TDD サイクルで実装する。
各イテレーションで `bun run ci` を通してコミットする。

## 現状分析

### 現在の line_chart 実装

`src/widgets/line-chart.ts` に以下の機能がモノリシックに実装されている:

| 機能 | 関数 | 行数 |
|------|------|------|
| データ正規化 | `normalizeChartData()` + ヘルパー群 | ~120行 |
| 軸スケール計算 | `niceScale()` | ~25行 |
| カラーパレット | `DEFAULT_COLORS`, `resolveColors()` | ~30行 |
| SVG描画 | `renderLineChart()` + レンダラー群 | ~250行 |
| ユーティリティ | `formatNumber()`, `escapeHtml` import | ~10行 |

### 設計書が求める共有基盤

```
src/kt/chart/
  types.ts        # 共通型 + bar固有型
  colors.ts       # カラーパレット・バリデーション
  normalize.ts    # データ正規化
  scale.ts        # 軸スケール計算
  bar-chart.ts    # bar_chart 固有の実装
```

### ギャップ

- 共有基盤（`src/kt/chart/`）が未構築
- line_chart の正規化・スケール・カラーがモノリシック
- 設計書では共有基盤の構築から開始と明記

### 戦略的判断: 共有基盤の抽出について

設計書は `src/kt/chart/` への共有モジュール抽出を想定しているが、
**初期実装では bar_chart を独立モジュールとして実装し、line_chart のリファクタリングは行わない**。

理由:
1. line_chart のリファクタリングは bar_chart の機能要件ではない
2. リファクタリングの影響範囲が広く、既存テストの書き換えが必要
3. "Tidy First?" の原則に従い、構造的変更と機能的変更を分離する
4. 共有化は bar_chart 完成後の別イテレーション（Iteration 9）として計画

bar_chart では line_chart から必要な関数（`niceScale`, `normalizeChartData` のロジック等）を
**参考にしつつ独自に実装**し、後から共通化する。

---

## イテレーション一覧

| # | 内容 | 主な成果物 | テスト数 | 状況 |
|---|------|-----------|---------|------|
| 1 | 型定義 + カラーパレット | `types.ts`, `colors.ts` | 30 | ✅ 完了 |
| 2 | データ正規化（共通パイプライン） | `normalize.ts` | 17 | ✅ 完了 |
| 3 | 軸スケール計算 | `scale.ts` | 11 | ✅ 完了 |
| 4 | BarChart ショートハンド正規化 + ソート | `bar-chart.ts`（前半） | 10 | ✅ 完了 |
| 5 | SVG描画（単一シリーズ縦棒） | `bar-chart.ts`（描画） | 15 | ✅ 完了 |
| 6 | 複数シリーズ（グループ化 + 積み上げ） | `bar-chart.ts`（マルチ） | 10 | ✅ 完了 |
| 7 | 横向きバー（horizontal） | `bar-chart.ts`（横向き） | 5 | ✅ 完了 |
| 8 | kt.bar_chart 統合 + CSS + エクスポート | `charts.ts`, `index.ts`, `default.ts` | 5 | ✅ 完了 |
| 9 | エッジケース + バリデーション | テスト追加 | 17 | ✅ 完了 |

---

## Iteration 1: 型定義 + カラーパレット

### 目標
bar_chart に必要な型定義とカラーパレット・バリデーションを実装する。

### 対象ファイル

| ファイル | 操作 |
|---------|------|
| `src/kt/chart/types.ts` | 新規作成 |
| `src/kt/chart/colors.ts` | 新規作成 |
| `tests/unit/kt/chart/types.test.ts` | 新規作成 |
| `tests/unit/kt/chart/colors.test.ts` | 新規作成 |

### 型定義 (`types.ts`)

```typescript
// BarChartData - 全入力形式の union
export type BarChartData =
  | number[]
  | Record<string, number>
  | Record<string, unknown>[]
  | unknown[][]
  | { columns: string[]; data: unknown[][] };

// ChartData - 正規化パイプラインの入力型（line_chartと将来共有）
export type ChartData =
  | Record<string, unknown>[]
  | unknown[][]
  | { columns: string[]; data: unknown[][] };

// BarChartConfig
export interface BarChartConfig {
  x?: string;
  y?: string | string[];
  x_label?: string;
  y_label?: string;
  color?: string | string[];
  stack?: boolean;       // default: true
  horizontal?: boolean;  // default: false
  sort?: "ascending" | "descending";
  height?: number;       // default: 400
  title?: string;
}

// NormalizedBarChartData - 正規化後の内部表現
export interface NormalizedBarChartData {
  xValues: (string | number)[];
  series: BarChartSeries[];
}

export interface BarChartSeries {
  name: string;
  values: (number | null)[];
  color: string;
}
```

### カラーパレット (`colors.ts`)

```typescript
// Tableau 10 カラーパレット
export const DEFAULT_CHART_COLORS: readonly string[] = [...]

// カラー解決
export function resolveChartColors(count: number, color?: string | string[]): string[]

// カラーバリデーション（XSS防止）
export function isValidColor(color: string): boolean
export function validateColors(colors: string | string[]): void
```

### テスト（Red）

```typescript
// types.test.ts
describe("BarChartData type", () => {
  it("accepts number[]")
  it("accepts Record<string, number>")
  it("accepts Record<string, unknown>[]")
  it("accepts unknown[][]")
  it("accepts explicit format { columns, data }")
})

// colors.test.ts
describe("resolveChartColors", () => {
  it("returns default palette colors for count without custom color")
  it("wraps around when count exceeds palette length")
  it("applies single color string to all series")
  it("applies color array to corresponding series")
  it("fills missing colors with defaults when array is shorter")
})

describe("isValidColor", () => {
  it("accepts hex colors: #fff, #ffffff, #AABBCC")
  it("accepts CSS color names: red, blue, steelblue")
  it("accepts rgb/rgba: rgb(255,0,0), rgba(0,0,0,0.5)")
  it("rejects javascript: URLs")
  it("rejects url() values")
  it("rejects expressions with parentheses (except rgb/rgba)")
})
```

### Green / Refactor
- 最小限の実装でテストを通す
- カラーバリデーションは正規表現ベース

### 完了条件
```bash
bun run lint:fix && bun run ci  # PASS
git commit
```

---

## Iteration 2: データ正規化（共通パイプライン）

### 目標
`Record<string, unknown>[]`, `unknown[][]`, `{ columns, data }` の3形式を
`NormalizedBarChartData` に変換する正規化パイプラインを実装する。

### 対象ファイル

| ファイル | 操作 |
|---------|------|
| `src/kt/chart/normalize.ts` | 新規作成 |
| `tests/unit/kt/chart/normalize.test.ts` | 新規作成 |

### 実装内容

```typescript
// メイン正規化関数
export function normalizeChartData(
  data: ChartData,
  config?: { x?: string; y?: string | string[]; color?: string | string[] }
): NormalizedBarChartData

// 内部ヘルパー
function normalizeObjectArray(data: Record<string, unknown>[], config?): NormalizedBarChartData
function normalize2DArray(data: unknown[][], config?): NormalizedBarChartData
function normalizeExplicitFormat(data: { columns; data }, config?): NormalizedBarChartData
function findXColumn(firstRow: Record<string, unknown>, keys: string[]): string | undefined
function isNumericColumn(data: Record<string, unknown>[], key: string): boolean
```

### テスト（Red）

```typescript
describe("normalizeChartData", () => {
  describe("Record<string, unknown>[]", () => {
    it("auto-detects string column as x-axis")
    it("uses all numeric columns as y-series")
    it("respects explicit x config")
    it("respects explicit y config (string)")
    it("respects explicit y config (string[])")
    it("handles all-numeric columns (no string column)")
    it("skips NaN values → null")
  })

  describe("unknown[][]", () => {
    it("uses row index as x-axis")
    it("treats each column as a series")
    it("names series as series_1, series_2, ...")
  })

  describe("{ columns, data }", () => {
    it("normalizes with all columns as series")
    it("filters by y config")
    it("ignores non-existent y columns")
  })

  describe("empty data", () => {
    it("returns empty for empty array")
    it("returns empty for empty object array")
  })
})
```

### Green / Refactor
- line_chart の `normalizeChartData` を参考にしつつ、bar_chart 用に最適化
  - line_chart は `points: [number, number][]` だが bar_chart は `values: (number | null)[]`
  - bar_chart はカテゴリ（文字列）x軸が主なのでデータ構造が異なる
- カラー割り当ては `resolveChartColors()` を使用

### 完了条件
```bash
bun run lint:fix && bun run ci  # PASS
git commit
```

---

## Iteration 3: 軸スケール計算

### 目標
Nice numbers アルゴリズムで見やすいy軸目盛りを生成する。
バーチャートでは y 軸（値軸）のスケールに使用。

### 対象ファイル

| ファイル | 操作 |
|---------|------|
| `src/kt/chart/scale.ts` | 新規作成 |
| `tests/unit/kt/chart/scale.test.ts` | 新規作成 |

### 実装内容

```typescript
export interface AxisScale {
  min: number;
  max: number;
  step: number;
  ticks: number[];
}

// Nice numbers アルゴリズム
export function calculateAxisScale(
  values: number[],
  maxTicks?: number
): AxisScale

// 数値フォーマット
export function formatTickValue(n: number): string
```

### テスト（Red）

```typescript
describe("calculateAxisScale", () => {
  it("generates nice ticks for 0-100 range")
  it("always includes 0 when min >= 0 (bar chart convention)")
  it("handles negative values")
  it("handles single value")
  it("handles all-zero values")
  it("handles decimal ranges (0.1-0.9)")
  it("respects maxTicks parameter")
})

describe("formatTickValue", () => {
  it("formats integers without decimal point")
  it("formats large numbers in exponential notation")
  it("formats decimals with appropriate precision")
})
```

### 重要な設計判断
- **バーチャートのy軸は必ず0を含む**: 棒グラフでは0基準が標準
  - `min >= 0` の場合、`scale.min = 0` に固定
  - `max <= 0` の場合（全て負の値）、`scale.max = 0` に固定
- line_chart の `niceScale` とは異なる動作（line_chart は0を含まない場合がある）

### 完了条件
```bash
bun run lint:fix && bun run ci  # PASS
git commit
```

---

## Iteration 4: BarChart ショートハンド正規化 + ソート

### 目標
`number[]` と `Record<string, number>` のショートハンド変換、およびソート機能を実装する。

### 対象ファイル

| ファイル | 操作 |
|---------|------|
| `src/kt/chart/bar-chart.ts` | 新規作成 |
| `tests/unit/kt/chart/bar-chart.test.ts` | 新規作成 |

### 実装内容

```typescript
// ショートハンド形式を ChartData に変換
export function normalizeBarChartInput(data: BarChartData): ChartData

// ソート適用
export function applySortOrder(
  data: NormalizedBarChartData,
  sort?: "ascending" | "descending"
): NormalizedBarChartData
```

### テスト（Red）

```typescript
describe("normalizeBarChartInput", () => {
  it("converts number[] to object array with category/value", () => {
    expect(normalizeBarChartInput([10, 20, 30])).toEqual([
      { category: "0", value: 10 },
      { category: "1", value: 20 },
      { category: "2", value: 30 },
    ])
  })

  it("converts Record<string, number> to object array", () => {
    expect(normalizeBarChartInput({ A: 10, B: 20 })).toEqual([
      { category: "A", value: 10 },
      { category: "B", value: 20 },
    ])
  })

  it("passes through Record<string, unknown>[] unchanged")
  it("passes through unknown[][] unchanged")
  it("passes through explicit format unchanged")
})

describe("applySortOrder", () => {
  it("sorts ascending by first series values")
  it("sorts descending by first series values")
  it("returns unchanged when sort is undefined")
  it("preserves all series alignment after sort")
  it("handles null values in sort (treated as 0)")
})
```

### 完了条件
```bash
bun run lint:fix && bun run ci  # PASS
git commit
```

---

## Iteration 5: SVG描画（単一シリーズ縦棒）

### 目標
単一シリーズの縦棒グラフ SVG を生成する。
基本構造: `<figure>` > `<figcaption>` + `<svg>` > グリッド + 軸 + バー。

### 対象ファイル

| ファイル | 操作 |
|---------|------|
| `src/kt/chart/bar-chart.ts` | 追加 |
| `tests/unit/kt/chart/bar-chart.test.ts` | 追加 |

### 実装内容

```typescript
// メインレンダリング関数
export function renderBarChart(
  data: BarChartData,
  config?: Partial<BarChartConfig>
): string

// 内部レンダリングヘルパー
function renderBarChartSvg(
  normalized: NormalizedBarChartData,
  config: Partial<BarChartConfig>
): string

function renderGrid(...): string
function renderXAxis(...): string
function renderYAxis(...): string
function renderBars(...): string  // 単一シリーズ
```

### SVG構造（出力例）

```html
<figure class="kt-bar-chart" role="img" aria-label="Bar chart">
  <figcaption class="kt-bar-chart-title">Title</figcaption>
  <svg viewBox="0 0 600 400" width="100%" preserveAspectRatio="xMidYMid meet"
       class="kt-bar-chart-svg">
    <title>Title</title>
    <desc>Bar chart</desc>
    <g class="kt-chart-grid">...</g>
    <g class="kt-chart-axis-x">...</g>
    <g class="kt-chart-axis-y">...</g>
    <g class="kt-chart-bars" data-series="value">
      <rect x="..." y="..." width="..." height="..." fill="#4e79a7" rx="2" />
      ...
    </g>
  </svg>
</figure>
```

### レイアウト計算

```
SVG viewBox: 600 x height(default 400)
マージン: top=20, right=20, bottom=40, left=60
  (y_label がある場合 left += 20)
  (x_label がある場合 bottom += 20)

カテゴリ幅 = plotWidth / カテゴリ数
バー幅 = カテゴリ幅 * 0.6
バーx = カテゴリ左端 + (カテゴリ幅 - バー幅) / 2
バーy = scaleY(value)
バーheight = scaleY(0) - scaleY(value)
```

### テスト（Red）

```typescript
describe("renderBarChart", () => {
  describe("basic structure", () => {
    it("generates figure with kt-bar-chart class")
    it("generates SVG with viewBox 600xheight")
    it("generates rect elements for each data point")
    it("applies default color #4e79a7 to bars")
    it("adds rx=2 for rounded corners")
  })

  describe("axes and grid", () => {
    it("renders x-axis with category labels")
    it("renders y-axis with nice tick values")
    it("renders grid lines for y-axis ticks")
    it("always starts y-axis from 0")
  })

  describe("labels", () => {
    it("renders title as figcaption")
    it("renders x_label below x-axis")
    it("renders y_label rotated on left")
  })

  describe("security", () => {
    it("escapes title for XSS prevention")
    it("escapes axis labels for XSS prevention")
    it("escapes category names in x-axis")
  })

  describe("accessibility", () => {
    it("has role=img on figure")
    it("has aria-label on figure")
    it("has SVG title and desc elements")
  })
})
```

### 完了条件
```bash
bun run lint:fix && bun run ci  # PASS
git commit
```

---

## Iteration 6: 複数シリーズ（グループ化 + 積み上げ）

### 目標
複数シリーズのバーチャートを描画する。
- `stack: false` → グループ化（横並び）
- `stack: true`（デフォルト）→ 積み上げ

### 対象ファイル

| ファイル | 操作 |
|---------|------|
| `src/kt/chart/bar-chart.ts` | 修正 |
| `tests/unit/kt/chart/bar-chart.test.ts` | 追加 |

### グループ化のレイアウト計算

```
カテゴリ幅 = plotWidth / カテゴリ数
グループ幅 = カテゴリ幅 * 0.8
バー幅 = グループ幅 / シリーズ数
バーx = カテゴリ左端 + (カテゴリ幅 * 0.1) + (seriesIndex * バー幅)
```

### 積み上げのレイアウト計算

```
カテゴリ幅 = plotWidth / カテゴリ数
バー幅 = カテゴリ幅 * 0.6
バーx = カテゴリ左端 + (カテゴリ幅 - バー幅) / 2

y軸スケール: 各カテゴリの合計値の最大値を使用
各シリーズのy位置: 前のシリーズの上端から積み上げ
```

### 凡例の追加

複数シリーズの場合のみ表示:
```html
<g class="kt-chart-legend" transform="translate(60, 10)">
  <rect x="0" y="0" width="10" height="10" fill="#4e79a7" />
  <text x="14" y="9" font-size="11">revenue</text>
  ...
</g>
```

### テスト（Red）

```typescript
describe("multi-series bar chart", () => {
  describe("grouped (stack: false)", () => {
    it("renders separate rect groups per series")
    it("places bars side by side within category")
    it("uses different colors per series")
    it("adds data-series attribute to each group")
  })

  describe("stacked (stack: true)", () => {
    it("stacks bars vertically within category")
    it("y-axis range covers total stacked values")
    it("each segment starts where previous ended")
    it("bar width is same for all stacked segments")
  })

  describe("legend", () => {
    it("renders legend for multi-series data")
    it("does not render legend for single series")
    it("legend items match series colors and names")
    it("escapes series names in legend")
  })

  describe("default behavior", () => {
    it("defaults to stack: true when multiple series")
  })
})
```

### 完了条件
```bash
bun run lint:fix && bun run ci  # PASS
git commit
```

---

## Iteration 7: 横向きバー（horizontal）

### 目標
`horizontal: true` で横向きバーチャートを描画する。
x軸とy軸の役割が入れ替わる。

### 対象ファイル

| ファイル | 操作 |
|---------|------|
| `src/kt/chart/bar-chart.ts` | 修正 |
| `tests/unit/kt/chart/bar-chart.test.ts` | 追加 |

### 変更点

- カテゴリが**y軸**（上→下）に配置
- 値が**x軸**（左→右）に配置
- `<rect>` の x/y/width/height が入れ替わる
- 軸ラベルの位置も入れ替わる

### レイアウト計算（横向き）

```
カテゴリ高さ = plotHeight / カテゴリ数
バー高さ = カテゴリ高さ * 0.6
バーy = カテゴリ上端 + (カテゴリ高さ - バー高さ) / 2
バーx = marginLeft（0起点）
バーwidth = scaleX(value) - scaleX(0)
```

### テスト（Red）

```typescript
describe("horizontal bar chart", () => {
  it("renders categories on y-axis (top to bottom)")
  it("renders values on x-axis (left to right)")
  it("rect width represents value, height is fixed bar height")
  it("supports grouped horizontal bars (stack: false)")
  it("supports stacked horizontal bars (stack: true)")
  it("applies sort to horizontal bars correctly")
})
```

### 完了条件
```bash
bun run lint:fix && bun run ci  # PASS
git commit
```

---

## Iteration 8: kt.bar_chart 統合 + CSS + エクスポート

### 目標
`kt.bar_chart()` として使える完全な関数を構築し、
スタイル、エクスポート、kt オブジェクトへの登録を行う。

### 対象ファイル

| ファイル | 操作 |
|---------|------|
| `src/kt/charts.ts` | 修正（`bar_chart` 関数を追加） |
| `src/kt/index.ts` | 修正（`kt.bar_chart` を追加） |
| `src/styles/default.ts` | 修正（バーチャート CSS 追加） |
| `src/index.ts` | 修正（エクスポート追加） |
| `tests/unit/kt/bar-chart.test.ts` | 新規作成（統合テスト） |

### kt API 統合 (`src/kt/charts.ts`)

```typescript
import { renderBarChart } from "./chart/bar-chart";
import type { BarChartConfig, BarChartData } from "./chart/types";

export function bar_chart(data: BarChartData, config?: Partial<BarChartConfig>): void {
  const ctx = requireRenderContext();
  const html = renderBarChart(data, config);
  ctx.append(html);
}
```

### kt オブジェクト登録 (`src/kt/index.ts`)

```typescript
// Chart APIs
line_chart: charts.line_chart,
bar_chart: charts.bar_chart,   // 追加
```

### CSS (`src/styles/default.ts`)

```css
/* Bar Chart Container */
.kt-bar-chart { margin: 0.5rem 0; padding: 0; }
.kt-bar-chart-title { font-size: 1rem; font-weight: 600; color: #212529; margin-bottom: 0.5rem; }
.kt-bar-chart-svg {
  display: block; max-width: 100%; height: auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.kt-chart-bars rect { transition: opacity 0.15s ease; }
.kt-chart-bars rect:hover { opacity: 0.8; }
/* グリッド・軸・凡例は line_chart の .kt-chart-* を共有 */
```

### エクスポート (`src/index.ts`)

```typescript
export { renderBarChart } from "./kt/chart/bar-chart";
export type { BarChartConfig, BarChartData, BarChartSeries, NormalizedBarChartData } from "./kt/chart/types";
```

### テスト（Red）

```typescript
describe("kt.bar_chart", () => {
  let ctx: RenderContext;

  beforeEach(() => {
    ctx = new RenderContext();
    setRenderContext(ctx);
  });

  afterEach(() => {
    setRenderContext(null);
  });

  it("renders chart HTML to context", () => {
    bar_chart([10, 20, 30]);
    const html = ctx.getHtml();
    expect(html).toContain("kt-bar-chart");
    expect(html).toContain("<svg");
  })

  it("renders Record<string, number> shorthand", () => {
    bar_chart({ React: 45, Vue: 30 });
    const html = ctx.getHtml();
    expect(html).toContain("<rect");
  })

  it("renders object array with config", () => {
    bar_chart(
      [{ month: "Jan", revenue: 100 }, { month: "Feb", revenue: 120 }],
      { x: "month", y: "revenue", title: "Revenue" }
    );
    const html = ctx.getHtml();
    expect(html).toContain("Revenue");
  })

  it("throws error without render context", () => {
    setRenderContext(null);
    expect(() => bar_chart([10, 20])).toThrow();
  })

  it("applies bar chart CSS class", () => {
    bar_chart([10, 20]);
    const html = ctx.getHtml();
    expect(html).toContain("kt-bar-chart");
  })
})
```

### 完了条件
```bash
bun run lint:fix && bun run ci  # PASS
git commit
```

---

## Iteration 9: エッジケース + バリデーション

### 目標
異常入力・境界値を安全に処理する。

### 対象ファイル

| ファイル | 操作 |
|---------|------|
| `src/kt/chart/bar-chart.ts` | 修正 |
| `tests/unit/kt/chart/bar-chart.test.ts` | 追加 |

### テスト（Red）

```typescript
describe("edge cases", () => {
  describe("empty and minimal data", () => {
    it("handles empty array []")
    it("handles empty object {}")
    it("handles single data point [42]")
    it("handles single key-value pair { A: 10 }")
  })

  describe("data validation", () => {
    it("limits data points to MAX_DATA_POINTS (10,000)")
    it("limits series to MAX_SERIES (20)")
    it("handles NaN values gracefully (treated as null)")
    it("handles Infinity values gracefully")
  })

  describe("color validation", () => {
    it("rejects javascript: in color parameter")
    it("rejects url() in color parameter")
    it("rejects expression() in color parameter")
    it("accepts valid hex, rgb, named colors")
  })

  describe("config edge cases", () => {
    it("handles height: 0 (uses default)")
    it("handles negative height (uses default)")
    it("handles non-existent x column (falls back to auto)")
    it("handles non-existent y column (empty series)")
  })
})
```

### 完了条件
```bash
bun run lint:fix && bun run ci  # PASS
git commit
```

---

## 最終チェックリスト

### 各イテレーション共通
- [ ] Red: テストを書く（失敗する）
- [ ] Green: 最小限の実装でテストを通す
- [ ] Refactor: コードを改善する
- [ ] `bun run lint:fix` PASS
- [ ] `bun run ci` PASS
- [ ] コミット（構造的変更と機能的変更を分離）

### 完了時
- [ ] `bun run ci` 全テストパス
- [ ] 全入力がエスケープされている（XSS防止）
- [ ] Streamlit互換APIになっている
- [ ] アクセシビリティ属性が正しく設定されている
- [ ] レスポンシブ表示が動作する（viewBox + width=100%）
- [ ] 単一シリーズが正しく描画される
- [ ] 複数シリーズ（グループ化）が正しく描画される
- [ ] 複数シリーズ（積み上げ）が正しく描画される
- [ ] 横向き表示が動作する
- [ ] ソートが動作する
- [ ] `number[]` ショートハンドが動作する
- [ ] `Record<string, number>` ショートハンドが動作する
- [ ] エッジケース（空データ、単一値、大量データ）が安全に処理される
- [ ] カラーバリデーションが動作する

---

## ファイル構成（最終）

```
src/
  kt/
    chart/
      types.ts              # 型定義（Iter 1）
      colors.ts             # カラーパレット・バリデーション（Iter 1）
      normalize.ts          # データ正規化（Iter 2）
      scale.ts              # 軸スケール計算（Iter 3）
      bar-chart.ts          # bar_chart 描画（Iter 4-7, 9）
    charts.ts               # kt.bar_chart() 追加（Iter 8）
    index.ts                # kt.bar_chart 登録（Iter 8）
  styles/
    default.ts              # CSS追加（Iter 8）
  index.ts                  # エクスポート追加（Iter 8）

tests/unit/
  kt/
    chart/
      types.test.ts         # Iter 1
      colors.test.ts        # Iter 1
      normalize.test.ts     # Iter 2
      scale.test.ts         # Iter 3
      bar-chart.test.ts     # Iter 4-7, 9
    bar-chart.test.ts       # Iter 8（統合テスト）
```
