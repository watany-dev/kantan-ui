# Week5 作業計画

作成日: 2026-01-04

## 概要

Week5は「堅牢性 + 接続管理」をテーマに、プロダクション品質の実現を目指す。
Streaming Phase 2は完了しており、接続管理とテスト安定化に焦点を当てる。

---

## 現状の把握

### 完了済み（Week4まで + Week5 Streaming）

| 機能 | ステータス |
|------|-----------|
| WebSocket接続 | ✅ 完了 |
| セッション管理（tab/browser scope） | ✅ 完了 |
| 宣言的API（kt.*） | ✅ 完了 |
| 差分更新（replaceNode等） | ✅ 完了 |
| フォーカス維持 | ✅ 完了 |
| イベントキュー直列化 | ✅ 完了 |
| Abort機能 | ✅ 完了 |
| Streaming Phase 2 | ✅ 完了 |

### 残課題

| 課題 | 優先度 | 状態 |
|------|--------|------|
| E2Eテスト2件スキップ（text_input, selectbox） | 🔴 高 | 未対応 |
| 多重タブ対応（sid → Set<WebSocket>） | 🔴 高 | 未対応 |
| シーケンス番号管理 | 🟡 中 | 未対応 |
| ping/pongによる接続維持 | 🟡 中 | 未対応 |
| 再接続時の状態復元 | 🟡 中 | 未対応 |

---

## タスク一覧

| # | タスク | 優先度 | 工数 | 依存 |
|---|--------|--------|------|------|
| 1 | E2Eテスト安定化 | 🔴 高 | 中 | - |
| 2 | 多重タブ対応 | 🔴 高 | 中 | - |
| 3 | シーケンス番号管理 | 🟡 中 | 中 | #2 |
| 4 | ping/pong接続維持 | 🟡 中 | 小 | - |
| 5 | 再接続・状態復元 | 🟡 中 | 大 | #3, #4 |
| 6 | パフォーマンス最適化 | 🟢 低 | 小 | - |

---

## 1. E2Eテスト安定化 🔴 高優先度

### 現状の問題

`e2e/websocket.spec.ts`で2件のテストがスキップ中:
- "should update text input value"
- "should update selectbox value"

### 原因

Playwright の `evaluate()` でディスパッチしたイベントが `#app` の event delegation に到達しない。

```typescript
// 現状の問題
await page.evaluate(() => {
  const input = document.querySelector('input');
  input.dispatchEvent(new Event('change', { bubbles: true }));
});
// → event delegation で捕捉されない
```

### 調査観点

1. **isTrusted プロパティ**: 合成イベントは `isTrusted: false` のためフィルタされている可能性
2. **Event constructorオプション**: `composed: true` の設定が必要か
3. **event delegation実装**: `#app` のリスナー設定の確認

### 解決アプローチ

#### 1.1 isTrusted問題の確認

```typescript
// クライアントスクリプトの修正案
document.getElementById("app").addEventListener("change", (e) => {
  // isTrustedをチェックしているか確認
  console.log("isTrusted:", e.isTrusted);
  // 必要なら isTrusted チェックを削除
});
```

#### 1.2 Event optionsの調整

```typescript
// E2Eテストでの修正案
await page.evaluate(() => {
  const input = document.querySelector('input');
  input.dispatchEvent(new Event('change', {
    bubbles: true,
    composed: true,  // Shadow DOM対応
    cancelable: true,
  }));
});
```

#### 1.3 InputEventの使用

```typescript
// InputEventを使用（より正確なイベント）
await page.evaluate(() => {
  const input = document.querySelector('input');
  input.value = 'new value';
  input.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    composed: true,
    inputType: 'insertText',
    data: 'new value',
  }));
});
```

### 成果物

- [ ] 原因の特定と調査レポート
- [ ] `src/app.ts` クライアントスクリプトの修正（必要な場合）
- [ ] `e2e/websocket.spec.ts` のスキップ解除
- [ ] 全E2Eテストパス

---

## 2. 多重タブ対応 🔴 高優先度

### 目的

同一セッション（同一ブラウザ）で複数タブを開いた場合、すべてのタブが同期されるようにする。

### 現状

```typescript
// 現在: 1セッション = 1 WebSocket
interface Session {
  id: SessionId;
  state: SessionState;
  ws?: WSContext;  // 単一のWebSocket
}
```

### 実装

#### 2.1 Session型の拡張

