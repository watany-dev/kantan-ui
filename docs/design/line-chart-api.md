# LineChart API 設計書

## 実装ステータス

> **✅ 実装完了** (2026-02-07)
>
> 純粋SVGによる折れ線グラフ描画を実装。数値配列、オブジェクト配列、2D配列、明示的カラム形式をサポート。

---

## 1. 概要

### 1.1 目的

Streamlit風の折れ線グラフ表示API `kt.line_chart()` をkantan-uiに実装する。データの時系列変化や数値比較を視覚的に表示するための基本チャートコンポーネント。

### 1.2 Streamlit互換性

```python
# Streamlit
import pandas as pd
import numpy as np

df = pd.DataFrame(np.random.randn(20, 3), columns=["a", "b", "c"])
st.line_chart(df)

# カラム指定
st.line_chart(df, x="a", y=["b", "c"], color=["#FF0000", "#0000FF"])
```

### 1.3 設計原則

| 原則 | 説明 |
|------|------|
| **ゼロ依存** | 外部チャートライブラリ不要。SVGで完結 |
| **サーバーサイド描画** | HTMLテンプレートとしてSVGを生成。クライアントJS不要 |
| **Streamlit互換データ形式** | `TableData`型を再利用し、既存のデータ正規化基盤を活用 |
| **段階的拡張** | 基本の折れ線グラフから始め、ツールチップ・インタラクションは後続イテレーションで追加 |
| **Web標準** | SVG + CSS のみ。Web標準APIを最大限活用 |

### 1.4 Streamlit との差分

| 項目 | Streamlit | kantan-ui | 理由 |
|------|-----------|-----------|------|
| 描画エンジン | Vega-Lite (Altair) | SVG (サーバーサイド生成) | ゼロ依存の方針 |
| データ形式 | Pandas DataFrame | `ChartData` (オブジェクト配列/2D配列) | TypeScriptネイティブ |
| ツールチップ | Vega-Lite組み込み | CSS + `<title>` (Phase 1) | 段階的実装 |
| アニメーション | Vega-Lite組み込み | なし (Phase 1) | 段階的実装 |
| ズーム/パン | Vega-Lite組み込み | なし (将来対応) | 優先度低 |
| `title` パラメータ | なし（`st.markdown`で代用） | あり | チャート単体での完結性 |

---

## 2. API設計

### 2.1 基本API

```typescript
// 最小限: 全列を自動プロット
kt.line_chart([
  { month: "Jan", revenue: 100, cost: 80 },
  { month: "Feb", revenue: 120, cost: 85 },
  { month: "Mar", revenue: 90, cost: 70 },
]);

// x/y 指定
kt.line_chart(data, { x: "month", y: "revenue" });

// 複数系列 + カスタム色
kt.line_chart(data, {
  x: "month",
  y: ["revenue", "cost"],
  color: ["#4e79a7", "#e15759"],
});

// サイズ・タイトル指定
kt.line_chart(data, {
  title: "Monthly Revenue",
  height: 300,
  x_label: "Month",
  y_label: "Amount ($)",
});

// 2D配列 (インデックスが自動的にx軸)
kt.line_chart([
  [10, 20, 15],
  [12, 18, 22],
  [8, 25, 19],
]);
```

### 2.2 シグネチャ

```typescript
function line_chart(data: ChartData, config?: LineChartConfig): void;
```

### 2.3 使用例

