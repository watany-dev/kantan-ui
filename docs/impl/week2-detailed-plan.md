# Week 2 詳細実装計画

## 目標

Widget API の実装とセッションstateの確立

## 前提条件

- Week 1 完了済み（WebSocket接続 + rerun + replaceRoot）
- Bun ランタイム環境
- Hono v4.6.0

## ファイル構成

```
src/
├── index.ts              # エクスポート追加
├── server.ts             # 既存（デモ更新）
├── app.ts                # 既存（セッション対応追加）
├── websocket/
│   ├── index.ts          # 既存
│   ├── handler.ts        # セッション管理追加
│   └── types.ts          # 型定義拡張
├── runtime/
│   ├── index.ts          # エクスポート追加
│   ├── rerun.ts          # セッション対応追加
│   └── context.ts        # セッションコンテキスト拡張
├── session/              # 新規ディレクトリ
│   ├── index.ts          # セッション関連エクスポート
│   ├── manager.ts        # セッション管理クラス
│   ├── state.ts          # session_state 実装
│   └── types.ts          # セッション型定義
└── widgets/              # 新規ディレクトリ
    ├── index.ts          # Widget エクスポート
    ├── types.ts          # Widget 型定義
    ├── registry.ts       # Widget 登録管理
    ├── button.ts         # button widget
    ├── slider.ts         # slider widget
    ├── text-input.ts     # text_input widget
    └── selectbox.ts      # selectbox widget

tests/
├── unit/
│   ├── session/
│   │   ├── manager.test.ts   # セッション管理テスト
│   │   └── state.test.ts     # session_state テスト
│   └── widgets/
│       ├── button.test.ts    # button テスト
│       ├── slider.test.ts    # slider テスト
│       ├── text-input.test.ts # text_input テスト
│       └── selectbox.test.ts # selectbox テスト
└── e2e/
    └── widgets.spec.ts       # Widget E2E テスト
```

---

## Step 1: セッション型定義

### 1.1 `src/session/types.ts` の作成

```typescript
// セッションID
export type SessionId = string;

// セッション状態
export interface SessionState {
  [key: string]: unknown;
}

// セッション情報
export interface Session {
  id: SessionId;
  state: SessionState;
  createdAt: Date;
  lastAccessedAt: Date;
}

// セッション設定
export interface SessionConfig {
  ttl?: number;  // セッションTTL（ミリ秒）、デフォルト: 30分
}
```

### 成果物
- [ ] `src/session/types.ts` 作成
- [ ] 型定義のテスト（型チェック）

---

## Step 2: セッション管理実装

### 2.1 `src/session/manager.ts` の作成

```typescript
import type { SessionId, Session, SessionConfig, SessionState } from "./types";
import type { WSContext } from "hono/ws";

const DEFAULT_TTL = 30 * 60 * 1000; // 30分

export class SessionManager {
  private sessions = new Map<SessionId, Session>();
  private wsToSession = new Map<WSContext, SessionId>();
  private sessionToWs = new Map<SessionId, Set<WSContext>>();
  private config: Required<SessionConfig>;

  constructor(config: SessionConfig = {}) {
    this.config = {
      ttl: config.ttl ?? DEFAULT_TTL,
    };
  }

  // セッションを生成
  createSession(): Session {
    const id = crypto.randomUUID();
    const session: Session = {
      id,
      state: {},
      createdAt: new Date(),
      lastAccessedAt: new Date(),
    };
    this.sessions.set(id, session);
    this.sessionToWs.set(id, new Set());
    return session;
  }

  // セッションを取得
  getSession(id: SessionId): Session | undefined {
    const session = this.sessions.get(id);
    if (session) {
      session.lastAccessedAt = new Date();
    }
    return session;
  }

  // セッションを取得または作成
  getOrCreateSession(id?: SessionId): Session {
    if (id) {
      const existing = this.getSession(id);
      if (existing) return existing;
    }
    return this.createSession();
  }

  // WebSocket とセッションを紐付け
  associateWebSocket(ws: WSContext, sessionId: SessionId): void {
    this.wsToSession.set(ws, sessionId);
    const connections = this.sessionToWs.get(sessionId);
    if (connections) {
      connections.add(ws);
    }
  }

  // WebSocket からセッションを取得
  getSessionByWebSocket(ws: WSContext): Session | undefined {
    const sessionId = this.wsToSession.get(ws);
    if (sessionId) {
      return this.getSession(sessionId);
    }
    return undefined;
  }

  // WebSocket 切断時の処理
  removeWebSocket(ws: WSContext): void {
    const sessionId = this.wsToSession.get(ws);
    if (sessionId) {
      const connections = this.sessionToWs.get(sessionId);
      if (connections) {
        connections.delete(ws);
      }
      this.wsToSession.delete(ws);
    }
  }

  // セッションの state を取得
  getState(sessionId: SessionId): SessionState | undefined {
    return this.sessions.get(sessionId)?.state;
  }

  // セッションの state を更新
  setState(sessionId: SessionId, key: string, value: unknown): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.state[key] = value;
      session.lastAccessedAt = new Date();
    }
  }

  // 期限切れセッションをクリーンアップ
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;
    for (const [id, session] of this.sessions) {
      if (now - session.lastAccessedAt.getTime() > this.config.ttl) {
        this.sessions.delete(id);
        this.sessionToWs.delete(id);
        cleaned++;
      }
    }
    return cleaned;
  }

  // セッション数を取得
  getSessionCount(): number {
    return this.sessions.size;
  }
}

// グローバルセッションマネージャー
let globalSessionManager: SessionManager | null = null;

export function getSessionManager(): SessionManager {
  if (!globalSessionManager) {
    globalSessionManager = new SessionManager();
  }
  return globalSessionManager;
}

export function setSessionManager(manager: SessionManager): void {
  globalSessionManager = manager;
}
```

