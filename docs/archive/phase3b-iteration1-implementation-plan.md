# Phase 3-B イテレーション1 実装計画

作成日: 2025-01-06

## 概要

`phase3b-iteration1-design.md` に基づき、TDDサイクルで段階的に実装する。
各サブイテレーションは**CI全通過**を通過条件とし、**コミット**を行う。

---

## 通過条件（全サブイテレーション共通）

```bash
bun run lint:fix && bun run ci
```

以下がすべて成功すること：
- `bun run lint` - Biome lint チェック
- `bun run build` - TypeScript ビルド
- `bun run test:coverage` - Vitest テスト + カバレッジ

---

## サブイテレーション一覧

| # | 内容 | 成果物 | 工数目安 |
|---|------|--------|----------|
| 1-1 | kt.json() 実装 | 折りたたみJSONビューア | 小 |
| 1-2 | kt.code() 基本実装 | コードブロック（ハイライトなし） | 小 |
| 1-3 | kt.code() 構文ハイライト | 言語別ハイライトルール | 中 |
| 1-4 | Markdownサニタイザー | HTMLホワイトリストフィルタ | 中 |
| 1-5 | Markdownパーサー（基本） | 見出し、太字、斜体、コード | 中 |
| 1-6 | Markdownパーサー（拡張） | リスト、引用、リンク、画像 | 中 |
| 1-7 | kt.markdown() 統合 | API統合 + セキュリティテスト | 小 |
| 1-8 | CSS統合 & 最終確認 | スタイル追加 + 全体テスト | 小 |

---

## サブイテレーション 1-1: kt.json() 実装

### 目標
折りたたみ可能なJSONビューアを実装する。

### TDDステップ

#### Red: テスト作成
```typescript
// tests/unit/kt/output.test.ts に追加

describe("json", () => {
  it("should render null", () => {
    json(null);
    expect(ctx.getHtml()).toContain("kt-json-null");
    expect(ctx.getHtml()).toContain("null");
  });

  it("should render boolean", () => {
    json(true);
    expect(ctx.getHtml()).toContain("kt-json-boolean");
  });

  it("should render number", () => {
    json(42);
    expect(ctx.getHtml()).toContain("kt-json-number");
  });

  it("should render string with quotes", () => {
    json("hello");
    expect(ctx.getHtml()).toContain('"hello"');
  });

  it("should escape HTML in string values", () => {
    json("<script>xss</script>");
    expect(ctx.getHtml()).toContain("&lt;script&gt;");
  });

  it("should render empty array", () => {
    json([]);
    expect(ctx.getHtml()).toContain("[]");
  });

  it("should render empty object", () => {
    json({});
    expect(ctx.getHtml()).toContain("{}");
  });

  it("should render array with details/summary", () => {
    json([1, 2, 3]);
    expect(ctx.getHtml()).toContain("<details");
    expect(ctx.getHtml()).toContain("<summary>");
    expect(ctx.getHtml()).toContain("[3]");
  });

  it("should render object with details/summary", () => {
    json({ a: 1, b: 2 });
    expect(ctx.getHtml()).toContain("<details");
    expect(ctx.getHtml()).toContain("{2}");
  });

  it("should expand to depth 1 by default", () => {
    json({ a: { b: 1 } });
    const html = ctx.getHtml();
    // depth 0 は展開（open属性あり）
    expect(html).toMatch(/<details[^>]*open/);
  });

  it("should respect expanded option", () => {
    json({ a: { b: { c: 1 } } }, { expanded: 2 });
    // expanded: 2 なので depth 0, 1 は展開
  });
});
```

#### Green: 実装
```typescript
// src/kt/output.ts に追加

export interface JsonConfig {
  expanded?: number;
}

export function json(data: unknown, config?: JsonConfig): void {
  const ctx = requireRenderContext();
  const expandedDepth = config?.expanded ?? 1;
  const jsonHtml = renderJsonTree(data, 0, expandedDepth);
  ctx.append(`<div class="kt-json">${jsonHtml}</div>`);
}

function renderJsonTree(data: unknown, depth: number, expandedDepth: number): string {
  // 実装...
}
```

