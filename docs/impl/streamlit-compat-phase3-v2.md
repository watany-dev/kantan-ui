# Phase 3: Streamlit API互換性 - 高度な機能（改訂版）

作成日: 2026-01-04
改訂日: 2026-01-06

## 概要

Phase 1-2で基本機能を実装した後、Streamlitの高度な機能を追加する。
本改訂版では、Web標準とHonoの活用を最大化し、過剰設計を排除した。

---

## 改訂の背景

### 実装済み機能（Phase 3から削除）

以下の機能はすでに実装済みのため、Phase 3の対象から除外:

| 機能 | 実装ファイル | 状態 |
|------|-------------|------|
| tabs | `src/kt/layout.ts` | ✅ 完了 |
| set_page_config | `src/kt/config.ts` | ✅ 完了 |
| rerun | `src/kt/control.ts` | ✅ 完了 |
| download_button | `src/widgets/download-button.ts` | ✅ 完了 |

---

## 追加機能一覧（改訂版）

| # | 機能 | Streamlit API | 工数 | 方針 |
|---|------|---------------|------|------|
| 1 | cache_data | `@st.cache_data` | 小 | 簡略化 |
| 2 | cache_resource | `@st.cache_resource` | 小 | 簡略化 |
| 3 | file_uploader | `st.file_uploader()` | 中 | FormData + Hono |
| 4 | table | `st.table()` | 小 | シンプル実装 |
| 5 | dataframe | `st.dataframe()` | 中 | CSS仮想スクロール |
| 6 | sidebar | `st.sidebar` | 中 | RenderContext拡張 |
| 7 | bar_chart | `st.bar_chart()` | 小 | CSSのみ |
| 8 | line_chart | `st.line_chart()` | 中 | オプショナル依存 |

---

## 1. kt.cache_data / kt.cache_resource（簡略化版）

### 設計方針

- **明示的キー必須**: `fn.toString()` による自動キー生成は廃止
- **TTLのみ**: maxEntriesは削除（複雑なLRU実装を回避）
- **WeakMapの活用**: cache_resourceはWeakMapでGC連携

### API設計

```typescript
// 明示的キーが必須
const loadData = kt.cache_data('users-list', async () => {
  const res = await fetch("/api/users");
  return res.json();
}, { ttl: 300 });

// リソースキャッシュ
const getDb = kt.cache_resource('db-connection', () => {
  return new Database("connection-string");
});
```

### 型定義

```typescript
function cache_data<T>(
  key: string,          // 必須: 明示的なキー
  fn: () => T | Promise<T>,
  config?: { ttl?: number }  // 秒単位、デフォルト3600
): () => T | Promise<T>;

function cache_resource<T>(
  key: string,
  fn: () => T
): () => T;
```

### 実装

```typescript
// src/cache/index.ts
const dataCache = new Map<string, { value: unknown; expires: number }>();
const resourceCache = new Map<string, unknown>();

export function cache_data<T>(
  key: string,
  fn: () => T | Promise<T>,
  config: { ttl?: number } = {}
): () => T | Promise<T> {
  const ttl = (config.ttl ?? 3600) * 1000;

  return () => {
    const now = Date.now();
    const cached = dataCache.get(key);

    if (cached && cached.expires > now) {
      return cached.value as T;
    }

    const result = fn();

    // Promise対応
    if (result instanceof Promise) {
      return result.then((value) => {
        dataCache.set(key, { value, expires: now + ttl });
        return value;
      });
    }

    dataCache.set(key, { value: result, expires: now + ttl });
    return result;
  };
}

export function cache_resource<T>(key: string, fn: () => T): () => T {
  return () => {
    if (resourceCache.has(key)) {
      return resourceCache.get(key) as T;
    }
    const resource = fn();
    resourceCache.set(key, resource);
    return resource;
  };
}

// キャッシュクリア
export function clearDataCache(key?: string): void {
  key ? dataCache.delete(key) : dataCache.clear();
}

export function clearResourceCache(key?: string): void {
  key ? resourceCache.delete(key) : resourceCache.clear();
}
```

### 成果物

- [ ] `src/cache/index.ts` 作成
- [ ] テスト作成

---

## 2. kt.file_uploader()（Web標準 + Hono活用）

### 設計方針

- **FormData + HTTP POST**: Base64 + WebSocket経由を廃止
- **Honoの parseBody()**: マルチパートを簡潔に処理
- **クライアント処理優先**: サーバー保存が不要な場合はクライアントで完結

