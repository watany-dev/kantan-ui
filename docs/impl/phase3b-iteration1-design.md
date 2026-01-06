# Phase 3-B イテレーション1 詳細設計

作成日: 2025-01-06

## 概要

Phase 3-Bイテレーション1では、出力系APIを拡張し、以下の3つのAPIを実装する。

| API | 目的 | 優先度 |
|-----|------|--------|
| `kt.markdown()` | Markdownテキストのレンダリング | 高 |
| `kt.code()` | コードブロックの表示（構文ハイライト） | 高 |
| `kt.json()` | 折りたたみ可能なJSONビューア | 中 |

---

## 設計方針

### プロジェクト原則との整合性

プロジェクト方針「**最小依存: Honoのみに依存**」を考慮し、2つのアプローチを検討した。

| アプローチ | メリット | デメリット |
|-----------|---------|-----------|
| **Option A**: 外部ライブラリ（marked.js + highlight.js） | 高機能、メンテナンス済み | バンドルサイズ増加（~90KB）、方針逸脱 |
| **Option B**: 自作軽量実装 | 最小依存維持、軽量 | 機能制限、メンテナンスコスト |

**推奨: Option B（自作軽量実装）**

理由:
1. プロジェクトの「最小依存」方針を維持
2. Streamlit互換に必要な基本機能のみで十分
3. 将来的にプラグイン機構で高機能版を提供可能

---

## API設計

### 1. kt.markdown()

```typescript
/**
 * Markdownテキストをレンダリングして表示
 *
 * @param content - Markdownテキスト
 * @param config - オプション設定
 *
 * @example
 * kt.markdown("# Hello\n\nThis is **bold** text.");
 * kt.markdown("## Header", { unsafe_allow_html: true });
 */
export function markdown(
  content: string,
  config?: MarkdownConfig
): void;

export interface MarkdownConfig {
  /**
   * HTMLタグの直接埋め込みを許可（デフォルト: false）
   * @security trueにするとXSSリスクあり
   */
  unsafe_allow_html?: boolean;
}
```

#### サポートする Markdown 構文

| 構文 | 入力 | 出力 |
|------|------|------|
| 見出し | `# H1`, `## H2`, `### H3` | `<h1>`, `<h2>`, `<h3>` |
| 太字 | `**text**` | `<strong>` |
| 斜体 | `*text*` | `<em>` |
| インラインコード | `` `code` `` | `<code>` |
| リンク | `[text](url)` | `<a href>` |
| 画像 | `![alt](url)` | `<img>` |
| リスト | `- item` / `1. item` | `<ul>/<ol>` |
| 引用 | `> quote` | `<blockquote>` |
| 水平線 | `---` | `<hr>` |
| コードブロック | ` ```lang ` | `<pre><code>` |

#### 実装イメージ

```typescript
// src/kt/output.ts に追加

export function markdown(content: string, config?: MarkdownConfig): void {
  const ctx = requireRenderContext();

  // 軽量Markdownパーサーでレンダリング
  let html = parseMarkdown(content);

  // HTMLタグのサニタイズ（unsafe_allow_html: false の場合）
  if (!config?.unsafe_allow_html) {
    html = sanitizeMarkdownHtml(html);
  }

  ctx.append(`<div class="kt-markdown">${html}</div>`);
}
```

#### セキュリティ考慮事項

1. **XSS対策**: デフォルトで `unsafe_allow_html: false`
2. **サニタイズ**: 許可するHTMLタグをホワイトリストで制限
3. **リンク**: `javascript:` URLをブロック

許可タグ（ホワイトリスト）:
```typescript
const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'strong', 'em', 'code', 'pre',
  'ul', 'ol', 'li',
  'blockquote',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];
```

---

### 2. kt.code()

```typescript
/**
 * コードブロックを表示
 *
 * @param body - コードの内容
 * @param language - プログラミング言語（構文ハイライト用）
 * @param config - オプション設定
 *
 * @example
 * kt.code("const x = 42;", "typescript");
 * kt.code("print('hello')", "python", { line_numbers: true });
 */
