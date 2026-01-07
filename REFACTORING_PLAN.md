# kantan-ui リファクタリング計画書

## 概要

本計画書は、kantan-uiコードベースのリファクタリングを段階的に実施するためのタスク分解です。
「Tidy First?」の原則に従い、各タスクは独立してコミット可能な単位で設計されています。

---

## Phase 1: Quick Wins（低難易度・高効果）

### Task 1.1: 汎用バリデーション関数の抽出
**対象ファイル**: `src/widgets/core.ts`
**見積工数**: 30分
**削減行数**: 約70行

#### サブタスク
- [ ] 1.1.1: `validateRange(value, min, max, fieldName)` 関数を作成
- [ ] 1.1.2: `validateInOptions(value, options, fieldName)` 関数を作成
- [ ] 1.1.3: Slider バリデーション (31-40行) をリファクタリング
- [ ] 1.1.4: Selectbox バリデーション (65-72行) をリファクタリング
- [ ] 1.1.5: Radio バリデーション (97-104行) をリファクタリング
- [ ] 1.1.6: Number input バリデーション (121-137行) をリファクタリング
- [ ] 1.1.7: Multiselect バリデーション (154-165行) をリファクタリング
- [ ] 1.1.8: テスト実行で動作確認

**完了条件**: `bun run ci` が通ること

---

### Task 1.2: HTML属性ビルダーの抽出
**対象ファイル**: 新規 `src/utils/html.ts`
**見積工数**: 45分
**削減行数**: 約50行

#### サブタスク
- [ ] 1.2.1: `src/utils/html.ts` を作成
- [ ] 1.2.2: `buildAttributes(attrs: Record<string, string | boolean | undefined>)` を実装
- [ ] 1.2.3: `buildStyleAttr(styles: Record<string, string>)` を実装
- [ ] 1.2.4: `buildClassAttr(classes: (string | false | undefined)[])` を実装
- [ ] 1.2.5: ユニットテスト `src/utils/html.test.ts` を作成
- [ ] 1.2.6: テスト実行で動作確認

**完了条件**: `bun run ci` が通ること

---

### Task 1.3: 定数ファイルの集約
**対象ファイル**: 新規 `src/constants/`
**見積工数**: 30分

#### サブタスク
- [ ] 1.3.1: `src/constants/ui.ts` を作成
  - Alert icons (`src/kt/output.ts:80-85`)
  - Spinner sizes (`src/kt/feedback.ts:26-30`)
  - Toast colors (`src/kt/feedback.ts:43-48`)
- [ ] 1.3.2: `src/constants/session.ts` を作成
  - MAX_PATCH_HISTORY (`src/session/manager.ts:291`)
  - その他セッション関連定数
- [ ] 1.3.3: `src/constants/index.ts` でre-export
- [ ] 1.3.4: 元ファイルからimportに変更
- [ ] 1.3.5: テスト実行で動作確認

**完了条件**: `bun run ci` が通ること

---

### Task 1.4: エラーメッセージ生成ヘルパーの抽出
**対象ファイル**: `src/app.ts`, 新規 `src/utils/error.ts`
**見積工数**: 20分
**削減行数**: 約20行

#### サブタスク
- [ ] 1.4.1: `src/utils/error.ts` を作成
- [ ] 1.4.2: `createErrorMessage(code, message, extra?)` を実装
- [ ] 1.4.3: `src/app.ts` の3箇所 (189-196, 203-210, 217-228行) をリファクタリング
- [ ] 1.4.4: テスト実行で動作確認

**完了条件**: `bun run ci` が通ること

---

## Phase 2: Widget系リファクタリング（中難易度）

### Task 2.1: Widgetレンダリングヘルパーの抽出
**対象ファイル**: 新規 `src/widgets/render-helpers.ts`
**見積工数**: 1時間
**削減行数**: 約100行

#### サブタスク
- [ ] 2.1.1: `src/widgets/render-helpers.ts` を作成
- [ ] 2.1.2: `renderWidgetContainer(id, label, content, disabled?)` を実装
- [ ] 2.1.3: `renderInputAttributes(id, name, disabled?, extra?)` を実装
- [ ] 2.1.4: ユニットテスト作成
- [ ] 2.1.5: テスト実行で動作確認

**完了条件**: `bun run ci` が通ること

---

### Task 2.2: Optionsレンダリングの統合
**対象ファイル**: `src/widgets/render-helpers.ts`
**見積工数**: 45分
**削減行数**: 約40行

#### サブタスク
- [ ] 2.2.1: `renderSelectOptions(options, selectedValue)` を実装
- [ ] 2.2.2: `renderRadioOptions(options, selectedValue, name, id)` を実装
- [ ] 2.2.3: `renderCheckboxOptions(options, selectedValues, name, id)` を実装
- [ ] 2.2.4: `src/widgets/selectbox.ts` (33-38行) をリファクタリング
- [ ] 2.2.5: `src/widgets/radio.ts` (34-42行) をリファクタリング
- [ ] 2.2.6: `src/widgets/multiselect.ts` (34-46行) をリファクタリング
- [ ] 2.2.7: テスト実行で動作確認

