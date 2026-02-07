# AreaChart API 設計書

## 実装ステータス

> **📋 設計完了・未実装**
>
> API設計書のレビュー待ち。

---

## 1. 概要

### 1.1 目的

Streamlit風のエリアチャート表示API `kt.area_chart()` をkantan-uiに実装する。折れ線グラフの下部を塗りつぶすことで、量の変化や累積値を視覚的に強調するチャートコンポーネント。

### 1.2 Streamlit互換性

```python
# Streamlit
import pandas as pd
import numpy as np

df = pd.DataFrame(np.random.randn(20, 3), columns=["a", "b", "c"])
st.area_chart(df)

# カラム指定
st.area_chart(df, x="date", y=["revenue", "cost"], color=["#FF000080", "#0000FF80"])
```

### 1.3 設計原則

| 原則 | 説明 |
|------|------|
| **ゼロ依存** | 外部チャートライブラリ不要。SVGで完結 |
| **サーバーサイド描画** | HTMLテンプレートとしてSVGを生成。クライアントJS不要 |
| **line_chart基盤の再利用** | 折れ線グラフのレンダリング基盤を拡張し、塗りつぶしを追加 |
| **段階的な複雑さ** | 1引数で動作し、configで段階的に拡張可能 |
| **Web標準** | SVG + CSS のみ |

### 1.4 Streamlit との差分

| 項目 | Streamlit | kantan-ui | 理由 |
|------|-----------|-----------|------|
| 描画エンジン | Vega-Lite (Altair) | SVG (サーバーサイド生成) | ゼロ依存の方針 |
| データ形式 | Pandas DataFrame | `ChartData` (配列/オブジェクト) | TypeScriptネイティブ |
| デフォルト積み上げ | なし（重ね表示） | なし（重ね表示） | Streamlit互換 |
| 透明度 | ユーザーが色にalpha指定 | デフォルトで半透明fill | エリアチャートの可読性 |
| `width` / `useContainerWidth` | 両方対応 | コンテナ幅追従のみ | SVG viewBoxで十分 |
| ツールチップ | Vega-Lite組み込み | CSS `<title>` (Phase 1) | 段階的実装 |

### 1.5 既存チャート基盤との共有

| モジュール | 役割 | 共有 |
|-----------|------|------|
| `src/kt/chart/types.ts` | 型定義 | 共通型 + area固有型 |
| `src/kt/chart/colors.ts` | カラーパレット・バリデーション | 完全共有 |
| `src/kt/chart/normalize.ts` | データ正規化 | 完全共有 |
| `src/kt/chart/scale.ts` | 軸スケール計算 | 完全共有 |
| `src/widgets/line-chart.ts` | 折れ線描画（参考） | ロジック参考・一部共有 |
| `src/kt/chart/area-chart.ts` | エリアチャート描画 | **area固有** |

### 1.6 line_chart との関係

area_chartは概念的に「塗りつぶし付きline_chart」である。主な差分:

| 観点 | line_chart | area_chart |
|------|-----------|------------|
| SVG要素 | `<path>` (stroke) + `<circle>` | `<path>` (fill) + `<path>` (stroke) + `<circle>` |
| 塗りつぶし | なし | 線とベースライン間を半透明で塗りつぶし |
| 積み上げ | 非対応 | `stack` オプションで対応 |
| デフォルト透明度 | 不透明な線 | 半透明の塗りつぶし (opacity: 0.3) |
| 描画順序 | 前面から | 背面から（重なりを考慮） |

---

## 2. API設計

### 2.1 シグネチャ

```typescript
function area_chart(data: ChartData, config?: AreaChartConfig): void;
```

### 2.2 Config

```typescript
/**
 * kt.area_chart() の設定オプション
 */
export interface AreaChartConfig {
  /**
   * x軸に使用するカラム名
   * 未指定の場合:
   * - オブジェクト配列: 最初の非数値カラム、なければ最初のカラム
   * - 2D配列: 行インデックス (0, 1, 2, ...)
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
   * - string[]: 各系列に対応する色（HEX, CSS color name, rgb(), rgba()）
   * - 系列数と色数が合わない場合はデフォルトパレットで補完
   *
   * ヒント: 透明度付きの色（例: "#4e79a780"）を使うと
   * 重なり部分が見やすくなる
   */
  color?: string | string[];

  /**
   * 積み上げ表示
   * - true: 各系列を積み上げて表示（累積値）
   * - false: 各系列を独立して重ねて表示
   * @default false
   */
  stack?: boolean;

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

### 2.3 使用例

```typescript
import { kt } from "kantan-ui";

