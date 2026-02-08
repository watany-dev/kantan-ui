# ScatterChart API 設計書

## 実装ステータス

> **設計中** (2026-02-08)
>
> API設計フェーズ。実装未着手。

---

## 1. 概要

### 1.1 目的

Streamlit風の散布図表示API `kt.scatter_chart()` をkantan-uiに実装する。2つの数値変数間の関係性・分布・クラスタリングを視覚的に表示するチャートコンポーネント。

### 1.2 Streamlit互換性

```python
# Streamlit
import pandas as pd
import numpy as np

df = pd.DataFrame(np.random.randn(20, 3), columns=["a", "b", "c"])
st.scatter_chart(df)

# カラム指定
st.scatter_chart(df, x="height", y="weight", color="gender", size="age")
```

### 1.3 設計原則

| 原則 | 説明 |
|------|------|
| **ゼロ依存** | 外部チャートライブラリ不要。SVGで完結 |
| **サーバーサイド描画** | HTMLテンプレートとしてSVGを生成。クライアントJS不要 |
| **既存チャート基盤の再利用** | scale.ts, colors.ts, render-utils.ts を活用 |
| **段階的な複雑さ** | 1引数で動作し、configで段階的に拡張可能 |
| **Web標準** | SVG + CSS のみ |

### 1.4 Streamlit との差分

| 項目 | Streamlit | kantan-ui | 理由 |
|------|-----------|-----------|------|
| 描画エンジン | Vega-Lite (Altair) | SVG (サーバーサイド生成) | ゼロ依存の方針 |
| データ形式 | Pandas DataFrame | `ScatterChartData` (配列/オブジェクト) | TypeScriptネイティブ |
| `color` の二重用途 | カラム名 or カラー値 | カラム名 or カラー値 (同一) | Streamlit互換 |
| `color` long format | カラム値がHEX文字列→直接色適用 | 非対応（常にグループ分けとして扱う） | 複雑すぎるため初期版では省略 |
| `size` | カラム名のみ | カラム名 or 固定値（number） | TypeScript向けに利便性向上 |
| `width` / `use_container_width` | 両方対応 | コンテナ幅追従のみ（`use_container_width` 非サポート） | SVG viewBoxで十分 |
| `x_column` / `y_column` | 旧パラメータ名（非推奨） | 非サポート（`x` / `y` のみ） | 新しいAPI名で統一 |
| ツールチップ | Vega-Lite組み込み（リッチ） | CSS `<title>` (シンプル) | 段階的実装。将来拡張候補 |

### 1.5 既存チャートとの差異

散布図は他のチャートタイプ（line, bar, area）と根本的に異なる点がある:

| 観点 | line/bar/area chart | scatter chart |
|------|---------------------|---------------|
| x軸 | カテゴリ or 等間隔数値 | **連続数値（任意位置）** |
| データ構造 | 共通xValuesに対して各seriesのvalues[] | **各ポイントが独立した(x, y)座標** |
| 正規化パイプライン | `normalizeChartData()` → `NormalizedBarChartData` | **専用の `normalizeScatterData()`** |
| x軸描画 | `renderXAxis()` (カテゴリラベル等間隔配置) | **`renderNumericXAxis()` (数値目盛り)** |
| グリッド | 水平のみ（y軸ticks） | **水平 + 垂直（両軸ticks）** |
| SVG要素 | `<rect>`, `<path>` | **`<circle>`** |
| ポイントサイズ | 固定 | **可変（`size`パラメータ）** |
| グルーピング | y列による自動グループ | **y列 or `color`カラム名によるグループ** |

### 1.6 スコープ外（将来拡張候補）

以下の機能は初期実装のスコープ外とし、将来のイテレーションで検討する:

| 機能 | 理由 | 優先度 |
|------|------|--------|
| トレンドライン / 回帰線 | 統計計算ロジックの追加が必要 | P2 |
| ズーム / パン | クライアントJSが必要（サーバーサイド描画の方針と矛盾） | P3 |
| データブラシ（範囲選択） | インタラクティブ機能のためクライアントJSが必要 | P3 |
| ツールチップのカスタマイズ | CSS `<title>` による簡易ツールチップで初期版は十分 | P2 |
| 対数スケール | `calculateAxisScale` の大幅拡張が必要 | P2 |
| long format での color 直接適用 | Streamlitはカラム値がHEX文字列の場合に直接色として使用するが、複雑すぎるため非サポート | P3 |

### 1.7 共有モジュール

| モジュール | 役割 | 共有状況 |
|-----------|------|---------|
| `src/kt/chart/types.ts` | 型定義 | 共通型 + scatter固有型を**追加** |
| `src/kt/chart/colors.ts` | カラーパレット・バリデーション | **完全共有** |
| `src/kt/chart/scale.ts` | 軸スケール計算 | **完全共有** (x軸・y軸両方で使用) |
| `src/kt/chart/render-utils.ts` | グリッド・軸・凡例の共通描画 | **拡張** (数値x軸・垂直グリッド追加) |
| `src/kt/chart/normalize.ts` | データ正規化 | **不使用** (scatter専用の正規化を実装) |
| `src/kt/chart/scatter-chart.ts` | 散布図描画 | **scatter固有** |

---

## 2. API設計

### 2.1 シグネチャ

```typescript
function scatter_chart(data: ScatterChartData, config?: Partial<ScatterChartConfig>): void;
```

> **注**: 既存チャート（bar_chart, area_chart）と同様に `Partial<>` でラップする。全プロパティがオプショナルなため実質的な差はないが、型定義では `@default` 付きのプロパティを required として定義できる余地を残す。

### 2.2 データ型

```typescript
/**
 * 散布図のデータ型
 * 散布図はx, yの両軸が数値のため、number[]ショートハンドは非サポート
 */
type ScatterChartData =
  | Record<string, unknown>[]                   // (1) オブジェクト配列
  | unknown[][]                                 // (2) 2D配列（各行が1データポイント）
  | { columns: string[]; data: unknown[][] };   // (3) 明示的形式
```

`number[]` と `Record<string, number>` のショートハンドは非サポート。散布図はx, yの2次元データが本質であり、1次元の値配列やkey-valueマップでは意味を成さない。

### 2.3 Config

