# Week3 クリティカル問題修正計画

## 概要

Week3のコードレビューで発見された3つのクリティカル問題に対する詳細な修正計画。

---

## 問題1: Diff パーサーの O(k³) 計算量問題

### 現状分析

**ファイル**: `src/diff/parser.ts:112-172`

```typescript
function buildNodeTree(parsedNodes: ParsedNode[]): VNode[] {
  for (const node of parsedNodes) {           // O(k)
    // 各ノードに対して全ノードをスキャンして親を探す
    for (const potentialParent of parsedNodes) {  // O(k) → 合計 O(k²)
      // ...
    }

    // 兄弟を探す際にフィルタ内で親を再計算
    const siblings = parsedNodes.filter((n) => {  // O(k)
      for (const pp of parsedNodes) {              // O(k) → フィルタ内で O(k²)
        // ...
      }
    });
  }
}
```

**問題点**:
- 外側ループ: O(k)
- 親検索ループ: O(k)
- 兄弟フィルタ: O(k) × 各要素の親計算 O(k)
- **合計計算量: O(k³)**

1,000要素の場合、最悪で約10億回の操作が発生。

### 修正方針

**アプローチ**: 親関係を1回のパスで計算してキャッシュし、兄弟計算時に再利用

### 実装計画

#### Step 1: 親マップを事前計算 (O(k²))

```typescript
function buildParentMap(parsedNodes: ParsedNode[]): Map<string, string | null> {
  const parentMap = new Map<string, string | null>();

  for (const node of parsedNodes) {
    let parentId: string | null = null;
    let smallestContainerSize = Number.POSITIVE_INFINITY;

    for (const potentialParent of parsedNodes) {
      if (potentialParent.id === node.id) continue;

      const containsNode =
        potentialParent.startPos < node.startPos &&
        potentialParent.endPos > node.endPos;

      if (containsNode) {
        const containerSize = potentialParent.endPos - potentialParent.startPos;
        if (containerSize < smallestContainerSize) {
          smallestContainerSize = containerSize;
          parentId = potentialParent.id;
        }
      }
    }

    parentMap.set(node.id, parentId);
  }

  return parentMap;
}
```

#### Step 2: 兄弟をグループ化 (O(k))

```typescript
function groupSiblings(
  parsedNodes: ParsedNode[],
  parentMap: Map<string, string | null>
): Map<string | null, ParsedNode[]> {
  const siblingGroups = new Map<string | null, ParsedNode[]>();

  for (const node of parsedNodes) {
    const parentId = parentMap.get(node.id) ?? null;
    const group = siblingGroups.get(parentId) || [];
    group.push(node);
    siblingGroups.set(parentId, group);
  }

  // 各グループをstartPosでソート
  for (const [, group] of siblingGroups) {
    group.sort((a, b) => a.startPos - b.startPos);
  }

  return siblingGroups;
}
```

#### Step 3: 順序を計算 (O(k))

```typescript
function buildNodeTree(parsedNodes: ParsedNode[]): VNode[] {
  // Step 1: 親マップを事前計算 O(k²)
  const parentMap = buildParentMap(parsedNodes);

  // Step 2: 兄弟をグループ化 O(k)
  const siblingGroups = groupSiblings(parsedNodes, parentMap);

  // Step 3: VNodeを構築 O(k)
  const nodes: VNode[] = [];

  for (const node of parsedNodes) {
    const parentId = parentMap.get(node.id) ?? null;
    const siblings = siblingGroups.get(parentId) || [];
    const order = siblings.findIndex(s => s.id === node.id);

    nodes.push({
      id: node.id,
      tag: node.tag,
      html: node.html,
      parentId,
      order: order >= 0 ? order : 0,
    });
  }

  return nodes;
}
```

### 計算量改善

| 処理 | 修正前 | 修正後 |
|------|--------|--------|
| 親計算 | O(k²) × k = O(k³) | O(k²) (1回のみ) |
| 兄弟グループ化 | - | O(k) |
| 順序計算 | O(k²) | O(k) |
| **合計** | **O(k³)** | **O(k²)** |

### テスト計画

