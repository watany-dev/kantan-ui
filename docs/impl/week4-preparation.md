# Week4 準備作業計画

作成日: 2026-01-01

## 概要

Week3（Diff & Patch）の完了基準を満たし、Week4（ストリーミング更新 + Abort + 直列化）に進むための準備作業。

---

## 作業一覧

### 1. diff統合の有効化 🔴 必須

**現状**: `src/app.ts:360-371` で差分検出が無効化されている

```typescript
// 現在のコード - 常にreplaceRootを使用
let patches: Patch[];
if (session.lastHtml && session.lastHtml !== newHtml) {
  patches = [{ type: "replaceRoot", html: newHtml }];
} else if (!session.lastHtml) {
  patches = [{ type: "replaceRoot", html: newHtml }];
} else {
  patches = [];
}
```

**修正内容**:
```typescript
import { diff, toWebSocketPatches } from "./diff";

// 差分検出を有効化
let patches: Patch[];
if (session.lastHtml) {
  const diffResult = diff(session.lastHtml, newHtml);
  patches = toWebSocketPatches(diffResult, newHtml);
} else {
  patches = [{ type: "replaceRoot", html: newHtml }];
}
```

**注意点**:
- `kt.html()` で生成されるIDなし要素は差分検出できない
- IDなし要素が多い場合、PATCH_THRESHOLD超えでreplaceRootにフォールバック
- これは現時点では許容可能な制限

**ファイル**: `src/app.ts`

---

### 2. E2Eテスト - フォーカス維持検証 🔴 必須

**目的**: diff統合後、フォーム入力中のフォーカスが維持されることを確認

**テストシナリオ**:
1. text_inputにフォーカスを当てる
2. 文字を入力（これによりrerunが発生）
3. フォーカスが維持されていることを確認
4. 入力カーソル位置が維持されていることを確認

**ファイル**: `e2e/focus-preservation.spec.ts`（新規作成）

---

### 3. グローバル状態の整理（DI検討） 🟢 完了（ドキュメント化）

**現状のグローバル変数**:

| 場所 | 変数 | 問題点 |
|------|------|--------|
| `src/session/state.ts:5` | `currentSessionId` | テスト分離困難 |
| `src/widgets/registry.ts:5` | `widgetCounter` | 同時リクエスト競合リスク |
| `src/kt/context.ts:38` | `currentRenderContext` | テスト分離困難 |
| `src/session/manager.ts:115` | `globalSessionManager` | シングルトン |

**結論**: 現状のパターンはWeek4に十分

現在の実装が安全な理由:
1. `rerun()`は同期実行であり、スクリプト内でawaitは使用されない
2. try/finallyで状態の設定/クリアを保証
3. Node.js/Bunのシングルスレッドイベントループモデル
4. テストはbeforeEach/afterEachで適切に分離されている

**対応内容**:
- `src/runtime/rerun.ts` に設計ノートをドキュメントとして追加
- 将来の非同期スクリプト対応時にAsyncLocalStorage導入を検討

**将来の対応方針** (非同期スクリプト対応時):

#### Option A: Context Injection
リクエストごとにコンテキストを生成し、依存を注入

```typescript
// 各リクエストでコンテキストを生成
interface RequestContext {
  sessionId: string;
  renderContext: RenderContext;
  widgetRegistry: WidgetRegistry;
}

function handleRequest(ctx: RequestContext) {
  // グローバル変数の代わりにctxを使用
}
```

#### Option B: AsyncLocalStorage
Node.js AsyncLocalStorageを使用してリクエストスコープの状態を管理

```typescript
import { AsyncLocalStorage } from "node:async_hooks";
const requestContext = new AsyncLocalStorage<RequestContext>();
```

---

### 4. WSContext比較問題の調査・修正 🟢 完了

**結論**: sessionIdベースの管理を正式な方式として採用

**実施内容**:
1. `src/app.ts`: eventメッセージでsessionIdを必須とし、フォールバックを削除
2. `src/session/manager.ts`:
   - `wsToSession`にクリーンアップ専用の旨をコメント追加
   - `getSessionByWebSocket()`を@deprecatedとしてマーク

**設計決定**:
- クライアントは常にsessionIdを送信するため、WSContext比較は不要
- `wsToSession`はonClose時のクリーンアップ目的でのみ維持
- `getSessionByWebSocket()`は後方互換のため残すが、新規使用は非推奨

**ファイル**: `src/app.ts`, `src/session/manager.ts`

---

## 実装順序

```
Step 1: diff統合の有効化
    ├── src/app.ts 修正
    └── 既存テスト確認

Step 2: E2Eテスト追加
    └── e2e/focus-preservation.spec.ts 作成

Step 3: グローバル状態整理
    ├── RequestContext設計
    ├── 各ファイル修正
    └── テスト修正

Step 4: WSContext問題対応
    ├── manager.ts リファクタ
    └── テスト追加

Step 5: 全体確認
    └── bun run ci
```

---

## 完了基準

### Week3 完了基準（確認）
- [x] ID付きノードの差分検出が動作する
- [ ] `replaceNode` パッチで部分更新できる ← **作業1で対応**
- [x] 差分が多い場合は `replaceRoot` にフォールバック
- [ ] フォーム入力中のフォーカスが維持される ← **作業2で検証**

### 技術的負債解消
- [ ] グローバル状態の整理 ← **作業3で対応**
- [ ] WSContext問題の解決 ← **作業4で対応**

---

## 備考

### 設定の外部化（解決済み）

Week1の技術的負債「ハードコードされた値」は既に解消済み：

- `src/config/types.ts` - 設定の型定義
- `src/config/defaults.ts` - デフォルト値
- `resolveConfig()` でユーザー設定とマージ

対象:
- `sessionKey`: "kt-session-id"
- `ttl`: 30分
- `cleanupInterval`: 1分
- 再接続関連設定

---

*次のステップ: Week4（ストリーミング更新 + Abort + 直列化）*

---

## Week4で対応すべき制限事項

準備作業中に発見された以下の制限事項は、Week4で対応が必要：

### 1. フォーカス喪失問題 🔴 高優先度

**現象**: `replaceNode`/`replaceRoot`パッチ適用後にフォーカスが失われる

**確認方法**: `e2e/focus-preservation.spec.ts` を参照

**影響**:
- スライダー操作後にフォーカスが失われる
- ボタンクリック後にフォーカスが失われる
- テキスト入力中にフォーカスが失われる可能性

**対応案**:
1. パッチ適用前にアクティブ要素のIDとカーソル位置を保存
2. パッチ適用後にフォーカスを復元
3. `morphdom`や`idiomorph`のようなDOM morphingライブラリの検討

### 2. text_input/selectbox E2Eテストの不安定性 🟡 中優先度

**現象**: Playwrightの`fill()`/`selectOption()`と`replaceRoot`の競合

**スキップ中のテスト**:
- `e2e/websocket.spec.ts`: "should update text input value"
- `e2e/websocket.spec.ts`: "should update selectbox value"
- `e2e/focus-preservation.spec.ts`: "should maintain focus on text input during typing"

**仮説**:
- `replaceRoot`が入力要素を置換する際、イベントが正しく送信されない
- スライダー（`input`イベント）は動作するが、`change`イベントに問題がある可能性

**調査項目**:
1. イベント発火タイミングとDOM置換のタイミング
2. debounce/throttleの必要性
3. クライアント側のイベントハンドリング改善

