# ScatterChart API 設計書

## 実装ステータス

> **📋 設計完了・未実装**
>
> API設計・型定義・イテレーション計画を策定済み。実装は本設計書に基づいて行う。

---

## 1. 概要

### 1.1 目的

Streamlit風の散布図表示API `kt.scatter_chart()` をkantan-uiに実装する。2つの数値変数間の関係や分布を視覚的に表示するためのチャートコンポーネント。

### 1.2 Streamlit互換性

```python
# Streamlit
import pandas as pd
import numpy as np

df = pd.DataFrame(np.random.randn(20, 3), columns=["a", "b", "c"])
st.scatter_chart(df)

# カラム指定
st.scatter_chart(df, x="a", y="b", color=["#FF0000"])

# サイズ指定
st.scatter_chart(df, x="a", y="b", size="c")
```

### 1.3 設計原則

| 原則 | 説明 |
|------|------|
| **ゼロ依存** | 外部チャートライブラリ不要。SVGで完結 |
| **サーバーサイド描画** | HTMLテンプレートとしてSVGを生成。クライアントJS不要 |
| **既存チャート基盤の再利用** | `normalize.ts`, `scale.ts`, `colors.ts`, `render-utils.ts` を共有 |
| **段階的な複雑さ** | 1引数で動作し、configで段階的に拡張可能 |
| **Web標準** | SVG + CSS のみ |

### 1.4 Streamlit との差分

| 項目 | Streamlit | kantan-ui | 理由 |
|------|-----------|-----------|------|
| 描画エンジン | Vega-Lite (Altair) | SVG (サーバーサイド生成) | ゼロ依存の方針 |
| データ形式 | Pandas DataFrame | `ScatterChartData` (配列/オブジェクト) | TypeScriptネイティブ |
| `size` パラメータ | カラム名でサイズマッピング | カラム名でサイズマッピング | Streamlit互換 |
| `color` カラム指定 | 対応（long format） | 非対応（配列のみ） | 初期版はシンプルに |
| `width` / `useContainerWidth` | 両方対応 | コンテナ幅追従のみ | SVG viewBoxで十分 |
| ツールチップ | Vega-Lite組み込み | CSS `<title>` | 段階的実装 |
| ズーム/パン | Vega-Lite組み込み | なし | 優先度低 |

### 1.5 他チャートとの違い

散布図は他のチャートタイプと根本的に異なる特徴を持つ:

| 観点 | line_chart / area_chart / bar_chart | scatter_chart |
|------|-------------------------------------|---------------|
| x軸のスケール | カテゴリ（等間隔配置）または暗黙的インデックス | **数値連続軸**（データ値に基づく配置） |
| x軸の正規化 | `xValues: (string \| number)[]` を等間隔配置 | x/y ともに `number` でスケール計算が必要 |
| SVG要素 | `<polyline>`, `<path>`, `<rect>` | **`<circle>`** |
| ポイントサイズ | 固定 | 第3変数によるサイズマッピング |
| 主な用途 | 時系列、カテゴリ比較、累積 | **相関分析、分布可視化** |

この違いにより、x軸のスケール計算を追加で行う必要がある（既存チャートはカテゴリを等間隔配置するだけ）。

### 1.6 既存チャート基盤との共有

| モジュール | 役割 | 共有 |
|-----------|------|------|
| `src/kt/chart/types.ts` | 型定義 | 共通型 + scatter固有型 |
| `src/kt/chart/colors.ts` | カラーパレット・バリデーション | 完全共有 |
| `src/kt/chart/normalize.ts` | データ正規化 | 部分共有（scatter用の拡張が必要） |
| `src/kt/chart/scale.ts` | 軸スケール計算 | 完全共有（x軸にも適用） |
| `src/kt/chart/render-utils.ts` | グリッド・軸・凡例の共通描画 | 完全共有 |
| `src/kt/chart/scatter-chart.ts` | 散布図描画 | **scatter固有** |

---

## 2. API設計

### 2.1 シグネチャ

```typescript
function scatter_chart(data: ScatterChartData, config?: ScatterChartConfig): void;
```

### 2.2 データ型

```typescript
/**
 * 散布図のデータ型
 * ChartDataに加え、xyペアの簡易形式をサポート
 */
type ScatterChartData =
  | [number, number][]                         // (1) xyペア配列
  | Record<string, unknown>[]                  // (2) オブジェクト配列
  | unknown[][]                                // (3) 2D配列
  | { columns: string[]; data: unknown[][] };  // (4) 明示的形式
```

`[number, number][]` は scatter_chart 固有のショートハンド。散布図では最も自然な入力形式「(x, y)座標のリスト」を最小限の記述で受け付ける。