#### Refactor
- 重複コードの整理
- 型の明確化

### ファイル変更
- `src/kt/output.ts` - json() 追加
- `src/kt/index.ts` - エクスポート追加
- `tests/unit/kt/output.test.ts` - テスト追加

### コミットメッセージ
```
feat(kt): add json() API for collapsible JSON viewer

- Implement renderJsonTree with details/summary for folding
- Support expanded depth configuration
- XSS protection via escapeHtml
```

---

## サブイテレーション 1-2: kt.code() 基本実装

### 目標
コードブロック表示（構文ハイライトなし）を実装する。

### TDDステップ

#### Red: テスト作成
```typescript
describe("code", () => {
  it("should render code block with kt-code class", () => {
    code("const x = 1;");
    expect(ctx.getHtml()).toContain('class="kt-code"');
    expect(ctx.getHtml()).toContain("<pre>");
    expect(ctx.getHtml()).toContain("<code");
  });

  it("should escape HTML in code content", () => {
    code("<script>alert('xss')</script>");
    expect(ctx.getHtml()).toContain("&lt;script&gt;");
    expect(ctx.getHtml()).not.toContain("<script>");
  });

  it("should set data-language attribute", () => {
    code("x = 1", "python");
    expect(ctx.getHtml()).toContain('data-language="python"');
  });

  it("should render without language", () => {
    code("plain text");
    expect(ctx.getHtml()).toContain('data-language=""');
  });

  it("should add wrap class when wrap_lines is true", () => {
    code("text", undefined, { wrap_lines: true });
    expect(ctx.getHtml()).toContain("kt-code-wrap");
  });

  it("should render line numbers when enabled", () => {
    code("line1\nline2\nline3", undefined, { line_numbers: true });
    expect(ctx.getHtml()).toContain("kt-code-line-numbers");
    expect(ctx.getHtml()).toContain("1");
    expect(ctx.getHtml()).toContain("2");
    expect(ctx.getHtml()).toContain("3");
  });
});
```

#### Green: 実装
```typescript
export interface CodeConfig {
  line_numbers?: boolean;
  wrap_lines?: boolean;
}

export function code(body: string, language?: string, config?: CodeConfig): void {
  const ctx = requireRenderContext();
  const escapedCode = escapeHtml(body);
  // 実装...
}
```

### ファイル変更
- `src/kt/output.ts` - code() 追加
- `src/kt/index.ts` - エクスポート追加
- `tests/unit/kt/output.test.ts` - テスト追加

### コミットメッセージ
```
feat(kt): add code() API for code block display

- Basic code block rendering with pre/code tags
- Line numbers support
- wrap_lines option
- XSS protection via escapeHtml
```

---

## サブイテレーション 1-3: kt.code() 構文ハイライト

### 目標
言語別の構文ハイライトを追加する。

### TDDステップ

#### Red: テスト作成
```typescript
// tests/unit/kt/code/highlighter.test.ts

describe("highlighter", () => {
  describe("typescript/javascript", () => {
    it("should highlight keywords", () => {
      const result = applyHighlight("const x = 1;", "typescript");
      expect(result).toContain('class="kt-code-keyword"');
      expect(result).toContain("const");
    });

    it("should highlight strings", () => {
      const result = applyHighlight('"hello"', "typescript");
      expect(result).toContain('class="kt-code-string"');
    });

    it("should highlight comments", () => {
      const result = applyHighlight("// comment", "typescript");
      expect(result).toContain('class="kt-code-comment"');
    });

    it("should highlight numbers", () => {
      const result = applyHighlight("42", "typescript");
      expect(result).toContain('class="kt-code-number"');
    });
  });

  describe("python", () => {
    it("should highlight python keywords", () => {
      const result = applyHighlight("def foo():", "python");
      expect(result).toContain('class="kt-code-keyword"');
    });
  });

  describe("unknown language", () => {
    it("should return unmodified code for unknown language", () => {
      const result = applyHighlight("code", "unknown");
      expect(result).toBe("code");
    });
  });
});
```

