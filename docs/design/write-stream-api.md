# write_stream API 設計書

## 実装ステータス

> **📝 設計完了** (2026-01-12)
>
> API設計・アーキテクチャ設計が完了。実装待ち。

## 1. 概要

### 1.1 目的

Streamlit の `st.write_stream()` に相当するAPIをkantan-uiに実装する。LLMのストリーミングレスポンスなど、逐次生成されるテキストをリアルタイムで表示する。

### 1.2 スコープ

- `ReadableStream<string>` / `AsyncIterable<string>` からの逐次表示
- LLMストリーミングレスポンス対応
- Markdownストリームの最終レンダリング
- 複数ストリームの並列処理

### 1.3 設計原則

| 原則 | 説明 |
|------|------|
| **Web標準準拠** | `ReadableStream`, `AsyncIterable`, `TransformStream` を最大限活用 |
| **Hono互換** | Honoの `streamText()` パターンを参考に |
| **マルチランタイム** | Node.js, Deno, Bun, Cloudflare Workers で動作 |
| **既存アーキテクチャ活用** | 既存のWebSocket patch システムを活用 |

---

## 2. API設計

### 2.1 基本API

```typescript
// AsyncGenerator（LLM風）
async function* generateResponse() {
  yield "Hello, ";
  yield "World!";
}
const fullText = await kt.write_stream(generateResponse());

// ReadableStream（Web標準）
const stream = new ReadableStream<string>({
  start(controller) {
    controller.enqueue("Streaming ");
    controller.enqueue("content...");
    controller.close();
  }
});
await kt.write_stream(stream);
```

### 2.2 シグネチャ

```typescript
/**
 * ストリームソースの型（Web標準）
 */
type StreamSource =
  | ReadableStream<string>           // Web標準 ReadableStream
  | AsyncIterable<string>            // ES2018 AsyncIterable
  | Iterable<string>                 // 同期 Iterable
  | Response                         // Fetch API Response（body を使用）
  | (() => StreamSource);            // ファクトリ関数

interface WriteStreamOptions {
  /** Markdownとしてレンダリング（デフォルト: false） */
  markdown?: boolean;
  /** 要素のCSSクラス */
  className?: string;
}

/**
 * ストリームからテキストを逐次表示
 * @param source ストリームソース
 * @param options オプション
 * @returns 結合された全テキスト
 */
function write_stream(
  source: StreamSource,
  options?: WriteStreamOptions
): Promise<string>;
```

### 2.3 使用例

```typescript
import * as kt from "kantan-ui";

// 例1: AsyncGenerator（LLM風）
async function* generateResponse() {
  const chunks = ["Hello", " ", "World", "!"];
  for (const chunk of chunks) {
    await new Promise(r => setTimeout(r, 100));
    yield chunk;
  }
}
const text = await kt.write_stream(generateResponse());
kt.write(`Full text: ${text}`);

// 例2: ReadableStream（Web標準）
const stream = new ReadableStream<string>({
  async start(controller) {
    controller.enqueue("Streaming ");
    controller.enqueue("content...");
    controller.close();
  }
});
await kt.write_stream(stream);

// 例3: Fetch API Response
const response = await fetch("https://api.example.com/stream");
await kt.write_stream(response);

// 例4: TransformStream でテキスト変換
const textStream = response.body!
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(new TransformStream<string, string>({
    transform(chunk, controller) {
      controller.enqueue(chunk.toUpperCase());
    }
  }));
await kt.write_stream(textStream);

// 例5: Markdownストリーム（最終レンダリング）
await kt.write_stream(markdownStream, { markdown: true });

// 例6: カスタムクラス
await kt.write_stream(stream, { className: "llm-response" });
```

---

## 3. 型定義

### 3.1 StreamSource

```typescript
/**
 * write_stream() が受け付けるソースの型
 * Web標準APIを最大限活用
 */
type StreamSource =
  | ReadableStream<string>
  | AsyncIterable<string>
  | Iterable<string>
  | Response
  | (() => StreamSource);
```

### 3.2 WriteStreamOptions

```typescript
/**
 * write_stream() のオプション
 */
interface WriteStreamOptions {
  /**
   * ストリーム完了後にMarkdownとしてレンダリング
   * @default false
   */
  markdown?: boolean;

  /**
   * 要素に追加するCSSクラス
   */
  className?: string;
}
```

