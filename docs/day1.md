# Kantan UI - 設計ドキュメント Day 1

Hono を土台に Streamlit 的な「書くだけで UI が出て、操作で rerun・状態保持・差分更新」を実現するフレームワークの設計書。

---

## 1. コア設計方針

### 1.1 実行モデル：Streamlit 互換の「毎回 rerun」

Streamlit は「ユーザー操作のたびにスクリプトを上から下まで再実行」する。本フレームワークでもこのモデルを採用する。

```
イベント発生（ボタン押下・入力変更）
    ↓
セッションの state を更新
    ↓
アプリ関数を最初から再評価（rerun）
    ↓
UI ツリーを再生成
    ↓
前回ツリーと diff → クライアントへ差分送信
```

### 1.2 セッションと state：サーバ側が正

- **セッションID**（Cookie）でユーザーごとに state を分離
- **state はサーバ側が正**（クライアントは入力と表示のみ）
- クライアントは UI のレンダリングとイベント送信に専念

### 1.3 UI 記述 DSL：命令的 API

利用者には Streamlit 風の命令的 API を提供する：

```typescript
ui.text("hello")
ui.slider("age", { min: 0, max: 100 })
const clicked = ui.button("Submit")
```

内部では hono/jsx を使って HTML を生成するが、利用者からは隠蔽する。

### 1.4 クライアント更新：WebSocket + 差分プロトコル（プランC）

本プロジェクトでは **WebSocket/SSE + 差分プロトコル** を採用する。

**選定理由：**
- Streamlit に最も近いリアルタイム更新体験
- 進捗表示・ストリーミングに強い
- 長時間処理の途中経過を push できる

---

## 2. システム構成

### 2.1 サーバ側コンポーネント

```
┌─────────────────────────────────────────────────────────────┐
│                        Hono Server                          │
├─────────────────────────────────────────────────────────────┤
│  SessionManager          │  ConnectionRegistry              │
│  - Cookie sid 発行/復元   │  - sid → WebSocket 管理          │
│  - sid → SessionState    │  - 再接続・切断処理               │
├─────────────────────────────────────────────────────────────┤
│  AppRunner               │  DiffEngine                      │
│  - run(sid, event)       │  - prevTree vs nextTree          │
│  - 同一 sid は逐次実行    │  - patch 配列を生成              │
│  - Abort 対応            │  - 初期は replaceRoot のみ        │
├─────────────────────────────────────────────────────────────┤
│                     Transport (WebSocket)                   │
│  - 双方向通信（イベント up / patch down）                    │
│  - SSE フォールバック対応可能                                │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 実行環境

**推奨：Bun または Deno**

Hono の WebSocket Helper が公式対応しており、安定している。Cloudflare Workers でも動作するが、`onOpen` が動かない等の制約がある点に注意。

---

## 3. データモデル

### 3.1 UI ノード

```typescript
type WidgetType = "text" | "button" | "slider" | "input" | "select" | "checkbox";

type WidgetNode = {
  type: WidgetType;
  key: string;           // 必須：widget の同一性を保証
  props: Record<string, unknown>;
};

type UITree = WidgetNode[];
```

**key は必須**：rerun のたびに UI が再構築されるため、widget の同一性を key で保証する。

### 3.2 セッション状態

```typescript
type SessionState = {
  values: Record<string, unknown>;  // widget の値、アプリ状態
  prevTree: UITree;                 // 前回の UI ツリー
  seq: number;                      // サーバ発行の単調増加世代番号
  running?: AbortController;        // 実行キャンセル用
};
```

---

## 4. WebSocket メッセージプロトコル

### 4.1 クライアント → サーバ

```typescript
// 接続確立
type ClientHello = {
  type: "hello";
  sid?: string;          // 既存セッションがあれば送信
  clientVersion: string;
};

// イベント送信
type ClientEvent = {
  type: "event";
  clientSeq: number;     // クライアント側シーケンス番号
  eventType: "slider" | "button" | "input" | "select" | "checkbox";
  key: string;
  value?: unknown;
};
```

### 4.2 サーバ → クライアント

```typescript
// 接続応答
type ServerWelcome = {
  type: "welcome";
  sid: string;
  serverVersion: string;
};

// UI 更新
type ServerPatch = {
  type: "patch";
  serverSeq: number;
  patches: PatchOp[];
};

