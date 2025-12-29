# Week 1 詳細実装計画

## 目標

WebSocket接続 + rerun + 全量更新（replaceRoot）の実装

## 前提条件

- Bun ランタイム環境
- Hono v4.6.0
- 既存のテストインフラ（Vitest + Playwright）

## ファイル構成

```
src/
├── index.ts              # 既存（エクスポート追加）
├── server.ts             # Bun WebSocket サーバ起動用
├── websocket/
│   ├── index.ts          # WebSocket 関連のエクスポート
│   ├── handler.ts        # WebSocket ハンドラ（接続/切断/メッセージ）
│   └── types.ts          # プロトコル型定義
├── runtime/
│   ├── index.ts          # rerun 関連のエクスポート
│   ├── rerun.ts          # rerun サイクルの実装
│   └── context.ts        # 実行コンテキスト
├── client/
│   └── client.ts         # クライアント側 JavaScript
└── app.ts                # Hono アプリケーション本体

tests/
├── unit/
│   ├── websocket.test.ts # WebSocket ユニットテスト
│   └── rerun.test.ts     # rerun ユニットテスト
└── e2e/
    └── websocket.spec.ts # E2E テスト
```

---

## Step 1: プロトコル型定義

### 1.1 `src/websocket/types.ts` の作成

```typescript
// クライアント → サーバ
export interface ClientMessage {
  type: "event";
  widgetId: string;
  value: unknown;
}

// サーバ → クライアント
export interface ServerMessage {
  type: "patch";
  patches: Patch[];
}

export type Patch = ReplaceRootPatch;

export interface ReplaceRootPatch {
  type: "replaceRoot";
  html: string;
}
```

### 成果物
- [ ] `src/websocket/types.ts` 作成
- [ ] 型定義のテスト（型チェックのみ）

---

## Step 2: Bun WebSocket サーバ実装

### 2.1 `src/websocket/handler.ts` の作成

WebSocket 接続のライフサイクル管理:

```typescript
import { createBunWebSocket } from "hono/bun";
import type { WSContext } from "hono/ws";

export const { upgradeWebSocket, websocket } = createBunWebSocket();

export interface WebSocketHandlers {
  onOpen?: (ws: WSContext) => void;
  onMessage?: (message: MessageEvent, ws: WSContext) => void;
  onClose?: (ws: WSContext) => void;
  onError?: (error: Event, ws: WSContext) => void;
}

export function createWebSocketHandler(handlers: WebSocketHandlers) {
  return upgradeWebSocket(() => ({
    onOpen: handlers.onOpen,
    onMessage: handlers.onMessage,
    onClose: handlers.onClose,
    onError: handlers.onError,
  }));
}
```

### 2.2 接続管理

```typescript
// 接続中の WebSocket を管理（Week 1 ではシンプルに Set で管理）
const connections = new Set<WSContext>();

export function addConnection(ws: WSContext): void {
  connections.add(ws);
}

export function removeConnection(ws: WSContext): void {
  connections.delete(ws);
}

export function getConnectionCount(): number {
  return connections.size;
}
```

### 成果物
- [ ] `src/websocket/handler.ts` 作成
- [ ] `src/websocket/index.ts` エクスポート設定
- [ ] 接続/切断のユニットテスト

---

## Step 3: rerun サイクル実装

### 3.1 実行コンテキスト `src/runtime/context.ts`

```typescript
export interface RerunContext {
  // 現在のイベント情報
  event?: {
    widgetId: string;
    value: unknown;
  };
}

// スクリプト実行中のコンテキスト
let currentContext: RerunContext | null = null;

export function setContext(ctx: RerunContext): void {
  currentContext = ctx;
}

export function getContext(): RerunContext | null {
  return currentContext;
}

export function clearContext(): void {
  currentContext = null;
}
```

### 3.2 rerun 実装 `src/runtime/rerun.ts`

```typescript
import { setContext, clearContext, type RerunContext } from "./context";

export type Script = () => string;

export function rerun(script: Script, event?: RerunContext["event"]): string {
  try {
    // コンテキストを設定
    setContext({ event });

    // スクリプトを実行してHTMLを生成
    const html = script();

    return html;
  } finally {
    // コンテキストをクリア
    clearContext();
  }
}
```

### 成果物
- [ ] `src/runtime/context.ts` 作成
- [ ] `src/runtime/rerun.ts` 作成
- [ ] `src/runtime/index.ts` エクスポート設定
- [ ] rerun のユニットテスト

---

## Step 4: Hono アプリケーション統合

### 4.1 `src/app.ts` の作成

```typescript
import { Hono } from "hono";
import { createWebSocketHandler, websocket } from "./websocket";
import { rerun, type Script } from "./runtime";
import type { ServerMessage } from "./websocket/types";

export function createApp(script: Script) {
  const app = new Hono();

  // ルートページ（HTMLを返す）
  app.get("/", (c) => {
    const initialHtml = rerun(script);
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>kantan-ui</title>
      </head>
      <body>
        <div id="app">${initialHtml}</div>
        <script src="/client.js"></script>
      </body>
      </html>
    `);
  });

  // WebSocket エンドポイント
  app.get("/ws", createWebSocketHandler({
    onOpen: (ws) => {
      console.log("WebSocket connected");
    },
    onMessage: (event, ws) => {
      const data = JSON.parse(event.data.toString());

      // rerun を実行
      const html = rerun(script, {
        widgetId: data.widgetId,
        value: data.value,
      });

      // replaceRoot パッチを送信
      const message: ServerMessage = {
        type: "patch",
        patches: [{ type: "replaceRoot", html }],
      };
      ws.send(JSON.stringify(message));
    },
    onClose: (ws) => {
      console.log("WebSocket disconnected");
    },
  }));

  // クライアント JavaScript
  app.get("/client.js", (c) => {
    return c.text(clientScript, 200, {
      "Content-Type": "application/javascript",
    });
  });

  return { app, websocket };
}