**bar_chart の `Record<string, number>` や line_chart の `number[]` は非サポート**: 散布図は2次元の数値データが必須であり、1次元の値配列やkey-valueマップは散布図の入力として不自然なため。

### 2.3 Config

```typescript
/**
 * kt.scatter_chart() の設定オプション
 */
export interface ScatterChartConfig {
  /**
   * x軸に使用するカラム名
   * 未指定の場合:
   * - [number, number][]: 1番目の要素
   * - オブジェクト配列: 最初の数値カラム
   * - 2D配列: 1列目
   */
  x?: string;

  /**
   * y軸に使用するカラム名（単一または複数）
   * 未指定の場合:
   * - [number, number][]: 2番目の要素
   * - オブジェクト配列: x以外の数値カラム
   * - 2D配列: 2列目以降
   *
   * 複数指定で複数シリーズの散布図を描画
   */
  y?: string | string[];

  /**
   * ポイントサイズに使用するカラム名
   * 指定時: カラムの値に比例した円の面積でポイントを描画
   * 未指定時: 固定サイズ（半径4px）
   *
   * @example
   * kt.scatter_chart(data, { x: "height", y: "weight", size: "age" })
   */
  size?: string;

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
   */
  color?: string | string[];

  /**
   * ポイントの透明度
   * 多数のポイントが重なる場合に有効
   * @default 0.7
   */
  opacity?: number;

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

// ===== Level 1: 最小構成（xyペア配列） =====
kt.scatter_chart([
  [1, 10], [2, 15], [3, 12], [4, 18], [5, 14],
]);

// ===== Level 2: オブジェクト配列（自動判定） =====
kt.scatter_chart([
  { height: 170, weight: 65 },
  { height: 175, weight: 72 },
  { height: 160, weight: 55 },
  { height: 180, weight: 80 },
  { height: 165, weight: 60 },
]);

// ===== Level 3: x/y指定 + カスタム色 =====
kt.scatter_chart(data, {
  x: "height",
  y: "weight",
  color: ["#4e79a7"],
  x_label: "Height (cm)",
  y_label: "Weight (kg)",
  title: "Height vs Weight",
});

// ===== Level 4: サイズマッピング =====
kt.scatter_chart(data, {
  x: "gdp_per_capita",
  y: "life_expectancy",
  size: "population",
  title: "GDP vs Life Expectancy",
  x_label: "GDP per capita ($)",
  y_label: "Life expectancy (years)",
});

// ===== Level 5: 複数シリーズ =====
kt.scatter_chart(
  [
    { engine_size: 2.0, mpg: 30, hp: 150, type: "sedan" },
    { engine_size: 3.5, mpg: 22, hp: 250, type: "suv" },
    { engine_size: 1.6, mpg: 35, hp: 120, type: "compact" },
    // ...
  ],
  {
    x: "engine_size",
    y: ["mpg", "hp"],
    color: ["#4e79a7", "#e15759"],
    x_label: "Engine Size (L)",
  }
);

// ===== Level 6: 透明度調整（大量データ向け） =====
kt.scatter_chart(largeDataset, {
  x: "x",
  y: "y",
  opacity: 0.3,
  title: "Dense Scatter Plot (10,000 points)",
});

// ===== Level 7: 2D配列 =====
kt.scatter_chart([
  [1.2, 3.4],
  [2.3, 4.5],
  [3.1, 2.8],
  [4.5, 5.2],
]);

// ===== Level 8: レイアウトとの組み合わせ =====
kt.columns(2, (cols) => {
  cols[0](() => {
    kt.subheader("Correlation A");
    kt.scatter_chart(dataA, { height: 250, x: "x", y: "y" });
  });
  cols[1](() => {
    kt.subheader("Correlation B");
    kt.scatter_chart(dataB, { height: 250, x: "x", y: "y" });
  });
});
```

---

## 3. 型定義

### 3.1 ScatterChartData

```typescript
/**
 * 散布図のデータ型
 * xyペア配列のショートハンドを含む
 */
export type ScatterChartData = [number, number][] | ChartData;
```

| データ型 | line_chart | bar_chart | area_chart | scatter_chart |
|---------|-----------|-----------|------------|---------------|
| `number[]` | **対応** | **対応** | **対応** | 非対応 |
| `[number, number][]` | 非対応 | 非対応 | 非対応 | **対応** |
| `Record<string, number>` | 非対応 | **対応** | 非対応 | 非対応 |
| `Record<string, unknown>[]` | **対応** | **対応** | **対応** | **対応** |
| `unknown[][]` | **対応** | **対応** | **対応** | **対応** |
| `{ columns, data }` | **対応** | **対応** | **対応** | **対応** |

### 3.2 ScatterChartConfig

セクション2.3で定義済み。

### 3.3 内部型