```typescript
/**
 * kt.scatter_chart() の設定オプション
 */
export interface ScatterChartConfig {
  /**
   * x軸に使用するカラム名
   * 未指定の場合:
   * - オブジェクト配列: 最初の数値カラム
   * - 2D配列: 最初の列（index 0）
   */
  x?: string;

  /**
   * y軸に使用するカラム名（単一または複数）
   * 未指定の場合: x以外の全数値カラム
   *
   * 複数カラム指定時、各カラムが1グループとなり色分けされる
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
   * ポイントの色指定（2つの用途）
   *
   * 1. カラム名（string）: データ中のカラムと一致する場合、
   *    そのカラムの値でグループ分けし自動配色
   *    例: color: "species" → species列の値ごとに色分け
   *
   * 2. カラー値（string | string[]）: データ中のカラムに一致しない場合、
   *    直接色として適用
   *    例: color: "#ff0000" → 全ポイント赤
   *    例: color: ["#4e79a7", "#e15759"] → 各グループに適用
   *
   * 判定ロジック:
   * - string型で、データのカラム名に一致 → グループ分けカラム
   * - string型で、カラム名に不一致 → 色として適用
   * - string[]型 → 色配列として適用
   */
  color?: string | string[];

  /**
   * ポイントサイズ
   *
   * - string: カラム名（値に応じてサイズが変化するバブルチャート）
   * - number: 全ポイントに適用する固定半径（px）
   *   - 負値・0の場合はデフォルト値にフォールバック
   *   - SIZE_RANGE.max（20）を超える場合はクランプ
   * @default 5
   */
  size?: string | number;

  /**
   * チャートの高さ（px）
   * - 0以下の場合はデフォルト値（400）にフォールバック
   * @default 400
   */
  height?: number;

  /**
   * チャートのタイトル
   */
  title?: string;

  /**
   * ポイントの透明度
   * データが多い場合に重なりを視認するため
   * - 有効範囲: 0 < opacity <= 1
   * - 範囲外の場合はデフォルト値にフォールバック
   * @default 0.7
   */
  opacity?: number;
}
```

### 2.4 使用例

```typescript
import { kt } from "kantan-ui";

// ===== Level 1: 最小構成（2D配列） =====
// 各行が [x, y] ペア
kt.scatter_chart([
  [1, 5],
  [2, 8],
  [3, 6],
  [4, 9],
  [5, 7],
]);

// ===== Level 2: オブジェクト配列 =====
kt.scatter_chart([
  { height: 170, weight: 65 },
  { height: 160, weight: 55 },
  { height: 180, weight: 80 },
  { height: 175, weight: 72 },
]);

// ===== Level 3: x/y カラム指定 =====
kt.scatter_chart(data, {
  x: "height",
  y: "weight",
  x_label: "身長 (cm)",
  y_label: "体重 (kg)",
  title: "身長と体重の関係",
});

// ===== Level 4: 複数yカラム（グループ化） =====
// 各yカラムが1グループとなり色分けされる
kt.scatter_chart([
  { x: 1, math: 85, science: 90 },
  { x: 2, math: 70, science: 75 },
  { x: 3, math: 95, science: 88 },
], {
  x: "x",
  y: ["math", "science"],
  color: ["#4e79a7", "#e15759"],
});

// ===== Level 5: カラーカラム（カテゴリ別グルーピング） =====
// color にカラム名を指定 → そのカラムの値でグループ化
kt.scatter_chart([
  { height: 170, weight: 65, species: "A" },
  { height: 160, weight: 55, species: "B" },
  { height: 180, weight: 80, species: "A" },
  { height: 155, weight: 50, species: "B" },
], {
  x: "height",
  y: "weight",
  color: "species",  // ← "species"カラムの値で色分け
});

// ===== Level 6: バブルチャート（サイズ可変） =====
kt.scatter_chart([
  { gdp: 50000, lifeExp: 80, population: 330 },
  { gdp: 40000, lifeExp: 84, population: 126 },
  { gdp: 10000, lifeExp: 75, population: 1400 },
], {
  x: "gdp",
  y: "lifeExp",
  size: "population",   // ← "population"カラムの値でサイズ変動
  x_label: "GDP per capita ($)",
  y_label: "Life Expectancy (years)",
  title: "GDP vs Life Expectancy",
});

// ===== Level 7: カスタム色 + 固定サイズ =====
kt.scatter_chart(data, {
  x: "x",
  y: "y",
  color: "#e15759",   // 全ポイント赤
  size: 8,            // 半径8px固定
  opacity: 0.5,
});

// ===== Level 8: レイアウトとの組み合わせ =====
kt.columns(2, (cols) => {
  cols[0](() => {
    kt.subheader("Math vs Science");
    kt.scatter_chart(examData, {
      x: "math",
      y: "science",
      height: 250,
    });
  });
  cols[1](() => {
    kt.subheader("Height vs Weight");
    kt.scatter_chart(bodyData, {
      x: "height",
      y: "weight",
      color: "gender",
      height: 250,
    });
  });
});
```

---

## 3. 型定義

### 3.1 ScatterChartData

```typescript
/**
 * 散布図のデータ型
 * ChartData と同一（number[] / Record<string, number> ショートハンドは不要）
 */
export type ScatterChartData = ChartData;
```

| データ型 | line_chart | bar_chart | area_chart | scatter_chart |
|---------|-----------|-----------|------------|---------------|
| `number[]` | **対応** | **対応** | **対応** | 非対応 |
| `Record<string, number>` | 非対応 | **対応** | 非対応 | 非対応 |
| `Record<string, unknown>[]` | **対応** | **対応** | **対応** | **対応** |
| `unknown[][]` | **対応** | **対応** | **対応** | **対応** |
| `{ columns, data }` | **対応** | **対応** | **対応** | **対応** |

### 3.2 ScatterChartConfig

セクション2.3で定義済み。

### 3.3 内部型（scatter固有）

bar/area chartの `NormalizedBarChartData` は xValues + series[].values[] の構造で、全シリーズが同一のxValues配列を共有する。散布図では各ポイントが独立した(x, y)座標を持つため、専用の内部型が必要:

```typescript
/**
 * 正規化後の散布図データ
 */
export interface NormalizedScatterData {
  /** カラーグループ */
  groups: ScatterGroup[];
}

/**
 * 散布図のグループ（同一色のポイント集合）
 */
export interface ScatterGroup {
  /** グループ名（凡例表示用） */
  name: string;
  /** データポイント */
  points: ScatterPoint[];
  /** グループの色 */
  color: string;
}

/**
 * 散布図の1データポイント
 */
export interface ScatterPoint {
  /** x座標（データ空間） */
  x: number;
  /** y座標（データ空間） */
  y: number;
  /** ポイントサイズ（px半径） */
  size: number;
}
```

### 3.4 既存の `NormalizedBarChartData` との比較

