# Week3 残課題 実装計画

## 概要

Week3 fixプランの残り5課題の具体的な実装計画。

---

## Task 1: フォーカス消失問題の修正 (高優先度)

### 対象ファイル
- `src/app.ts` (クライアントスクリプト部分)

### 現状
```javascript
case "replaceNode": {
  const el = document.getElementById(patch.id);
  if (el) {
    const temp = document.createElement("div");
    temp.innerHTML = patch.html;
    el.replaceWith(newEl);  // ← フォーカスが失われる
  }
}
```

### 実装内容

#### Step 1.1: フォーカス状態の保存関数を追加
```javascript
function saveFocusState() {
  const active = document.activeElement;
  if (!active || active === document.body) {
    return null;
  }
  const state = { id: active.id, selectionStart: null, selectionEnd: null };
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
    try {
      state.selectionStart = active.selectionStart;
      state.selectionEnd = active.selectionEnd;
    } catch (e) { /* 一部のinput typeでは取得不可 */ }
  }
  return state;
}
```

#### Step 1.2: フォーカス状態の復元関数を追加
```javascript
function restoreFocusState(state) {
  if (!state || !state.id) return;
  const el = document.getElementById(state.id);
  if (!el) return;
  el.focus();
  if ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
      && state.selectionStart !== null) {
    try {
      el.setSelectionRange(state.selectionStart, state.selectionEnd);
    } catch (e) { /* 一部のinput typeでは設定不可 */ }
  }
}
```

#### Step 1.3: パッチ適用処理を修正
```javascript
if (msg.type === "patch" && msg.patches) {
  const focusState = saveFocusState();
  for (const patch of msg.patches) {
    applyPatch(patch);
  }
  requestAnimationFrame(() => restoreFocusState(focusState));
}
```

### テスト
- E2Eテスト: スライダー操作後のフォーカス維持確認
- E2Eテスト: テキスト入力中のカーソル位置維持確認

---

## Task 2: initializeWidgetState 重複の解消 (中優先度)

### 対象ファイル
- `src/widgets/core.ts`

### 現状
3つの関数が同一パターン:
```typescript
export function initializeSliderState(widgetId, min, defaultValue?): number {
  const initial = defaultValue ?? min;
  if (!hasWidgetValue(widgetId)) {
    setWidgetValue(widgetId, initial);
  }
  return getWidgetValue<number>(widgetId, initial);
}
// initializeTextInputState, initializeSelectboxState も同様
```

### 実装内容

#### Step 2.1: ジェネリックヘルパー関数を追加
```typescript
/**
 * ウィジェット状態を初期化する共通ヘルパー
 */
function initializeWidgetState<T>(widgetId: string, initialValue: T): T {
  if (!hasWidgetValue(widgetId)) {
    setWidgetValue(widgetId, initialValue);
  }
  return getWidgetValue<T>(widgetId, initialValue);
}
```

#### Step 2.2: 既存関数をリファクタリング
```typescript
export function initializeSliderState(widgetId: string, min: number, defaultValue?: number): number {
  return initializeWidgetState(widgetId, defaultValue ?? min);
}

export function initializeTextInputState(widgetId: string, defaultValue?: string): string {
  return initializeWidgetState(widgetId, defaultValue ?? "");
}

export function initializeSelectboxState(widgetId: string, options: string[], defaultValue?: string): string {
  return initializeWidgetState(widgetId, defaultValue ?? options[0] ?? "");
}
```

### テスト
- 既存ユニットテストがパス

---

## Task 3: ドキュメント不整合の修正 (低優先度)

### 対象ファイル
- `docs/diff-module.md`

### 現状
ドキュメント (L45):
> 大文字タグ名: `<DIV>` - 正規表現が小文字のみ対応

実装 (`src/diff/parser.ts:60`):
```typescript
const idPattern = /<([a-z][a-z0-9]*)\s+...>/gi;
//                                         ^^ i フラグで大文字も対応
```