```typescript
/**
 * 正規化された散布図データ（内部用）
 */
interface NormalizedScatterData {
  series: ScatterSeries[];
}

/**
 * 散布図の1系列
 */
interface ScatterSeries {
  name: string;
  points: ScatterPoint[];
  color: string;
}

/**
 * 散布図の1ポイント
 */
interface ScatterPoint {
  x: number;
  y: number;
  size: number | null;  // sizeカラム指定時のみ非null
}
```

line_chart/bar_chart/area_chart の `NormalizedBarChartData` は `xValues[]` + `series[].values[]` のインデックスベース構造だが、散布図では各ポイントが独自の (x, y) 座標を持つため、ポイントベースの構造を使用する。

---

## 4. データ正規化ルール

### 4.1 正規化フロー

```
入力データ (ScatterChartData)
  ↓
normalizeScatterChartInput() [xyペアを ChartData に変換]
  ↓
normalizeScatterData() [scatter固有の正規化]
  ↓
NormalizedScatterData { series: ScatterSeries[] }
  ↓
resolveChartColors() [src/kt/chart/colors.ts の既存関数]
  ↓
renderScatterChartHtml() [SVG生成]
```

### 4.2 xyペア配列のショートハンド正規化

```typescript
function normalizeScatterChartInput(data: ScatterChartData): ChartData {
  // [number, number][] → オブジェクト配列
  if (
    Array.isArray(data) &&
    data.length > 0 &&
    Array.isArray(data[0]) &&
    data[0].length === 2 &&
    typeof data[0][0] === "number" &&
    typeof data[0][1] === "number"
  ) {
    return (data as [number, number][]).map(([x, y]) => ({ x, y }));
  }
  return data as ChartData;
}
```

### 4.3 scatter固有の正規化

既存の `normalizeChartData()` はカテゴリ+値の構造を返すが、散布図はx/yともに数値スケールが必要。そのため scatter 固有の正規化関数を用意する:

```typescript
function normalizeScatterData(
  data: ChartData,
  config?: { x?: string; y?: string | string[]; size?: string; color?: string | string[] },
): NormalizedScatterData {
  // 1. データからヘッダー（キー名）を取得
  // 2. x カラムを決定（config.x ?? 最初の数値カラム）
  // 3. y カラムを決定（config.y ?? x以外の数値カラム）
  // 4. size カラムを解決（config.size が指定されている場合）
  // 5. 各 y カラムごとに ScatterSeries を構築
  //    - 各行から (x, y, size) のポイントを抽出
  //    - 非数値の x/y は除外（null ポイント）
  // 6. 色を割り当て

  return { series };
}
```

### 4.4 x カラムの自動判定

散布図では x/y ともに数値が必要。自動判定ロジック:

```typescript
function resolveScatterXColumn(
  keys: string[],
  data: Record<string, unknown>[],
  config?: { x?: string; y?: string | string[]; size?: string },
): string | undefined {
  // 1. config.x が指定されていればそれを使用
  if (config?.x) return config.x;

  // 2. 最初の数値カラムを x として使用
  for (const key of keys) {
    if (isNumericColumn(data, key)) return key;
  }

  return undefined;
}
```

既存チャートでは `findXColumn()` が「最初の文字列カラム」を返すが、散布図では「最初の数値カラム」を返す点が異なる。

### 4.5 サイズマッピング

`size` カラムが指定された場合、値を円の**面積に比例する半径**に変換する:

```typescript
const SIZE_RANGE = { min: 3, max: 20 }; // 半径の範囲（px）

function computePointRadius(
  value: number | null,
  sizeExtent: { min: number; max: number },
): number {
  if (value === null) return SIZE_RANGE.min;

  const range = sizeExtent.max - sizeExtent.min;
  if (range === 0) return (SIZE_RANGE.min + SIZE_RANGE.max) / 2;

  // 面積比例: r = sqrt(normalized * (rMax^2 - rMin^2) + rMin^2)
  const normalized = (value - sizeExtent.min) / range;
  const minArea = SIZE_RANGE.min ** 2;
  const maxArea = SIZE_RANGE.max ** 2;
  return Math.sqrt(normalized * (maxArea - minArea) + minArea);
}
```

面積比例を使う理由: 半径比例だと大きな値のポイントが視覚的に過大に見える（面積は半径の2乗に比例するため）。

### 4.6 null値の扱い

x または y が `null`/`NaN`/非数値のポイントは描画対象から除外する。line_chart のような「線の分断」は不要（個々のポイントが独立しているため）。

---

## 5. 描画方式: SVG

### 5.1 HTML/SVG 構造