```
NormalizedBarChartData:          NormalizedScatterData:
┌─────────────────────┐          ┌──────────────────────┐
│ xValues: [A, B, C]  │          │ groups: [            │
│ series: [           │          │   {                  │
│   { name, values:   │          │     name,            │
│     [10, 20, 30]    │          │     color,           │
│   },                │          │     points: [        │
│   { name, values:   │          │       {x, y, size},  │
│     [15, 25, 35]    │          │       {x, y, size},  │
│   }                 │          │     ]                │
│ ]                   │          │   },                 │
└─────────────────────┘          │   { ... }            │
  ↑ 全seriesが同一xValuesを       │ ]                    │
    共有（インデックス対応）       └──────────────────────┘
                                   ↑ 各ポイントが独立した
                                     (x, y) 座標を持つ
```

---

## 4. データ正規化ルール

### 4.1 正規化フロー

既存の `normalizeChartData()` は使用せず、散布図専用の正規化パイプラインを実装する。

```
入力データ (ScatterChartData)
  ↓
normalizeScatterData(data, config)
  ↓
  ├── resolveScatterColumns()   [x/y/color/sizeカラムの決定]
  ├── extractGroups()           [グループ分け]
  └── mapPointSizes()           [sizeカラムの値→ピクセル半径]
  ↓
NormalizedScatterData { groups[] }
  ↓
resolveChartColors() [src/kt/chart/colors.ts の既存関数]
  ↓
calculateAxisScale() × 2 [x軸・y軸それぞれ]
  ↓
renderScatterChartHtml() [SVG生成]
```

### 4.2 カラム自動判定

```typescript
/**
 * x, y に使用するカラムを自動判定する
 *
 * 散布図固有: 両軸とも数値カラムを使用
 *
 * 1. config.x が指定されていればそれを使用
 * 2. 未指定の場合、最初の数値カラムをxとする
 * 3. config.y が指定されていればそれを使用
 * 4. 未指定の場合、x以外の全数値カラムをyとする
 */
function resolveScatterColumns(
  data: Record<string, unknown>[],
  config?: { x?: string; y?: string | string[]; color?: string; size?: string },
): { xKey: string; yKeys: string[] } {
  const firstRow = data[0];
  if (!firstRow) return { xKey: "", yKeys: [] };

  const keys = Object.keys(firstRow);
  const numericKeys = keys.filter((k) => isNumericColumn(data, k));

  // colorカラム・sizeカラムを除外
  const excludeKeys = new Set<string>();
  if (config?.color && keys.includes(config.color)) {
    excludeKeys.add(config.color);
  }
  if (typeof config?.size === "string" && keys.includes(config.size)) {
    excludeKeys.add(config.size);
  }

  const availableNumeric = numericKeys.filter((k) => !excludeKeys.has(k));

  const xKey = config?.x ?? availableNumeric[0] ?? "";

  const yKeys = config?.y
    ? (Array.isArray(config.y) ? config.y : [config.y])
    : availableNumeric.filter((k) => k !== xKey);

  return { xKey, yKeys };
}
```

### 4.3 `color` パラメータの解決

`color` パラメータは2つの用途を持つ。データのカラム名との一致で自動判定する:

```typescript
/**
 * color パラメータの用途を判定する
 *
 * @returns "column" → カラム名としてグループ分け
 *          "value"  → カラー値として直接適用
 */
function resolveColorUsage(
  color: string | string[] | undefined,
  columnNames: string[],
): { usage: "column"; columnName: string }
  | { usage: "value"; colors: string[] }
  | { usage: "none" } {
  if (color === undefined) return { usage: "none" };

  // string[] → 常にカラー値
  if (Array.isArray(color)) {
    return { usage: "value", colors: color };
  }

  // string → カラム名を優先チェック
  if (columnNames.includes(color)) {
    return { usage: "column", columnName: color };
  }

  // カラム名でなければカラー値として扱う
  return { usage: "value", colors: [color] };
}
```

### 4.4 グループ分けロジック

グループは以下の3パターンで決まる:

| パターン | 条件 | グループの決まり方 |
|---------|------|------------------|
| **yカラム複数** | `y: ["math", "science"]` | 各yカラムが1グループ |
| **colorカラム指定** | `color: "species"` (カラム名) | カラムの一意な値ごとに1グループ |
| **単一グループ** | 上記以外 | 全ポイントが1グループ |

`y`複数と`color`カラムの同時指定は非サポート（`y`複数が優先、`color`カラムは無視）。

```typescript
/**
 * グループ分けを実行する
 */
function extractGroups(
  data: Record<string, unknown>[],
  xKey: string,
  yKeys: string[],
  colorUsage: ReturnType<typeof resolveColorUsage>,
  sizeConfig: string | number | undefined,
  defaultSize: number,
): ScatterGroup[] {
  // パターン1: 複数yカラム → 各カラムがグループ
  if (yKeys.length > 1) {
    return yKeys.map((yKey) => ({
      name: yKey,
      points: data
        .map((row) => toPoint(row, xKey, yKey, sizeConfig, defaultSize))
        .filter((p): p is ScatterPoint => p !== null),
      color: "",  // 後で resolveChartColors で設定
    }));
  }

  const yKey = yKeys[0];
  if (!yKey) return [];

  // パターン2: colorカラム指定 → カラムの値でグループ分け
  if (colorUsage.usage === "column") {
    const groupMap = new Map<string, ScatterPoint[]>();
    for (const row of data) {
      const groupKey = String(row[colorUsage.columnName] ?? "unknown");
      const point = toPoint(row, xKey, yKey, sizeConfig, defaultSize);
      if (point) {
        const list = groupMap.get(groupKey) ?? [];
        list.push(point);
        groupMap.set(groupKey, list);
      }
    }
    return [...groupMap.entries()].map(([name, points]) => ({
      name,
      points,
      color: "",
    }));
  }

  // パターン3: 単一グループ
  return [{
    name: yKey,
    points: data
      .map((row) => toPoint(row, xKey, yKey, sizeConfig, defaultSize))
      .filter((p): p is ScatterPoint => p !== null),
    color: "",
  }];
}

/**
 * 1行からScatterPointを生成
 */
function toPoint(
  row: Record<string, unknown>,
  xKey: string,
  yKey: string,
  sizeConfig: string | number | undefined,
  defaultSize: number,
): ScatterPoint | null {
  const x = Number(row[xKey]);
  const y = Number(row[yKey]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  let size = defaultSize;
  if (typeof sizeConfig === "number") {
    size = sizeConfig;
  } else if (typeof sizeConfig === "string") {
    const rawSize = Number(row[sizeConfig]);
    if (Number.isFinite(rawSize)) {
      size = rawSize;  // mapPointSizes で後処理
    }
  }

  return { x, y, size };
}
```

