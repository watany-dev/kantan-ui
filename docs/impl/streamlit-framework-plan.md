# Streamlit風フレームワーク実装計画

## 概要

Hono を土台に Streamlit 風（操作のたびに rerun・サーバ側 state・UI 自動更新）のフレームワークを構築する。

### 核となる3つの機能

1. **実行モデル（rerun）**: ユーザー操作ごとにサーバ側でスクリプトを再実行
2. **セッション state**: サーバ側でセッションごとの状態を保持
3. **更新（差分 push）**: サーバからクライアントへUIの差分をpush

## 現在のリポジトリ状況

### 実装済み

- Honoの基本セットアップ (`src/index.ts`)
- テストインフラ（Vitest + Playwright）
- CI/CDパイプライン（lint, build, test, e2e, security）
- 開発原則ドキュメント (`claude.md`)

### 未実装

- WebSocket接続
- UIコンポーネント
- セッション管理
- 差分更新プロトコル

## 技術選定

### 採用プラン: プランC（WebSocket/SSE + 差分プロトコル + push）

| 観点 | 選定内容 |
|------|----------|
| 通信方式 | WebSocket（双方向リアルタイム） |
| 更新方式 | サーバからのpush |
| 差分プロトコル | 段階的に実装（全量→部分→差分） |

### ターゲット環境

**Bun に固定**

理由:
- Hono の Bun 向け WebSocket 方式（`createBunWebSocket`）を活用
- パフォーマンスと開発体験の最適化
- `export default { fetch: app.fetch, websocket }` の形で起動

```typescript
// 想定される起動形式
import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";

const { upgradeWebSocket, websocket } = createBunWebSocket();
const app = new Hono();

// ... ルート定義 ...

export default { fetch: app.fetch, websocket };
```

## 実装戦略

### 差分更新の段階的実装

```
Phase 1: replaceRoot（全量置換）
    ↓
Phase 2: replaceNode(id, html)（部分置換）
    ↓
Phase 3: remove/insert（詳細な差分操作）
```

**方針**: まず全置換で動作させ、段階的に差分更新へ移行

### クライアント・サーバ間の役割分担

```
[Server]                          [Client]
    │                                 │
    │  1. イベント受信                │
    ├←────────────────────────────────┤
    │                                 │
    │  2. rerun実行                   │
    │  3. UIツリー生成                │
    │  4. 前回との差分計算            │
    │                                 │
    │  5. patch送信                   │
    ├────────────────────────────────→│
    │                                 │
    │                     6. DOMに適用 │
    │                                 │
```

## ロードマップ

### Week 1: 基盤構築

**目標**: WebSocket接続 + rerun + 全量更新（replaceRoot）

#### タスク

- [ ] Bun向けWebSocketサーバ実装
  - `createBunWebSocket` の導入
  - 接続/切断ハンドリング
- [ ] クライアント側WebSocket接続
  - 接続確立
  - メッセージ送受信
- [ ] 基本的なrerunサイクル
  - イベント受信 → スクリプト実行 → HTML生成
- [ ] `replaceRoot` による全量更新
  - サーバからHTML文字列をpush
  - クライアントでDOMを全置換

#### 成果物

```typescript
// サーバ側
app.get("/ws", upgradeWebSocket((c) => ({
  onMessage(event, ws) {
    const html = rerun(c);
    ws.send(JSON.stringify({ type: "replaceRoot", html }));
  }
})));

// クライアント側
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === "replaceRoot") {
    document.getElementById("app").innerHTML = msg.html;
  }
};
```

### Week 2: Widget API と State

**目標**: widget API の実装とセッションstateの確立

#### タスク

- [ ] セッションID管理
  - セッションの生成・保持
  - sid ↔ WebSocket のマッピング
- [ ] `st.session_state` 相当の実装
  - サーバ側でセッションごとのstate保持
  - Map<sid, StateObject>
- [ ] 基本widgetの実装
  - `slider(label, min, max, default)` → 現在値を返す
  - `button(label)` → 押された rerun のみ `true` を返す
  - `text_input(label, default)`
  - `selectbox(label, options)`

#### Widgetの振る舞い

```typescript
// button の特殊な振る舞い
function button(label: string): boolean {
  const pressed = currentEvent?.widgetId === this.id;
  // 押された rerun でのみ true、それ以外は false
  return pressed;
}

// slider は常に現在値を返す
function slider(label: string, min: number, max: number, defaultVal: number): number {
  return state.get(this.id) ?? defaultVal;
}
```

