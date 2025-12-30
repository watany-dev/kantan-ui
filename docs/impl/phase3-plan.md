# Phase 3: 中長期改善計画

作成日: 2025-12-30

## 概要

Phase 1-2で解消した技術的負債を踏まえ、アーキテクチャレベルの改善を行う。

---

## 課題一覧

| # | 課題 | 優先度 | 工数 |
|---|------|--------|------|
| 1 | グローバル状態の整理（DI導入） | 高 | 中 |
| 2 | 型安全なセッションステート | 中 | 中 |
| 3 | WSContext比較問題の根本調査 | 低 | 小 |

---

## 1. グローバル状態の整理（DI導入）

### 現状の問題

5箇所のグローバル状態が存在：

```
src/session/state.ts:5      → currentSessionId
src/session/manager.ts:146  → globalSessionManager
src/kt/context.ts:38        → currentRenderContext
src/widgets/registry.ts:6   → widgetCounter
src/runtime/context.ts      → currentContext (RerunContext)
```

**問題点**:
- テスト間での状態漏れ
- 同時リクエスト処理での競合リスク
- Cloudflare Workers等のエッジランタイムで非対応

### 解決アプローチ

**Option A: AsyncLocalStorage（推奨）**
```typescript
// src/context/async-context.ts
import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContext {
  sessionId: string;
  sessionManager: SessionManager;
  renderContext: RenderContext;
  widgetCounter: number;
}

export const asyncContext = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return asyncContext.run(ctx, fn);
}

export function getContext(): RequestContext {
  const ctx = asyncContext.getStore();
  if (!ctx) throw new Error("No context available");
  return ctx;
}
```

**利点**:
- Node.js/Bun/Denoでネイティブサポート
- リクエストごとに独立したコンテキスト
- 既存APIを破壊せずに移行可能

**Option B: 明示的なContext引数**
```typescript
// 全APIにcontextを渡す（破壊的変更）
function slider(ctx: Context, label: string, ...): number
```

**欠点**: Streamlit互換性が崩れる

### 実装ステップ

#### Step 1.1: RequestContext型の定義
```typescript
// src/context/types.ts
export interface RequestContext {
  sessionId: SessionId | null;
  sessionManager: SessionManager;
  renderContext: RenderContext | null;
  widgetCounter: number;
  event?: { widgetId: string; value: unknown };
}
```

#### Step 1.2: AsyncLocalStorage導入
```typescript
// src/context/async-context.ts
import { AsyncLocalStorage } from "node:async_hooks";
import type { RequestContext } from "./types";

export const requestContext = new AsyncLocalStorage<RequestContext>();
```

#### Step 1.3: 既存グローバル状態のラップ
```typescript
// src/session/state.ts (リファクタ後)
import { requestContext } from "../context/async-context";

export function getCurrentSessionId(): SessionId | null {
  return requestContext.getStore()?.sessionId ?? null;
}
```

#### Step 1.4: rerun関数の更新
```typescript
// src/runtime/rerun.ts
export function rerun(script: Script, event?: Event, sessionId?: string): string {
  const ctx: RequestContext = {
    sessionId: sessionId ?? null,
    sessionManager: getSessionManager(),
    renderContext: new RenderContext(),
    widgetCounter: 0,
    event,
  };

  return requestContext.run(ctx, () => {
    const html = script();
    return html ?? ctx.renderContext.getHtml();
  });
}
```

#### Step 1.5: テスト更新
- 各テストで `requestContext.run()` を使用
- `beforeEach` での状態リセット不要に

### 成果物
- [ ] `src/context/types.ts` 作成
- [ ] `src/context/async-context.ts` 作成
- [ ] `src/context/index.ts` 作成
- [ ] `src/session/state.ts` リファクタ
- [ ] `src/kt/context.ts` リファクタ
- [ ] `src/widgets/registry.ts` リファクタ
- [ ] `src/runtime/rerun.ts` 更新
- [ ] 全テストの動作確認

---

## 2. 型安全なセッションステート

### 現状の問題

```typescript
// 型アサーションが必要
session_state.counter = (session_state.counter as number) + 1;

// 型定義
interface SessionState {
  [key: string]: unknown;  // 任意のキーを許可
}
```

### 解決アプローチ

**Option A: ジェネリック型 + createSessionState**
```typescript
// ユーザー定義の型
interface MyAppState {
  counter: number;
  name: string;
  items: string[];
}

// 型安全なセッションステート
const state = createTypedSessionState<MyAppState>({
  counter: 0,
  name: "World",
  items: [],
});

state.counter++;        // ✓ 型安全
state.foo = "bar";      // ✗ コンパイルエラー
```

**Option B: declare module拡張**
```typescript
// ユーザー側で型を拡張
declare module "kantan-ui" {
  interface SessionState {
    counter: number;
    name: string;
  }
}

session_state.counter++;  // 型安全
```

### 実装（Option A 推奨）

