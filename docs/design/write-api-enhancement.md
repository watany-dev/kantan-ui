# kt.write API 拡張設計書

## 実装ステータス

> **📋 設計中** (2026-01-13)
>
> Streamlit `st.write` との互換性向上のためのAPI拡張設計。

---

## 1. 概要

### 1.1 目的

現在の `kt.write` を Streamlit の `st.write` と互換性の高いAPIに拡張する。
`st.write` は「Swiss Army Knife」と呼ばれ、様々なデータ型を自動判定して適切に表示する。

### 1.2 現状の問題

| 問題 | 現状 | 期待動作 |
|------|------|----------|
| Markdown非対応 | `kt.write("**bold**")` → プレーンテキスト | Bold表示 |
| 単一引数のみ | `kt.write("x =", 42)` → エラー | `x = 42` と表示 |
| オブジェクト非対応 | `kt.write({a: 1})` → `[object Object]` | JSON風表示 |
| 配列非対応 | `kt.write([1,2,3])` → `1,2,3` | JSON風表示 |

### 1.3 設計原則

| 原則 | 説明 |
|------|------|
| **Streamlit互換** | `st.write` の動作を可能な限り再現 |
| **既存資産活用** | `parseMarkdown()`, `renderJsonTree()` を流用 |
| **型安全** | TypeScriptの型推論を活用 |
| **XSS防止** | 全ての出力でサニタイズを徹底 |

---

## 2. API設計

### 2.1 シグネチャ

```typescript
/**
 * 様々なデータ型を自動判定して表示（Streamlit st.write 互換）
 *
 * @param args - 表示するデータ（複数可）
 *
 * 対応データ型:
 * - string: Markdownとしてレンダリング
 * - number: 数値として表示
 * - boolean: true/false として表示
 * - null/undefined: "None" として表示
 * - object: JSON風の折りたたみ表示
 * - array: JSON風の折りたたみ表示
 */
function write(...args: unknown[]): void;
```

### 2.2 使用例

```typescript
// 文字列（Markdown）
kt.write("Hello **world**!");           // Bold表示
kt.write("# Title");                    // h1として表示

// 複数引数
kt.write("The answer is", 42);          // "The answer is 42"
kt.write("Name:", "Alice", "Age:", 30); // "Name: Alice Age: 30"

// オブジェクト
kt.write({ name: "Alice", age: 30 });   // JSON風表示

// 配列
kt.write([1, 2, 3]);                    // JSON風表示

// 混合
kt.write("User data:", { name: "Bob" }); // テキスト + JSON
```

### 2.3 データ型別の表示動作

| データ型 | 表示方法 | CSSクラス |
|---------|---------|-----------|
| `string` | Markdown → HTML | `kt-write kt-markdown` |
| `number` | 数値文字列 | `kt-write` |
| `boolean` | `true` / `false` | `kt-write` |
| `null` | `None` | `kt-write kt-none` |
| `undefined` | `None` | `kt-write kt-none` |
| `object` | JSON折りたたみ | `kt-write kt-json` |
| `Array` | JSON折りたたみ | `kt-write kt-json` |

---

## 3. 関連API: kt.text の仕様明確化

### 3.1 現状

`kt.text` は `kt.write` のエイリアスとして実装されている。

### 3.2 改修後の仕様

Streamlit `st.text` との互換性のため、以下のように分離する：

```typescript
/**
 * プレーンテキストを固定幅フォントで表示（Markdownなし）
 * Streamlit st.text 互換
 *
 * @param content - 表示するテキスト
 */
function text(content: string): void;
```

### 3.3 kt.write vs kt.text の違い

| 機能 | `kt.write` | `kt.text` |
|------|-----------|-----------|
| Markdown解釈 | ✅ する | ❌ しない |
| 複数引数 | ✅ 対応 | ❌ 単一のみ |
| データ型判定 | ✅ 自動 | ❌ 文字列のみ |
| フォント | 可変幅 | **固定幅** |
| 用途 | 汎用出力 | コード・ログ表示 |

---

## 4. 詳細設計

### 4.1 型判定フロー

```
┌─────────────────┐
│   write(...args) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  for arg of args │
└────────┬────────┘
         │
         ▼
    ┌────┴────┐
    │ typeof? │
    └────┬────┘
         │
    ┌────┼────────────┬─────────────┬──────────────┐
    ▼    ▼            ▼             ▼              ▼
 string number/     null/        object         Array
         boolean   undefined    (non-null)
    │    │            │             │              │
    ▼    ▼            ▼             ▼              ▼
 parse  String()   "None"     renderJson     renderJson
Markdown                       Tree()          Tree()
    │    │            │             │              │
    └────┴────────────┴─────────────┴──────────────┘
                      │
                      ▼
              ┌───────────────┐
              │ ctx.append()  │
              └───────────────┘
```

### 4.2 実装擬似コード

```typescript
import { parseMarkdown } from "./markdown/parser";
import { sanitizeMarkdownHtml } from "./markdown/sanitizer";
import { escapeHtml } from "../utils/html";

export function write(...args: unknown[]): void {
  const ctx = requireRenderContext();

  for (const arg of args) {
    const html = renderArg(arg);
    ctx.append(html);
  }
}

function renderArg(arg: unknown): string {
  // null / undefined
  if (arg === null || arg === undefined) {
    return '<span class="kt-write kt-none">None</span>';
  }

  // string → Markdown
  if (typeof arg === "string") {
    const parsed = parseMarkdown(arg);
    const sanitized = sanitizeMarkdownHtml(parsed);
    return `<div class="kt-write kt-markdown">${sanitized}</div>`;
  }

  // number / boolean → 文字列化
  if (typeof arg === "number" || typeof arg === "boolean") {
    return `<span class="kt-write">${escapeHtml(String(arg))}</span>`;
  }

  // object / array → JSON表示
  if (typeof arg === "object") {
    const jsonHtml = renderJsonTree(arg, 0, 1);
    return `<div class="kt-write kt-json">${jsonHtml}</div>`;
  }

  // その他 → 文字列化
  return `<span class="kt-write">${escapeHtml(String(arg))}</span>`;
}
```

