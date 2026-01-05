# E2Eテスト フェーズ2（優先度中）実施計画

## 概要

フェーズ1（高優先度）完了後に実施する、優先度中のE2Eテスト追加計画。

### 対象カテゴリ

| カテゴリ | テスト数 | 新規ファイル |
|---------|---------|-------------|
| セキュリティ | 4 | `security.spec.ts` |
| エッジケース | 5 | `edge-cases.spec.ts` |
| キーボード操作 | 4 | `keyboard.spec.ts` |
| ウィジェット詳細 | 8 | `widgets-advanced.spec.ts` |
| **合計** | **21** | **4ファイル** |

---

## 1. セキュリティテスト (`security.spec.ts`)

### 1.1 `kt.text()`のHTMLエスケープ確認

**目的**: ユーザー入力がエスケープされてXSSが防止されることを検証

**テスト内容**:
```typescript
test("kt.text() should escape HTML special characters", async ({ page }) => {
  // text_inputに <script>alert('xss')</script> を入力
  // 出力が &lt;script&gt;... としてエスケープされていることを確認
  // scriptタグが実行されないことを確認
});
```

**準備**: text_inputの値を表示するデモアプリが必要

### 1.2 `kt.html()`でのXSS対策確認

**目的**: `kt.html()`は生HTML出力であり、開発者責任であることを文書化・テスト

**テスト内容**:
```typescript
test("kt.html() outputs raw HTML without escaping", async ({ page }) => {
  // 静的なkt.html()出力が正しくレンダリングされることを確認
  // 警告ドキュメントへのリンクを追加
});
```

### 1.3 CSP（Content Security Policy）の動作確認

**目的**: CSPヘッダーが設定されている場合、インラインスクリプトがブロックされることを確認

**テスト内容**:
```typescript
test("CSP should block inline scripts when configured", async ({ page }) => {
  // CSPヘッダーを確認
  // インラインスクリプト実行がブロックされることを確認（console error検出）
});
```

**前提**: CSP実装の有無を確認する必要あり

### 1.4 不正なセッションIDでのアクセス拒否

**目的**: 改ざんされたセッションIDでのアクセスが拒否されることを確認

**テスト内容**:
```typescript
test("should reject requests with invalid session ID", async ({ page }) => {
  // 不正なセッションIDをCookie/localStorageにセット
  // WebSocket接続または状態復元が失敗することを確認
});
```

---

## 2. エッジケーステスト (`edge-cases.spec.ts`)

### 2.1 大量データでのパフォーマンス

**目的**: 大きなDOMでもパッチ適用が合理的な時間内に完了することを確認

**テスト内容**:
```typescript
test("should handle large DOM updates within acceptable time", async ({ page }) => {
  // 大量の要素（100+アイテム）を含むページを表示
  // パッチ適用時間を計測（< 500ms目標）
  // UIがブロックされないことを確認
});
```

**準備**: 大量データを表示するデモページが必要

### 2.2 超高速連打時の競合状態

**目的**: 高速連打でも状態が破損しないことを確認

**テスト内容**:
```typescript
test("should handle rapid button clicks without race conditions", async ({ page }) => {
  // 10ms間隔で20回クリック
  // 最終的なカウント値が正確であることを確認
  // コンソールエラーがないことを確認
});
```

### 2.3 並行する複数のWebSocket更新

**目的**: 複数ウィジェットの同時操作でも整合性が保たれることを確認

**テスト内容**:
```typescript
test("should handle concurrent widget updates", async ({ page }) => {
  // Promise.all()で複数ウィジェットを同時操作
  // すべての変更が正しく反映されることを確認
});
```

### 2.4 空の値・境界値テスト

**目的**: 境界値でも正常に動作することを確認

**テスト内容**:
```typescript
test.describe("boundary values", () => {
  test("slider min/max values", async ({ page }) => {
    // スライダーをmin/maxに設定
    // 正しく反映されることを確認
  });

  test("empty string input", async ({ page }) => {
    // text_inputを空にする
    // エラーなく処理されることを確認
  });
});
```

### 2.5 極端に長い文字列入力

**目的**: 長い文字列でもクラッシュしないことを確認

**テスト内容**:
```typescript
test("should handle very long string input", async ({ page }) => {
  // 10,000文字の文字列を入力
  // アプリがクラッシュしないことを確認
  // UIが応答可能であることを確認
});
```

---

## 3. キーボード操作テスト (`keyboard.spec.ts`)

### 3.1 Tabキーによるフォーカス移動

**目的**: キーボードナビゲーションが正しく動作することを確認

**テスト内容**:
```typescript
test("Tab key should move focus between widgets", async ({ page }) => {
  // 最初のウィジェットにフォーカス
  // Tabキーを押下
  // 次のウィジェットにフォーカスが移動することを確認
  // 論理的な順序でフォーカスが移動することを確認
});
```

### 3.2 Enterキーでのボタン押下

**目的**: フォーカスされたボタンがEnterキーで動作することを確認

