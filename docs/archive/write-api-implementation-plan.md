# kt.write API 拡張 実装計画

## 実装ステータス

> **✅ 実装完了** (2026-01-13)
>
> 全フェーズ（Phase 1〜5）が実装済み。
> 複数引数、Markdown、オブジェクト/配列、null/undefined、kt.text分離が完了。

---

## 概要

設計書 (`docs/design/write-api-enhancement.md`) に基づき、TDDサイクルでイテレーティブに実装を進める。

## 前提条件の確認

### 既存実装の理解

| コンポーネント | ファイル | 役割 |
|--------------|---------|------|
| kt.write | `src/kt/output.ts` | 現在の write 実装 |
| kt.text | `src/kt/output.ts` | 現在は write のエイリアス |
| parseMarkdown | `src/kt/markdown/parser.ts` | Markdown → HTML 変換 |
| sanitizeMarkdownHtml | `src/kt/markdown/sanitizer.ts` | XSS対策 |
| renderJsonTree | `src/kt/output.ts` | オブジェクト/配列の折りたたみ表示 |
| escapeHtml | `src/utils/html.ts` | HTMLエスケープ |

---

## イテレーション計画

### Phase 1: 基盤（シグネチャ変更と型判定）

#### Iteration 1.1: write() シグネチャ変更

**目標**: `write(...args: unknown[])` に変更し、複数引数を受け付ける

**ファイル**:
- `src/kt/output.ts` (更新)
- `tests/unit/kt/output.test.ts` (更新)

**TDDサイクル**:

**Red（テスト作成）**:
```typescript
describe("write - multiple arguments", () => {
  it("should accept multiple arguments", () => {
    write("x =", 42);
    const html = ctx.getHtml();
    expect(html).toContain("x =");
    expect(html).toContain("42");
  });

  it("should accept mixed types", () => {
    write("Name:", "Alice", "Age:", 30);
    const html = ctx.getHtml();
    expect(html).toContain("Name:");
    expect(html).toContain("Alice");
  });
});
```

**Green（実装）**:
- シグネチャを `(...args: unknown[])` に変更
- args をループして処理

**検証コマンド**: `bun run ci`

**コミット**: `feat(kt): allow write() to accept multiple arguments`

---

#### Iteration 1.2: 型判定ロジック - number/boolean

**目標**: number と boolean 型を適切に文字列化

**TDDサイクル**:

**Red（テスト作成）**:
```typescript
describe("write - primitive types", () => {
  it("should render number", () => {
    write(42);
    expect(ctx.getHtml()).toContain("42");
    expect(ctx.getHtml()).toContain('class="kt-write"');
  });

  it("should render boolean true", () => {
    write(true);
    expect(ctx.getHtml()).toContain("true");
  });

  it("should render boolean false", () => {
    write(false);
    expect(ctx.getHtml()).toContain("false");
  });

  it("should escape HTML in number string representation", () => {
    // Numberは安全だが、型システムの一貫性テスト
    write(42);
    expect(ctx.getHtml()).not.toContain("<script>");
  });
});
```

**Green（実装）**:
- `renderArg()` ヘルパー関数作成
- `typeof arg === "number" || typeof arg === "boolean"` 判定追加

**検証コマンド**: `bun run ci`

**コミット**: `feat(kt): add number and boolean rendering to write()`

---

#### Iteration 1.3: 型判定ロジック - null/undefined

**目標**: null と undefined を "None" として表示

**TDDサイクル**:

**Red（テスト作成）**:
```typescript
describe("write - null/undefined", () => {
  it("should render null as None", () => {
    write(null);
    expect(ctx.getHtml()).toContain("None");
    expect(ctx.getHtml()).toContain('class="kt-write kt-none"');
  });

  it("should render undefined as None", () => {
    write(undefined);
    expect(ctx.getHtml()).toContain("None");
    expect(ctx.getHtml()).toContain("kt-none");
  });
});
```

**Green（実装）**:
- `arg === null || arg === undefined` 判定追加
- `<span class="kt-write kt-none">None</span>` 出力

**検証コマンド**: `bun run ci`

**コミット**: `feat(kt): render null/undefined as "None" in write()`

---

### Phase 2: Markdown対応

