# Phase 2: 詳細イテレーション計画

作成日: 2026-01-05

## 概要

`docs/impl/streamlit-compat-phase2.md` に基づき、8つの機能を**1コミット1イテレーション**で実装する詳細計画。
各イテレーションは `bun run lint:fix && bun run ci` をパスさせてからコミットする。

---

## 実装順序の根拠

| 順序 | 機能 | 工数 | 優先度 | 依存関係 |
|------|------|------|--------|----------|
| 1 | success/error/warning/info | 小 | 高 | なし（output.tsパターン流用） |
| 2 | progress | 小 | 中 | なし |
| 3 | container | 小 | 中 | なし（レイアウト基盤） |
| 4 | columns | 中 | 高 | container実装後推奨 |
| 5 | expander | 中 | 高 | 状態管理あり |
| 6 | spinner | 中 | 中 | なし |
| 7 | form + form_submit_button | 高 | 中 | ウィジェット状態管理理解後 |
| 8 | toast | 中 | 低 | クライアント連携必要 |

---

## イテレーション詳細

### Phase 2.1: Alert系API (success/error/warning/info)

#### Iteration 2.1.1: Alert基盤実装
**目標**: 内部alert関数と4つのエクスポート関数の基本実装

**ファイル変更**:
- `src/kt/output.ts` - alert関数とsuccess/error/warning/info追加
- `src/kt/index.ts` - エクスポート追加

**TDDサイクル**:
1. **Red**: `tests/unit/kt/output.test.ts` にalert系テスト追加
   - success/error/warning/info各関数の基本動作
   - HTMLクラス名の確認 (`kt-alert-success` など)
   - メッセージのエスケープ確認
2. **Green**: 最小実装
3. **Refactor**: alertColors/defaultIconsの定数化

**完了条件**:
```bash
bun run lint:fix && bun run ci
```

**コミットメッセージ例**:
```
feat(kt): add success/error/warning/info alert APIs

- Add alert base function with type-specific colors
- Add success, error, warning, info exports
- Include unit tests for all alert variants
```

---

#### Iteration 2.1.2: Alert E2Eテスト
**目標**: ブラウザでのalert表示確認

**ファイル変更**:
- `e2e/output-api.spec.ts` - alert系E2Eテスト追加
- `src/server.ts` または専用テストサーバー - alertデモ追加

**テスト内容**:
- 各alert typeが正しいCSSクラスで表示される
- メッセージが正しく表示される

**コミットメッセージ例**:
```
test(e2e): add alert API browser tests
```

---

### Phase 2.2: Progress API

#### Iteration 2.2.1: Progress基本実装
**目標**: プログレスバーの基本実装

**ファイル変更**:
- `src/kt/feedback.ts` - 新規作成、progress関数
- `src/kt/index.ts` - エクスポート追加

**TDDサイクル**:
1. **Red**: `tests/unit/kt/feedback.test.ts` 新規作成
   - progress(0.5)で50%表示
   - progress(75)で75%表示（0-100正規化）
   - ラベル付きprogress
   - 範囲外の値（負数、100超え）のクランプ
2. **Green**: 最小実装
3. **Refactor**: スタイル定数化

**コミットメッセージ例**:
```
feat(kt): add progress bar API

- Add progress function with value normalization
- Support optional label and color config
- Include unit tests
```

---

#### Iteration 2.2.2: Progress E2Eテスト
**目標**: ブラウザでのプログレスバー表示確認

**ファイル変更**:
- `e2e/feedback.spec.ts` - 新規作成

**テスト内容**:
- プログレスバーが正しい幅で表示される
- ラベルが表示される

**コミットメッセージ例**:
```
test(e2e): add progress bar browser tests
```

---

### Phase 2.3: Container API

#### Iteration 2.3.1: Container基本実装
**目標**: コンテナレイアウトの基本実装

**ファイル変更**:
- `src/kt/layout.ts` - 新規作成、container関数
- `src/kt/index.ts` - エクスポート追加

**TDDサイクル**:
1. **Red**: `tests/unit/kt/layout.test.ts` 新規作成
   - container内のコンテンツが正しくラップされる
   - border=trueでボーダースタイル適用
   - height指定でスクロール可能コンテナ
