# チュートリアル全件テスト計画書

## 概要

`docs/TUTORIAL.md` に記載されている全コードスニペットと `examples/` のサンプルを実行し、実際のバグを検出するための計画です。

## テスト対象

### 1. TUTORIAL.md のコードスニペット (15章)

| 章 | 内容 | コードスニペット数 |
|----|------|------------------|
| 1 | kantan-uiとは | 0 (説明のみ) |
| 2 | 環境構築 | 1 (セットアップコマンド) |
| 3 | Hello World | 2 (Bun/Node.js版) |
| 4 | ウィジェットの使い方 | 30+ (各ウィジェットAPI) |
| 5 | データ表示 | 6 (table, metric) |
| 6 | レイアウト | 4 (tabs, isActive) |
| 7 | Emptyプレースホルダー | 8 (empty API) |
| 8 | チャットUI | 5 (chat_message, chat_container) |
| 9 | セッションステート | 3 (typed, dynamic) |
| 10 | キャッシュ | 6 (cache_data, cache_resource) |
| 11 | ページ設定 | 3 (set_page_config, rerun) |
| 12 | 実践: カウンターアプリ | 1 (完全なアプリ) |
| 13 | 実践: TODOアプリ | 1 (完全なアプリ) |
| 14 | 実践: チャットアプリ | 2 (基本 + LLM連携) |
| 15 | 設定オプション | 4 (各種設定パターン) |

### 2. examples/ ディレクトリ

| ファイル | ランタイム | テスト内容 |
|---------|----------|----------|
| `09-chat.ts` | Deno | チャットアプリ完全動作 |
| `deno-server.ts` | Deno | カウンター + 入力ウィジェット |
| `node-server.ts` | Node.js | カウンター + 入力ウィジェット |
| `browser-scope.ts` | Bun | セッションスコープ動作 |
| `_shared/counter-demo.ts` | - | 共有ロジック |

### 3. src/server.ts (メインデモサーバー)

全ウィジェットの統合テスト:
- カウンター、入力、選択系ウィジェット
- アラート、プログレス、スピナー、トースト
- 画像、レイアウト、チャット
- ファイルアップロード
- Emptyプレースホルダー
- フォーム

---

## テスト計画

### Phase 1: 静的検証 (即時実行可能)

#### 1.1 TypeScript型チェック

```bash
bun run build
```

チュートリアルのコードスニペットが現在のAPIと整合するか確認。

#### 1.2 Lint チェック

```bash
bun run lint
```

コードスタイルの一貫性を確認。

### Phase 2: ユニットテスト (自動実行)

#### 2.1 既存ユニットテスト実行

```bash
bun run test:coverage
```

**確認ポイント:**
- カバレッジ閾値 (Lines: 98%, Functions: 98%, Branches: 93%)
- 失敗テストの特定

#### 2.2 TUTORIAL.md のAPI網羅性チェック

チュートリアルで使用されているAPIと、ユニットテストの網羅性を比較:

| API | ユニットテスト | E2Eテスト |
|-----|--------------|----------|
| kt.title() | tests/unit/kt/output.test.ts | e2e/example.spec.ts |
| kt.button() | tests/unit/widgets/button.test.ts | e2e/example.spec.ts |
| kt.slider() | tests/unit/widgets/slider.test.ts | e2e/example.spec.ts |
| kt.text_input() | tests/unit/widgets/text-input.test.ts | e2e/example.spec.ts |
| kt.selectbox() | tests/unit/widgets/selectbox.test.ts | e2e/example.spec.ts |
| kt.download_button() | tests/unit/widgets/download-button.test.ts | e2e/widgets-new.spec.ts |
| kt.checkbox() | tests/unit/widgets/checkbox.test.ts | e2e/widgets-advanced.spec.ts |
| kt.toggle() | tests/unit/widgets/toggle.test.ts | e2e/widgets-advanced.spec.ts |
| kt.radio() | tests/unit/widgets/radio.test.ts | e2e/widgets-advanced.spec.ts |
| kt.number_input() | tests/unit/widgets/number-input.test.ts | e2e/widgets-advanced.spec.ts |
| kt.text_area() | tests/unit/widgets/text-area.test.ts | e2e/widgets-advanced.spec.ts |
| kt.file_uploader() | tests/unit/widgets/file-uploader.test.ts | e2e/file-upload.spec.ts |
| kt.multiselect() | tests/unit/widgets/multiselect.test.ts | e2e/widgets-new.spec.ts |
| kt.date_input() | tests/unit/widgets/date-input.test.ts | e2e/widgets-new.spec.ts |
| kt.time_input() | tests/unit/widgets/time-input.test.ts | e2e/widgets-new.spec.ts |
| kt.table() | tests/unit/kt/widgets.test.ts | e2e/output-api.spec.ts |
| kt.metric() | tests/unit/kt/widgets.test.ts | e2e/output-api.spec.ts |
| kt.tabs() | tests/unit/kt/layout.test.ts | e2e/layout.spec.ts |
| kt.empty() | tests/unit/kt/empty.test.ts | e2e/empty.spec.ts |
| kt.chat_message() | tests/unit/kt/chat.test.ts | e2e/chat-input.spec.ts |
| kt.chat_container() | tests/unit/kt/chat.test.ts | e2e/chat-input.spec.ts |
| kt.cache_data() | tests/unit/kt/cache/ | - |
| kt.cache_resource() | tests/unit/kt/cache/ | - |
| kt.set_page_config() | tests/unit/kt/config.test.ts | - |
| kt.rerun() | tests/unit/runtime/rerun.test.ts | - |
| createTypedSessionState() | tests/unit/session/state.test.ts | e2e/session-scope.spec.ts |