### 4.5 サイズマッピング

`size` にカラム名を指定した場合、生データの値をピクセル半径に変換する。面積を値に比例させる（知覚的に正しいスケーリング）:

```typescript
/** サイズ範囲（ピクセル半径） */
const SIZE_RANGE = { min: 3, max: 20 };

/**
 * データ値をピクセル半径にマッピング
 *
 * 面積 = π * r² が値に比例するように r = sqrt(normalized * (maxR² - minR²) + minR²)
 */
function mapPointSizes(groups: ScatterGroup[], sizeColumn?: string): void {
  if (!sizeColumn) return;

  const allSizes = groups.flatMap((g) => g.points.map((p) => p.size));
  const minVal = Math.min(...allSizes);
  const maxVal = Math.max(...allSizes);

  if (minVal === maxVal) {
    // 全て同じ値 → 中間サイズ
    const midSize = (SIZE_RANGE.min + SIZE_RANGE.max) / 2;
    for (const g of groups) {
      for (const p of g.points) {
        p.size = midSize;
      }
    }
    return;
  }

  const minArea = SIZE_RANGE.min ** 2;
  const maxArea = SIZE_RANGE.max ** 2;

  for (const g of groups) {
    for (const p of g.points) {
      const normalized = (p.size - minVal) / (maxVal - minVal);
      const area = minArea + normalized * (maxArea - minArea);
      p.size = Math.sqrt(area);
    }
  }
}
```

### 4.6 2D配列の正規化

```typescript
/**
 * 2D配列を散布図用に正規化
 *
 * - 列0: x値
 * - 列1+: 各列がy値（各列が1グループ）
 */
function normalize2DArrayForScatter(
  data: unknown[][],
  config?: ScatterChartConfig,
): NormalizedScatterData {
  if (data.length === 0 || !data[0]) return { groups: [] };

  const numCols = data[0].length;
  if (numCols < 2) return { groups: [] };

  // yカラム数を決定
  const yCols = numCols === 2 ? [1] : Array.from({ length: numCols - 1 }, (_, i) => i + 1);
  const defaultSize = typeof config?.size === "number" ? config.size : 5;

  const groups: ScatterGroup[] = yCols.map((colIdx) => ({
    name: `series_${colIdx}`,
    points: data
      .map((row) => {
        const x = Number(row[0]);
        const y = Number(row[colIdx]);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        return { x, y, size: defaultSize };
      })
      .filter((p): p is ScatterPoint => p !== null),
    color: "",
  }));

  return { groups };
}
```

---

## 5. 描画方式: SVG

### 5.1 HTML/SVG 構造

```html
<figure class="kt-scatter-chart" role="img" aria-label="Scatter chart: GDP vs Life Expectancy">
  <figcaption class="kt-scatter-chart-title">GDP vs Life Expectancy</figcaption>

  <svg viewBox="0 0 600 400" width="100%"
       preserveAspectRatio="xMidYMid meet"
       class="kt-scatter-chart-svg"
       xmlns="http://www.w3.org/2000/svg">

    <title>GDP vs Life Expectancy</title>
    <desc>Scatter chart showing GDP vs Life Expectancy</desc>

    <!-- グリッド線（水平 + 垂直） -->
    <g class="kt-chart-grid">
      <!-- 水平グリッド（y軸ticks） -->
      <line x1="60" y1="50"  x2="580" y2="50" />
      <line x1="60" y1="125" x2="580" y2="125" />
      <!-- ... -->
      <!-- 垂直グリッド（x軸ticks） -->
      <line x1="120" y1="20" x2="120" y2="350" />
      <line x1="240" y1="20" x2="240" y2="350" />
      <!-- ... -->
    </g>

    <!-- x軸（数値目盛り） -->
    <g class="kt-chart-axis-x">
      <line x1="60" y1="350" x2="580" y2="350" />
      <text x="120" y="366" text-anchor="middle">10000</text>
      <text x="240" y="366" text-anchor="middle">20000</text>
      <!-- ... -->
    </g>

    <!-- y軸 -->
    <g class="kt-chart-axis-y">
      <line x1="60" y1="20" x2="60" y2="350" />
      <text x="52" y="354" text-anchor="end">60</text>
      <text x="52" y="204" text-anchor="end">70</text>
      <!-- ... -->
    </g>

    <!-- 軸ラベル -->
    <text class="kt-chart-x-label" x="320" y="390" text-anchor="middle">GDP per capita ($)</text>
    <text class="kt-chart-y-label" x="15" y="185" text-anchor="middle"
          transform="rotate(-90, 15, 185)">Life Expectancy (years)</text>

    <!-- データポイント（グループ別） -->
    <g class="kt-chart-scatter-group" data-group="Group A">
      <circle cx="150" cy="100" r="5" fill="#4e79a7" fill-opacity="0.7">
        <title>Group A: (50000, 80)</title>
      </circle>
      <circle cx="200" cy="120" r="8" fill="#4e79a7" fill-opacity="0.7">
        <title>Group A: (40000, 78)</title>
      </circle>
      <!-- ... -->
    </g>

    <g class="kt-chart-scatter-group" data-group="Group B">
      <circle cx="300" cy="80" r="12" fill="#e15759" fill-opacity="0.7">
        <title>Group B: (30000, 82)</title>
      </circle>
      <!-- ... -->
    </g>

    <!-- 凡例（複数グループ時のみ） -->
    <g class="kt-chart-legend" transform="translate(60, 10)">
      <circle cx="5" cy="5" r="5" fill="#4e79a7" />
      <text x="14" y="9" font-size="11">Group A</text>
      <circle cx="85" cy="5" r="5" fill="#e15759" />
      <text x="94" y="9" font-size="11">Group B</text>
    </g>
  </svg>
</figure>
```

### 5.2 座標変換

データ空間の(x, y)をSVG空間の座標に変換する。bar/area chartではx軸がカテゴリ（等間隔）だったが、散布図では**両軸とも連続数値スケール**:

```typescript
/**
 * データ空間 → SVG空間の変換関数を生成
 */
function createScaleX(
  xScale: AxisScale,
  marginLeft: number,
  plotWidth: number,
): (v: number) => number {
  const range = xScale.max - xScale.min;
  return (v: number) =>
    marginLeft + ((v - xScale.min) / range) * plotWidth;
}

function createScaleY(
  yScale: AxisScale,
  marginTop: number,
  plotHeight: number,
): (v: number) => number {
  const range = yScale.max - yScale.min;
  return (v: number) =>
    marginTop + plotHeight - ((v - yScale.min) / range) * plotHeight;
}
```