### API設計

```typescript
const file = kt.file_uploader("Upload a file", {
  type: ["png", "jpg"],
  maxSize: 5 * 1024 * 1024,  // 5MB
});

if (file) {
  kt.write(`Uploaded: ${file.name} (${file.size} bytes)`);
  const text = await file.text();
}
```

### 型定義

```typescript
// Web標準のFileインターフェースを拡張
interface UploadedFile extends File {
  // File APIの標準メソッドがそのまま使える
  // text(): Promise<string>
  // arrayBuffer(): Promise<ArrayBuffer>
  // stream(): ReadableStream
}

interface FileUploaderConfig {
  key?: string;
  type?: string[];       // 許可する拡張子
  multiple?: boolean;
  maxSize?: number;      // バイト単位
}

function file_uploader(
  label: string,
  config?: FileUploaderConfig
): UploadedFile | UploadedFile[] | null;
```

### 実装

#### クライアント側

```typescript
// src/client/file-upload.ts
async function ktHandleFileUpload(widgetId: string, files: FileList, maxSize: number) {
  const formData = new FormData();

  for (const file of files) {
    if (maxSize && file.size > maxSize) {
      console.error(`File ${file.name} exceeds max size (${maxSize} bytes)`);
      continue;
    }
    formData.append('files', file);
  }

  formData.append('widgetId', widgetId);

  // HTTP POSTでアップロード（WebSocket不要）
  const response = await fetch('/_kt/upload', {
    method: 'POST',
    body: formData,
  });

  if (response.ok) {
    // rerunをトリガー
    ktTriggerRerun();
  }
}
```

#### サーバー側（Hono）

```typescript
// src/routes/upload.ts
import type { Hono } from 'hono';

export function registerUploadRoute(app: Hono): void {
  app.post('/_kt/upload', async (c) => {
    const body = await c.req.parseBody({ all: true });
    const files = body['files'];
    const widgetId = body['widgetId'] as string;

    // セッションにファイル情報を保存
    const session = getSession(c);
    const uploadedFiles = Array.isArray(files) ? files : [files];

    session.setWidgetValue(widgetId, uploadedFiles.map(f => ({
      name: (f as File).name,
      size: (f as File).size,
      type: (f as File).type,
      // 必要に応じてコンテンツも保存
    })));

    return c.json({ success: true });
  });
}
```

#### ウィジェット

```typescript
// src/widgets/file-uploader.ts
export function file_uploader(
  label: string,
  config: FileUploaderConfig = {}
): UploadedFile | UploadedFile[] | null {
  const ctx = requireRenderContext();
  const widgetId = generateWidgetId(config.key);

  const accept = config.type?.map(t => `.${t}`).join(',') ?? '';
  const multiple = config.multiple ? ' multiple' : '';
  const maxSize = config.maxSize ?? 0;

  ctx.append(`
    <div class="kt-file-uploader" id="${widgetId}">
      <label>
        <span>${escapeHtml(label)}</span>
        <input
          type="file"
          accept="${accept}"
          ${multiple}
          data-max-size="${maxSize}"
          data-kt-event="file"
        />
      </label>
    </div>
  `);

  return getWidgetValue<UploadedFile | UploadedFile[]>(widgetId) ?? null;
}
```

### 成果物

- [ ] `src/widgets/file-uploader.ts` 作成
- [ ] `src/routes/upload.ts` 作成
- [ ] クライアント側ハンドラー追加
- [ ] テスト作成

---

## 3. kt.table()（シンプル実装）

### 設計方針

- **一括HTML生成**: `ctx.append()` の連発を避ける
- **必要最小限**: ソート・フィルタなしの静的テーブル

### 実装

```typescript
// src/kt/data.ts
type TableData =
  | Record<string, unknown>[]
  | unknown[][];

interface TableConfig {
  headers?: string[];
}

export function table(data: TableData, config: TableConfig = {}): void {
  const ctx = requireRenderContext();
  const { headers, rows } = normalizeTableData(data, config.headers);

  const headerHtml = headers.length
    ? `<thead><tr>${headers.map(h => `<th>${escapeHtml(String(h))}</th>`).join('')}</tr></thead>`
    : '';

  const rowsHtml = rows
    .map(row => `<tr>${row.map(cell => `<td>${escapeHtml(String(cell ?? ''))}</td>`).join('')}</tr>`)
    .join('');

  ctx.append(`<table class="kt-table">${headerHtml}<tbody>${rowsHtml}</tbody></table>`);
}

function normalizeTableData(
  data: TableData,
  explicitHeaders?: string[]
): { headers: string[]; rows: unknown[][] } {
  if (!Array.isArray(data) || data.length === 0) {
    return { headers: [], rows: [] };
  }

  if (Array.isArray(data[0])) {
    return { headers: explicitHeaders ?? [], rows: data as unknown[][] };
  }

  const headers = explicitHeaders ?? Object.keys(data[0] as Record<string, unknown>);
  const rows = data.map(obj =>
    headers.map(h => (obj as Record<string, unknown>)[h])
  );
  return { headers, rows };
}
```