```html
<figure class="kt-scatter-chart" role="img" aria-label="Scatter chart: Height vs Weight">
  <figcaption class="kt-scatter-chart-title">Height vs Weight</figcaption>

  <svg viewBox="0 0 600 400" width="100%"
       preserveAspectRatio="xMidYMid meet"
       class="kt-scatter-chart-svg"
       xmlns="http://www.w3.org/2000/svg">

    <title>Height vs Weight</title>
    <desc>Scatter chart showing the relationship between height and weight</desc>

    <!-- グリッド線 -->
    <g class="kt-chart-grid">
      <line x1="60" y1="50" x2="580" y2="50" />
      <!-- 水平グリッド（y軸目盛り） -->
      <!-- ... -->
    </g>

    <!-- x軸グリッド（散布図固有：縦方向のグリッド線） -->
    <g class="kt-chart-grid-x">
      <line x1="150" y1="20" x2="150" y2="350" />
      <!-- ... -->
    </g>

    <!-- x軸（数値軸） -->
    <g class="kt-chart-axis-x">
      <line x1="60" y1="350" x2="580" y2="350" stroke="#dee2e6" stroke-width="1" />
      <text x="150" y="366" text-anchor="middle" font-size="11" fill="#6c757d">160</text>
      <text x="320" y="366" text-anchor="middle" font-size="11" fill="#6c757d">170</text>
      <text x="490" y="366" text-anchor="middle" font-size="11" fill="#6c757d">180</text>
    </g>

    <!-- y軸 -->
    <g class="kt-chart-axis-y">
      <line x1="60" y1="20" x2="60" y2="350" stroke="#dee2e6" stroke-width="1" />
      <text x="52" y="354" text-anchor="end" font-size="11" fill="#6c757d">50</text>
      <text x="52" y="187" text-anchor="end" font-size="11" fill="#6c757d">65</text>
      <text x="52" y="24" text-anchor="end" font-size="11" fill="#6c757d">80</text>
    </g>

    <!-- 軸ラベル -->
    <text class="kt-chart-x-label" x="320" y="390" text-anchor="middle">Height (cm)</text>
    <text class="kt-chart-y-label" x="15" y="185" text-anchor="middle"
          transform="rotate(-90, 15, 185)">Weight (kg)</text>

    <!-- データポイント -->
    <g class="kt-chart-scatter" data-series="weight">
      <circle cx="200" cy="150" r="4" fill="#4e79a7" fill-opacity="0.7">
        <title>height: 170, weight: 65</title>
      </circle>
      <circle cx="350" cy="100" r="4" fill="#4e79a7" fill-opacity="0.7">
        <title>height: 175, weight: 72</title>
      </circle>
      <!-- ... -->
    </g>

    <!-- 凡例（複数シリーズ時のみ） -->
    <g class="kt-chart-legend" transform="translate(60, 10)">
      <circle cx="5" cy="5" r="4" fill="#4e79a7" />
      <text x="14" y="9" font-size="11" fill="#495057">weight</text>
    </g>
  </svg>
</figure>
```

### 5.2 x軸の数値スケール

既存チャートではx軸はカテゴリ（等間隔配置）だが、散布図ではx軸も数値スケールが必要:

```typescript
// 既存の calculateAxisScale() をx軸にも適用
const xValues = allPoints.map(p => p.x);
const yValues = allPoints.map(p => p.y);

const xScale = calculateAxisScale(xValues);
const yScale = calculateAxisScale(yValues);
```

ただし `calculateAxisScale()` は現在「min >= 0 なら 0 を含める」ルールがある。これはバーチャート向きの挙動で、散布図では不要（例: 身長 160-180 のデータでx軸を 0 から始めるのは不適切）。

**対応方針**: `calculateAxisScale()` にオプション `includeZero?: boolean` を追加。

```typescript
export function calculateAxisScale(
  values: number[],
  maxTicks = 5,
  options?: { includeZero?: boolean },
): AxisScale {
  const includeZero = options?.includeZero ?? true;

  // ...existing logic...

  // includeZero が false の場合、0 を含めるルールをスキップ
  if (includeZero) {
    if (dataMin >= 0) dataMin = 0;
    if (dataMax <= 0) dataMax = 0;
  }

  // ...rest of the function...
}
```

既存の bar_chart/area_chart は `calculateAxisScale(values)` で呼び出しており、デフォルト `includeZero: true` で後方互換性を維持。scatter_chart は `calculateAxisScale(values, 5, { includeZero: false })` で呼び出す。

### 5.3 x軸グリッド（縦方向のグリッド線）

散布図は既存チャートと異なり、x軸にも数値目盛りがあるため、縦方向のグリッド線も描画する:

```typescript
function renderVerticalGrid(
  xScale: AxisScale,
  marginLeft: number,
  plotWidth: number,
  plotTop: number,
  plotBottom: number,
  scaleX: (v: number) => number,
): string {
  const parts: string[] = ['<g class="kt-chart-grid-x">'];
  for (const tick of xScale.ticks) {
    const x = scaleX(tick);
    parts.push(
      `<line x1="${x}" y1="${plotTop}" x2="${x}" y2="${plotBottom}" stroke="#e9ecef" stroke-width="1" />`,
    );
  }
  parts.push("</g>");
  return parts.join("");
}
```

