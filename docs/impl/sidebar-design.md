# kt.sidebar 詳細設計

作成日: 2026-01-07

## 概要

Streamlit の `st.sidebar` に相当する機能を kantan-ui に実装する。サイドバーは画面左側に固定表示されるパネルで、ナビゲーション、フィルター、設定などの補助的なUIを配置するために使用される。

---

## 目標

| 項目 | 内容 |
|------|------|
| Streamlit互換 | `st.sidebar` と同等のAPIを提供 |
| 最小依存 | 追加の外部ライブラリ不要 |
| レスポンシブ | モバイル対応（折りたたみ可能） |
| アクセシビリティ | キーボード操作、スクリーンリーダー対応 |

---

## 使用例

### 基本的な使い方

```typescript
import { kt, createApp, createTypedSessionState } from "kantan-ui";

const state = createTypedSessionState({
  theme: "light",
  fontSize: 14,
});

const script = () => {
  // サイドバー
  kt.sidebar(() => {
    kt.title("⚙️ Settings");

    // テーマ選択
    state.theme = kt.selectbox("Theme", ["light", "dark"], {
      defaultValue: state.theme,
    });

    // フォントサイズ調整
    state.fontSize = kt.slider("Font Size", 10, 24, state.fontSize);

    kt.divider();

    // リセットボタン
    if (kt.button("Reset to Defaults")) {
      state.theme = "light";
      state.fontSize = 14;
    }
  });

  // メインコンテンツ
  kt.title("My Application");
  kt.write(`Current theme: ${state.theme}`);
  kt.write(`Font size: ${state.fontSize}px`);
};

export default await createApp(script);
```

**実行結果のイメージ:**

```
┌─────────────────┬────────────────────────────────────┐
│ ⚙️ Settings     │                                    │
│                 │  My Application                    │
│ Theme           │                                    │
│ [light     ▼]   │  Current theme: light              │
│                 │  Font size: 14px                   │
│ Font Size       │                                    │
│ ──●────── 14    │                                    │
│                 │                                    │
│ ─────────────── │                                    │
│                 │                                    │
│ [Reset to       │                                    │
│  Defaults]      │                                    │
│                 │                                    │
└─────────────────┴────────────────────────────────────┘
```

### ナビゲーション付きダッシュボード

```typescript
import { kt, createApp, createTypedSessionState } from "kantan-ui";

const state = createTypedSessionState({
  currentPage: "dashboard",
});

const script = () => {
  // サイドバーでナビゲーション
  kt.sidebar(() => {
    kt.title("📊 Analytics");

    kt.subheader("Navigation");

    if (kt.button("🏠 Dashboard")) {
      state.currentPage = "dashboard";
    }
    if (kt.button("📈 Reports")) {
      state.currentPage = "reports";
    }
    if (kt.button("👥 Users")) {
      state.currentPage = "users";
    }
    if (kt.button("⚙️ Settings")) {
      state.currentPage = "settings";
    }

    kt.divider();

    kt.text(`v1.0.0`);
  });

  // 選択されたページを表示
  switch (state.currentPage) {
    case "dashboard":
      renderDashboard();
      break;
    case "reports":
      renderReports();
      break;
    case "users":
      renderUsers();
      break;
    case "settings":
      renderSettings();
      break;
  }
};

function renderDashboard() {
  kt.title("Dashboard");
  kt.columns([
    () => {
      kt.subheader("Total Users");
      kt.write("1,234");
    },
    () => {
      kt.subheader("Active Sessions");
      kt.write("567");
    },
    () => {
      kt.subheader("Revenue");
      kt.write("$12,345");
    },
  ]);
}

// ... 他のページのレンダリング関数
```

### フィルター付きデータビューア