```typescript
// src/session/types.ts
export interface Session {
  id: SessionId;
  state: SessionState;
  lastHtml?: string;
  // 変更: 単一 → Set
  connections: Set<WebSocket>;
  eventQueue: EventQueueItem[];
  isProcessing: boolean;
  currentAbortController?: AbortController;
}
```

#### 2.2 SessionManagerの修正

```typescript
// src/session/manager.ts
export class SessionManager {
  addConnection(sessionId: SessionId, ws: WebSocket): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.connections.add(ws);
    }
  }

  removeConnection(sessionId: SessionId, ws: WebSocket): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.connections.delete(ws);
      // すべての接続が切れたらセッションをクリーンアップ対象に
      if (session.connections.size === 0) {
        this.scheduleCleanup(sessionId);
      }
    }
  }

  broadcast(sessionId: SessionId, message: ServerMessage): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const json = JSON.stringify(message);
    for (const ws of session.connections) {
      try {
        ws.send(json);
      } catch (e) {
        // 切断されたWebSocketを削除
        session.connections.delete(ws);
      }
    }
  }
}
```

#### 2.3 app.tsの修正

```typescript
// パッチ送信を全接続に broadcast
const patches = toWebSocketPatches(session.lastHtml, newHtml);
sessionManager.broadcast(session.id, {
  type: "patch",
  patches,
  partial: false,
});
```

### テスト

```typescript
// tests/session/multi-tab.test.ts
describe("Multi-tab support", () => {
  it("should broadcast patches to all connections", async () => {
    // 1セッションに2つのWebSocket接続
    // 片方でイベント発火
    // 両方にパッチが送信されることを確認
  });

  it("should handle connection close gracefully", async () => {
    // 1接続が切断
    // 他の接続は継続動作
  });
});
```

### 成果物

- [ ] `src/session/types.ts` の Session 型変更
- [ ] `src/session/manager.ts` に broadcast メソッド追加
- [ ] `src/app.ts` でbroadcast使用
- [ ] `tests/session/multi-tab.test.ts` 作成

---

## 3. シーケンス番号管理 🟡 中優先度

### 目的

クライアントとサーバー間のパッチ順序を保証し、欠損時の再同期を可能にする。

### 実装

#### 3.1 シーケンス番号の追加

```typescript
// src/websocket/types.ts
export interface ClientMessage {
  type: "hello" | "event";
  sessionId?: string;
  widgetId?: string;
  value?: unknown;
  clientSeq?: number;  // 新規追加
}

export interface ServerMessage {
  type: "patch";
  patches: Patch[];
  partial?: boolean;
  serverSeq?: number;  // 新規追加
}
```

#### 3.2 Session型への追加

```typescript
// src/session/types.ts
export interface Session {
  // ...既存フィールド
  lastServerSeq: number;
  patchHistory: Array<{
    seq: number;
    patches: Patch[];
    timestamp: number;
  }>;
}
```

#### 3.3 再同期ロジック

```typescript
// クライアントから lastSeq を送信
const shouldFullSync = (clientSeq: number, serverSeq: number): boolean => {
  // 差が大きい場合はフル同期
  const MAX_HISTORY = 100;
  return serverSeq - clientSeq > MAX_HISTORY;
};
```

### 成果物

- [ ] `src/websocket/types.ts` にシーケンス番号追加
- [ ] `src/session/types.ts` に履歴管理フィールド追加
- [ ] `src/session/manager.ts` にシーケンス管理メソッド追加
- [ ] 再同期ロジック実装
- [ ] ユニットテスト作成

---

## 4. ping/pong接続維持 🟡 中優先度

### 目的

アイドル状態での接続切断を防ぎ、接続状態を監視する。

### 実装

#### 4.1 サーバー側ping送信

```typescript
// src/app.ts
const PING_INTERVAL = 30000; // 30秒

// セッション作成時にpingタイマー設定
setInterval(() => {
  for (const session of sessionManager.getAllSessions()) {
    for (const ws of session.connections) {
      try {
        ws.send(JSON.stringify({ type: "ping" }));
      } catch (e) {
        session.connections.delete(ws);
      }
    }
  }
}, PING_INTERVAL);
```

#### 4.2 クライアント側pong応答

```typescript
// クライアントスクリプト
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === "ping") {
    ws.send(JSON.stringify({ type: "pong" }));
    return;
  }
  // 既存の処理...
};
```

#### 4.3 接続タイムアウト

