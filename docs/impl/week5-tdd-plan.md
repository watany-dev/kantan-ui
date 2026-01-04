# Week5 TDDスタイル実装計画

作成日: 2026-01-04

## 概要

Week5の優先度高タスクをTDD（Red→Green→Refactor）サイクルで実装する。
イテレーティブに小さな単位で進め、各イテレーションでCIを通過させる。

---

## CI全通過の条件

```yaml
必須チェック:
  - bun run lint          # Biome linter
  - bun run dead-code     # knip（未使用コード検出）
  - bun run build         # TypeScript build
  - bun run test:coverage # Vitest unit tests
  - bun run test:e2e      # Playwright E2E tests
```

**各イテレーション完了時に `bun run lint:fix && bun run ci` を実行**

---

## 優先度高タスク

| # | タスク | 目標 |
|---|--------|------|
| 1 | E2Eテスト安定化 | text_input/selectbox テストを確実にパスさせる |
| 2 | 多重タブ対応 | 同一セッションの複数タブでUI同期 |

---

# タスク1: E2Eテスト安定化

## 現状分析

```typescript
// e2e/websocket.spec.ts:137-149 - text_input テスト
await textInput.evaluate((el: HTMLInputElement) => {
  el.value = "Alice";
  el.dispatchEvent(new Event("input", { bubbles: true }));
});
// → UIが更新されるか確認

// e2e/websocket.spec.ts:152-164 - selectbox テスト
await select.evaluate((el: HTMLSelectElement) => {
  el.value = "green";
  el.dispatchEvent(new Event("change", { bubbles: true }));
});
```

**問題**: `evaluate()` 内で発火したイベントが event delegation で捕捉されない可能性

## TDDイテレーション

### イテレーション 1.1: 問題の再現と調査テスト作成

**目標**: 問題を確実に再現するテストを作成

#### Red: 失敗するテストを書く

```typescript
// tests/unit/client/event-dispatch.test.ts（新規作成）
import { describe, it, expect } from "vitest";

describe("Event dispatch simulation", () => {
  it("should capture programmatic input event via event delegation", () => {
    // DOMをセットアップ
    document.body.innerHTML = `
      <div id="app">
        <input id="test-input" data-kt-event="input" value="" />
      </div>
    `;

    let captured = false;
    document.getElementById("app")!.addEventListener("input", (e) => {
      const target = e.target as HTMLElement;
      if (target.dataset?.ktEvent === "input") {
        captured = true;
      }
    });

    // プログラムでイベント発火
    const input = document.getElementById("test-input") as HTMLInputElement;
    input.value = "test";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(captured).toBe(true);
  });

  it("should capture programmatic change event via event delegation", () => {
    document.body.innerHTML = `
      <div id="app">
        <select id="test-select" data-kt-event="change">
          <option value="a">A</option>
          <option value="b">B</option>
        </select>
      </div>
    `;

    let captured = false;
    document.getElementById("app")!.addEventListener("change", (e) => {
      const target = e.target as HTMLElement;
      if (target.dataset?.ktEvent === "change") {
        captured = true;
      }
    });

    const select = document.getElementById("test-select") as HTMLSelectElement;
    select.value = "b";
    select.dispatchEvent(new Event("change", { bubbles: true }));

    expect(captured).toBe(true);
  });
});
```

#### Green: テストを通す

1. 上記テストを実行して結果を確認
2. **成功する場合**: 問題は Playwright 固有の環境にある
3. **失敗する場合**: イベントハンドリングのロジックに問題がある

#### Refactor: 調査結果に基づいて修正

**ケースA: テストが成功する場合（Playwright固有の問題）**
→ E2Eテストの書き方を改善

```typescript
// e2e/websocket.spec.ts 修正案
// Playwright の native input メソッドを使用
await textInput.fill("Alice");
await textInput.press("Tab"); // フォーカス外してイベント確定
```

**ケースB: テストが失敗する場合（event delegation の問題）**
→ クライアントスクリプトを修正

```typescript
// src/app.ts 修正案
// isTrusted チェックを削除（もしあれば）
// または composed: true のイベントに対応
```

### イテレーション 1.2: E2Eテストの安定化