### Week 3: 差分更新（replaceNode）

**目標**: 部分置換による効率的な更新

#### タスク

- [ ] 仮想DOMツリーの生成
  - 各要素にユニークIDを付与
  - ツリー構造の保持
- [ ] 差分検出アルゴリズム
  - 前回のツリーとの比較
  - 変更されたノードの特定
- [ ] `replaceNode(id, html)` の実装
  - 特定ノードのみを置換
- [ ] プロトコル拡張

```typescript
type Patch =
  | { type: "replaceRoot"; html: string }
  | { type: "replaceNode"; id: string; html: string };
```

### Week 4: ストリーミング更新 + Abort + 直列化

**目標**: 途中更新とイベントの整合性確保

#### タスク

- [ ] ストリーミング更新
  - rerun途中でもpatchを送信
  - 段階的なUI更新
- [ ] Abort機能
  - 新イベント受信時に前のrunを中断
  - AbortController の活用
- [ ] 同一セッション直列化
  - イベントキューの実装
  - 順序保証

```typescript
// Abort の実装イメージ
class Session {
  private currentRun?: AbortController;

  async handleEvent(event: Event) {
    // 前のrunを中断
    this.currentRun?.abort();
    this.currentRun = new AbortController();

    await rerun(event, this.currentRun.signal);
  }
}
```

### Week 5-6: 堅牢性 + 拡張機構

**目標**: プロダクション品質の実現

#### Week 5: 再接続・順序保証

- [ ] 接続管理の強化
  - `sid -> Set<WebSocket>` で多重タブ対応
  - 同一セッションで複数接続を管理
- [ ] 再同期メカニズム
  - `lastServerSeq` によるシーケンス番号管理
  - 古ければ `replaceRoot` でフル同期
- [ ] 接続維持
  - アイドル切断対策の ping/pong
  - 再接続時の状態復元

```typescript
// 接続管理
const sessions = new Map<string, {
  state: StateObject;
  connections: Set<WebSocket>;
  lastServerSeq: number;
}>();

// 再同期判定
function shouldFullSync(clientSeq: number, serverSeq: number): boolean {
  return clientSeq < serverSeq - MAX_PATCH_HISTORY;
}
```

#### Week 6: 拡張機構 + DX

- [ ] プラグイン機構
  - カスタムwidgetの登録
  - ミドルウェアサポート
- [ ] サンプルアプリケーション
  - 基本的なダッシュボード
  - データ可視化の例
- [ ] 開発者体験（DX）
  - Hot Reload
  - デバッグツール
  - エラーハンドリング改善

## プロトコル仕様

### メッセージフォーマット

#### クライアント → サーバ

```typescript
interface ClientMessage {
  type: "event";
  widgetId: string;
  value: unknown;
  seq: number;  // クライアントシーケンス番号
}
```

#### サーバ → クライアント

```typescript
interface ServerMessage {
  type: "patch";
  patches: Patch[];
  seq: number;  // サーバシーケンス番号
}

type Patch =
  | { type: "replaceRoot"; html: string }
  | { type: "replaceNode"; id: string; html: string }
  | { type: "remove"; id: string }
  | { type: "insert"; parentId: string; index: number; html: string };
```

## テスト戦略

### 各Weekでのテスト

| Week | テスト内容 |
|------|-----------|
| 1 | WebSocket接続/切断、replaceRoot動作 |
| 2 | widget値の反映、buttonのtrue/false動作 |
| 3 | 差分検出の正確性、replaceNode動作 |
| 4 | Abort時の状態整合性、直列化の順序 |
| 5-6 | 再接続後の状態復元、多重タブ同期 |

### テストツール

- **ユニットテスト**: Vitest（既存設定を活用）
- **E2Eテスト**: Playwright（既存設定を活用）
- **WebSocketテスト**: Playwright の WebSocket API を使用

## リスクと対策

| リスク | 対策 |
|--------|------|
| 差分計算のパフォーマンス | 初期はreplaceRootで動作確認、最適化は後から |
| WebSocket切断時のデータロス | シーケンス番号による再同期 |
| 大量イベントによる負荷 | デバウンス/スロットリング、キューイング |
| メモリリーク（セッション蓄積） | TTL設定、定期クリーンアップ |

## 次のアクション

1. **Week 1 開始**: `src/websocket.ts` の作成
2. Bun WebSocket のセットアップ
3. 基本的なrerunサイクルの実装
4. テストの追加

---

*最終更新: 2025-12-29*
*リポジトリバージョン: v0.0.1*
