# write_stream 実装計画

## 実装ステータス

> **✅ 実装完了** (2026-01-12)
>
> 全フェーズ（Phase 1〜7）が実装済み。
> - `src/kt/stream.ts`: write_stream 本体
> - `src/kt/stream-utils.ts`: ストリーム正規化ユーティリティ
> - `src/kt/stream-registry.ts`: PendingStream 管理
> - `src/runtime/stream-processor.ts`: ストリーム処理エンジン

---

## 概要

設計書 (`docs/design/write-stream-api.md`) に基づき、TDDサイクルでイテレーティブに実装を進める。

## 前提条件の確認

### 既存実装の理解

| コンポーネント | ファイル | 状況 |
|--------------|---------|------|
| streamAppend Patch | `src/websocket/types.ts:194-201` | 既存。全体の追加用 |
| RenderContext | `src/kt/context.ts` | 既存。バッファ管理 |
| rerun.ts | `src/runtime/rerun.ts:65-124` | 既存。同期実行後のHTML返却 |
| kt.write | `src/kt/output.ts:8-15` | 既存。参考パターン |
| Client Patch処理 | `src/client/script.ts:144-223` | 既存。patch適用ロジック |

### 新規追加が必要なPatch タイプ

```typescript
| { type: "streamChunk"; streamId: string; content: string }
| { type: "streamEnd"; streamId: string; finalHtml?: string }
```

---

## イテレーション計画

### Phase 1: 基盤（Web標準ユーティリティ）

#### Iteration 1.1: ストリーム正規化ユーティリティ

**目標**: 任意のソース（ReadableStream, AsyncIterable, Iterable, Response, Factory）をReadableStreamに変換

**ファイル**:
- `src/kt/stream-utils.ts` (新規)
- `tests/unit/kt/stream-utils.test.ts` (新規)

**TDDサイクル**:
1. Red: テスト作成
2. Green: `toReadableStream()` 実装
3. Refactor: コード整理

**検証コマンド**: `bun run ci`

**コミット**: `feat(kt): add toReadableStream utility for stream normalization`

---

#### Iteration 1.2: StreamRegistry

**目標**: セッションごとの処理待ちストリームを管理

**ファイル**:
- `src/kt/stream-registry.ts` (新規)
- `tests/unit/kt/stream-registry.test.ts` (新規)

**TDDサイクル**:
1. Red: register/consume のテスト作成
2. Green: WeakMapベースのレジストリ実装
3. Refactor: 型定義整理

**検証コマンド**: `bun run ci`

**コミット**: `feat(kt): add StreamRegistry for pending stream management`

---

### Phase 2: Patch タイプ追加

#### Iteration 2.1: WebSocket Patch タイプ

**目標**: streamChunk, streamEnd を Patch union に追加

**ファイル**:
- `src/websocket/types.ts` (更新)

**作業内容**:
1. `StreamChunkPatch` interface 追加
2. `StreamEndPatch` interface 追加
3. `Patch` union type に追加

**検証コマンド**: `bun run ci`

**コミット**: `feat(websocket): add streamChunk and streamEnd patch types`

---

### Phase 3: write_stream 本体実装

#### Iteration 3.1: write_stream 基本実装

**目標**: プレースホルダーHTML生成とStreamRegistry登録

**ファイル**:
- `src/kt/stream.ts` (新規)
- `tests/unit/kt/stream.test.ts` (新規)

**TDDサイクル**:
1. Red: プレースホルダーHTML生成、Promise返却のテスト
2. Green: write_stream() 実装
3. Refactor: オプション処理整理

**HTML構造**:
```html
<div id="kt-stream-{uuid}" class="kt-stream {className}" data-markdown="{markdown}">
  <span class="kt-stream-content"></span>
  <span class="kt-stream-cursor"></span>
</div>
```

**検証コマンド**: `bun run ci`

**コミット**: `feat(kt): implement write_stream placeholder and registry`

---

### Phase 4: ストリーム処理エンジン

#### Iteration 4.1: processStreams 実装

**目標**: rerun完了後にストリームを処理してPatchを発行

**ファイル**:
- `src/runtime/stream-processor.ts` (新規)
- `tests/unit/runtime/stream-processor.test.ts` (新規)

**TDDサイクル**:
1. Red: streamChunk/streamEnd発行、並列処理、エラーハンドリングのテスト
2. Green: processStreams() 実装
3. Refactor: Promise.all並列処理最適化

**処理フロー**:
1. StreamRegistryから処理待ちストリーム取得
2. 各ストリームを並列で読み込み
3. チャンクごとに streamChunk Patch 発行
4. 完了時に streamEnd Patch 発行（markdownの場合は finalHtml を含む）
5. Promise を resolve

**検証コマンド**: `bun run ci`

**コミット**: `feat(runtime): implement stream processor for async chunk delivery`

---

### Phase 5: サーバー統合

#### Iteration 5.1: rerun.ts 統合