### 成果物
- [ ] `src/session/manager.ts` 作成
- [ ] セッション生成のテスト
- [ ] WebSocket紐付けのテスト

---

## Step 3: session_state 実装

### 3.1 `src/session/state.ts` の作成

```typescript
import { getSessionManager } from "./manager";
import type { SessionId, SessionState } from "./types";

// 現在のセッションID（rerun中に設定）
let currentSessionId: SessionId | null = null;

export function setCurrentSessionId(id: SessionId | null): void {
  currentSessionId = id;
}

export function getCurrentSessionId(): SessionId | null {
  return currentSessionId;
}

// session_state オブジェクト（Proxy で実装）
export function createSessionState(): SessionState {
  return new Proxy({} as SessionState, {
    get(_target, prop: string) {
      if (!currentSessionId) {
        throw new Error("session_state は rerun 中のみアクセス可能です");
      }
      const state = getSessionManager().getState(currentSessionId);
      return state?.[prop];
    },
    set(_target, prop: string, value: unknown) {
      if (!currentSessionId) {
        throw new Error("session_state は rerun 中のみアクセス可能です");
      }
      getSessionManager().setState(currentSessionId, prop, value);
      return true;
    },
    has(_target, prop: string) {
      if (!currentSessionId) return false;
      const state = getSessionManager().getState(currentSessionId);
      return state ? prop in state : false;
    },
    ownKeys() {
      if (!currentSessionId) return [];
      const state = getSessionManager().getState(currentSessionId);
      return state ? Object.keys(state) : [];
    },
    getOwnPropertyDescriptor(_target, prop: string) {
      if (!currentSessionId) return undefined;
      const state = getSessionManager().getState(currentSessionId);
      if (state && prop in state) {
        return {
          enumerable: true,
          configurable: true,
          value: state[prop],
        };
      }
      return undefined;
    },
  });
}

// グローバル session_state インスタンス
export const session_state = createSessionState();
```

### 3.2 `src/session/index.ts` の作成

```typescript
export { SessionManager, getSessionManager, setSessionManager } from "./manager";
export { session_state, setCurrentSessionId, getCurrentSessionId } from "./state";
export type { SessionId, Session, SessionConfig, SessionState } from "./types";
```

### 成果物
- [ ] `src/session/state.ts` 作成
- [ ] `src/session/index.ts` 作成
- [ ] session_state のテスト

---

## Step 4: Widget 型定義と基盤

### 4.1 `src/widgets/types.ts` の作成