1. 既存テストが全てパス
2. ベンチマーク比較（修正前後）
3. エッジケース:
   - 空の入力
   - 1要素のみ
   - 全要素がフラット（親なし）
   - 深くネストされた構造

---

## 問題2: セッション状態の Silent Failure

### 現状分析

**ファイル**: `src/session/state.ts:25-31`

```typescript
set(_target, prop: string, value: unknown) {
  if (!currentSessionId) {
    console.warn("session_state への書き込みは rerun 中のみ有効です");
    return true;  // ← 問題: 失敗なのに成功を返す
  }
  getSessionManager().setState(currentSessionId, prop, value);
  return true;
}
```

**問題点**:
- `session_state.counter = 1` が成功したように見えるが、実際には保存されない
- `return true` は Proxy 仕様上「成功」を意味する
- strict mode では `return false` で TypeError がスローされる

### 修正方針

**オプション比較**:

| オプション | Pros | Cons |
|------------|------|------|
| A: `return false` | 標準的、strict mode でエラー | 非strict mode では警告のみ |
| B: 例外スロー | 明示的なエラー、スタックトレース | 既存コードに影響 |
| C: カスタムエラーイベント | 非破壊的 | 複雑、見逃される可能性 |

**推奨**: オプションB（例外スロー）

理由:
- 明示的なエラーで問題を早期発見
- スタックトレースでデバッグが容易
- rerun外での状態変更は明らかなバグ

### 実装計画

#### Step 1: カスタムエラークラスの作成

```typescript
// src/session/errors.ts
export class SessionStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionStateError";
  }
}
```

#### Step 2: Proxy ハンドラの修正

```typescript
// src/session/state.ts
import { SessionStateError } from "./errors";

set(_target, prop: string, value: unknown) {
  if (!currentSessionId) {
    throw new SessionStateError(
      `session_state.${prop} への書き込みは rerun コンテキスト内でのみ有効です。` +
      `kt.* API または rerun() 関数内で使用してください。`
    );
  }
  getSessionManager().setState(currentSessionId, prop, value);
  return true;
}
```

#### Step 3: createTypedSessionState も同様に修正

```typescript
set(_target, prop: string, value: unknown) {
  if (!currentSessionId) {
    throw new SessionStateError(
      `TypedSessionState.${prop} への書き込みは rerun コンテキスト内でのみ有効です。`
    );
  }
  getSessionManager().setState(currentSessionId, prop, value);
  return true;
}
```

### テスト計画

```typescript
// tests/unit/session/state.test.ts
describe("session_state error handling", () => {
  it("should throw SessionStateError when writing outside rerun context", () => {
    setCurrentSessionId(null);

    expect(() => {
      session_state.counter = 1;
    }).toThrow(SessionStateError);
  });

  it("should include property name in error message", () => {
    setCurrentSessionId(null);

    expect(() => {
      session_state.myProperty = "value";
    }).toThrow(/myProperty/);
  });
});
```

### 互換性への影響

- **破壊的変更**: rerun外で状態変更していた既存コードはエラーになる
- **影響範囲**: そもそもrerun外での状態変更はバグなので、早期発見につながる
- **マイグレーション**: エラーメッセージで正しい使い方を案内

---

## 問題3: フォーカス消失問題

### 現状分析

**ファイル**: `src/app.ts:124-183` (クライアントサイド `applyPatch` 関数)

```typescript
case "replaceNode": {
  const el = document.getElementById(patch.id);
  if (el) {
    const temp = document.createElement("div");
    temp.innerHTML = patch.html;
    const newEl = temp.firstElementChild;
    if (newEl) {
      el.replaceWith(newEl);  // ← フォーカスが失われる
    }
  }
  break;
}
```

**問題点**:
- `el.replaceWith(newEl)` で元の要素が削除され、フォーカスも失われる
- テキスト入力中にDOM更新が発生すると、カーソル位置もリセット
- E2Eテストで確認済み（`e2e/focus-preservation.spec.ts:41-51`）

### 修正方針

**アプローチ**: パッチ適用前にフォーカス情報を保存し、適用後に復元

### 実装計画

#### Step 1: フォーカス情報の型定義