```typescript
// pongが一定時間来なければ切断とみなす
const PONG_TIMEOUT = 60000; // 60秒
```

### 成果物

- [ ] `src/app.ts` にping送信ロジック追加
- [ ] クライアントスクリプトにpong応答追加
- [ ] タイムアウト検知と切断処理
- [ ] テスト作成

---

## 5. 再接続・状態復元 🟡 中優先度

### 目的

接続が切断された後、再接続時に前の状態を復元する。

### 実装

#### 5.1 クライアント側再接続

```typescript
// クライアントスクリプト
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 1000; // 1秒

function connect() {
  ws = new WebSocket(wsUrl);
  ws.onclose = () => {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      setTimeout(() => {
        reconnectAttempts++;
        connect();
      }, RECONNECT_DELAY * Math.pow(2, reconnectAttempts));
    }
  };
  ws.onopen = () => {
    reconnectAttempts = 0;
    // sessionIdとlastSeqを送信
    ws.send(JSON.stringify({
      type: "hello",
      sessionId: storedSessionId,
      lastSeq: lastReceivedSeq,
    }));
  };
}
```

#### 5.2 サーバー側復元

```typescript
// helloメッセージ処理
if (data.type === "hello" && data.sessionId && data.lastSeq !== undefined) {
  const session = sessionManager.getSession(data.sessionId);
  if (session) {
    // 欠損したパッチを再送
    const missedPatches = session.patchHistory.filter(p => p.seq > data.lastSeq);
    if (missedPatches.length > 0) {
      ws.send(JSON.stringify({
        type: "patch",
        patches: missedPatches.flatMap(p => p.patches),
        serverSeq: session.lastServerSeq,
      }));
    }
  }
}
```

### 成果物

- [ ] クライアント再接続ロジック実装
- [ ] サーバー側パッチ再送ロジック実装
- [ ] E2Eテスト（接続切断→再接続シナリオ）

---

## 6. パフォーマンス最適化 🟢 低優先度

### 内容

#### 6.1 イベントデバウンス

スライダー等の高頻度イベントをデバウンス。

```typescript
// クライアント側
let debounceTimer;
function sendEvent(event) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    ws.send(JSON.stringify(event));
  }, 50); // 50ms
}
```

#### 6.2 バッチパッチ

短時間に複数パッチが発生した場合、まとめて送信。

### 成果物

- [ ] イベントデバウンス実装
- [ ] バッチパッチ検討
- [ ] パフォーマンス計測

---

## 実装順序

```
Day 1-2: タスク#1（E2Eテスト安定化）
         ├── evaluate()問題の調査
         ├── クライアントスクリプト修正
         └── スキップテスト有効化

Day 3-4: タスク#2（多重タブ対応）
         ├── Session型変更
         ├── broadcast実装
         └── テスト作成

Day 5: タスク#4（ping/pong接続維持）
       ├── pingタイマー実装
       └── クライアントpong対応

Day 6-7: タスク#3（シーケンス番号管理）
         ├── シーケンス番号追加
         ├── 履歴管理実装
         └── 再同期ロジック

Day 8-9: タスク#5（再接続・状態復元）
         ├── クライアント再接続
         └── サーバーパッチ再送

Day 10: タスク#6（パフォーマンス最適化）+ バッファ
        └── bun run ci
```

---

## 完了基準

### 必須

- [ ] 全E2Eテストがパス（スキップなし）
- [ ] 多重タブで状態が同期される
- [ ] `bun run ci` が成功

### 望ましい

- [ ] ping/pongによる接続維持
- [ ] シーケンス番号による再同期
- [ ] 再接続後の状態復元

---

## リスクと対策

| リスク | 対策 |
|--------|------|
| E2E問題が根深い | 代替アプローチ検討（native events） |
| 多重タブ競合 | 楽観的ロック検討 |
| パッチ履歴のメモリ | 上限設定、古い履歴の削除 |
| 再接続ロジック複雑化 | フル同期をフォールバックに |

---

## 次のステップ（Week6への橋渡し）

Week5完了後、以下をWeek6で対応:

1. **プラグイン機構**: カスタムWidget登録
2. **レイアウトコンポーネント**: `kt.columns()`, `kt.sidebar()`, `kt.tabs()`
3. **データWidget**: `kt.dataframe()`, `kt.chart()`
4. **DX改善**: Hot Reload, デバッグツール

---

*対象バージョン: kantan-ui v0.0.4*