### 5.4 数値x軸の描画

既存の `renderXAxis()` はカテゴリラベルを等間隔配置するが、散布図では数値目盛りが必要。scatter_chart 固有の関数を用意する:

```typescript
function renderNumericXAxis(
  xScale: AxisScale,
  marginLeft: number,
  plotWidth: number,
  baseY: number,
  scaleX: (v: number) => number,
): string {
  const parts: string[] = ['<g class="kt-chart-axis-x">'];
  parts.push(
    `<line x1="${marginLeft}" y1="${baseY}" x2="${marginLeft + plotWidth}" y2="${baseY}" stroke="#dee2e6" stroke-width="1" />`,
  );

  for (const tick of xScale.ticks) {
    const x = scaleX(tick);
    parts.push(
      `<text x="${x}" y="${baseY + 16}" text-anchor="middle" font-size="11" fill="#6c757d">${formatTickValue(tick)}</text>`,
    );
  }

  parts.push("</g>");
  return parts.join("");
}
```

### 5.5 ポイントの描画

```typescript
function renderScatterPoints(
  series: ScatterSeries,
  scaleX: (v: number) => number,
  scaleY: (v: number) => number,
  defaultRadius: number,
  opacity: number,
  xName: string,
): string {
  const parts: string[] = [];
  parts.push(renderHtml`<g class="kt-chart-scatter" data-series="${series.name}">`);

  for (const point of series.points) {
    const cx = scaleX(point.x);
    const cy = scaleY(point.y);
    const r = point.size !== null ? point.size : defaultRadius;

    parts.push(
      renderHtml`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${series.color}" fill-opacity="${opacity}">` +
      renderHtml`<title>${xName}: ${point.x}, ${series.name}: ${point.y}</title>` +
      `</circle>`,
    );
  }

  parts.push("</g>");
  return parts.join("");
}
```

### 5.6 凡例

散布図の凡例には `<circle>` を使用（`<rect>` ではなく）。ポイント形状と一致させるため:

```typescript
function renderScatterLegend(
  series: { name: string; color: string }[],
  startX: number,
  y: number,
): string {
  const parts: string[] = ['<g class="kt-chart-legend">'];
  let x = startX;

  for (const s of series) {
    parts.push(
      renderHtml`<circle cx="${x + 5}" cy="${y + 5}" r="4" fill="${s.color}" />`,
    );
    parts.push(
      renderHtml`<text x="${x + 14}" y="${y + 9}" font-size="11" fill="#495057">${s.name}</text>`,
    );
    x += 80;
  }

  parts.push("</g>");
  return parts.join("");
}
```

### 5.7 デフォルトカラーパレット

line_chart/bar_chart/area_chart と共有（Tableau 10 ベース）。

### 5.8 レスポンシブ対応

```typescript
const svgWidth = 600;  // viewBox内の仮想幅（固定）
const svgHeight = config?.height ?? 400;

`<svg viewBox="0 0 ${svgWidth} ${svgHeight}"
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      class="kt-scatter-chart-svg">`;
```

---

## 6. CSS スタイル

```css
/* Chart container */
.kt-scatter-chart {
  margin: 0.5rem 0;
  padding: 0;
}

.kt-scatter-chart-title {
  font-size: 1rem;
  font-weight: 600;
  color: #212529;
  margin-bottom: 0.5rem;
}