```typescript
// Widget の基本インターフェース
export interface WidgetConfig<T = unknown> {
  id: string;
  label: string;
  defaultValue: T;
}

// Widget の状態
export interface WidgetState<T = unknown> {
  value: T;
}

// Widget レンダリング結果
export interface WidgetRenderResult {
  html: string;
  id: string;
}

// 各 Widget の設定
export interface ButtonConfig {
  label: string;
  key?: string;
}

export interface SliderConfig {
  label: string;
  min: number;
  max: number;
  defaultValue?: number;
  step?: number;
  key?: string;
}

export interface TextInputConfig {
  label: string;
  defaultValue?: string;
  placeholder?: string;
  key?: string;
}

export interface SelectboxConfig {
  label: string;
  options: string[];
  defaultValue?: string;
  key?: string;
}
```

### 4.2 `src/widgets/registry.ts` の作成

```typescript
import { getSessionManager } from "../session/manager";
import { getCurrentSessionId } from "../session/state";

// Widget ID 生成カウンター（rerun 毎にリセット）
let widgetCounter = 0;

export function resetWidgetCounter(): void {
  widgetCounter = 0;
}

export function generateWidgetId(key?: string): string {
  if (key) return key;
  return `widget_${widgetCounter++}`;
}

// Widget の値を取得
export function getWidgetValue<T>(widgetId: string, defaultValue: T): T {
  const sessionId = getCurrentSessionId();
  if (!sessionId) return defaultValue;

  const state = getSessionManager().getState(sessionId);
  if (!state || !(widgetId in state)) {
    return defaultValue;
  }
  return state[widgetId] as T;
}

// Widget の値を設定
export function setWidgetValue<T>(widgetId: string, value: T): void {
  const sessionId = getCurrentSessionId();
  if (!sessionId) return;

  getSessionManager().setState(sessionId, widgetId, value);
}
```

### 成果物
- [ ] `src/widgets/types.ts` 作成
- [ ] `src/widgets/registry.ts` 作成
- [ ] Widget 基盤のテスト

---

## Step 5: 基本 Widget 実装

### 5.1 `src/widgets/button.ts` の作成

```typescript
import { getContext } from "../runtime/context";
import type { ButtonConfig, WidgetRenderResult } from "./types";
import { generateWidgetId } from "./registry";

export function button(label: string, config?: Partial<ButtonConfig>): boolean {
  const id = generateWidgetId(config?.key);
  const context = getContext();

  // 現在の rerun がこのボタンの押下によるものかチェック
  const pressed = context?.event?.widgetId === id;

  return pressed;
}

export function renderButton(label: string, config?: Partial<ButtonConfig>): WidgetRenderResult {
  const id = generateWidgetId(config?.key);

  const html = `
    <button
      id="${id}"
      onclick="sendEvent('${id}', 'clicked')"
      class="kt-button"
    >
      ${escapeHtml(label)}
    </button>
  `;

  return { html, id };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
```

### 5.2 `src/widgets/slider.ts` の作成

```typescript
import type { SliderConfig, WidgetRenderResult } from "./types";
import { generateWidgetId, getWidgetValue, setWidgetValue } from "./registry";

export function slider(
  label: string,
  min: number,
  max: number,
  defaultValue?: number,
  config?: Partial<SliderConfig>
): number {
  const id = generateWidgetId(config?.key);
  const step = config?.step ?? 1;
  const initial = defaultValue ?? min;

  // 現在の値を取得（なければデフォルト値を設定）
  let value = getWidgetValue<number>(id, initial);

  // 初回のみデフォルト値を state に保存
  if (getWidgetValue<number | undefined>(id, undefined) === undefined) {
    setWidgetValue(id, initial);
    value = initial;
  }

  return value;
}

export function renderSlider(
  label: string,
  min: number,
  max: number,
  value: number,
  config?: Partial<SliderConfig>
): WidgetRenderResult {
  const id = generateWidgetId(config?.key);
  const step = config?.step ?? 1;

  const html = `
    <div class="kt-slider-container">
      <label for="${id}" class="kt-slider-label">${escapeHtml(label)}: ${value}</label>
      <input
        type="range"
        id="${id}"
        min="${min}"
        max="${max}"
        step="${step}"
        value="${value}"
        oninput="sendEvent('${id}', Number(this.value))"
        class="kt-slider"
      />
    </div>
  `;

  return { html, id };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
```