```typescript
import { kt, createApp, createTypedSessionState } from "kantan-ui";

interface Product {
  name: string;
  category: string;
  price: number;
  inStock: boolean;
}

const products: Product[] = [
  { name: "Laptop", category: "Electronics", price: 999, inStock: true },
  { name: "Chair", category: "Furniture", price: 199, inStock: true },
  { name: "Headphones", category: "Electronics", price: 149, inStock: false },
  // ...
];

const state = createTypedSessionState({
  categoryFilter: "All",
  minPrice: 0,
  maxPrice: 2000,
  inStockOnly: false,
  searchQuery: "",
});

const script = () => {
  // サイドバーでフィルター設定
  kt.sidebar(() => {
    kt.title("🔍 Filters");

    // 検索
    state.searchQuery = kt.text_input("Search", {
      defaultValue: state.searchQuery,
      placeholder: "Product name...",
    });

    // カテゴリフィルター
    const categories = ["All", ...new Set(products.map((p) => p.category))];
    state.categoryFilter = kt.selectbox("Category", categories, {
      defaultValue: state.categoryFilter,
    });

    // 価格範囲
    kt.subheader("Price Range");
    state.minPrice = kt.number_input("Min", {
      defaultValue: state.minPrice,
      min: 0,
    });
    state.maxPrice = kt.number_input("Max", {
      defaultValue: state.maxPrice,
      min: 0,
    });

    // 在庫フィルター
    state.inStockOnly = kt.checkbox("In Stock Only", {
      defaultValue: state.inStockOnly,
    });

    kt.divider();

    if (kt.button("Clear Filters")) {
      state.categoryFilter = "All";
      state.minPrice = 0;
      state.maxPrice = 2000;
      state.inStockOnly = false;
      state.searchQuery = "";
    }
  });

  // フィルター適用
  const filteredProducts = products.filter((p) => {
    if (state.categoryFilter !== "All" && p.category !== state.categoryFilter)
      return false;
    if (p.price < state.minPrice || p.price > state.maxPrice) return false;
    if (state.inStockOnly && !p.inStock) return false;
    if (state.searchQuery && !p.name.toLowerCase().includes(state.searchQuery.toLowerCase()))
      return false;
    return true;
  });

  // メインコンテンツ: 商品一覧
  kt.title("Products");
  kt.write(`Showing ${filteredProducts.length} of ${products.length} products`);

  kt.table(filteredProducts, {
    columns: ["name", "category", "price", "inStock"],
  });
};
```

### チャットアプリケーション

```typescript
import { kt, createApp, createTypedSessionState } from "kantan-ui";

const state = createTypedSessionState({
  currentRoom: "general",
  messages: [] as { room: string; user: string; text: string }[],
});

const rooms = ["general", "random", "help", "announcements"];

const script = () => {
  // サイドバー: ルーム一覧
  kt.sidebar(() => {
    kt.title("💬 Chat Rooms");

    for (const room of rooms) {
      const isActive = state.currentRoom === room;
      const label = isActive ? `● ${room}` : `○ ${room}`;

      if (kt.button(label, { key: `room-${room}` })) {
        state.currentRoom = room;
      }
    }

    kt.divider();

    kt.subheader("Online Users");
    kt.write("• Alice");
    kt.write("• Bob");
    kt.write("• Charlie");
  });

  // メインコンテンツ: チャット
  kt.title(`#${state.currentRoom}`);

  // メッセージ表示
  kt.chat_container(() => {
    const roomMessages = state.messages.filter(
      (m) => m.room === state.currentRoom
    );

    for (const msg of roomMessages) {
      kt.chat_message(msg.text, { name: msg.user, role: "user" });
    }
  });

  // メッセージ入力
  kt.form("chat-form", () => {
    const message = kt.text_input("Message", { key: "message-input" });

    if (kt.form_submit_button("Send") && message) {
      state.messages.push({
        room: state.currentRoom,
        user: "You",
        text: message,
      });
    }
  });
};
```

### PageConfig との組み合わせ

```typescript
import { kt, createApp } from "kantan-ui";

const script = () => {
  // ページ設定でサイドバーの初期状態を指定
  kt.set_page_config({
    title: "My App",
    layout: "wide",
    initialSidebarState: "expanded", // "auto" | "expanded" | "collapsed"
  });

  kt.sidebar(() => {
    kt.title("Menu");
    // ...
  });

  kt.title("Main Content");
};
```

### Streamlit との比較

| Streamlit (Python) | kantan-ui (TypeScript) |
|-------------------|------------------------|
| `with st.sidebar:` | `kt.sidebar(() => { ... })` |
| `st.sidebar.write("text")` | Phase 2: `kt.sidebar.write("text")` |
| `st.sidebar.button("btn")` | Phase 2: `kt.sidebar.button("btn")` |
| `st.set_page_config(initial_sidebar_state="collapsed")` | `kt.set_page_config({ initialSidebarState: "collapsed" })` |

---

## API設計

### 設計方針: 2つのAPI形式

Streamlit の `st.sidebar` は2つの使い方をサポートしている:

```python
# Streamlit の使い方
# 1. コンテキストマネージャー形式
with st.sidebar:
    st.write("サイドバー")

