# Week2 実装の技術的負債レポート

作成日: 2025-12-30
更新日: 2025-12-30

## 概要

Week2（Widget API + セッション管理）の実装完了後に特定された技術的負債のまとめ。

---

## 🔴 高優先度（修正すべき）

### 1. ~~`escapeHtml` 関数の重複 (DRY違反)~~ ✅ 解消済み

**対応**: `src/utils/html.ts` に統合済み

### ~~1. (旧) `escapeHtml` 関数の重複 (DRY違反)~~

同じ関数が **6箇所** で定義されています：

| ファイル | 行 |
|---------|-----|
| `src/widgets/button.ts` | 5-12 |
| `src/widgets/slider.ts` | 4-11 |
| `src/widgets/text-input.ts` | 4-11 |
| `src/widgets/selectbox.ts` | 4-11 |
| `src/kt/widgets.ts` | 19-26 |
| `src/server.ts` | 104-110 |

**推奨**: `src/utils/escape.ts` に共通化

```typescript
// src/utils/escape.ts
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
```

---

### 2. ウィジェットロジックの二重実装

**命令型API** (`src/widgets/*.ts`) と **宣言的API** (`src/kt/widgets.ts`) で同じロジックが重複：

| ウィジェット | 重複内容 |
|-------------|----------|
| button | 押下判定ロジック (`context?.event?.widgetId === id`) |
| slider | `hasWidgetValue` → `setWidgetValue` パターン |
| text_input | 同上 |
| selectbox | 同上 |

**現状の問題**:
```typescript
// src/widgets/slider.ts:17-34
export function slider(...): number {
  const id = generateWidgetId(config?.key);
  if (!hasWidgetValue(id)) {
    setWidgetValue(id, initial);
  }
  return getWidgetValue<number>(id, initial);
}

// src/kt/widgets.ts:52-79 - ほぼ同じロジック
export function slider(...): number {
  const ctx = requireRenderContext();
  const id = generateWidgetId(config?.key);
  if (!hasWidgetValue(id)) {
    setWidgetValue(id, initial);
  }
  const value = getWidgetValue<number>(id, initial);
  ctx.append(...);  // HTML出力のみ追加
  return value;
}
```

**推奨**: 宣言的APIが命令型APIをラップする形にリファクタ

```typescript
// src/kt/widgets.ts - リファクタ後
import { slider as imperativeSlider, renderSlider } from "../widgets/slider";

export function slider(...): number {
  const ctx = requireRenderContext();
  const value = imperativeSlider(label, min, max, defaultValue, config);
  ctx.append(renderSlider(label, min, max, value, config));
  return value;
}
```

---

### 3. 未使用コードの存在

`src/websocket/handler.ts:23-35`:
```typescript
// 接続中の WebSocket を管理
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

**問題**:
- これらはエクスポートされているが、プロジェクト内で一度も使用されていない
- `src/index.ts` でもエクスポートされており、公開APIを汚染

**推奨**: 削除するか、実際に使用する（セッション管理で使うなど）

---

### 4. セッションクリーンアップが未実装

`SessionManager.cleanup()` は定義されていますが、**呼び出している箇所がありません**。

```typescript
// src/session/manager.ts:95-106
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
```

**問題**: セッションはメモリに残り続け、メモリリークの原因

**推奨**: 定期的なクリーンアップを実装

```typescript
// src/app.ts または専用のスケジューラー
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5分

