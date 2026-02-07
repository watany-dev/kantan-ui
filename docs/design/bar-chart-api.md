# BarChart API 設計書

## 実装ステータス

> **❌ 未実装**
>
> 設計完了。実装待ち。

---

## 1. 概要

### 1.1 目的

Streamlit風の棒グラフ表示API `kt.bar_chart()` をkantan-uiに実装する。カテゴリ別の数値比較を視覚的に表示するための基本チャートコンポーネント。

### 1.2 Streamlit互換性

```python
# Streamlit
import pandas as pd
import numpy as np

df = pd.DataFrame(np.random.randn(20, 3), columns=["a", "b", "c"])
st.bar_chart(df)

# カラム指定
st.bar_chart(df, x="category", y=["value1", "value2"], color=["#FF0000", "#0000FF"])

# 横向き・ソート
st.bar_chart(df, x="name", y="score", horizontal=True, sort="descending")
```

### 1.3 設計原則

| 原則 | 説明 |
|------|------|
| **ゼロ依存** | 外部チャートライブラリ不要。SVGで完結 |
| **サーバーサイド描画** | HTMLテンプレートとしてSVGを生成。クライアントJS不要 |
| **Streamlit互換データ形式** | `ChartData`型を再利用し、既存のデータ正規化基盤を活用 |
| **段階的な複雑さ** | 1引数で動作し、configで段階的に拡張可能 |
| **Web標準** | SVG + CSS のみ |

### 1.4 Streamlit との差分

| 項目 | Streamlit | kantan-ui | 理由 |
|------|-----------|-----------|------|
| 描画エンジン | Vega-Lite (Altair) | SVG (サーバーサイド生成) | ゼロ依存の方針 |
| データ形式 | Pandas DataFrame | `BarChartData` (配列/オブジェクト) | TypeScriptネイティブ |
| `color` カラム指定 | 対応（long format） | 非対応（配列のみ） | 初期版はシンプルに |
| `width` / `useContainerWidth` | 両方対応 | コンテナ幅追従のみ | SVG viewBoxで十分 |
| ツールチップ | Vega-Lite組み込み | なし | 初期版はstatic SVG |
| 負の値 | 対応 | 基本対応のみ | 初期版はシンプルに |

### 1.5 line_chart との共有基盤

`kt.line_chart()` 設計書（`line-chart-api.md`）で定義されたチャート基盤を共有する:

| モジュール | 役割 | 共有 |
|-----------|------|------|
| `src/kt/chart/types.ts` | 型定義 | 共通型 + bar固有型 |
| `src/kt/chart/colors.ts` | カラーパレット・バリデーション | 完全共有 |
| `src/kt/chart/normalize.ts` | データ正規化 | 完全共有 |
| `src/kt/chart/scale.ts` | 軸スケール計算 | 完全共有 |
| `src/kt/chart/bar-chart.ts` | バーチャート描画 | **bar固有** |

---

## 2. API設計

### 2.1 シグネチャ

```typescript
function bar_chart(data: BarChartData, config?: BarChartConfig): void;
```

### 2.2 データ型

```typescript
/**
 * バーチャートのデータ型
 * ChartData（line_chartと共通）に加え、便利なショートハンド形式をサポート
 */
type BarChartData =
  | number[]                                    // (1) 単純な値配列
  | Record<string, number>                      // (2) key-valueマップ
  | Record<string, unknown>[]                   // (3) オブジェクト配列
  | unknown[][]                                 // (4) 2D配列
  | { columns: string[]; data: unknown[][] };   // (5) 明示的形式
```

`number[]` と `Record<string, number>` はバーチャート固有のショートハンド。棒グラフは「カテゴリ:値」のペアが最も一般的な入力パターンであるため、最小限の記述で利用可能にする。

### 2.3 Config