// エラー通知
type ServerError = {
  type: "error";
  message: string;
  stack?: string;
};
```

### 4.3 PatchOp（差分操作）

段階的に実装を拡張する：

| Phase | 操作 | 説明 |
|-------|------|------|
| Week 1 | `replaceRoot` | HTML 全体を置換 |
| Week 3 | `replaceChildren` | 特定コンテナの中身を差し替え |
| Week 3 | `setText` | テキストノードの更新 |
| Week 3 | `setAttr` | 属性の更新 |
| Week 4+ | `insertBefore` / `remove` | ノードの挿入・削除 |

```typescript
type PatchOp =
  | { op: "replaceRoot"; html: string }
  | { op: "replaceChildren"; nodeId: string; html: string }
  | { op: "setText"; nodeId: string; text: string }
  | { op: "setAttr"; nodeId: string; name: string; value: string }
  | { op: "insertBefore"; parentId: string; beforeId: string | null; html: string }
  | { op: "remove"; nodeId: string };
```

---

## 5. モジュール分割

### 5.1 ディレクトリ構成（想定）

```
src/
├── server.ts           # Hono サーバエントリポイント
├── session/
│   ├── manager.ts      # SessionManager
│   └── store.ts        # in-memory → Redis 対応
├── connection/
│   └── registry.ts     # WebSocket 接続管理
├── runtime/
│   ├── runner.ts       # AppRunner（rerun 実行）
│   └── diff.ts         # DiffEngine
├── ui/
│   ├── builder.ts      # UI クラス（命令的 API）
│   ├── widgets/        # 各 widget の実装
│   └── renderer.ts     # HTML レンダリング
└── transport/
    ├── websocket.ts    # WebSocket ハンドラ
    └── protocol.ts     # メッセージ型定義
```

### 5.2 各モジュールの責務

| モジュール | 責務 |
|-----------|------|
| SessionManager | Cookie の sid 発行/復元、セッション取得 |
| SessionStore | セッション永続化（MVP は Map、後で Redis） |
| ConnectionRegistry | WebSocket 接続の管理、sid との紐付け |
| AppRunner | ユーザーアプリの rerun 実行、Abort 制御 |
| DiffEngine | UITree の差分計算、PatchOp 生成 |
| UI Builder | `ui.text()` 等の命令的 API 提供 |
| Renderer | UITree → HTML 変換 |

---

## 6. 開発プラン（6週間ロードマップ）

### Week 1：WebSocket 接続 + rerun + 全量更新

**成果物：**
- Hono で `/ws` を立てる（upgradeWebSocket）
- 最小 UI ランタイム（HTML + WS 接続 + replaceRoot 適用）
- SessionState（in-memory）と sid cookie

**合格条件：**
- ブラウザで接続し、slider を動かすたびに rerun され、画面が更新される

---

### Week 2：ウィジェット API と state

**成果物：**
- `ui.slider(key, ...)` → `number`（state.values から読んで返す）
- `ui.button(key, ...)` → `boolean`（押下イベントが来た rerun だけ `true`）
- `ui.text`, `ui.input`, `ui.select`, `ui.checkbox` の基本セット
- key の衝突検出（同一 rerun で重複したらエラー）

**合格条件：**
- 「ボタン押下した rerun だけ true」の瞬間性が動作する

---

### Week 3：差分更新（DOM パッチ導入）

**成果物：**
- `replaceRoot` から部分 patch へ進化
  - `setText(nodeId, text)`
  - `setAttr(nodeId, name, value)`
  - `replaceChildren(nodeId, html)`
- ノードに `data-node-id` を付与

**合格条件：**
- 画面全体を置換せず、一部の更新で追随できる

---

### Week 4：ストリーミング（進捗・逐次描画）

**成果物：**
- AppRunner 内から `ui.emitPatch()` できる仕組み
- 長い処理中に progress を push
- Abort 対応（新イベントで前の run をキャンセル）

**合格条件：**
- 長い処理（疑似 sleep）中に progress が更新され、次の操作で中断できる

---

### Week 5：堅牢性（再接続・順序保証・リトライ）

**成果物：**
- WS 再接続時：hello に sid を載せてセッション継続
- serverSeq による順序保証（古い patch は破棄）
- 例外発生時に UI 上へ「エラーパネル」を表示

**合格条件：**
- ネットワーク切断→復帰で state が維持される
- patch の順序が乱れても UI が壊れない

---

### Week 6：拡張性（ウィジェット拡張・サンプル）

**成果物：**
- `registerWidget(type, renderer)` のプラグイン機構
- サンプルギャラリー（10本程度）
- バージョニング方針（protocolVersion / serverVersion）

**合格条件：**
- フレームワーク外部でカスタム widget を追加できる

---

## 7. MVP 骨格コード（Week 1 相当）

以下は「Bun + Hono + WebSocket + replaceRoot」で成立する最小実装。

```typescript
// src/server.ts
import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";