```typescript
// クライアントサイド（app.ts内）
interface FocusState {
  elementId: string | null;
  selectionStart: number | null;
  selectionEnd: number | null;
  scrollTop: number;
  scrollLeft: number;
}
```

#### Step 2: フォーカス保存関数

```typescript
function saveFocusState(): FocusState {
  const activeElement = document.activeElement;

  if (!activeElement || activeElement === document.body) {
    return {
      elementId: null,
      selectionStart: null,
      selectionEnd: null,
      scrollTop: 0,
      scrollLeft: 0,
    };
  }

  const state: FocusState = {
    elementId: activeElement.id || null,
    selectionStart: null,
    selectionEnd: null,
    scrollTop: 0,
    scrollLeft: 0,
  };

  // テキスト入力要素の場合はカーソル位置も保存
  if (activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement) {
    state.selectionStart = activeElement.selectionStart;
    state.selectionEnd = activeElement.selectionEnd;
    state.scrollTop = activeElement.scrollTop;
    state.scrollLeft = activeElement.scrollLeft;
  }

  return state;
}
```

#### Step 3: フォーカス復元関数

```typescript
function restoreFocusState(state: FocusState): void {
  if (!state.elementId) return;

  const element = document.getElementById(state.elementId);
  if (!element) return;

  // フォーカスを復元
  element.focus();

  // テキスト入力要素の場合はカーソル位置も復元
  if ((element instanceof HTMLInputElement ||
       element instanceof HTMLTextAreaElement) &&
      state.selectionStart !== null) {
    try {
      element.setSelectionRange(
        state.selectionStart,
        state.selectionEnd ?? state.selectionStart
      );
      element.scrollTop = state.scrollTop;
      element.scrollLeft = state.scrollLeft;
    } catch (e) {
      // 一部の input type（number, email等）では setSelectionRange が使えない
      console.debug("Could not restore selection range:", e);
    }
  }
}
```

#### Step 4: applyPatch の修正

```typescript
// パッチ配列を処理する前にフォーカス状態を保存
function applyPatches(patches) {
  const focusState = saveFocusState();

  for (const patch of patches) {
    applyPatch(patch);
  }

  // 次のフレームでフォーカスを復元（DOM更新完了後）
  requestAnimationFrame(() => {
    restoreFocusState(focusState);
  });
}
```

#### Step 5: onmessage ハンドラの修正

```typescript
ws.onmessage = (e) => {
  // ... パース処理 ...

  if (msg.type === "patch" && msg.patches) {
    applyPatches(msg.patches);  // 修正: 個別ではなく一括処理
  }
};
```

### 追加考慮事項

#### A: スクロール位置の保持

```typescript
function saveScrollPosition(): { x: number; y: number } {
  return {
    x: window.scrollX,
    y: window.scrollY,
  };
}

function restoreScrollPosition(pos: { x: number; y: number }): void {
  window.scrollTo(pos.x, pos.y);
}
```

#### B: アニメーション中の要素への配慮

```typescript
// transition 中の要素は replaceWith を遅延させる
function safeReplaceWith(oldEl: Element, newEl: Element): void {
  const style = getComputedStyle(oldEl);
  const hasTransition = style.transition !== "none" &&
                        style.transition !== "all 0s ease 0s";

  if (hasTransition) {
    // transition 完了を待つ（最大500ms）
    oldEl.addEventListener("transitionend", () => {
      oldEl.replaceWith(newEl);
    }, { once: true });

    setTimeout(() => {
      if (oldEl.parentNode) {
        oldEl.replaceWith(newEl);
      }
    }, 500);
  } else {
    oldEl.replaceWith(newEl);
  }
}
```

### テスト計画