```typescript
/**
 * kt.bar_chart() の設定オプション
 */
export interface BarChartConfig {
  /**
   * x軸に使用するカラム名
   * 未指定の場合:
   * - オブジェクト配列: 最初のカラム
   * - 2D配列: 行インデックス (0, 1, 2, ...)
   * - number[]: インデックス (0, 1, 2, ...)
   * - Record<string, number>: キー
   */
  x?: string;

  /**
   * y軸に使用するカラム名（単一または複数）
   * 未指定の場合: x以外の全数値カラム
   */
  y?: string | string[];

  /**
   * x軸のラベル
   */
  x_label?: string;

  /**
   * y軸のラベル
   */
  y_label?: string;

  /**
   * 各系列の色
   * - string: 全系列に同じ色
   * - string[]: 各系列に対応する色（HEX, CSS color name, rgb()）
   * - 系列数と色数が合わない場合はデフォルトパレットで補完
   */
  color?: string | string[];

  /**
   * 積み上げ表示
   * @default true
   */
  stack?: boolean;

  /**
   * 横向きバー
   * @default false
   */
  horizontal?: boolean;

  /**
   * バーのソート順
   * - "ascending": 値の昇順
   * - "descending": 値の降順
   * - 未指定: データの元順序を維持
   *
   * 複数系列の場合は最初の系列の値でソート
   */
  sort?: "ascending" | "descending";

  /**
   * チャートの高さ（px）
   * @default 400
   */
  height?: number;

  /**
   * チャートのタイトル
   */
  title?: string;
}
```

### 2.4 使用例

```typescript
import { kt } from "kantan-ui";

// ===== Level 1: 最小構成 =====
kt.bar_chart([10, 20, 30, 25, 15])

// ===== Level 2: ラベル付き =====
kt.bar_chart({ "React": 45, "Vue": 30, "Svelte": 15, "Angular": 10 })

// ===== Level 3: オブジェクト配列 + x/y指定 =====
kt.bar_chart(
  [
    { month: "Jan", revenue: 100 },
    { month: "Feb", revenue: 120 },
    { month: "Mar", revenue: 90 },
  ],
  { x: "month", y: "revenue" }
)

// ===== Level 4: 複数シリーズ（グループ化） =====
kt.bar_chart(
  [
    { month: "Jan", revenue: 100, cost: 60 },
    { month: "Feb", revenue: 120, cost: 70 },
    { month: "Mar", revenue: 90,  cost: 55 },
  ],
  {
    x: "month",
    y: ["revenue", "cost"],
    color: ["#4e79a7", "#e15759"],
    stack: false,
  }
)

// ===== Level 5: ソート =====
kt.bar_chart(
  { "React": 45, "Vue": 30, "Svelte": 15, "Angular": 10 },
  { sort: "descending" }
)

// ===== Level 6: 積み上げ + 横向き + ラベル =====
kt.bar_chart(salesData, {
  x: "region",
  y: ["Q1", "Q2", "Q3", "Q4"],
  stack: true,
  horizontal: true,
  x_label: "地域",
  y_label: "売上（万円）",
  height: 500,
})
```

---

## 3. 型定義

### 3.1 ChartData（共通型）

`line-chart-api.md` で定義された共通型を再利用:

```typescript
export type ChartData =
  | Record<string, unknown>[]
  | unknown[][]
  | { columns: string[]; data: unknown[][] };
```

### 3.2 BarChartData（拡張型）

```typescript
/**
 * バーチャート固有のショートハンド形式を含むデータ型
 */
export type BarChartData = number[] | Record<string, number> | ChartData;
```

### 3.3 内部型

```typescript
/**
 * 正規化されたチャートデータ（内部用、line_chartと共有）
 */
interface NormalizedChartData {
  xValues: (string | number)[];
  series: ChartSeries[];
}

interface ChartSeries {
  name: string;
  values: (number | null)[];
  color: string;
}
```

---

## 4. データ正規化ルール

### 4.1 ショートハンド形式の正規化