### Phase 3: E2Eテスト (自動実行)

#### 3.1 既存E2Eテスト実行

```bash
bun run test:e2e
```

**確認ポイント:**
- 全24テストファイルの通過
- 各ポート (3000-3006) のサーバー動作

#### 3.2 チュートリアル専用E2Eテスト作成計画

チュートリアルのコードスニペットを実際に動作確認するテストを作成:

```
e2e/
└── tutorial/
    ├── hello-world.spec.ts      # 3章: Hello World
    ├── widgets.spec.ts          # 4章: ウィジェット
    ├── data-display.spec.ts     # 5章: データ表示
    ├── layout.spec.ts           # 6-7章: レイアウト + Empty
    ├── chat-ui.spec.ts          # 8章: チャットUI
    ├── session-state.spec.ts    # 9章: セッションステート
    ├── cache.spec.ts            # 10章: キャッシュ
    ├── page-config.spec.ts      # 11章: ページ設定
    ├── counter-app.spec.ts      # 12章: カウンターアプリ
    ├── todo-app.spec.ts         # 13章: TODOアプリ
    └── chat-app.spec.ts         # 14章: チャットアプリ
```

### Phase 4: examples/ 手動テスト

#### 4.1 Deno サンプル実行

```bash
# チャットアプリ
deno task example:chat
# → http://localhost:3000 で動作確認

# デモサーバー
deno task dev
# → http://localhost:3000 で動作確認
```

**確認項目:**
- [ ] WebSocket接続確立
- [ ] チャットメッセージ送信/受信
- [ ] セッション状態の保持
- [ ] 応答生成ロジック

#### 4.2 Node.js サンプル実行

```bash
npx tsx examples/node-server.ts
# → http://localhost:3000 で動作確認
```

**確認項目:**
- [ ] サーバー起動
- [ ] Graceful shutdown (Ctrl+C)
- [ ] 全ウィジェット動作

#### 4.3 Bun メインサーバー実行

```bash
bun run dev
# → http://localhost:3000 で動作確認
```

**確認項目:**
- [ ] 全ウィジェットのレンダリング
- [ ] インタラクション (ボタン、スライダー等)
- [ ] ファイルアップロード
- [ ] セッション状態の永続化
- [ ] サイドバー表示

---

## バグ検出チェックリスト

### ウィジェット動作

| ウィジェット | レンダリング | インタラクション | 状態保持 | エッジケース |
|------------|------------|----------------|---------|------------|
| button | [ ] | [ ] | N/A | disabled状態 |
| slider | [ ] | [ ] | [ ] | min > max |
| text_input | [ ] | [ ] | [ ] | maxLength, placeholder |
| selectbox | [ ] | [ ] | [ ] | 空配列, 無効なdefault |
| download_button | [ ] | [ ] | N/A | 大容量データ |
| checkbox | [ ] | [ ] | [ ] | disabled状態 |
| toggle | [ ] | [ ] | [ ] | disabled状態 |
| radio | [ ] | [ ] | [ ] | horizontal, disabled |
| number_input | [ ] | [ ] | [ ] | step, 範囲外入力 |
| text_area | [ ] | [ ] | [ ] | rows, placeholder |
| file_uploader | [ ] | [ ] | [ ] | accept, maxSize, multiple |
| multiselect | [ ] | [ ] | [ ] | maxSelections |
| date_input | [ ] | [ ] | [ ] | min/max, Date object |
| time_input | [ ] | [ ] | [ ] | step, Date object |