```typescript
import { kt } from "kantan-ui";

// 1. シンプルな折れ線グラフ
const salesData = [
  { month: "Jan", sales: 4000 },
  { month: "Feb", sales: 3000 },
  { month: "Mar", sales: 5000 },
  { month: "Apr", sales: 4500 },
  { month: "May", sales: 6000 },
];
kt.line_chart(salesData);

// 2. 複数系列の比較
const comparisonData = [
  { date: "2024-01", actual: 100, target: 90 },
  { date: "2024-02", actual: 120, target: 100 },
  { date: "2024-03", actual: 115, target: 110 },
  { date: "2024-04", actual: 130, target: 120 },
];
kt.line_chart(comparisonData, {
  x: "date",
  y: ["actual", "target"],
  color: ["#4e79a7", "#e15759"],
  title: "Actual vs Target",
  y_label: "Revenue ($)",
});

// 3. columnsレイアウトとの組み合わせ
kt.columns(2, (cols) => {
  cols[0](() => {
    kt.subheader("Revenue Trend");
    kt.line_chart(revenueData, { height: 250 });
  });
  cols[1](() => {
    kt.subheader("User Growth");
    kt.line_chart(userData, { height: 250, color: ["#59a14f"] });
  });
});

// 4. 数値のみの配列（インデックス自動生成）
kt.line_chart([
  [10, 20],
  [15, 25],
  [12, 30],
  [18, 22],
]);
```

---

## 3. 型定義

### 3.1 ChartData

`TableData` 型を再利用する。`data.ts` で既に定義済みの正規化基盤を活用。

```typescript
/**
 * チャートデータの型（TableDataと共通）
 */
export type ChartData =
  | Record<string, unknown>[]                // オブジェクト配列
  | unknown[][]                              // 2D配列
  | { columns: string[]; data: unknown[][] }; // 明示的な形式
```

### 3.2 LineChartConfig

```typescript
/**
 * kt.line_chart() の設定オプション
 */
export interface LineChartConfig {
  /**
   * x軸に使用するカラム名
   * 未指定の場合:
   * - オブジェクト配列: 最初のカラム
   * - 2D配列: 行インデックス (0, 1, 2, ...)
   */
  x?: string;

  /**
   * y軸に使用するカラム名（単一または複数）
   * 未指定の場合: x以外の全数値カラム
   */
  y?: string | string[];

  /**
   * 各系列の色
   * - string[]: 各系列に対応する色（HEX, CSS color name, rgb()）
   * - 系列数と色数が合わない場合はデフォルトパレットで補完
   */
  color?: string | string[];

  /**
   * チャートの高さ（px）
   * @default 400
   */
  height?: number;

  /**
   * チャートのタイトル
   */
  title?: string;

  /**
   * x軸のラベル
   */
  x_label?: string;

  /**
   * y軸のラベル
   */
  y_label?: string;
}
```

### 3.3 内部型

```typescript
/**
 * 正規化されたチャートデータ（内部用）
 */
interface NormalizedChartData {
  xValues: (string | number)[];   // x軸の値
  series: ChartSeries[];          // 各系列のデータ
}

/**
 * チャートの1系列（内部用）
 */
interface ChartSeries {
  name: string;                   // 系列名（凡例に表示）
  values: (number | null)[];      // y値の配列（nullは欠損）
  color: string;                  // 描画色
}

/**
 * SVG描画パラメータ（内部用）
 */
interface ChartLayout {
  width: number;
  height: number;
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  plotWidth: number;      // width - padding.left - padding.right
  plotHeight: number;     // height - padding.top - padding.bottom
}

/**
 * 軸のスケール情報（内部用）
 */
interface AxisScale {
  min: number;
  max: number;
  ticks: number[];        // 目盛りの値
  tickLabels: string[];   // 目盛りの表示テキスト
}
```

---

## 4. 描画方式: SVG

### 4.1 SVG を選択した理由

| 方式 | メリット | デメリット | 採用 |
|------|----------|------------|------|
| **SVG** | サーバーサイド生成可能、スケーラブル、アクセシブル | 大量データで性能低下 | **✅** |
| Canvas | 高性能描画 | クライアントJS必須、アクセシビリティ困難 | ❌ |
| 外部ライブラリ (Chart.js等) | 高機能 | 依存追加、ゼロ依存方針に反する | ❌ |
| CSSグリッド | 軽量 | 折れ線グラフの描画に不向き | ❌ |

### 4.2 HTML/SVG 構造