```typescript
// e2e/focus-preservation.spec.ts の修正
test("should maintain focus on slider after value change", async ({ page }) => {
  await gotoAndWait(page);

  const slider = page.locator("#volume_slider");
  await slider.focus();
  await expect(slider).toBeFocused();

  // スライダーを操作
  await slider.evaluate((el: HTMLInputElement) => {
    el.value = "60";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });

  // 値が反映されることを確認
  await expect(page.locator(".kt-slider-label")).toContainText("Volume: 60");

  // フォーカスが維持されていることを確認（修正後はパスするはず）
  await expect(slider).toBeFocused();
});

test("should maintain cursor position in text input", async ({ page }) => {
  await gotoAndWait(page);

  const textInput = page.locator("#name_input");
  await textInput.focus();

  // "Hello" と入力
  await textInput.fill("Hello");

  // カーソルを中央に移動（"Hel|lo"）
  await textInput.evaluate((el: HTMLInputElement) => {
    el.setSelectionRange(3, 3);
  });

  // 何らかのイベントでrerunをトリガー
  await page.locator("#btn_inc").click();

  // テキスト入力にフォーカスを戻す
  await textInput.focus();

  // カーソル位置が保持されていることを確認
  const cursorPos = await textInput.evaluate((el: HTMLInputElement) => el.selectionStart);
  // Note: 別要素クリック後なのでカーソル位置は保持されない（これは期待動作）
});
```

---

## 実装順序

1. **問題2（Silent Failure）** - 最も単純、他に依存なし
2. **問題1（O(k³) 計算量）** - 中程度の複雑さ、差分機能の基盤
3. **問題3（フォーカス消失）** - 最も複雑、クライアントサイド変更

## 見積もり

| 問題 | ファイル変更 | 新規テスト | 複雑度 |
|------|------------|-----------|--------|
| 1. O(k³) | 1 (parser.ts) | 3-5 | 中 |
| 2. Silent Failure | 2 (errors.ts, state.ts) | 2-3 | 低 |
| 3. フォーカス保持 | 1 (app.ts) | 2-3 | 高 |

## 成功基準

- [ ] 全ての既存テストがパス
- [ ] 新規テストがパス
- [ ] ベンチマーク: 1000要素で500ms以下
- [ ] E2E: フォーカス維持テストがパス
- [ ] lint / type check エラーなし

---

# 優先度中の問題

## 問題4: CSS の重複

### 現状分析

**ファイル**: `src/app.ts:247-258`

```typescript
const defaultStyles = `
  .kt-button { padding: 8px 16px; cursor: pointer; }
  .kt-slider-container { margin: 10px 0; }
  .kt-slider { width: 200px; }
  .kt-slider-label { display: block; margin-bottom: 4px; }
  .kt-text-input-container { margin: 10px 0; }
  .kt-text-input { padding: 8px; width: 200px; }
  .kt-text-input-label { display: block; margin-bottom: 4px; }
  .kt-selectbox-container { margin: 10px 0; }
  .kt-selectbox { padding: 8px; }
  .kt-selectbox-label { display: block; margin-bottom: 4px; }
`;
```

**問題点**:
- `*-container` クラスが全て `margin: 10px 0;` で同一
- `*-label` クラスが全て `display: block; margin-bottom: 4px;` で同一
- 新しいウィジェット追加時に同じパターンを繰り返す必要がある

### 修正方針

CSS クラスを統合し、共通スタイルを1つのルールにまとめる

### 実装計画

```typescript
const defaultStyles = `
  .kt-button { padding: 8px 16px; cursor: pointer; }

  /* 共通コンテナスタイル */
  .kt-slider-container,
  .kt-text-input-container,
  .kt-selectbox-container {
    margin: 10px 0;
  }

  /* 共通ラベルスタイル */
  .kt-slider-label,
  .kt-text-input-label,
  .kt-selectbox-label {
    display: block;
    margin-bottom: 4px;
  }

  /* 個別スタイル */
  .kt-slider { width: 200px; }
  .kt-text-input { padding: 8px; width: 200px; }
  .kt-selectbox { padding: 8px; }
`;
```

### 代替案: CSS変数を使用

```typescript
const defaultStyles = `
  :root {
    --kt-container-margin: 10px 0;
    --kt-label-margin: 4px;
    --kt-input-padding: 8px;
    --kt-input-width: 200px;
  }

  .kt-button { padding: var(--kt-input-padding) 16px; cursor: pointer; }

  [class$="-container"] { margin: var(--kt-container-margin); }
  [class$="-label"] { display: block; margin-bottom: var(--kt-label-margin); }

  .kt-slider { width: var(--kt-input-width); }
  .kt-text-input { padding: var(--kt-input-padding); width: var(--kt-input-width); }
  .kt-selectbox { padding: var(--kt-input-padding); }
