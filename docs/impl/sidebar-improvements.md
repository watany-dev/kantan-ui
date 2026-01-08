# kt.sidebar 改善設計書

作成日: 2026-01-08

## 概要

PR #134 で実装された `kt.sidebar` の4つの改善提案について、詳細設計と実装計画を記載する。

---

## 改善項目一覧

| # | 項目 | 優先度 | 難易度 | 影響範囲 |
|---|------|--------|--------|----------|
| 1 | サイドバー差分更新 | 中 | 高 | app.ts, differ.ts |
| 2 | レスポンシブE2Eテスト | 高 | 低 | e2e/layout.spec.ts |
| 3 | width設定実装 | 低 | 低 | layout.ts, styles, app.ts |
| 4 | ネスト呼び出しドキュメント | 高 | 低 | sidebar-design.md |

---

## 1. サイドバー差分更新

### 現状の問題

現在のサイドバー更新は、内容が変わると全置換（`replaceNode`）される：

```typescript
// src/app.ts:368-374
if (newResult.hasSidebar && newResult.sidebarHtml !== session.lastSidebarHtml) {
  patches.push({
    type: "replaceNode",
    id: "kt-sidebar-content",
    html: `<div id="kt-sidebar-content" class="kt-sidebar-content">${newResult.sidebarHtml}</div>`,
  });
}
```

**問題点:**
- サイドバーに大量のコンテンツがある場合、毎回全体を送信
- フォーカス状態やスクロール位置がリセットされる可能性
- 帯域幅の無駄

### 設計

#### アプローチ: サイドバー専用の差分計算

メインエリアと同様に、サイドバーも差分計算を適用する。

```typescript
// src/app.ts 修正案

// サイドバーの差分計算
if (newResult.hasSidebar) {
  if (session.lastSidebarHtml) {
    const sidebarDiffResult = diff(session.lastSidebarHtml, newResult.sidebarHtml);
    const sidebarPatches = toWebSocketPatches(
      sidebarDiffResult,
      newResult.sidebarHtml,
      "kt-sidebar-content"  // ルートIDを指定
    );
    patches.push(...sidebarPatches);
  } else {
    // 初回はreplaceNode
    patches.push({
      type: "replaceNode",
      id: "kt-sidebar-content",
      html: `<div id="kt-sidebar-content" class="kt-sidebar-content">${newResult.sidebarHtml}</div>`,
    });
  }
}
```

#### toWebSocketPatches の拡張

```typescript
// src/diff/differ.ts 修正案

/**
 * 差分パッチをWebSocketパッチ形式に変換
 * @param rootId - ルート要素のID（指定時はreplaceRootの代わりにreplaceNodeを使用）
 */
export function toWebSocketPatches(
  diffResult: DiffResult,
  fullHtml: string,
  rootId?: string,  // 新パラメータ
): Patch[] {
  if (!diffResult.hasChanges) {
    return [];
  }

  // フォールバック処理
  if (diffResult.patches.length === 0 || diffResult.patches.length > PATCH_THRESHOLD) {
    if (rootId) {
      // サイドバー等の場合はreplaceNode
      return [{
        type: "replaceNode",
        id: rootId,
        html: `<div id="${rootId}" class="kt-sidebar-content">${fullHtml}</div>`,
      }];
    }
    return [{ type: "replaceRoot", html: fullHtml }];
  }

  // insertパッチがある場合もフォールバック
  const hasInsertPatches = diffResult.patches.some((p) => p.type === "insert");
  if (hasInsertPatches) {
    if (rootId) {
      return [{
        type: "replaceNode",
        id: rootId,
        html: `<div id="${rootId}" class="kt-sidebar-content">${fullHtml}</div>`,
      }];
    }
    return [{ type: "replaceRoot", html: fullHtml }];
  }

  return diffResult.patches.map((p): Patch => {
    // 既存の変換ロジック
  });
}
```

### 実装計画