export function code(
  body: string,
  language?: string,
  config?: CodeConfig
): void;

export interface CodeConfig {
  /** 行番号を表示（デフォルト: false） */
  line_numbers?: boolean;
  /** ラップ表示（デフォルト: false、横スクロール） */
  wrap_lines?: boolean;
}
```

#### 構文ハイライトの実装方針

**軽量アプローチ**: CSSクラスベースの基本的なハイライト

サポート言語（初期）:
- `typescript` / `javascript`
- `python`
- `json`
- `html` / `css`
- `bash` / `shell`
- `sql`

ハイライトルール（正規表現ベース）:
```typescript
const HIGHLIGHT_RULES: Record<string, HighlightRule[]> = {
  typescript: [
    { pattern: /\b(const|let|var|function|return|if|else|for|while|class|interface|type|import|export|from|async|await)\b/g, class: 'kt-code-keyword' },
    { pattern: /"[^"]*"|'[^']*'|`[^`]*`/g, class: 'kt-code-string' },
    { pattern: /\/\/.*$/gm, class: 'kt-code-comment' },
    { pattern: /\b\d+\b/g, class: 'kt-code-number' },
  ],
  // ...
};
```

#### 実装イメージ

```typescript
// src/kt/output.ts に追加

export function code(
  body: string,
  language?: string,
  config?: CodeConfig
): void {
  const ctx = requireRenderContext();

  // コード内容をエスケープ
  const escapedCode = escapeHtml(body);

  // 構文ハイライト適用（言語指定がある場合）
  const highlightedCode = language
    ? applyHighlight(escapedCode, language)
    : escapedCode;

  // 行番号の生成（オプション）
  const lines = highlightedCode.split('\n');
  const lineNumbers = config?.line_numbers
    ? generateLineNumbers(lines.length)
    : '';

  const wrapClass = config?.wrap_lines ? ' kt-code-wrap' : '';

  ctx.append(`
    <div class="kt-code${wrapClass}" data-language="${escapeHtml(language ?? '')}">
      ${lineNumbers}
      <pre><code class="kt-code-content">${highlightedCode}</code></pre>
    </div>
  `);
}
```

#### CSSスタイル

```css
.kt-code {
  background: #1e1e1e;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  margin: 0.5rem 0;
}

