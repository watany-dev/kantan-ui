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

現在、チャートの正規化パイプラインが2系統存在する:

| パイプライン | 場所 | 内部表現 | 使用元 |
|-------------|------|---------|--------|
| **bar_chart系** | `src/kt/chart/normalize.ts` | `{ xValues, series: { values: (number\|null)[] } }` | bar_chart |
| **line_chart系** | `src/widgets/line-chart.ts` | `{ xLabels, series: { points: [number, number][] } }` | line_chart |

area_chartは **bar_chart系パイプライン**（`src/kt/chart/normalize.ts`）を使用する。理由:

- `values[]` 形式はインデックスベースのアクセスが容易で、積み上げ計算やエリアパス構築に適する
- bar_chartとの共有モジュール（`colors.ts`, `scale.ts`）との整合性が高い
- null値の扱いが明示的（`(number | null)[]`）

将来的に line_chart もこのパイプラインに統合することを推奨するが、area_chart の実装スコープ外とする。

| モジュール | 役割 | 共有 |
|-----------|------|------|
| `src/kt/chart/types.ts` | 型定義 | 共通型 + area固有型 |
| `src/kt/chart/colors.ts` | カラーパレット・バリデーション | 完全共有 |
| `src/kt/chart/normalize.ts` | データ正規化 | 完全共有 |
| `src/kt/chart/scale.ts` | 軸スケール計算 | 完全共有 |
| `src/kt/chart/render-utils.ts` | グリッド・軸・凡例の共通描画 | **新規抽出** |
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
function area_chart(data: AreaChartData, config?: AreaChartConfig): void;
```

### 2.2 データ型

```typescript
/**
 * エリアチャートのデータ型
 * line_chart と同様に number[] ショートハンドをサポート
 */
type AreaChartData =
  | number[]                                    // (1) 単純な値配列（x軸はインデックス）
  | Record<string, unknown>[]                   // (2) オブジェクト配列
  | unknown[][]                                 // (3) 2D配列
  | { columns: string[]; data: unknown[][] };   // (4) 明示的形式
```

`number[]` は line_chart と同様、インデックスを自動的にx軸として扱う。bar_chart の `Record<string, number>` ショートハンドは非サポート（エリアチャートはカテゴリ比較ではなく連続データの傾向表示が主用途のため、key-valueマップは不自然）。

### 2.3 Config

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
   * - number[]: インデックス (0, 1, 2, ...)
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
   * コンテナ幅に合わせる
   * @default true
   */
  use_container_width?: boolean;

  /**
   * チャートのタイトル
   */
  title?: string;
}
```

### 2.4 使用例

```typescript
import { kt } from "kantan-ui";

// ===== Level 0: 最小構成（number[] ショートハンド） =====
// line_chart と同様、インデックスがx軸
kt.area_chart([10, 20, 15, 30, 25]);

// ===== Level 1: オブジェクト配列 =====
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

### 3.1 AreaChartData

```typescript
/**
 * エリアチャートのデータ型
 * line_chart と同様に number[] ショートハンドをサポート
 */
export type AreaChartData = number[] | ChartData;
```

line_chart の `LineChartData` が `number[]` を含むのと同様に、area_chart も `number[]` を受け付ける。bar_chart 固有の `Record<string, number>` は含まない。

| データ型 | line_chart | bar_chart | area_chart |
|---------|-----------|-----------|------------|
| `number[]` | **対応** | **対応** | **対応** |
| `Record<string, number>` | 非対応 | **対応** | 非対応 |
| `Record<string, unknown>[]` | **対応** | **対応** | **対応** |
| `unknown[][]` | **対応** | **対応** | **対応** |
| `{ columns, data }` | **対応** | **対応** | **対応** |

### 3.2 AreaChartConfig

セクション2.3で定義済み。

### 3.3 内部型

bar_chart パイプラインの既存型（`NormalizedBarChartData`, `BarChartSeries`）をそのまま利用する。area_chart 固有の内部型は追加しない:

```typescript
// src/kt/chart/types.ts に既に定義済み
interface NormalizedBarChartData {
  xValues: (string | number)[];
  series: BarChartSeries[];
}

interface BarChartSeries {
  name: string;
  values: (number | null)[];
  color: string;
}
```

> **将来の改善**: `NormalizedBarChartData` / `BarChartSeries` のリネームを検討（`NormalizedChartData` / `ChartSeries` に統一）。ただし area_chart 実装のスコープ外。

---

## 4. データ正規化ルール

### 4.1 正規化フロー

```
入力データ (AreaChartData)
  ↓
normalizeAreaChartInput() [number[] ショートハンドを ChartData に変換]
  ↓
normalizeChartData() [src/kt/chart/normalize.ts の既存関数]
  ↓
NormalizedBarChartData { xValues, series[] }
  ↓
resolveChartColors() [src/kt/chart/colors.ts の既存関数]
  ↓
(stack ? computeStackedValues : identity) [積み上げ計算]
  ↓
