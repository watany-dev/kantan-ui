# kantan-ui Week5: ストリーミングとリアルタイム通信の強化

## はじめに

Week5では、kantan-uiのリアルタイム通信基盤を大幅に強化しました。マルチタブサポート、接続の安定性向上、そしてプログレッシブUIレンダリングのためのストリーミングインフラを実装しています。

## Week5で実装した機能

### 1. ストリーミングインフラ（Phase 2）

大量のUIコンポーネントを生成する場合、すべての処理が完了するまでユーザーを待たせるのは良くありません。Week5では、rerun実行中に部分的なHTMLをクライアントにプッシュする「ストリーミング」機能を実装しました。

#### 仕組み

```
[Server]                              [Client]
    │                                     │
    │  1. イベント受信                    │
    ├←────────────────────────────────────┤
    │                                     │
    │  2. rerun開始                       │
    │     ├─ kt.title() → buffer         │
    │     ├─ kt.write() → buffer         │
    │     ├─ kt.button() → buffer        │
    │     └─ 3要素到達 → FLUSH           │
    │                                     │
    │  3. streamAppend送信                │
    ├────────────────────────────────────→│
    │                                 DOM追加│
    │                                     │
    │  4. 続きを処理...                   │
    │     ├─ kt.slider() → buffer        │
    │     ├─ kt.write() → buffer         │
    │     └─ rerun完了                    │
    │                                     │
    │  5. 最終パッチ送信（差分）          │
    ├────────────────────────────────────→│
    │                              DOM更新完了│
```

#### 新しいパッチタイプ

```typescript
// src/websocket/types.ts
type Patch =
  | { type: "replaceRoot"; html: string }
  | { type: "replaceNode"; id: string; html: string }
  | { type: "removeNode"; id: string }
  | { type: "insertNode"; parentId: string; index: number; html: string }
  | { type: "streamAppend"; html: string };  // NEW: ストリーミング追加
```

`streamAppend`パッチは、既存のDOMに新しい要素を追加します。ストリーミング中はフォーカス状態の保存・復元をスキップし、最終パッチ適用時のみ復元を行います。

#### 設定

```typescript
export default createApp(script, {
  streaming: {
    enabled: true,      // ストリーミングを有効化
    flushThreshold: 3,  // 3要素ごとにフラッシュ
  },
});
```

### 2. マルチタブサポート

同じセッションを複数のブラウザタブで開いた場合、すべてのタブに状態変更をブロードキャストするようになりました。

#### 実装のポイント

```typescript
// SessionManager に WebSocket 接続を管理
class SessionManager {
  private wsConnections = new Map<string, Set<WSContext>>();

  addConnection(sessionId: string, ws: WSContext) {
    const connections = this.wsConnections.get(sessionId) ?? new Set();
    connections.add(ws);
    this.wsConnections.set(sessionId, connections);
  }

  broadcast(sessionId: string, message: ServerMessage) {
    const connections = this.wsConnections.get(sessionId);
    if (!connections) return;
    const data = JSON.stringify(message);
    for (const ws of connections) {
      ws.send(data);
    }
  }
}
```

これにより、あるタブでボタンをクリックすると、同じセッションの他のタブでも即座にUIが更新されます。

### 3. Ping/Pongによる接続維持

WebSocket接続が意図せず切断されることを検出するため、Ping/Pongメカニズムを実装しました。

```typescript
// サーバー側: 定期的にpingを送信
setInterval(() => {
  for (const [sessionId, connections] of wsConnections) {
    for (const ws of connections) {
      const lastPong = wsLastPong.get(ws);
      if (Date.now() - lastPong > config.pingTimeout) {
        ws.close();  // タイムアウト
        continue;
      }
      ws.send(JSON.stringify({ type: "ping" }));
    }
  }
}, config.pingInterval);

// クライアント側: pongを返す
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === "ping") {
    ws.send(JSON.stringify({ type: "pong" }));
    return;
  }
  // ...
};
```

### 4. シーケンス番号による再接続同期

ネットワークが一時的に不安定な場合、クライアントは再接続時に欠落したパッチを取得できます。

```typescript
// サーバー側: パッチにシーケンス番号を付与
let seq = 0;
function sendPatches(ws: WSContext, patches: Patch[]) {
  ws.send(JSON.stringify({
    type: "patch",
    patches,
    seq: ++seq,
  }));
}

// クライアント側: 最後に受信したシーケンス番号を追跡
let lastReceivedSeq = 0;

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "init",
    sessionId,
    lastSeq: lastReceivedSeq || undefined,  // 再接続時に送信
  }));
};
```

### 5. イベントデバウンシング

スライダーやテキスト入力など、高頻度でイベントが発生するウィジェットに対して、50msのデバウンスを適用しました。

```javascript
const DEBOUNCE_DELAY = 50;
const debounceTimers = new Map();

function sendEventDebounced(widgetId, value, sendFn) {
  const existingTimer = debounceTimers.get(widgetId);
  if (existingTimer) clearTimeout(existingTimer);

  const timer = setTimeout(() => {
    sendFn(widgetId, value);
    debounceTimers.delete(widgetId);
  }, DEBOUNCE_DELAY);

  debounceTimers.set(widgetId, timer);
}
```

これにより、ユーザーがスライダーをドラッグしている間、不必要なrerunが大幅に削減されます。

## リファクタリング

### hono/cookieへの移行

カスタムのCookieヘルパー関数を削除し、Honoの公式`hono/cookie`モジュールに移行しました。

```typescript
// Before: カスタム実装
function parseCookies(header: string): Map<string, string> { ... }
function setCookieHeader(name: string, value: string, ...): string { ... }

// After: Honoの公式API
import { getCookie, setCookie } from "hono/cookie";

app.get("/", (c) => {
  const sessionId = getCookie(c, "session_id");
  setCookie(c, "session_id", newId, { httpOnly: true, sameSite: "Strict" });
  // ...
});
```

### クライアントスクリプトのモジュール分離

`app.ts`に埋め込まれていた500行以上のクライアントスクリプトを、専用の`src/client/`モジュールに分離しました。

```
src/client/
├── index.ts       # エクスポート
├── script.ts      # スクリプト生成ロジック
└── types.ts       # クライアント設定の型定義
```

これにより`app.ts`は660行から280行に削減され、可読性と保守性が大幅に向上しました。

## テスト

Week5では506のテストがパスしており、以下のテストを追加しました：

- ストリーミングのユニットテスト
- マルチタブ同期のE2Eテスト
- 再接続シナリオのテスト
- イベントデバウンスのテスト

## まとめ

Week5の実装により、kantan-uiは以下の点で強化されました：

| 機能 | 効果 |
|------|------|
| ストリーミング | 大量UIの段階的表示、体感速度向上 |
| マルチタブ対応 | 複数タブ間でのリアルタイム同期 |
| Ping/Pong | 接続断の早期検出、自動再接続 |
| シーケンス番号 | 再接続時のパッチ欠落防止 |
| デバウンス | サーバー負荷軽減、レスポンス向上 |
| リファクタリング | コード品質向上、保守性改善 |

次のステップとして、以下を検討しています：

1. **Cloudflare Workers対応**: エッジでの実行
2. **レイアウトAPI**: `kt.columns()`, `kt.sidebar()`などの追加
3. **チャートコンポーネント**: データ可視化対応

---

**リポジトリ**: [github.com/watany-dev/kantan-ui](https://github.com/watany-dev/kantan-ui)

**ライセンス**: MIT