`number[]` と `Record<string, number>` は bar_chart のエントリポイントで `ChartData` に変換してから共通の正規化パイプラインに渡す:

```typescript
function normalizeBarChartInput(data: BarChartData): ChartData {
  // number[] → オブジェクト配列
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "number") {
    return (data as number[]).map((v, i) => ({ category: String(i), value: v }));
  }

  // Record<string, number> → オブジェクト配列
  if (!Array.isArray(data) && !("columns" in data)) {
    return Object.entries(data as Record<string, number>).map(
      ([k, v]) => ({ category: k, value: v })
    );
  }

  return data as ChartData;
}
```

### 4.2 カラム自動判定

共通の `resolveColumns()` を利用（`line-chart-api.md` セクション 5.2 参照）。

### 4.3 ソート

正規化後、`sort` 指定があればカテゴリを値順に並び替え:

```typescript
function applySortOrder(
  data: NormalizedChartData,
  sort?: "ascending" | "descending",
): NormalizedChartData {
  if (!sort || data.series.length === 0) return data;

  const primaryValues = data.series[0].values;
  const indices = data.xValues.map((_, i) => i);

  indices.sort((a, b) => {
    const va = primaryValues[a] ?? 0;
    const vb = primaryValues[b] ?? 0;
    return sort === "ascending" ? va - vb : vb - va;
  });

  return {
    xValues: indices.map(i => data.xValues[i]),
    series: data.series.map(s => ({
      ...s,
      values: indices.map(i => s.values[i]),
    })),
  };
}
```

---

## 5. 描画方式: SVG

### 5.1 HTML/SVG 構造

```html
<figure class="kt-bar-chart" role="img" aria-label="Bar chart: Sales by Region">
  <figcaption class="kt-bar-chart-title">Sales by Region</figcaption>

  <svg viewBox="0 0 600 400" width="100%"
       preserveAspectRatio="xMidYMid meet"
       class="kt-bar-chart-svg"
       xmlns="http://www.w3.org/2000/svg">

    <title>Sales by Region</title>
    <desc>Bar chart showing sales data by region</desc>

    <!-- グリッド線 -->
    <g class="kt-chart-grid">
      <line x1="60" y1="50" x2="580" y2="50" />
      <line x1="60" y1="125" x2="580" y2="125" />
      <!-- ... -->
    </g>

    <!-- x軸 -->
    <g class="kt-chart-axis-x" transform="translate(0, 350)">
      <line x1="60" y1="0" x2="580" y2="0" />
      <text x="150" y="20" text-anchor="middle">Jan</text>
      <text x="320" y="20" text-anchor="middle">Feb</text>
      <text x="490" y="20" text-anchor="middle">Mar</text>
    </g>

    <!-- y軸 -->
    <g class="kt-chart-axis-y" transform="translate(60, 0)">
      <line x1="0" y1="20" x2="0" y2="350" />
      <text x="-8" y="350" text-anchor="end">0</text>
      <text x="-8" y="200" text-anchor="end">50</text>
      <text x="-8" y="50" text-anchor="end">100</text>
    </g>

    <!-- 軸ラベル -->
    <text class="kt-chart-x-label" x="320" y="390" text-anchor="middle">地域</text>
    <text class="kt-chart-y-label" x="15" y="185" text-anchor="middle"
          transform="rotate(-90, 15, 185)">売上</text>

    <!-- バー（単一シリーズ） -->
    <g class="kt-chart-bars" data-series="revenue">
      <rect x="110" y="100" width="80" height="250" fill="#4e79a7" rx="2" />
      <rect x="280" y="60"  width="80" height="290" fill="#4e79a7" rx="2" />
      <rect x="450" y="140" width="80" height="210" fill="#4e79a7" rx="2" />
    </g>

    <!-- 凡例（複数シリーズ時のみ） -->
    <g class="kt-chart-legend" transform="translate(60, 10)">
      <rect x="0" y="0" width="10" height="10" fill="#4e79a7" />
      <text x="14" y="9" font-size="11">revenue</text>
      <rect x="80" y="0" width="10" height="10" fill="#e15759" />
      <text x="94" y="9" font-size="11">cost</text>
    </g>
  </svg>
</figure>
```