### 5.3 `src/widgets/text-input.ts` の作成

```typescript
import type { TextInputConfig, WidgetRenderResult } from "./types";
import { generateWidgetId, getWidgetValue, setWidgetValue } from "./registry";

export function text_input(
  label: string,
  defaultValue?: string,
  config?: Partial<TextInputConfig>
): string {
  const id = generateWidgetId(config?.key);
  const initial = defaultValue ?? "";

  // 現在の値を取得
  let value = getWidgetValue<string>(id, initial);

  // 初回のみデフォルト値を state に保存
  if (getWidgetValue<string | undefined>(id, undefined) === undefined) {
    setWidgetValue(id, initial);
    value = initial;
  }

  return value;
}

export function renderTextInput(
  label: string,
  value: string,
  config?: Partial<TextInputConfig>
): WidgetRenderResult {
  const id = generateWidgetId(config?.key);
  const placeholder = config?.placeholder ?? "";

  const html = `
    <div class="kt-text-input-container">
      <label for="${id}" class="kt-text-input-label">${escapeHtml(label)}</label>
      <input
        type="text"
        id="${id}"
        value="${escapeHtml(value)}"
        placeholder="${escapeHtml(placeholder)}"
        oninput="sendEvent('${id}', this.value)"
        class="kt-text-input"
      />
    </div>
  `;

  return { html, id };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
```

### 5.4 `src/widgets/selectbox.ts` の作成

```typescript
import type { SelectboxConfig, WidgetRenderResult } from "./types";
import { generateWidgetId, getWidgetValue, setWidgetValue } from "./registry";

export function selectbox(
  label: string,
  options: string[],
  defaultValue?: string,
  config?: Partial<SelectboxConfig>
): string {
  const id = generateWidgetId(config?.key);
  const initial = defaultValue ?? options[0] ?? "";

  // 現在の値を取得
  let value = getWidgetValue<string>(id, initial);

  // 初回のみデフォルト値を state に保存
  if (getWidgetValue<string | undefined>(id, undefined) === undefined) {
    setWidgetValue(id, initial);
    value = initial;
  }

  return value;
}

export function renderSelectbox(
  label: string,
  options: string[],
  value: string,
  config?: Partial<SelectboxConfig>
): WidgetRenderResult {
  const id = generateWidgetId(config?.key);

  const optionsHtml = options
    .map(opt => `<option value="${escapeHtml(opt)}" ${opt === value ? "selected" : ""}>${escapeHtml(opt)}</option>`)
    .join("\n");

  const html = `
    <div class="kt-selectbox-container">
      <label for="${id}" class="kt-selectbox-label">${escapeHtml(label)}</label>
      <select
        id="${id}"
        onchange="sendEvent('${id}', this.value)"
        class="kt-selectbox"
      >
        ${optionsHtml}
      </select>
    </div>
  `;

  return { html, id };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
```

### 5.5 `src/widgets/index.ts` の作成

```typescript
export { button, renderButton } from "./button";
export { slider, renderSlider } from "./slider";
export { text_input, renderTextInput } from "./text-input";
export { selectbox, renderSelectbox } from "./selectbox";
export { generateWidgetId, resetWidgetCounter, getWidgetValue, setWidgetValue } from "./registry";
export type * from "./types";
```

### 成果物
- [ ] `src/widgets/button.ts` 作成
- [ ] `src/widgets/slider.ts` 作成
- [ ] `src/widgets/text-input.ts` 作成
- [ ] `src/widgets/selectbox.ts` 作成
- [ ] `src/widgets/index.ts` 作成
- [ ] 各 Widget のユニットテスト

---

## Step 6: rerun のセッション対応

### 6.1 `src/runtime/context.ts` の更新

```typescript
import type { SessionId } from "../session/types";

export interface RerunContext {
  // セッション情報
  sessionId?: SessionId;
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

### 6.2 `src/runtime/rerun.ts` の更新

```typescript
import { type RerunContext, clearContext, setContext } from "./context";
import { setCurrentSessionId } from "../session/state";
import { resetWidgetCounter } from "../widgets/registry";

export type Script = () => string;