#### Green: 実装
```typescript
// src/kt/code/highlighter.ts
// src/kt/code/languages.ts
```

### ファイル変更
- `src/kt/code/highlighter.ts` - 新規作成
- `src/kt/code/languages.ts` - 新規作成
- `src/kt/code/index.ts` - 新規作成
- `src/kt/output.ts` - ハイライト統合
- `tests/unit/kt/code/highlighter.test.ts` - 新規作成

### コミットメッセージ
```
feat(kt): add syntax highlighting for code()

- Support typescript, javascript, python, json, html, css, bash, sql
- CSS class-based highlighting (keyword, string, comment, number)
- Graceful fallback for unknown languages
```

---

## サブイテレーション 1-4: Markdownサニタイザー

### 目標
HTMLホワイトリストベースのサニタイザーを実装する。

### TDDステップ

#### Red: テスト作成
```typescript
// tests/unit/kt/markdown/sanitizer.test.ts

describe("sanitizeMarkdownHtml", () => {
  describe("allowed tags", () => {
    it("should allow h1-h6 tags", () => {
      expect(sanitizeMarkdownHtml("<h1>Title</h1>")).toBe("<h1>Title</h1>");
    });

    it("should allow p, br, hr tags", () => {
      expect(sanitizeMarkdownHtml("<p>text</p>")).toBe("<p>text</p>");
    });

    it("should allow formatting tags", () => {
      expect(sanitizeMarkdownHtml("<strong>bold</strong>")).toBe("<strong>bold</strong>");
      expect(sanitizeMarkdownHtml("<em>italic</em>")).toBe("<em>italic</em>");
    });

    it("should allow code and pre tags", () => {
      expect(sanitizeMarkdownHtml("<code>code</code>")).toBe("<code>code</code>");
    });

    it("should allow list tags", () => {
      expect(sanitizeMarkdownHtml("<ul><li>item</li></ul>")).toContain("<ul>");
    });

    it("should allow a tags with safe href", () => {
      expect(sanitizeMarkdownHtml('<a href="https://example.com">link</a>')).toContain("href=");
    });

    it("should allow img tags with safe src", () => {
      expect(sanitizeMarkdownHtml('<img src="image.png" alt="alt">')).toContain("src=");
    });
  });

  describe("blocked content", () => {
    it("should remove script tags", () => {
      expect(sanitizeMarkdownHtml("<script>alert(1)</script>")).not.toContain("<script");
    });

    it("should remove onclick handlers", () => {
      expect(sanitizeMarkdownHtml('<div onclick="alert(1)">text</div>')).not.toContain("onclick");
    });

    it("should block javascript: URLs", () => {
      expect(sanitizeMarkdownHtml('<a href="javascript:alert(1)">click</a>')).not.toContain("javascript:");
    });

    it("should remove iframe tags", () => {
      expect(sanitizeMarkdownHtml('<iframe src="evil.html"></iframe>')).not.toContain("<iframe");
    });

    it("should remove style tags", () => {
      expect(sanitizeMarkdownHtml("<style>body{}</style>")).not.toContain("<style");
    });
  });
});
```

#### Green: 実装
```typescript
// src/kt/markdown/sanitizer.ts

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'strong', 'em', 'code', 'pre',
  'ul', 'ol', 'li',
  'blockquote',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

export function sanitizeMarkdownHtml(html: string): string {
  // 実装...
}
```

### ファイル変更
- `src/kt/markdown/sanitizer.ts` - 新規作成
- `src/kt/markdown/index.ts` - 新規作成
- `tests/unit/kt/markdown/sanitizer.test.ts` - 新規作成