/* SVG */
.kt-scatter-chart-svg {
  display: block;
  max-width: 100%;
  height: auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Grid - kt-chart-grid は他チャートと共有 */

/* x軸グリッド（散布図固有） */
.kt-chart-grid-x line {
  stroke: #e9ecef;
  stroke-width: 1;
}

/* Data points */
.kt-chart-scatter circle {
  stroke: #fff;
  stroke-width: 1;
  transition: r 0.15s ease, fill-opacity 0.15s ease;
}

/* ホバー時のポイント強調 */
.kt-chart-scatter circle:hover {
  fill-opacity: 1;
  stroke-width: 2;
}
```

グリッド線、y軸、軸ラベル、凡例のCSSは他チャートと共有（`.kt-chart-*` クラス名）。

---

## 7. セキュリティ

line_chart/bar_chart/area_chart と同じ方針:

- すべてのユーザー入力（タイトル、軸ラベル、カラム名）を `escapeHtml()` でエスケープ
- 色パラメータは `isValidColor()` でバリデーション
- データ量の制限: `MAX_DATA_POINTS: 10_000`, `MAX_SERIES: 20`
- `opacity` パラメータの範囲制限: `Math.max(0, Math.min(1, opacity))`
- `size` カラムの値の範囲制限: 半径は `SIZE_RANGE` でクランプ

---

## 8. アクセシビリティ

- `<figure>` + `<figcaption>` でセマンティックな構造
- `role="img"` + `aria-label` でスクリーンリーダー対応
- SVG `<title>` + `<desc>` でチャートの説明
- 各データポイントの `<title>` でツールチップ兼読み上げ対応（x値, y値, size値を含む）
- カラーパレットはコントラスト比を考慮した配色

---

## 9. ファイル構成

```
src/
  kt/
    chart/
      scatter-chart.ts      # scatter_chart() メイン関数 + SVG描画
      normalize.ts           # データ正規化（既存共有、scatter用拡張なし）
      scale.ts               # 軸スケール計算（includeZero オプション追加）
      render-utils.ts        # グリッド・軸・凡例の共通描画（既存共有）
      colors.ts              # カラーパレット・バリデーション（既存共有）
      types.ts               # 型定義（共通型 + scatter固有型を追加）
    charts.ts                # kt.scatter_chart を追加
    index.ts                 # kt.scatter_chart をエクスポート
  styles/
    default.ts               # scatterChartStyles を追加
tests/
  unit/
    kt/
      scatter-chart.test.ts  # 宣言的API統合テスト
      chart/
        scatter-chart.test.ts # レンダリングテスト
```

---

## 10. イテレーション計画

### Iteration 1: 型定義・scatter固有の正規化

**目標**: scatter固有のデータ型と正規化関数

**対象ファイル**:
- `src/kt/chart/types.ts` (ScatterChartConfig, ScatterChartData 追加)
- `src/kt/chart/scatter-chart.ts` (正規化部分)

**Red（テスト）**:
```typescript
describe("normalizeScatterChartInput", () => {
  it("normalizes [number, number][] to ChartData", () => {
    const result = normalizeScatterChartInput([[1, 10], [2, 20], [3, 15]]);
    expect(result).toEqual([
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 15 },
    ]);
  });

  it("passes through ChartData unchanged", () => {
    const data = [{ a: 1, b: 2 }];
    const result = normalizeScatterChartInput(data);
    expect(result).toBe(data);
  });
});