const { upgradeWebSocket, websocket } = createBunWebSocket();

// ---------- Types ----------
type SessionState = {
  values: Record<string, unknown>;
  prevHtml: string;
  serverSeq: number;
  lastButtonKey: string | null;
};

type ClientMessage =
  | { type: "hello"; sid?: string; clientVersion: string }
  | { type: "event"; clientSeq: number; eventType: string; key: string; value?: unknown };

type ServerMessage =
  | { type: "welcome"; sid: string; serverVersion: string }
  | { type: "patch"; serverSeq: number; patches: Array<{ op: string; html?: string }> }
  | { type: "error"; message: string; stack?: string };

// ---------- Session Store (in-memory) ----------
const sessions = new Map<string, SessionState>();

function randomId(len = 24): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: len }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

function getOrCreateSession(sidFromClient?: string): { sid: string; state: SessionState } {
  const sid = sidFromClient && sessions.has(sidFromClient) ? sidFromClient : randomId();
  let state = sessions.get(sid);
  if (!state) {
    state = { values: {}, prevHtml: "", serverSeq: 0, lastButtonKey: null };
    sessions.set(sid, state);
  }
  return { sid, state };
}

// ---------- UI Builder (minimal) ----------
class UI {
  private tree: Array<{ type: string; key: string; props: Record<string, unknown> }> = [];

  constructor(private readonly state: SessionState) {}

  text(value: string, key?: string) {
    const k = key ?? `text:${this.tree.length}`;
    this.tree.push({ type: "text", key: k, props: { value } });
  }

  slider(label: string, key: string, opts: { min: number; max: number; step?: number; value?: number }): number {
    const existing = this.state.values[key];
    const v = typeof existing === "number" ? existing : (opts.value ?? opts.min);
    this.state.values[key] = v;
    this.tree.push({ type: "slider", key, props: { label, ...opts, value: v } });
    return v;
  }

  button(label: string, key: string): boolean {
    const pressed = this.state.lastButtonKey === key;
    if (pressed) this.state.lastButtonKey = null;
    this.tree.push({ type: "button", key, props: { label } });
    return pressed;
  }

  getTree() {
    return this.tree;
  }
}

// ---------- User App (what framework users write) ----------
async function userApp(ui: UI, state: SessionState) {
  ui.text("Hello, Kantan UI!");

  const age = ui.slider("Age", "age", { min: 0, max: 100, value: 20 });
  ui.text(`age = ${age}`, "ageText");

  if (ui.button("Reset", "reset")) {
    state.values["age"] = 0;
  }
}

// ---------- Renderer ----------
function renderHtml(tree: ReturnType<UI["getTree"]>, state: SessionState): string {
  const widgets = tree.map((node) => {
    if (node.type === "text") {
      return `<p data-node-id="${node.key}">${node.props.value}</p>`;
    }
    if (node.type === "slider") {
      const { label, min, max, step = 1, value } = node.props as any;
      return `
        <div class="widget" data-node-id="${node.key}">
          <label>${label}: <b>${value}</b></label>
          <input type="range" data-key="${node.key}"
            min="${min}" max="${max}" step="${step}" value="${value}" />
        </div>`;
    }
    if (node.type === "button") {
      return `<button data-key="${node.key}">${node.props.label}</button>`;
    }
    return "";
  }).join("\n");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Kantan UI</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; }
    .widget { margin: 1rem 0; }
    input[type="range"] { width: 200px; margin-left: 1rem; }
    button { padding: 0.5rem 1rem; cursor: pointer; }
  </style>