#### Iteration 2.1: 文字列のMarkdownレンダリング

**目標**: 文字列引数を Markdown としてパース・レンダリング

**ファイル**:
- `src/kt/output.ts` (更新)
- `tests/unit/kt/output.test.ts` (更新)

**TDDサイクル**:

**Red（テスト作成）**:
```typescript
describe("write - markdown", () => {
  it("should render bold text", () => {
    write("Hello **world**!");
    expect(ctx.getHtml()).toContain("<strong>world</strong>");
  });

  it("should render heading", () => {
    write("# Title");
    expect(ctx.getHtml()).toContain("<h1>");
    expect(ctx.getHtml()).toContain("Title");
  });

  it("should render italic text", () => {
    write("This is *italic*");
    expect(ctx.getHtml()).toContain("<em>italic</em>");
  });

  it("should render inline code", () => {
    write("Use `code` here");
    expect(ctx.getHtml()).toContain("<code>code</code>");
  });

  it("should render links", () => {
    write("[Link](https://example.com)");
    expect(ctx.getHtml()).toContain('href="https://example.com"');
  });

  it("should have kt-markdown class", () => {
    write("**bold**");
    expect(ctx.getHtml()).toContain('class="kt-write kt-markdown"');
  });
});
```

**Green（実装）**:
- `parseMarkdown()` を import
- `typeof arg === "string"` で Markdown レンダリング

**検証コマンド**: `bun run ci`

**コミット**: `feat(kt): render strings as Markdown in write()`

---

#### Iteration 2.2: Markdownサニタイズ（XSS防止）

**目標**: Markdown出力のXSS脆弱性を防止

**TDDサイクル**:

**Red（テスト作成）**:
```typescript
describe("write - XSS prevention", () => {
  it("should sanitize script tags in markdown", () => {
    write("<script>alert('xss')</script>");
    expect(ctx.getHtml()).not.toContain("<script>");
  });

  it("should sanitize onclick handlers", () => {
    write('<a onclick="alert(1)">click</a>');
    expect(ctx.getHtml()).not.toContain("onclick");
  });

  it("should sanitize javascript: URLs", () => {
    write('[link](javascript:alert(1))');
    expect(ctx.getHtml()).not.toContain("javascript:");
  });

  it("should allow safe HTML elements", () => {
    write("**bold** and *italic*");
    expect(ctx.getHtml()).toContain("<strong>");
    expect(ctx.getHtml()).toContain("<em>");
  });
});
```

**Green（実装）**:
- `sanitizeMarkdownHtml()` を統合

**検証コマンド**: `bun run ci`

**コミット**: `fix(kt): sanitize markdown HTML output in write()`

---

### Phase 3: オブジェクト/配列対応

#### Iteration 3.1: オブジェクトのJSON表示

**目標**: オブジェクトを `renderJsonTree()` で折りたたみ表示

**TDDサイクル**:

**Red（テスト作成）**:
```typescript
describe("write - object", () => {
  it("should render object as JSON tree", () => {
    write({ name: "Alice", age: 30 });
    expect(ctx.getHtml()).toContain('class="kt-write kt-json"');
    expect(ctx.getHtml()).toContain('"name"');
    expect(ctx.getHtml()).toContain('"Alice"');
  });

  it("should render nested object", () => {
    write({ user: { name: "Bob" } });
    expect(ctx.getHtml()).toContain("user");
    expect(ctx.getHtml()).toContain("Bob");
  });

  it("should escape HTML in object values", () => {
    write({ html: "<script>alert(1)</script>" });
    expect(ctx.getHtml()).not.toContain("<script>alert");
  });
});
```

**Green（実装）**:
- `typeof arg === "object" && arg !== null && !Array.isArray(arg)` 判定
- `renderJsonTree()` を使用

**検証コマンド**: `bun run ci`

**コミット**: `feat(kt): render objects as JSON tree in write()`

---

#### Iteration 3.2: 配列のJSON表示

**目標**: 配列を `renderJsonTree()` で表示

**TDDサイクル**:

**Red（テスト作成）**:
```typescript
describe("write - array", () => {
  it("should render array as JSON tree", () => {
    write([1, 2, 3]);
    expect(ctx.getHtml()).toContain('class="kt-write kt-json"');
    expect(ctx.getHtml()).toContain("1");
    expect(ctx.getHtml()).toContain("2");
  });

  it("should render array of objects", () => {
    write([{ id: 1 }, { id: 2 }]);
    expect(ctx.getHtml()).toContain("id");
  });

  it("should render nested arrays", () => {
    write([[1, 2], [3, 4]]);
    expect(ctx.getHtml()).toContain("kt-json");
  });

  it("should escape HTML in array values", () => {
    write(["<script>alert(1)</script>"]);
    expect(ctx.getHtml()).not.toContain("<script>alert");
  });
});
```

**Green（実装）**:
- `Array.isArray(arg)` 判定
- `renderJsonTree()` を使用

**検証コマンド**: `bun run ci`

**コミット**: `feat(kt): render arrays as JSON tree in write()`

---

### Phase 4: kt.text 分離

#### Iteration 4.1: kt.text の独立実装

**目標**: `text()` を Markdown 非対応の固定幅フォント表示に変更

**TDDサイクル**:

**Red（テスト作成）**:
```typescript
describe("text", () => {
  it("should render plain text without markdown", () => {
    text("**not bold**");
    expect(ctx.getHtml()).toContain("**not bold**");
    expect(ctx.getHtml()).not.toContain("<strong>");
  });

  it("should use monospace font class", () => {
    text("code output");
    expect(ctx.getHtml()).toContain('class="kt-text"');
  });

  it("should use pre element", () => {
    text("line 1\nline 2");
    expect(ctx.getHtml()).toContain("<pre");
  });

  it("should escape HTML", () => {
    text("<script>alert(1)</script>");
    expect(ctx.getHtml()).toContain("&lt;script&gt;");
    expect(ctx.getHtml()).not.toContain("<script>alert");
  });

  it("should preserve whitespace", () => {
    text("  indented");
    expect(ctx.getHtml()).toContain("  indented");
  });
});
```

**Green（実装）**:
```typescript
export function text(content: string): void {
  const ctx = requireRenderContext();
  ctx.append(`<pre class="kt-text">${escapeHtml(content)}</pre>`);
}
```

**検証コマンド**: `bun run ci`

**コミット**: `refactor(kt): separate text() from write() with monospace styling`

---

#### Iteration 4.2: CSS追加

**目標**: `.kt-none` と `.kt-text` のスタイル追加

**ファイル**:
- `src/styles/default.ts` または `src/styles/index.ts` (更新)

**CSS追加内容**:
```css
/* null/undefined 表示 */
.kt-write.kt-none {
  color: var(--kt-color-muted, #6c757d);
  font-style: italic;
}

/* kt.text 用（固定幅フォント） */
.kt-text {
  font-family: var(--kt-font-mono, monospace);
  white-space: pre-wrap;
  word-wrap: break-word;
  background-color: transparent;
  margin: 0;
  padding: 0;
}
```

**検証コマンド**: `bun run ci`

**コミット**: `style: add CSS for kt-none and kt-text classes`

---

### Phase 5: 仕上げ

#### Iteration 5.1: 既存テストの修正

**目標**: 破壊的変更により失敗するテストを修正

**作業内容**:
1. 既存の `write()` テストを確認
2. Markdown レンダリングによる出力変更を反映
3. エッジケースのテスト追加

**検証コマンド**: `bun run ci`

**コミット**: `test(kt): update write() tests for markdown rendering`

---

#### Iteration 5.2: E2Eテスト作成

**目標**: Playwrightによる統合テスト

**ファイル**:
- `e2e/write-text.spec.ts` (新規または既存ファイルに追加)

**テストケース**:
```typescript
test.describe("kt.write", () => {
  test("renders markdown bold text", async ({ page }) => {
    // Markdown bold が正しく表示される
  });

  test("renders multiple arguments", async ({ page }) => {
    // 複数引数が連続して表示される
  });

  test("renders object as collapsible JSON", async ({ page }) => {
    // オブジェクトが折りたたみ可能なJSON形式で表示される
  });

  test("renders null as None", async ({ page }) => {
    // null が "None" と表示される
  });
});

test.describe("kt.text", () => {
  test("renders plain text with monospace font", async ({ page }) => {
    // 固定幅フォントでプレーンテキストが表示される
  });

  test("does not interpret markdown", async ({ page }) => {
    // Markdown記法がそのまま表示される
  });
});
```

