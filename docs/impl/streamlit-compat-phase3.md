# Phase 3: Streamlit API互換性 - 高度な機能

作成日: 2026-01-04

## 概要

Phase 1-2で基本機能を実装した後、Streamlitの高度な機能を追加する。
これらは実装工数が大きいか、外部依存が必要な機能。

---

## 追加機能一覧

| # | 機能 | Streamlit API | 工数 | 依存 |
|---|------|---------------|------|------|
| 1 | cache_data | `@st.cache_data` | 中 | なし |
| 2 | cache_resource | `@st.cache_resource` | 中 | なし |
| 3 | file_uploader | `st.file_uploader()` | 高 | なし |
| 4 | download_button | `st.download_button()` | 中 | なし |
| 5 | dataframe | `st.dataframe()` | 高 | オプション |
| 6 | table | `st.table()` | 中 | なし |
| 7 | line_chart | `st.line_chart()` | 高 | Chart.js等 |
| 8 | bar_chart | `st.bar_chart()` | 高 | Chart.js等 |
| 9 | sidebar | `st.sidebar` | 中 | なし |
| 10 | tabs | `st.tabs()` | 中 | なし |
| 11 | set_page_config | `st.set_page_config()` | 小 | なし |
| 12 | rerun | `st.rerun()` | 小 | なし |

---

## 1. kt.cache_data / kt.cache_resource

### 背景

Streamlitの `@st.cache_data` と `@st.cache_resource` は、
計算結果やリソースをキャッシュしてrerun時の再計算を防ぐ。

### API設計

TypeScriptではデコレータの代わりに高階関数を使用。

```typescript
// Streamlit
@st.cache_data
def load_data():
    return pd.read_csv("data.csv")

// kantan-ui
const loadData = kt.cache_data(() => {
  return readFile("data.csv");
});

// 使用
const data = loadData();
```

### 型定義

```typescript
// cache_data: データをシリアライズしてキャッシュ（セッション間で共有可能）
function cache_data<T>(
  fn: () => T,
  config?: CacheConfig
): () => T;

// cache_resource: リソースを参照でキャッシュ（DB接続など）
function cache_resource<T>(
  fn: () => T,
  config?: CacheConfig
): () => T;

interface CacheConfig {
  ttl?: number;          // Time-to-live (秒)
  maxEntries?: number;   // 最大エントリ数
  key?: string;          // 明示的なキャッシュキー
}
```

### 実装

```typescript
// src/cache/data-cache.ts
const dataCache = new Map<string, { value: unknown; expires: number }>();

export function cache_data<T>(
  fn: () => T,
  config: CacheConfig = {}
): () => T {
  const cacheKey = config.key ?? fn.toString().slice(0, 100);
  const ttl = (config.ttl ?? 3600) * 1000; // デフォルト1時間

  return () => {
    const now = Date.now();
    const cached = dataCache.get(cacheKey);

    if (cached && cached.expires > now) {
      return cached.value as T;
    }

    const value = fn();
    dataCache.set(cacheKey, { value, expires: now + ttl });

    // maxEntries制限
    if (config.maxEntries && dataCache.size > config.maxEntries) {
      const oldest = dataCache.keys().next().value;
      if (oldest) dataCache.delete(oldest);
    }

    return value;
  };
}
```

```typescript
// src/cache/resource-cache.ts
const resourceCache = new Map<string, unknown>();

export function cache_resource<T>(
  fn: () => T,
  config: CacheConfig = {}
): () => T {
  const cacheKey = config.key ?? fn.toString().slice(0, 100);

  return () => {
    if (resourceCache.has(cacheKey)) {
      return resourceCache.get(cacheKey) as T;
    }

    const resource = fn();
    resourceCache.set(cacheKey, resource);
    return resource;
  };
}
```

### 使用例