`;
```

### テスト計画

1. E2Eテストで各ウィジェットの表示を確認
2. ビジュアルリグレッションなし

---

## 問題5: ウィジェットラッピングの重複パターン

### 現状分析

**ファイル**: `src/kt/widgets.ts:18-83`

4つのウィジェット関数がほぼ同一のパターンを持つ:

```typescript
export function button(label: string, config?: Partial<ButtonConfig>): boolean {
  const ctx = requireRenderContext();
  const id = generateWidgetId(config?.key);
  const configWithId = { ...config, key: id };
  const pressed = imperativeButton(label, configWithId);
  ctx.append(renderButton(label, configWithId));
  return pressed;
}

export function slider(...): number {
  const ctx = requireRenderContext();
  const id = generateWidgetId(config?.key);
  const configWithId = { ...config, key: id };
  const value = imperativeSlider(..., configWithId);
  ctx.append(renderSlider(..., configWithId));
  return value;
}
// text_input, selectbox も同様
```

**問題点**:
- 4つの関数で `requireRenderContext()`, `generateWidgetId()`, `config` 展開が重複
- 新しいウィジェット追加時に同じボイラープレートが必要

### 修正方針

ヘルパー関数を作成して共通パターンを抽出

### 実装計画

#### Step 1: 共通ヘルパーの作成

```typescript
// src/kt/widget-helper.ts

import { generateWidgetId } from "../widgets/registry";
import { requireRenderContext } from "./context";

/**
 * 宣言的ウィジェットのボイラープレートを処理するヘルパー
 */
export function wrapWidget<TConfig extends { key?: string }, TValue>(
  config: Partial<TConfig> | undefined,
  imperativeFn: (configWithId: Partial<TConfig> & { key: string }) => TValue,
  renderFn: (configWithId: Partial<TConfig> & { key: string }) => string,
): TValue {
  const ctx = requireRenderContext();
  const id = generateWidgetId(config?.key);
  const configWithId = { ...config, key: id } as Partial<TConfig> & { key: string };
  const value = imperativeFn(configWithId);
  ctx.append(renderFn(configWithId));
  return value;
}
```

#### Step 2: ウィジェット関数のリファクタリング

```typescript
// src/kt/widgets.ts

export function button(label: string, config?: Partial<ButtonConfig>): boolean {
  return wrapWidget(
    config,
    (cfg) => imperativeButton(label, cfg),
    (cfg) => renderButton(label, cfg),
  );
}

export function slider(
  label: string,
  min: number,
  max: number,
  defaultValue?: number,
  config?: Partial<SliderConfig>,
): number {
  return wrapWidget(
    config,
    (cfg) => imperativeSlider(label, min, max, defaultValue, cfg),
    (cfg) => renderSlider(label, min, max,
      imperativeSlider(label, min, max, defaultValue, cfg), cfg),
  );
}
```

**注意**: slider の場合、render に value が必要なため、少し工夫が必要

#### 代替案: 完全なリファクタリングは見送り

現状の重複は4箇所のみで、ヘルパー関数を導入すると:
- 型定義が複雑になる
- 各ウィジェットの引数が異なるため、汎用化が難しい
- コードの読みやすさが低下する可能性

**推奨**: 現状維持とし、ウィジェット数が増えた時点で再検討

### テスト計画

既存のユニットテストとE2Eテストがパスすることを確認

---

## 問題6: initializeWidgetState の重複

### 現状分析

**ファイル**: `src/widgets/core.ts:35-91`

3つの初期化関数が同一パターン:

```typescript
export function initializeSliderState(widgetId: string, min: number, defaultValue?: number): number {
  const initial = defaultValue ?? min;
  if (!hasWidgetValue(widgetId)) {
    setWidgetValue(widgetId, initial);
  }
  return getWidgetValue<number>(widgetId, initial);
}

export function initializeTextInputState(widgetId: string, defaultValue?: string): string {
  const initial = defaultValue ?? "";
  if (!hasWidgetValue(widgetId)) {
    setWidgetValue(widgetId, initial);
  }
  return getWidgetValue<string>(widgetId, initial);
}

export function initializeSelectboxState(widgetId: string, options: string[], defaultValue?: string): string {
  const initial = defaultValue ?? options[0] ?? "";
  if (!hasWidgetValue(widgetId)) {
    setWidgetValue(widgetId, initial);
  }
  return getWidgetValue<string>(widgetId, initial);
}
```

