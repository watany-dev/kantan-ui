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

## Phase 3-A: Streamlit互換API

Week5の後半では、StreamlitとのAPI互換性を高めるPhase 3-Aを実装しました。

### 1. ページ設定 (set_page_config)

Streamlitの`st.set_page_config`に相当する機能を実装しました。

```typescript
kt.set_page_config({
  title: "My App",
  icon: "🚀",
  layout: "wide",  // "centered" | "wide"
  initialSidebarState: "auto",
  menuItems: [
    { label: "GitHub", url: "https://github.com" },
  ],
});
```

HTMLテンプレートに設定が反映され、`<title>`タグやレイアウトクラスが動的に変更されます。

### 2. 制御フロー (rerun)

スクリプトを明示的に再実行する`kt.rerun()`を実装しました。

```typescript
export function requestRerun(): never {
  throw new RerunException();
}
```

`RerunException`を投げることで、スクリプト実行を中断し、最初から再実行します。

### 3. テーブル表示 (table)

様々なデータ形式に対応したテーブル表示機能を実装しました。

```typescript
// オブジェクト配列
kt.table([{ name: "Alice", age: 30 }, { name: "Bob", age: 25 }]);

// 2D配列（最初の行がヘッダー）
kt.table([["Name", "Age"], ["Alice", 30], ["Bob", 25]]);

// 明示的形式
kt.table({ columns: ["Name", "Age"], data: [["Alice", 30]] });
```

内部では`normalizeTableData`関数で統一形式に変換し、`escapeHtml`でXSS対策を施しています。

### 4. ダウンロードボタン (download_button)

ファイルダウンロードを提供するウィジェットを実装しました。

```typescript
kt.download_button("Download", csvData, "data.csv", { mime: "text/csv" });
```

特徴:
- 文字列とArrayBuffer両対応
- Base64エンコーディングによるData URL生成
- カスタムMIMEタイプ指定
- XSS対策済み

### 5. タブレイアウト (tabs)

複数のタブでコンテンツを整理するレイアウトコンポーネントを実装しました。

```typescript
const [tab1, tab2] = kt.tabs(["Overview", "Details"]);

tab1(() => {
  kt.header("Overview");
  kt.write("Overview content");
});

tab2(() => {
  kt.header("Details");
  kt.table(data);
});
```

TypeScriptらしいコールバックパターンを採用し、各タブ関数には`isActive`プロパティも付与されています。

## テスト

Week5では610のテストがパスしており、以下のテストを追加しました：

- ストリーミングのユニットテスト
- マルチタブ同期のE2Eテスト
- 再接続シナリオのテスト
- イベントデバウンスのテスト
- Phase 3-A各機能のユニットテスト

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
| set_page_config | ページタイトル・レイアウト設定 |
| table | 様々な形式のデータ表示 |
| download_button | ファイルダウンロード提供 |
| tabs | コンテンツの整理・切り替え |

次のステップとして、Phase 3-B/Cで以下を検討しています：

1. **キャッシュAPI**: `kt.cache_data()`, `kt.cache_resource()`
2. **レイアウトAPI**: `kt.sidebar()`, `kt.columns()`
3. **データウィジェット**: `kt.dataframe()`, `kt.file_uploader()`
4. **チャート**: `kt.line_chart()`, `kt.bar_chart()`

---

**リポジトリ**: [github.com/watany-dev/kantan-ui](https://github.com/watany-dev/kantan-ui)

**ライセンス**: MIT