#### Step 2.1: 型定義の追加
```typescript
// src/session/typed-state.ts
export interface TypedSessionStateOptions<T> {
  defaults: T;
  key?: string;  // 名前空間（複数のstate用）
}

export function createTypedSessionState<T extends Record<string, unknown>>(
  options: TypedSessionStateOptions<T>
): T {
  const { defaults, key = "__typed" } = options;

  return new Proxy({} as T, {
    get(_target, prop: string) {
      const sessionId = getCurrentSessionId();
      if (!sessionId) return defaults[prop as keyof T];

      const state = getSessionManager().getState(sessionId);
      const typedState = state?.[key] as Partial<T> | undefined;

      return typedState?.[prop as keyof T] ?? defaults[prop as keyof T];
    },
    set(_target, prop: string, value: unknown) {
      const sessionId = getCurrentSessionId();
      if (!sessionId) return true;

      const manager = getSessionManager();
      const state = manager.getState(sessionId);
      const typedState = (state?.[key] ?? {}) as Partial<T>;
      typedState[prop as keyof T] = value as T[keyof T];
      manager.setState(sessionId, key, typedState);

      return true;
    },
  });
}
```

#### Step 2.2: 使用例とドキュメント
```typescript
// examples/typed-state.ts
import { createTypedSessionState, kt } from "kantan-ui";

interface AppState {
  counter: number;
  name: string;
}

const state = createTypedSessionState<AppState>({
  defaults: { counter: 0, name: "World" }
});

const script = () => {
  if (kt.button("Increment")) {
    state.counter++;  // 型安全！
  }
  kt.write(`Count: ${state.counter}`);
  return undefined;
};
```

### 成果物
- [ ] `src/session/typed-state.ts` 作成
- [ ] `src/session/index.ts` エクスポート追加
- [ ] ユニットテスト
- [ ] 使用例ドキュメント

---

## 3. WSContext比較問題の根本調査

### 現状の問題

```typescript
// src/app.ts:271-274
// WSContext比較の問題を回避するワークアラウンド
const session = data.sessionId
  ? sessionManager.getSession(data.sessionId)
  : sessionManager.getSessionByWebSocket(ws);
```

`Map<WSContext, SessionId>` でWSContextをキーにすると、同一接続でも参照が異なる可能性。

### 調査項目

1. **Bun/HonoのWSContext実装確認**
   - WSContextは各イベントで新規生成されるか？
   - `raw`プロパティは安定しているか？

2. **代替キー戦略**
   ```typescript
   // Option A: rawソケットを使用
   private wsToSession = new Map<WebSocket, SessionId>();

   associateWebSocket(ws: WSContext, sessionId: SessionId): void {
     this.wsToSession.set(ws.raw, sessionId);  // rawを使用
   }

   // Option B: WeakMapを使用（自動GC）
   private wsToSession = new WeakMap<object, SessionId>();
   ```

3. **現状のワークアラウンドの妥当性**
   - sessionIdをクライアントから送信する方式は機能している
   - 根本解決より現状維持でも許容可能

### 実装ステップ

#### Step 3.1: 調査
```bash
# Honoのソースを確認
grep -r "WSContext" node_modules/hono/
```

#### Step 3.2: 検証テスト
```typescript
// tests/investigation/ws-context.test.ts
import { describe, it, expect } from "vitest";

describe("WSContext identity", () => {
  it("should maintain reference equality across events", async () => {
    // WebSocket接続してイベント発火
    // onOpen, onMessage で渡されるwsが同一参照かテスト
  });
});
```

#### Step 3.3: 結論に基づく対応
- 同一参照が保証される → ワークアラウンド削除
- 保証されない → 現状維持 or rawソケット使用

### 成果物
- [ ] 調査レポート
- [ ] 検証テスト
- [ ] 必要に応じてリファクタ

---

## 実装順序（推奨）

```
Week 1: 課題1（DI導入）
        ├── AsyncLocalStorage導入
        ├── グローバル状態のリファクタ
        └── テスト更新

Week 2: 課題2（型安全セッションステート）
        ├── createTypedSessionState実装
        ├── ドキュメント・例
        └── 既存session_stateとの共存確認

Week 3: 課題3（WSContext調査）+ バッファ
        ├── 調査・検証
        └── 対応判断
```

---

## リスクと考慮事項

### AsyncLocalStorage
- **Cloudflare Workers**: 非サポート → 将来的に別実装が必要
- **パフォーマンス**: ごく僅かなオーバーヘッド（無視可能）

### 型安全セッションステート
- **既存API**: `session_state` は維持（後方互換）
- **移行コスト**: オプトイン方式で段階的に移行可能

### 破壊的変更
- Phase 3は基本的に**非破壊的変更**
- 既存APIは維持しつつ、新APIを追加する方針

---

## 完了基準

- [ ] 全テストがパス
- [ ] グローバル変数が `requestContext` に集約
- [ ] `createTypedSessionState` がエクスポート
- [ ] WSContext問題の調査完了
- [ ] ドキュメント更新

---

*対象バージョン: kantan-ui v0.1.0*