### 5.2 バーレイアウトの計算

#### グループ化（stack: false）

```
カテゴリ幅 = plotWidth / カテゴリ数
グループ幅 = カテゴリ幅 * 0.8  （左右10%ずつ余白）
バー幅    = グループ幅 / シリーズ数
```

```
|  カテゴリ幅  |  カテゴリ幅  |
| 余白|[A][B]|余白 | 余白|[A][B]|余白 |
```

#### 積み上げ（stack: true）

```
カテゴリ幅 = plotWidth / カテゴリ数
バー幅    = カテゴリ幅 * 0.6
```

```
|  カテゴリ幅  |  カテゴリ幅  |
| 余白|[A+B]|余白 | 余白|[A+B]|余白 |
```

各シリーズの `y` 位置は前のシリーズの上端から開始。

### 5.3 横向き（horizontal: true）

横向きの場合、x軸とy軸の役割が入れ替わる:
- カテゴリがy軸（上から下）に配置
- 値がx軸（左から右）に配置
- `<rect>` のx/y/width/heightが入れ替わる

### 5.4 デフォルトカラーパレット

line_chart と共有（Tableau 10 ベース）:

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

### 5.5 レスポンシブ対応

```typescript
const svgWidth = 600;  // viewBox内の仮想幅（固定）
const svgHeight = config?.height ?? 400;

`<svg viewBox="0 0 ${svgWidth} ${svgHeight}"
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      class="kt-bar-chart-svg">`;
```

---

## 6. CSS スタイル

```css
/* Chart container */
.kt-bar-chart {
  margin: 0.5rem 0;
  padding: 0;
}

.kt-bar-chart-title {
  font-size: 1rem;
  font-weight: 600;
  color: #212529;
  margin-bottom: 0.5rem;
}

/* SVG */
.kt-bar-chart-svg {
  display: block;
  max-width: 100%;
  height: auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Grid - kt-chart-grid は line_chart と共有 */

/* Bars */
.kt-chart-bars rect {
  transition: opacity 0.15s ease;
}

.kt-chart-bars rect:hover {
  opacity: 0.8;
}
```

グリッド線、軸、軸ラベル、凡例のCSSは `line-chart-api.md` セクション6と完全共有（`.kt-chart-*` クラス名）。

---

## 7. セキュリティ

line_chart と同じ方針（`line-chart-api.md` セクション7参照）:

- すべてのユーザー入力（タイトル、軸ラベル、カラム名）を `escapeHtml()` でエスケープ
- 色パラメータは `isValidColor()` でバリデーション
- データ量の制限: `MAX_DATA_POINTS: 10_000`, `MAX_SERIES: 20`

---

## 8. アクセシビリティ

- `<figure>` + `<figcaption>` でセマンティックな構造
- `role="img"` + `aria-label` でスクリーンリーダー対応
- SVG `<title>` + `<desc>` でチャートの説明
- カラーパレットはコントラスト比を考慮した配色

---

## 9. ファイル構成

```
src/
  kt/
    chart/
      bar-chart.ts          # bar_chart() メイン関数 + SVG描画
      normalize.ts          # データ正規化（line_chartと共有）
      scale.ts              # 軸スケール計算（line_chartと共有）
      colors.ts             # カラーパレット・バリデーション（共有）
      types.ts              # 型定義（共通型 + bar固有型）
    index.ts                # kt.bar_chart を追加
  styles/
    default.ts              # chartStyles を追加（共有 + bar固有）
```

---

## 10. イテレーション計画

line_chart の chart 基盤が未実装のため、共有基盤の構築から開始する。

### Iteration 1: 型定義・カラーパレット・データ正規化（共通基盤）

**目標**: チャート共通のデータ正規化基盤を構築