```html
<figure class="kt-line-chart" role="img" aria-label="Line chart: Monthly Revenue">
  <!-- タイトル -->
  <figcaption class="kt-line-chart-title">Monthly Revenue</figcaption>

  <svg viewBox="0 0 600 400" class="kt-line-chart-svg" xmlns="http://www.w3.org/2000/svg">
    <!-- アクセシビリティ用 -->
    <title>Monthly Revenue</title>
    <desc>Line chart showing revenue and cost trends over months</desc>

    <!-- グリッド線 -->
    <g class="kt-chart-grid">
      <line x1="60" y1="350" x2="580" y2="350" />
      <!-- ... -->
    </g>

    <!-- x軸 -->
    <g class="kt-chart-axis-x" transform="translate(0, 350)">
      <line x1="60" y1="0" x2="580" y2="0" />
      <text x="120" y="20" text-anchor="middle">Jan</text>
      <text x="240" y="20" text-anchor="middle">Feb</text>
      <!-- ... -->
    </g>

    <!-- y軸 -->
    <g class="kt-chart-axis-y" transform="translate(60, 0)">
      <line x1="0" y1="20" x2="0" y2="350" />
      <text x="-8" y="350" text-anchor="end">0</text>
      <text x="-8" y="267" text-anchor="end">25</text>
      <!-- ... -->
    </g>

    <!-- 軸ラベル -->
    <text class="kt-chart-x-label" x="320" y="390" text-anchor="middle">Month</text>
    <text class="kt-chart-y-label" x="15" y="185" text-anchor="middle"
          transform="rotate(-90, 15, 185)">Amount ($)</text>

    <!-- データ系列 -->
    <g class="kt-chart-series" data-series="revenue">
      <polyline
        points="120,100 240,80 360,150 480,120"
        fill="none"
        stroke="#4e79a7"
        stroke-width="2"
      />
      <!-- データポイント（ホバー用） -->
      <g class="kt-chart-points">
        <circle cx="120" cy="100" r="3" fill="#4e79a7">
          <title>Jan: 100</title>
        </circle>
        <circle cx="240" cy="80" r="3" fill="#4e79a7">
          <title>Feb: 120</title>
        </circle>
      </g>
    </g>

    <g class="kt-chart-series" data-series="cost">
      <polyline
        points="120,130 240,125 360,165 480,145"
        fill="none"
        stroke="#e15759"
        stroke-width="2"
      />
      <g class="kt-chart-points">
        <circle cx="120" cy="130" r="3" fill="#e15759">
          <title>Jan: 80</title>
        </circle>
        <!-- ... -->
      </g>
    </g>

    <!-- 凡例 -->
    <g class="kt-chart-legend" transform="translate(60, 10)">
      <rect x="0" y="0" width="10" height="10" fill="#4e79a7" />
      <text x="14" y="9" font-size="11">revenue</text>
      <rect x="80" y="0" width="10" height="10" fill="#e15759" />
      <text x="94" y="9" font-size="11">cost</text>
    </g>
  </svg>
</figure>
```

### 4.3 デフォルトカラーパレット

Tableau 10 ベースの視認性が高いパレットを採用:

```typescript
const DEFAULT_CHART_COLORS = [
  "#4e79a7",  // blue
  "#f28e2b",  // orange
  "#e15759",  // red
  "#76b7b2",  // teal
  "#59a14f",  // green
  "#edc948",  // yellow
  "#b07aa1",  // purple
  "#ff9da7",  // pink
  "#9c755f",  // brown
  "#bab0ac",  // gray
];
```

---

## 5. 実装詳細

### 5.1 データ正規化フロー

```
入力データ (ChartData)
  ↓
normalizeTableData() [data.ts の既存関数を再利用]
  ↓
{ headers: string[], rows: unknown[][] }
  ↓
normalizeChartData() [新規関数]
  ↓
{
  xValues: ["Jan", "Feb", "Mar", ...],
  series: [
    { name: "revenue", values: [100, 120, 90, ...], color: "#4e79a7" },
    { name: "cost", values: [80, 85, 70, ...], color: "#e15759" },
  ]
}
```

### 5.2 自動カラム判定ロジック