### レイアウト動作

| コンポーネント | レンダリング | インタラクション | ネスト |
|--------------|------------|----------------|-------|
| tabs | [ ] | [ ] | [ ] |
| empty | [ ] | [ ] | [ ] |
| columns | [ ] | N/A | [ ] |
| expander | [ ] | [ ] | [ ] |
| sidebar | [ ] | N/A | [ ] |
| container | [ ] | N/A | [ ] |

### チャットUI動作

| 機能 | 確認項目 |
|-----|---------|
| chat_message | [ ] user/assistant/system ロール表示 |
| chat_message | [ ] アバター/名前カスタマイズ |
| chat_message | [ ] Markdown レンダリング |
| chat_container | [ ] スクロール可能領域 |
| chat_container | [ ] 自動スクロール |

### データ表示動作

| コンポーネント | 確認項目 |
|--------------|---------|
| table | [ ] オブジェクト配列形式 |
| table | [ ] 2D配列形式 |
| table | [ ] columns指定形式 |
| table | [ ] XSSエスケープ |
| metric | [ ] 基本表示 |
| metric | [ ] delta表示 |
| metric | [ ] delta_color (normal/inverse/off) |
| metric | [ ] help ツールチップ |

### キャッシュ動作

| API | 確認項目 |
|-----|---------|
| cache_data | [ ] 基本キャッシュ |
| cache_data | [ ] TTL期限切れ |
| cache_data | [ ] max_entries LRU |
| cache_resource | [ ] シングルトンインスタンス |
| clear | [ ] 個別クリア |
| clear | [ ] 全体クリア |

### セッション/状態管理

| 機能 | 確認項目 |
|-----|---------|
| createTypedSessionState | [ ] 型安全アクセス |
| createTypedSessionState | [ ] 初期値設定 |
| session_state | [ ] 動的キーアクセス |
| session scope | [ ] tab スコープ (タブ独立) |
| session scope | [ ] browser スコープ (共有) |

---

## 実行手順

### Step 1: CI全体実行

```bash
bun run ci
```

これにより以下が順次実行される:
1. `bun run lint` - Biome lint
2. `bun run build` - TypeScriptビルド
3. `bun run test:coverage` - ユニットテスト
4. `bun run test:e2e` - E2Eテスト

### Step 2: 個別手動テスト

```bash
# 各サンプルを順次起動して手動確認
bun run dev                           # メインデモ
deno task example:chat                # Denoチャット
npx tsx examples/node-server.ts       # Node.jsデモ
bun run examples/browser-scope.ts     # ブラウザスコープ
```

### Step 3: チュートリアルスニペットテスト

チュートリアルの各コードスニペットを独立したファイルとして実行:

```bash
# tests/tutorial/ ディレクトリを作成
mkdir -p tests/tutorial

# 各スニペットをファイルとして保存し実行
bun run tests/tutorial/hello-world.ts
bun run tests/tutorial/counter-app.ts
bun run tests/tutorial/todo-app.ts
bun run tests/tutorial/chat-app.ts
```

---

## 期待されるバグ検出パターン

### 1. API不整合

- チュートリアルのコード例と実際のAPI署名の不一致
- パラメータの順序、オプション名の変更

### 2. エッジケース未処理

- 空配列、null/undefined入力
- 範囲外の値
- 特殊文字 (XSS脆弱性)

### 3. 状態管理バグ

- セッション状態の永続化失敗
- 複数タブ間の状態競合
- WebSocket再接続時の状態復元

### 4. レイアウト崩れ

- ネストしたコンポーネントの表示
- 動的コンテンツ更新時の再レンダリング

### 5. マルチランタイム互換性

- Bun固有のAPI使用
- Node.js/Denoでの動作差異

---

## 成果物

1. **バグレポート**: 検出されたバグの一覧と再現手順
2. **テストカバレッジレポート**: 未カバー領域の特定
3. **チュートリアル修正案**: ドキュメントの修正が必要な箇所
4. **新規テストケース**: 追加すべきテストの一覧

---

## 優先度

| 優先度 | 内容 |
|-------|------|
| P0 | CIパイプライン (lint + build + test) の通過 |
| P1 | 全ウィジェットの基本動作確認 |
| P2 | チュートリアルコードスニペットの実行確認 |
| P3 | エッジケースのテスト追加 |
| P4 | マルチランタイム互換性テスト |