**テスト内容**:
```typescript
test("Enter key should activate focused button", async ({ page }) => {
  // ボタンにフォーカス
  // Enterキーを押下
  // ボタンのアクションが実行されることを確認
});
```

### 3.3 スライダーの矢印キー操作

**目的**: スライダーがキーボードで操作できることを確認

**テスト内容**:
```typescript
test("Arrow keys should adjust slider value", async ({ page }) => {
  // スライダーにフォーカス
  // ArrowRight/ArrowUp で値が増加
  // ArrowLeft/ArrowDown で値が減少
  // ステップ値が正しいことを確認
});
```

### 3.4 セレクトボックスのキーボード選択

**目的**: セレクトボックスがキーボードで操作できることを確認

**テスト内容**:
```typescript
test("Keyboard should navigate selectbox options", async ({ page }) => {
  // セレクトボックスにフォーカス
  // ArrowDown で次のオプション
  // ArrowUp で前のオプション
  // Enter で選択確定
});
```

---

## 4. ウィジェット詳細テスト (`widgets-advanced.spec.ts`)

### 4.1 Button - disabled状態

**テスト内容**:
```typescript
test("disabled button should not trigger events", async ({ page }) => {
  // disabled属性のボタンをクリック
  // イベントが送信されないことを確認
});
```

**準備**: disabled状態のボタンをデモに追加する必要あり

### 4.2 Button - 連打制御（debounce/throttle）

**テスト内容**:
```typescript
test("button should debounce rapid clicks", async ({ page }) => {
  // 設定されている場合のみ
  // 高速連打時にイベント数が制限されることを確認
});
```

### 4.3 Slider - ステップ値

**テスト内容**:
```typescript
test("slider should respect step value", async ({ page }) => {
  // step=5のスライダーを操作
  // 値が5刻みになることを確認
});
```

### 4.4 Slider - フォーカス保持（既存fixmeの修正）

**テスト内容**:
```typescript
test("slider should maintain focus after value change", async ({ page }) => {
  // スライダーにフォーカス
  // 値を変更
  // フォーカスが維持されることを確認
});
```

**注**: `focus-preservation.spec.ts`に`test.fixme()`として存在

### 4.5 TextInput - ペースト操作

**テスト内容**:
```typescript
test("text input should handle paste correctly", async ({ page }) => {
  // クリップボードにテキストを設定
  // Ctrl+V でペースト
  // 値が正しく反映されることを確認
});
```

### 4.6 TextInput - maxlength属性

**テスト内容**:
```typescript
test("text input should respect maxlength", async ({ page }) => {
  // maxlength属性付きのtext_inputに長い文字列を入力
  // 入力が制限されることを確認
});
```

### 4.7 Selectbox - disabled options

**テスト内容**:
```typescript
test("disabled options should not be selectable", async ({ page }) => {
  // disabled属性のoptionを選択しようとする
  // 選択されないことを確認
});
```

### 4.8 TextInput - IME入力（日本語）

**テスト内容**:
```typescript
test("text input should handle IME composition", async ({ page }) => {
  // IME compositionイベントをシミュレート
  // 確定前にイベントが送信されないことを確認
  // 確定後に正しい値が送信されることを確認
});
```

**注**: Playwrightでの日本語入力テストは複雑な場合がある

---

## 実装順序

### イテレーション1: キーボード操作（基本的なアクセシビリティ）
1. `keyboard.spec.ts` 作成
2. Tab/Enter/Arrow操作のテスト追加
3. 必要に応じてウィジェット側の修正

### イテレーション2: セキュリティ
1. `security.spec.ts` 作成
2. XSSエスケープのテスト追加
3. セッション検証のテスト追加

### イテレーション3: エッジケース
1. `edge-cases.spec.ts` 作成
2. 境界値テスト追加
3. パフォーマンステスト追加

### イテレーション4: ウィジェット詳細
1. `widgets-advanced.spec.ts` 作成
2. 既存fixmeの修正検討
3. デモアプリへの機能追加（disabled等）

---

## 必要な準備作業

### デモアプリの拡張

以下の機能をデモアプリに追加する必要がある：

1. **disabled状態のボタン** - disabled属性のテスト用
2. **step属性付きスライダー** - ステップ値テスト用
3. **maxlength属性付きテキスト入力** - 入力制限テスト用
4. **disabled属性付きセレクトオプション** - 無効オプションテスト用
5. **大量データ表示ページ** - パフォーマンステスト用

### ヘルパー関数の追加

`e2e/helpers.ts`に追加検討：

```typescript
// コンソールエラー監視
export function setupConsoleErrorCapture(page: Page): string[]

// パフォーマンス計測
export function measurePatchTime(page: Page): Promise<number>

// クリップボード操作
export async function pasteText(page: Page, text: string): Promise<void>
```

---

## 完了条件

- [ ] 全21テストケースが実装されている
- [ ] すべてのテストがCI（Chromium）で通過する
- [ ] テスト失敗時のエラーメッセージが明確である
- [ ] 必要なデモアプリの拡張が完了している
- [ ] e2e-coverage.md のチェックリストが更新されている

---

## 更新履歴

- 2026-01-04: 初版作成