**目標**: text_input と selectbox のE2Eテストを確実にパス

#### Red: 現状のE2Eテストを実行

```bash
bun run test:e2e -- --grep "text input\|selectbox"
```

#### Green: テストが通るように修正

**アプローチA: Playwright native メソッドを使用**

```typescript
// e2e/websocket.spec.ts
test("should update text input value", async ({ page }) => {
  await gotoAndWait(page);

  const textInput = page.locator("#name_input");

  // fill() は native input イベントを発火
  await textInput.fill("Alice");

  // UIが更新されるか確認
  await expect(page.locator("#results-card")).toContainText("Hello, Alice!");
});

test("should update selectbox value", async ({ page }) => {
  await gotoAndWait(page);

  const select = page.locator("#color_select");

  // selectOption() は native change イベントを発火
  await select.selectOption("green");

  // UIが更新されるか確認
  await expect(page.locator("#debug-state")).toContainText('"color": "green"');
});
```

**アプローチB: evaluate() のイベントオプションを修正**

```typescript
// より完全なイベントシミュレーション
await textInput.evaluate((el: HTMLInputElement) => {
  el.value = "Alice";
  el.dispatchEvent(new InputEvent("input", {
    bubbles: true,
    cancelable: true,
    composed: true,  // Shadow DOM 境界を越える
    inputType: "insertText",
    data: "Alice",
  }));
});
```

#### Refactor: テストヘルパーの整理

```typescript
// e2e/helpers.ts に追加
export async function fillInput(page: Page, selector: string, value: string) {
  const input = page.locator(selector);
  await input.fill(value);
  // rerun完了を待機
  await page.waitForTimeout(100);
}

export async function selectOption(page: Page, selector: string, value: string) {
  const select = page.locator(selector);
  await select.selectOption(value);
  await page.waitForTimeout(100);
}
```

### イテレーション 1.3: CI確認

```bash
bun run lint:fix && bun run ci
```

**完了条件チェックリスト:**
- [ ] `tests/unit/client/event-dispatch.test.ts` パス
- [ ] `e2e/websocket.spec.ts` 全テストパス
- [ ] `bun run ci` 成功

---

# タスク2: 多重タブ対応

## 現状分析

```typescript
// src/session/manager.ts の現状
private sessionToWs = new Map<SessionId, Set<WSContext>>();

// 既に Set<WSContext> を使用しているが、broadcast 機能がない
// パッチ送信は単一の ws にのみ行われている
```

## TDDイテレーション

### イテレーション 2.1: broadcast メソッドの追加

**目標**: SessionManager に broadcast メソッドを追加

#### Red: 失敗するテストを書く

```typescript
// tests/unit/session/broadcast.test.ts（新規作成）
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SessionManager, resetSessionManager } from "../../../src/session/manager";

describe("SessionManager broadcast", () => {
  let manager: SessionManager;

  beforeEach(() => {
    resetSessionManager();
    manager = new SessionManager();
  });

  afterEach(() => {
    manager.stopCleanupInterval();
  });

  it("should broadcast message to all connections in a session", () => {
    // セッション作成
    const session = manager.createSession();

    // モックWebSocket作成
    const ws1 = { send: vi.fn(), readyState: 1 } as unknown as WSContext;
    const ws2 = { send: vi.fn(), readyState: 1 } as unknown as WSContext;

    // 接続を追加
    manager.associateWebSocket(ws1, session.id);
    manager.associateWebSocket(ws2, session.id);

    // メッセージをブロードキャスト
    const message = { type: "patch", patches: [] };
    manager.broadcast(session.id, message);

    // 両方のWebSocketに送信されることを確認
    expect(ws1.send).toHaveBeenCalledWith(JSON.stringify(message));
    expect(ws2.send).toHaveBeenCalledWith(JSON.stringify(message));
  });

  it("should handle send errors gracefully", () => {
    const session = manager.createSession();

    // エラーを投げるWebSocket
    const ws1 = {
      send: vi.fn().mockImplementation(() => { throw new Error("Connection closed"); }),
      readyState: 1,
    } as unknown as WSContext;
    const ws2 = { send: vi.fn(), readyState: 1 } as unknown as WSContext;

    manager.associateWebSocket(ws1, session.id);
    manager.associateWebSocket(ws2, session.id);

    const message = { type: "patch", patches: [] };

    // エラーが伝播しないこと
    expect(() => manager.broadcast(session.id, message)).not.toThrow();

    // ws2 には送信されること
    expect(ws2.send).toHaveBeenCalledWith(JSON.stringify(message));
  });

  it("should not throw when session does not exist", () => {
    const message = { type: "patch", patches: [] };
    expect(() => manager.broadcast("non-existent-id", message)).not.toThrow();
  });

  it("should get connection count for a session", () => {
    const session = manager.createSession();

    expect(manager.getConnectionCount(session.id)).toBe(0);

    const ws1 = { send: vi.fn() } as unknown as WSContext;
    const ws2 = { send: vi.fn() } as unknown as WSContext;

    manager.associateWebSocket(ws1, session.id);
    expect(manager.getConnectionCount(session.id)).toBe(1);

    manager.associateWebSocket(ws2, session.id);
    expect(manager.getConnectionCount(session.id)).toBe(2);
  });
});
```