### 実装内容

#### Step 3.1: ドキュメントを修正
「非サポート」テーブルから大文字タグ名の行を削除し、「サポート対象」に移動:

```markdown
| 大文字タグ名 | `<DIV>` | 正規表現の`i`フラグで対応 |
```

#### Step 3.2: テストを追加して挙動確認
```typescript
// tests/unit/diff/parser.test.ts
describe("uppercase tags", () => {
  it("should parse uppercase tag names", () => {
    const html = '<DIV id="test">content</DIV>';
    const nodes = parseHtml(html);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe("test");
  });
});
```

---

## Task 4: 未使用キャプチャグループの最適化 (低優先度)

### 対象ファイル
- `src/diff/parser.ts`

### 現状 (L74)
```typescript
const [fullMatch, tag, _beforeId, id, _afterId, closeTag] = match;
//                     ^^^^^^^^^      ^^^^^^^^  未使用
```

### 実装内容

#### Step 4.1: 正規表現を非キャプチャグループに変更
```typescript
// 修正前
const idPattern = /<([a-z][a-z0-9]*)\s+([^>]*?)id="([^"]+)"([^>]*?)(\/?>)([\s\S]*?)(?:<\/\1>)?/gi;

// 修正後
const idPattern = /<([a-z][a-z0-9]*)\s+(?:[^>]*?)id="([^"]+)"(?:[^>]*?)(\/?>)([\s\S]*?)(?:<\/\1>)?/gi;
```

#### Step 4.2: 分割代入を修正
```typescript
// 修正前
const [fullMatch, tag, _beforeId, id, _afterId, closeTag] = match;

// 修正後
const [fullMatch, tag, id, closeTag] = match;
```

### テスト
- 既存パーサーテストがパス
- 大文字タグテストがパス

---

## Task 5: 型バリデーション開発時警告 (低優先度)

### 対象ファイル
- `src/widgets/registry.ts`

### 現状 (L44-55)
```typescript
const validator = getTypeValidator(defaultValue);
if (validator && !validator(value)) {
  console.warn(...);
  return defaultValue;
}
return value as T;  // validatorがnullの場合、警告なし
```

### 実装内容

#### Step 5.1: 非プリミティブ型への開発時警告を追加
```typescript
if (validator && !validator(value)) {
  console.warn(
    `Type mismatch for widget "${widgetId}": expected ${typeof defaultValue}, got ${typeof value}. Using default value.`,
  );
  return defaultValue;
}

// 非プリミティブ型の場合は開発時に警告
if (!validator && typeof defaultValue === "object" && defaultValue !== null) {
  console.debug(
    `[dev] Widget "${widgetId}" uses non-primitive type (${typeof defaultValue}). Type validation skipped.`,
  );
}

return value as T;
```

### テスト
- ユニットテスト: 非プリミティブ型でconsole.debugが呼ばれることを確認

---

## 実装順序

```
1. Task 1: フォーカス消失       ← 最優先 (UX直結)
2. Task 2: initializeWidgetState ← コード品質
3. Task 3: ドキュメント修正      ← 簡単
4. Task 4: 正規表現最適化        ← 簡単
5. Task 5: 型警告               ← 開発体験
```

## 作業見積もり

| Task | 複雑度 | 修正ファイル数 | テスト追加 |
|------|--------|--------------|----------|
| 1. フォーカス | 中 | 1 | E2E 2件 |
| 2. Widget初期化 | 低 | 1 | 0 |
| 3. ドキュメント | 低 | 1 | Unit 1件 |
| 4. 正規表現 | 低 | 1 | 0 |
| 5. 型警告 | 低 | 1 | Unit 1件 |

## 成功基準

- [ ] `bun run ci` が成功
- [ ] 全ての既存テストがパス
- [ ] 新規テストがパス
- [ ] lint エラーなし