### 3.3 内部データ構造

```typescript
/**
 * 処理待ちストリーム（内部用）
 */
interface PendingStream {
  /** ストリーム要素のID */
  id: string;
  /** 正規化されたReadableStream */
  stream: ReadableStream<string>;
  /** オプション */
  options: WriteStreamOptions;
  /** Promise の resolve */
  resolve: (text: string) => void;
  /** Promise の reject */
  reject: (error: Error) => void;
}
```

### 3.4 新規Patchタイプ

```typescript
/**
 * WebSocket Patch タイプ（追加分）
 */
type Patch =
  // 既存
  | { type: "replaceRoot"; html: string }
  | { type: "replaceNode"; id: string; html: string }
  | { type: "removeNode"; id: string }
  | { type: "insertNode"; parentId: string; index: number; html: string }
  | { type: "streamAppend"; html: string }
  // 新規追加
  | { type: "streamChunk"; streamId: string; content: string }
  | { type: "streamEnd"; streamId: string; finalHtml?: string };
```

---

## 4. アーキテクチャ

### 4.1 システム構成

```
┌────────────────────────────────────────────────────────────────────┐
│  Server (Script Execution)                                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  write_stream(source, options)                                     │
│       │                                                            │
│       ▼                                                            │
│  ┌─────────────────────────────────────────┐                       │
│  │ 1. toReadableStream(source)             │                       │
│  │    - Web標準APIで正規化                  │                       │
│  │    - ReadableStream.from() 使用         │                       │
│  └─────────────────┬───────────────────────┘                       │
│                    │                                               │
│                    ▼                                               │
│  ┌─────────────────────────────────────────┐                       │
│  │ 2. プレースホルダーHTML生成              │                       │
│  │    <div id="kt-stream-xxx">              │                       │
│  │      <span class="kt-stream-content"/>   │                       │
│  │      <span class="kt-stream-cursor"/>    │                       │
│  │    </div>                                │                       │
│  └─────────────────┬───────────────────────┘                       │
│                    │                                               │
│                    ▼                                               │
│  ┌─────────────────────────────────────────┐                       │
│  │ 3. StreamRegistry に登録                │                       │
│  │    - Promise を返す                     │                       │
│  │    - rerun完了後に処理                  │                       │
│  └─────────────────────────────────────────┘                       │
│                                                                    │
│  ═══════════════ rerun() 完了後 ═══════════════                    │
│                                                                    │
│  ┌─────────────────────────────────────────┐                       │
│  │ 4. processStreams()                     │                       │
│  │    - 登録されたストリームを処理          │                       │
│  │    - 並列処理 (Promise.all)             │                       │
│  └─────────────────┬───────────────────────┘                       │
│                    │                                               │
│                    ▼                                               │
│  ┌─────────────────────────────────────────┐                       │
│  │ 5. ストリーム読み込みループ              │                       │
│  │    const reader = stream.getReader();   │                       │
│  │    while (true) {                       │                       │
│  │      const { done, value } = await      │                       │
│  │        reader.read();                   │                       │
│  │      if (done) break;                   │                       │
│  │      emit("streamChunk", value);        │                       │
│  │    }                                    │                       │
│  │    emit("streamEnd", finalHtml?);       │                       │
│  └─────────────────────────────────────────┘                       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  Client (Browser)                                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  applyPatch(patch)                                                 │
│       │                                                            │
│       ▼                                                            │
│  ┌─────────────────────────────────────────┐                       │
│  │ case "streamChunk":                     │                       │
│  │   const el = getElementById(streamId);  │                       │
│  │   const content = el.querySelector(     │                       │
│  │     ".kt-stream-content");              │                       │
│  │   content.appendChild(                  │                       │
│  │     document.createTextNode(chunk)      │ ← XSS防止             │
│  │   );                                    │                       │
│  └─────────────────────────────────────────┘                       │
│                                                                    │
│  ┌─────────────────────────────────────────┐                       │
│  │ case "streamEnd":                       │                       │
│  │   cursor.remove();                      │                       │
│  │   if (finalHtml) {                      │                       │
│  │     content.innerHTML = finalHtml;      │ ← Markdown用          │
│  │   }                                     │                       │
│  │   el.classList.add("kt-stream-complete")│                       │
│  └─────────────────────────────────────────┘                       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 4.2 Web標準APIの活用

```typescript
// src/kt/stream-utils.ts