**検証コマンド**: `bun run ci`

**コミット**: `test(e2e): add write and text API integration tests`

---

#### Iteration 5.3: ドキュメント更新

**目標**: API互換性ドキュメントの更新

**ファイル**:
- `docs/streamlit-api-comparison.md` (更新)

**更新内容**:
- `kt.write` の対応状況を「✅ 完全対応」に更新
- `kt.text` の対応状況を追加
- 使用例を追加

**検証コマンド**: `bun run ci`

**コミット**: `docs: update streamlit API comparison for write/text`

---

## 実装順序まとめ

| # | Iteration | 主な内容 | コミットメッセージ |
|---|-----------|---------|------------------|
| 1 | 1.1 | 複数引数対応 | `feat(kt): allow write() to accept multiple arguments` |
| 2 | 1.2 | number/boolean対応 | `feat(kt): add number and boolean rendering to write()` |
| 3 | 1.3 | null/undefined対応 | `feat(kt): render null/undefined as "None" in write()` |
| 4 | 2.1 | Markdownレンダリング | `feat(kt): render strings as Markdown in write()` |
| 5 | 2.2 | XSS防止 | `fix(kt): sanitize markdown HTML output in write()` |
| 6 | 3.1 | オブジェクト対応 | `feat(kt): render objects as JSON tree in write()` |
| 7 | 3.2 | 配列対応 | `feat(kt): render arrays as JSON tree in write()` |
| 8 | 4.1 | text()分離 | `refactor(kt): separate text() from write()` |
| 9 | 4.2 | CSS追加 | `style: add CSS for kt-none and kt-text classes` |
| 10 | 5.1 | テスト修正 | `test(kt): update write() tests for markdown rendering` |
| 11 | 5.2 | E2Eテスト | `test(e2e): add write and text API tests` |
| 12 | 5.3 | ドキュメント | `docs: update streamlit API comparison` |

---

## 各イテレーション完了条件

1. `bun run lint:fix` - リントエラーなし
2. `bun run ci` - lint, build, test すべてパス
3. コミット作成

## 完了時チェックリスト

- [x] 全ユニットテストがパス
- [x] E2Eテストがパス
- [x] knip（dead-code検出）パス
- [x] `docs/streamlit-api-comparison.md` 更新
- [x] 設計書のステータスを「実装完了」に更新

---

## 依存関係図

```
Phase 1: 基盤
  ├── 1.1 複数引数 ─────┐
  ├── 1.2 number/boolean ├──→ Phase 2: Markdown
  └── 1.3 null/undefined ─┘        │
                                   ├── 2.1 Markdownレンダリング
                                   └── 2.2 XSS防止
                                          │
                                          ▼
                                   Phase 3: オブジェクト/配列
                                          │
                                   ├── 3.1 オブジェクト
                                   └── 3.2 配列
                                          │
                                          ▼
                                   Phase 4: text分離
                                          │
                                   ├── 4.1 text()実装
                                   └── 4.2 CSS追加
                                          │
                                          ▼
                                   Phase 5: 仕上げ
                                          │
                                   ├── 5.1 テスト修正
                                   ├── 5.2 E2Eテスト
                                   └── 5.3 ドキュメント
```

---

## 参考: Streamlit 互換性チェックリスト

| 機能 | Streamlit | kantan-ui | 対応状況 |
|------|-----------|-----------|---------|
| Markdown文字列 | `st.write("**bold**")` | `kt.write("**bold**")` | Phase 2で対応 |
| 複数引数 | `st.write("x =", 42)` | `kt.write("x =", 42)` | Phase 1で対応 |
| オブジェクト | `st.write({"a": 1})` | `kt.write({a: 1})` | Phase 3で対応 |
| 配列 | `st.write([1,2,3])` | `kt.write([1,2,3])` | Phase 3で対応 |
| None表示 | `st.write(None)` | `kt.write(null)` | Phase 1で対応 |
| プレーンテキスト | `st.text("...")` | `kt.text("...")` | Phase 4で対応 |