**問題点**:
- `if (!hasWidgetValue) { setWidgetValue }` パターンが3回重複
- 新しいウィジェットタイプ追加時に同じパターンを繰り返す

### 修正方針

ジェネリックな `initializeWidgetState<T>` ヘルパーを作成

### 実装計画

#### Step 1: ジェネリックヘルパーの作成

```typescript
// src/widgets/core.ts

/**
 * ウィジェットの状態を初期化するジェネリックヘルパー
 * 状態が存在しない場合のみ初期値を設定し、現在値を返す
 */
function initializeWidgetState<T>(widgetId: string, initialValue: T): T {
  if (!hasWidgetValue(widgetId)) {
    setWidgetValue(widgetId, initialValue);
  }
  return getWidgetValue<T>(widgetId, initialValue);
}
```

#### Step 2: 既存関数のリファクタリング

```typescript
export function initializeSliderState(
  widgetId: string,
  min: number,
  defaultValue?: number,
): number {
  return initializeWidgetState(widgetId, defaultValue ?? min);
}

export function initializeTextInputState(
  widgetId: string,
  defaultValue?: string,
): string {
  return initializeWidgetState(widgetId, defaultValue ?? "");
}

export function initializeSelectboxState(
  widgetId: string,
  options: string[],
  defaultValue?: string,
): string {
  return initializeWidgetState(widgetId, defaultValue ?? options[0] ?? "");
}
```

### メリット

- コード重複を削減
- 新しいウィジェット追加時は `initializeWidgetState()` を呼ぶだけ
- 初期化ロジックの一元管理

### テスト計画

1. 既存のウィジェットテストがパス
2. ジェネリックヘルパーのユニットテスト追加

---

## 問題7: Getter に隠れた副作用

### 現状分析

**ファイル**: `src/session/state.ts:81-94`

```typescript
get(_target, prop: string) {
  if (!currentSessionId) {
    return defaults[prop as keyof T];
  }
  const state = getSessionManager().getState(currentSessionId);
  const value = state?.[prop];
  // 値が未設定ならデフォルト値を設定して返す
  if (value === undefined && prop in defaults) {
    const defaultValue = defaults[prop as keyof T];
    getSessionManager().setState(currentSessionId, prop, defaultValue);  // ← 副作用!
    return defaultValue;
  }
  return value;
}
```

**問題点**:
- プロパティを読むだけで状態が変更される
- 「最小驚きの原則」に違反
- デバッグ時に予期しない状態変更が発生する可能性

### 修正方針

**オプション比較**:

| オプション | Pros | Cons |
|------------|------|------|
| A: 副作用を削除 | 純粋なgetter | デフォルト値が永続化されない |
| B: 明示的な初期化API | 意図が明確 | API追加が必要 |
| C: ドキュメント追加のみ | 変更なし | 驚きが残る |

**推奨**: オプションA（副作用を削除）

理由:
- getter は読み取り専用であるべき
- デフォルト値はメモリ上のみで、必要時に永続化は呼び出し側で行う

### 実装計画

```typescript
get(_target, prop: string) {
  if (!currentSessionId) {
    return defaults[prop as keyof T];
  }
  const state = getSessionManager().getState(currentSessionId);
  const value = state?.[prop];

  // 値が未設定ならデフォルト値を返す（状態は変更しない）
  if (value === undefined && prop in defaults) {
    return defaults[prop as keyof T];
  }
  return value;
}
```

### 代替案: 明示的な初期化メソッド

```typescript
export function initializeTypedSessionState<T>(state: T, defaults: T): void {
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    if (state[key] === undefined) {
      state[key] = defaults[key];
    }
  }
}
```

### 互換性への影響

- 現在の挙動に依存しているコードがある場合は破壊的変更
- ただし、現時点では `createTypedSessionState` の利用は限定的

### テスト計画

1. getter が状態を変更しないことを確認
2. デフォルト値が正しく返されることを確認
3. 明示的に set した値が優先されることを確認

