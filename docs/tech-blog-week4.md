# kantan-ui: HonoだけでStreamlit風UIフレームワークを作った話

## はじめに

PythonのStreamlitは、データサイエンティストやエンジニアがWebアプリを素早く構築できる素晴らしいフレームワークです。しかし、商用利用や大規模運用を考えると、いくつかの課題があります。

**kantan-ui**は、Streamlitの開発体験をTypeScript/JavaScriptで再現しつつ、Honoのみに依存する軽量なUIフレームワークです。Week4までの実装で、基本的な機能が動作するようになりました。

## 基本的な使い方

### インストールと起動

```bash
# リポジトリのクローン
git clone https://github.com/watany-dev/kantan-ui.git
cd kantan-ui

# 依存関係のインストール
bun install

# 開発サーバーの起動
bun run dev
```

### 最小構成のアプリ

```typescript
import { createApp, kt, createTypedSessionState } from "kantan-ui";

// 型安全なセッションステートを定義
type AppState = { counter: number };
const state = createTypedSessionState<AppState>({ counter: 0 });

// スクリプト関数（UIの定義）
const script = () => {
  kt.title("My App");

  if (kt.button("Click me")) {
    state.counter++;
  }

  kt.write(`Count: ${state.counter}`);
  return undefined;
};

// アプリを作成してエクスポート
const { app, websocket } = createApp(script);
export default { fetch: app.fetch, websocket };
```

これだけで、リアルタイムに更新されるカウンターアプリが完成します。

### 利用可能なコンポーネント

#### Output API（表示系）

```typescript
kt.title("タイトル");           // h1タグ
kt.header("ヘッダー");          // h2タグ
kt.subheader("サブヘッダー");    // h3タグ
kt.write("テキスト");           // pタグ
kt.text("テキスト");            // spanタグ
kt.divider();                   // hrタグ
kt.html("<div>カスタムHTML</div>");  // 任意のHTML
```

#### Widget API（入力系）

```typescript
// ボタン - クリックされたらtrueを返す
if (kt.button("Submit", { key: "submit_btn" })) {
  // クリック時の処理
}

// スライダー - 現在の値を返す
const volume = kt.slider("Volume", 0, 100, 50, { key: "volume" });

// テキスト入力 - 入力値を返す
const name = kt.text_input("Name", "default", { key: "name" });

// セレクトボックス - 選択値を返す
const color = kt.selectbox("Color", ["red", "blue", "green"], "red", { key: "color" });
```

## Streamlitとの比較

| 項目 | Streamlit | kantan-ui |
|------|-----------|-----------|
| **言語** | Python | TypeScript/JavaScript |
| **依存関係** | React, Tornado, Arrow等多数 | Honoのみ |
| **バンドルサイズ** | 大 | 極小 |
| **ランタイム** | Python | Bun, Node.js, Deno |
| **型安全性** | 限定的 | TypeScript完全対応 |
| **セッション管理** | 自動 | 自動（TTL設定可） |
| **商用利用** | 制限あり | MIT License |

### Streamlitの課題とkantan-uiの解決策

#### 1. 依存関係の肥大化

**Streamlit**: React、Tornado、Apache Arrowなど多数の依存関係
**kantan-ui**: `dependencies`はHonoのみ

```json
{
  "dependencies": {
    "hono": "^4.6.0"
  }
}
```

#### 2. マルチランタイム対応

**Streamlit**: Pythonのみ
**kantan-ui**: Web標準APIを使用し、複数ランタイムで動作

- Bun（プライマリ）
- Node.js 18+
- Deno
- Cloudflare Workers（将来対応予定）

#### 3. 型安全性

**Streamlit**: `st.session_state`は動的型付け
**kantan-ui**: `createTypedSessionState<T>()`で型安全に

```typescript
type AppState = {
  counter: number;
  user: string;
};

const state = createTypedSessionState<AppState>({
  counter: 0,
  user: "anonymous"
});

// IDE補完が効く & コンパイル時に型チェック
state.counter++;        // OK
state.unknown = "x";    // コンパイルエラー
```

## 技術的ポイント: Honoの活用

### アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────┐
│                      Client (Browser)                   │
├─────────────────────────────────────────────────────────┤
│  WebSocket Client  ←→  DOM Patcher  ←→  Event Handler  │
└──────────────────────────┬──────────────────────────────┘
                           │ WebSocket
┌──────────────────────────▼──────────────────────────────┐
│                       Hono Server                        │
├──────────────────────────────────────────────────────────┤
│  HTTP Routes  │  WebSocket Handler  │  Session Manager  │
├───────────────┴─────────────────────┴───────────────────┤
│              Script Execution (rerun)                    │
├─────────────────────────────────────────────────────────┤
│    kt.* API    │    Widget State    │    HTML Differ    │
└─────────────────────────────────────────────────────────┘
```

### 1. Honoによるルーティングとミドルウェア

`createApp()`関数内でHonoを使用してルーティングを定義しています：

```typescript
// src/app.ts
import { Hono } from "hono";