// ===== Level 1: 最小構成 =====
// 数値配列 → インデックスがx軸
kt.area_chart([
  { month: "Jan", revenue: 100 },
  { month: "Feb", revenue: 120 },
  { month: "Mar", revenue: 90 },
  { month: "Apr", revenue: 150 },
]);

// ===== Level 2: 複数シリーズ（重ね表示） =====
kt.area_chart([
  { month: "Jan", revenue: 100, cost: 60 },
  { month: "Feb", revenue: 120, cost: 70 },
  { month: "Mar", revenue: 90,  cost: 55 },
  { month: "Apr", revenue: 150, cost: 80 },
]);

// ===== Level 3: x/y指定 + カスタム色 =====
kt.area_chart(data, {
  x: "month",
  y: ["revenue", "cost"],
  color: ["#4e79a780", "#e1575980"],
  x_label: "Month",
  y_label: "Amount ($)",
});

// ===== Level 4: 積み上げエリア =====
kt.area_chart(trafficData, {
  x: "date",
  y: ["organic", "paid", "referral"],
  stack: true,
  title: "Traffic Sources",
});

// ===== Level 5: 2D配列 =====
kt.area_chart([
  [10, 20, 15],
  [12, 18, 22],
  [8, 25, 19],
  [15, 30, 25],
]);

// ===== Level 6: レイアウトとの組み合わせ =====
kt.columns(2, (cols) => {
  cols[0](() => {
    kt.subheader("Revenue Trend");
    kt.area_chart(revenueData, { height: 250 });
  });
  cols[1](() => {
    kt.subheader("Stacked Traffic");
    kt.area_chart(trafficData, {
      stack: true,
      height: 250,
    });
  });
});
```

---

## 3. 型定義

### 3.1 ChartData（共通型）

既存の共通型を再利用:

```typescript
export type ChartData =
  | Record<string, unknown>[]
  | unknown[][]
  | { columns: string[]; data: unknown[][] };