# 2. 直接API形式
st.sidebar.write("サイドバー")
```

TypeScript/kantan-ui では、以下の形式を採用する:

| 形式 | 実装 | 優先度 |
|------|------|--------|
| **コールバック形式** | `kt.sidebar(() => { ... })` | 高（Phase 1） |
| **オブジェクト形式** | `kt.sidebar.write(...)` | 中（Phase 2） |

**推奨: コールバック形式を優先実装**

理由:
1. TypeScript の型安全性が高い
2. スコープが明確でバグを防げる
3. 実装が簡潔

---

### 1. kt.sidebar() - コールバック形式（Phase 1）

```typescript
/**
 * サイドバーにコンテンツを追加
 *
 * @param content - サイドバー内に表示するコンテンツ
 * @param config - オプション設定
 *
 * @example
 * ```typescript
 * kt.sidebar(() => {
 *   kt.title("Settings");
 *   const theme = kt.selectbox("Theme", ["Light", "Dark"]);
 *   kt.divider();
 *   if (kt.button("Reset")) {
 *     // リセット処理
 *   }
 * });
 *
 * // メインコンテンツ
 * kt.title("Main Content");
 * kt.write("This is the main area.");
 * ```
 */
export function sidebar(content: () => void, config?: SidebarConfig): void;

export interface SidebarConfig {
  /** サイドバーの幅（デフォルト: "280px"） */
  width?: string;
}
```

### 2. kt.sidebar オブジェクト形式（Phase 2）

```typescript
/**
 * サイドバーAPIオブジェクト
 * 全ての kt.* API がサイドバー用に利用可能
 *
 * @example
 * ```typescript
 * kt.sidebar.title("Settings");
 * kt.sidebar.selectbox("Theme", ["Light", "Dark"]);
 * kt.sidebar.button("Apply");
 *
 * // メインコンテンツ
 * kt.title("Main Content");
 * ```
 */
export const sidebar: SidebarAPI & ((content: () => void, config?: SidebarConfig) => void);

interface SidebarAPI {
  write: typeof kt.write;
  title: typeof kt.title;
  button: typeof kt.button;
  slider: typeof kt.slider;
  selectbox: typeof kt.selectbox;
  // ... 他の全 kt.* API
}
```

### 3. サイドバー状態管理

```typescript
/**
 * サイドバーの開閉状態を制御
 *
 * @example
 * ```typescript
 * // PageConfigで初期状態を設定
 * kt.set_page_config({
 *   initialSidebarState: "expanded", // "auto" | "expanded" | "collapsed"
 * });
 *
 * // プログラム的に制御（Phase 2）
 * kt.set_sidebar_state("collapsed");
 * ```
 */
```

既存の `PageConfig.initialSidebarState` を活用:

```typescript
// 既存の src/kt/config.ts より
export interface PageConfig {
  title?: string;
  icon?: string;
  layout?: "centered" | "wide";
  initialSidebarState?: "auto" | "expanded" | "collapsed";  // 既に定義済み
  menuItems?: { label: string; url: string }[];
}
```

---

## ネスト呼び出しの挙動

### サポートされるパターン

`kt.sidebar()` はネストして呼び出すことができます。内側の `kt.sidebar()` 呼び出し内のコンテンツも、すべてサイドバーバッファに出力されます。

```typescript
kt.sidebar(() => {
  kt.write("Level 1");

  kt.sidebar(() => {
    kt.write("Level 2 - still in sidebar");
  });

  kt.write("Back to Level 1 - still in sidebar");
});