2. **Green**: 最小実装
3. **Refactor**: スタイル生成ロジック整理

**コミットメッセージ例**:
```
feat(kt): add container layout API

- Add container function for grouping content
- Support border and height options
- Include unit tests
```

---

### Phase 2.4: Columns API

#### Iteration 2.4.1: Columns基本実装
**目標**: カラムレイアウトの基本実装

**ファイル変更**:
- `src/kt/layout.ts` - columns関数追加
- `src/kt/index.ts` - エクスポート追加

**TDDサイクル**:
1. **Red**: `tests/unit/kt/layout.test.ts` にcolumnsテスト追加
   - 2カラムレイアウト
   - 3カラムレイアウト
   - 各カラム内のコンテンツ出力
   - ratios指定での比率変更
2. **Green**: 最小実装
3. **Refactor**: 比率計算ロジック整理

**コミットメッセージ例**:
```
feat(kt): add columns layout API

- Add columns function with callback-based content
- Support custom ratios and gap configuration
- Include unit tests
```

---

#### Iteration 2.4.2: Columns E2Eテスト
**目標**: ブラウザでのカラムレイアウト確認

**ファイル変更**:
- `e2e/layout.spec.ts` - 新規作成

**テスト内容**:
- カラムが横並びで表示される
- 各カラム内のウィジェットが動作する
- 比率が正しく適用される

**コミットメッセージ例**:
```
test(e2e): add columns layout browser tests
```

---

### Phase 2.5: Expander API

#### Iteration 2.5.1: Expander基本実装（状態なし）
**目標**: HTML `<details>` を使った基本実装

**ファイル変更**:
- `src/kt/layout.ts` - expander関数追加
- `src/kt/index.ts` - エクスポート追加

**TDDサイクル**:
1. **Red**: `tests/unit/kt/layout.test.ts` にexpanderテスト追加
   - ラベルが表示される
   - コンテンツがdetails内に出力される
   - expanded=trueでopen属性付与
2. **Green**: 最小実装（状態管理なし）
3. **Refactor**: 属性生成ロジック整理

**コミットメッセージ例**:
```
feat(kt): add expander layout API (stateless)

- Add expander using HTML details element
- Support initial expanded state
- Include unit tests
```

---

#### Iteration 2.5.2: Expander状態管理
**目標**: 展開状態の永続化

**ファイル変更**:
- `src/kt/layout.ts` - 状態管理ロジック追加
- `src/client/script.ts` - ontoggleイベント処理追加（必要に応じて）

**TDDサイクル**:
1. **Red**: expanderの状態永続化テスト
   - ユーザー操作後も状態が保持される
2. **Green**: ウィジェット状態管理を利用した実装
3. **Refactor**: 既存のwidget-helperパターン適用検討

**コミットメッセージ例**:
```
feat(kt): add expander state persistence

- Persist expand/collapse state across reruns
- Add toggle event handling
```

---

#### Iteration 2.5.3: Expander E2Eテスト
**目標**: ブラウザでの展開/折りたたみ動作確認

**ファイル変更**:
- `e2e/layout.spec.ts` - expanderテスト追加

**テスト内容**:
- クリックで展開/折りたたみ
- 状態がrerun後も保持される
- ネストされたウィジェットが動作する

**コミットメッセージ例**:
```
test(e2e): add expander interaction tests
```

---

### Phase 2.6: Spinner API

#### Iteration 2.6.1: Spinner基本実装
**目標**: ローディングスピナーの基本実装

**ファイル変更**:
- `src/kt/feedback.ts` - spinner関数追加
- `src/kt/index.ts` - エクスポート追加

**TDDサイクル**:
1. **Red**: `tests/unit/kt/feedback.test.ts` にspinnerテスト追加
   - デフォルトテキスト "Loading..."
   - カスタムテキスト
   - show=falseで非表示
   - サイズオプション
2. **Green**: 最小実装
3. **Refactor**: CSSアニメーション分離検討

**コミットメッセージ例**:
```
feat(kt): add spinner loading indicator API

- Add spinner with customizable text and size
- Support show/hide toggle
- Include CSS animation
- Include unit tests
```

---

