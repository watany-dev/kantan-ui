# kt.sidebar 改善 イテレーティブ実装計画

作成日: 2026-01-08

## 概要

4つの改善項目を小さなイテレーションに分割し、各イテレーションで:
1. `bun run ci` を通過
2. コミット & プッシュ

**CI内容:** `lint` → `build` → `test:coverage`
**注意:** E2Eテスト (`test:e2e`) はCIに含まれないため、別途手動実行を推奨

---

## 実装順序

```
Phase A: ドキュメント整備 (2イテレーション)
    ↓
Phase B: レスポンシブE2Eテスト (3イテレーション)
    ↓
Phase C: width設定実装 (4イテレーション)
    ↓
Phase D: サイドバー差分更新 (4イテレーション)
```

**合計: 13イテレーション**

---

## Phase A: ドキュメント整備

### A-1: JSDocコメント追加

**目的:** `kt.sidebar()`のネスト呼び出し挙動をコードに明記

**変更ファイル:**
- `src/kt/layout.ts`

**作業内容:**
```typescript
// src/kt/layout.ts の sidebar関数にJSDoc追加

/**
 * サイドバーにコンテンツを追加
 *
 * @param content - サイドバー内に表示するコンテンツ
 * @param config - オプション設定
 *
 * @remarks
 * - ネスト呼び出しがサポートされています
 * - 内側の `kt.sidebar()` 内のコンテンツもサイドバーバッファに出力されます
 * - コールバック内で例外が発生しても、ターゲットは `try/finally` により正しく復元されます
 *
 * @example
 * ```typescript
 * kt.sidebar(() => {
 *   kt.title("Settings");
 *   kt.write("Sidebar content");
 * });
 *
 * // メインコンテンツ
 * kt.title("Main");
 * ```
 */
```

**検証:**
```bash
bun run ci
```

**コミットメッセージ:**
```
docs(layout): add JSDoc for kt.sidebar nesting behavior
```

---

### A-2: 設計書にネスト呼び出しセクション追加

**目的:** 詳細なネスト挙動ドキュメントを設計書に追加

**変更ファイル:**
- `docs/impl/sidebar-design.md`

**作業内容:**
設計書の「API設計」セクションの後に以下を追加:

```markdown
## ネスト呼び出しの挙動

### サポートされるパターン

`kt.sidebar()` はネストして呼び出すことができます...
（詳細内容は sidebar-improvements.md を参照）
```

**検証:**
```bash
bun run ci
```

**コミットメッセージ:**
```
docs(sidebar): document nested kt.sidebar() call behavior
```

---

## Phase B: レスポンシブE2Eテスト

**注意:** E2EテストはCIに含まれないため、各イテレーションで `bun run test:e2e` も手動実行を推奨

### B-1: モバイルビューポートテスト追加

**目的:** iPhoneサイズでのサイドバー動作をテスト

**変更ファイル:**
- `e2e/layout.spec.ts`

**作業内容:**
```typescript
test.describe("Layout API - Sidebar (Mobile)", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("sidebar uses fixed positioning on mobile", async ({ page }) => {
    await gotoAndWait(page);
    const sidebar = page.locator(".kt-sidebar");
    await expect(sidebar).toHaveCSS("position", "fixed");
  });

  test("sidebar toggle button is larger on mobile", async ({ page }) => {
    await gotoAndWait(page);
    const toggle = page.locator(".kt-sidebar-toggle");
    const box = await toggle.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(40);
    expect(box?.height).toBeGreaterThanOrEqual(40);
  });
});
```

**検証:**
```bash
bun run ci && bun run test:e2e
```

**コミットメッセージ:**
```
test(e2e): add mobile viewport tests for sidebar
```

---

### B-2: モバイルオーバーレイテスト追加

**目的:** モバイルでのオーバーレイ表示・クリック動作をテスト

**変更ファイル:**
- `e2e/layout.spec.ts`

**作業内容:**
```typescript
// B-1のdescribeブロック内に追加

test("sidebar overlay appears when expanded on mobile", async ({ page }) => {
  await gotoAndWait(page);
  const overlay = page.locator(".kt-sidebar-overlay");
  const sidebar = page.locator(".kt-sidebar");

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
```

**検証:**
```bash
bun run ci && bun run test:e2e
```