| ステップ | 内容 | ファイル |
|----------|------|----------|
| 1 | `toWebSocketPatches`にrootIdパラメータ追加 | `src/diff/differ.ts` |
| 2 | ユニットテスト追加 | `tests/unit/diff/differ.test.ts` |
| 3 | app.tsでサイドバー差分計算を適用 | `src/app.ts` |
| 4 | E2Eテストで差分更新を検証 | `e2e/layout.spec.ts` |

### テスト計画

```typescript
// tests/unit/diff/differ.test.ts 追加

describe("toWebSocketPatches with rootId", () => {
  it("should return replaceNode when rootId is specified and fallback triggered", () => {
    const diffResult: DiffResult = {
      patches: [], // 空（ID追跡できない変更）
      hasChanges: true,
    };

    const patches = toWebSocketPatches(diffResult, "<p>new</p>", "kt-sidebar-content");

    expect(patches).toHaveLength(1);
    expect(patches[0].type).toBe("replaceNode");
    expect((patches[0] as ReplaceNodePatch).id).toBe("kt-sidebar-content");
  });

  it("should apply diff patches when rootId specified and patches available", () => {
    const diffResult: DiffResult = {
      patches: [{ type: "replace", id: "widget-1", html: "<div>updated</div>" }],
      hasChanges: true,
    };

    const patches = toWebSocketPatches(diffResult, "<p>full</p>", "kt-sidebar-content");

    expect(patches).toHaveLength(1);
    expect(patches[0].type).toBe("replaceNode");
    expect((patches[0] as ReplaceNodePatch).id).toBe("widget-1");
  });
});
```

### リスクと対策

| リスク | 対策 |
|--------|------|
| サイドバー内ウィジェットのID衝突 | ウィジェットIDはグローバルユニークなので問題なし |
| パフォーマンス劣化 | 差分計算のオーバーヘッドは軽微。パッチ数閾値でフォールバック |

---

## 2. レスポンシブE2Eテスト

### 現状の問題

モバイルレスポンシブのCSSは実装済みだが、E2Eテストがない：

```css
/* 768px以下でオーバーレイ方式 */
@media (max-width: 768px) {
  .kt-sidebar {
    position: fixed;
    /* ... */
  }
}
```

### 設計

Playwrightの`setViewportSize`を使用してモバイルビューポートをシミュレート。

```typescript
// e2e/layout.spec.ts 追加

test.describe("Layout API - Sidebar (Mobile)", () => {
  test.beforeEach(async ({ page }) => {
    // iPhone SE サイズ
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test("sidebar uses fixed positioning on mobile", async ({ page }) => {
    await gotoAndWait(page);

    const sidebar = page.locator(".kt-sidebar");
    await expect(sidebar).toHaveCSS("position", "fixed");
  });

  test("sidebar overlay appears when expanded on mobile", async ({ page }) => {
    await gotoAndWait(page);

    const overlay = page.locator(".kt-sidebar-overlay");
    const sidebar = page.locator(".kt-sidebar");

    // 展開状態でオーバーレイ表示
    await expect(sidebar).toHaveAttribute("data-state", "expanded");
    await expect(overlay).toBeVisible();
  });

  test("clicking overlay closes sidebar on mobile", async ({ page }) => {
    await gotoAndWait(page);

    const overlay = page.locator(".kt-sidebar-overlay");
    const sidebar = page.locator(".kt-sidebar");

    await overlay.click();
    await expect(sidebar).toHaveAttribute("data-state", "collapsed");
  });

  test("toggle button is larger on mobile", async ({ page }) => {
    await gotoAndWait(page);

    const toggle = page.locator(".kt-sidebar-toggle");
    const box = await toggle.boundingBox();

    // モバイルでは40x40px
    expect(box?.width).toBeGreaterThanOrEqual(40);
    expect(box?.height).toBeGreaterThanOrEqual(40);
  });

  test("main content takes full width on mobile", async ({ page }) => {
    await gotoAndWait(page);

    const main = page.locator(".kt-main");
    const box = await main.boundingBox();

    // ビューポート幅に近い
    expect(box?.width).toBeGreaterThan(350);
  });
});
```