### 成果物

- [ ] `src/kt/data.ts` に追加
- [ ] テスト作成

---

## 4. kt.dataframe()（CSS仮想スクロール）

### 設計方針

- **CSS `content-visibility`**: 大量データでもDOM軽量
- **Web標準のスクロール**: JavaScriptの仮想スクロールライブラリ不要

### 実装

```typescript
// src/kt/data.ts
interface DataFrameConfig extends TableConfig {
  height?: number;
}

export function dataframe(data: TableData, config: DataFrameConfig = {}): void {
  const ctx = requireRenderContext();
  const { headers, rows } = normalizeTableData(data, config.headers);
  const height = config.height ?? 400;

  const headerHtml = headers.length
    ? `<thead><tr>${headers.map(h => `<th>${escapeHtml(String(h))}</th>`).join('')}</tr></thead>`
    : '';

  // content-visibility: auto で画面外の行を遅延レンダリング
  const rowsHtml = rows
    .map(row => `<tr style="content-visibility:auto;contain-intrinsic-size:0 2em">${row.map(cell => `<td>${escapeHtml(String(cell ?? ''))}</td>`).join('')}</tr>`)
    .join('');

  ctx.append(`
    <div class="kt-dataframe" style="height:${height}px;overflow:auto">
      <table class="kt-dataframe-table">${headerHtml}<tbody>${rowsHtml}</tbody></table>
    </div>
  `);
}
```

### 成果物

- [ ] `src/kt/data.ts` に追加
- [ ] CSSスタイル追加
- [ ] テスト作成

---

## 5. kt.sidebar（RenderContext拡張）

### 設計方針

- **グローバルフラグ廃止**: `isInSidebar` のようなグローバル状態を使わない
- **RenderContext拡張**: ターゲット（main/sidebar）をコンテキストで管理

### 実装

```typescript
// src/kt/context.ts に追加
export type RenderTarget = 'main' | 'sidebar';

export class RenderContext {
  private mainBuffer: string[] = [];
  private sidebarBuffer: string[] = [];
  private currentTarget: RenderTarget = 'main';

  append(html: string): void {
    if (this.currentTarget === 'sidebar') {
      this.sidebarBuffer.push(html);
    } else {
      this.mainBuffer.push(html);
    }
  }

  withTarget<T>(target: RenderTarget, fn: () => T): T {
    const prev = this.currentTarget;
    this.currentTarget = target;
    try {
      return fn();
    } finally {
      this.currentTarget = prev;
    }
  }

  getMainHtml(): string {
    return this.mainBuffer.join('');
  }

  getSidebarHtml(): string {
    return this.sidebarBuffer.join('');
  }
}
```

```typescript
// src/kt/layout.ts に追加
export function sidebar(content: () => void): void {
  const ctx = requireRenderContext();
  ctx.withTarget('sidebar', content);
}
```

### レイアウトHTML

```html
<div class="kt-app">
  <aside class="kt-sidebar">${sidebarHtml}</aside>
  <main class="kt-main">${mainHtml}</main>
</div>
```

### 成果物

- [ ] `src/kt/context.ts` 拡張
- [ ] `src/kt/layout.ts` に sidebar 追加
- [ ] レイアウトCSS
- [ ] テスト作成

---

## 6. kt.bar_chart()（CSSのみ）

### 設計方針

- **外部依存ゼロ**: CSSのみで実装
- **必要最小限**: 横棒グラフのみ、ツールチップなし

### 実装

