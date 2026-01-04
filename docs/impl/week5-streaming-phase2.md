# Streaming Phase 2 設計書

作成日: 2026-01-04

## 概要

Streaming Phase 2では、rerun実行中に部分的なHTMLをクライアントにpushし、
段階的なUI更新を実現する。

## 現状（Phase 1完了）

- `RenderContext` にフラッシュ機能あり（`setFlushCallback`, `flush`）
- `StreamingConfig` で設定可能（`enabled: false`, `flushThreshold: 3`）
- `app.ts` にはストリーミング連携なし

## Phase 2 実装内容

### 1. パッチタイプの追加

```typescript
// src/websocket/types.ts
type Patch =
  | { type: "replaceRoot"; html: string }
  | { type: "replaceNode"; id: string; html: string }
  | { type: "removeNode"; id: string }
  | { type: "insertNode"; parentId: string; index: number; html: string }
  | { type: "streamAppend"; html: string };  // NEW: ストリーミング追加
```

### 2. サーバ側実装

```typescript
// app.ts - イベント処理時
if (config.streaming.enabled) {
  renderContext.setFlushCallback((html, itemCount) => {
    const streamPatch: ServerMessage = {
      type: "patch",
      patches: [{ type: "streamAppend", html }],
      partial: true,
    };
    ws.send(JSON.stringify(streamPatch));
  }, config.streaming.flushThreshold);
}
```

### 3. クライアント側実装

```javascript
// streamAppend パッチの処理
case "streamAppend": {
  const app = document.getElementById("app");
  const temp = document.createElement("div");
  temp.innerHTML = patch.html;
  while (temp.firstChild) {
    app.appendChild(temp.firstChild);
  }
  break;
}
```

### 4. ストリーミングフロー

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

### 5. 考慮事項

#### フォーカス維持との整合性
- ストリーミング中はフォーカス保存/復元を行わない
- 最終パッチ適用時のみフォーカス復元を実行

#### エラーハンドリング
- ストリーミング中にAbortされた場合、中間状態をクリア
- クライアントに`streamAbort`パッチを送信して部分要素を削除

#### パフォーマンス
- `flushThreshold` で頻度を調整（デフォルト: 3）
- 大量の小さなパッチは避ける

## 実装ステップ

1. [ ] `src/websocket/types.ts` に `streamAppend` パッチ追加
2. [ ] `src/websocket/types.ts` の `ServerMessage` に `partial` フラグ追加
3. [ ] `src/app.ts` でストリーミング設定時にflushCallback設定
4. [ ] `src/app.ts` クライアントスクリプトに `streamAppend` 処理追加
5. [ ] ユニットテスト作成
6. [ ] E2Eテスト作成（ストリーミング有効時の動作確認）

## テスト計画

### ユニットテスト
- `RenderContext.flush()` が正しくコールバックを呼ぶ
- しきい値での自動フラッシュ動作

### E2Eテスト
- ストリーミング有効時にUIが段階的に更新される
- 最終状態が正しい

## リスク

| リスク | 対策 |
|--------|------|
| 部分表示の不整合 | 最終パッチで完全な状態に収束させる |
| フォーカス喪失 | ストリーミング中はフォーカス復元をスキップ |
| 大量のWebSocketメッセージ | flushThreshold調整、デバウンス検討 |