```typescript
// データキャッシュ
const loadUsers = kt.cache_data(async () => {
  const res = await fetch("/api/users");
  return res.json();
}, { ttl: 300 }); // 5分キャッシュ

// リソースキャッシュ（DB接続など）
const getDb = kt.cache_resource(() => {
  return new Database("connection-string");
});

const script = async () => {
  const users = await loadUsers();
  const db = getDb();
  // ...
};
```

### 成果物

- [ ] `src/cache/data-cache.ts` 作成
- [ ] `src/cache/resource-cache.ts` 作成
- [ ] クリア機能 (`kt.cache_data.clear()`)
- [ ] テスト作成

---

## 2. kt.file_uploader()

### API設計

```typescript
const file = kt.file_uploader("Upload a file", {
  type: ["png", "jpg"],
  multiple: false,
});

if (file) {
  kt.write(`Uploaded: ${file.name} (${file.size} bytes)`);
}
```

### 型定義

```typescript
interface UploadedFile {
  name: string;
  size: number;
  type: string;
  content: ArrayBuffer;
  // ヘルパー
  text(): Promise<string>;
  arrayBuffer(): ArrayBuffer;
}

function file_uploader(
  label: string,
  config?: FileUploaderConfig
): UploadedFile | UploadedFile[] | null;

interface FileUploaderConfig {
  key?: string;
  type?: string[];           // 許可する拡張子
  multiple?: boolean;        // 複数ファイル
  maxSize?: number;          // 最大サイズ（バイト）
  acceptMimeType?: string;   // accept属性
}
```

### 実装方針

1. クライアントでファイルを選択
2. FileReader APIでBase64エンコード
3. WebSocket経由でサーバーに送信
4. サーバーでデコードしてセッション状態に保存
5. スクリプトで `file_uploader()` が呼ばれたときに状態から取得

```typescript
// src/widgets/file-uploader.ts
export function renderFileUploader(
  label: string,
  config: FileUploaderConfig = {}
): string {
  const widgetId = registerWidget(config.key);
  const accept = config.type
    ? config.type.map((t) => `.${t}`).join(",")
    : config.acceptMimeType ?? "";
  const multiple = config.multiple ? " multiple" : "";

  return `
    <div class="kt-widget kt-file-uploader" data-widget-id="${widgetId}">
      <label>
        <span>${escapeHtml(label)}</span>
        <input
          type="file"
          accept="${accept}"
          ${multiple}
          onchange="ktHandleFileUpload('${widgetId}', this.files, ${config.maxSize ?? 0})"
        />
      </label>
    </div>
  `;
}

export function fileUploader(
  label: string,
  config: FileUploaderConfig = {}
): UploadedFile | UploadedFile[] | null {
  const widgetId = registerWidget(config.key);
  const state = getWidgetState<UploadedFile | UploadedFile[]>(widgetId);
  return state ?? null;
}
```

### クライアントサイド

```javascript
async function ktHandleFileUpload(widgetId, files, maxSize) {
  const uploadedFiles = [];

  for (const file of files) {
    if (maxSize && file.size > maxSize) {
      console.error(`File ${file.name} exceeds max size`);
      continue;
    }

    const content = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(content)));

    uploadedFiles.push({
      name: file.name,
      size: file.size,
      type: file.type,
      content: base64,  // Base64エンコード
    });
  }

  ktSendEvent(widgetId, uploadedFiles.length === 1 ? uploadedFiles[0] : uploadedFiles);
}
```

### セキュリティ考慮事項

- 最大ファイルサイズの制限
- 許可するMIMEタイプの検証
- サーバーサイドでのファイル検証
- DoS対策（レート制限との連携）

### 成果物

- [ ] `src/widgets/file-uploader.ts` 作成
- [ ] クライアントサイドのファイル処理
- [ ] Base64エンコード/デコード
- [ ] サイズ制限・型制限
- [ ] テスト作成

---

## 3. kt.download_button()

### API設計

```typescript
kt.download_button(
  "Download CSV",
  data,
  "report.csv",
  { mime: "text/csv" }
);
```

### 型定義