### 5.3 数値x軸の描画

既存の `renderXAxis()` はカテゴリラベルを等間隔で配置する。散布図では数値目盛りを使用する新関数が必要:

```typescript
/**
 * 数値x軸を描画する
 *
 * renderXAxis()がカテゴリ軸を描画するのに対し、
 * こちらはcalculateAxisScale()のticksに基づく数値目盛りを描画する
 */
function renderNumericXAxis(
  scale: AxisScale,
  scaleX: (v: number) => number,
  baseY: number,
  marginLeft: number,
  plotWidth: number,
): string {
  const parts: string[] = ['<g class="kt-chart-axis-x">'];
  parts.push(
    `<line x1="${marginLeft}" y1="${baseY}" x2="${marginLeft + plotWidth}" y2="${baseY}" stroke="#dee2e6" stroke-width="1" />`
  );

  for (const tick of scale.ticks) {
    const x = scaleX(tick);
    parts.push(
      `<text x="${x}" y="${baseY + 16}" text-anchor="middle" font-size="11" fill="#6c757d">${formatTickValue(tick)}</text>`
    );
  }

  parts.push("</g>");
  return parts.join("");
}
```

### 5.4 垂直グリッド線

散布図では水平（y軸）に加え、垂直（x軸）のグリッド線も描画する:

```typescript
/**
 * 垂直グリッド線を描画する（x軸ticks用）
 */
function renderVerticalGrid(
  scale: AxisScale,
  scaleX: (v: number) => number,
  marginTop: number,
  plotHeight: number,
): string {
  const parts: string[] = [];
  for (const tick of scale.ticks) {
    const x = scaleX(tick);
    parts.push(
      `<line x1="${x}" y1="${marginTop}" x2="${x}" y2="${marginTop + plotHeight}" stroke="#e9ecef" stroke-width="1" />`
    );
  }
  return parts.join("");
}
```

### 5.5 `calculateAxisScale` の拡張検討

現在の `calculateAxisScale()` は bar/area chart を想定し、`dataMin >= 0` の場合に `min = 0` 固定する。散布図ではこの挙動は不適切:

```
bar chart:  0 |████████████| max   ← 0からの距離が意味を持つ
scatter:    min |  ·  · ·  | max   ← データ範囲にフォーカスしたい
```

**方針**: `calculateAxisScale()` にオプション `includeZero?: boolean` を追加:

```typescript
export function calculateAxisScale(
  values: number[],
  maxTicks = 5,
  options?: { includeZero?: boolean },
): AxisScale {
  // ... 既存ロジック
  // includeZero === false の場合、0を含めるルールをスキップ
  const includeZero = options?.includeZero ?? true;
  if (includeZero) {
    if (dataMin >= 0) dataMin = 0;
    if (dataMax <= 0) dataMax = 0;
  }
  // ...
}
```

scatter chartでは `calculateAxisScale(values, 5, { includeZero: false })` で呼ぶ。既存のbar/area chartへの影響はなし（デフォルト `true`）。

### 5.6 デフォルトカラーパレット

他チャートと共有（Tableau 10 ベース）:

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

### 5.7 ポイント透明度

デフォルト `opacity: 0.7`。データポイントが重なった場合の視認性を確保するため:

- bar chart: 不透明（重ならない構造）
- area chart: `fill-opacity: 0.3`（塗りつぶし面積が大きい）
- scatter chart: `fill-opacity: 0.7`（個別ポイント、適度な重なり視認）

ユーザーが `opacity` を指定した場合はその値を使用。

### 5.8 レスポンシブ対応

```typescript
const svgWidth = 600;  // viewBox内の仮想幅（固定）
const svgHeight = config?.height ?? 400;

`<svg viewBox="0 0 ${svgWidth} ${svgHeight}"
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      class="kt-scatter-chart-svg">`;
```

### 5.9 凡例（散布図用）

散布図の凡例はドット（`<circle>`）を使用する。bar chartの `<rect>` とは異なる:

```typescript
/**
 * 散布図用の凡例を描画
 * 既存 renderLegend() は rect を使用するため、circle版を追加
 */
function renderScatterLegend(
  groups: { name: string; color: string }[],
  startX: number,
  y: number,
): string {
  const parts: string[] = ['<g class="kt-chart-legend">'];
  let x = startX;

  for (const g of groups) {
    parts.push(
      renderHtml`<circle cx="${x + 5}" cy="${y + 5}" r="5" fill="${g.color}" />`
    );
    parts.push(
      renderHtml`<text x="${x + 14}" y="${y + 9}" font-size="11" fill="#495057">${g.name}</text>`
    );
    x += 80;
  }

  parts.push("</g>");
  return parts.join("");
}
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

/* Scatter points */
.kt-chart-scatter-group circle {
  stroke: #fff;
  stroke-width: 1;
  transition: r 0.15s ease, fill-opacity 0.15s ease;
}

.kt-chart-scatter-group circle:hover {
  fill-opacity: 1;
  stroke-width: 2;
}
```

グリッド線、軸、軸ラベル、凡例のCSSは line_chart/bar_chart/area_chart と共有（`.kt-chart-*` クラス名）。

---

## 7. セキュリティ

line_chart/bar_chart/area_chart と同じ方針に加え、scatter固有の対策:

### 7.1 入力エスケープ

- すべてのユーザー入力（タイトル、軸ラベル、カラム名）を `renderHtml` テンプレートタグでエスケープ
- **散布図固有**: `color` カラムから生成されるグループ名もエスケープ対象
  - SVG `data-group` 属性、凡例テキスト、ツールチップの全箇所で `renderHtml` を使用

### 7.2 カラーバリデーション

- 色パラメータは `isValidColor()` でバリデーション（`src/kt/chart/colors.ts` の既存関数）
- 無効な色が指定された場合はデフォルトパレットにフォールバック（例外はスローしない）

### 7.3 データ量の制限

- `MAX_DATA_POINTS: 10_000` - 全グループのポイント合計。超過時はデータを切り詰め
- `MAX_GROUPS: 20` - colorカラムの一意な値数。超過時は先頭20グループのみ描画

### 7.4 数値入力のサニタイズ

- `size`（number指定時）: `<= 0` → デフォルト値（5）にフォールバック、`> SIZE_RANGE.max` → クランプ
- `size`（カラム指定時）: 各ポイントの値は `mapPointSizes()` で `SIZE_RANGE.min`〜`SIZE_RANGE.max` に正規化
  - sizeカラムに負の値が含まれる場合: 全値からmin/maxを算出し正規化するため、負値も有効に処理される