### 追加テストケース

```typescript
test.describe("Layout API - Sidebar (Tablet)", () => {
  test.beforeEach(async ({ page }) => {
    // iPad サイズ（境界値テスト）
    await page.setViewportSize({ width: 768, height: 1024 });
  });

  test("sidebar uses fixed positioning at exactly 768px", async ({ page }) => {
    await gotoAndWait(page);

    const sidebar = page.locator(".kt-sidebar");
    // 768px以下なのでfixed
    await expect(sidebar).toHaveCSS("position", "fixed");
  });
});

test.describe("Layout API - Sidebar (Desktop)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test("sidebar uses relative positioning on desktop", async ({ page }) => {
    await gotoAndWait(page);

    const sidebar = page.locator(".kt-sidebar");
    await expect(sidebar).toHaveCSS("position", "relative");
  });

  test("sidebar overlay is hidden on desktop", async ({ page }) => {
    await gotoAndWait(page);

    const overlay = page.locator(".kt-sidebar-overlay");
    await expect(overlay).not.toBeVisible();
  });
});
```

### 実装計画

| ステップ | 内容 | ファイル |
|----------|------|----------|
| 1 | モバイルテストケース追加 | `e2e/layout.spec.ts` |
| 2 | タブレット境界値テスト追加 | `e2e/layout.spec.ts` |
| 3 | デスクトップテスト追加 | `e2e/layout.spec.ts` |
| 4 | CI設定確認 | `.github/workflows/ci.yml` |

---

## 3. width設定実装

### 現状の問題

`SidebarConfig.width`は型定義されているが、実装されていない：

```typescript
// src/kt/layout.ts:272
export function sidebar(content: () => void, _config?: SidebarConfig): void {
  // _config.width は使用されていない
}
```

### 設計

#### アプローチ: CSS変数による動的幅設定

```typescript
// src/kt/layout.ts 修正案

export function sidebar(content: () => void, config?: SidebarConfig): void {
  const ctx = requireRenderContext();
  const width = config?.width ?? "280px";

  // サイドバー幅をメタデータとして保存
  ctx.setSidebarWidth(width);

  const previousTarget = ctx.getTarget();
  ctx.setTarget("sidebar");

  try {
    content();
  } finally {
    ctx.setTarget(previousTarget);
  }
}
```

#### RenderContext の拡張

```typescript
// src/kt/context.ts 追加

export class RenderContext {
  private sidebarWidth: string = "280px";

  setSidebarWidth(width: string): void {
    this.sidebarWidth = width;
  }

  getSidebarWidth(): string {
    return this.sidebarWidth;
  }
}
```

#### HTML生成の修正

```typescript
// src/app.ts 修正案

const sidebarWidth = renderContext.getSidebarWidth();

const bodyContent = initialResult.hasSidebar
  ? html`<div class="kt-layout-sidebar" style="--kt-sidebar-width: ${sidebarWidth};">
      <aside class="kt-sidebar" data-state="expanded">
        <!-- ... -->
      </aside>
      <!-- ... -->
    </div>`
  : /* ... */;
```

#### CSS修正

```css
/* src/styles/default.ts 修正 */

.kt-sidebar {
  width: var(--kt-sidebar-width, 280px);
  min-width: var(--kt-sidebar-width, 280px);
  /* ... */
}

@media (max-width: 768px) {
  .kt-sidebar[data-state="collapsed"] {
    width: var(--kt-sidebar-width, 280px);
    min-width: var(--kt-sidebar-width, 280px);
  }
}
```

### 実装計画