.kt-code-keyword { color: #569cd6; }
.kt-code-string { color: #ce9178; }
.kt-code-comment { color: #6a9955; }
.kt-code-number { color: #b5cea8; }

.kt-code-line-numbers {
  float: left;
  padding-right: 1rem;
  color: #858585;
  border-right: 1px solid #404040;
  user-select: none;
}
```

---

### 3. kt.json()

```typescript
/**
 * JSONデータを折りたたみ可能なビューで表示
 *
 * @param data - JSONデータ（オブジェクト、配列、または文字列）
 * @param config - オプション設定
 *
 * @example
 * kt.json({ name: "Alice", age: 30 });
 * kt.json(apiResponse, { expanded: 2 });
 */
export function json(
  data: unknown,
  config?: JsonConfig
): void;

export interface JsonConfig {
  /** 展開するデフォルト深さ（デフォルト: 1） */
  expanded?: number;
}
```

#### 実装方針

1. **サーバーサイド**: 静的HTMLを生成（折りたたみUIはCSSで実装）
2. **クライアントサイド**: `<details>`/`<summary>` タグを活用（JavaScript不要）

#### 実装イメージ

```typescript
// src/kt/output.ts に追加

export function json(data: unknown, config?: JsonConfig): void {
  const ctx = requireRenderContext();
  const expandedDepth = config?.expanded ?? 1;

  // JSONを整形してHTML生成
  const jsonHtml = renderJsonTree(data, 0, expandedDepth);

  ctx.append(`<div class="kt-json">${jsonHtml}</div>`);
}

function renderJsonTree(
  data: unknown,
  depth: number,
  expandedDepth: number
): string {
  if (data === null) return '<span class="kt-json-null">null</span>';
  if (typeof data === 'boolean') return `<span class="kt-json-boolean">${data}</span>`;
  if (typeof data === 'number') return `<span class="kt-json-number">${data}</span>`;
  if (typeof data === 'string') return `<span class="kt-json-string">"${escapeHtml(data)}"</span>`;

  if (Array.isArray(data)) {
    if (data.length === 0) return '<span class="kt-json-array">[]</span>';

    const isExpanded = depth < expandedDepth;
    const items = data.map((item, i) =>
      `<div class="kt-json-item">${renderJsonTree(item, depth + 1, expandedDepth)}${i < data.length - 1 ? ',' : ''}</div>`
    ).join('');

    return `
      <details class="kt-json-array" ${isExpanded ? 'open' : ''}>
        <summary>[${data.length}]</summary>
        ${items}
      </details>
    `;
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data);
    if (entries.length === 0) return '<span class="kt-json-object">{}</span>';

    const isExpanded = depth < expandedDepth;
    const items = entries.map(([key, value], i) =>
      `<div class="kt-json-item"><span class="kt-json-key">"${escapeHtml(key)}"</span>: ${renderJsonTree(value, depth + 1, expandedDepth)}${i < entries.length - 1 ? ',' : ''}</div>`
    ).join('');

    return `
      <details class="kt-json-object" ${isExpanded ? 'open' : ''}>
        <summary>{${entries.length}}</summary>
        ${items}
      </details>
    `;
  }

  return escapeHtml(String(data));
}
```

#### CSSスタイル

```css
.kt-json {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.5;
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
}

.kt-json-key { color: #9cdcfe; }
.kt-json-string { color: #ce9178; }
.kt-json-number { color: #b5cea8; }
.kt-json-boolean { color: #569cd6; }
.kt-json-null { color: #569cd6; }

.kt-json details { margin-left: 1rem; }
.kt-json summary { cursor: pointer; }
.kt-json summary:hover { opacity: 0.8; }
```

---

## ファイル構成

```
src/kt/
├── output.ts         # markdown(), code(), json() を追加
├── markdown/
│   ├── parser.ts     # 軽量Markdownパーサー
│   ├── sanitizer.ts  # HTMLサニタイザー
│   └── index.ts
├── code/
│   ├── highlighter.ts # 構文ハイライト
│   ├── languages.ts   # 言語別ルール
│   └── index.ts
└── index.ts          # エクスポート追加

tests/unit/kt/
├── output.test.ts    # 既存テストに追加
├── markdown/
│   ├── parser.test.ts
│   └── sanitizer.test.ts
└── code/
    └── highlighter.test.ts
```

---

## テスト計画（TDD）

### Step 1: markdown() テスト

```typescript
describe("kt.markdown", () => {
  // 基本機能
  it("should render heading", () => {
    markdown("# Hello");
    expect(ctx.getHtml()).toContain("<h1>Hello</h1>");
  });

  it("should render bold text", () => {
    markdown("**bold**");
    expect(ctx.getHtml()).toContain("<strong>bold</strong>");
  });

  // XSSテスト
  it("should sanitize script tags by default", () => {
    markdown("<script>alert('xss')</script>");
    expect(ctx.getHtml()).not.toContain("<script>");
  });

  it("should block javascript: URLs in links", () => {
    markdown("[click](javascript:alert('xss'))");
    expect(ctx.getHtml()).not.toContain("javascript:");
  });

  // unsafe_allow_html オプション
  it("should allow HTML when unsafe_allow_html is true", () => {
    markdown("<div class='custom'>text</div>", { unsafe_allow_html: true });
    expect(ctx.getHtml()).toContain('<div class="custom">');
  });
});
```

### Step 2: code() テスト

```typescript
describe("kt.code", () => {
  it("should render code block with language class", () => {
    code("const x = 1;", "typescript");
    expect(ctx.getHtml()).toContain('data-language="typescript"');
  });

  it("should escape HTML in code content", () => {
    code("<script>alert('xss')</script>");
    expect(ctx.getHtml()).toContain("&lt;script&gt;");
  });

  it("should render line numbers when enabled", () => {
    code("line1\nline2", "text", { line_numbers: true });
    expect(ctx.getHtml()).toContain("1");
    expect(ctx.getHtml()).toContain("2");
  });

  it("should apply keyword highlighting for typescript", () => {
    code("const x = 1;", "typescript");
    expect(ctx.getHtml()).toContain('class="kt-code-keyword"');
  });
});
```

### Step 3: json() テスト

```typescript
describe("kt.json", () => {
  it("should render simple object", () => {
    json({ name: "Alice" });
    expect(ctx.getHtml()).toContain('"name"');
    expect(ctx.getHtml()).toContain('"Alice"');
  });

  it("should render nested object with collapsible UI", () => {
    json({ user: { name: "Bob" } });
    expect(ctx.getHtml()).toContain("<details");
  });

  it("should escape HTML in string values", () => {
    json({ html: "<script>xss</script>" });
    expect(ctx.getHtml()).toContain("&lt;script&gt;");
  });

  it("should expand to specified depth", () => {
    json({ a: { b: { c: 1 } } }, { expanded: 2 });
    // depth 0, 1 は展開、depth 2 は閉じている
  });
});
```

---

## 実装順序

```
1. 基盤整備
   ├── src/kt/markdown/parser.ts (軽量Markdownパーサー)
   ├── src/kt/markdown/sanitizer.ts (HTMLサニタイザー)
   └── tests/unit/kt/markdown/*.test.ts

2. kt.markdown() 実装
   ├── src/kt/output.ts に markdown() 追加
   ├── src/kt/index.ts にエクスポート追加
   └── tests/unit/kt/output.test.ts にテスト追加

3. kt.code() 実装
   ├── src/kt/code/highlighter.ts
   ├── src/kt/code/languages.ts
   ├── src/kt/output.ts に code() 追加
   └── テスト追加

4. kt.json() 実装
   ├── src/kt/output.ts に json() 追加
   └── テスト追加

5. CSS統合
   └── src/templates/base.html にスタイル追加
```

---

## 成果物チェックリスト

- [ ] `src/kt/markdown/parser.ts` - 軽量Markdownパーサー
- [ ] `src/kt/markdown/sanitizer.ts` - HTMLサニタイザー
- [ ] `src/kt/code/highlighter.ts` - 構文ハイライト
- [ ] `src/kt/code/languages.ts` - 言語別ハイライトルール
- [ ] `src/kt/output.ts` に `markdown()`, `code()`, `json()` 追加
- [ ] `src/kt/index.ts` にエクスポート追加
- [ ] CSSスタイル追加
- [ ] ユニットテスト（カバレッジ90%以上）
- [ ] XSSセキュリティテスト
- [ ] `bun run ci` 成功

---

## リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| 軽量パーサーの不具合 | Markdown表示崩れ | 十分なテストケース、エッジケース対応 |
| XSS脆弱性 | セキュリティ問題 | サニタイズ徹底、セキュリティテスト |
| 構文ハイライト不足 | ユーザー体験低下 | 将来的にプラグインで拡張可能に |

---

## 参考

- [CommonMark Spec](https://spec.commonmark.org/)
- [Streamlit st.markdown](https://docs.streamlit.io/develop/api-reference/text/st.markdown)
- [Streamlit st.code](https://docs.streamlit.io/develop/api-reference/text/st.code)
- [Streamlit st.json](https://docs.streamlit.io/develop/api-reference/data/st.json)