#### Green: 最小限の実装

```typescript
// src/session/manager.ts に追加

/**
 * セッションの全接続にメッセージをブロードキャスト
 */
broadcast(sessionId: SessionId, message: unknown): void {
  const connections = this.sessionToWs.get(sessionId);
  if (!connections) return;

  const json = JSON.stringify(message);
  for (const ws of connections) {
    try {
      ws.send(json);
    } catch (e) {
      // 送信エラーは無視（接続切断時など）
      console.warn(`Failed to send to WebSocket: ${e}`);
    }
  }
}

/**
 * セッションの接続数を取得
 */
getConnectionCount(sessionId: SessionId): number {
  return this.sessionToWs.get(sessionId)?.size ?? 0;
}
```

#### Refactor: コードの整理

- 不要なコメントの削除
- エラーハンドリングの改善

### イテレーション 2.2: app.ts での broadcast 使用

**目標**: パッチ送信を broadcast に変更

#### Red: 失敗するE2Eテストを書く

```typescript
// e2e/multi-tab.spec.ts（新規作成）
import { test, expect, type BrowserContext } from "@playwright/test";

test.describe("Multi-tab synchronization", () => {
  // browser-scope セッションを使用
  test.use({ baseURL: "http://localhost:3001" });

  test("should sync counter across tabs", async ({ context }) => {
    // 2つのタブを開く
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await page1.goto("/");
    await page2.goto("/");

    // 初期レンダリングを待機
    await page1.waitForSelector("#btn_inc");
    await page2.waitForSelector("#btn_inc");

    // 初期カウントを確認
    await expect(page1.locator(".kt-write").filter({ hasText: "Current count:" }))
      .toContainText("Current count: 0");
    await expect(page2.locator(".kt-write").filter({ hasText: "Current count:" }))
      .toContainText("Current count: 0");

    // page1 でインクリメント
    await page1.click("#btn_inc");

    // page1 が更新されること
    await expect(page1.locator(".kt-write").filter({ hasText: "Current count:" }))
      .toContainText("Current count: 1");

    // page2 も同期されること（ブロードキャスト）
    await expect(page2.locator(".kt-write").filter({ hasText: "Current count:" }))
      .toContainText("Current count: 1");
  });
});
```

#### Green: app.ts を修正

```typescript
// src/app.ts のパッチ送信部分を修正

// Before: 単一のWebSocketに送信
// ws.send(JSON.stringify({ type: "patch", patches }));

// After: 全接続にブロードキャスト
sessionManager.broadcast(session.id, {
  type: "patch",
  patches,
  partial: false,
});
```

#### Refactor: 共通化

パッチ送信のロジックを関数として抽出

```typescript
function sendPatches(
  sessionManager: SessionManager,
  sessionId: SessionId,
  patches: Patch[],
  partial = false
): void {
  sessionManager.broadcast(sessionId, {
    type: "patch",
    patches,
    partial,
  });
}
```

### イテレーション 2.3: ストリーミング時のbroadcast対応

**目標**: ストリーミング中もbroadcastを使用

#### Red: ストリーミング + マルチタブのテスト