```typescript
function resolveColumns(
  headers: string[],
  rows: unknown[][],
  config?: LineChartConfig,
): { xColumn: string | null; yColumns: string[] } {
  // x が明示指定された場合
  if (config?.x) {
    const yColumns = config?.y
      ? (Array.isArray(config.y) ? config.y : [config.y])
      : headers.filter(h => h !== config.x && isNumericColumn(h, rows, headers));
    return { xColumn: config.x, yColumns };
  }

  // y が明示指定された場合
  if (config?.y) {
    const yColumns = Array.isArray(config.y) ? config.y : [config.y];
    // x は最初の非y列、またはインデックス
    const remaining = headers.filter(h => !yColumns.includes(h));
    return { xColumn: remaining[0] ?? null, yColumns };
  }

  // 自動判定: 最初のカラムをx、残り数値カラムをy
  if (headers.length >= 2) {
    const numericColumns = headers.filter((h, i) =>
      i > 0 && isNumericColumn(h, rows, headers)
    );
    if (numericColumns.length > 0) {
      return { xColumn: headers[0], yColumns: numericColumns };
    }
  }

  // フォールバック: 全カラムを数値として扱い、インデックスをx軸に
  const numericColumns = headers.filter(h => isNumericColumn(h, rows, headers));
  return { xColumn: null, yColumns: numericColumns };
}
```

### 5.3 軸スケールの計算

```typescript
function calculateAxisScale(values: number[]): AxisScale {
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);

  // Nice numbers アルゴリズムで見やすい目盛りを生成
  const range = niceNum(dataMax - dataMin, false);
  const tickSpacing = niceNum(range / 5, true);  // 約5-7本の目盛り
  const niceMin = Math.floor(dataMin / tickSpacing) * tickSpacing;
  const niceMax = Math.ceil(dataMax / tickSpacing) * tickSpacing;

  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + tickSpacing * 0.5; v += tickSpacing) {
    ticks.push(Math.round(v * 1e10) / 1e10); // 浮動小数点誤差対策
  }

  return { min: niceMin, max: niceMax, ticks, tickLabels: ticks.map(formatTickLabel) };
}

/**
 * Heckbert's "nice numbers" algorithm
 * 見やすい軸目盛りを計算するための標準的なアルゴリズム
 */
function niceNum(range: number, round: boolean): number {
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / 10 ** exponent;

  let niceFraction: number;
  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else {
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
  }

  return niceFraction * 10 ** exponent;
}
```

### 5.4 SVG座標変換

```typescript
function dataToSvg(
  dataX: number,    // データ空間のx値（インデックスまたは数値）
  dataY: number,    // データ空間のy値
  xScale: { min: number; max: number },
  yScale: { min: number; max: number },
  layout: ChartLayout,
): { x: number; y: number } {
  const x = layout.padding.left +
    ((dataX - xScale.min) / (xScale.max - xScale.min)) * layout.plotWidth;
  const y = layout.padding.top + layout.plotHeight -
    ((dataY - yScale.min) / (yScale.max - yScale.min)) * layout.plotHeight;
  return { x, y };
}
```

### 5.5 レスポンシブ対応

```typescript
// SVGは viewBox ベースで描画
// width="100%" で親コンテナに追従
const svgWidth = 600;  // viewBox 内の仮想幅（常に固定）
const svgHeight = config?.height ?? 400;

`<svg viewBox="0 0 ${svgWidth} ${svgHeight}"
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      class="kt-line-chart-svg">`;
```

---

## 6. CSS スタイル