renderAreaChartHtml() [SVG生成]
```

### 4.2 number[] ショートハンドの正規化

bar_chart と同じパターンで、`number[]` を `ChartData` に変換してから共通パイプラインに渡す:

```typescript
function normalizeAreaChartInput(data: AreaChartData): ChartData {
  // number[] → オブジェクト配列
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "number") {
    return (data as number[]).map((v, i) => ({ index: i, value: v }));
  }
  return data as ChartData;
}
```

### 4.3 カラム自動判定

共通の `normalizeChartData()`（`src/kt/chart/normalize.ts`）を利用。x/y の自動判定ロジックは bar_chart と同一。

### 4.4 積み上げ計算

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

### 4.5 null値によるパス分断

系列の値に `null` が含まれる場合、連続した非null区間ごとに個別のエリアパス（`<path>`）を生成する。これにより欠損データが視覚的に明示される。

```typescript
/**
 * 連続した非null値の区間（セグメント）に分割する
 *
 * 入力: values = [10, 20, null, null, 30, 40, null, 50]
 * 出力: [
 *   { startIndex: 0, values: [10, 20] },
 *   { startIndex: 4, values: [30, 40] },
 *   { startIndex: 7, values: [50] },
 * ]
 */
interface Segment {
  startIndex: number;
  values: number[];
}

function splitByNull(values: (number | null)[]): Segment[] {
  const segments: Segment[] = [];
  let current: Segment | null = null;

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v !== null) {
      if (!current) {
        current = { startIndex: i, values: [] };
      }
      current.values.push(v);
    } else {
      if (current) {
        segments.push(current);
        current = null;
      }
    }
  }

  if (current) {
    segments.push(current);
  }

  return segments;
}
```

各セグメントに対して個別の `<path>` (fill) と `<path>` (stroke) を生成する。セグメント間に線やつなぎは描画しない。

**積み上げモードでのnull値**: 前の系列の値は維持し、null を含む系列のみがその区間で欠損扱いとなる。

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
      render-utils.ts        # 【新規】グリッド・軸・凡例の共通描画関数
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

### Iteration 0: 共通描画ユーティリティの抽出（Tidy First）

**目標**: `src/widgets/line-chart.ts` からグリッド・軸・凡例の描画ロジックを `src/kt/chart/render-utils.ts` に抽出

**背景**: 現在 line_chart のSVGレンダリングコード（グリッド線、x軸/y軸描画、凡例描画）は `src/widgets/line-chart.ts` に直接書かれている。bar_chart は `src/kt/chart/bar-chart.ts` に独自実装を持つ。area_chart でも同じ描画が必要になるため、先に共通関数を抽出する。

**対象関数**:
- `renderGrid()` → グリッド線の描画
- `renderXAxis()` → x軸ラベル・目盛りの描画
- `renderYAxis()` → y軸ラベル・目盛りの描画
- `renderLegend()` → 凡例の描画
- `niceScale()` → Nice numbers アルゴリズム（既に `scale.ts` に類似実装あり → 統合を検討）

**方針**:
- 構造的変更のみ（Tidy First の原則: 構造的変更と機能的変更を分離）
- line_chart の既存テストがすべてパスすることを確認
- bar_chart の既存テストに影響がないことを確認

**Red（テスト）**:
```typescript
describe("render-utils", () => {
  it("renderGrid generates grid lines SVG", () => {
    const svg = renderGrid({ min: 0, max: 100, step: 20 }, { ... });
    expect(svg).toContain("kt-chart-grid");
    expect(svg).toContain("<line");
  });

  it("renderXAxis generates x-axis labels", () => {
    const svg = renderXAxis(["Jan", "Feb", "Mar"], { ... });
    expect(svg).toContain("Jan");
  });

  it("renderLegend generates legend for multiple series", () => {
    const svg = renderLegend([{ name: "a", color: "#4e79a7" }], { ... });
    expect(svg).toContain("kt-chart-legend");
  });
});
```

**成果物**: `src/kt/chart/render-utils.ts` + line_chart の既存テストが引き続きパス

---

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

  it("accepts number[] shorthand", () => {
    const html = renderAreaChart([10, 20, 15, 30]);
    expect(html).toContain("<svg");
    expect(html).toContain("kt-chart-area");
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
| データ型 | `AreaChartData = number[] \| ChartData` | line_chartと同等の利便性を確保。bar_chartの`Record<string,number>`は非サポート |
| normalizeパイプライン | bar_chart系（`src/kt/chart/normalize.ts`） | `values[]`形式が積み上げ計算・エリアパス構築に適する |
| 共通描画ユーティリティ | `render-utils.ts` に抽出 | line_chart/bar_chart/area_chartで共有するグリッド・軸・凡例の描画 |
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
- [ ] `src/kt/chart/normalize.ts` の `normalizeChartData()` のインターフェース確認
- [ ] `src/widgets/line-chart.ts` から抽出可能な描画関数の洗い出し
- [ ] CSS クラス命名規則の確認（`kt-chart-*` 共通 vs `kt-area-chart-*` 固有）

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
- [ ] `number[]` ショートハンドが動作する
- [ ] 単一シリーズのエリアチャートが正しく描画される
- [ ] 複数シリーズの重ね表示が正しく描画される
- [ ] 積み上げエリアチャートが正しく描画される
- [ ] null値での分断が正しく動作する
- [ ] ユーザー指定の透明度が尊重される
- [ ] 共通描画ユーティリティ抽出後も line_chart/bar_chart の既存テストがパスする

---

## 13. 参考資料

- [Streamlit st.area_chart](https://docs.streamlit.io/develop/api-reference/charts/st.area_chart)
- [SVG path](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/path)
- [Tableau 10 Color Palette](https://www.tableau.com/blog/colors-upgrade-702)
- 既存設計: `docs/design/line-chart-api.md`, `docs/design/bar-chart-api.md`
- 既存実装: `src/widgets/line-chart.ts`, `src/kt/chart/bar-chart.ts`