| ステップ | 内容 | ファイル |
|----------|------|----------|
| 1 | RenderContextに`sidebarWidth`追加 | `src/kt/context.ts` |
| 2 | `sidebar()`で`config.width`を使用 | `src/kt/layout.ts` |
| 3 | RerunResultに`sidebarWidth`追加 | `src/runtime/rerun.ts` |
| 4 | app.tsでCSS変数を出力 | `src/app.ts` |
| 5 | CSSをCSS変数対応に修正 | `src/styles/default.ts` |
| 6 | ユニットテスト追加 | `tests/unit/kt/layout.test.ts` |
| 7 | E2Eテスト追加 | `e2e/layout.spec.ts` |

### テスト計画

```typescript
// tests/unit/kt/layout.test.ts 追加

describe("kt.sidebar with config", () => {
  it("should set custom width via config", () => {
    const ctx = new RenderContext();
    setRenderContext(ctx);

    sidebar(() => {
      write("content");
    }, { width: "350px" });

    expect(ctx.getSidebarWidth()).toBe("350px");
  });

  it("should use default width when not specified", () => {
    const ctx = new RenderContext();
    setRenderContext(ctx);

    sidebar(() => {
      write("content");
    });

    expect(ctx.getSidebarWidth()).toBe("280px");
  });
});
```

```typescript
// e2e/layout.spec.ts 追加

test("sidebar respects custom width", async ({ page }) => {
  // デモアプリでwidth: "350px"を使用した場合
  await gotoAndWait(page);

  const sidebar = page.locator(".kt-sidebar");
  await expect(sidebar).toHaveCSS("width", "350px");
});
```

---

## 4. ネスト呼び出しドキュメント

### 現状の問題

`kt.sidebar()`のネスト呼び出し時の挙動がドキュメント化されていない。

```typescript
// 現在の挙動（暗黙的）
kt.sidebar(() => {
  kt.write("Outer");
  kt.sidebar(() => {
    kt.write("Inner"); // これもサイドバーに出力される
  });
  kt.write("Still sidebar"); // サイドバーに出力
});
kt.write("Main"); // メインに出力
```

### 設計

#### ドキュメント追加内容

```markdown
## ネスト呼び出しの挙動

### サポートされるパターン

`kt.sidebar()` はネストして呼び出すことができます。内側の `kt.sidebar()` 呼び出し内のコンテンツも、すべてサイドバーバッファに出力されます。

```typescript
kt.sidebar(() => {
  kt.write("Level 1");

  kt.sidebar(() => {
    kt.write("Level 2 - still in sidebar");
  });

  kt.write("Back to Level 1 - still in sidebar");
});

kt.write("Main content");
```

**出力結果:**
- サイドバー: "Level 1", "Level 2 - still in sidebar", "Back to Level 1 - still in sidebar"
- メイン: "Main content"

### 実装詳細

`kt.sidebar()` は内部で以下の処理を行います：

1. 現在のターゲット（`main` または `sidebar`）を保存
2. ターゲットを `sidebar` に切り替え
3. コールバックを実行
4. ターゲットを元に戻す（`try/finally` で保証）

```typescript
export function sidebar(content: () => void, config?: SidebarConfig): void {
  const ctx = requireRenderContext();
  const previousTarget = ctx.getTarget(); // "main" or "sidebar"
  ctx.setTarget("sidebar");

  try {
    content();
  } finally {
    ctx.setTarget(previousTarget); // 必ず復元
  }
}
```

ネスト呼び出し時：
- 外側の `sidebar()` で `previousTarget = "main"`、`currentTarget = "sidebar"`
- 内側の `sidebar()` で `previousTarget = "sidebar"`、`currentTarget = "sidebar"`
- 内側終了時に `currentTarget = "sidebar"`（変わらず）
- 外側終了時に `currentTarget = "main"`（復元）

### 非推奨パターン

以下のパターンは技術的には動作しますが、コードの可読性のため推奨しません：

```typescript
// 非推奨: 深いネスト
kt.sidebar(() => {
  kt.sidebar(() => {
    kt.sidebar(() => {
      kt.write("Deeply nested");
    });
  });
});

