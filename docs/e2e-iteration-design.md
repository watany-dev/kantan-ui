# E2Eテスト イテレーション設計

各イテレーションでCI全通過を保証するための詳細設計。

## CI通過条件

```
lint → dead-code → build → test → e2e → ci-complete
```

各イテレーションで以下を満たすこと:
- Biome lint通過
- Knip dead-code通過
- ビルド成功
- Vitestユニットテスト全通過
- Playwright e2eテスト全通過

---

## フェーズ1: 出力APIテスト

### イテレーション 1.1: 出力APIデモページ作成

**変更ファイル**:
- `src/server-output.ts` (新規)

**内容**:
```typescript
// 出力API専用のデモサーバー（port: 3003）
// kt.write(), kt.title(), kt.header(), kt.subheader(), kt.text(), kt.divider()
```

**CI確認ポイント**:
- dead-code: knip.jsonにエントリポイント追加不要（テスト用）
- lint: Biome形式に準拠

**コミット**: `feat(e2e): add output API demo server`

---

### イテレーション 1.2: Playwright設定更新

**変更ファイル**:
- `playwright.config.ts`

**内容**:
```typescript
// 新規プロジェクト追加
{
  name: "chromium-output",
  use: { baseURL: "http://localhost:3003" },
  testMatch: "**/output-api.spec.ts",
}
// webServer追加
{
  command: "bun run src/server-output.ts",
  url: "http://localhost:3003",
}
```

**CI確認ポイント**:
- e2e: 空のテストファイルがなくても通過

**コミット**: `test(e2e): add playwright config for output API tests`

---

### イテレーション 1.3: 出力API基本テスト

**変更ファイル**:
- `e2e/output-api.spec.ts` (新規)

**内容**:
```typescript
test("kt.write() displays text", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".kt-write")).toContainText("Expected text");
});

test("kt.title() displays h1", async ({ page }) => {
  await expect(page.locator("h1.kt-title")).toBeVisible();
});
```

**テストケース数**: 6（write, title, header, subheader, text, divider）

**コミット**: `test(e2e): add output API basic tests`

---

### イテレーション 1.4: HTMLエスケープテスト

**変更ファイル**:
- `e2e/output-api.spec.ts`

**内容**:
```typescript
test("kt.write() escapes HTML", async ({ page }) => {
  // サーバー側で kt.write("<script>alert('xss')</script>") を出力
  await expect(page.locator(".kt-write")).toContainText("<script>");
  // スクリプトが実行されていないことを確認
});
```

**コミット**: `test(e2e): add HTML escape verification for output API`

---

### イテレーション 1.5: kt.html()テスト

**変更ファイル**:
- `e2e/output-api.spec.ts`

**内容**:
```typescript
test("kt.html() renders raw HTML", async ({ page }) => {
  await expect(page.locator(".custom-class")).toBeVisible();
});
```

**コミット**: `test(e2e): add kt.html() test`

---

## フェーズ1: 差分パッチテスト

### イテレーション 1.6: removeNodeデモページ作成

**変更ファイル**:
- `src/server-output.ts` (更新)

**内容**:
```typescript
// ボタンで要素の表示/非表示を切り替える機能追加
kt.button("Toggle Element", { key: "toggle" });
if (state.showElement) {
  kt.write("This element can be removed");
}
```

**コミット**: `feat(e2e): add toggle element demo for removeNode test`

---

### イテレーション 1.7: removeNodeテスト

**変更ファイル**:
- `e2e/diff-patches.spec.ts` (新規)

**内容**:
```typescript
test("removeNode removes element from DOM", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#removable")).toBeVisible();
  await page.click("#toggle");
  await expect(page.locator("#removable")).not.toBeVisible();
});
```

**コミット**: `test(e2e): add removeNode patch test`

---

## フェーズ1: WebSocket再接続テスト

### イテレーション 1.8: 再接続テスト基盤

**変更ファイル**:
- `e2e/websocket-reconnect.spec.ts` (新規)

**内容**:
```typescript
test("detects WebSocket disconnection", async ({ page }) => {
  await page.goto("/");
  // オフラインモードでWebSocket切断をシミュレート
  await page.context().setOffline(true);
  await expect(page.locator("#kt-connection-status")).toContainText("Disconnected");
});
```

**技術的検証**:
- `page.context().setOffline(true)` でWebSocket切断が検出されるか確認

**コミット**: `test(e2e): add WebSocket disconnection detection test`

---

### イテレーション 1.9: 再接続動作テスト

**変更ファイル**:
- `e2e/websocket-reconnect.spec.ts`

**内容**:
```typescript
test("reconnects after network recovery", async ({ page }) => {
  await page.goto("/");
  await page.context().setOffline(true);
  await page.waitForTimeout(500);
  await page.context().setOffline(false);
  await expect(page.locator("#kt-connection-status")).toContainText("Connected");
});
```

**コミット**: `test(e2e): add WebSocket reconnection test`

---

## フェーズ2: セキュリティテスト