setInterval(() => {
  const cleaned = sessionManager.cleanup();
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} expired sessions`);
  }
}, CLEANUP_INTERVAL);
```

---

## 🟡 中優先度（改善すべき）

### 5. グローバル状態の乱立

| ファイル | 変数 | 問題点 |
|----------|------|--------|
| `src/session/state.ts:5` | `currentSessionId` | テスト分離が困難 |
| `src/widgets/registry.ts:5` | `widgetCounter` | 同時リクエストで競合リスク |
| `src/kt/context.ts:38` | `currentRenderContext` | テスト分離が困難 |
| `src/session/manager.ts:115` | `globalSessionManager` | シングルトンパターン |
| `src/websocket/handler.ts:23` | `connections` | 未使用だが存在 |

**問題**:
- テスト間での状態漏れ
- 同時リクエスト処理での競合リスク
- Node.js以外のランタイム（Cloudflare Workers等）での問題

**推奨**:
- 短期: テスト時に確実にリセット
- 長期: 依存性注入（DI）パターンへの移行検討

---

### 6. 型安全性の欠如

`session_state` 使用時に型アサーションが必要：

```typescript
// src/server.ts:28-29
session_state.counter = (session_state.counter as number) + 1;
```

**原因**: `SessionState` が `[key: string]: unknown` のため

```typescript
// src/session/types.ts
export interface SessionState {
  [key: string]: unknown;
}
```

**推奨**: ジェネリック型で型安全なセッションステートを提供

```typescript
// 型安全なセッションステート（将来的な改善案）
interface MyAppState {
  counter: number;
  name: string;
}

const state = createTypedSessionState<MyAppState>({
  counter: 0,
  name: "World"
});

state.counter++;  // 型安全
```

---

### 7. WSContext比較の回避策

`src/app.ts:111-114`:
```typescript
// セッションを取得（sessionIdを直接使用、WSContext比較の問題を回避）
const session = data.sessionId
  ? sessionManager.getSession(data.sessionId)
  : sessionManager.getSessionByWebSocket(ws);
```

**問題**:
- 根本的な解決ではなく、ワークアラウンドで対処
- `getSessionByWebSocket` が信頼できないことを示唆

**調査が必要**:
- Bunの `WSContext` オブジェクト比較の挙動
- Mapキーとしての参照等価性

---

### 8. エラーハンドリング不足

**クライアント側** (`src/app.ts:17-18`):
```javascript
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);  // エラーハンドリングなし
```

**サーバー側** (`src/app.ts:95`):
```typescript
const data: ClientMessage = JSON.parse(event.data.toString());  // 同様
```

**問題**: 不正なJSONでクラッシュの可能性

**推奨**:
```typescript
// サーバー側
onMessage: (event, ws) => {
  let data: ClientMessage;
  try {
    data = JSON.parse(event.data.toString());
  } catch (e) {
    console.error("Invalid JSON received:", e);
    return;
  }
  // ...
}
```

---

### 9. E2Eテストの未実装

Week2計画書には `tests/e2e/widgets.spec.ts` が記載されていますが、実際には存在しません。

**現在あるE2Eテスト**:
- `e2e/example.spec.ts`
- `e2e/websocket.spec.ts`

**不足しているテスト**:
- 各ウィジェットの操作テスト
- セッション永続化テスト
- 複数タブでの独立セッションテスト

---

## 🟢 低優先度（将来的に検討）

### 10. 型の不整合

`WidgetRenderResult` 型が定義されていますが、render関数は `string` を返しています：

```typescript
// src/widgets/types.ts で定義
export interface WidgetRenderResult {
  html: string;
  id: string;
}

// 実際の実装 (src/widgets/button.ts:31-35)
export function renderButton(label: string, config?: Partial<ButtonConfig>): string {
  // stringを返している（WidgetRenderResultではない）
}
```

**推奨**:
- 型定義を削除するか
- render関数の戻り値を `WidgetRenderResult` に統一

---

### 11. 命名規則の不一致

| 関数 | 規則 | 理由 |
|------|------|------|
| `text_input` | snake_case | Streamlit互換 |
| `selectbox` | lowercase | Streamlit互換 |
| `renderButton` | camelCase | JavaScript標準 |

**問題**: 一貫性がない

**推奨**: ドキュメントで明記（Streamlit互換APIはsnake_case/lowercaseを維持）

---

## 📊 サマリー

| 優先度 | 件数 | 状態 | 主な内容 |
|--------|------|------|----------|
| 🔴 高 | 4件 | ✅ 全解消 | コード重複、未使用コード、メモリリーク |
| 🟡 中 | 5件 | 3件解消 | グローバル状態、型安全性、エラーハンドリング |
| 🟢 低 | 2件 | 未対応 | 型不整合、命名規則 |

---

## 推奨アクション順序

### Phase 1: 即時対応 ✅ 完了
1. [x] `escapeHtml` の共通化 (`src/utils/html.ts`)
2. [x] 未使用コードの削除 (`connections` 関連)
3. [x] JSONパースのエラーハンドリング追加

### Phase 2: 短期改善 ✅ 完了
4. [x] ウィジェットロジックのリファクタリング（宣言的APIが命令型をラップ）
5. [x] セッションクリーンアップのスケジューリング実装
6. [x] E2Eテストの追加

### Phase 3: 中長期改善
7. [ ] グローバル状態の整理（DI検討）
8. [ ] 型安全なセッションステートの設計
9. [ ] WSContext比較問題の根本調査

---

## 参考リンク

- [Week2 詳細実装計画](./week2-detailed-plan.md)
- [Week1 詳細実装計画](./week1-detailed-plan.md)