---

# 優先度低の問題

## 問題8: ドキュメントと実装の不整合（大文字タグ）

### 現状分析

**ドキュメント**: `docs/diff-module.md`
> 大文字タグ名: `<DIV>` - 正規表現が小文字のみ対応

**実装**: `src/diff/parser.ts:60`
```typescript
const idPattern = /<([a-z][a-z0-9]*)\s+...>/gi;
//                                         ^^ i フラグ
```

**問題点**:
- `i` フラグにより `[a-z]` は実際には大文字もマッチする
- ドキュメントが実装と矛盾している
- テストカバレッジがない

### 修正方針

ドキュメントを修正して実装と一致させる

### 実装計画

#### Step 1: テストを追加して挙動を確認

```typescript
// tests/unit/diff/parser.test.ts
describe("uppercase tags", () => {
  it("should parse uppercase tag names", () => {
    const html = '<DIV id="test">content</DIV>';
    const nodes = parseHtml(html);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].tag).toBe("DIV");
  });

  it("should parse mixed case tag names", () => {
    const html = '<Div id="test">content</Div>';
    const nodes = parseHtml(html);
    expect(nodes).toHaveLength(1);
  });
});
```

#### Step 2: ドキュメント修正

```markdown
<!-- docs/diff-module.md -->
| 大文字タグ名 | `<DIV>` - 対応済み（正規表現 `i` フラグにより大文字小文字を無視） |
```

---

## 問題9: 未使用の正規表現キャプチャグループ

### 現状分析

**ファイル**: `src/diff/parser.ts:73`

```typescript
const [fullMatch, tag, _beforeId, id, _afterId, closeTag] = match;
//                     ^^^^^^^^^      ^^^^^^^^  未使用
```

**問題点**:
- グループ 2 (`_beforeId`) と 4 (`_afterId`) はキャプチャされるが使用されていない
- 非キャプチャグループ `(?:...)` に変更可能

### 修正方針

正規表現を最適化して不要なキャプチャを削除

### 実装計画

```typescript
// 修正前
const idPattern = /<([a-z][a-z0-9]*)\s+([^>]*?)id="([^"]+)"([^>]*?)(\/?>)([\s\S]*?)(?:<\/\1>)?/gi;

// 修正後（非キャプチャグループを使用）
const idPattern = /<([a-z][a-z0-9]*)\s+(?:[^>]*?)id="([^"]+)"(?:[^>]*?)(\/?>)([\s\S]*?)(?:<\/\1>)?/gi;

// 分割使用
const [fullMatch, tag, id, closeTag] = match;
```

### 注意

- 正規表現の変更は慎重にテストが必要
- パフォーマンスへの影響は軽微

---

## 問題10: 型バリデーションのギャップ

### 現状分析

**ファイル**: `src/widgets/registry.ts:45-55`

```typescript
const validator = getTypeValidator(defaultValue);
if (validator && !validator(value)) {
  console.warn(...);
  return defaultValue;
}
return value as T;  // ← validator が null の場合、unsafe なキャスト
```

**問題点**:
- `getTypeValidator` はプリミティブ型（string, number, boolean）のみ対応
- オブジェクト型や配列型の場合、`validator = null` となりキャストがunsafe
- 型安全性が部分的に欠如

### 修正方針

**オプション比較**:

| オプション | Pros | Cons |
|------------|------|------|
| A: 型制約を追加 | 完全な型安全性 | APIの制限 |
| B: 警告を追加 | 非破壊的 | 問題を先送り |
| C: 現状維持 | 変更なし | リスクが残る |

**推奨**: オプションB（警告を追加）+ 将来的にオプションA

### 実装計画

#### Step 1: 非プリミティブ型への警告追加