- `opacity`: `<= 0` または `> 1` → デフォルト値（0.7）にフォールバック
- `height`: `<= 0` → デフォルト値（400）にフォールバック

---

## 8. アクセシビリティ

- `<figure>` + `<figcaption>` でセマンティックな構造
- `role="img"` + `aria-label` でスクリーンリーダー対応
- SVG `<title>` + `<desc>` でチャートの説明
- 各データポイントの `<title>` でツールチップ兼読み上げ対応
  - フォーマット: `"グループ名: (x値, y値)"` / サイズ可変時 `"グループ名: (x値, y値) [サイズ値]"`
- カラーパレットはコントラスト比を考慮した配色

---

## 9. ファイル構成

```
src/
  kt/
    chart/
      scatter-chart.ts       # scatter_chart() メイン関数 + SVG描画 + scatter専用正規化
      render-utils.ts        # renderNumericXAxis(), renderVerticalGrid() を追加
      scale.ts               # calculateAxisScale() に includeZero オプション追加
      colors.ts              # カラーパレット・バリデーション（既存共有・変更なし）
      types.ts               # ScatterChartConfig, NormalizedScatterData 等を追加
    charts.ts                # kt.scatter_chart を追加
    index.ts                 # kt.scatter_chart をエクスポート
  styles/
    default.ts               # scatterChartStyles を追加
tests/
  unit/kt/chart/
    scatter-chart.test.ts    # 散布図テスト
    scale.test.ts            # includeZero オプションのテスト追加
```

---

## 10. イテレーション計画

### Iteration 0: `calculateAxisScale` 拡張 + render-utils 追加（Tidy First）

**目標**: scatter chart に必要な共通基盤を既存モジュールに追加

**背景**: scatter chart は x 軸にも数値スケールが必要だが、現在の `calculateAxisScale()` は bar/area chart 向けに 0 を含めるルールがハードコードされている。また `render-utils.ts` に数値 x 軸と垂直グリッドの描画関数がない。

**対象ファイル**:
- `src/kt/chart/scale.ts` (`includeZero` オプション追加)
- `src/kt/chart/render-utils.ts` (`renderNumericXAxis`, `renderVerticalGrid` 追加)

**Red（テスト）**:
```typescript
describe("calculateAxisScale with includeZero option", () => {
  it("includes zero by default (backward compatible)", () => {
    const scale = calculateAxisScale([10, 50]);
    expect(scale.min).toBe(0);
  });

  it("excludes zero when includeZero is false", () => {
    const scale = calculateAxisScale([10, 50], 5, { includeZero: false });
    expect(scale.min).toBeGreaterThan(0);
    expect(scale.min).toBeLessThanOrEqual(10);
  });

  it("still includes zero if data crosses zero", () => {
    const scale = calculateAxisScale([-10, 50], 5, { includeZero: false });
    expect(scale.min).toBeLessThanOrEqual(-10);
    expect(scale.max).toBeGreaterThanOrEqual(50);
  });
});

describe("renderNumericXAxis", () => {
  it("renders numeric tick labels", () => {
    const scale = { min: 0, max: 100, step: 20, ticks: [0, 20, 40, 60, 80, 100] };
    const scaleX = (v: number) => 60 + (v / 100) * 520;
    const svg = renderNumericXAxis(scale, scaleX, 350, 60, 520);
    expect(svg).toContain("kt-chart-axis-x");
    expect(svg).toContain("20");
    expect(svg).toContain("80");
  });
});

describe("renderVerticalGrid", () => {
  it("renders vertical grid lines for x-axis ticks", () => {
    const scale = { min: 0, max: 100, step: 20, ticks: [0, 20, 40, 60, 80, 100] };
    const scaleX = (v: number) => 60 + (v / 100) * 520;
    const svg = renderVerticalGrid(scale, scaleX, 20, 330);
    expect(svg).toContain("<line");
  });
});
```

**方針**:
- 構造的変更のみ（Tidy First の原則）
- 既存の bar_chart/area_chart テストに影響がないことを確認
- `calculateAxisScale` のデフォルト動作を変更しない

**成果物**: scatter chart が使える基盤拡張。既存テスト全パス。

---

### Iteration 1: 型定義 + scatter専用正規化

**目標**: ScatterChart の型定義と、専用の正規化パイプラインの実装

**対象ファイル**:
- `src/kt/chart/types.ts` (`ScatterChartConfig`, `NormalizedScatterData`, `ScatterGroup`, `ScatterPoint` 追加)
- `src/kt/chart/scatter-chart.ts` (正規化部分)

**Red（テスト）**:
```typescript
describe("normalizeScatterData", () => {
  it("normalizes object array with auto column detection", () => {
    const data = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 30 },
    ];
    const result = normalizeScatterData(data);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].points).toHaveLength(3);
    expect(result.groups[0].points[0]).toEqual({ x: 1, y: 10, size: 5 });
  });

  it("normalizes 2D array as [x, y] pairs", () => {
    const data = [[1, 10], [2, 20], [3, 30]];
    const result = normalizeScatterData(data);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].points).toHaveLength(3);
  });

  it("creates groups from multiple y columns", () => {
    const data = [
      { x: 1, math: 85, science: 90 },
      { x: 2, math: 70, science: 75 },
    ];
    const result = normalizeScatterData(data, { x: "x", y: ["math", "science"] });
    expect(result.groups).toHaveLength(2);
    expect(result.groups[0].name).toBe("math");
    expect(result.groups[1].name).toBe("science");
  });

  it("creates groups from color column", () => {
    const data = [
      { x: 1, y: 10, species: "A" },
      { x: 2, y: 20, species: "B" },
      { x: 3, y: 30, species: "A" },
    ];
    const result = normalizeScatterData(data, {
      x: "x", y: "y", color: "species",
    });
    expect(result.groups).toHaveLength(2);
    expect(result.groups[0].name).toBe("A");
    expect(result.groups[0].points).toHaveLength(2);
  });

  it("handles explicit format { columns, data }", () => {
    const data = {
      columns: ["x", "y"],
      data: [[1, 10], [2, 20]],
    };
    const result = normalizeScatterData(data);
    expect(result.groups[0].points).toHaveLength(2);
  });

  it("filters out NaN and Infinity", () => {
    const data = [
      { x: 1, y: 10 },
      { x: NaN, y: 20 },
      { x: 3, y: Infinity },
    ];
    const result = normalizeScatterData(data);
    expect(result.groups[0].points).toHaveLength(1);
  });
});
```