### コミットメッセージ
```
feat(kt): add HTML sanitizer for markdown

- Whitelist-based tag filtering
- Block javascript: URLs
- Remove event handlers
- Secure by default
```

---

## サブイテレーション 1-5: Markdownパーサー（基本）

### 目標
見出し、太字、斜体、インラインコード、水平線を実装する。

### TDDステップ

#### Red: テスト作成
```typescript
// tests/unit/kt/markdown/parser.test.ts

describe("parseMarkdown", () => {
  describe("headings", () => {
    it("should parse h1", () => {
      expect(parseMarkdown("# Title")).toBe("<h1>Title</h1>");
    });

    it("should parse h2", () => {
      expect(parseMarkdown("## Title")).toBe("<h2>Title</h2>");
    });

    it("should parse h3-h6", () => {
      expect(parseMarkdown("### Title")).toBe("<h3>Title</h3>");
      expect(parseMarkdown("#### Title")).toBe("<h4>Title</h4>");
      expect(parseMarkdown("##### Title")).toBe("<h5>Title</h5>");
      expect(parseMarkdown("###### Title")).toBe("<h6>Title</h6>");
    });
  });

  describe("inline formatting", () => {
    it("should parse bold with **", () => {
      expect(parseMarkdown("**bold**")).toContain("<strong>bold</strong>");
    });

    it("should parse italic with *", () => {
      expect(parseMarkdown("*italic*")).toContain("<em>italic</em>");
    });

    it("should parse inline code", () => {
      expect(parseMarkdown("`code`")).toContain("<code>code</code>");
    });
  });

  describe("horizontal rule", () => {
    it("should parse ---", () => {
      expect(parseMarkdown("---")).toBe("<hr>");
    });

    it("should parse ***", () => {
      expect(parseMarkdown("***")).toBe("<hr>");
    });
  });

  describe("paragraphs", () => {
    it("should wrap text in p tags", () => {
      expect(parseMarkdown("Hello world")).toContain("<p>Hello world</p>");
    });

    it("should handle multiple paragraphs", () => {
      const result = parseMarkdown("Para 1\n\nPara 2");
      expect(result).toContain("<p>Para 1</p>");
      expect(result).toContain("<p>Para 2</p>");
    });
  });
});
```

### ファイル変更
- `src/kt/markdown/parser.ts` - 新規作成
- `tests/unit/kt/markdown/parser.test.ts` - 新規作成

### コミットメッセージ
```
feat(kt): add basic markdown parser

- Headings (h1-h6)
- Bold (**text**)
- Italic (*text*)
- Inline code (`code`)
- Horizontal rule (---, ***)
- Paragraph wrapping
```

---

## サブイテレーション 1-6: Markdownパーサー（拡張）

### 目標
リスト、引用、リンク、画像、コードブロックを実装する。

### TDDステップ

#### Red: テスト作成
```typescript
describe("parseMarkdown - extended", () => {
  describe("links", () => {
    it("should parse links", () => {
      expect(parseMarkdown("[text](https://example.com)"))
        .toContain('<a href="https://example.com">text</a>');
    });
  });

  describe("images", () => {
    it("should parse images", () => {
      expect(parseMarkdown("![alt](image.png)"))
        .toContain('<img src="image.png" alt="alt">');
    });
  });

  describe("unordered lists", () => {
    it("should parse unordered list", () => {
      const result = parseMarkdown("- item1\n- item2");
      expect(result).toContain("<ul>");
      expect(result).toContain("<li>item1</li>");
      expect(result).toContain("<li>item2</li>");
    });
  });

  describe("ordered lists", () => {
    it("should parse ordered list", () => {
      const result = parseMarkdown("1. first\n2. second");
      expect(result).toContain("<ol>");
      expect(result).toContain("<li>first</li>");
    });
  });

  describe("blockquote", () => {
    it("should parse blockquote", () => {
      expect(parseMarkdown("> quote")).toContain("<blockquote>quote</blockquote>");
    });
  });

  describe("code blocks", () => {
    it("should parse fenced code block", () => {
      const md = "```typescript\nconst x = 1;\n```";
      const result = parseMarkdown(md);
      expect(result).toContain("<pre>");
      expect(result).toContain("<code");
      expect(result).toContain("const x = 1;");
    });
  });
});
```