**目標**: rerun実行結果にストリーム処理を連携

**ファイル**:
- `src/runtime/rerun.ts` (更新)

**作業内容**:
1. rerun結果に `pendingStreams` フラグ追加
2. StreamRegistry へのアクセスをエクスポート

**検証コマンド**: `bun run ci`

**コミット**: `refactor(runtime): integrate stream registry with rerun`

---

#### Iteration 5.2: app.ts 統合

**目標**: WebSocketハンドラーでストリーム処理を呼び出し

**ファイル**:
- `src/app.ts` (更新)

**作業内容**:
1. rerun完了後に processStreams() を呼び出し
2. streamChunk/streamEnd Patch をブロードキャスト

**検証コマンド**: `bun run ci`

**コミット**: `feat(app): integrate stream processing in websocket handlers`

---

### Phase 6: クライアント実装

#### Iteration 6.1: Patch処理追加

**目標**: クライアント側で streamChunk/streamEnd を処理

**ファイル**:
- `src/client/script.ts` (更新)

**作業内容**:
1. `case "streamChunk"`: テキストノード追加（XSS防止）
2. `case "streamEnd"`: カーソル削除、finalHtml適用、完了クラス追加

**検証コマンド**: `bun run ci`

**コミット**: `feat(client): handle streamChunk and streamEnd patches`

---

#### Iteration 6.2: CSS追加

**目標**: ストリーム表示のスタイリング

**ファイル**:
- `src/styles/index.ts` (更新)

**CSS**:
```css
.kt-stream { white-space: pre-wrap; word-break: break-word; line-height: 1.6; }
.kt-stream-content { display: inline; }
.kt-stream-cursor {
  display: inline-block;
  width: 0.5em; height: 1.1em;
  background: currentColor;
  margin-left: 1px;
  vertical-align: text-bottom;
  animation: kt-cursor-blink 1s step-end infinite;
}
.kt-stream-complete .kt-stream-cursor { display: none; }
.kt-stream-complete .kt-stream-content { display: block; }
@keyframes kt-cursor-blink { 50% { opacity: 0; } }
```

**検証コマンド**: `bun run ci`

**コミット**: `style: add streaming cursor CSS with blink animation`

---

### Phase 7: 公開API・E2E

#### Iteration 7.1: 公開APIエクスポート

**目標**: write_stream を kantan-ui の公開APIに追加

**ファイル**:
- `src/kt/index.ts` (更新)
- `src/index.ts` (必要に応じて更新)

**作業内容**:
1. `export { write_stream } from "./stream.js"` 追加
2. 型エクスポート追加

**検証コマンド**: `bun run ci`

**コミット**: `feat: export write_stream as public API`

---

#### Iteration 7.2: E2Eテスト

**目標**: Playwrightによる統合テスト

**ファイル**:
- `e2e/write-stream.spec.ts` (新規)
- `e2e/fixtures/stream-demo.ts` (新規、必要に応じて)

**テストケース**:
1. ストリームテキストが逐次表示される
2. カーソルが点滅して表示される
3. 完了後カーソルが消える
4. Markdownがレンダリングされる（markdown: true）

**検証コマンド**: `bun run ci`

**コミット**: `test(e2e): add write_stream integration tests`

---

## 実装順序まとめ

| # | Iteration | 新規/更新 | 主要ファイル | コミットメッセージ |
|---|-----------|----------|-------------|------------------|
| 1 | 1.1 | 新規 | stream-utils.ts | `feat(kt): add toReadableStream utility` |
| 2 | 1.2 | 新規 | stream-registry.ts | `feat(kt): add StreamRegistry` |
| 3 | 2.1 | 更新 | websocket/types.ts | `feat(websocket): add stream patch types` |
| 4 | 3.1 | 新規 | kt/stream.ts | `feat(kt): implement write_stream` |
| 5 | 4.1 | 新規 | stream-processor.ts | `feat(runtime): implement stream processor` |
| 6 | 5.1 | 更新 | rerun.ts | `refactor(runtime): integrate stream registry` |
| 7 | 5.2 | 更新 | app.ts | `feat(app): integrate stream processing` |
| 8 | 6.1 | 更新 | client/script.ts | `feat(client): handle stream patches` |
| 9 | 6.2 | 更新 | styles/index.ts | `style: add streaming cursor CSS` |
| 10 | 7.1 | 更新 | kt/index.ts | `feat: export write_stream API` |
| 11 | 7.2 | 新規 | e2e/write-stream.spec.ts | `test(e2e): add write_stream tests` |

---

## 各イテレーション完了条件

1. `bun run lint:fix` - リントエラーなし
2. `bun run ci` - lint, build, test すべてパス
3. コミット作成

## 完了時チェックリスト

- [x] 全ユニットテストがパス
- [x] E2Eテストがパス
- [x] knip（dead-code検出）パス
- [x] APIドキュメント更新（必要に応じて）