**成果物**: 型定義 + 正規化ロジック

---

### Iteration 2: 基本SVGレンダリング（単一グループ）

**目標**: 単一グループの散布図SVG出力

**対象ファイル**:
- `src/kt/chart/scatter-chart.ts` (描画部分)

**Red（テスト）**:
```typescript
describe("renderScatterChart", () => {
  it("generates valid SVG with circle elements", () => {
    const data = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 30 },
    ];
    const html = renderScatterChart(data);
    expect(html).toContain("<svg");
    expect(html).toContain("<circle");
    expect(html).toContain("kt-scatter-chart");
    expect(html).toContain("kt-chart-scatter-group");
  });

  it("renders numeric x-axis ticks", () => {
    const html = renderScatterChart(data);
    expect(html).toContain("kt-chart-axis-x");
    // 数値ラベルが表示される（カテゴリラベルではない）
  });

  it("renders both horizontal and vertical grid lines", () => {
    const html = renderScatterChart(data);
    expect(html).toContain("kt-chart-grid");
    // 水平 + 垂直のグリッド線
  });

  it("renders tooltips on data points", () => {
    const html = renderScatterChart(data);
    expect(html).toContain("<title>");
    expect(html).toContain("(1, 10)");
  });

  it("accepts 2D array format", () => {
    const html = renderScatterChart([[1, 10], [2, 20]]);
    expect(html).toContain("<svg");
    expect(html).toContain("<circle");
  });

  it("applies default opacity", () => {
    const html = renderScatterChart(data);
    expect(html).toContain('fill-opacity="0.7"');
  });
});
```

**成果物**: 単一グループの散布図SVG

---

### Iteration 3: 複数グループ（y複数 + colorカラム）

**目標**: 複数グループの散布図（色分け + 凡例）

**対象ファイル**:
- `src/kt/chart/scatter-chart.ts` (グループ分け描画、凡例、colorパラメータの二重用途解決)

**Red（テスト）**:
```typescript
describe("multi-group scatter chart", () => {
  it("renders multiple groups with different colors", () => {
    const data = [
      { x: 1, math: 85, science: 90 },
      { x: 2, math: 70, science: 75 },
    ];
    const html = renderScatterChart(data, { x: "x", y: ["math", "science"] });
    expect(html).toContain('data-group="math"');
    expect(html).toContain('data-group="science"');
  });

  it("groups by color column", () => {
    const data = [
      { x: 1, y: 10, species: "A" },
      { x: 2, y: 20, species: "B" },
    ];
    const html = renderScatterChart(data, { x: "x", y: "y", color: "species" });
    expect(html).toContain('data-group="A"');
    expect(html).toContain('data-group="B"');
  });

  it("renders legend for multi-group", () => {
    const data = [
      { x: 1, math: 85, science: 90 },
      { x: 2, math: 70, science: 75 },
    ];
    const html = renderScatterChart(data, { x: "x", y: ["math", "science"] });
    expect(html).toContain("kt-chart-legend");
  });

  it("applies color string as direct color (not column)", () => {
    const data = [{ x: 1, y: 10 }];
    const html = renderScatterChart(data, { color: "#ff0000" });
    expect(html).toContain("#ff0000");
  });

  it("applies color array to groups", () => {
    const data = [
      { x: 1, math: 85, science: 90 },
      { x: 2, math: 70, science: 75 },
    ];
    const html = renderScatterChart(data, {
      x: "x",
      y: ["math", "science"],
      color: ["#4e79a7", "#e15759"],
    });
    expect(html).toContain("#4e79a7");
    expect(html).toContain("#e15759");
  });
});
```

**成果物**: 複数グループの散布図

---

### Iteration 4: サイズ可変（バブルチャート）

**目標**: `size` パラメータで可変サイズのポイント描画

**対象ファイル**:
- `src/kt/chart/scatter-chart.ts` (`mapPointSizes()` 面積比例マッピング、固定サイズ対応)

**Red（テスト）**:
```typescript
describe("bubble chart (variable size)", () => {
  it("maps size column values to pixel radii", () => {
    const data = [
      { x: 1, y: 10, pop: 100 },
      { x: 2, y: 20, pop: 1000 },
      { x: 3, y: 30, pop: 500 },
    ];
    const html = renderScatterChart(data, { x: "x", y: "y", size: "pop" });
    expect(html).toContain("<circle");
    // 異なるr値を持つcircleが存在
    const rValues = html.match(/r="([^"]+)"/g);
    const uniqueR = new Set(rValues);
    expect(uniqueR.size).toBeGreaterThan(1);
  });

  it("applies fixed size when number is given", () => {
    const html = renderScatterChart(data, { size: 8 });
    expect(html).toContain('r="8"');
  });

  it("includes size info in tooltip when size column used", () => {
    const html = renderScatterChart(data, { size: "pop" });
    expect(html).toContain("<title>");
  });

  it("clamps size within valid range", () => {
    // 極端な値でもサイズは3〜20pxにクランプ
    const extremeData = [
      { x: 1, y: 10, pop: 0.001 },
      { x: 2, y: 20, pop: 999999999 },
    ];
    const html = renderScatterChart(extremeData, { x: "x", y: "y", size: "pop" });
    expect(html).toContain("<circle");
  });
});
```

