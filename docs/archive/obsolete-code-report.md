# 不要なコード・遅れたコード・後方互換性コードの包括的レポート

作成日: 2026-01-07
更新日: 2026-01-07

---

## ✅ 完了した改善

| 項目 | コミット | 内容 |
|------|---------|------|
| Base64ダウンロード削除 | `899562c` | 全てのダウンロードをサーバーサイドストリーミングに移行 |
| XSS検出の同期ドキュメント | `32094f0` | クライアント/サーバー間の同期を明示するコメント追加 |
| console文のクリーンアップ | `87e1196` | 不要なWebSocket接続ログとdebugログを削除 |
| テスト用メソッドのマーク | `c4c7a95` | @internal JSDocタグを追加 |

---

## 🔴 1. 未使用のエクスポート関数（保留）

| ファイル | 行 | 関数名 | 状態 |
|----------|-----|--------|------|
| `src/utils/html.ts` | 6-21 | `buildAttributes()` | REFACTORING_PLAN.md Phase 5.2 で使用予定 |
| `src/utils/html.ts` | 28-37 | `buildStyleAttr()` | REFACTORING_PLAN.md Phase 5.2 で使用予定 |
| `src/utils/html.ts` | 44-47 | `buildClassAttr()` | REFACTORING_PLAN.md Phase 5.2 で使用予定 |
| `src/utils/html.ts` | 74-111 | `containsUnsafeHtml()` | クライアント側と同期を維持（@noteコメント追加済み） |
| `src/diff/parser.ts` | 81-83 | `isValidId()` | 内部ユーティリティとして維持 |

### 状態
- これらの関数はリファクタリング計画で使用予定のため保留
- `containsUnsafeHtml()`は必然的な重複（クライアントスクリプトは文字列として送信されるため）

---

## 🟠 2. 後方互換性のためのコード

| ファイル | 行 | コード | 説明 |
|----------|-----|--------|------|
| `src/runtime/rerun.ts` | 49 | `signal?: AbortSignal` | オプショナルパラメータ（後方互換性のため） |
| `src/kt/code/languages.ts` | 187-196 | `languageAliases` | 言語エイリアスマッピング（js→typescript、py→python等） |
| `src/kt/index.ts` | 42 | `rerun: control.requestRerun` | API名マッピング（内部名と公開名の差異） |
| `src/session/types.ts` | 2 | `type SessionId = string` | 型エイリアス（stringの別名） |
| `src/session/types.ts` | 5 | `type DownloadId = string` | 型エイリアス（stringの別名） |

### 推奨アクション
- 言語エイリアスは有用なので維持（ただしドキュメント化推奨）
- 型エイリアスは型安全性のため維持（ただしNominal Typingへの移行を検討）

---

## 🟡 3. レガシー/フォールバックパターン

| ファイル | 行 | パターン | 説明 |
|----------|-----|----------|------|
| `src/widgets/download-button.ts` | 29-39 | `encodeBase64()` | Base64エンコード（小さいファイル用レガシーパターン） |
| `src/widgets/download-button.ts` | 82-86 | Base64埋め込み | `既存の動作`というコメントで残されている |
| `src/client/script.ts` | 347-367 | Base64ダウンロードハンドラ | `atob()`使用のレガシーダウンロード処理 |
| `src/diff/differ.ts` | 13-15 | `PATCH_THRESHOLD = 10` | フォールバックの閾値 |
| `src/diff/differ.ts` | 91-103 | `replaceRoot` フォールバック | パッチ数超過時・insertパッチ時のフォールバック |

### 推奨アクション
- Base64ダウンロードを完全にストリーミングに移行することを検討
- `PATCH_THRESHOLD`は設定可能にする余地あり
- `replaceRoot`フォールバックはパフォーマンス上の理由で必要だが、ログ出力の追加を検討

---

## 🔵 4. 将来移行予定のコード

| ファイル | 行 | 内容 | 計画 |
|----------|-----|------|------|
| `src/runtime/rerun.ts` | 25-43 | グローバル状態管理設計ノート | AsyncLocalStorageへの移行予定 |
| `src/runtime/rerun.ts` | 28-31 | グローバル変数群 | `currentSessionId`, `widgetCounter`, `currentRenderContext`, `globalSessionManager` |
| `src/session/manager.ts` | 598-614 | `globalSessionManager` | グローバルシングルトン |

### 推奨アクション
- 非同期スクリプト対応時にAsyncLocalStorageを導入
- または RequestContext パターンでDI

---

## 🟣 5. FIXMEマークされたテスト

| ファイル | 行 | テスト | 理由 |
|----------|-----|--------|------|
| `e2e/websocket.spec.ts` | 173-174 | `persist session state across page reload` | セッション永続化がロバストになるまで |
| `e2e/focus-preservation.spec.ts` | 8-10 | `maintain focus on slider` | フォーカス復元機能実装待ち |
| `e2e/focus-preservation.spec.ts` | 60-62 | `maintain focus on text input` | フォーカス復元機能実装待ち |
| `e2e/focus-preservation.spec.ts` | 264-265 | `restore focus after page reload` | セッション永続化がロバストになるまで |

### 推奨アクション
- フォーカス復元機能の実装後にテストを有効化
- セッション永続化の改善後にテストを有効化

---

## 🟢 6. Linter/Coverage Ignoreコメント