```

area_chartは bar_chart のようなショートハンド (`number[]`, `Record<string, number>`) を持たない。エリアチャートは時系列データが主用途であり、最低限x軸のコンテキスト（ラベルまたはインデックス）が必要なため、`ChartData` 型をそのまま使用する。

### 3.2 AreaChartConfig

セクション2.2で定義済み。

### 3.3 内部型

既存の `NormalizedBarChartData` を `NormalizedChartData` として共通化する（bar_chart、line_chartと共有）:

```typescript
/**
 * 正規化されたチャートデータ（内部用、全チャート共有）
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

### 4.1 正規化フロー

```
入力データ (ChartData)
  ↓
normalizeChartData() [既存の共通正規化]
  ↓
NormalizedChartData { xValues, series[] }
  ↓
resolveChartColors() [色の解決]
  ↓
(stack ? computeStackedAreas : identity) [積み上げ計算]
  ↓
renderAreaChartHtml() [SVG生成]
```

bar_chartと異なり、ショートハンド正規化のステップは不要。

### 4.2 カラム自動判定

共通の `normalizeChartData()` を利用。x/y の自動判定ロジックは line_chart/bar_chart と同一。

### 4.3 積み上げ計算

`stack: true` の場合、各データポイントで前の系列の値を累積:

```typescript
function computeStackedValues(
  data: NormalizedChartData,
): NormalizedChartData {
  const stackedSeries = [...data.series];
  const cumulative = new Array<number>(data.xValues.length).fill(0);

  for (let s = 0; s < stackedSeries.length; s++) {
    const series = stackedSeries[s];
    const newValues: (number | null)[] = [];

    for (let i = 0; i < data.xValues.length; i++) {
      const value = series.values[i];
      if (value === null) {
        newValues.push(null);
      } else {
        const stacked = cumulative[i] + value;
        cumulative[i] = stacked;
        newValues.push(stacked);
      }
    }

    stackedSeries[s] = { ...series, values: newValues };
  }

  return { xValues: data.xValues, series: stackedSeries };
}
```

---

## 5. 描画方式: SVG

### 5.1 HTML/SVG 構造

```html
<figure class="kt-area-chart" role="img" aria-label="Area chart: Traffic Sources">
  <figcaption class="kt-area-chart-title">Traffic Sources</figcaption>

  <svg viewBox="0 0 600 400" width="100%"
       preserveAspectRatio="xMidYMid meet"
       class="kt-area-chart-svg"
       xmlns="http://www.w3.org/2000/svg">

    <title>Traffic Sources</title>
    <desc>Area chart showing traffic source trends</desc>

    <!-- グリッド線 -->
    <g class="kt-chart-grid">
      <line x1="60" y1="50" x2="580" y2="50" />
      <!-- ... -->
    </g>

    <!-- x軸 -->
    <g class="kt-chart-axis-x" transform="translate(0, 350)">
      <line x1="60" y1="0" x2="580" y2="0" />
      <text x="120" y="20" text-anchor="middle">Jan</text>
      <!-- ... -->
    </g>

    <!-- y軸 -->
    <g class="kt-chart-axis-y" transform="translate(60, 0)">
      <line x1="0" y1="20" x2="0" y2="350" />
      <text x="-8" y="350" text-anchor="end">0</text>
      <!-- ... -->
    </g>

    <!-- 軸ラベル -->
    <text class="kt-chart-x-label" x="320" y="390" text-anchor="middle">Month</text>
    <text class="kt-chart-y-label" x="15" y="185" text-anchor="middle"
          transform="rotate(-90, 15, 185)">Amount ($)</text>

    <!-- エリア系列（背面から前面へ描画） -->
    <!-- 系列1: 塗りつぶし領域 -->
    <g class="kt-chart-area" data-series="organic">
      <path
        d="M120,100 L240,80 L360,90 L480,60 L480,350 L360,350 L240,350 L120,350 Z"
        fill="#4e79a7"
        fill-opacity="0.3"
        stroke="none"
      />
      <!-- 境界線 -->
      <path
        d="M120,100 L240,80 L360,90 L480,60"
        fill="none"
        stroke="#4e79a7"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
      <!-- データポイント -->
      <g class="kt-chart-points">
        <circle cx="120" cy="100" r="3" fill="#4e79a7">
          <title>Jan: 100</title>
        </circle>
        <!-- ... -->
      </g>
    </g>

    <!-- 系列2 -->
    <g class="kt-chart-area" data-series="paid">
      <!-- ... -->
    </g>

    <!-- 凡例 -->
    <g class="kt-chart-legend" transform="translate(60, 10)">
      <rect x="0" y="0" width="10" height="10" fill="#4e79a7" />
      <text x="14" y="9" font-size="11">organic</text>
      <rect x="80" y="0" width="10" height="10" fill="#e15759" />
      <text x="94" y="9" font-size="11">paid</text>
    </g>
  </svg>
</figure>
```

### 5.2 エリアパスの構築

#### 非積み上げ（stack: false, デフォルト）

各系列のエリアは「データ線 → ベースライン（y=0 or yMin）」で構成される閉じたパス:

```typescript
function buildAreaPath(
  points: { x: number; y: number }[],   // SVG座標に変換済み
  baselineY: number,                      // ベースラインのSVG y座標
): string {
  if (points.length === 0) return "";

  // 上辺: 左→右
  const upperPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");

  // 下辺: 右→左（ベースラインに沿って戻る）
  const lowerPath = `L${points[points.length - 1].x},${baselineY} `
    + `L${points[0].x},${baselineY} Z`;

  return `${upperPath} ${lowerPath}`;
}
```

#### 積み上げ（stack: true）

積み上げモードでは、各系列のエリアの下辺は「前の系列の上辺」になる:

```typescript
function buildStackedAreaPath(
  currentPoints: { x: number; y: number }[],  // 現在の系列（累積値）
  prevPoints: { x: number; y: number }[],     // 前の系列（累積値）
  baselineY: number,                           // 最初の系列用ベースライン
): string {
  if (currentPoints.length === 0) return "";

  // 上辺: 左→右（現在の系列）
  const upperPath = currentPoints
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");

  // 下辺: 右→左（前の系列 or ベースライン）
  let lowerPath: string;
  if (prevPoints.length > 0) {
    lowerPath = [...prevPoints]
      .reverse()
      .map((p) => `L${p.x},${p.y}`)
      .join(" ") + " Z";
  } else {
    lowerPath = `L${currentPoints[currentPoints.length - 1].x},${baselineY} `
      + `L${currentPoints[0].x},${baselineY} Z`;
  }

  return `${upperPath} ${lowerPath}`;
}
```

### 5.3 描画順序

重なり合うエリアの視認性を確保するため:

- **非積み上げ**: 最後の系列から先に描画（背面）→ 最初の系列を最前面に
- **積み上げ**: 最初の系列から順に描画（下から上へ積み上げ）

### 5.4 透明度

エリアの塗りつぶしにはデフォルトで `fill-opacity="0.3"` を適用:

- 重なり部分が見える
- 境界線（stroke）は不透明のまま維持
- ユーザーが `rgba()` や `#RRGGBBAA` で色を指定した場合、その透明度が使用される（`fill-opacity` は適用しない）

```typescript
function hasAlphaChannel(color: string): boolean {
  // rgba() または 8桁HEX (#RRGGBBAA) を検出
  return /^rgba\(/.test(color) || /^#[0-9a-fA-F]{8}$/.test(color);
}
```

### 5.5 デフォルトカラーパレット

line_chart/bar_chart と共有（Tableau 10 ベース）:

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

### 5.6 レスポンシブ対応

```typescript
const svgWidth = 600;  // viewBox内の仮想幅（固定）
const svgHeight = config?.height ?? 400;

`<svg viewBox="0 0 ${svgWidth} ${svgHeight}"
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      class="kt-area-chart-svg">`;
```

---

## 6. CSS スタイル

```css
/* Chart container */
.kt-area-chart {
  margin: 0.5rem 0;
  padding: 0;
}