#### Iteration 2.6.2: Spinner E2Eテスト
**目標**: ブラウザでのスピナー表示確認

**ファイル変更**:
- `e2e/feedback.spec.ts` - spinnerテスト追加

**テスト内容**:
- スピナーアイコンが回転アニメーション
- テキストが表示される

**コミットメッセージ例**:
```
test(e2e): add spinner animation tests
```

---

### Phase 2.7: Form API

#### Iteration 2.7.1: Form基本実装（構造のみ）
**目標**: フォームの基本構造実装

**ファイル変更**:
- `src/kt/form.ts` - 新規作成、form関数
- `src/kt/index.ts` - エクスポート追加

**TDDサイクル**:
1. **Red**: `tests/unit/kt/form.test.ts` 新規作成
   - form内のコンテンツがformタグでラップされる
   - data-form-key属性が設定される
2. **Green**: 最小実装
3. **Refactor**: フォームコンテキスト管理整理

**コミットメッセージ例**:
```
feat(kt): add form structure API

- Add form wrapper function
- Set up form context management
- Include unit tests
```

---

#### Iteration 2.7.2: form_submit_button実装
**目標**: フォーム送信ボタンの実装

**ファイル変更**:
- `src/kt/form.ts` - form_submit_button関数追加
- `src/kt/index.ts` - エクスポート追加

**TDDサイクル**:
1. **Red**: form_submit_buttonテスト
   - form外で使用時にエラー
   - ボタンがtype="submit"で出力される
   - 送信イベントでtrueを返す
2. **Green**: 最小実装
3. **Refactor**: 既存buttonパターンとの統合検討

**コミットメッセージ例**:
```
feat(kt): add form_submit_button API

- Add submit button for forms
- Validate usage context
- Handle form submission events
```

---

#### Iteration 2.7.3: Form一括送信ロジック
**目標**: フォーム内ウィジェットの値を一括送信

**ファイル変更**:
- `src/kt/form.ts` - フォーム内ウィジェット処理
- `src/client/script.ts` - ktSubmitForm関数追加

**TDDサイクル**:
1. **Red**: フォーム一括送信テスト
   - フォーム内のtext_inputが個別送信しない
   - submit時に全ウィジェット値を収集
2. **Green**: 実装
3. **Refactor**: WebSocketメッセージ形式整理

**コミットメッセージ例**:
```
feat(kt): implement form batch submission

- Defer widget value updates until form submit
- Add client-side form data collection
- Handle form submission via WebSocket
```

---

#### Iteration 2.7.4: Form E2Eテスト
**目標**: ブラウザでのフォーム動作確認

**ファイル変更**:
- `e2e/form.spec.ts` - 新規作成

**テスト内容**:
- フォーム内の入力変更で即座にrerunしない
- submitボタンで全値が送信される
- clearOnSubmitの動作

**コミットメッセージ例**:
```
test(e2e): add form interaction tests
```

---

### Phase 2.8: Toast API

#### Iteration 2.8.1: Toast基本実装
**目標**: トースト通知の基本実装

**ファイル変更**:
- `src/kt/feedback.ts` - toast関数追加
- `src/kt/index.ts` - エクスポート追加

**TDDサイクル**:
1. **Red**: `tests/unit/kt/feedback.test.ts` にtoastテスト追加
   - トースト要素が出力される
   - typeに応じたクラス
   - duration属性
2. **Green**: 最小実装
3. **Refactor**: alertとのスタイル共通化検討

**コミットメッセージ例**:
```
feat(kt): add toast notification API

- Add toast function with type and duration options
- Include toast element output
- Include unit tests
```

---

#### Iteration 2.8.2: Toastクライアント処理
**目標**: 自動消去のクライアントサイド処理

**ファイル変更**:
- `src/client/script.ts` - トースト自動消去ロジック
- `src/client/index.ts` - 初期化処理更新

**TDDサイクル**:
1. **Red**: クライアント処理テスト（E2Eで確認）
2. **Green**: setTimeout削除実装
3. **Refactor**: CSP対応検討

**コミットメッセージ例**:
```
feat(kt): add toast auto-dismiss client logic

- Add client-side toast removal after duration
- Handle toast positioning and animation
```