describe("normalizeScatterData", () => {
  it("normalizes object array with auto column detection", () => {
    const data = [
      { height: 170, weight: 65 },
      { height: 175, weight: 72 },
    ];
    const result = normalizeScatterData(data);
    expect(result.series).toHaveLength(1);
    expect(result.series[0].name).toBe("weight");
    expect(result.series[0].points).toEqual([
      { x: 170, y: 65, size: null },
      { x: 175, y: 72, size: null },
    ]);
  });

  it("respects explicit x and y config", () => {
    const data = [
      { a: 1, b: 10, c: 20 },
      { a: 2, b: 15, c: 25 },
    ];
    const result = normalizeScatterData(data, { x: "a", y: "b" });
    expect(result.series).toHaveLength(1);
    expect(result.series[0].name).toBe("b");
    expect(result.series[0].points[0]).toEqual({ x: 1, y: 10, size: null });
  });

  it("extracts size values when size column is specified", () => {
    const data = [
      { x: 1, y: 10, s: 100 },
      { x: 2, y: 20, s: 200 },
    ];
    const result = normalizeScatterData(data, { x: "x", y: "y", size: "s" });
    expect(result.series[0].points[0].size).not.toBeNull();
    expect(result.series[0].points[1].size).toBeGreaterThan(
      result.series[0].points[0].size!,
    );
  });

  it("skips rows with non-numeric x or y", () => {
    const data = [
      { x: 1, y: 10 },
      { x: "bad", y: 20 },
      { x: 3, y: null },
      { x: 4, y: 40 },
    ];
    const result = normalizeScatterData(data, { x: "x", y: "y" });
    expect(result.series[0].points).toHaveLength(2);
  });
});
```

**成果物**: scatter固有の型・正規化

---

### Iteration 2: calculateAxisScale の includeZero オプション

**目標**: 散布図用にx軸スケールの 0 包含を無効化できるようにする

**対象ファイル**:
- `src/kt/chart/scale.ts`

**Red（テスト）**:
```typescript
describe("calculateAxisScale with includeZero option", () => {
  it("includes zero by default (backward compatible)", () => {
    const scale = calculateAxisScale([10, 20, 30]);
    expect(scale.min).toBe(0);
  });

  it("does not force include zero when includeZero is false", () => {
    const scale = calculateAxisScale([150, 160, 170, 180], 5, { includeZero: false });
    expect(scale.min).toBeGreaterThan(0);
    expect(scale.min).toBeLessThanOrEqual(150);
    expect(scale.max).toBeGreaterThanOrEqual(180);
  });

  it("still includes zero if data naturally spans zero", () => {
    const scale = calculateAxisScale([-10, 10], 5, { includeZero: false });
    expect(scale.min).toBeLessThanOrEqual(-10);
    expect(scale.max).toBeGreaterThanOrEqual(10);
  });
});
```

**方針**: 既存の bar_chart/area_chart テストが引き続きパスすることを確認

**成果物**: 後方互換な `calculateAxisScale()` 拡張

---

### Iteration 3: 基本SVGレンダリング（単一シリーズ）

**目標**: 単一シリーズの散布図SVG出力（数値x軸 + 数値y軸 + ポイント描画）

**対象ファイル**:
- `src/kt/chart/scatter-chart.ts` (描画部分)

**Red（テスト）**:
```typescript
describe("renderScatterChart", () => {
  it("generates valid SVG with circle elements", () => {
    const html = renderScatterChart([
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 15 },
    ]);
    expect(html).toContain("<svg");
    expect(html).toContain("kt-scatter-chart");
    expect(html).toContain("<circle");
  });

  it("renders numeric x-axis ticks", () => {
    const html = renderScatterChart([
      { x: 100, y: 10 },
      { x: 200, y: 20 },
    ]);
    // x軸に数値目盛りが含まれる
    expect(html).toContain("100");
    expect(html).toContain("200");
  });

  it("renders vertical grid lines for x-axis", () => {
    const html = renderScatterChart(data);
    expect(html).toContain("kt-chart-grid-x");
  });

  it("renders tooltips with x and y values", () => {
    const html = renderScatterChart([{ x: 5, y: 10 }], { x: "x", y: "y" });
    expect(html).toContain("<title>");
    expect(html).toContain("5");
    expect(html).toContain("10");
  });

  it("accepts [number, number][] shorthand", () => {
    const html = renderScatterChart([[1, 10], [2, 20]]);
    expect(html).toContain("<svg");
    expect(html).toContain("<circle");
  });
});
```

**成果物**: 基本的な散布図SVG

---

### Iteration 4: サイズマッピング + 複数シリーズ

**目標**: `size` パラメータによるポイントサイズ変動と複数シリーズ対応

**Red（テスト）**:
```typescript
describe("scatter chart with size mapping", () => {
  it("renders variable-sized points when size is specified", () => {
    const data = [
      { x: 1, y: 10, s: 100 },
      { x: 2, y: 20, s: 500 },
    ];
    const html = renderScatterChart(data, { x: "x", y: "y", size: "s" });
    // 異なるr値が含まれる
    const circles = html.match(/r="[\d.]+"/g);
    expect(circles).not.toBeNull();
    expect(new Set(circles).size).toBeGreaterThan(1);
  });

  it("uses area-proportional sizing", () => {
    // 値が4倍なら面積が4倍 → 半径は2倍
    // 具体的な値は SIZE_RANGE に依存するが、比率をテスト
  });
});