**完了条件**: `bun run ci` が通ること

---

### Task 2.3: 各Widgetへのヘルパー適用
**対象ファイル**: `src/widgets/*.ts` (8ファイル)
**見積工数**: 1.5時間

#### サブタスク
- [ ] 2.3.1: `button.ts` にヘルパー適用
- [ ] 2.3.2: `text-input.ts` にヘルパー適用
- [ ] 2.3.3: `slider.ts` にヘルパー適用
- [ ] 2.3.4: `selectbox.ts` にヘルパー適用
- [ ] 2.3.5: `checkbox.ts` にヘルパー適用
- [ ] 2.3.6: `radio.ts` にヘルパー適用
- [ ] 2.3.7: `multiselect.ts` にヘルパー適用
- [ ] 2.3.8: `text-area.ts` にヘルパー適用
- [ ] 2.3.9: E2Eテストで動作確認

**完了条件**: `bun run ci` が通ること、E2Eテスト全パス

---

## Phase 3: Session/State リファクタリング（中〜高難易度）

### Task 3.1: Proxy実装の統合
**対象ファイル**: `src/session/state.ts`
**見積工数**: 1.5時間
**削減行数**: 約60-70行

#### サブタスク
- [ ] 3.1.1: 既存テストの確認・強化
- [ ] 3.1.2: `createProxyHandler(options)` ファクトリ関数を設計
- [ ] 3.1.3: 共通ハンドラロジックを抽出
  - `get` ハンドラ
  - `set` ハンドラ
  - `has` ハンドラ
  - `ownKeys` ハンドラ
  - `getOwnPropertyDescriptor` ハンドラ
- [ ] 3.1.4: `createSessionState()` (53-94行) をリファクタリング
- [ ] 3.1.5: `createTypedSessionState()` (117-197行) をリファクタリング
- [ ] 3.1.6: テスト実行で動作確認

**完了条件**: `bun run ci` が通ること

---

### Task 3.2: SessionManager内部構造の整理
**対象ファイル**: `src/session/manager.ts`
**見積工数**: 2時間

#### サブタスク
- [ ] 3.2.1: 既存テストの確認・強化
- [ ] 3.2.2: `SessionEventQueue` クラスを抽出
  - queue, processingFlag, abortController を統合
- [ ] 3.2.3: `WebSocketSessionMap` クラスを抽出
  - wsToSession, sessionToWs を双方向マップに統合
- [ ] 3.2.4: SessionManager内部をリファクタリング
- [ ] 3.2.5: テスト実行で動作確認

**完了条件**: `bun run ci` が通ること

---

### Task 3.3: ブロードキャストエラーハンドリングの統合
**対象ファイル**: `src/session/manager.ts`, `src/app.ts`
**見積工数**: 30分
**削減行数**: 約30行

#### サブタスク
- [ ] 3.3.1: `sendWithErrorHandling(ws, message, onError)` ヘルパーを作成
- [ ] 3.3.2: `broadcast()` (255-274行) をリファクタリング
- [ ] 3.3.3: `src/app.ts` のストリーミングブロードキャスト (240-246行) をリファクタリング
- [ ] 3.3.4: テスト実行で動作確認

**完了条件**: `bun run ci` が通ること

---

## Phase 4: 複雑なモジュールのリファクタリング（高難易度）

### Task 4.1: Client Script の分割 - 準備
**対象ファイル**: `src/client/script.ts`
**見積工数**: 1時間

#### サブタスク
- [ ] 4.1.1: 現在の構造を図式化・ドキュメント化
- [ ] 4.1.2: 依存関係の分析
- [ ] 4.1.3: 分割ポイントの決定
  - WebSocket初期化
  - イベントデリゲーション
  - 接続インジケーター
  - デバウンス処理

**完了条件**: 分割設計が明確になること

---

### Task 4.2: Client Script の分割 - 実装
**対象ファイル**: `src/client/script.ts`, 新規ファイル群
**見積工数**: 2-3時間

#### サブタスク
- [ ] 4.2.1: `src/client/websocket.ts` を作成（WebSocket初期化ロジック）
- [ ] 4.2.2: `src/client/events.ts` を作成（イベントデリゲーション）
- [ ] 4.2.3: `src/client/indicator.ts` を作成（接続インジケーター）
- [ ] 4.2.4: `src/client/utils.ts` を作成（デバウンス等）
- [ ] 4.2.5: `src/client/script.ts` を統合エントリポイントに変更
- [ ] 4.2.6: E2Eテストで動作確認

**完了条件**: `bun run ci` が通ること、E2Eテスト全パス

---

### Task 4.3: Client Script の三項演算子削減
**対象ファイル**: `src/client/*.ts`
**見積工数**: 1時間