/**
 * 任意のソースを ReadableStream<string> に正規化
 * Web標準APIのみ使用
 */
function toReadableStream(source: StreamSource): ReadableStream<string> {
  // ファクトリ関数の場合は展開
  if (typeof source === "function") {
    return toReadableStream(source());
  }

  // ReadableStream はそのまま
  if (source instanceof ReadableStream) {
    return source;
  }

  // Response の場合は body を TextDecoderStream で変換
  if (source instanceof Response) {
    if (!source.body) {
      throw new Error("Response body is null");
    }
    // Web標準: TextDecoderStream
    return source.body.pipeThrough(new TextDecoderStream());
  }

  // AsyncIterable / Iterable → ReadableStream
  // Web標準: ReadableStream.from() (Chrome 119+, Node 20+, Deno, Bun)
  if (Symbol.asyncIterator in source || Symbol.iterator in source) {
    return ReadableStream.from(source as AsyncIterable<string>);
  }

  throw new TypeError("Invalid stream source");
}
```

### 4.3 ストリーム処理フロー

```
1. スクリプト実行中
   └─▶ write_stream() 呼び出し
       ├─▶ toReadableStream() で正規化
       ├─▶ プレースホルダーHTML生成
       ├─▶ StreamRegistry に登録
       └─▶ Promise を返す（未解決）

2. rerun() 完了
   └─▶ processStreams() 呼び出し
       └─▶ 登録されたストリームを並列処理

3. 各ストリームの処理
   └─▶ reader.read() ループ
       ├─▶ chunk取得
       ├─▶ "streamChunk" patch 送信
       └─▶ クライアントがDOMに追加

4. ストリーム完了
   ├─▶ "streamEnd" patch 送信
   ├─▶ Promise を resolve
   └─▶ クライアントがカーソル削除

5. クライアント最終処理
   ├─▶ Markdownの場合: 最終HTMLで置換
   └─▶ 完了クラス追加
```

### 4.4 ファイル構成

```
src/
├── kt/
│   ├── stream.ts              # write_stream() 本体
│   ├── stream-utils.ts        # toReadableStream() ユーティリティ
│   └── stream-registry.ts     # PendingStream 管理
│
├── runtime/
│   └── stream-processor.ts    # rerun後のストリーム処理
│
├── websocket/
│   └── types.ts               # Patch タイプ追加（streamChunk, streamEnd）
│
├── client/
│   └── script.ts              # クライアント側 patch 処理追加
│
└── styles/
    └── index.ts               # ストリームCSS追加
```

---

## 5. クライアント実装

### 5.1 Patch処理

```typescript
// src/client/script.ts に追加

case "streamChunk": {
  const el = document.getElementById(patch.streamId);
  if (!el) break;

  const content = el.querySelector(".kt-stream-content");
  if (content) {
    // テキストノードとして追加（XSS防止）
    content.appendChild(document.createTextNode(patch.content));
  }
  break;
}

case "streamEnd": {
  const el = document.getElementById(patch.streamId);
  if (!el) break;

  // カーソル削除
  const cursor = el.querySelector(".kt-stream-cursor");
  cursor?.remove();

  // Markdown最終レンダリング
  if (patch.finalHtml) {
    const content = el.querySelector(".kt-stream-content");
    if (content) {
      content.innerHTML = patch.finalHtml;
    }
  }

  // 完了状態
  el.classList.add("kt-stream-complete");
  break;
}
```

### 5.2 CSS

```css
/* ストリーム表示 */
.kt-stream {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}

/* ストリームコンテンツ */
.kt-stream-content {
  display: inline;
}

/* カーソルアニメーション */
.kt-stream-cursor {
  display: inline-block;
  width: 0.5em;
  height: 1.1em;
  background: currentColor;
  margin-left: 1px;
  vertical-align: text-bottom;
  animation: kt-cursor-blink 1s step-end infinite;
}

/* 完了時はカーソル非表示 */
.kt-stream-complete .kt-stream-cursor {
  display: none;
}