```typescript
function download_button(
  label: string,
  data: string | ArrayBuffer | Blob,
  filename: string,
  config?: DownloadButtonConfig
): boolean;

interface DownloadButtonConfig {
  key?: string;
  mime?: string;
  disabled?: boolean;
}
```

### 実装

```typescript
// src/widgets/download-button.ts
export function renderDownloadButton(
  label: string,
  data: string | ArrayBuffer,
  filename: string,
  config: DownloadButtonConfig = {}
): string {
  const widgetId = registerWidget(config.key);
  const mime = config.mime ?? "application/octet-stream";

  // データをBase64エンコード
  const base64 = typeof data === "string"
    ? btoa(data)
    : btoa(String.fromCharCode(...new Uint8Array(data)));

  const dataUrl = `data:${mime};base64,${base64}`;

  return `
    <div class="kt-widget kt-download-button" data-widget-id="${widgetId}">
      <a
        href="${dataUrl}"
        download="${escapeHtml(filename)}"
        class="kt-button"
        onclick="ktSendEvent('${widgetId}', true)"
      >
        ${escapeHtml(label)}
      </a>
    </div>
  `;
}
```

### 成果物

- [ ] `src/widgets/download-button.ts` 作成
- [ ] 大きなファイルのストリーミング対応（将来）
- [ ] テスト作成

---

## 4. kt.dataframe() / kt.table()

### API設計

```typescript
// シンプルなテーブル（静的）
kt.table(data);

// インタラクティブなデータフレーム（ソート、フィルタ）
kt.dataframe(data, {
  height: 400,
  sortable: true,
});
```

### 型定義

```typescript
type TableData =
  | Record<string, unknown>[]  // オブジェクト配列
  | unknown[][];               // 2D配列
  | { columns: string[]; data: unknown[][] };  // 明示的な形式

function table(data: TableData, config?: TableConfig): void;
function dataframe(data: TableData, config?: DataFrameConfig): void;

interface TableConfig {
  headers?: string[];
}

interface DataFrameConfig extends TableConfig {
  height?: number;
  sortable?: boolean;
  filterable?: boolean;
}
```

### 実装

```typescript
// src/kt/data.ts
export function table(data: TableData, config: TableConfig = {}): void {
  const ctx = getRenderContext();
  const { headers, rows } = normalizeTableData(data, config.headers);

  ctx.append(`<table class="kt-table">`);

  // ヘッダー
  if (headers.length) {
    ctx.append(`<thead><tr>`);
    headers.forEach((h) => ctx.append(`<th>${escapeHtml(String(h))}</th>`));
    ctx.append(`</tr></thead>`);
  }

  // ボディ
  ctx.append(`<tbody>`);
  rows.forEach((row) => {
    ctx.append(`<tr>`);
    row.forEach((cell) => ctx.append(`<td>${escapeHtml(String(cell))}</td>`));
    ctx.append(`</tr>`);
  });
  ctx.append(`</tbody></table>`);
}

function normalizeTableData(
  data: TableData,
  explicitHeaders?: string[]
): { headers: string[]; rows: unknown[][] } {
  if (Array.isArray(data) && data.length > 0) {
    if (Array.isArray(data[0])) {
      // 2D配列
      return { headers: explicitHeaders ?? [], rows: data as unknown[][] };
    }
    // オブジェクト配列
    const headers = explicitHeaders ?? Object.keys(data[0] as Record<string, unknown>);
    const rows = data.map((obj) =>
      headers.map((h) => (obj as Record<string, unknown>)[h])
    );
    return { headers, rows };
  }
  return { headers: [], rows: [] };
}
```

### dataframe（インタラクティブ版）