```css
/* Chart container */
.kt-line-chart {
  margin: 0.5rem 0;
  padding: 0;
}

.kt-line-chart-title {
  font-size: 1rem;
  font-weight: 600;
  color: #212529;
  margin-bottom: 0.5rem;
}

/* SVG */
.kt-line-chart-svg {
  display: block;
  max-width: 100%;
  height: auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Grid */
.kt-chart-grid line {
  stroke: #e9ecef;
  stroke-width: 1;
}

/* Axes */
.kt-chart-axis-x line,
.kt-chart-axis-y line {
  stroke: #dee2e6;
  stroke-width: 1;
}

.kt-chart-axis-x text,
.kt-chart-axis-y text {
  fill: #6c757d;
  font-size: 11px;
}

/* Axis labels */
.kt-chart-x-label,
.kt-chart-y-label {
  fill: #495057;
  font-size: 12px;
  font-weight: 500;
}

/* Data lines */
.kt-chart-series polyline {
  fill: none;
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}

/* Data points */
.kt-chart-points circle {
  stroke: #fff;
  stroke-width: 1.5;
  transition: r 0.15s ease;
}

/* ホバー時のポイント拡大 */
.kt-chart-points circle:hover {
  r: 5;
  stroke-width: 2;
}

/* Legend */
.kt-chart-legend text {
  fill: #495057;
  font-size: 11px;
}
```

---

## 7. セキュリティ

### 7.1 XSS対策

すべてのユーザー入力を `escapeHtml()` でエスケープ:

```typescript
// タイトル、軸ラベル、カラム名（凡例テキスト）
const escapedTitle = config?.title ? escapeHtml(config.title) : "";
const escapedXLabel = config?.x_label ? escapeHtml(config.x_label) : "";
const escapedYLabel = config?.y_label ? escapeHtml(config.y_label) : "";

// 系列名
for (const series of chartData.series) {
  series.name = escapeHtml(series.name);
}

// x軸のラベル（文字列の場合）
for (const xVal of chartData.xValues) {
  if (typeof xVal === "string") escapeHtml(xVal);
}
```

### 7.2 色パラメータのバリデーション

```typescript
/**
 * CSS色値のバリデーション
 * インジェクション防止のため、安全な色フォーマットのみ許可
 */
function isValidColor(color: string): boolean {
  return /^(#[0-9a-fA-F]{3,8}|[a-zA-Z]+|rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)|rgba\(\d{1,3},\s*\d{1,3},\s*\d{1,3},\s*[\d.]+\))$/.test(color);
}
```

### 7.3 データ量の制限

```typescript
const CHART_LIMITS = {
  MAX_DATA_POINTS: 10_000,  // 最大データポイント数
  MAX_SERIES: 20,           // 最大系列数
};
```

---

## 8. アクセシビリティ

- `<figure>` + `<figcaption>` でセマンティックな構造
- `role="img"` + `aria-label` でスクリーンリーダー対応
- SVG `<title>` + `<desc>` でチャートの説明
- 各データポイントの `<title>` でツールチップ兼読み上げ対応
- カラーパレットはコントラスト比を考慮した配色

---

## 9. ファイル構成

```
src/
  widgets/
    line-chart.ts           # メインのline_chart()関数 + SVG描画
  kt/
    chart/
      shared.ts             # 共通前処理（prepareChartData, sanitizeConfig等）
      render-utils.ts       # グリッド・軸・凡例の共通描画
      normalize.ts          # データ正規化
      scale.ts              # 軸スケール計算（niceScale + calculateAxisScale）
      colors.ts             # カラーパレット・バリデーション
      types.ts              # 型定義（BaseChartConfig, NormalizeConfig等）
    index.ts                # kt.line_chart を追加
  styles/
    default.ts              # chartStyles を追加
```

> **注**: `niceScale()` は `src/kt/chart/scale.ts` に統合済み。`line-chart.ts` は `scale.ts` の `niceScale` と `formatTickValue`、`colors.ts` の `resolveChartColors` を import して使用。

---

## 10. イテレーション計画

### Iteration 1: 型定義とデータ正規化

**目標**: データを受け取り、チャート用に正規化する基盤