export function createApp(script: Script, userConfig?: KantanConfig) {
  const app = new Hono();

  // ルートページ（HTMLを返す）
  app.get("/", (c) => {
    const initialHtml = rerun(script);
    const nonce = generateNonce();

    // CSPヘッダーでXSS対策
    c.header(
      "Content-Security-Policy",
      `default-src 'self'; script-src 'nonce-${nonce}'; ...`
    );

    return c.html(`<!DOCTYPE html>...`);
  });

  // WebSocketエンドポイント
  app.get("/ws", createWebSocketHandler({...}));

  return { app, websocket, shutdown };
}
```

Honoの`c.html()`や`c.header()`を活用することで、シンプルにHTMLレスポンスとセキュリティヘッダーを設定しています。

### 2. WebSocket通信

WebSocket通信はHono/Bunのネイティブサポートを活用：

```typescript
// src/websocket/handler.ts
export function createWebSocketHandler(handlers: WebSocketHandlers) {
  return (c: Context) => {
    // Bunランタイムでのアップグレード
    const upgraded = server.upgrade(c.req.raw, {
      data: { handlers }
    });
    // ...
  };
}
```

クライアント→サーバーのメッセージ：
```typescript
// 初期化
{ type: "init", sessionId?: string }

// イベント（ボタンクリック、スライダー変更等）
{ type: "event", widgetId: string, value: unknown, sessionId: string }
```

サーバー→クライアントのメッセージ：
```typescript
// DOMパッチ
{
  type: "patch",
  patches: [
    { type: "replaceRoot", html: "..." },      // 全体置換
    { type: "replaceNode", id: "x", html: "..." },  // 部分置換
    { type: "removeNode", id: "x" },           // 削除
    { type: "insertNode", parentId: "p", index: 0, html: "..." }  // 挿入
  ]
}
```

### 3. HTML Diffアルゴリズム

Virtual DOMを使わず、ID属性ベースの軽量な差分検出を実装：

```typescript
// src/diff/differ.ts
export function diff(oldHtml: string, newHtml: string): DiffResult {
  const oldNodes = parseHtml(oldHtml);  // ID付き要素を抽出
  const newNodes = parseHtml(newHtml);

  const patches: DiffPatch[] = [];

  // 追加・変更されたノードを検出
  for (const newNode of newNodes) {
    const oldNodeHtml = oldMap.get(newNode.id);
    if (oldNodeHtml === undefined) {
      patches.push({ type: "insert", ... });
    } else if (oldNodeHtml !== newNode.html) {
      patches.push({ type: "replace", ... });
    }
  }

  // 削除されたノードを検出
  for (const [id] of oldMap) {
    if (!newVNodeMap.has(id)) {
      patches.push({ type: "remove", id });
    }
  }

  return { patches, hasChanges: oldHtml !== newHtml };
}
```

Week4では、パフォーマンス最適化を実施：

- **親子関係の計算**: O(k^2) → O(k log k)に改善
- **正規表現のキャッシュ**: 毎回のRegExpオブジェクト生成を回避
- **自己閉じタグの判定**: `Set`を使用したO(1)ルックアップ

### 4. セッション管理

Proxyベースのセッションステート実装：

```typescript
// src/session/state.ts
export function createTypedSessionState<T>(defaults: T): T {
  return new Proxy(defaults, {
    get(target, prop) {
      const sessionId = getCurrentSessionId();
      const session = globalSessionManager.getSession(sessionId);
      return session?.state[prop as string] ?? target[prop as keyof T];
    },
    set(target, prop, value) {
      const sessionId = getCurrentSessionId();
      globalSessionManager.setState(sessionId, prop as string, value);
      return true;
    }
  });
}
```

これにより、`state.counter++`のような直感的なアクセスが可能になります。

### 5. セキュリティ対策

#### CSP（Content Security Policy）

```typescript
c.header(
  "Content-Security-Policy",
  `default-src 'self'; script-src 'nonce-${nonce}'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:;`
);
```

#### XSS対策

```typescript
// src/utils/html.ts
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
```

#### クライアント側のサニタイズ

```javascript
function isUnsafeHtml(html) {
  return /<script[\s\S]*?>|javascript:|\s+on\w+\s*=/i.test(html);
}
```

## リクエスト/レスポンスの流れ

```
1. ユーザーがページを読み込む
   GET / → 初期HTML + WebSocketクライアントスクリプト

2. WebSocket接続
   Client → { type: "init", sessionId }
   Server → セッション作成/復元 → rerun(script) → { type: "patch", patches: [...] }

3. ウィジェット操作（例：ボタンクリック）
   Client → { type: "event", widgetId: "btn_0", value: "clicked", sessionId }
   Server → setState() → rerun(script) → diff(oldHtml, newHtml) → patches

4. DOM更新
   Client ← { type: "patch", patches: [{ type: "replaceNode", ... }] }
   → フォーカス状態を保存 → パッチ適用 → フォーカス復元
```

## まとめ

kantan-uiは、Streamlitの開発体験を維持しながら、以下を実現しています：

1. **最小依存**: Honoのみに依存し、軽量で高速
2. **型安全**: TypeScriptによる完全な型サポート
3. **マルチランタイム**: Bun, Node.js, Denoで動作
4. **商用対応**: MIT License、セキュリティ考慮済み
5. **高性能**: 最適化されたHTML Diffアルゴリズム

まだ開発初期段階ですが、基本的なウィジェット（ボタン、スライダー、テキスト入力、セレクトボックス）は動作します。今後はチャート表示、ファイルアップロード、レイアウト機能などを追加予定です。

---

**リポジトリ**: [github.com/watany-dev/kantan-ui](https://github.com/watany-dev/kantan-ui)

**ライセンス**: MIT