```typescript
export function dataframe(data: TableData, config: DataFrameConfig = {}): void {
  const ctx = getRenderContext();
  const widgetId = registerWidget();
  const { headers, rows } = normalizeTableData(data, config.headers);
  const height = config.height ?? 400;

  ctx.append(`
    <div class="kt-dataframe" data-widget-id="${widgetId}"
         style="height: ${height}px; overflow: auto;">
      <table class="kt-dataframe-table">
        <thead>
          <tr>
            ${headers.map((h, i) => `
              <th onclick="ktSortDataframe('${widgetId}', ${i})"
                  style="cursor: ${config.sortable ? 'pointer' : 'default'}">
                ${escapeHtml(String(h))}
              </th>
            `).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>${row.map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join("")}</tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `);
}
```

### 成果物

- [ ] `src/kt/data.ts` 作成
- [ ] `table` 関数実装
- [ ] `dataframe` 関数実装（ソート機能）
- [ ] CSS（スクロール、ストライプ行）
- [ ] テスト作成

---

## 5. kt.line_chart() / kt.bar_chart()

### 方針

外部ライブラリ（Chart.js, ECharts等）への依存を最小限にする選択肢:

1. **SVG直接生成**: 依存なし、機能限定
2. **Chart.js連携**: オプショナル依存、フル機能
3. **iframe埋め込み**: 外部サービス活用

### API設計

```typescript
kt.line_chart(data, { title: "Sales over time" });
kt.bar_chart(data, { title: "Sales by category" });
```

### 型定義

```typescript
type ChartData =
  | number[]
  | { x: string | number; y: number }[]
  | { labels: string[]; datasets: { label: string; data: number[] }[] };

function line_chart(data: ChartData, config?: ChartConfig): void;
function bar_chart(data: ChartData, config?: ChartConfig): void;

interface ChartConfig {
  title?: string;
  width?: number;
  height?: number;
  xLabel?: string;
  yLabel?: string;
}
```

### 実装（SVG版 - 依存なし）

```typescript
// src/kt/charts.ts
export function line_chart(data: ChartData, config: ChartConfig = {}): void {
  const ctx = getRenderContext();
  const { points, labels } = normalizeChartData(data);
  const width = config.width ?? 600;
  const height = config.height ?? 300;
  const padding = 40;

  const maxY = Math.max(...points);
  const minY = Math.min(...points);
  const yRange = maxY - minY || 1;

  const pathPoints = points.map((y, i) => {
    const x = padding + (i / (points.length - 1)) * (width - 2 * padding);
    const yPos = height - padding - ((y - minY) / yRange) * (height - 2 * padding);
    return `${i === 0 ? "M" : "L"} ${x} ${yPos}`;
  }).join(" ");

  ctx.append(`
    <div class="kt-chart kt-line-chart">
      ${config.title ? `<div class="kt-chart-title">${escapeHtml(config.title)}</div>` : ""}
      <svg width="${width}" height="${height}">
        <!-- Grid lines -->
        <g class="kt-chart-grid" stroke="#eee">
          ${Array.from({ length: 5 }, (_, i) => {
            const y = padding + (i / 4) * (height - 2 * padding);
            return `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" />`;
          }).join("")}
        </g>
        <!-- Line -->
        <path d="${pathPoints}" fill="none" stroke="#3498db" stroke-width="2" />
        <!-- Points -->
        ${points.map((y, i) => {
          const x = padding + (i / (points.length - 1)) * (width - 2 * padding);
          const yPos = height - padding - ((y - minY) / yRange) * (height - 2 * padding);
          return `<circle cx="${x}" cy="${yPos}" r="4" fill="#3498db" />`;
        }).join("")}
      </svg>
    </div>
  `);
}
```

### 成果物

- [ ] `src/kt/charts.ts` 作成
- [ ] `line_chart` 実装（SVG版）
- [ ] `bar_chart` 実装（SVG版）
- [ ] オプショナルなChart.js連携
- [ ] テスト作成

---

## 6. kt.sidebar

### API設計

```typescript
// Streamlit
with st.sidebar:
    st.selectbox(...)

// kantan-ui - コールバックスタイル
kt.sidebar(() => {
  kt.header("Settings");
  const theme = kt.selectbox("Theme", ["light", "dark"]);
});

// または直接アクセス
kt.sidebar.write("Sidebar content");
kt.sidebar.button("Click me");
```

### 型定義

```typescript
// コールバックスタイル
function sidebar(content: () => void): void;

// 直接アクセス（kt.sidebarがktと同じAPIを持つ）
const sidebar: {
  write: typeof kt.write;
  button: typeof kt.button;
  // ... 他のAPI
};
```

### 実装

```typescript
// src/kt/layout.ts
let sidebarContent: string[] = [];
let isInSidebar = false;

export function sidebar(content: () => void): void {
  isInSidebar = true;
  content();
  isInSidebar = false;
}

export function getSidebarHtml(): string {
  const html = sidebarContent.join("");
  sidebarContent = [];
  return html;
}

export function isSidebarContext(): boolean {
  return isInSidebar;
}
```

```typescript
// src/kt/context.ts - 修正
export function appendToContext(html: string): void {
  if (isSidebarContext()) {
    appendToSidebar(html);
  } else {
    getRenderContext().append(html);
  }
}
```

### レイアウト

```html
<div class="kt-app">
  <aside class="kt-sidebar">
    <!-- sidebarコンテンツ -->
  </aside>
  <main class="kt-main">
    <!-- メインコンテンツ -->
  </main>
</div>
```

### 成果物

- [ ] sidebar関数実装
- [ ] レイアウトCSS
- [ ] コンテキスト切り替え
- [ ] テスト作成

---

## 7. kt.tabs()

### API設計

```typescript
// Streamlit
tab1, tab2 = st.tabs(["Tab 1", "Tab 2"])
with tab1:
    st.write("Content 1")
with tab2:
    st.write("Content 2")

// kantan-ui
kt.tabs([
  { label: "Tab 1", content: () => kt.write("Content 1") },
  { label: "Tab 2", content: () => kt.write("Content 2") },
]);

// または
const activeTab = kt.tabs(["Tab 1", "Tab 2"]);
if (activeTab === 0) {
  kt.write("Content 1");
} else {
  kt.write("Content 2");
}
```

### 型定義

```typescript
// Option A: タブ定義配列
interface TabDefinition {
  label: string;
  content: () => void;
}
function tabs(definitions: TabDefinition[], config?: TabsConfig): void;

// Option B: アクティブタブを返す
function tabs(labels: string[], config?: TabsConfig): number;

interface TabsConfig {
  key?: string;
  defaultTab?: number;
}
```

### 実装

```typescript
// src/kt/layout.ts
export function tabs(definitions: TabDefinition[], config: TabsConfig = {}): void {
  const ctx = getRenderContext();
  const widgetId = registerWidget(config.key);
  const activeTab = getWidgetState<number>(widgetId) ?? config.defaultTab ?? 0;

  // タブヘッダー
  ctx.append(`<div class="kt-tabs" data-widget-id="${widgetId}">`);
  ctx.append(`<div class="kt-tabs-header">`);
  definitions.forEach((def, i) => {
    const active = i === activeTab ? "kt-tab-active" : "";
    ctx.append(`
      <button class="kt-tab ${active}"
              onclick="ktSendEvent('${widgetId}', ${i})">
        ${escapeHtml(def.label)}
      </button>
    `);
  });
  ctx.append(`</div>`);

  // タブコンテンツ
  ctx.append(`<div class="kt-tabs-content">`);
  definitions[activeTab]?.content();
  ctx.append(`</div></div>`);
}
```

### 成果物

- [ ] `tabs` 関数実装
- [ ] CSS（タブスタイル）
- [ ] テスト作成

---

## 8. kt.set_page_config()

### API設計

```typescript
kt.set_page_config({
  title: "My App",
  icon: "🚀",
  layout: "wide",
  initialSidebarState: "collapsed",
});
```

### 型定義

```typescript
function set_page_config(config: PageConfig): void;

interface PageConfig {
  title?: string;
  icon?: string;           // ファビコンまたは絵文字
  layout?: "centered" | "wide";
  initialSidebarState?: "auto" | "expanded" | "collapsed";
  menuItems?: { label: string; url: string }[];
}
```

### 実装

```typescript
// src/kt/config.ts
let pageConfig: PageConfig | null = null;

export function set_page_config(config: PageConfig): void {
  if (pageConfig !== null) {
    console.warn("set_page_config should only be called once");
    return;
  }
  pageConfig = config;
}

export function getPageConfig(): PageConfig {
  return pageConfig ?? {};
}
```

### HTMLテンプレートへの反映

```typescript
// src/app.ts
const config = getPageConfig();
const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${config.title ?? "Kantan UI"}</title>
  ${config.icon ? `<link rel="icon" href="${config.icon}">` : ""}
</head>
<body class="${config.layout === 'wide' ? 'kt-layout-wide' : 'kt-layout-centered'}">
  ...
</body>
</html>
`;
```

### 成果物

- [ ] `set_page_config` 関数実装
- [ ] HTMLテンプレート連携
- [ ] レイアウトCSS
- [ ] テスト作成

---

## 9. kt.rerun()

### API設計

```typescript
// 手動でrerunをトリガー
kt.rerun();
```

### 実装

```typescript
// src/kt/control.ts
export function rerun(): never {
  throw new RerunException();
}

// src/runtime/rerun.ts
try {
  script();
} catch (e) {
  if (e instanceof RerunException) {
    // 即座にrerunを実行
    return rerun(script, undefined, sessionId);
  }
  throw e;
}
```

### 成果物

- [ ] `rerun` 関数実装
- [ ] `RerunException` 定義
- [ ] テスト作成

---

## 実装順序

```
Phase 3-A (依存なし・中規模):
├── set_page_config（小）
├── rerun（小）
├── table（中）
├── download_button（中）
└── tabs（中）

Phase 3-B (依存なし・大規模):
├── cache_data / cache_resource（中）
├── sidebar（中）
├── dataframe（中）
└── file_uploader（高）

Phase 3-C (オプショナル依存):
├── line_chart（SVG版）
├── bar_chart（SVG版）
└── Chart.js連携（オプション）
```

---

## 依存戦略

### コア機能（依存なし）

- すべての基本機能は外部依存なしで動作
- SVGベースのシンプルなチャート

### オプショナル連携

```typescript
// プラグイン形式で拡張
import { registerChartPlugin } from "kantan-ui";
import { ChartJsPlugin } from "kantan-ui-chartjs";

registerChartPlugin(ChartJsPlugin);

// これで kt.line_chart がChart.jsを使用
```

### 今後の拡張候補

- `kantan-ui-chartjs`: Chart.js連携
- `kantan-ui-echarts`: ECharts連携
- `kantan-ui-plotly`: Plotly連携
- `kantan-ui-ag-grid`: AG Grid連携（高機能データグリッド）

---

## テスト戦略

### ユニットテスト

- 各機能の個別テスト
- キャッシュのTTL/クリアテスト
- ファイルアップロードのサイズ制限テスト

### E2Eテスト

- ファイルアップロード→ダウンロードの往復
- タブ切り替え
- サイドバーの表示/非表示
- チャートの描画

### パフォーマンステスト

- 大量データでのdataframe表示
- 大きなファイルのアップロード

---

## 完了基準

- [ ] 全12機能の実装完了
- [ ] 各機能のユニットテスト
- [ ] E2Eテストで主要シナリオを確認
- [ ] `bun run lint:fix && bun run ci` パス
- [ ] APIドキュメント整備
- [ ] 使用例（examples/）追加

---

## リスクと考慮事項

### ファイルアップロード

- 大きなファイルのメモリ使用量
- WebSocket経由での転送効率
- 一時ファイルの管理

### キャッシュ

- メモリリーク防止（TTL、maxEntries）
- マルチプロセス時のキャッシュ共有（将来課題）

### チャート

- SVG版の機能制限
- 外部ライブラリ依存時のバンドルサイズ

---

*対象バージョン: kantan-ui v0.4.0 - v0.5.0*
*前提: Phase 1-2完了*