**Red（テスト）**:
```typescript
describe("normalizeChartData", () => {
  it("normalizes object array with auto column detection", () => {
    const data = [
      { month: "Jan", revenue: 100, cost: 80 },
      { month: "Feb", revenue: 120, cost: 85 },
    ];
    const result = normalizeChartData(data);
    expect(result.xValues).toEqual(["Jan", "Feb"]);
    expect(result.series).toHaveLength(2);
    expect(result.series[0].name).toBe("revenue");
    expect(result.series[0].values).toEqual([100, 120]);
  });

  it("normalizes 2D array with index as x", () => {
    const data = [[10, 20], [15, 25]];
    const result = normalizeChartData(data);
    expect(result.xValues).toEqual([0, 1]);
    expect(result.series).toHaveLength(2);
  });

  it("respects explicit x and y config", () => {
    const data = [
      { a: 1, b: 10, c: 20 },
      { a: 2, b: 15, c: 25 },
    ];
    const result = normalizeChartData(data, { x: "a", y: "b" });
    expect(result.xValues).toEqual([1, 2]);
    expect(result.series).toHaveLength(1);
    expect(result.series[0].name).toBe("b");
  });
});
```

**Green（実装）**:
- `src/kt/chart/types.ts` - 型定義
- `src/kt/chart/colors.ts` - カラーパレット
- `src/kt/chart/normalize.ts` - データ正規化

**成果物**: データ正規化基盤

---

### Iteration 2: 軸スケール計算

**目標**: nice numbers アルゴリズムで見やすい軸目盛りを生成

**Red（テスト）**:
```typescript
describe("calculateAxisScale", () => {
  it("generates nice ticks for simple range", () => {
    const scale = calculateAxisScale([0, 100]);
    expect(scale.min).toBe(0);
    expect(scale.max).toBe(100);
    expect(scale.ticks).toEqual([0, 20, 40, 60, 80, 100]);
  });

  it("handles negative values", () => {
    const scale = calculateAxisScale([-50, 50]);
    expect(scale.min).toBeLessThanOrEqual(-50);
    expect(scale.max).toBeGreaterThanOrEqual(50);
  });

  it("handles single value", () => {
    const scale = calculateAxisScale([42, 42]);
    expect(scale.min).toBeLessThan(42);
    expect(scale.max).toBeGreaterThan(42);
  });
});
```

**Green（実装）**:
- `src/kt/chart/scale.ts` - Heckbert's nice numbers + スケール計算

**成果物**: 軸スケール計算

---

### Iteration 3: SVGレンダリング（基本）

**目標**: グリッド、軸、折れ線を含む基本SVG出力

**Red（テスト）**:
```typescript
describe("renderLineChartSvg", () => {
  it("generates valid SVG with polyline", () => {
    const chartData = {
      xValues: ["Jan", "Feb", "Mar"],
      series: [{
        name: "revenue",
        values: [100, 120, 90],
        color: "#4e79a7",
      }],
    };
    const svg = renderLineChartSvg(chartData);
    expect(svg).toContain("<svg");
    expect(svg).toContain("polyline");
    expect(svg).toContain("#4e79a7");
  });

  it("renders multiple series", () => {
    const chartData = {
      xValues: [0, 1, 2],
      series: [
        { name: "a", values: [10, 20, 15], color: "#4e79a7" },
        { name: "b", values: [5, 15, 25], color: "#e15759" },
      ],
    };
    const svg = renderLineChartSvg(chartData);
    expect(svg).toContain('data-series="a"');
    expect(svg).toContain('data-series="b"');
  });
});
```

**Green（実装）**:
- `src/kt/chart/svg-renderer.ts` - SVGレンダリング

**成果物**: 基本SVG出力

---

### Iteration 4: line_chart 関数統合

**目標**: `kt.line_chart()` として使える完全な関数

**Red（テスト）**:
```typescript
describe("kt.line_chart", () => {
  it("renders chart HTML to context", () => {
    const ctx = new RenderContext();
    setRenderContext(ctx);

    line_chart([
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ]);

    const html = ctx.getHtml();
    expect(html).toContain("kt-line-chart");
    expect(html).toContain("<svg");
  });

  it("renders with title", () => {
    line_chart(data, { title: "My Chart" });
    expect(ctx.getHtml()).toContain("My Chart");
  });

  it("escapes title for XSS prevention", () => {
    line_chart(data, { title: "<script>alert(1)</script>" });
    expect(ctx.getHtml()).not.toContain("<script>");
  });

  it("validates color parameter", () => {
    expect(() => {
      line_chart(data, { color: ["url(javascript:alert(1))"] });
    }).toThrow();
  });
});
```