// 推奨: フラットな構造
kt.sidebar(() => {
  kt.write("All sidebar content here");
});
```

### エラーハンドリング

コールバック内で例外が発生しても、ターゲットは正しく復元されます：

```typescript
kt.sidebar(() => {
  kt.write("Before error");
  throw new Error("Something went wrong");
  kt.write("After error"); // 実行されない
});

kt.write("This goes to main"); // ターゲットは正しくmainに戻っている
```
```

### 実装計画

| ステップ | 内容 | ファイル |
|----------|------|----------|
| 1 | ネスト呼び出しセクション追加 | `docs/impl/sidebar-design.md` |
| 2 | JSDocコメント追加 | `src/kt/layout.ts` |
| 3 | ネスト呼び出しのユニットテスト追加 | `tests/unit/kt/layout.test.ts` |

### JSDoc追加

```typescript
// src/kt/layout.ts

/**
 * サイドバーにコンテンツを追加
 *
 * @param content - サイドバー内に表示するコンテンツ
 * @param config - オプション設定
 *
 * @remarks
 * ネスト呼び出しがサポートされています。内側の `kt.sidebar()` 内のコンテンツも
 * サイドバーバッファに出力されます。コールバック内で例外が発生しても、
 * ターゲットは `try/finally` により正しく復元されます。
 *
 * @example
 * ```typescript
 * // 基本的な使い方
 * kt.sidebar(() => {
 *   kt.title("Settings");
 *   kt.write("Sidebar content");
 * });
 *
 * // ネスト呼び出し（サポートされるが非推奨）
 * kt.sidebar(() => {
 *   kt.write("Outer");
 *   kt.sidebar(() => {
 *     kt.write("Inner - still in sidebar");
 *   });
 * });
 * ```
 */
export function sidebar(content: () => void, config?: SidebarConfig): void {
```

---

## 実装順序の推奨

優先度と依存関係を考慮した実装順序：

```
1. ドキュメント追加 (4)
   ↓ 即座に完了可能、他に影響なし
2. レスポンシブE2Eテスト (2)
   ↓ テスト追加のみ、コード変更なし
3. width設定実装 (3)
   ↓ 小規模な変更、リスク低
4. サイドバー差分更新 (1)
   ↓ 影響範囲が大きい、十分なテストが必要
```

## 工数見積もり

| 項目 | 実装 | テスト | レビュー | 合計 |
|------|------|--------|----------|------|
| 1. 差分更新 | 2h | 1h | 1h | 4h |
| 2. E2Eテスト | 1h | - | 0.5h | 1.5h |
| 3. width実装 | 1h | 0.5h | 0.5h | 2h |
| 4. ドキュメント | 0.5h | 0.5h | 0.5h | 1.5h |
| **合計** | | | | **9h** |

---

## チェックリスト

### 1. サイドバー差分更新
- [ ] `toWebSocketPatches`にrootIdパラメータ追加
- [ ] ユニットテスト追加
- [ ] app.tsでサイドバー差分計算適用
- [ ] E2Eテスト追加
- [ ] `bun run ci` 成功

### 2. レスポンシブE2Eテスト
- [ ] モバイルビューポートテスト追加
- [ ] タブレット境界値テスト追加
- [ ] デスクトップテスト追加
- [ ] `bun run ci` 成功

### 3. width設定実装
- [ ] RenderContextに`sidebarWidth`追加
- [ ] `sidebar()`でconfig.width使用
- [ ] RerunResultに`sidebarWidth`追加
- [ ] app.tsでCSS変数出力
- [ ] CSS変数対応
- [ ] ユニットテスト追加
- [ ] E2Eテスト追加
- [ ] `bun run ci` 成功

### 4. ネスト呼び出しドキュメント
- [ ] sidebar-design.mdにセクション追加
- [ ] JSDocコメント追加
- [ ] ネスト呼び出しテスト追加
- [ ] `bun run ci` 成功