```typescript
// src/kt/charts.ts
type ChartData = number[] | { label: string; value: number }[];

interface BarChartConfig {
  title?: string;
  color?: string;
}

export function bar_chart(data: ChartData, config: BarChartConfig = {}): void {
  const ctx = requireRenderContext();
  const items = normalizeChartData(data);
  const max = Math.max(...items.map(i => i.value), 1);
  const color = config.color ?? '#3498db';

  const bars = items
    .map(item => {
      const pct = (item.value / max) * 100;
      const label = item.label ? `<span class="kt-bar-label">${escapeHtml(item.label)}</span>` : '';
      return `
        <div class="kt-bar-row">
          ${label}
          <div class="kt-bar" style="width:${pct}%;background:${color}">
            <span class="kt-bar-value">${item.value}</span>
          </div>
        </div>
      `;
    })
    .join('');

  const title = config.title ? `<div class="kt-chart-title">${escapeHtml(config.title)}</div>` : '';

  ctx.append(`<div class="kt-bar-chart">${title}${bars}</div>`);
}

function normalizeChartData(data: ChartData): { label: string; value: number }[] {
  if (typeof data[0] === 'number') {
    return (data as number[]).map((v, i) => ({ label: String(i + 1), value: v }));
  }
  return data as { label: string; value: number }[];
}
```

### CSS

```css
.kt-bar-chart {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.kt-bar-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.kt-bar-label {
  min-width: 80px;
  text-align: right;
}
.kt-bar {
  height: 1.5rem;
  border-radius: 2px;
  display: flex;
  align-items: center;
  padding-left: 0.5rem;
  color: white;
  font-size: 0.875rem;
  transition: width 0.3s ease;
}
```

### 成果物

- [ ] `src/kt/charts.ts` 作成
- [ ] CSSスタイル追加
- [ ] テスト作成

---

## 7. kt.line_chart()（オプショナル依存）

### 設計方針

- **コア**: シンプルなSVG折れ線グラフ（依存なし）
- **拡張**: Chart.js等はプラグインとして別パッケージ

### 実装（コア版）

```typescript
// src/kt/charts.ts
interface LineChartConfig {
  title?: string;
  width?: number;
  height?: number;
}

export function line_chart(data: number[], config: LineChartConfig = {}): void {
  const ctx = requireRenderContext();
  const width = config.width ?? 400;
  const height = config.height ?? 200;
  const padding = 20;

  if (data.length === 0) {
    ctx.append('<div class="kt-line-chart kt-empty">No data</div>');
    return;
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((v - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  const title = config.title ? `<div class="kt-chart-title">${escapeHtml(config.title)}</div>` : '';

  ctx.append(`
    <div class="kt-line-chart">
      ${title}
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <polyline points="${points}" fill="none" stroke="#3498db" stroke-width="2" />
      </svg>
    </div>
  `);
}
```

### 将来の拡張（別パッケージ）

```typescript
// kantan-ui-chartjs (別パッケージ)
import { registerChartPlugin } from 'kantan-ui';
import Chart from 'chart.js/auto';

registerChartPlugin({
  name: 'chartjs',
  line_chart: (data, config) => {
    // Chart.jsを使った高機能版
  },
  bar_chart: (data, config) => {
    // Chart.jsを使った高機能版
  },
});
```

### 成果物

- [ ] `src/kt/charts.ts` に line_chart 追加
- [ ] テスト作成
- [ ] （将来）プラグイン機構の設計

---

## 実装順序

```
Phase 3-A (小規模・基盤):
├── cache_data / cache_resource（小）
├── table（小）
└── bar_chart（小）

Phase 3-B (中規模):
├── dataframe（中）
├── sidebar（中）
├── line_chart（中）
└── file_uploader（中）
```

---

## 削除した機能と理由

| 機能 | 理由 |
|------|------|
| tabs | すでに `src/kt/layout.ts` で実装済み |
| set_page_config | すでに `src/kt/config.ts` で実装済み |
| rerun | すでに `src/kt/control.ts` で実装済み |
| download_button | すでに `src/widgets/download-button.ts` で実装済み |
| maxEntries (cache) | LRU実装が複雑、TTLのみで十分 |
| 自動キー生成 (cache) | `fn.toString()` は信頼性が低い |
| Base64アップロード | FormData + HTTP POSTの方が効率的 |
| SVG独自グリッド線 | 過剰、シンプルな折れ線のみで十分 |

---

## 完了基準

- [ ] 全8機能の実装完了
- [ ] 各機能のユニットテスト
- [ ] E2Eテストで主要シナリオを確認
- [ ] `bun run lint:fix && bun run ci` パス

---

*対象バージョン: kantan-ui v0.4.0*
*前提: Phase 1-2完了*