const clientScript = `
  const ws = new WebSocket(\`ws://\${location.host}/ws\`);

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === "patch") {
      for (const patch of msg.patches) {
        if (patch.type === "replaceRoot") {
          document.getElementById("app").innerHTML = patch.html;
        }
      }
    }
  };

  // イベント送信用のグローバル関数
  window.sendEvent = (widgetId, value) => {
    ws.send(JSON.stringify({ type: "event", widgetId, value }));
  };
`;
```

### 4.2 `src/server.ts` の作成

```typescript
import { createApp } from "./app";

// サンプルスクリプト
const script = () => {
  return `
    <h1>kantan-ui</h1>
    <p>WebSocket connection established!</p>
    <button onclick="sendEvent('btn1', 'clicked')">Click me</button>
  `;
};

const { app, websocket } = createApp(script);

export default {
  fetch: app.fetch,
  websocket,
};
```

### 成果物
- [ ] `src/app.ts` 作成
- [ ] `src/server.ts` 作成
- [ ] 統合テスト

---

## Step 5: クライアント側実装

### 5.1 クライアント JavaScript の強化

Week 1 では最小限の実装:
- WebSocket 接続の確立
- `replaceRoot` パッチの適用
- イベント送信関数

### 5.2 接続状態の表示（オプション）

```javascript
ws.onopen = () => {
  console.log("Connected to server");
};

ws.onclose = () => {
  console.log("Disconnected from server");
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};
```

### 成果物
- [ ] クライアント JavaScript の実装（app.ts 内に埋め込み）
- [ ] 接続状態のログ出力

---

## Step 6: テスト実装

### 6.1 ユニットテスト

```typescript
// tests/unit/rerun.test.ts
import { describe, it, expect } from "vitest";
import { rerun } from "../../src/runtime/rerun";

describe("rerun", () => {
  it("should execute script and return HTML", () => {
    const script = () => "<div>Hello</div>";
    const result = rerun(script);
    expect(result).toBe("<div>Hello</div>");
  });

  it("should provide event context during execution", () => {
    // コンテキストのテスト
  });
});
```

### 6.2 E2E テスト

```typescript
// tests/e2e/websocket.spec.ts
import { test, expect } from "@playwright/test";

test("WebSocket connection and replaceRoot", async ({ page }) => {
  await page.goto("http://localhost:3000");

  // 初期HTMLの確認
  await expect(page.locator("#app h1")).toHaveText("kantan-ui");

  // ボタンクリック後の更新確認
  await page.click("button");

  // WebSocket経由で更新されることを確認
  // ...
});
```

### 成果物
- [ ] `tests/unit/rerun.test.ts` 作成
- [ ] `tests/unit/websocket.test.ts` 作成
- [ ] `tests/e2e/websocket.spec.ts` 作成

---

## Step 7: ドキュメントとエクスポート

### 7.1 `src/index.ts` の更新

```typescript
// 既存のエクスポート
export { Hono } from "hono";

// 新規エクスポート
export { createApp } from "./app";
export { rerun } from "./runtime";
export type { Script } from "./runtime/rerun";
export type { ClientMessage, ServerMessage, Patch } from "./websocket/types";
```

### 7.2 package.json の更新（必要に応じて）

```json
{
  "scripts": {
    "dev": "bun run --watch src/server.ts",
    // ...
  }
}
```

### 成果物
- [ ] `src/index.ts` 更新
- [ ] `package.json` 更新
- [ ] エクスポートの確認

---

## 実装順序（推奨）

```
Day 1: Step 1 + Step 2
       ├── プロトコル型定義
       └── WebSocket ハンドラ基盤

Day 2: Step 3 + Step 4 前半
       ├── rerun サイクル
       └── Hono アプリケーション統合（サーバ側）

Day 3: Step 4 後半 + Step 5
       ├── Hono アプリケーション統合（完成）
       └── クライアント側実装

Day 4: Step 6
       └── テスト実装

Day 5: Step 7 + バグ修正 + リファクタリング
       ├── エクスポート整理
       └── 最終確認
```

---

## 完了基準

### 機能要件
- [ ] WebSocket 接続が確立できる
- [ ] クライアントからイベントを送信できる
- [ ] サーバでスクリプトを rerun できる
- [ ] `replaceRoot` でクライアントのDOMが更新される

### 非機能要件
- [ ] ユニットテストがパスする
- [ ] E2E テストがパスする
- [ ] lint エラーがない
- [ ] ビルドが成功する

### 成果物確認
- [ ] `bun run dev` でサーバが起動する
- [ ] ブラウザでアクセスしてボタンクリックでUI更新される
- [ ] `bun run test` が成功する
- [ ] `bun run test:e2e` が成功する

---

## 次のステップ（Week 2 への橋渡し）

Week 1 完了後、以下が Week 2 の準備として必要:

1. セッションID生成の仕組み（UUID等）
2. 状態管理の設計（`Map<sid, State>`）
3. Widget API の設計（`slider`, `button` 等）

---

*作成日: 2025-12-29*
*対象バージョン: kantan-ui v0.0.1*