</head>
<body>
  <div id="root">${widgets}</div>
  <script>
    const ws = new WebSocket(\`\${location.protocol === "https:" ? "wss" : "ws"}://\${location.host}/ws\`);
    let serverSeq = 0;

    ws.onopen = () => {
      const sid = document.cookie.match(/sid=([^;]+)/)?.[1];
      ws.send(JSON.stringify({ type: "hello", sid, clientVersion: "0.1.0" }));
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "welcome") {
        document.cookie = \`sid=\${msg.sid}; Path=/; SameSite=Lax\`;
      } else if (msg.type === "patch") {
        if (msg.serverSeq < serverSeq) return;
        serverSeq = msg.serverSeq;
        for (const p of msg.patches) {
          if (p.op === "replaceRoot") {
            document.open();
            document.write(p.html);
            document.close();
          }
        }
      } else if (msg.type === "error") {
        console.error(msg.message, msg.stack);
      }
    };

    document.addEventListener("input", (e) => {
      const key = e.target.dataset?.key;
      if (key && e.target.type === "range") {
        ws.send(JSON.stringify({
          type: "event", clientSeq: Date.now(),
          eventType: "slider", key, value: Number(e.target.value)
        }));
      }
    });

    document.addEventListener("click", (e) => {
      const key = e.target.dataset?.key;
      if (key && e.target.tagName === "BUTTON") {
        ws.send(JSON.stringify({
          type: "event", clientSeq: Date.now(),
          eventType: "button", key
        }));
      }
    });
  </script>
</body>
</html>`;
}

// ---------- Server ----------
const app = new Hono();

app.get("/", (c) => {
  const cookie = c.req.header("cookie") ?? "";
  const sidMatch = cookie.match(/sid=([^;]+)/);
  const { sid, state } = getOrCreateSession(sidMatch?.[1]);

  const ui = new UI(state);
  userApp(ui, state);
  const html = renderHtml(ui.getTree(), state);
  state.prevHtml = html;

  c.header("Set-Cookie", `sid=${sid}; Path=/; SameSite=Lax`);
  return c.html(html);
});

app.get("/ws", upgradeWebSocket((c) => {
  let sid: string | null = null;
  let state: SessionState | null = null;

  return {
    onMessage(event, ws) {
      try {
        const msg: ClientMessage = JSON.parse(String(event.data));

        if (msg.type === "hello") {
          const session = getOrCreateSession(msg.sid);
          sid = session.sid;
          state = session.state;
          ws.send(JSON.stringify({ type: "welcome", sid, serverVersion: "0.1.0" }));
          return;
        }

        if (msg.type === "event" && state) {
          if (msg.eventType === "slider" && typeof msg.value === "number") {
            state.values[msg.key] = msg.value;
          } else if (msg.eventType === "button") {
            state.lastButtonKey = msg.key;
          }

          const ui = new UI(state);
          userApp(ui, state);
          const html = renderHtml(ui.getTree(), state);
          state.prevHtml = html;
          state.serverSeq += 1;

          ws.send(JSON.stringify({
            type: "patch",
            serverSeq: state.serverSeq,
            patches: [{ op: "replaceRoot", html }],
          }));
        }
      } catch (e) {
        const err = e as Error;
        ws.send(JSON.stringify({ type: "error", message: err.message, stack: err.stack }));
      }
    },
    onClose() { /* セッションは in-memory に残る */ },
  };
}));

export default {
  port: 3000,
  fetch: app.fetch,
  websocket,
};
```

**起動方法：**
```bash
bun run src/server.ts
```

---

## 8. 次のステップ

1. **Week 1 の実装を完了** - 上記 MVP が動作することを確認
2. **Week 2 でウィジェットを拡充** - input, select, checkbox 等を追加
3. **Week 3 で差分更新を導入** - replaceRoot から部分パッチへ

差分更新の粒度は以下の順で段階的に実装する：
1. `replaceRoot`（完了）
2. `replaceChildren`（コンテナ単位）
3. `setText` / `setAttr`（プロパティ単位）
4. `insertBefore` / `remove`（ノード操作）

---

## 9. 設計上の注意点

### 9.1 widget key の衝突

同一 rerun で同じ key が使われた場合はエラーにする。自動生成は衝突リスクがあるため、明示的な key を推奨。

### 9.2 順序保証

`serverSeq` を使って古い patch を破棄する。クライアントは受信した seq より小さい patch は無視。

### 9.3 Abort 対応

新しいイベントが来たら前の run をキャンセルできるように `AbortController` を SessionState に持つ。

### 9.4 セキュリティ

MVP では省略しているが、本番では以下を考慮：
- CSRF 対策（Origin チェック）
- XSS 対策（ユーザー入力のエスケープ）
- セッション Cookie の Secure 属性（HTTPS 時）