export function rerun(
  script: Script,
  event?: RerunContext["event"],
  sessionId?: string
): string {
  try {
    // Widget カウンターをリセット
    resetWidgetCounter();

    // セッションIDを設定
    setCurrentSessionId(sessionId ?? null);

    // コンテキストを設定
    setContext({ event, sessionId });

    // スクリプトを実行してHTMLを生成
    const html = script();

    return html;
  } finally {
    // コンテキストをクリア
    clearContext();
    setCurrentSessionId(null);
  }
}
```

### 成果物
- [ ] `src/runtime/context.ts` 更新
- [ ] `src/runtime/rerun.ts` 更新
- [ ] セッション対応のテスト

---

## Step 7: WebSocket ハンドラのセッション対応

### 7.1 `src/websocket/types.ts` の更新

```typescript
// クライアント → サーバ
export interface ClientMessage {
  type: "event" | "init";
  widgetId?: string;
  value?: unknown;
  sessionId?: string;  // 既存セッションIDを送信
}

// サーバ → クライアント
export interface ServerMessage {
  type: "patch" | "session";
  patches?: Patch[];
  sessionId?: string;  // 新規セッションID通知
}

export type Patch = ReplaceRootPatch;

export interface ReplaceRootPatch {
  type: "replaceRoot";
  html: string;
}
```

### 7.2 `src/app.ts` の更新

```typescript
import { Hono } from "hono";
import { type Script, rerun } from "./runtime";
import { createWebSocketHandler, websocket } from "./websocket";
import { getSessionManager } from "./session";
import type { ClientMessage, ServerMessage } from "./websocket/types";

const clientScript = `
  let sessionId = localStorage.getItem("kt-session-id");
  const ws = new WebSocket(\`ws://\${location.host}/ws\`);

  ws.onopen = () => {
    console.log("Connected to server");
    // 初期化メッセージを送信
    ws.send(JSON.stringify({ type: "init", sessionId }));
  };

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);

    // セッションID を保存
    if (msg.sessionId) {
      sessionId = msg.sessionId;
      localStorage.setItem("kt-session-id", sessionId);
    }

    if (msg.type === "patch" && msg.patches) {
      for (const patch of msg.patches) {
        if (patch.type === "replaceRoot") {
          document.getElementById("app").innerHTML = patch.html;
        }
      }
    }
  };

  ws.onclose = () => {
    console.log("Disconnected from server");
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  // イベント送信用のグローバル関数
  window.sendEvent = (widgetId, value) => {
    ws.send(JSON.stringify({ type: "event", widgetId, value, sessionId }));
  };
`;