**成果物**: バブルチャート対応

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
  it("renders chart HTML to context", () => {
    const ctx = new RenderContext();
    setRenderContext(ctx);
    scatter_chart([
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ]);
    const html = ctx.getHtml();
    expect(html).toContain("kt-scatter-chart");
    expect(html).toContain("<svg");
  });

  it("renders with title", () => {
    scatter_chart(data, { title: "My Scatter Chart" });
    expect(ctx.getHtml()).toContain("My Scatter Chart");
  });

  it("renders with axis labels", () => {
    scatter_chart(data, {
      x_label: "X Label",
      y_label: "Y Label",
    });
    const html = ctx.getHtml();
    expect(html).toContain("X Label");
    expect(html).toContain("Y Label");
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
    const html = renderScatterChart([{ x: 42, y: 99 }]);
    expect(html).toContain("<svg");
    expect(html).toContain("<circle");
  });

  it("handles all same x values", () => {
    const data = [
      { x: 5, y: 10 },
      { x: 5, y: 20 },
      { x: 5, y: 30 },
    ];
    const html = renderScatterChart(data);
    expect(html).toContain("<svg");
  });

  it("handles all same y values", () => {
    const data = [
      { x: 1, y: 42 },
      { x: 2, y: 42 },
      { x: 3, y: 42 },
    ];
    const html = renderScatterChart(data);
    expect(html).toContain("<svg");
  });

  it("escapes title for XSS prevention", () => {
    const html = renderScatterChart(data, {
      title: "<script>alert(1)</script>",
    });
    expect(html).not.toContain("<script>");
  });

  it("escapes group names from color column", () => {
    const data = [
      { x: 1, y: 10, cat: '<img onerror="alert(1)">' },
    ];
    const html = renderScatterChart(data, { color: "cat" });
    expect(html).not.toContain("onerror");
  });

  it("validates color parameter", () => {
    const html = renderScatterChart(data, {
      color: ["url(javascript:alert(1))"],
    });
    expect(html).not.toContain("javascript:");
  });

  it("limits data points to MAX_DATA_POINTS", () => {
    const large = Array.from({ length: 20000 }, (_, i) => ({ x: i, y: i * 2 }));
    const html = renderScatterChart(large);
    expect(html).toContain("<svg");
  });

  it("limits groups to MAX_GROUPS", () => {
    // 21グループ以上は切り詰め
    const data = Array.from({ length: 21 }, (_, i) => ({
      x: i, y: i, group: `g${i}`,
    }));
    const html = renderScatterChart(data, { color: "group" });
    expect(html).toContain("<svg");
  });

  it("handles negative values on both axes", () => {
    const data = [
      { x: -10, y: -20 },
      { x: 10, y: 20 },
    ];
    const html = renderScatterChart(data);
    expect(html).toContain("<svg");
  });

  it("handles custom opacity", () => {
    const html = renderScatterChart(data, { opacity: 0.3 });
    expect(html).toContain('fill-opacity="0.3"');
  });

  it("falls back on invalid opacity", () => {
    const html = renderScatterChart(data, { opacity: -1 });
    expect(html).toContain('fill-opacity="0.7"');
  });

  it("falls back on opacity > 1", () => {
    const html = renderScatterChart(data, { opacity: 2 });
    expect(html).toContain('fill-opacity="0.7"');
  });

  it("handles height config", () => {
    const html = renderScatterChart(data, { height: 600 });
    expect(html).toContain('viewBox="0 0 600 600"');
  });

  it("falls back on invalid height", () => {
    const html = renderScatterChart(data, { height: -100 });
    expect(html).toContain('viewBox="0 0 600 400"');
  });

  it("falls back on invalid fixed size", () => {
    const html = renderScatterChart(data, { size: -5 });
    // 負のサイズはデフォルト（5）にフォールバック
    expect(html).toContain('r="5"');
  });

  it("handles data with only non-numeric columns", () => {
    const data = [
      { name: "Alice", city: "Tokyo" },
      { name: "Bob", city: "Osaka" },
    ];
    const html = renderScatterChart(data);
    expect(html).toContain("kt-scatter-chart-empty");
  });

  it("handles data where all values are NaN", () => {
    const data = [
      { x: NaN, y: NaN },
      { x: NaN, y: NaN },
    ];
    const html = renderScatterChart(data);
    expect(html).toContain("kt-scatter-chart-empty");
  });

  it("handles size column with negative values", () => {
    const data = [
      { x: 1, y: 10, size: -100 },
      { x: 2, y: 20, size: 100 },
    ];
    const html = renderScatterChart(data, { size: "size" });
    expect(html).toContain("<circle");
    // 面積比例マッピングにより有効なr値が生成される
  });
});
```

**成果物**: 堅牢な散布図

---

## 11. 決定事項

| 項目 | 決定 | 理由 |
|------|------|------|
| データ型 | `ScatterChartData = ChartData` | `number[]`/`Record<string,number>` は散布図に不適 |
| 正規化パイプライン | **scatter専用** (`normalizeScatterData`) | 既存の `normalizeChartData` は共有xValues前提で散布図に不適 |
| 内部表現 | `NormalizedScatterData { groups[] }` | 各ポイントが独立した(x, y)を持つ必要がある |
| x軸 | **数値目盛り** (`renderNumericXAxis`) | 散布図のx軸はカテゴリではなく連続数値 |
| グリッド | **水平 + 垂直** | 散布図は両軸とも連続数値のためフルグリッド |
| `calculateAxisScale` | `includeZero` オプション追加 | 散布図は0を含めると分布が見にくい場合がある |
| `color` の二重用途 | カラム名 or カラー値（自動判定） | Streamlit互換 |
| `size` | カラム名 or 固定数値 | バブルチャート対応 + 利便性 |
| サイズスケーリング | **面積比例** (`r = sqrt(...)`) | 知覚的に正しいスケーリング |
| デフォルト opacity | `0.7` | 個別ポイントの重なり視認性 |
| デフォルト size | `5` (px半径) | 視認性と密度のバランス |
| 凡例アイコン | `<circle>` | 散布図のデータ表現と一致させる |
| `stack` パラメータ | 非対応 | 散布図に積み上げの概念はない |
| `horizontal` パラメータ | 非対応 | x/yを入れ替えれば同等 |
| `sort` パラメータ | 非対応 | 散布図にソートの概念はない |
| y複数 + colorカラム同時指定 | **y複数が優先** | 両方同時は意味的に曖昧 |

---

## 12. チェックリスト

### 実装前
- [ ] `calculateAxisScale()` の `includeZero` 追加が既存テストに影響しないことを確認
- [ ] `render-utils.ts` への関数追加が既存モジュールに影響しないことを確認
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
- [ ] 単一グループの散布図が正しく描画される
- [ ] 複数yカラムでの色分けが動作する
- [ ] colorカラムでの色分けが動作する
- [ ] バブルチャート（size可変）が動作する
- [ ] 数値x軸の目盛りが正しい
- [ ] 垂直 + 水平のグリッド線が描画される
- [ ] 負の値が正しく処理される
- [ ] 0を含まないスケーリングが正しく動作する

---

## 13. 参考資料

- [Streamlit st.scatter_chart](https://docs.streamlit.io/develop/api-reference/charts/st.scatter_chart)
- [SVG circle](https://developer.mozilla.org/en-US/docs/Web/SVG/Element/circle)
- [Tableau 10 Color Palette](https://www.tableau.com/blog/colors-upgrade-702)
- [Perceptual scaling for bubble charts](https://en.wikipedia.org/wiki/Bubble_chart#Encoding)
- 既存設計: `docs/design/line-chart-api.md`, `docs/design/bar-chart-api.md`, `docs/design/area-chart-api.md`
- 既存実装: `src/kt/chart/bar-chart.ts`, `src/kt/chart/area-chart.ts`