kt.write("Main content");
```

**出力結果:**
- サイドバー: "Level 1", "Level 2 - still in sidebar", "Back to Level 1 - still in sidebar"
- メイン: "Main content"

### 実装詳細

`kt.sidebar()` は内部で以下の処理を行います：

1. 現在のターゲット（`main` または `sidebar`）を保存
2. ターゲットを `sidebar` に切り替え
3. コールバックを実行
4. ターゲットを元に戻す（`try/finally` で保証）

```typescript
export function sidebar(content: () => void, config?: SidebarConfig): void {
  const ctx = requireRenderContext();
  const previousTarget = ctx.getTarget(); // "main" or "sidebar"
  ctx.setTarget("sidebar");

  try {
    content();
  } finally {
    ctx.setTarget(previousTarget); // 必ず復元
  }
}
```

ネスト呼び出し時：
- 外側の `sidebar()` で `previousTarget = "main"`、`currentTarget = "sidebar"`
- 内側の `sidebar()` で `previousTarget = "sidebar"`、`currentTarget = "sidebar"`
- 内側終了時に `currentTarget = "sidebar"`（変わらず）
- 外側終了時に `currentTarget = "main"`（復元）

### 非推奨パターン

以下のパターンは技術的には動作しますが、コードの可読性のため推奨しません：

```typescript
// 非推奨: 深いネスト
kt.sidebar(() => {
  kt.sidebar(() => {
    kt.sidebar(() => {
      kt.write("Deeply nested");
    });
  });
});

// 推奨: フラットな構造
kt.sidebar(() => {
  kt.write("All sidebar content here");
});
```

### エラーハンドリング

コールバック内で例外が発生しても、ターゲットは正しく復元されます：

```typescript
kt.sidebar(() => {
  kt.write("Before error");
  throw new Error("Something went wrong");
  kt.write("After error"); // 実行されない
});

kt.write("This goes to main"); // ターゲットは正しくmainに戻っている
```

---

## アーキテクチャ設計

### 現状の問題点

現在の `RenderContext` は単一バッファで、全てのHTML出力が1つのバッファに追加される:

```typescript
// 現状: src/kt/context.ts
export class RenderContext {
  private buffer: string[] = [];  // 単一バッファ

  append(html: string): void {
    this.buffer.push(html);
  }

  getHtml(): string {
    return this.buffer.join("\n");
  }
}
```

サイドバーを実装するには、メインエリアとサイドバーエリアを分離する必要がある。

### 設計オプション比較

| オプション | 概要 | メリット | デメリット |
|------------|------|----------|------------|
| **A: デュアルバッファ** | RenderContext に2つのバッファを持つ | シンプル、既存コードへの影響小 | RenderContext の責務増加 |
| **B: ターゲット指定** | append() にターゲットパラメータ追加 | 柔軟性高い | 全ての呼び出し箇所の変更必要 |
| **C: コンテキストスタック** | 入れ子構造でコンテキストを管理 | 将来の拡張性高い | 複雑、オーバーエンジニアリングの恐れ |

**推奨: オプション A（デュアルバッファ）**

理由:
1. 最小限の変更で実現可能
2. 既存の kt.* API は変更不要
3. サイドバー内でのみターゲット切り替え

### 詳細設計: RenderContext の拡張

```typescript
// src/kt/context.ts の拡張

export type RenderTarget = "main" | "sidebar";

export class RenderContext {
  private mainBuffer: string[] = [];
  private sidebarBuffer: string[] = [];
  private currentTarget: RenderTarget = "main";

  // フラッシュ関連（既存）
  private flushCallback: FlushCallback | null = null;
  private flushThreshold = 0;
  private flushedCount = 0;

  /**
   * 現在のターゲットを設定
   */
  setTarget(target: RenderTarget): void {
    this.currentTarget = target;
  }

  /**
   * 現在のターゲットを取得
   */
  getTarget(): RenderTarget {
    return this.currentTarget;
  }

  /**
   * HTMLをバッファに追加（現在のターゲットに応じて振り分け）
   */
  append(html: string): void {
    if (this.currentTarget === "sidebar") {
      this.sidebarBuffer.push(html);
    } else {
      this.mainBuffer.push(html);
      this.maybeFlush();  // ストリーミングはメインのみ
    }
  }

  /**
   * メインエリアのHTMLを取得
   */
  getMainHtml(): string {
    return this.mainBuffer.join("\n");
  }

  /**
   * サイドバーのHTMLを取得
   */
  getSidebarHtml(): string {
    return this.sidebarBuffer.join("\n");
  }

  /**
   * サイドバーが使用されているか
   */
  hasSidebar(): boolean {
    return this.sidebarBuffer.length > 0;
  }