export function createApp(script: Script) {
  const app = new Hono();
  const sessionManager = getSessionManager();

  // ルートページ
  app.get("/", (c) => {
    // 初期表示はセッションなしで rerun
    const initialHtml = rerun(script);
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>kantan-ui</title>
        <style>
          .kt-button { padding: 8px 16px; cursor: pointer; }
          .kt-slider-container { margin: 10px 0; }
          .kt-slider { width: 200px; }
          .kt-text-input-container { margin: 10px 0; }
          .kt-text-input { padding: 8px; width: 200px; }
          .kt-selectbox-container { margin: 10px 0; }
          .kt-selectbox { padding: 8px; }
        </style>
      </head>
      <body>
        <div id="app">${initialHtml}</div>
        <script>${clientScript}</script>
      </body>
      </html>
    `);
  });

  // WebSocket エンドポイント
  app.get(
    "/ws",
    createWebSocketHandler({
      onOpen: (_evt, ws) => {
        console.log("WebSocket connected");
      },
      onMessage: (event, ws) => {
        const data: ClientMessage = JSON.parse(event.data.toString());

        if (data.type === "init") {
          // セッションを取得または作成
          const session = sessionManager.getOrCreateSession(data.sessionId);
          sessionManager.associateWebSocket(ws, session.id);

          // 初期HTMLを送信
          const html = rerun(script, undefined, session.id);
          const message: ServerMessage = {
            type: "patch",
            patches: [{ type: "replaceRoot", html }],
            sessionId: session.id,
          };
          ws.send(JSON.stringify(message));
        } else if (data.type === "event") {
          // セッションを取得
          const session = sessionManager.getSessionByWebSocket(ws);
          if (!session) {
            console.error("Session not found for WebSocket");
            return;
          }

          // Widget の値を更新
          if (data.widgetId && data.value !== undefined) {
            sessionManager.setState(session.id, data.widgetId, data.value);
          }

          // rerun を実行
          const html = rerun(
            script,
            { widgetId: data.widgetId!, value: data.value },
            session.id
          );

          // replaceRoot パッチを送信
          const message: ServerMessage = {
            type: "patch",
            patches: [{ type: "replaceRoot", html }],
          };
          ws.send(JSON.stringify(message));
        }
      },
      onClose: (_evt, ws) => {
        sessionManager.removeWebSocket(ws);
        console.log("WebSocket disconnected");
      },
    }),
  );

  return { app, websocket };
}
```

### 成果物
- [ ] `src/websocket/types.ts` 更新
- [ ] `src/app.ts` 更新
- [ ] 統合テスト

---

## Step 8: テスト実装

### 8.1 セッション管理テスト

```typescript
// tests/unit/session/manager.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { SessionManager } from "../../../src/session/manager";

describe("SessionManager", () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  it("should create a new session", () => {
    const session = manager.createSession();
    expect(session.id).toBeDefined();
    expect(session.state).toEqual({});
  });

  it("should get existing session", () => {
    const session = manager.createSession();
    const retrieved = manager.getSession(session.id);
    expect(retrieved?.id).toBe(session.id);
  });

  it("should manage session state", () => {
    const session = manager.createSession();
    manager.setState(session.id, "counter", 5);
    expect(manager.getState(session.id)?.counter).toBe(5);
  });
});
```

### 8.2 Widget テスト

```typescript
// tests/unit/widgets/button.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { button } from "../../../src/widgets/button";
import { setContext, clearContext } from "../../../src/runtime/context";
import { resetWidgetCounter } from "../../../src/widgets/registry";

describe("button", () => {
  beforeEach(() => {
    resetWidgetCounter();
    clearContext();
  });

  it("should return false when not pressed", () => {
    setContext({ event: undefined });
    const result = button("Click me");
    expect(result).toBe(false);
  });

  it("should return true when pressed", () => {
    setContext({ event: { widgetId: "widget_0", value: "clicked" } });
    const result = button("Click me");
    expect(result).toBe(true);
  });
});
```

### 8.3 E2E テスト

```typescript
// tests/e2e/widgets.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Widget interactions", () => {
  test("slider should update value", async ({ page }) => {
    await page.goto("http://localhost:3000");

    // スライダーを操作
    const slider = page.locator(".kt-slider");
    await slider.fill("50");

    // 値が反映されることを確認
    await expect(page.locator(".kt-slider-label")).toContainText("50");
  });

  test("button should trigger rerun", async ({ page }) => {
    await page.goto("http://localhost:3000");

    // ボタンをクリック
    await page.click(".kt-button");

    // 何らかの変化があることを確認（デモアプリに依存）
  });
});
```

### 成果物
- [ ] `tests/unit/session/manager.test.ts` 作成
- [ ] `tests/unit/session/state.test.ts` 作成
- [ ] `tests/unit/widgets/button.test.ts` 作成
- [ ] `tests/unit/widgets/slider.test.ts` 作成
- [ ] `tests/unit/widgets/text-input.test.ts` 作成
- [ ] `tests/unit/widgets/selectbox.test.ts` 作成
- [ ] `tests/e2e/widgets.spec.ts` 作成

---

## Step 9: デモアプリケーション

### 9.1 `src/server.ts` の更新

```typescript
import { createApp } from "./app";
import { session_state } from "./session";
import { button, slider, text_input, selectbox } from "./widgets";

// デモスクリプト
const script = () => {
  // カウンターの初期化
  if (session_state.counter === undefined) {
    session_state.counter = 0;
  }

  // Widget の使用
  const name = text_input("Your name", "World");
  const count = slider("Count", 0, 100, session_state.counter as number);
  const color = selectbox("Color", ["red", "green", "blue"]);

  if (button("Increment")) {
    session_state.counter = (session_state.counter as number) + 1;
  }

  if (button("Reset")) {
    session_state.counter = 0;
  }

  return `
    <div style="padding: 20px; font-family: sans-serif;">
      <h1 style="color: ${color};">Hello, ${name}!</h1>
      <p>Counter: ${session_state.counter}</p>
      <p>Slider value: ${count}</p>

      <hr />

      <!-- Widget はレンダリング関数で出力 -->
      <div style="margin: 10px 0;">
        <label>Your name:</label>
        <input type="text" id="name" value="${name}" oninput="sendEvent('name', this.value)" />
      </div>

      <div style="margin: 10px 0;">
        <label>Count: ${count}</label>
        <input type="range" id="count" min="0" max="100" value="${count}" oninput="sendEvent('count', Number(this.value))" />
      </div>

      <div style="margin: 10px 0;">
        <label>Color:</label>
        <select id="color" onchange="sendEvent('color', this.value)">
          <option ${color === "red" ? "selected" : ""}>red</option>
          <option ${color === "green" ? "selected" : ""}>green</option>
          <option ${color === "blue" ? "selected" : ""}>blue</option>
        </select>
      </div>

      <div style="margin: 10px 0;">
        <button onclick="sendEvent('btn_inc', 'clicked')">Increment</button>
        <button onclick="sendEvent('btn_reset', 'clicked')">Reset</button>
      </div>
    </div>
  `;
};

const { app, websocket } = createApp(script);

export default {
  fetch: app.fetch,
  websocket,
};
```

### 成果物
- [ ] `src/server.ts` 更新（デモアプリ）
- [ ] デモアプリの動作確認

---

## Step 10: エクスポートと仕上げ

### 10.1 `src/index.ts` の更新

```typescript
// 既存のエクスポート
export { Hono } from "hono";

// App
export { createApp } from "./app";

// Runtime
export { rerun } from "./runtime";
export type { Script } from "./runtime/rerun";
export { getContext, setContext, clearContext } from "./runtime/context";
export type { RerunContext } from "./runtime/context";

// Session
export { session_state, SessionManager, getSessionManager } from "./session";
export type { Session, SessionId, SessionState, SessionConfig } from "./session/types";

// Widgets
export { button, slider, text_input, selectbox } from "./widgets";
export type {
  ButtonConfig,
  SliderConfig,
  TextInputConfig,
  SelectboxConfig,
  WidgetConfig,
  WidgetRenderResult,
} from "./widgets/types";

// WebSocket types
export type { ClientMessage, ServerMessage, Patch } from "./websocket/types";
```

### 成果物
- [ ] `src/index.ts` 更新
- [ ] すべてのエクスポート確認

---

## 実装順序（推奨）

```
Day 1: Step 1 + Step 2
       ├── セッション型定義
       └── セッション管理クラス

Day 2: Step 3 + Step 4
       ├── session_state 実装
       └── Widget 型定義と基盤

Day 3: Step 5
       └── 基本 Widget 実装（button, slider, text_input, selectbox）

Day 4: Step 6 + Step 7
       ├── rerun のセッション対応
       └── WebSocket ハンドラのセッション対応

Day 5: Step 8 + Step 9
       ├── テスト実装
       └── デモアプリケーション

Day 6: Step 10 + バグ修正 + リファクタリング
       ├── エクスポート整理
       └── 最終確認
```

---

## 完了基準

### 機能要件
- [ ] セッションIDが自動生成される
- [ ] セッションが WebSocket に紐付く
- [ ] `session_state` でセッションごとの状態にアクセスできる
- [ ] `button()` が押された rerun でのみ `true` を返す
- [ ] `slider()` が現在値を返す
- [ ] `text_input()` が現在値を返す
- [ ] `selectbox()` が選択された値を返す

### 非機能要件
- [ ] ユニットテストがパスする
- [ ] E2E テストがパスする
- [ ] lint エラーがない
- [ ] ビルドが成功する

### 成果物確認
- [ ] `bun run dev` でサーバが起動する
- [ ] 各 Widget が正しく動作する
- [ ] ページリロードでセッションが維持される
- [ ] 複数タブで独立したセッションになる
- [ ] `bun run test` が成功する
- [ ] `bun run test:e2e` が成功する

---

## 次のステップ（Week 3 への橋渡し）

Week 2 完了後、以下が Week 3 の準備として必要:

1. 仮想DOMツリー構造の設計
2. 差分検出アルゴリズムの選定
3. `replaceNode` プロトコルの設計

---

*作成日: 2025-12-29*
*対象バージョン: kantan-ui v0.0.1*