```typescript
// e2e/multi-tab-streaming.spec.ts
test("should stream to all tabs", async ({ context }) => {
  // streaming server (port 3002) を使用
  test.use({ baseURL: "http://localhost:3002" });

  const page1 = await context.newPage();
  const page2 = await context.newPage();

  await page1.goto("/");
  await page2.goto("/");

  // ストリーミング完了後、両タブで同じ内容が表示される
  await expect(page1.locator("#app")).toContainText("Item 5");
  await expect(page2.locator("#app")).toContainText("Item 5");
});
```

#### Green: streamAppend でも broadcast を使用

```typescript
// src/app.ts - ストリーミングパッチ送信
if (config.streaming.enabled) {
  renderContext.setFlushCallback((html) => {
    // 単一WSではなくbroadcast
    sessionManager.broadcast(session.id, {
      type: "patch",
      patches: [{ type: "streamAppend", html }],
      partial: true,
    });
  }, config.streaming.flushThreshold);
}
```

### イテレーション 2.4: CI確認

```bash
bun run lint:fix && bun run ci
```

**完了条件チェックリスト:**
- [ ] `tests/unit/session/broadcast.test.ts` パス
- [ ] `e2e/multi-tab.spec.ts` パス
- [ ] 既存のE2Eテストがすべてパス
- [ ] `bun run ci` 成功

---

## 実装順序サマリ

```
イテレーション 1.1: イベント捕捉の調査テスト
    ├── tests/unit/client/event-dispatch.test.ts 作成
    └── 問題の切り分け

イテレーション 1.2: E2Eテスト修正
    ├── e2e/websocket.spec.ts 修正（fill/selectOption使用）
    └── e2e/helpers.ts 拡張

イテレーション 1.3: CI確認（タスク1完了）
    └── bun run lint:fix && bun run ci

---

イテレーション 2.1: broadcast メソッド追加
    ├── tests/unit/session/broadcast.test.ts 作成
    ├── src/session/manager.ts に broadcast 追加
    └── getConnectionCount 追加

イテレーション 2.2: app.ts でbroadcast使用
    ├── e2e/multi-tab.spec.ts 作成
    └── src/app.ts パッチ送信を broadcast に変更

イテレーション 2.3: ストリーミング対応
    └── streamAppend でも broadcast 使用

イテレーション 2.4: CI確認（タスク2完了）
    └── bun run lint:fix && bun run ci
```

---

## 各イテレーションの完了条件

| イテレーション | テストファイル | CI条件 |
|--------------|---------------|--------|
| 1.1 | tests/unit/client/event-dispatch.test.ts | テストパス |
| 1.2 | e2e/websocket.spec.ts | 全テストパス |
| 1.3 | - | `bun run ci` 成功 |
| 2.1 | tests/unit/session/broadcast.test.ts | テストパス |
| 2.2 | e2e/multi-tab.spec.ts | テストパス |
| 2.3 | e2e/multi-tab-streaming.spec.ts | テストパス |
| 2.4 | - | `bun run ci` 成功 |

---

## リスク対策

### E2Eテスト問題が解決できない場合

1. **代替アプローチ**: `page.keyboard.type()` を使用
2. **テストスキップ**: 一時的にスキップして issue 登録
3. **手動テストカバレッジ**: 手動テスト手順書を作成

### broadcast による競合

1. **楽観的ロック**: 最後の状態が勝つ（現状維持）
2. **将来対応**: シーケンス番号でコンフリクト検出

---

## コミット戦略

各イテレーション完了時にコミット:

```bash
# イテレーション 1.1
git commit -m "test: add event dispatch simulation tests"

# イテレーション 1.2
git commit -m "fix(e2e): use Playwright native input methods for stability"

# イテレーション 1.3
git commit -m "chore: verify CI passes after E2E fixes"

# イテレーション 2.1
git commit -m "feat(session): add broadcast method to SessionManager"

# イテレーション 2.2
git commit -m "feat(app): use broadcast for patch delivery"

# イテレーション 2.3
git commit -m "feat(streaming): broadcast stream patches to all connections"

# イテレーション 2.4
git commit -m "chore: verify CI passes after multi-tab support"
```

---

*対象バージョン: kantan-ui v0.0.4*