/* カーソル点滅アニメーション */
@keyframes kt-cursor-blink {
  50% { opacity: 0; }
}

/* Markdownレンダリング後 */
.kt-stream-complete .kt-stream-content {
  display: block;
}
```

---

## 6. ランタイム互換性

### 6.1 使用するWeb標準API

| API | Node.js | Deno | Bun | CF Workers |
|-----|---------|------|-----|------------|
| `ReadableStream` | 18+ | ✓ | ✓ | ✓ |
| `ReadableStream.from()` | 20+ | ✓ | ✓ | ✓ |
| `ReadableStream.getReader()` | 18+ | ✓ | ✓ | ✓ |
| `TextDecoderStream` | 18+ | ✓ | ✓ | ✓ |
| `TransformStream` | 18+ | ✓ | ✓ | ✓ |
| `crypto.randomUUID()` | 19+ | ✓ | ✓ | ✓ |
| `Response.body` | 18+ | ✓ | ✓ | ✓ |

### 6.2 ポリフィル不要

全てのターゲットランタイムで上記APIがネイティブサポートされているため、ポリフィルは不要。

---

## 7. イテレーション計画

### Phase 1: 基盤（Web標準ユーティリティ）

#### Iteration 1.1: ストリーム正規化ユーティリティ

**目標**: 任意のソースをReadableStreamに変換する関数

**Red（テスト作成）**:
```typescript
// tests/unit/kt/stream-utils.test.ts
describe("toReadableStream", () => {
  it("returns ReadableStream as-is", () => {
    const stream = new ReadableStream();
    expect(toReadableStream(stream)).toBe(stream);
  });

  it("converts AsyncIterable to ReadableStream", async () => {
    async function* gen() {
      yield "a";
      yield "b";
    }
    const stream = toReadableStream(gen());
    const reader = stream.getReader();
    expect((await reader.read()).value).toBe("a");
    expect((await reader.read()).value).toBe("b");
    expect((await reader.read()).done).toBe(true);
  });

  it("converts Iterable to ReadableStream", async () => {
    const stream = toReadableStream(["a", "b"]);
    const reader = stream.getReader();
    expect((await reader.read()).value).toBe("a");
  });

  it("converts Response body to ReadableStream", async () => {
    const response = new Response("hello");
    const stream = toReadableStream(response);
    const reader = stream.getReader();
    const { value } = await reader.read();
    expect(value).toBe("hello");
  });

  it("handles factory function", async () => {
    const factory = () => ["a", "b"];
    const stream = toReadableStream(factory);
    const reader = stream.getReader();
    expect((await reader.read()).value).toBe("a");
  });

  it("throws for invalid source", () => {
    expect(() => toReadableStream(123 as any)).toThrow(TypeError);
  });
});
```

**Green（実装）**:
- `src/kt/stream-utils.ts` を作成

**成果物**: `src/kt/stream-utils.ts`, `tests/unit/kt/stream-utils.test.ts`

---

#### Iteration 1.2: StreamRegistry

**目標**: 処理待ちストリームを管理するレジストリ

**Red（テスト作成）**:
```typescript
// tests/unit/kt/stream-registry.test.ts
describe("StreamRegistry", () => {
  it("registers and retrieves streams", () => {
    const registry = createStreamRegistry();
    const sessionKey = {};
    const pending = createMockPendingStream();

    registry.register(sessionKey, pending);
    const streams = registry.consume(sessionKey);

    expect(streams).toHaveLength(1);
    expect(streams[0]).toBe(pending);
  });

  it("clears streams after consume", () => {
    const registry = createStreamRegistry();
    const sessionKey = {};
    registry.register(sessionKey, createMockPendingStream());

    registry.consume(sessionKey);
    const streams = registry.consume(sessionKey);

    expect(streams).toHaveLength(0);
  });

  it("handles multiple streams per session", () => {
    const registry = createStreamRegistry();
    const sessionKey = {};

    registry.register(sessionKey, createMockPendingStream());
    registry.register(sessionKey, createMockPendingStream());

    const streams = registry.consume(sessionKey);
    expect(streams).toHaveLength(2);
  });

  it("isolates streams by session", () => {
    const registry = createStreamRegistry();
    const session1 = {};
    const session2 = {};

    registry.register(session1, createMockPendingStream());
    registry.register(session2, createMockPendingStream());

    expect(registry.consume(session1)).toHaveLength(1);
    expect(registry.consume(session2)).toHaveLength(1);
  });
});
```

**Green（実装）**:
- `src/kt/stream-registry.ts` を作成

**成果物**: `src/kt/stream-registry.ts`, `tests/unit/kt/stream-registry.test.ts`

---

### Phase 2: Patch タイプ追加

#### Iteration 2.1: WebSocket Patch タイプ

**目標**: streamChunk, streamEnd Patchタイプの追加

**作業内容**:
- `src/websocket/types.ts` に新しいPatchタイプを追加
- 型ガード関数の追加

**成果物**: `src/websocket/types.ts` の更新

---

### Phase 3: write_stream 本体実装

#### Iteration 3.1: write_stream 基本実装

**目標**: プレースホルダー生成とStreamRegistry登録

**Red（テスト作成）**:
```typescript
// tests/unit/kt/stream.test.ts
describe("write_stream", () => {
  it("appends placeholder HTML to context", async () => {
    const ctx = createMockRenderContext();
    setRenderContext(ctx);

    const promise = write_stream(["hello"]);

    const html = ctx.getHtml();
    expect(html).toContain('class="kt-stream"');
    expect(html).toContain('kt-stream-content');
    expect(html).toContain('kt-stream-cursor');
  });

  it("returns promise that resolves to full text", async () => {
    setupMockStreamProcessing();

    const result = await write_stream(["hello", " ", "world"]);

    expect(result).toBe("hello world");
  });

  it("applies className option", async () => {
    const ctx = createMockRenderContext();
    setRenderContext(ctx);

    write_stream(["test"], { className: "custom-class" });

    expect(ctx.getHtml()).toContain('class="kt-stream custom-class"');
  });

  it("sets markdown data attribute", async () => {
    const ctx = createMockRenderContext();
    setRenderContext(ctx);

    write_stream(["# Title"], { markdown: true });

    expect(ctx.getHtml()).toContain('data-markdown="true"');
  });
});
```

**Green（実装）**:
- `src/kt/stream.ts` を作成

**成果物**: `src/kt/stream.ts`, `tests/unit/kt/stream.test.ts`

---

### Phase 4: ストリーム処理エンジン

#### Iteration 4.1: processStreams 実装

**目標**: rerun後のストリーム処理

**Red（テスト作成）**:
```typescript
// tests/unit/runtime/stream-processor.test.ts
describe("processStreams", () => {
  it("emits streamChunk for each chunk", async () => {
    const patches: Patch[] = [];
    const emit = (patch: Patch) => patches.push(patch);

    await processStreams(sessionKey, emit);

    const chunks = patches.filter(p => p.type === "streamChunk");
    expect(chunks).toHaveLength(3);
  });

  it("emits streamEnd when done", async () => {
    const patches: Patch[] = [];
    const emit = (patch: Patch) => patches.push(patch);

    await processStreams(sessionKey, emit);

    const end = patches.find(p => p.type === "streamEnd");
    expect(end).toBeDefined();
  });

  it("includes finalHtml for markdown streams", async () => {
    // markdown: true のストリームを登録
    const patches: Patch[] = [];

    await processStreams(sessionKey, (p) => patches.push(p));

    const end = patches.find(p => p.type === "streamEnd") as any;
    expect(end.finalHtml).toContain("<h1>");
  });

  it("processes multiple streams in parallel", async () => {
    // 2つのストリームを登録
    const startTime = Date.now();

    await processStreams(sessionKey, () => {});

    const elapsed = Date.now() - startTime;
    // 並列処理なら1秒以内（各100ms×3チャンク）
    expect(elapsed).toBeLessThan(1000);
  });

  it("resolves promise with full text", async () => {
    const resolvedTexts: string[] = [];
    // resolve をモック

    await processStreams(sessionKey, () => {});

    expect(resolvedTexts[0]).toBe("hello world");
  });

  it("handles stream errors", async () => {
    // エラーを投げるストリームを登録
    const rejectedErrors: Error[] = [];

    await processStreams(sessionKey, () => {});

    expect(rejectedErrors[0]).toBeInstanceOf(Error);
  });
});
```

**Green（実装）**:
- `src/runtime/stream-processor.ts` を作成

**成果物**: `src/runtime/stream-processor.ts`, `tests/unit/runtime/stream-processor.test.ts`

---

### Phase 5: サーバー統合

#### Iteration 5.1: rerun.ts 統合

**目標**: rerun後にprocessStreamsを呼び出す

**作業内容**:
- `src/runtime/rerun.ts` を更新
- processStreams呼び出しを追加

**成果物**: `src/runtime/rerun.ts` の更新

---

#### Iteration 5.2: app.ts 統合

**目標**: WebSocketハンドラーでのストリーム処理

**作業内容**:
- `src/app.ts` を更新
- ストリームpatch送信の統合

**成果物**: `src/app.ts` の更新

---

### Phase 6: クライアント実装

#### Iteration 6.1: Patch処理追加

**目標**: クライアント側のstreamChunk/streamEnd処理

**作業内容**:
- `src/client/script.ts` に新しいpatch処理を追加
- XSS防止のためテキストノードとして追加

**成果物**: `src/client/script.ts` の更新

---

#### Iteration 6.2: CSS追加

**目標**: ストリーム表示のスタイリング

**作業内容**:
- `src/styles/index.ts` にCSS追加
- カーソルアニメーション

**成果物**: `src/styles/index.ts` の更新

---

### Phase 7: 公開API・E2E

#### Iteration 7.1: 公開APIエクスポート

**目標**: write_stream を公開APIとしてエクスポート

**作業内容**:
- `src/kt/index.ts` にエクスポート追加
- `src/index.ts` の更新

**成果物**: 公開API完成

---

#### Iteration 7.2: E2Eテスト

**目標**: Playwrightによる統合テスト

**Red（テスト作成）**:
```typescript
// e2e/write-stream.spec.ts
test.describe("write_stream", () => {
  test("displays streaming text progressively", async ({ page }) => {
    await page.goto("/stream-demo");

    // ストリーム開始ボタンをクリック
    await page.click('button:has-text("Start Stream")');

    // カーソルが表示される
    await expect(page.locator(".kt-stream-cursor")).toBeVisible();

    // テキストが徐々に表示される
    await expect(page.locator(".kt-stream-content")).toContainText("Hello");
    await expect(page.locator(".kt-stream-content")).toContainText("World");

    // 完了後カーソルが消える
    await expect(page.locator(".kt-stream-cursor")).not.toBeVisible();
    await expect(page.locator(".kt-stream")).toHaveClass(/kt-stream-complete/);
  });

  test("renders markdown after completion", async ({ page }) => {
    await page.goto("/stream-markdown-demo");
    await page.click('button:has-text("Start")');

    // 完了を待つ
    await expect(page.locator(".kt-stream")).toHaveClass(/kt-stream-complete/);

    // Markdownがレンダリングされている
    await expect(page.locator(".kt-stream h1")).toBeVisible();
  });
});
```

**成果物**: `e2e/write-stream.spec.ts`

---

## 8. チェックリスト

### 実装前

- [ ] 既存のストリーミング実装（streamAppend）を確認
- [ ] RenderContextの仕組みを確認
- [ ] rerun.tsの実行フローを確認

### 各イテレーション後

- [ ] `bun run lint:fix` 実行
- [ ] `bun run test` 実行（該当テストがパス）
- [ ] コミット

### 完了時

- [ ] `bun run ci` 全パス
- [ ] 全ランタイム（Node.js, Deno, Bun）で動作確認
- [ ] E2Eテストがパス
- [ ] knip（dead-code検出）パス

---

## 9. 参考資料

### Web標準API

- [MDN ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)
- [MDN ReadableStream.from()](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/from_static)
- [MDN TextDecoderStream](https://developer.mozilla.org/en-US/docs/Web/API/TextDecoderStream)
- [MDN TransformStream](https://developer.mozilla.org/en-US/docs/Web/API/TransformStream)
- [WHATWG Streams Standard](https://streams.spec.whatwg.org/)

### Hono

- [Hono Streaming Helper](https://hono.dev/docs/helpers/streaming)

### Streamlit

- [Streamlit st.write_stream](https://docs.streamlit.io/library/api-reference/write-magic/st.write_stream)