**コミットメッセージ:**
```
test(e2e): add mobile overlay interaction tests for sidebar
```

---

### B-3: デスクトップ・タブレット境界値テスト追加

**目的:** デスクトップとタブレット境界値でのレイアウトをテスト

**変更ファイル:**
- `e2e/layout.spec.ts`

**作業内容:**
```typescript
test.describe("Layout API - Sidebar (Tablet 768px)", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test("sidebar uses fixed positioning at exactly 768px", async ({ page }) => {
    await gotoAndWait(page);
    const sidebar = page.locator(".kt-sidebar");
    await expect(sidebar).toHaveCSS("position", "fixed");
  });
});

test.describe("Layout API - Sidebar (Desktop)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

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

**検証:**
```bash
bun run ci && bun run test:e2e
```

**コミットメッセージ:**
```
test(e2e): add tablet and desktop viewport tests for sidebar
```

---

## Phase C: width設定実装

### C-1: RenderContextにsidebarWidth追加

**目的:** サイドバー幅を保持するメソッドをRenderContextに追加

**変更ファイル:**
- `src/kt/context.ts`
- `tests/unit/kt/context.test.ts`

**作業内容:**

```typescript
// src/kt/context.ts に追加

export class RenderContext {
  // ... 既存のプロパティ ...
  private sidebarWidth: string = "280px";

  /**
   * サイドバーの幅を設定
   */
  setSidebarWidth(width: string): void {
    this.sidebarWidth = width;
  }

  /**
   * サイドバーの幅を取得
   */
  getSidebarWidth(): string {
    return this.sidebarWidth;
  }

  /**
   * バッファをクリア（sidebarWidthもリセット）
   */
  clear(): void {
    this.mainBuffer = [];
    this.sidebarBuffer = [];
    this.currentTarget = "main";
    this.flushedCount = 0;
    this.sidebarWidth = "280px";  // 追加
  }
}
```

```typescript
// tests/unit/kt/context.test.ts に追加

describe("RenderContext sidebarWidth", () => {
  let ctx: RenderContext;

  beforeEach(() => {
    ctx = new RenderContext();
  });

  it("should have default sidebar width of 280px", () => {
    expect(ctx.getSidebarWidth()).toBe("280px");
  });

  it("should set custom sidebar width", () => {
    ctx.setSidebarWidth("350px");
    expect(ctx.getSidebarWidth()).toBe("350px");
  });

  it("should reset sidebar width on clear", () => {
    ctx.setSidebarWidth("400px");
    ctx.clear();
    expect(ctx.getSidebarWidth()).toBe("280px");
  });
});
```

**検証:**
```bash
bun run ci
```

**コミットメッセージ:**
```
feat(context): add sidebarWidth getter/setter to RenderContext
```

---

### C-2: sidebar()でconfig.widthを使用

**目的:** `kt.sidebar({ width: "350px" })`が動作するようにする

**変更ファイル:**
- `src/kt/layout.ts`
- `tests/unit/kt/layout.test.ts`

**作業内容:**

```typescript
// src/kt/layout.ts 修正

export function sidebar(content: () => void, config?: SidebarConfig): void {
  const ctx = requireRenderContext();

  // 幅の設定（指定があれば更新）
  if (config?.width) {
    ctx.setSidebarWidth(config.width);
  }

  const previousTarget = ctx.getTarget();
  ctx.setTarget("sidebar");

  try {
    content();
  } finally {
    ctx.setTarget(previousTarget);
  }
}
```

```typescript
// tests/unit/kt/layout.test.ts に追加

describe("kt.sidebar with config", () => {
  let ctx: RenderContext;

  beforeEach(() => {
    ctx = new RenderContext();
    setRenderContext(ctx);
  });

  afterEach(() => {
    setRenderContext(null);
  });

  it("should set custom width via config", () => {
    sidebar(() => {
      // empty
    }, { width: "350px" });

    expect(ctx.getSidebarWidth()).toBe("350px");
  });

  it("should keep default width when not specified", () => {
    sidebar(() => {
      // empty
    });

    expect(ctx.getSidebarWidth()).toBe("280px");
  });

  it("should keep default width when config is empty object", () => {
    sidebar(() => {
      // empty
    }, {});

    expect(ctx.getSidebarWidth()).toBe("280px");
  });
});
```

**検証:**
```bash
bun run ci
```

**コミットメッセージ:**
```
feat(sidebar): implement SidebarConfig.width option
```

---

### C-3: RerunResultにsidebarWidth追加

**目的:** rerun()の戻り値にsidebarWidthを含める

**変更ファイル:**
- `src/runtime/rerun.ts`
- `tests/unit/runtime/rerun.test.ts`

**作業内容:**

```typescript
// src/runtime/rerun.ts 修正