| ファイル | 行 | ignore | 理由 |
|----------|-----|--------|------|
| `src/websocket/handler.ts` | 36, 46, 56 | `biome-ignore noExplicitAny` | ランタイム別動的インポート |
| `src/diff/parser.ts` | 121, 297, 326 | `v8 ignore` | タイムアウトチェック（ReDoS対策、テストで発火困難） |

### 推奨アクション
- 動的インポートの型定義を改善できないか検討
- v8 ignoreは必要悪として維持

---

## 🔶 7. デバッグ/ロギング用console文

### サーバー側
| ファイル | 行 | 種類 | 説明 |
|----------|-----|------|------|
| `src/session/manager.ts` | 106 | `console.log` | セッションクリーンアップログ |
| `src/session/manager.ts` | 308 | `console.warn` | パッチサイズ超過警告 |
| `src/widgets/registry.ts` | 49 | `console.warn` | 型不一致警告 |
| `src/widgets/registry.ts` | 57 | `console.debug` | 開発用デバッグ出力 |
| `src/kt/config.ts` | 47, 55 | `console.warn` | 設定警告 |
| `src/utils/type-guards.ts` | 55 | `console.warn` | 型検証警告 |
| `src/app.ts` | 193, 201, 206, 257, 269, 348 | `console.*` | WebSocket接続ログ |

### クライアント側
| ファイル | 行 | 種類 |
|----------|-----|------|
| `src/client/script.ts` | 145, 156, 173, 193 | `console.error` | セキュリティブロックログ |
| `src/client/script.ts` | 318, 343 | `console.error` | エラーログ |
| `src/client/script.ts` | 460, 521 | `console.log` | 接続ログ |
| `src/client/script.ts` | 473, 481, 526 | `console.error` | エラーログ |
| `src/client/script.ts` | 490 | `console.warn` | レート制限警告 |
| `src/client/script.ts` | 531, 540 | `console.log/error` | 再接続ログ |
| `src/client/script.ts` | 549 | `console.warn` | 接続なし警告 |

### 推奨アクション
- ロギングインフラを整備（開発/本番の切り替え）
- console.debugは本番ビルドで削除されるよう設定

---

## 🟤 8. 重複実装

| 内容 | 場所1 | 場所2 | 説明 |
|------|-------|-------|------|
| XSS検出ロジック | `src/utils/html.ts:74-111` | `src/client/script.ts:51-74` | サーバー側とクライアント側で同じロジックが重複 |

### 推奨アクション
- クライアントスクリプトはバンドルされるためやむを得ないが、テスト時に整合性を検証する仕組みを追加

---

## ⚫ 9. knip.jsonで無視されているファイル

| ファイル | 目的 |
|----------|------|
| `src/server.ts` | 開発用サーバー |
| `src/server-streaming.ts` | E2Eテスト用ストリーミングサーバー |
| `src/server-patch-test.ts` | E2Eテスト用パッチサーバー |
| `src/server-error-test.ts` | E2Eテスト用エラーサーバー |

### 推奨アクション
- これらは意図的に無視されているため維持
- ただし、開発用サーバーは`examples/`ディレクトリに移動することを検討

---

## ⬛ 10. Re-export階層（簡略化の余地あり）

```
src/widgets/*.ts → src/widgets/index.ts → src/index.ts
src/session/*.ts → src/session/index.ts → src/index.ts
src/runtime/*.ts → src/runtime/index.ts → src/index.ts
src/websocket/*.ts → src/websocket/index.ts → src/index.ts
src/diff/*.ts → src/diff/index.ts → src/index.ts
src/config/*.ts → src/config/index.ts → src/index.ts
src/kt/control.ts → src/kt/index.ts (kt.rerun)
```

### 推奨アクション
- 現状の階層は整理されているため維持
- ただし、内部使用のみの関数は`index.ts`からのre-exportを避ける

---

## ⬜ 11. テスト専用メソッド/関数

| ファイル | 行 | 内容 | 説明 |
|----------|-----|------|------|
| `src/websocket/handler.ts` | 90-92 | `clearAdapterCache()` | テスト用関数 |
| `src/session/manager.ts` | 491-492 | `getQueueLength()` | テスト用メソッド |
| `src/session/manager.ts` | 496-497 | `isProcessing()` | テスト用メソッド |
| `src/session/manager.ts` | 434-437 | `getCurrentAbortSignal()` | テスト用メソッド |
| `src/session/manager.ts` | 543-547 | `resetRateLimit()` | テスト用メソッド |

### 推奨アクション
- テスト用メソッドは`@internal`タグでマークする
- または、テスト専用のテストヘルパーモジュールに移動

---

## 📊 サマリー統計

| カテゴリ | 件数 |
|----------|------|
| 未使用エクスポート関数 | 5 |
| 後方互換性コード | 5 |
| レガシー/フォールバックパターン | 5 |
| 将来移行予定コード | 3 |
| FIXMEテスト | 4 |
| Linter Ignore | 6 |
| console文 | 20+ |
| 重複実装 | 1 |
| テスト専用メソッド/関数 | 5 |

---

## 🎯 優先度の高い改善項目

1. **高**: `src/utils/html.ts`の未使用関数の整理
2. **高**: Base64ダウンロードのストリーミングへの完全移行
3. **中**: XSS検出ロジックの重複解消
4. **中**: ロギングインフラの整備
5. **低**: 型エイリアスのNominal Typing化
6. **低**: テスト専用メソッドの分離