**対象ファイル**:
- `src/kt/chart/types.ts`
- `src/kt/chart/colors.ts`
- `src/kt/chart/normalize.ts`

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
  });

  it("normalizes 2D array with index as x", () => {
    const data = [[10, 20], [15, 25]];
    const result = normalizeChartData(data);
    expect(result.xValues).toEqual([0, 1]);
  });

  it("respects explicit x and y config", () => {
    const data = [
      { a: 1, b: 10, c: 20 },
      { a: 2, b: 15, c: 25 },
    ];
    const result = normalizeChartData(data, { x: "a", y: "b" });
    expect(result.series).toHaveLength(1);
    expect(result.series[0].name).toBe("b");
  });
});
```

### Iteration 2: 軸スケール計算（共通基盤）

**目標**: nice numbers アルゴリズムで見やすい軸目盛りを生成

**対象ファイル**:
- `src/kt/chart/scale.ts`

**Red（テスト）**:
```typescript
describe("calculateAxisScale", () => {
  it("generates nice ticks for simple range", () => {
    const scale = calculateAxisScale([0, 100]);
    expect(scale.min).toBe(0);
    expect(scale.max).toBe(100);
    expect(scale.ticks).toEqual([0, 20, 40, 60, 80, 100]);
  });

  it("handles single value", () => {
    const scale = calculateAxisScale([42, 42]);
    expect(scale.min).toBeLessThan(42);
    expect(scale.max).toBeGreaterThan(42);
  });
});
```

### Iteration 3: BarChart ショートハンド正規化 + ソート

**目標**: `number[]`, `Record<string, number>` の変換とソート機能

**対象ファイル**:
- `src/kt/chart/bar-chart.ts`（正規化部分）

**Red（テスト）**:
```typescript
describe("normalizeBarChartInput", () => {
  it("normalizes number[] to ChartData", () => {
    const result = normalizeBarChartInput([10, 20, 30]);
    expect(result).toEqual([
      { category: "0", value: 10 },
      { category: "1", value: 20 },
      { category: "2", value: 30 },
    ]);
  });

  it("normalizes Record<string, number> to ChartData", () => {
    const result = normalizeBarChartInput({ "A": 10, "B": 20 });
    expect(result).toEqual([
      { category: "A", value: 10 },
      { category: "B", value: 20 },
    ]);
  });
});