export interface RerunResult {
  mainHtml: string;
  sidebarHtml: string;
  hasSidebar: boolean;
  sidebarWidth: string;  // 追加
}

export function rerun(...): RerunResult {
  // ...

  if (typeof result === "string") {
    return {
      mainHtml: result,
      sidebarHtml: "",
      hasSidebar: false,
      sidebarWidth: "280px",  // 追加
    };
  }

  return {
    mainHtml: renderContext.getMainHtml(),
    sidebarHtml: renderContext.getSidebarHtml(),
    hasSidebar: renderContext.hasSidebar(),
    sidebarWidth: renderContext.getSidebarWidth(),  // 追加
  };
}
```

```typescript
// tests/unit/runtime/rerun.test.ts に追加

it("should return default sidebarWidth", () => {
  const result = rerun(() => {
    write("test");
  });
  expect(result.sidebarWidth).toBe("280px");
});

it("should return custom sidebarWidth when set", () => {
  const result = rerun(() => {
    sidebar(() => {
      write("sidebar");
    }, { width: "400px" });
  });
  expect(result.sidebarWidth).toBe("400px");
});
```

**検証:**
```bash
bun run ci
```

**コミットメッセージ:**
```
feat(rerun): include sidebarWidth in RerunResult
```

---

### C-4: HTML生成でCSS変数を出力 + CSS修正

**目的:** 実際のHTMLにCSS変数を適用し、動的幅を実現

**変更ファイル:**
- `src/app.ts`
- `src/styles/default.ts`

**作業内容:**

```typescript
// src/app.ts 修正（HTML生成部分）

const bodyContent = initialResult.hasSidebar
  ? html`<div class="kt-layout-sidebar" style="--kt-sidebar-width: ${initialResult.sidebarWidth};">
      <aside class="kt-sidebar" data-state="expanded">
        <!-- 既存の内容 -->
      </aside>
      <!-- ... -->
    </div>`
  : /* 既存 */;
```

```css
/* src/styles/default.ts 修正 */

.kt-sidebar {
  width: var(--kt-sidebar-width, 280px);
  min-width: var(--kt-sidebar-width, 280px);
  /* 他は既存のまま */
}

.kt-sidebar[data-state="collapsed"] {
  width: 0;
  min-width: 0;
  /* ... */
}

@media (max-width: 768px) {
  .kt-sidebar[data-state="collapsed"] {
    transform: translateX(-100%);
    width: var(--kt-sidebar-width, 280px);
    min-width: var(--kt-sidebar-width, 280px);
  }
}
```

**検証:**
```bash
bun run ci && bun run test:e2e
```

**コミットメッセージ:**
```
feat(sidebar): apply CSS variable for dynamic width
```

---

## Phase D: サイドバー差分更新

### D-1: toWebSocketPatchesにrootIdパラメータ追加

**目的:** 差分計算のフォールバック先をカスタマイズ可能にする

**変更ファイル:**
- `src/diff/differ.ts`
- `tests/unit/diff/differ.test.ts`

**作業内容:**

```typescript
// src/diff/differ.ts 修正

/**
 * 差分パッチをWebSocketパッチ形式に変換
 * @param diffResult - 差分計算結果
 * @param fullHtml - フォールバック用の完全HTML
 * @param rootId - フォールバック時のターゲットID（指定時はreplaceNodeを使用）
 */
export function toWebSocketPatches(
  diffResult: DiffResult,
  fullHtml: string,
  rootId?: string,
): Patch[] {
  if (!diffResult.hasChanges) {
    return [];
  }

  // フォールバック条件
  const shouldFallback =
    diffResult.patches.length === 0 ||
    diffResult.patches.length > PATCH_THRESHOLD ||
    diffResult.patches.some((p) => p.type === "insert");

  if (shouldFallback) {
    if (rootId) {
      return [{
        type: "replaceNode",
        id: rootId,
        html: fullHtml,
      } satisfies ReplaceNodePatch];
    }
    return [{ type: "replaceRoot", html: fullHtml } satisfies ReplaceRootPatch];
  }

  // 既存のパッチ変換ロジック
  return diffResult.patches.map((p): Patch => {
    // ... 既存のまま
  });
}
```

```typescript
// tests/unit/diff/differ.test.ts に追加

