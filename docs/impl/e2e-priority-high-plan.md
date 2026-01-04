# E2Eテスト優先度高 実施計画

## 概要

e2e-coverage.mdで特定された優先度高の3つの領域について、実施計画を定義する。

| 領域 | テストケース数（予定） | 新規サーバー |
|------|----------------------|-------------|
| 出力API | 8 | 不要（既存server.ts拡張） |
| エラーハンドリング | 5 | 必要（error-scenarios用） |
| 差分パッチ | 4 | 必要（patch-scenarios用） |

---

## 1. 出力API（`kt.*`）テスト

### 目的
kt.write(), kt.title(), kt.header(), kt.subheader(), kt.text(), kt.divider(), kt.html() の各APIが正しくHTMLを出力することを検証する。

### テストケース

| # | テストケース | 検証内容 |
|---|-------------|---------|
| 1 | kt.write() 基本出力 | テキストが`<div class="kt-write">`で出力される |
| 2 | kt.write() 数値/真偽値 | 数値・booleanが文字列化される |
| 3 | kt.write() HTMLエスケープ | `<script>`等がエスケープされる（XSS対策） |
| 4 | kt.title() | `<h1 class="kt-title">`が出力される |
| 5 | kt.header() | `<h2 class="kt-header">`が出力される |
| 6 | kt.subheader() | `<h3 class="kt-subheader">`が出力される |
| 7 | kt.divider() | `<hr class="kt-divider">`が出力される |
| 8 | kt.html() 生出力 | HTMLがエスケープされずそのまま出力される |

### 実装方針

```
e2e/output-api.spec.ts  # 新規作成
```

既存のserver.ts（デモアプリ）を使用して検証。現在のデモアプリには既にkt.title(), kt.write()が使われているため、追加のテストサーバーは不要。

### 実装ステップ

1. **テストファイル作成**: `e2e/output-api.spec.ts`
2. **各APIの出力確認**: CSSクラスとDOM構造を検証
3. **エスケープ検証**: XSSペイロードがエスケープされることを確認

### 見積もり工数
- テストコード: 約100行
- サーバー変更: なし

---

## 2. エラーハンドリング・回復系テスト

### 目的
WebSocket切断・再接続、タイムアウト、不正パッチなどの異常系を検証する。

### テストケース

| # | テストケース | 検証内容 |
|---|-------------|---------|
| 1 | WebSocket切断時の再接続 | 接続が切れた後、自動再接続が動作する |
| 2 | 再接続後の状態復元 | セッション状態が維持される |
| 3 | 再接続中のUI表示 | "Reconnecting..."等のステータス表示 |
| 4 | 不正なパッチ受信時 | エラーログ出力、アプリクラッシュなし |
| 5 | セッション期限切れ | 新規セッション開始、状態リセット |

### 実装方針

```
e2e/error-handling.spec.ts   # 新規作成
src/server-error-test.ts     # 新規作成（テスト用サーバー）
```

Playwrightの`page.route()`を使ってWebSocket接続を操作するか、テスト用サーバーでエラー条件をシミュレートする。

### 実装ステップ

1. **テストサーバー作成**: 意図的にWebSocket切断やエラーを発生させるサーバー
2. **playwright.config.ts更新**: 新プロジェクト追加（port: 3003）
3. **再接続テスト**: WebSocket切断→再接続→状態復元の一連フロー
4. **エラーパッチテスト**: 不正なJSON、未知のpatchタイプへの耐性

### 技術的考慮事項

- PlaywrightはWebSocketの直接制御が限定的
- 代替案: サーバー側でエラー条件をトリガーするエンドポイント追加
  - `POST /test/disconnect` - WebSocket強制切断
  - `POST /test/send-invalid-patch` - 不正パッチ送信

### 見積もり工数
- テストコード: 約150行
- テストサーバー: 約100行

---

## 3. 差分パッチ処理テスト

### 目的
removeNode, insertNode, 複合パッチが正しく適用されることを検証する。

### 現状

| パッチタイプ | 実装済み | テスト済み |
|-------------|---------|-----------|
| replaceRoot | ✅ | ✅ |
| replaceNode | ✅ | ✅ |
| removeNode | ✅ | ❌ |
| insertNode | ✅ | ❌ |
| 複合パッチ | ✅ | ❌ |

### テストケース

| # | テストケース | 検証内容 |
|---|-------------|---------|
| 1 | removeNode 単独 | 指定IDの要素が削除される |
| 2 | insertNode 単独 | 指定位置に要素が挿入される |
| 3 | 複合パッチ（remove+insert） | 複数操作が順序通り適用される |
| 4 | 複合パッチ後のウィジェット動作 | 操作後もイベントが正常に発火 |

### 実装方針

```
e2e/patch-operations.spec.ts  # 新規作成
src/server-patch-test.ts      # 新規作成（テスト用サーバー）
```

動的にアイテムを追加・削除するUIを持つテストサーバーを作成。

### テストサーバー設計

```typescript
// サーバーの想定動作
// - "Add Item"ボタン → insertNode パッチ発行
// - "Remove Item"ボタン → removeNode パッチ発行
// - リスト表示で動的要素管理
```

### 実装ステップ

1. **テストサーバー作成**: 動的リスト管理アプリ
2. **playwright.config.ts更新**: 新プロジェクト追加（port: 3004）
3. **removeNodeテスト**: 要素削除とDOM確認
4. **insertNodeテスト**: 要素追加と位置確認
5. **複合パッチテスト**: 連続操作の整合性

### 見積もり工数
- テストコード: 約120行
- テストサーバー: 約80行

---

## 実施順序

推奨する実施順序:

```
Phase 1A: 出力APIテスト（新規サーバー不要、すぐ着手可能）
    ↓
Phase 1B: 差分パッチテスト（テストサーバー必要だが、シンプルなUI）
    ↓
Phase 1C: エラーハンドリング（最も複雑、WebSocket操作が必要）
```

### 理由
1. **出力API**: 既存インフラで即座に開始可能
2. **差分パッチ**: 単純な追加/削除UIで検証可能
3. **エラー系**: WebSocketレベルの操作が必要で複雑

---

## ファイル構成（完了後）

```
e2e/
├── example.spec.ts
├── websocket.spec.ts
├── session-scope.spec.ts
├── session-scope-browser.spec.ts
├── focus-preservation.spec.ts
├── streaming.spec.ts
├── helpers.ts
├── output-api.spec.ts          # 新規
├── patch-operations.spec.ts    # 新規
└── error-handling.spec.ts      # 新規

src/
├── server.ts                   # 既存（port 3000）
├── server-browser.ts           # 既存（port 3001）
├── server-streaming.ts         # 既存（port 3002）
├── server-patch-test.ts        # 新規（port 3003）
└── server-error-test.ts        # 新規（port 3004）
```

---

## 完了条件

- [ ] 全17テストケースがパス
- [ ] `bun run ci` が成功
- [ ] e2e-coverage.md の対応状況を更新

---

## 更新履歴

- 2026-01-04: 初版作成