### ファイル変更
- `src/kt/markdown/parser.ts` - 拡張
- `tests/unit/kt/markdown/parser.test.ts` - テスト追加

### コミットメッセージ
```
feat(kt): extend markdown parser with lists, links, and code blocks

- Links [text](url)
- Images ![alt](src)
- Unordered lists (- item)
- Ordered lists (1. item)
- Blockquotes (> quote)
- Fenced code blocks (```)
```

---

## サブイテレーション 1-7: kt.markdown() 統合

### 目標
パーサーとサニタイザーを統合してkt.markdown() APIを完成させる。

### TDDステップ

#### Red: テスト作成
```typescript
// tests/unit/kt/output.test.ts に追加

describe("markdown", () => {
  it("should render markdown with kt-markdown class", () => {
    markdown("# Hello");
    expect(ctx.getHtml()).toContain('class="kt-markdown"');
    expect(ctx.getHtml()).toContain("<h1>Hello</h1>");
  });

  it("should sanitize by default", () => {
    markdown("<script>alert('xss')</script>");
    expect(ctx.getHtml()).not.toContain("<script>");
  });

  it("should block javascript: URLs", () => {
    markdown("[click](javascript:alert('xss'))");
    expect(ctx.getHtml()).not.toContain("javascript:");
  });

  it("should allow HTML when unsafe_allow_html is true", () => {
    markdown("<div class='custom'>text</div>", { unsafe_allow_html: true });
    expect(ctx.getHtml()).toContain("<div");
  });

  it("should render complex markdown", () => {
    const md = `
# Title

This is **bold** and *italic*.

- Item 1
- Item 2

[Link](https://example.com)
    `.trim();
    markdown(md);
    const html = ctx.getHtml();
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<a href=");
  });
});
```

### ファイル変更
- `src/kt/output.ts` - markdown() 追加
- `src/kt/index.ts` - エクスポート追加
- `tests/unit/kt/output.test.ts` - テスト追加

### コミットメッセージ
```
feat(kt): add markdown() API

- Integrate parser and sanitizer
- unsafe_allow_html option for raw HTML
- XSS protection by default
```

---

## サブイテレーション 1-8: CSS統合 & 最終確認

### 目標
スタイルを追加し、全体の動作を確認する。

### タスク

1. **CSSスタイル追加**
   - `.kt-json` スタイル
   - `.kt-code` スタイル
   - `.kt-markdown` スタイル

2. **統合テスト**
   - 全APIの動作確認
   - エッジケーステスト

3. **ドキュメント更新**
   - README または TUTORIAL に使用例追加

### ファイル変更
- `src/templates/base.html` - CSSスタイル追加
- `docs/TUTORIAL.md` - 使用例追加（任意）

### コミットメッセージ
```
feat(kt): add CSS styles for json, code, markdown APIs