  /**
   * 後方互換性のため維持（メインのみ返す）
   * @deprecated 将来的に getMainHtml() に統一
   */
  getHtml(): string {
    return this.mainBuffer.join("\n");
  }

  /**
   * バッファをクリア
   */
  clear(): void {
    this.mainBuffer = [];
    this.sidebarBuffer = [];
    this.currentTarget = "main";
    this.flushedCount = 0;
  }

  // ... 既存のフラッシュ関連メソッドは維持
}
```

### kt.sidebar() の実装

```typescript
// src/kt/layout.ts に追加

export interface SidebarConfig {
  /** サイドバーの幅（デフォルト: "280px"） */
  width?: string;
}

/**
 * サイドバーにコンテンツを追加
 */
export function sidebar(content: () => void, config?: SidebarConfig): void {
  const ctx = requireRenderContext();

  // ターゲットをサイドバーに切り替え
  const previousTarget = ctx.getTarget();
  ctx.setTarget("sidebar");

  try {
    // コールバックを実行（kt.* はサイドバーバッファに出力される）
    content();
  } finally {
    // ターゲットを元に戻す
    ctx.setTarget(previousTarget);
  }
}
```

### HTML生成の統合（app.ts）

```typescript
// src/app.ts の修正

// rerun() の結果処理を変更
const renderContext = new RenderContext();
// ... スクリプト実行 ...

const mainHtml = renderContext.getMainHtml();
const sidebarHtml = renderContext.getSidebarHtml();
const hasSidebar = renderContext.hasSidebar();

// PageConfig からサイドバー設定を取得
const pageConfig = getPageConfig();
const sidebarState = pageConfig.initialSidebarState ?? "auto";

// レイアウトクラスの決定
const layoutClass = hasSidebar
  ? "kt-layout-sidebar"
  : pageConfig.layout === "wide"
    ? "kt-layout-wide"
    : "kt-layout-centered";

// HTML生成
return c.html(html`
  <!doctype html>
  <html>
    <head>...</head>
    <body class="${layoutClass}">
      ${hasSidebar ? raw(`
        <aside class="kt-sidebar" data-state="${sidebarState}">
          <button class="kt-sidebar-toggle" aria-label="Toggle sidebar">
            <span class="kt-sidebar-toggle-icon"></span>
          </button>
          <div class="kt-sidebar-content">
            ${sidebarHtml}
          </div>
        </aside>
      `) : ''}
      <main class="kt-main">
        <div id="app">${raw(mainHtml)}</div>
      </main>
    </body>
  </html>
`);
```

---

## CSSスタイル設計

```css
/* src/styles/default.ts に追加 */

/** サイドバーレイアウト */
const sidebarStyles = `
  /* サイドバーレイアウトコンテナ */
  .kt-layout-sidebar {
    display: flex;
    min-height: 100vh;
  }

  /* サイドバー */
  .kt-sidebar {
    width: 280px;
    min-width: 280px;
    background: #f8f9fa;
    border-right: 1px solid #e9ecef;
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
    transition: width 0.3s ease, min-width 0.3s ease;
  }

  .kt-sidebar[data-state="collapsed"] {
    width: 0;
    min-width: 0;
    overflow: hidden;
  }

  /* サイドバーコンテンツ */
  .kt-sidebar-content {
    padding: 1rem;
    flex: 1;
  }

  /* サイドバートグルボタン */
  .kt-sidebar-toggle {
    position: absolute;
    top: 1rem;
    right: -12px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: white;
    border: 1px solid #e9ecef;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .kt-sidebar-toggle:hover {
    background: #f8f9fa;
  }

  .kt-sidebar-toggle-icon {
    width: 6px;
    height: 6px;
    border-left: 2px solid #495057;
    border-bottom: 2px solid #495057;
    transform: rotate(45deg);
    transition: transform 0.2s;
  }

  .kt-sidebar[data-state="collapsed"] .kt-sidebar-toggle-icon {
    transform: rotate(-135deg);
  }

  /* メインエリア */
  .kt-layout-sidebar .kt-main {
    flex: 1;
    padding: 0 1rem;
    min-width: 0;
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .kt-sidebar {
      position: fixed;
      left: 0;
      top: 0;
      z-index: 100;
      box-shadow: 2px 0 8px rgba(0,0,0,0.15);
    }

    .kt-sidebar[data-state="collapsed"] {
      transform: translateX(-100%);
      width: 280px;
      min-width: 280px;
    }

    .kt-sidebar-toggle {
      right: -40px;
      width: 40px;
      height: 40px;
      border-radius: 0 4px 4px 0;
    }

    /* オーバーレイ */
    .kt-sidebar-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 99;
    }

    .kt-sidebar:not([data-state="collapsed"]) ~ .kt-sidebar-overlay {
      display: block;
    }

    .kt-layout-sidebar .kt-main {
      width: 100%;
    }
  }
`;
```

---

## クライアントサイド実装

```typescript
// src/client/script.ts に追加