#### サブタスク
- [ ] 4.3.1: `isBrowserScope` 三項演算子（5箇所）を条件分岐に変更
- [ ] 4.3.2: ネストした三項演算子を分解
- [ ] 4.3.3: テスト実行で動作確認

**完了条件**: `bun run ci` が通ること

---

### Task 4.4: Markdown Parser のリファクタリング - 準備
**対象ファイル**: `src/kt/markdown/parser.ts`
**見積工数**: 1時間

#### サブタスク
- [ ] 4.4.1: 現在のテストカバレッジ確認
- [ ] 4.4.2: 追加テストケース作成（エッジケース）
- [ ] 4.4.3: 状態管理の分析・設計

**完了条件**: テストカバレッジが十分であること

---

### Task 4.5: Markdown Parser のリファクタリング - 実装
**対象ファイル**: `src/kt/markdown/parser.ts`
**見積工数**: 2-3時間
**削減行数**: 約100行（180行→80行のメインループ）

#### サブタスク
- [ ] 4.5.1: `MarkdownParserState` クラスを作成
- [ ] 4.5.2: `flushParagraph()` を状態クラスに移動
- [ ] 4.5.3: コードブロックハンドラを抽出
- [ ] 4.5.4: リストハンドラを抽出
- [ ] 4.5.5: テーブルハンドラを抽出
- [ ] 4.5.6: 引用ブロックハンドラを抽出
- [ ] 4.5.7: メインループをシンプル化
- [ ] 4.5.8: テスト実行で動作確認

**完了条件**: `bun run ci` が通ること

---

## Phase 5: コード品質向上（オプション）

### Task 5.1: Guard Clauses の適用
**対象ファイル**: `src/app.ts`, `src/diff/parser.ts`
**見積工数**: 45分

#### サブタスク
- [ ] 5.1.1: `src/app.ts` onMessage (147-281行) に早期リターン適用
- [ ] 5.1.2: `src/diff/parser.ts` parseHtml (119-169行) に早期リターン適用
- [ ] 5.1.3: テスト実行で動作確認

**完了条件**: `bun run ci` が通ること

---

### Task 5.2: インラインスタイルのリファクタリング
**対象ファイル**: 複数ファイル
**見積工数**: 45分

#### サブタスク
- [ ] 5.2.1: Task 1.2 で作成した `buildStyleAttr()` を適用
- [ ] 5.2.2: `src/kt/output.ts` (102-112行) をリファクタリング
- [ ] 5.2.3: `src/kt/layout.ts` (125-138行) をリファクタリング
- [ ] 5.2.4: `src/kt/feedback.ts` (77行) をリファクタリング
- [ ] 5.2.5: テスト実行で動作確認

**完了条件**: `bun run ci` が通ること

---

## 実施順序（推奨）

```
Week 1: Phase 1 (Quick Wins)
├── Day 1: Task 1.1, 1.2
├── Day 2: Task 1.3, 1.4
└── Day 3: レビュー・調整

Week 2: Phase 2 (Widget系)
├── Day 1: Task 2.1
├── Day 2: Task 2.2
└── Day 3-4: Task 2.3

Week 3: Phase 3 (Session/State)
├── Day 1-2: Task 3.1
├── Day 3: Task 3.2
└── Day 4: Task 3.3

Week 4: Phase 4 (複雑モジュール)
├── Day 1: Task 4.1
├── Day 2-3: Task 4.2, 4.3
└── Day 4-5: Task 4.4, 4.5

Week 5: Phase 5 (品質向上) - オプション
├── Day 1: Task 5.1
└── Day 2: Task 5.2
```

---

## 成果物サマリー

| Phase | タスク数 | 削減見込行数 | 新規ファイル |
|-------|---------|-------------|-------------|
| Phase 1 | 4 | 約140行 | 3ファイル |
| Phase 2 | 3 | 約140行 | 1ファイル |
| Phase 3 | 3 | 約90行 | 2クラス |
| Phase 4 | 5 | 約200行 | 4ファイル |
| Phase 5 | 2 | 約30行 | 0ファイル |
| **合計** | **17** | **約600行** | **10ファイル/クラス** |

---

## 各タスク完了時のチェックリスト

- [ ] `bun run lint:fix` でlintエラーなし
- [ ] `bun run ci` が全パス
- [ ] 変更内容を説明するコミットメッセージ
- [ ] 構造的変更と機能的変更が分離されている（Tidy First原則）

---

## リスクと対策

| リスク | 影響度 | 対策 |
|-------|-------|------|
| Client Script分割でE2E失敗 | 高 | Task 4.1で十分な分析、段階的な分割 |
| Proxy統合で型エラー | 中 | 既存テスト強化後に着手 |
| Markdown Parser変更でパース結果変化 | 高 | エッジケーステスト追加後に着手 |

---

## 備考

- 各Phaseは独立して実施可能
- 優先度に応じてPhase 1のみ、Phase 1-2のみなど部分実施も可
- 新機能開発と並行する場合は、Phase 1を先に完了させることを推奨