### イテレーション 2.1: XSSエスケープテスト

**変更ファイル**:
- `e2e/security.spec.ts` (新規)

**内容**:
```typescript
test("prevents XSS via kt.write()", async ({ page }) => {
  // サーバー側でユーザー入力をkt.write()に渡すシナリオ
  // <script>タグがエスケープされることを確認
});
```

**コミット**: `test(e2e): add XSS prevention test`

---

### イテレーション 2.2: セッションセキュリティテスト

**変更ファイル**:
- `e2e/security.spec.ts`

**内容**:
```typescript
test("rejects invalid session ID", async ({ page }) => {
  // 不正なセッションIDをCookieに設定
  // サーバーが適切にハンドリングすることを確認
});
```

**コミット**: `test(e2e): add session security test`

---

## フェーズ2: エッジケーステスト

### イテレーション 2.3: 境界値テスト

**変更ファイル**:
- `e2e/edge-cases.spec.ts` (新規)

**内容**:
```typescript
test("slider accepts min value", async ({ page }) => {});
test("slider accepts max value", async ({ page }) => {});
test("text input handles empty string", async ({ page }) => {});
```

**コミット**: `test(e2e): add boundary value tests`

---

### イテレーション 2.4: 高負荷テスト

**変更ファイル**:
- `e2e/edge-cases.spec.ts`

**内容**:
```typescript
test("handles rapid button clicks (50x)", async ({ page }) => {
  for (let i = 0; i < 50; i++) {
    await page.click("#btn_inc");
  }
  await expect(page.locator(".counter")).toContainText("50");
});
```

**コミット**: `test(e2e): add stress test for rapid interactions`

---

## フェーズ2: キーボード操作テスト

### イテレーション 2.5: Tab移動テスト

**変更ファイル**:
- `e2e/keyboard.spec.ts` (新規)

**内容**:
```typescript
test("Tab navigates between widgets", async ({ page }) => {
  await page.keyboard.press("Tab");
  await expect(page.locator("#btn_inc")).toBeFocused();
});
```

**コミット**: `test(e2e): add keyboard navigation tests`

---

### イテレーション 2.6: Enter/矢印キーテスト

**変更ファイル**:
- `e2e/keyboard.spec.ts`

**内容**:
```typescript
test("Enter triggers button", async ({ page }) => {});
test("Arrow keys adjust slider", async ({ page }) => {});
```

**コミット**: `test(e2e): add keyboard interaction tests`

---

## フェーズ2: ウィジェット詳細テスト

### イテレーション 2.7: disabled状態テスト

**変更ファイル**:
- `e2e/widget-details.spec.ts` (新規)

**内容**:
```typescript
test("disabled button cannot be clicked", async ({ page }) => {});
```

**コミット**: `test(e2e): add disabled widget tests`

---

### イテレーション 2.8: 入力制限テスト

**変更ファイル**:
- `e2e/widget-details.spec.ts`

**内容**:
```typescript
test("text input respects maxlength", async ({ page }) => {});
test("slider respects step value", async ({ page }) => {});
```

**コミット**: `test(e2e): add input constraint tests`

---

## フェーズ3: ブラウザ互換性

### イテレーション 3.1: Firefox追加

**変更ファイル**:
- `playwright.config.ts`

**内容**:
```typescript
projects: [
  // 既存のchromiumプロジェクト
  {
    name: "firefox",
    use: { ...devices["Desktop Firefox"] },
  },
]
```

**コミット**: `test(e2e): add Firefox browser support`

---

### イテレーション 3.2: WebKit追加

**変更ファイル**:
- `playwright.config.ts`

**コミット**: `test(e2e): add WebKit browser support`

---

## イテレーション実行手順

各イテレーションで以下を実行:

```bash
# 1. 変更を実装

# 2. ローカルでCI確認
bun run lint:fix && bun run ci

# 3. e2eテスト確認
bun run test:e2e

# 4. コミット
git add -A && git commit -m "コミットメッセージ"

# 5. プッシュ
git push
```

---

## 依存関係グラフ

```
イテレーション 1.1 → 1.2 → 1.3 → 1.4 → 1.5
                           ↓
                         1.6 → 1.7
                           ↓
                         1.8 → 1.9

イテレーション 2.1 → 2.2 (独立)
イテレーション 2.3 → 2.4 (独立)
イテレーション 2.5 → 2.6 (独立)
イテレーション 2.7 → 2.8 (独立)

イテレーション 3.1 → 3.2 (フェーズ1,2完了後)
```

---

## リスクと対策

| リスク | 対策 |
|--------|------|
| WebSocket切断シミュレーションが不安定 | `test.fixme()`でスキップし、後で対応 |
| ブラウザ間で動作が異なる | 特定ブラウザ専用テストを`test.skip()`で分離 |
| CI時間が長くなる | `--shard`オプションで並列化検討 |
| Flaky test発生 | `retries: 2`で対応、根本原因調査 |

---

## 更新履歴

- 2026-01-04: 初版作成