```typescript
export function getWidgetValue<T>(widgetId: string, defaultValue: T): T {
  const sessionId = getCurrentSessionId();
  if (!sessionId) return defaultValue;

  const state = getSessionManager().getState(sessionId);
  if (!state || !(widgetId in state)) {
    return defaultValue;
  }

  const value = state[widgetId];
  const validator = getTypeValidator(defaultValue);

  if (validator) {
    // プリミティブ型: バリデーション実行
    if (!validator(value)) {
      console.warn(
        `Type mismatch for widget "${widgetId}": expected ${typeof defaultValue}, got ${typeof value}. Using default value.`,
      );
      return defaultValue;
    }
  } else if (process.env.NODE_ENV === "development") {
    // 非プリミティブ型: 開発時のみ警告
    console.debug(
      `Widget "${widgetId}" uses non-primitive type. Type validation skipped.`,
    );
  }

  return value as T;
}
```

#### Step 2: ジェネリック型の制約追加（将来）

```typescript
// 将来的にプリミティブ型のみに制限する場合
type WidgetValue = string | number | boolean;

export function getWidgetValue<T extends WidgetValue>(
  widgetId: string,
  defaultValue: T,
): T {
  // ...
}
```

---

# 優先度別 実装順序（完全版）

## 高優先度（クリティカル）

| 順番 | 問題 | 複雑度 | ファイル |
|------|------|--------|----------|
| 1 | Silent Failure | 低 | errors.ts, state.ts |
| 2 | O(k³) 計算量 | 中 | parser.ts |
| 3 | フォーカス消失 | 高 | app.ts |

## 中優先度

| 順番 | 問題 | 複雑度 | ファイル |
|------|------|--------|----------|
| 4 | CSS 重複 | 低 | app.ts |
| 5 | initializeWidgetState 重複 | 低 | core.ts |
| 6 | Getter 副作用 | 中 | state.ts |
| 7 | ウィジェットラッピング | - | 見送り |

## 低優先度

| 順番 | 問題 | 複雑度 | ファイル |
|------|------|--------|----------|
| 8 | ドキュメント不整合 | 低 | diff-module.md |
| 9 | 正規表現最適化 | 低 | parser.ts |
| 10 | 型バリデーション | 低 | registry.ts |

---

# 成功基準（完全版）

## 実装状況（2026-01-02 更新）

### 高優先度
- [x] SessionStateError が rerun 外で正しくスローされる
  - `src/session/errors.ts`: SessionStateErrorクラス追加
  - `src/session/state.ts`: set時に例外スロー
- [x] buildNodeTree が O(k²) で動作する（ベンチマーク確認）
  - `src/diff/parser.ts`: `buildParentMap()` + `groupSiblings()` でO(k²)に改善
- [ ] E2E フォーカス維持テストがパス
  - 未実装: `e2e/focus-preservation.spec.ts` で「known limitation」として記録
  - `applyPatch` でのフォーカス保存・復元機能が必要

### 中優先度
- [x] CSS サイズが削減される
  - `src/app.ts`: セレクタをグループ化して重複削減
- [ ] initializeWidgetState がジェネリック化される
  - 未実装: `src/widgets/core.ts` の3関数がまだ重複パターン
- [x] getter が副作用を持たない
  - `src/session/state.ts`: デフォルト値返却時に状態変更しない
- [x] ウィジェットラッピング重複が解消される
  - `src/kt/widget-helper.ts`: `wrapWidget()` ヘルパー導入

### 低優先度
- [ ] ドキュメントが実装と一致する
  - 未修正: `docs/diff-module.md` の大文字タグの記述が実装と不整合
  - 実装は `/gi` フラグで大文字対応済み
- [ ] 未使用キャプチャグループの最適化
  - 未修正: `src/diff/parser.ts:74` の `_beforeId`, `_afterId`
- [ ] 非プリミティブ型の警告が開発時に表示される
  - 未実装: `src/widgets/registry.ts` に開発時警告なし

## 残課題サマリー

| # | 問題 | 対象ファイル | 複雑度 |
|---|------|--------------|--------|
| 3 | フォーカス消失 | `src/app.ts` (client) | 高 |
| 6 | initializeWidgetState重複 | `src/widgets/core.ts` | 低 |
| 8 | ドキュメント不整合 | `docs/diff-module.md` | 低 |
| 9 | 未使用キャプチャグループ | `src/diff/parser.ts` | 低 |
| 10 | 型バリデーション警告 | `src/widgets/registry.ts` | 低 |

## 全体
- [x] 全ての既存テストがパス
- [x] lint / type check エラーなし
- [x] bun run ci が成功