describe("multi-series scatter chart", () => {
  it("renders multiple series with different colors", () => {
    const data = [
      { x: 1, a: 10, b: 20 },
      { x: 2, a: 15, b: 25 },
    ];
    const html = renderScatterChart(data, { x: "x", y: ["a", "b"] });
    expect(html).toContain('data-series="a"');
    expect(html).toContain('data-series="b"');
  });

  it("renders legend for multiple series", () => {
    const html = renderScatterChart(multiSeriesData, { y: ["a", "b"] });
    expect(html).toContain("kt-chart-legend");
    expect(html).toContain("<circle"); // 凡例もcircle
  });
});
```

**成果物**: サイズマッピング + 複数シリーズ散布図

---

### Iteration 5: kt.scatter_chart 統合 + CSS

**目標**: `kt.scatter_chart()` として使える完全な関数とスタイル

**対象ファイル**:
- `src/kt/charts.ts` (scatter_chart 関数追加)
- `src/kt/index.ts` (エクスポート追加)
- `src/styles/default.ts` (scatterChartStyles 追加)

**Red（テスト）**:
```typescript
describe("kt.scatter_chart", () => {
  let ctx: RenderContext;

  beforeEach(() => {
    ctx = new RenderContext();
    setRenderContext(ctx);
  });

  it("renders chart HTML to context", () => {
    scatter_chart([
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ]);
    const html = ctx.getHtml();
    expect(html).toContain("kt-scatter-chart");
    expect(html).toContain("<svg");
  });

  it("renders with title", () => {
    scatter_chart(data, { title: "My Scatter" });
    expect(ctx.getHtml()).toContain("My Scatter");
  });
});
```

**成果物**: 動作する `kt.scatter_chart()`

---

### Iteration 6: エッジケース・バリデーション

**目標**: 堅牢性の確保

**Red（テスト）**:
```typescript
describe("edge cases", () => {
  it("handles empty data", () => {
    const html = renderScatterChart([]);
    expect(html).toContain("kt-scatter-chart-empty");
  });

  it("handles single data point", () => {
    const html = renderScatterChart([[5, 10]]);
    expect(html).toContain("<svg");
    expect(html).toContain("<circle");
  });

  it("handles all same x values", () => {
    const html = renderScatterChart([[5, 10], [5, 20], [5, 30]]);
    expect(html).toContain("<svg");
  });

  it("handles all same y values", () => {
    const html = renderScatterChart([[1, 10], [2, 10], [3, 10]]);
    expect(html).toContain("<svg");
  });

  it("escapes title for XSS prevention", () => {
    const html = renderScatterChart(data, {
      title: "<script>alert(1)</script>",
    });
    expect(html).not.toContain("<script>");
  });

  it("validates color parameter", () => {
    const html = renderScatterChart(data, {
      color: ["url(javascript:alert(1))"],
    });
    expect(html).not.toContain("javascript:");
  });

  it("clamps opacity to [0, 1]", () => {
    const html = renderScatterChart(data, { opacity: 5 });
    expect(html).toContain('fill-opacity="1"');

    const html2 = renderScatterChart(data, { opacity: -1 });
    expect(html2).toContain('fill-opacity="0"');
  });

  it("limits data points to MAX_DATA_POINTS", () => {
    const large = Array.from(
      { length: 20000 },
      (_, i) => ({ x: i, y: i * 2 }),
    );
    const html = renderScatterChart(large);
    expect(html).toContain("<svg");
  });

  it("limits series to MAX_SERIES", () => {
    // 20を超えるシリーズは制限される
  });
});
```

**成果物**: 堅牢な散布図

---

## 11. 決定事項

| 項目 | 決定 | 理由 |
|------|------|------|
| データ型 | `ScatterChartData = [number, number][] \| ChartData` | xyペアが散布図で最も自然な入力形式 |
| `number[]` ショートハンド | 非対応 | 散布図は2次元データが必須、1次元配列は不自然 |
| `Record<string, number>` | 非対応 | カテゴリ比較ではなく数値関係の可視化が目的 |
| 内部表現 | ポイントベース (`ScatterPoint[]`) | インデックスベース (`values[]`) では x/y 座標の表現に不適 |
| x軸スケール | 数値連続軸 | カテゴリ等間隔配置ではなくデータ値に基づく配置 |
| `includeZero` | `false` (scatter), `true` (既存) | 散布図ではデータ範囲に集中したスケールが適切 |
| `size` パラメータ | カラム名指定、面積比例 | Streamlit互換 + 視覚的に正確な比較 |
| `opacity` パラメータ | デフォルト 0.7 | 散布図は多数のポイントが重なりやすいため |
| `horizontal` パラメータ | 非対応 | 散布図は常にxy座標で描画 |
| `stack` パラメータ | 非対応 | 散布図に積み上げの概念はない |
| `sort` パラメータ | 非対応 | ポイントの描画順序に意味がない |
| null値 | 描画スキップ | 個別ポイントなので分断の概念なし |
| 凡例の形状 | `<circle>` | ポイント形状と一致させる |
| x軸グリッド | 縦方向も描画 | 数値軸として両方向のグリッドが有用 |

---

## 12. チェックリスト

### 実装前
- [ ] `calculateAxisScale()` の `includeZero` 追加が既存テストに影響しないか確認
- [ ] `render-utils.ts` の既存関数で再利用可能な部分を確認
- [ ] CSS クラス命名規則の確認（`kt-chart-*` 共通 vs `kt-scatter-chart-*` 固有）

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
- [ ] `[number, number][]` ショートハンドが動作する
- [ ] 単一シリーズの散布図が正しく描画される
- [ ] 複数シリーズの散布図が正しく描画される
- [ ] サイズマッピングが動作する
- [ ] x軸の数値スケールが正しく計算される
- [ ] x軸・y軸グリッドが描画される
- [ ] 既存チャート（line_chart, bar_chart, area_chart）のテストがパスする

---

## 13. 参考資料

- [Streamlit st.scatter_chart](https://docs.streamlit.io/develop/api-reference/charts/st.scatter_chart)
- [SVG circle](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/circle)
- [Tableau 10 Color Palette](https://www.tableau.com/blog/colors-upgrade-702)
- [面積比例のサイズマッピング](https://en.wikipedia.org/wiki/Bubble_chart)
- 既存設計: `docs/design/line-chart-api.md`, `docs/design/bar-chart-api.md`, `docs/design/area-chart-api.md`
- 既存実装: `src/kt/chart/bar-chart.ts`, `src/kt/chart/area-chart.ts`