### 4.3 kt.text の実装

```typescript
export function text(content: string): void {
  const ctx = requireRenderContext();
  ctx.append(`<pre class="kt-text">${escapeHtml(content)}</pre>`);
}
```

---

## 5. スタイル設計

### 5.1 追加CSSクラス

```css
/* kt.write のMarkdown出力用 */
.kt-write.kt-markdown {
  /* 既存の .kt-markdown スタイルを継承 */
}

/* null/undefined 表示用 */
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

---

## 6. 既存コード活用

### 6.1 流用するコンポーネント

| コンポーネント | ファイル | 用途 |
|--------------|---------|------|
| `parseMarkdown()` | `src/kt/markdown/parser.ts` | 文字列→HTML変換 |
| `sanitizeMarkdownHtml()` | `src/kt/markdown/sanitizer.ts` | XSS対策 |
| `renderJsonTree()` | `src/kt/output.ts:258-310` | オブジェクト/配列表示 |
| `escapeHtml()` | `src/utils/html.ts` | HTMLエスケープ |

### 6.2 変更が必要なファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/kt/output.ts` | `write()`, `text()` の実装変更 |
| `src/styles/default.ts` | `.kt-none`, `.kt-text` スタイル追加 |
| `tests/unit/kt/output.test.ts` | テストケース追加 |

---

## 7. 互換性考慮

### 7.1 破壊的変更

| 変更点 | 影響 | 対策 |
|-------|------|------|
| `write("**bold**")` の動作変更 | Bold表示される | 意図通り（Streamlit互換） |
| `write("<script>")` の動作変更 | エスケープ→サニタイズ | セキュリティ向上 |
| `text()` のフォント変更 | 固定幅になる | Streamlit互換 |

### 7.2 後方互換性

- `write(string)` は引き続き動作（出力形式は変更）
- `write(number)` は同じ動作
- `write(boolean)` は同じ動作

---

## 8. テスト計画

### 8.1 ユニットテスト

```typescript
describe("write", () => {
  // 文字列（Markdown）
  it("should render markdown string", () => {
    write("Hello **world**!");
    expect(ctx.getHtml()).toContain("<strong>world</strong>");
  });

  it("should render heading", () => {
    write("# Title");
    expect(ctx.getHtml()).toContain("<h1>Title</h1>");
  });

  // 複数引数
  it("should accept multiple arguments", () => {
    write("x =", 42);
    // 2つの要素が出力される
    expect(ctx.getHtml()).toContain("x =");
    expect(ctx.getHtml()).toContain("42");
  });

  // オブジェクト
  it("should render object as JSON", () => {
    write({ name: "Alice" });
    expect(ctx.getHtml()).toContain("kt-json");
    expect(ctx.getHtml()).toContain('"name"');
  });

  // 配列
  it("should render array as JSON", () => {
    write([1, 2, 3]);
    expect(ctx.getHtml()).toContain("kt-json");
  });

  // null/undefined
  it("should render null as None", () => {
    write(null);
    expect(ctx.getHtml()).toContain("None");
    expect(ctx.getHtml()).toContain("kt-none");
  });

  // XSS防止
  it("should sanitize markdown HTML", () => {
    write("<script>alert('xss')</script>");
    expect(ctx.getHtml()).not.toContain("<script>");
  });
});

describe("text", () => {
  it("should render plain text without markdown", () => {
    text("**not bold**");
    expect(ctx.getHtml()).toContain("**not bold**");
    expect(ctx.getHtml()).not.toContain("<strong>");
  });

  it("should use monospace font class", () => {
    text("code");
    expect(ctx.getHtml()).toContain('class="kt-text"');
  });
});
```

### 8.2 E2Eテスト

- 複数データ型の混合表示
- Markdownレンダリングの視覚確認
- JSON折りたたみの動作確認

---

## 9. 実装イテレーション

### Phase 1: 基盤（0.5日）
1. `write()` のシグネチャ変更（`...args: unknown[]`）
2. 型判定ロジックの実装
3. 既存テストの修正

### Phase 2: Markdown対応（0.5日）
4. 文字列のMarkdownレンダリング実装
5. サニタイズ処理の統合
6. Markdownテストの追加

### Phase 3: オブジェクト/配列対応（0.5日）
7. `renderJsonTree()` の統合
8. null/undefined 処理
9. JSON表示テストの追加

### Phase 4: kt.text 分離（0.5日）
10. `text()` の独立実装
11. CSSスタイル追加
12. text テストの追加

### Phase 5: 仕上げ（0.5日）
13. E2Eテスト作成
14. ドキュメント更新
15. `docs/streamlit-api-comparison.md` 更新

---

## 10. 参考資料

- [st.write - Streamlit Docs](https://docs.streamlit.io/develop/api-reference/write-magic/st.write)
- [st.text - Streamlit Docs](https://docs.streamlit.io/develop/api-reference/text/st.text)
- [Text elements - Streamlit Docs](https://docs.streamlit.io/develop/api-reference/text)