**Green（実装）**:
- `src/kt/chart/line-chart.ts` - メイン関数
- `src/kt/index.ts` への統合

**成果物**: 動作する `kt.line_chart()`

---

### Iteration 5: CSS・凡例・ツールチップ

**目標**: スタイル、凡例（複数系列時）、ホバーツールチップ

**作業内容**:
- `src/styles/default.ts` に `chartStyles` 追加
- 凡例のSVG描画
- `<title>` 要素によるネイティブツールチップ
- ホバー時のデータポイント拡大（CSS）

**成果物**: 見た目の完成した折れ線グラフ

---

### Iteration 6: エッジケース・バリデーション

**目標**: 堅牢性の確保

**Red（テスト）**:
```typescript
describe("edge cases", () => {
  it("handles empty data", () => {
    line_chart([]);
    expect(ctx.getHtml()).toContain("kt-line-chart");
    // 空チャートまたはメッセージ表示
  });

  it("handles single data point", () => {
    line_chart([{ x: 1, y: 10 }]);
    // ポイントのみ表示
  });

  it("handles null/NaN values in series", () => {
    line_chart([
      { x: 1, y: 10 },
      { x: 2, y: null },
      { x: 3, y: 30 },
    ]);
    // null部分で線が途切れる
  });

  it("limits data points to MAX_DATA_POINTS", () => {
    const largeData = Array.from({ length: 20000 }, (_, i) => ({ x: i, y: i }));
    // エラーまたはダウンサンプリング
  });
});
```

**成果物**: 堅牢な折れ線グラフ

---

## 11. 将来の拡張

以下は Phase 1 では実装せず、将来のイテレーションで対応:

| 機能 | 説明 | 優先度 |
|------|------|--------|
| `kt.area_chart()` | エリアチャート（line_chart の fill 版） | P1 |
| `kt.bar_chart()` | 棒グラフ | P1 |
| `kt.scatter_chart()` | 散布図 | P2 |
| CSSアニメーション | 線の描画アニメーション（stroke-dasharray） | P2 |
| インタラクティブツールチップ | CSS/JSによるリッチなツールチップ | P2 |
| ダークモード対応 | CSS変数によるテーマ切り替え | P2 |
| 日付軸の自動検出 | Date文字列の自動パースと等間隔配置 | P2 |
| ログスケール | 対数スケール対応 | P3 |

---

## 12. チェックリスト

### 実装前
- [ ] 既存 `data.ts` の `normalizeTableData` パターン確認
- [ ] CSS変数の命名規則確認
- [ ] SVG生成時のエスケープ方針確認

### 各イテレーション後
- [ ] `bun run lint:fix`
- [ ] `bun run test`
- [ ] コミット

### 完了時
- [ ] `bun run ci` 全パス
- [ ] 全入力がエスケープされている
- [ ] Streamlit互換APIになっている
- [ ] アクセシビリティ属性が正しく設定されている
- [ ] レスポンシブ表示が動作する
- [ ] 複数系列のチャートが正しく描画される

---

## 13. 参考資料

- [Streamlit st.line_chart](https://docs.streamlit.io/develop/api-reference/charts/st.line_chart)
- [SVG polyline](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/polyline)
- [Heckbert's Nice Numbers Algorithm](https://www.semanticscholar.org/paper/A-simple-linear-time-algorithm-for-computing-the-Talbot-Lin/5b8d92fd52da72d0ecbf6e2ffb6cef56e9bafae7)
- [Tableau 10 Color Palette](https://www.tableau.com/blog/colors-upgrade-702)
- 既存実装: `src/kt/data.ts`, `src/kt/metric.ts`