describe("applySortOrder", () => {
  it("sorts descending by first series values", () => {
    const data = {
      xValues: ["A", "B", "C"],
      series: [{ name: "v", values: [30, 10, 20], color: "#000" }],
    };
    const sorted = applySortOrder(data, "descending");
    expect(sorted.xValues).toEqual(["A", "C", "B"]);
    expect(sorted.series[0].values).toEqual([30, 20, 10]);
  });
});
```

### Iteration 4: SVGレンダリング（基本 - 単一シリーズ縦棒）

**目標**: 単一シリーズの縦棒グラフSVG出力

**対象ファイル**:
- `src/kt/chart/bar-chart.ts`（描画部分）

**Red（テスト）**:
```typescript
describe("renderBarChartSvg", () => {
  it("generates valid SVG with rect elements", () => {
    const chartData = {
      xValues: ["Jan", "Feb", "Mar"],
      series: [{ name: "revenue", values: [100, 120, 90], color: "#4e79a7" }],
    };
    const svg = renderBarChartSvg(chartData, {});
    expect(svg).toContain("<svg");
    expect(svg).toContain("<rect");
    expect(svg).toContain("#4e79a7");
  });

  it("escapes title for XSS prevention", () => {
    const svg = renderBarChartSvg(chartData, {
      title: "<script>alert(1)</script>",
    });
    expect(svg).not.toContain("<script>");
  });
});
```

### Iteration 5: 複数シリーズ（グループ化 + 積み上げ）

**目標**: 複数シリーズのグループ化と積み上げ表示

**Red（テスト）**:
```typescript
describe("multi-series bar chart", () => {
  it("renders grouped bars (stack: false)", () => {
    const chartData = {
      xValues: ["A", "B"],
      series: [
        { name: "s1", values: [10, 20], color: "#4e79a7" },
        { name: "s2", values: [15, 25], color: "#e15759" },
      ],
    };
    const svg = renderBarChartSvg(chartData, { stack: false });
    expect(svg).toContain('data-series="s1"');
    expect(svg).toContain('data-series="s2"');
    // 各シリーズのバーが横並び
  });

  it("renders stacked bars (stack: true)", () => {
    const svg = renderBarChartSvg(chartData, { stack: true });
    // 各シリーズのバーが縦に積み上がる
  });

  it("renders legend for multi-series", () => {
    const svg = renderBarChartSvg(multiSeriesData, {});
    expect(svg).toContain("kt-chart-legend");
  });
});
```

### Iteration 6: 横向き（horizontal）

**目標**: 横向きバーチャート

**Red（テスト）**:
```typescript
describe("horizontal bar chart", () => {
  it("renders horizontal bars", () => {
    const svg = renderBarChartSvg(chartData, { horizontal: true });
    // カテゴリがy軸、値がx軸
  });
});
```

### Iteration 7: kt.bar_chart 統合 + CSS

**目標**: `kt.bar_chart()` として使える完全な関数とスタイル

**対象ファイル**:
- `src/kt/chart/bar-chart.ts`（メイン関数）
- `src/kt/index.ts`
- `src/styles/default.ts`

**Red（テスト）**:
```typescript
describe("kt.bar_chart", () => {
  it("renders chart HTML to context", () => {
    const ctx = new RenderContext();
    setRenderContext(ctx);
    bar_chart([10, 20, 30]);
    const html = ctx.getHtml();
    expect(html).toContain("kt-bar-chart");
    expect(html).toContain("<svg");
  });
});
```

### Iteration 8: エッジケース

**Red（テスト）**:
```typescript
describe("edge cases", () => {
  it("handles empty data", () => {
    bar_chart([]);
    // 空チャートまたはメッセージ表示
  });

  it("handles single data point", () => {
    bar_chart([42]);
  });

  it("validates color parameter", () => {
    expect(() => {
      bar_chart([1, 2], { color: ["url(javascript:alert(1))"] });
    }).toThrow();
  });

  it("limits data points to MAX_DATA_POINTS", () => {
    const large = Array.from({ length: 20000 }, (_, i) => i);
    // エラーまたは制限
  });
});
```

---

## 11. 決定事項（議論結果）

| 項目 | 決定 | 理由 |
|------|------|------|
| `color` カラム方式 | 非対応（配列のみ） | 初期版シンプルに |
| `width` / `useContainerWidth` | コンテナ幅追従のみ | SVG viewBoxで十分 |
| ツールチップ | なし（static SVG） | 初期版シンプルに |
| `sort` パラメータ | **含める** | ユーザー要望 |
| 負の値 | 基本対応のみ | 初期版シンプルに |

---

## 12. チェックリスト

### 実装前
- [ ] line_chart と共有する chart 基盤のファイル構成確認
- [ ] 既存 `data.ts` の `normalizeTableData` パターン確認

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
- [ ] 単一シリーズ・複数シリーズ（グループ/積み上げ）が正しく描画される
- [ ] 横向き表示が動作する
- [ ] ソートが動作する
- [ ] `number[]` / `Record<string, number>` ショートハンドが動作する

---

## 13. 参考資料

- [Streamlit st.bar_chart](https://docs.streamlit.io/develop/api-reference/charts/st.bar_chart)
- [SVG rect](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/rect)
- [Tableau 10 Color Palette](https://www.tableau.com/blog/colors-upgrade-702)
- 既存設計: `docs/design/line-chart-api.md`
- 既存実装: `src/kt/data.ts`, `src/kt/metric.ts`