// サイドバートグル処理
function initSidebar(): void {
  const sidebar = document.querySelector('.kt-sidebar');
  const toggle = document.querySelector('.kt-sidebar-toggle');

  if (!sidebar || !toggle) return;

  toggle.addEventListener('click', () => {
    const currentState = sidebar.getAttribute('data-state');
    const newState = currentState === 'collapsed' ? 'expanded' : 'collapsed';
    sidebar.setAttribute('data-state', newState);

    // サーバーに状態を通知（オプション）
    ws.send(JSON.stringify({
      type: 'event',
      widgetId: '__kt_sidebar__',
      value: newState,
    }));
  });

  // モバイル: オーバーレイクリックで閉じる
  const overlay = document.querySelector('.kt-sidebar-overlay');
  overlay?.addEventListener('click', () => {
    sidebar.setAttribute('data-state', 'collapsed');
  });

  // キーボード: Escapeで閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.getAttribute('data-state') !== 'collapsed') {
      sidebar.setAttribute('data-state', 'collapsed');
    }
  });
}
```

---

## rerun.ts の修正

```typescript
// src/runtime/rerun.ts の修正

export interface RerunResult {
  mainHtml: string;
  sidebarHtml: string;
  hasSidebar: boolean;
}

export function rerun(
  script: Script,
  event?: RerunContext["event"],
  sessionId?: string,
  signal?: AbortSignal,
  streaming?: StreamingOptions,
): RerunResult {  // 戻り値の型を変更
  // ... 既存の処理 ...

  try {
    // ... 既存の処理 ...

    const result = script();

    if (typeof result === "string") {
      // 従来のAPIの場合はメインのみ
      return {
        mainHtml: result,
        sidebarHtml: "",
        hasSidebar: false,
      };
    }

    return {
      mainHtml: renderContext.getMainHtml(),
      sidebarHtml: renderContext.getSidebarHtml(),
      hasSidebar: renderContext.hasSidebar(),
    };
  } finally {
    // ... 既存の処理 ...
  }
}
```

---

## 差分アルゴリズムへの影響

サイドバーとメインエリアを別々に差分計算する必要がある:

```typescript
// src/app.ts WebSocket イベント処理

// 新しいHTML生成
const result = rerun(script, { widgetId, value }, session.id);

// メインエリアとサイドバーそれぞれで差分計算
let patches: Patch[] = [];

// メインエリアの差分
if (session.lastMainHtml !== result.mainHtml) {
  const mainDiff = diff(session.lastMainHtml ?? "", result.mainHtml);
  patches.push(...toWebSocketPatches(mainDiff, result.mainHtml, "main"));
}

// サイドバーの差分
if (session.lastSidebarHtml !== result.sidebarHtml) {
  const sidebarDiff = diff(session.lastSidebarHtml ?? "", result.sidebarHtml);
  patches.push(...toWebSocketPatches(sidebarDiff, result.sidebarHtml, "sidebar"));
}

session.lastMainHtml = result.mainHtml;
session.lastSidebarHtml = result.sidebarHtml;
```

---

## ファイル構成

```
src/
├── kt/
│   ├── context.ts          # RenderContext 拡張（デュアルバッファ）
│   ├── layout.ts           # sidebar() 関数追加
│   ├── sidebar.ts          # サイドバーオブジェクト形式（Phase 2）
│   └── index.ts            # エクスポート追加
├── runtime/
│   └── rerun.ts            # RerunResult 型変更
├── session/
│   └── types.ts            # Session に lastSidebarHtml 追加
├── styles/
│   └── default.ts          # sidebarStyles 追加
├── client/
│   └── script.ts           # サイドバートグル処理追加
└── app.ts                  # HTML生成変更、差分計算変更

