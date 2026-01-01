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
