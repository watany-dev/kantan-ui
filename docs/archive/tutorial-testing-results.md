# チュートリアルテスト結果レポート

## 実行日時

2026-01-13

## テスト概要

TUTORIAL.md のコードスニペットを全件実行し、バグを検出しました。

---

## Phase 1: 静的検証

### TypeScriptビルド
- **結果**: ✅ 成功
- **出力**: 165モジュール、40ms

### Lint
- **結果**: ⚠️ 7件の警告（エラーなし）
- **警告内容**: 認知複雑度超過（既知の問題）
  - `src/app.ts:103` - 複雑度 18 (上限 15)
  - `src/app.ts:246` - 複雑度 133 (上限 15)
  - `src/diff/parser.ts:105` - 複雑度 19 (上限 15)
  - `src/kt/markdown/parser.ts:15` - 複雑度 51 (上限 15)
  - `src/kt/markdown/parser.ts:59` - 複雑度 37 (上限 15)
  - `src/server.ts:35` - 複雑度 25 (上限 15)
  - `src/utils/magic-bytes.ts:202` - 複雑度 17 (上限 15)

---

## Phase 2: ユニットテスト

- **結果**: ✅ 全パス
- **テストファイル**: 81 passed
- **テストケース**: 2022 passed
- **カバレッジ**:
  - Statements: 97.8%
  - Branches: 93.3%
  - Functions: 98.72%
  - Lines: 98.13%

---

## Phase 3: E2Eテスト

- **結果**: ⏭️ スキップ
- **理由**: Playwrightブラウザのダウンロードがネットワーク制限により失敗

---

## Phase 4: サーバー起動テスト

| サーバー | 結果 | 備考 |
|---------|------|------|
| `bun run dev` (メインデモ) | ✅ 正常起動 | http://localhost:3000 |
| `examples/node-server.ts` | ⚠️ 期待通りエラー | Node.js専用、Bunでは `serve()` がエラー |
| `examples/09-chat.ts` | ⚠️ 期待通りエラー | Deno専用、`Deno.serve` 使用 |
| `examples/browser-scope.ts` | ✅ 正常起動 | http://localhost:3001 |

---

## Phase 5: チュートリアルコードスニペット検証

### 実行したテストファイル

| ファイル | チュートリアル章 | 結果 |
|---------|----------------|------|
| `tests/tutorial/hello-world.ts` | 3章 | ✅ 成功 |
| `tests/tutorial/counter-app.ts` | 11章 | ✅ 成功 |
| `tests/tutorial/todo-app.ts` | 12章 | ✅ 成功 |
| `tests/tutorial/chat-app.ts` | 13章 | ✅ 成功 |
| `tests/tutorial/all-widgets.ts` | 4章 | ✅ 成功 |
| `tests/tutorial/data-layout.ts` | 5-7章 | ✅ 成功 |
| `tests/tutorial/cache-api.ts` | 9章 | ✅ 成功 |
| `tests/tutorial/page-config.ts` | 10章 | ✅ 成功 |
| `tests/tutorial/session-state.ts` | 8章 | ⚠️ バグ検出 |
| `tests/tutorial/file-uploader.ts` | 4章 | ✅ 成功 |

---

## 検出されたバグ

### BUG-001: `session_state` がエクスポートされていない

- **重要度**: High
- **場所**: `src/index.ts`, `src/session/index.ts`
- **説明**:
  - チュートリアル（8章）では `import { session_state } from "kantan-ui"` と記載
  - 実際には `session_state` は `index.ts` からエクスポートされていない
  - `createSessionState()` 関数は `src/session/state.ts` に存在するが、シングルトンインスタンスがエクスポートされていない

- **チュートリアルのコード**:
```typescript
import { session_state } from "kantan-ui";

const script = () => {
  if (session_state.visits === undefined) {
    session_state.visits = 0;
  }
  session_state.visits++;
  kt.write(`訪問回数: ${session_state.visits}`);
};
```

- **現在の状況**:
```typescript
// src/session/index.ts
export {
  createTypedSessionState,
  getCurrentSessionId,
  setCurrentSessionId,
} from "./state";
// session_state はエクスポートされていない
```

- **修正案**:
```typescript
// src/session/state.ts に追加
export const session_state = createSessionState();

// src/session/index.ts に追加
export { session_state } from "./state";

// src/index.ts に追加
export { session_state } from "./session";
```

---

## 推奨アクション

### 優先度 P0 (即時対応)

1. **BUG-001の修正**: `session_state` をエクスポートする
   - または、チュートリアルから `session_state` の説明を削除し、`createTypedSessionState` のみを推奨

### 優先度 P1 (次期リリース)

2. **認知複雑度の改善**: 7つの関数の複雑度を下げる
   - 特に `src/app.ts:246` (複雑度 133) は分割が必要

### 優先度 P2 (継続的改善)

3. **E2Eテスト環境の整備**: CI環境でのPlaywright実行を確認
4. **マルチランタイムテストの追加**: Node.js/Denoでの自動テストを追加

---

## テストファイル一覧

作成したテストファイル（`tests/tutorial/`）:

```
tests/tutorial/
├── hello-world.ts      # Hello World
├── counter-app.ts      # カウンターアプリ
├── todo-app.ts         # TODOアプリ
├── chat-app.ts         # チャットアプリ
├── all-widgets.ts      # 全ウィジェット
├── data-layout.ts      # データ表示・レイアウト
├── cache-api.ts        # キャッシュAPI
├── page-config.ts      # ページ設定
├── session-state.ts    # セッションステート (バグ検出)
└── file-uploader.ts    # ファイルアップローダー
```

---

## 結論

- チュートリアルのコードスニペットは**1件のバグ**（`session_state` エクスポート漏れ）を除き、全て正常に動作
- ユニットテストは2022件全てパス、カバレッジも高水準を維持
- 認知複雑度の警告は機能に影響しないが、保守性向上のため改善を推奨