---

#### Iteration 2.8.3: Toast E2Eテスト
**目標**: ブラウザでのトースト動作確認

**ファイル変更**:
- `e2e/feedback.spec.ts` - toastテスト追加

**テスト内容**:
- トーストが表示される
- 指定時間後に消える
- アニメーション動作

**コミットメッセージ例**:
```
test(e2e): add toast notification tests
```

---

### Phase 2.9: CSS整備・ドキュメント

#### Iteration 2.9.1: CSSファイル整備
**目標**: 全コンポーネントのCSS統合

**ファイル変更**:
- `src/client/styles.css` - 新規作成または更新

**内容**:
- kt-プレフィックスでの名前空間化
- CSS変数によるカスタマイズ対応
- レスポンシブ対応

**コミットメッセージ例**:
```
style: consolidate Phase 2 component CSS

- Add namespaced styles for all new components
- Support CSS variables for customization
```

---

#### Iteration 2.9.2: ドキュメント更新
**目標**: TUTORIALへのPhase 2使用例追加

**ファイル変更**:
- `docs/TUTORIAL.md` - レイアウト・フィードバック使用例追加

**コミットメッセージ例**:
```
docs: add Phase 2 API usage examples to tutorial
```

---

## イテレーション一覧（チェックリスト）

### Alert系 (Phase 2.1)
- [ ] 2.1.1: Alert基盤実装
- [ ] 2.1.2: Alert E2Eテスト

### Progress (Phase 2.2)
- [ ] 2.2.1: Progress基本実装
- [ ] 2.2.2: Progress E2Eテスト

### Container (Phase 2.3)
- [ ] 2.3.1: Container基本実装

### Columns (Phase 2.4)
- [ ] 2.4.1: Columns基本実装
- [ ] 2.4.2: Columns E2Eテスト

### Expander (Phase 2.5)
- [ ] 2.5.1: Expander基本実装（状態なし）
- [ ] 2.5.2: Expander状態管理
- [ ] 2.5.3: Expander E2Eテスト

### Spinner (Phase 2.6)
- [ ] 2.6.1: Spinner基本実装
- [ ] 2.6.2: Spinner E2Eテスト

### Form (Phase 2.7)
- [ ] 2.7.1: Form基本実装（構造のみ）
- [ ] 2.7.2: form_submit_button実装
- [ ] 2.7.3: Form一括送信ロジック
- [ ] 2.7.4: Form E2Eテスト

### Toast (Phase 2.8)
- [ ] 2.8.1: Toast基本実装
- [ ] 2.8.2: Toastクライアント処理
- [ ] 2.8.3: Toast E2Eテスト

### 仕上げ (Phase 2.9)
- [ ] 2.9.1: CSSファイル整備
- [ ] 2.9.2: ドキュメント更新

---

## 各イテレーションの作業手順（テンプレート）

```bash
# 1. 最新の状態を確認
git status

# 2. TDD: Red - 失敗するテストを書く
# tests/unit/kt/xxx.test.ts を編集
bun run test  # 失敗を確認

# 3. TDD: Green - テストを通す最小実装
# src/kt/xxx.ts を編集
bun run test  # パスを確認

# 4. TDD: Refactor - コードを改善
# 実装を整理
bun run test  # まだパスを確認

# 5. CIパス確認
bun run lint:fix && bun run ci

# 6. コミット
git add .
git commit -m "feat(kt): add xxx API"

# 7. 次のイテレーションへ
```

---

## 完了基準

- [ ] 全21イテレーション完了
- [ ] 各イテレーションで `bun run lint:fix && bun run ci` パス
- [ ] 各イテレーションでコミット済み
- [ ] 全8機能が kt オブジェクトからエクスポート
- [ ] E2Eテストで全機能の動作確認済み

---

*Phase 2 完了時点での kt API*:
```typescript
kt.success(msg)
kt.error(msg)
kt.warning(msg)
kt.info(msg)
kt.progress(value, config?)
kt.container(content, config?)
kt.columns(contents, config?)
kt.expander(label, content, config?)
kt.spinner(text?, config?)
kt.form(key, content, config?)
kt.form_submit_button(label, config?)
kt.toast(msg, config?)
```