tests/
├── unit/
│   ├── kt/
│   │   ├── context.test.ts # デュアルバッファテスト
│   │   └── layout.test.ts  # sidebar() テスト追加
│   └── runtime/
│       └── rerun.test.ts   # RerunResult テスト
└── e2e/
    └── sidebar.spec.ts     # サイドバーE2Eテスト
```

---

## 実装フェーズ

### Phase 1: 基本実装（MVP）

| ステップ | 内容 | 優先度 |
|----------|------|--------|
| 1-1 | RenderContext デュアルバッファ化 | 必須 |
| 1-2 | kt.sidebar() コールバック形式実装 | 必須 |
| 1-3 | CSS スタイル追加 | 必須 |
| 1-4 | app.ts HTML生成統合 | 必須 |
| 1-5 | ユニットテスト | 必須 |

### Phase 2: インタラクション

| ステップ | 内容 | 優先度 |
|----------|------|--------|
| 2-1 | クライアントサイド トグル処理 | 高 |
| 2-2 | サイドバー状態のセッション永続化 | 中 |
| 2-3 | キーボードアクセシビリティ | 中 |
| 2-4 | レスポンシブ対応（モバイル） | 高 |

### Phase 3: API拡張

| ステップ | 内容 | 優先度 |
|----------|------|--------|
| 3-1 | kt.sidebar オブジェクト形式 | 低 |
| 3-2 | kt.set_sidebar_state() | 低 |
| 3-3 | サイドバー幅のカスタマイズ | 低 |

---

## テスト計画（TDD）

### RenderContext テスト

```typescript
describe("RenderContext with dual buffer", () => {
  let ctx: RenderContext;

  beforeEach(() => {
    ctx = new RenderContext();
  });

  it("should append to main buffer by default", () => {
    ctx.append("<div>main</div>");
    expect(ctx.getMainHtml()).toBe("<div>main</div>");
    expect(ctx.getSidebarHtml()).toBe("");
  });

  it("should append to sidebar buffer when target is sidebar", () => {
    ctx.setTarget("sidebar");
    ctx.append("<div>sidebar</div>");
    expect(ctx.getSidebarHtml()).toBe("<div>sidebar</div>");
    expect(ctx.getMainHtml()).toBe("");
  });

  it("should switch targets correctly", () => {
    ctx.append("<div>main1</div>");
    ctx.setTarget("sidebar");
    ctx.append("<div>sidebar</div>");
    ctx.setTarget("main");
    ctx.append("<div>main2</div>");

    expect(ctx.getMainHtml()).toBe("<div>main1</div>\n<div>main2</div>");
    expect(ctx.getSidebarHtml()).toBe("<div>sidebar</div>");
  });

  it("should report hasSidebar correctly", () => {
    expect(ctx.hasSidebar()).toBe(false);
    ctx.setTarget("sidebar");
    ctx.append("<div>content</div>");
    expect(ctx.hasSidebar()).toBe(true);
  });

  it("should clear both buffers", () => {
    ctx.append("<div>main</div>");
    ctx.setTarget("sidebar");
    ctx.append("<div>sidebar</div>");
    ctx.clear();

    expect(ctx.getMainHtml()).toBe("");
    expect(ctx.getSidebarHtml()).toBe("");
    expect(ctx.getTarget()).toBe("main");
  });
});
```

### kt.sidebar() テスト

```typescript
describe("kt.sidebar", () => {
  let ctx: RenderContext;

  beforeEach(() => {
    ctx = new RenderContext();
    setRenderContext(ctx);
  });

  afterEach(() => {
    setRenderContext(null);
  });

  it("should render content to sidebar buffer", () => {
    sidebar(() => {
      write("Sidebar content");
    });

    expect(ctx.getSidebarHtml()).toContain("Sidebar content");
    expect(ctx.getMainHtml()).toBe("");
  });

  it("should restore target after callback", () => {
    write("Before");
    sidebar(() => {
      write("Sidebar");
    });
    write("After");

    expect(ctx.getMainHtml()).toContain("Before");
    expect(ctx.getMainHtml()).toContain("After");
    expect(ctx.getSidebarHtml()).toContain("Sidebar");
  });

  it("should support widgets in sidebar", () => {
    sidebar(() => {
      button("Click me");
    });

    expect(ctx.getSidebarHtml()).toContain("kt-button");
    expect(ctx.getSidebarHtml()).toContain("Click me");
  });

  it("should support nested containers in sidebar", () => {
    sidebar(() => {
      expander("Settings", () => {
        write("Hidden content");
      });
    });

    expect(ctx.getSidebarHtml()).toContain("kt-expander");
  });
});
```

### E2Eテスト

```typescript
// e2e/sidebar.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Sidebar", () => {
  test("should render sidebar with content", async ({ page }) => {
    await page.goto("/");
    const sidebar = page.locator(".kt-sidebar");
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toContainText("Settings");
  });

  test("should toggle sidebar on button click", async ({ page }) => {
    await page.goto("/");
    const sidebar = page.locator(".kt-sidebar");
    const toggle = page.locator(".kt-sidebar-toggle");

    await expect(sidebar).not.toHaveAttribute("data-state", "collapsed");
    await toggle.click();
    await expect(sidebar).toHaveAttribute("data-state", "collapsed");
    await toggle.click();
    await expect(sidebar).not.toHaveAttribute("data-state", "collapsed");
  });

  test("should handle widget interactions in sidebar", async ({ page }) => {
    await page.goto("/");
    const sidebarButton = page.locator(".kt-sidebar .kt-button");
    await sidebarButton.click();
    // イベント処理の確認
  });

  test("should be responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    const sidebar = page.locator(".kt-sidebar");
    // モバイルでは初期状態で閉じている
    await expect(sidebar).toHaveAttribute("data-state", "collapsed");
  });
});
```

---

## 後方互換性

### 影響なし

- 既存の kt.* API は変更なし
- RenderContext.getHtml() は引き続き動作（メインのみ返す）
- サイドバーを使用しないスクリプトは変更不要

### 注意点

- rerun() の戻り値型が変更されるため、app.ts の修正が必要
- Session 型に lastSidebarHtml が追加される

---

## セキュリティ考慮事項

| 項目 | 対策 |
|------|------|
| XSS | サイドバー内のコンテンツも既存のエスケープ処理を適用 |
| クリックジャッキング | サイドバーは同一オリジン内でのみ表示 |
| 状態改ざん | サイドバー状態はサーバーサイドで検証 |

---

## パフォーマンス考慮事項

| 項目 | 対策 |
|------|------|
| 差分計算 | メインとサイドバーを別々に差分計算して効率化 |
| 再描画 | 変更のあったエリアのみパッチを送信 |
| アニメーション | CSS transition を使用（GPUアクセラレーション） |

---

## 成果物チェックリスト

### Phase 1

- [ ] `src/kt/context.ts` - デュアルバッファ対応
- [ ] `src/kt/layout.ts` - sidebar() 関数追加
- [ ] `src/kt/index.ts` - エクスポート追加
- [ ] `src/styles/default.ts` - サイドバースタイル追加
- [ ] `src/runtime/rerun.ts` - RerunResult 型対応
- [ ] `src/app.ts` - HTML生成統合
- [ ] `tests/unit/kt/context.test.ts` - デュアルバッファテスト
- [ ] `tests/unit/kt/layout.test.ts` - sidebar() テスト
- [ ] `bun run ci` 成功

### Phase 2

- [ ] `src/client/script.ts` - トグル処理
- [ ] レスポンシブ対応
- [ ] キーボードアクセシビリティ
- [ ] `tests/e2e/sidebar.spec.ts` - E2Eテスト
- [ ] サイドバー状態永続化

### Phase 3

- [ ] `src/kt/sidebar.ts` - オブジェクト形式API
- [ ] `kt.set_sidebar_state()` 実装

---

## リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| 差分アルゴリズムの複雑化 | バグ、パフォーマンス低下 | 段階的実装、十分なテスト |
| 後方互換性の問題 | 既存アプリの破損 | rerun() の戻り値を慎重に設計 |
| モバイル対応の複雑さ | UX低下 | 段階的リリース、Phase 2で対応 |

---

## 参考

- [Streamlit st.sidebar](https://docs.streamlit.io/develop/api-reference/layout/st.sidebar)
- [WAI-ARIA Navigation Landmark](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/)
- [CSS Flexbox Layout](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Flexible_Box_Layout)