- Dark theme for code blocks and JSON viewer
- Syntax highlighting colors
- Collapsible JSON tree styles
- Markdown typography styles
```

---

## 実装フロー図

```
┌─────────────────────────────────────────────────────────────────┐
│                    Phase 3-B Iteration 1                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1-1: kt.json()          1-2: kt.code()        1-4: Sanitizer   │
│       │                       │                      │          │
│       ▼                       ▼                      ▼          │
│  ┌─────────┐            ┌─────────┐            ┌─────────┐     │
│  │  Test   │            │  Test   │            │  Test   │     │
│  │  Impl   │            │  Impl   │            │  Impl   │     │
│  │  CI ✓   │            │  CI ✓   │            │  CI ✓   │     │
│  │ Commit  │            │ Commit  │            │ Commit  │     │
│  └─────────┘            └────┬────┘            └────┬────┘     │
│                              │                      │          │
│                              ▼                      │          │
│                        ┌─────────┐                  │          │
│                        │  1-3:   │                  │          │
│                        │Highlight│                  │          │
│                        │  CI ✓   │                  │          │
│                        │ Commit  │                  │          │
│                        └─────────┘                  │          │
│                                                     │          │
│                              ┌──────────────────────┘          │
│                              ▼                                 │
│                        ┌─────────┐     ┌─────────┐             │
│                        │  1-5:   │────▶│  1-6:   │             │
│                        │ Parser  │     │ Parser  │             │
│                        │ (basic) │     │(extend) │             │
│                        │  CI ✓   │     │  CI ✓   │             │
│                        └─────────┘     └────┬────┘             │
│                                             │                  │
│                                             ▼                  │
│                                       ┌─────────┐              │
│                                       │  1-7:   │              │
│                                       │markdown │              │
│                                       │  CI ✓   │              │
│                                       │ Commit  │              │
│                                       └────┬────┘              │
│                                            │                   │
│                                            ▼                   │
│                                      ┌──────────┐              │
│                                      │   1-8:   │              │
│                                      │   CSS    │              │
│                                      │  Final   │              │
│                                      │  CI ✓    │              │
│                                      └──────────┘              │
│                                            │                   │
│                                            ▼                   │
│                                    ✅ Iteration 1 Complete     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## チェックリスト

### サブイテレーション 1-1: kt.json()
- [ ] テスト作成 (`tests/unit/kt/output.test.ts`)
- [ ] 実装 (`src/kt/output.ts`)
- [ ] エクスポート追加 (`src/kt/index.ts`)
- [ ] `bun run lint:fix && bun run ci` 通過
- [ ] コミット

### サブイテレーション 1-2: kt.code() 基本
- [ ] テスト作成
- [ ] 実装
- [ ] `bun run lint:fix && bun run ci` 通過
- [ ] コミット

### サブイテレーション 1-3: 構文ハイライト
- [ ] テスト作成 (`tests/unit/kt/code/highlighter.test.ts`)
- [ ] 実装 (`src/kt/code/`)
- [ ] 統合
- [ ] `bun run lint:fix && bun run ci` 通過
- [ ] コミット

### サブイテレーション 1-4: サニタイザー
- [ ] テスト作成 (`tests/unit/kt/markdown/sanitizer.test.ts`)
- [ ] 実装 (`src/kt/markdown/sanitizer.ts`)
- [ ] `bun run lint:fix && bun run ci` 通過
- [ ] コミット

### サブイテレーション 1-5: パーサー（基本）
- [ ] テスト作成 (`tests/unit/kt/markdown/parser.test.ts`)
- [ ] 実装 (`src/kt/markdown/parser.ts`)
- [ ] `bun run lint:fix && bun run ci` 通過
- [ ] コミット

### サブイテレーション 1-6: パーサー（拡張）
- [ ] テスト追加
- [ ] 実装拡張
- [ ] `bun run lint:fix && bun run ci` 通過
- [ ] コミット

### サブイテレーション 1-7: kt.markdown() 統合
- [ ] 統合テスト作成
- [ ] API実装
- [ ] セキュリティテスト
- [ ] `bun run lint:fix && bun run ci` 通過
- [ ] コミット

### サブイテレーション 1-8: CSS & 最終確認
- [ ] CSSスタイル追加
- [ ] 全体動作確認
- [ ] `bun run lint:fix && bun run ci` 通過
- [ ] コミット

---

## 完了条件

- [ ] すべてのサブイテレーションが完了
- [ ] 8つのコミットが作成済み
- [ ] `bun run ci` が最終的に成功
- [ ] 新規API (`json`, `code`, `markdown`) が `kt` オブジェクトからエクスポート