describe("toWebSocketPatches with rootId", () => {
  it("should return replaceNode when rootId specified and fallback triggered", () => {
    const diffResult: DiffResult = {
      patches: [],
      hasChanges: true,
    };

    const patches = toWebSocketPatches(diffResult, "<p>new</p>", "my-root");

    expect(patches).toHaveLength(1);
    expect(patches[0].type).toBe("replaceNode");
    expect((patches[0] as ReplaceNodePatch).id).toBe("my-root");
    expect((patches[0] as ReplaceNodePatch).html).toBe("<p>new</p>");
  });

  it("should return replaceRoot when rootId not specified and fallback triggered", () => {
    const diffResult: DiffResult = {
      patches: [],
      hasChanges: true,
    };

    const patches = toWebSocketPatches(diffResult, "<p>new</p>");

    expect(patches).toHaveLength(1);
    expect(patches[0].type).toBe("replaceRoot");
  });

  it("should apply diff patches normally when rootId specified", () => {
    const diffResult: DiffResult = {
      patches: [{ type: "replace", id: "w-1", html: "<div>new</div>" }],
      hasChanges: true,
    };

    const patches = toWebSocketPatches(diffResult, "<p>full</p>", "my-root");

    expect(patches).toHaveLength(1);
    expect(patches[0].type).toBe("replaceNode");
    expect((patches[0] as ReplaceNodePatch).id).toBe("w-1");
  });
});
```

**検証:**
```bash
bun run ci
```

**コミットメッセージ:**
```
feat(diff): add rootId parameter to toWebSocketPatches
```

---

### D-2: Sessionにlastとsidebarのラッパー追加（型整理）

**目的:** Session型の整理と将来の拡張性確保

**変更ファイル:**
- `src/session/types.ts`
- `tests/unit/session/*.test.ts`（必要に応じて）

**作業内容:**
現在の実装を確認し、型が正しく定義されていることを確認。
既に `lastSidebarHtml` があるので、追加変更が必要な場合のみ実施。

```typescript
// src/session/types.ts 確認・修正

export interface Session {
  id: SessionId;
  state: SessionState;
  createdAt: Date;
  lastAccessedAt: Date;
  lastHtml?: string;
  lastSidebarHtml?: string;
  lastSeq: number;
  patchHistory: PatchHistoryEntry[];
}
```

**検証:**
```bash
bun run ci
```

**コミットメッセージ:**
```
refactor(session): verify session types for sidebar diff support
```

---

### D-3: app.tsでサイドバー差分計算を適用

**目的:** サイドバーにも差分アルゴリズムを適用

**変更ファイル:**
- `src/app.ts`

**作業内容:**

```typescript
// src/app.ts WebSocketイベント処理部分を修正

// メインエリアの差分計算（既存）
let patches: Patch[];
if (session.lastHtml) {
  const diffResult = diff(session.lastHtml, newResult.mainHtml);
  patches = toWebSocketPatches(diffResult, newResult.mainHtml);
} else {
  patches = [{ type: "replaceRoot", html: newResult.mainHtml }];
}

// サイドバーの差分計算（修正）
if (newResult.hasSidebar) {
  const sidebarContentHtml = `<div id="kt-sidebar-content" class="kt-sidebar-content">${newResult.sidebarHtml}</div>`;

  if (session.lastSidebarHtml) {
    const lastSidebarContentHtml = `<div id="kt-sidebar-content" class="kt-sidebar-content">${session.lastSidebarHtml}</div>`;
    const sidebarDiffResult = diff(lastSidebarContentHtml, sidebarContentHtml);
    const sidebarPatches = toWebSocketPatches(
      sidebarDiffResult,
      sidebarContentHtml,
      "kt-sidebar-content"
    );
    patches.push(...sidebarPatches);
  } else {
    // 初回はreplaceNode
    patches.push({
      type: "replaceNode",
      id: "kt-sidebar-content",
      html: sidebarContentHtml,
    });
  }
}

session.lastHtml = newResult.mainHtml;
session.lastSidebarHtml = newResult.sidebarHtml;
```

**検証:**
```bash
bun run ci && bun run test:e2e
```

**コミットメッセージ:**
```
feat(app): apply diff algorithm to sidebar updates
```

---

### D-4: サイドバー差分更新のE2Eテスト追加

**目的:** 差分更新が正しく動作することをE2Eで検証

**変更ファイル:**
- `e2e/layout.spec.ts`

**作業内容:**

```typescript
test.describe("Layout API - Sidebar Diff Updates", () => {
  test("sidebar widget updates without full replacement", async ({ page }) => {
    await gotoAndWait(page);

    const sidebar = page.locator(".kt-sidebar");
    const incrementBtn = page.locator('[data-kt-event="click"]', { hasText: "+ Increment" });

    // 初期状態
    await expect(sidebar).toContainText("Counter: 0");

    // カウンターを更新
    await incrementBtn.click();
    await expect(sidebar).toContainText("Counter: 1");

    // サイドバーの他の要素が維持されていることを確認
    await expect(sidebar).toContainText("Settings");
    await expect(sidebar).toContainText("This is sidebar content");
  });

  test("sidebar maintains scroll position on update", async ({ page }) => {
    await gotoAndWait(page);

    const sidebarContent = page.locator(".kt-sidebar-content");

    // スクロール位置を設定（サイドバーに十分なコンテンツがある場合）
    await sidebarContent.evaluate((el) => {
      el.scrollTop = 50;
    });

    const scrollBefore = await sidebarContent.evaluate((el) => el.scrollTop);

    // 更新をトリガー
    const incrementBtn = page.locator('[data-kt-event="click"]', { hasText: "+ Increment" });
    await incrementBtn.click();

    // スクロール位置が維持されていることを確認
    const scrollAfter = await sidebarContent.evaluate((el) => el.scrollTop);
    expect(scrollAfter).toBe(scrollBefore);
  });
});
```

**検証:**
```bash
bun run ci && bun run test:e2e
```

**コミットメッセージ:**
```
test(e2e): add sidebar diff update verification tests
```

---

## 実行チェックリスト

### Phase A: ドキュメント整備
- [ ] A-1: JSDocコメント追加 → `bun run ci` → commit & push
- [ ] A-2: 設計書にネスト呼び出しセクション追加 → `bun run ci` → commit & push

### Phase B: レスポンシブE2Eテスト
- [ ] B-1: モバイルビューポートテスト → `bun run ci` + `test:e2e` → commit & push
- [ ] B-2: モバイルオーバーレイテスト → `bun run ci` + `test:e2e` → commit & push
- [ ] B-3: デスクトップ・タブレットテスト → `bun run ci` + `test:e2e` → commit & push

### Phase C: width設定実装
- [ ] C-1: RenderContextにsidebarWidth追加 → `bun run ci` → commit & push
- [ ] C-2: sidebar()でconfig.width使用 → `bun run ci` → commit & push
- [ ] C-3: RerunResultにsidebarWidth追加 → `bun run ci` → commit & push
- [ ] C-4: HTML/CSS変数適用 → `bun run ci` + `test:e2e` → commit & push

### Phase D: サイドバー差分更新
- [ ] D-1: toWebSocketPatchesにrootId追加 → `bun run ci` → commit & push
- [ ] D-2: Session型確認 → `bun run ci` → commit & push
- [ ] D-3: app.tsで差分計算適用 → `bun run ci` + `test:e2e` → commit & push
- [ ] D-4: 差分更新E2Eテスト → `bun run ci` + `test:e2e` → commit & push

---

## 注意事項

1. **各イテレーションは独立して動作すること**
   - 途中で中断しても、最後にコミットした状態でアプリが動作する

2. **テストファーストを推奨**
   - 可能な限り、実装前にテストを書く（TDDサイクル）

3. **E2Eテストの手動実行**
   - `bun run ci` にはE2Eが含まれないため、UI変更時は `bun run test:e2e` を別途実行

4. **lint:fixを活用**
   - `bun run lint:fix && bun run ci` でフォーマットエラーを自動修正

5. **コミットメッセージ規約**
   - `feat:` 新機能
   - `fix:` バグ修正
   - `docs:` ドキュメント
   - `test:` テスト追加
   - `refactor:` リファクタリング