.kt-area-chart-title {
  font-size: 1rem;
  font-weight: 600;
  color: #212529;
  margin-bottom: 0.5rem;
}

/* SVG */
.kt-area-chart-svg {
  display: block;
  max-width: 100%;
  height: auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Grid - kt-chart-grid は他チャートと共有 */

/* Area fill */
.kt-chart-area path:first-child {
  transition: fill-opacity 0.15s ease;
}

/* ホバー時のエリア強調 */
.kt-chart-area:hover path:first-child {
  fill-opacity: 0.5;
}

/* Area border line */
.kt-chart-area .kt-area-line {
  stroke-linejoin: round;
  stroke-linecap: round;
}

/* Data points */
.kt-chart-points circle {
  stroke: #fff;
  stroke-width: 1.5;
  transition: r 0.15s ease;
}

.kt-chart-points circle:hover {
  r: 5;
  stroke-width: 2;
}
```

グリッド線、軸、軸ラベル、凡例のCSSは line_chart/bar_chart と共有（`.kt-chart-*` クラス名）。

---

## 7. セキュリティ

line_chart/bar_chart と同じ方針:

- すべてのユーザー入力（タイトル、軸ラベル、カラム名）を `escapeHtml()` でエスケープ
- 色パラメータは `isValidColor()` でバリデーション
- データ量の制限: `MAX_DATA_POINTS: 10_000`, `MAX_SERIES: 20`

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
  kt/
    chart/
      area-chart.ts          # area_chart() メイン関数 + SVG描画
      normalize.ts           # データ正規化（既存共有）
      scale.ts               # 軸スケール計算（既存共有）
      colors.ts              # カラーパレット・バリデーション（既存共有）
      types.ts               # 型定義（共通型 + area固有型を追加）
    charts.ts                # kt.area_chart を追加
    index.ts                 # kt.area_chart をエクスポート
  styles/
    default.ts               # areaChartStyles を追加
```

---

## 10. イテレーション計画

area_chartは既存のチャート基盤（normalize, scale, colors）を再利用するため、固有の実装に集中できる。

### Iteration 1: 型定義・基本レンダリング

**目標**: 単一シリーズのエリアチャートSVG出力

**対象ファイル**:
- `src/kt/chart/types.ts` (AreaChartConfig 追加)
- `src/kt/chart/area-chart.ts` (新規)

**Red（テスト）**:
```typescript
describe("renderAreaChart", () => {
  it("generates valid SVG with area path", () => {
    const data = [
      { month: "Jan", revenue: 100 },
      { month: "Feb", revenue: 120 },
      { month: "Mar", revenue: 90 },
    ];
    const html = renderAreaChart(data);
    expect(html).toContain("<svg");
    expect(html).toContain("kt-chart-area");
    expect(html).toContain("<path");
    // 塗りつぶしパスと境界線パスの両方が存在
    expect(html).toContain("fill-opacity");
    expect(html).toContain('fill="none"');
  });

  it("renders stroke line on top of filled area", () => {
    const html = renderAreaChart(data);
    expect(html).toContain('stroke-width="2"');
  });

  it("renders data points with tooltips", () => {
    const html = renderAreaChart(data);
    expect(html).toContain("<circle");
    expect(html).toContain("<title>");
  });
});
```

**Green（実装）**:
- `src/kt/chart/types.ts` - `AreaChartConfig` 型追加
- `src/kt/chart/area-chart.ts` - 基本レンダリング

**成果物**: 単一シリーズのエリアチャートSVG

---

### Iteration 2: 複数シリーズ（重ね表示）

**目標**: 複数シリーズの重ね表示（非積み上げ）

**Red（テスト）**:
```typescript
describe("multi-series area chart", () => {
  it("renders multiple areas with different colors", () => {
    const data = [
      { month: "Jan", revenue: 100, cost: 60 },
      { month: "Feb", revenue: 120, cost: 70 },
    ];
    const html = renderAreaChart(data);
    expect(html).toContain('data-series="revenue"');
    expect(html).toContain('data-series="cost"');
  });

  it("applies default opacity to overlapping areas", () => {
    const html = renderAreaChart(multiSeriesData);
    expect(html).toContain('fill-opacity="0.3"');
  });

  it("renders legend for multi-series", () => {
    const html = renderAreaChart(multiSeriesData);
    expect(html).toContain("kt-chart-legend");
  });

  it("draws areas in back-to-front order", () => {
    const html = renderAreaChart(multiSeriesData);
    const firstArea = html.indexOf('data-series="cost"');
    const secondArea = html.indexOf('data-series="revenue"');
    // revenue（最初の系列）が前面に来る
    expect(secondArea).toBeGreaterThan(firstArea);
  });
});
```

**成果物**: 複数シリーズの重ね表示エリアチャート

---

### Iteration 3: 積み上げ（stack: true）

**目標**: 積み上げエリアチャート

**Red（テスト）**:
```typescript
describe("stacked area chart", () => {
  it("renders stacked areas", () => {
    const data = [
      { month: "Jan", a: 10, b: 20 },
      { month: "Feb", a: 15, b: 25 },
    ];
    const html = renderAreaChart(data, { stack: true });
    expect(html).toContain("kt-chart-area");
  });

  it("stacks values cumulatively", () => {
    // y軸のスケールが合計値に基づいていることを検証
    const data = [
      { x: 0, a: 10, b: 20 },
      { x: 1, a: 15, b: 25 },
    ];
    const html = renderAreaChart(data, { stack: true });
    // 最大値は 40 (15+25) に基づくスケール
    expect(html).toContain("40");
  });

  it("uses previous series as baseline for stacked areas", () => {
    const html = renderAreaChart(stackedData, { stack: true });
    // パスの構造を検証（下辺が前の系列の上辺と一致）
    expect(html).toContain("<path");
  });
});
```

**成果物**: 積み上げエリアチャート

---

### Iteration 4: kt.area_chart 統合 + CSS

**目標**: `kt.area_chart()` として使える完全な関数とスタイル

**対象ファイル**:
- `src/kt/charts.ts` (area_chart 関数追加)
- `src/kt/index.ts` (エクスポート追加)
- `src/styles/default.ts` (areaChartStyles 追加)

**Red（テスト）**:
```typescript
describe("kt.area_chart", () => {
  it("renders chart HTML to context", () => {
    const ctx = new RenderContext();
    setRenderContext(ctx);
    area_chart([
      { x: 0, y: 10 },
      { x: 1, y: 20 },
    ]);
    const html = ctx.getHtml();
    expect(html).toContain("kt-area-chart");
    expect(html).toContain("<svg");
  });

  it("renders with title", () => {
    area_chart(data, { title: "My Area Chart" });
    expect(ctx.getHtml()).toContain("My Area Chart");
  });
});
```

**成果物**: 動作する `kt.area_chart()`

---

### Iteration 5: エッジケース・バリデーション

**目標**: 堅牢性の確保

**Red（テスト）**:
```typescript
describe("edge cases", () => {
  it("handles empty data", () => {
    const html = renderAreaChart([]);
    expect(html).toContain("kt-area-chart-empty");
  });

  it("handles single data point", () => {
    const html = renderAreaChart([{ x: 0, y: 42 }]);
    expect(html).toContain("<svg");
  });

  it("handles null/missing values gracefully", () => {
    const data = [
      { x: 0, y: 10 },
      { x: 1, y: null },
      { x: 2, y: 30 },
    ];
    const html = renderAreaChart(data);
    // null部分で領域が分断される
    expect(html).toContain("<svg");
  });

  it("escapes title for XSS prevention", () => {
    const html = renderAreaChart(data, {
      title: "<script>alert(1)</script>",
    });
    expect(html).not.toContain("<script>");
  });

  it("validates color parameter", () => {
    // 無効な色はフォールバック
    const html = renderAreaChart(data, {
      color: ["url(javascript:alert(1))"],
    });
    expect(html).not.toContain("javascript:");
  });

  it("limits data points to MAX_DATA_POINTS", () => {
    const large = Array.from({ length: 20000 }, (_, i) => ({ x: i, y: i }));
    const html = renderAreaChart(large);
    expect(html).toContain("<svg");
    // 10,000ポイントに制限される
  });

  it("respects alpha channel in user-specified colors", () => {
    const html = renderAreaChart(data, { color: ["#4e79a780"] });
    // fill-opacityを二重に適用しない
    expect(html).not.toContain('fill-opacity="0.3"');
  });
});
```

**成果物**: 堅牢なエリアチャート

---

## 11. 決定事項

| 項目 | 決定 | 理由 |
|------|------|------|
| データ型 | `ChartData`（ショートハンドなし） | エリアチャートはx軸コンテキストが重要 |
| デフォルト `stack` | `false`（重ね表示） | Streamlit互換 |
| デフォルト透明度 | `fill-opacity: 0.3` | 重なり部分の視認性確保 |
| ユーザー指定alpha | `fill-opacity`を上書きしない | 二重透明度の防止 |
| 描画順序（非積み上げ） | 背面→前面 | 最初の系列が最前面に来る |
| `horizontal` パラメータ | 非対応 | エリアチャートの横向きは一般的でない |
| `sort` パラメータ | 非対応 | 時系列データが主用途のため、元順序を維持 |
| null値の扱い | パスを分断 | データの欠損を正確に表現 |

---

## 12. チェックリスト

### 実装前
- [ ] 既存チャート基盤（normalize, scale, colors）の共有方法確認
- [ ] line_chart のレンダリングパターン確認
- [ ] CSS クラス命名規則の確認

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
- [ ] 単一シリーズのエリアチャートが正しく描画される
- [ ] 複数シリーズの重ね表示が正しく描画される
- [ ] 積み上げエリアチャートが正しく描画される
- [ ] null値での分断が正しく動作する
- [ ] ユーザー指定の透明度が尊重される

---

## 13. 参考資料

- [Streamlit st.area_chart](https://docs.streamlit.io/develop/api-reference/charts/st.area_chart)
- [SVG path](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/path)
- [Tableau 10 Color Palette](https://www.tableau.com/blog/colors-upgrade-702)
- 既存設計: `docs/design/line-chart-api.md`, `docs/design/bar-chart-api.md`
- 既存実装: `src/widgets/line-chart.ts`, `src/kt/chart/bar-chart.ts`
