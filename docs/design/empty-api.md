# kt.empty API 設計書

作成日: 2026-01-11

## 実装ステータス

> **✅ 完了** (2026-01-11)

---

## 1. 概要

### 1.1 目的

Streamlit の `st.empty()` に相当する機能を kantan-ui に実装する。プレースホルダーを作成し、後から任意のコンテンツで動的に置き換え可能にする。

### 1.2 ユースケース

| ユースケース | 説明 |
|-------------|------|
| ローディング表示 | 処理中は spinner を表示し、完了後に結果を表示 |
| 動的ステータス | 複数ステップの処理で状態を更新 |
| 条件付き表示 | 条件に応じてコンテンツを表示/非表示 |
| プログレス表示 | 進捗状況をリアルタイムで更新 |
| アラート置換 | 一時的なメッセージを別のメッセージで置換 |

### 1.3 設計原則

| 原則 | 説明 |
|------|------|
| **Streamlit互換** | `st.empty()` と同様の使用感を提供 |
| **型安全** | メソッド補完が効くTypescript設計 |
| **既存パターン準拠** | kantan-ui の `wrapWidget` パターンに従う |
| **rerunモデル対応** | kantan-ui のrerun実行モデルと整合 |

---

## 2. API設計

### 2.1 基本API

```typescript
// プレースホルダーを作成
const placeholder = kt.empty();

// コンテンツを設定
placeholder.write("Loading...");

// 別のコンテンツで置換
placeholder.success("Complete!");

// クリア
placeholder.empty();
```

### 2.2 シグネチャ

```typescript
function empty(config?: EmptyConfig): Placeholder;
```

### 2.3 使用例

```typescript
import { kt } from "kantan-ui";

// 1. ローディング → 完了表示
const status = kt.empty();
status.spinner("Processing...");
await doSomething();
status.success("Complete!");

// 2. プログレス表示
const progress = kt.empty({ key: "progress" });
for (let i = 0; i <= 100; i += 10) {
  progress.progress(i / 100);
  await sleep(100);
}
progress.text("Done!");

// 3. 条件付き表示
const alert = kt.empty();
if (hasError) {
  alert.error("Something went wrong");
} else if (hasWarning) {
  alert.warning("Please check your input");
} else {
  alert.empty(); // 何も表示しない
}

// 4. 動的カウントダウン
const countdown = kt.empty();
for (let i = 5; i > 0; i--) {
  countdown.text(`Starting in ${i}...`);
  await sleep(1000);
}
countdown.success("Go!");

// 5. フォーム送信フィードバック
if (kt.button("Submit")) {
  const feedback = kt.empty();
  feedback.spinner("Submitting...");

  try {
    await submitForm();
    feedback.success("Submitted successfully!");
  } catch (e) {
    feedback.error("Submission failed");
  }
}
```

---

## 3. 型定義

### 3.1 EmptyConfig

```typescript
/**
 * kt.empty() の設定オプション
 */
export interface EmptyConfig {
  /** ウィジェットキー（状態保持用） */
  key?: string;
}
```

### 3.2 Placeholder

```typescript
/**
 * プレースホルダーオブジェクト
 * 動的にコンテンツを設定・置換可能
 */
export interface Placeholder {
  // ========== 識別子 ==========
  /** プレースホルダーID */
  readonly id: string;

  // ========== 出力系 ==========
  /** テキスト/数値/真偽値を表示 */
  write(content: string | number | boolean): void;

  /** プレーンテキストを表示 */
  text(content: string): void;

  /** Markdownを表示 */
  markdown(content: string): void;

  /** 生HTMLを表示（注意: XSSリスク） */
  html(content: string): void;

  /** JSONをフォーマット表示 */
  json(data: unknown): void;

  /** コードブロックを表示 */
  code(content: string, language?: string): void;

  // ========== アラート系 ==========
  /** 成功メッセージ */
  success(message: string): void;

  /** エラーメッセージ */
  error(message: string): void;

  /** 警告メッセージ */
  warning(message: string): void;

  /** 情報メッセージ */
  info(message: string): void;

  // ========== フィードバック系 ==========
  /** プログレスバー (0.0 ~ 1.0) */
  progress(value: number, config?: ProgressConfig): void;

  /** スピナー（ローディング表示） */
  spinner(text?: string): void;

  // ========== ウィジェット系（値を返す） ==========
  /** ボタン */
  button(label: string, config?: ButtonConfig): boolean;

  /** 画像表示 */
  image(src: string, config?: ImageConfig): void;

  // ========== コントロール ==========
  /** コンテンツをクリア */
  empty(): void;
}
```

### 3.3 PlaceholderState（内部）

```typescript
/**
 * プレースホルダーの内部状態（セッション状態に保存）
 */
interface PlaceholderState {
  /** 現在のHTML */
  html: string;

  /** コンテンツタイプ */
  contentType: PlaceholderContentType;

  /** ウィジェット値（button等の場合） */
  widgetValue?: unknown;
}

type PlaceholderContentType =
  | "empty"
  | "write"
  | "text"
  | "markdown"
  | "html"
  | "json"
  | "code"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "progress"
  | "spinner"
  | "button"
  | "image";
```

---

## 4. アーキテクチャ

### 4.1 システム構成

```
┌─────────────────────────────────────────────────────────────────┐
│  kt.empty() 呼び出し                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 1. Placeholder ID 生成                                  │    │
│  │    - key指定あり: そのまま使用                          │    │
│  │    - key指定なし: generateWidgetId()                   │    │
│  └────────────────────┬────────────────────────────────────┘    │
│                       │                                         │
│                       ▼                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 2. プレースホルダーHTML出力                             │    │
│  │    <div id="kt-empty-{id}" class="kt-empty">            │    │
│  │      {現在のコンテンツHTML}                              │    │
│  │    </div>                                               │    │
│  └────────────────────┬────────────────────────────────────┘    │
│                       │                                         │
│                       ▼                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 3. Placeholder オブジェクト返却                         │    │
│  │    - 各メソッドは状態を更新                             │    │
│  │    - 状態更新 → rerun → HTML再生成                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 データフロー

```
1. kt.empty() 呼び出し
   └─▶ Placeholder ID 生成
   └─▶ 初期状態取得（または空状態を初期化）
   └─▶ プレースホルダーコンテナHTML出力
   └─▶ Placeholder オブジェクト返却

2. placeholder.write("Hello") 呼び出し
   └─▶ PlaceholderState 更新
       { html: "<div class='kt-write'>Hello</div>", contentType: "write" }
   └─▶ setWidgetValue(id, state)
   └─▶ （同一rerun内では即座にHTMLに反映）

3. 次回 rerun 時
   └─▶ kt.empty() が呼ばれる
   └─▶ 保存された状態からHTMLを復元
   └─▶ プレースホルダーコンテナ内に表示
```

### 4.3 ファイル構成

```
src/
├── widgets/
│   ├── types.ts              # EmptyConfig, Placeholder 型定義追加
│   ├── empty.ts              # empty() 命令型関数
│   └── placeholder.ts        # Placeholder クラス実装
│
├── kt/
│   ├── empty.ts              # kt.empty() 宣言型ラッパー
│   └── index.ts              # empty エクスポート追加
│
└── styles/
    └── default.ts            # .kt-empty スタイル追加

tests/
└── unit/
    ├── widgets/
    │   ├── empty.test.ts
    │   └── placeholder.test.ts
    └── kt/
        └── empty.test.ts

e2e/
└── empty.spec.ts
```

---

## 5. 実装詳細

### 5.1 Placeholder 実装パターン

`kt.tabs` の `TabFunction` パターンを参考に、関数としてもオブジェクトとしても動作する設計。

```typescript
// src/widgets/placeholder.ts
export function createPlaceholder(id: string): Placeholder {
  const updateContent = (html: string, contentType: PlaceholderContentType) => {
    const state: PlaceholderState = { html, contentType };
    setWidgetValue(id, state);
  };

  return {
    id,

    write(content: string | number | boolean): void {
      const html = `<div class="kt-write">${escapeHtml(String(content))}</div>`;
      updateContent(html, "write");
    },

    text(content: string): void {
      const html = `<p class="kt-text">${escapeHtml(content)}</p>`;
      updateContent(html, "text");
    },

    success(message: string): void {
      const html = `<div class="kt-alert kt-alert-success">${escapeHtml(message)}</div>`;
      updateContent(html, "success");
    },

    error(message: string): void {
      const html = `<div class="kt-alert kt-alert-error">${escapeHtml(message)}</div>`;
      updateContent(html, "error");
    },

    spinner(text?: string): void {
      const label = text ? `<span>${escapeHtml(text)}</span>` : "";
      const html = `<div class="kt-spinner">${label}</div>`;
      updateContent(html, "spinner");
    },

    progress(value: number): void {
      const percent = Math.max(0, Math.min(100, value * 100));
      const html = `<progress class="kt-progress" value="${percent}" max="100"></progress>`;
      updateContent(html, "progress");
    },

    empty(): void {
      updateContent("", "empty");
    },

    // ... 他のメソッド
  };
}
```

### 5.2 kt.empty() 実装

```typescript
// src/kt/empty.ts
import { requireRenderContext } from "./context";
import { generateWidgetId } from "../widgets/registry";
import { getWidgetValue } from "../widgets/registry";
import { createPlaceholder } from "../widgets/placeholder";
import type { EmptyConfig, Placeholder, PlaceholderState } from "../widgets/types";

export function empty(config?: EmptyConfig): Placeholder {
  const ctx = requireRenderContext();
  const id = generateWidgetId(config?.key);

  // 現在の状態を取得（なければ空）
  const state = getWidgetValue<PlaceholderState>(id, { html: "", contentType: "empty" });

  // プレースホルダーコンテナを出力
  ctx.append(`<div id="kt-empty-${id}" class="kt-empty">${state.html}</div>`);

  // Placeholder オブジェクトを返却
  return createPlaceholder(id);
}
```

### 5.3 HTML構造

```html
<!-- 空状態 -->
<div id="kt-empty-widget_0" class="kt-empty"></div>

<!-- write("Hello") 後 -->
<div id="kt-empty-widget_0" class="kt-empty">
  <div class="kt-write">Hello</div>
</div>

<!-- spinner("Loading...") 後 -->
<div id="kt-empty-widget_0" class="kt-empty">
  <div class="kt-spinner">
    <span>Loading...</span>
  </div>
</div>

<!-- success("Done!") 後 -->
<div id="kt-empty-widget_0" class="kt-empty">
  <div class="kt-alert kt-alert-success">Done!</div>
</div>
```

### 5.4 CSSスタイル

```css
.kt-empty {
  /* コンテナ自体は透明、中身のみ表示 */
  display: contents;
}

/* 空の場合は非表示 */
.kt-empty:empty {
  display: none;
}

/* スピナーアニメーション */
.kt-spinner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.kt-spinner::before {
  content: "";
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--kt-color-border);
  border-top-color: var(--kt-color-primary);
  border-radius: 50%;
  animation: kt-spin 0.8s linear infinite;
}

@keyframes kt-spin {
  to { transform: rotate(360deg); }
}
```

---

## 6. イテレーション計画

TDDサイクル（Red → Green → Refactor）に従い実装。

### Phase 1: 基盤

#### Iteration 1.1: 型定義

**目標**: EmptyConfig, Placeholder, PlaceholderState の型定義

**作業内容**:
- `src/widgets/types.ts` に型を追加

**成果物**: 型定義

---

#### Iteration 1.2: Placeholder クラス

**目標**: Placeholder オブジェクトの実装

**Red（テスト作成）**:
```typescript
// tests/unit/widgets/placeholder.test.ts
describe("createPlaceholder", () => {
  it("has readonly id property", () => {
    const p = createPlaceholder("test-id");
    expect(p.id).toBe("test-id");
  });

  it("write() updates state with escaped HTML", () => {
    const p = createPlaceholder("test-id");
    p.write("<script>alert(1)</script>");
    const state = getWidgetValue("test-id");
    expect(state.html).toContain("&lt;script&gt;");
    expect(state.contentType).toBe("write");
  });

  it("success() creates alert HTML", () => {
    const p = createPlaceholder("test-id");
    p.success("Done!");
    const state = getWidgetValue("test-id");
    expect(state.html).toContain("kt-alert-success");
  });

  it("empty() clears content", () => {
    const p = createPlaceholder("test-id");
    p.write("Hello");
    p.empty();
    const state = getWidgetValue("test-id");
    expect(state.html).toBe("");
    expect(state.contentType).toBe("empty");
  });

  it("spinner() creates spinner HTML", () => {
    const p = createPlaceholder("test-id");
    p.spinner("Loading...");
    const state = getWidgetValue("test-id");
    expect(state.html).toContain("kt-spinner");
    expect(state.html).toContain("Loading...");
  });

  it("progress() clamps value between 0 and 1", () => {
    const p = createPlaceholder("test-id");
    p.progress(1.5);
    const state = getWidgetValue("test-id");
    expect(state.html).toContain('value="100"');
  });
});
```

**Green（実装）**:
- `src/widgets/placeholder.ts` を作成

**成果物**: `src/widgets/placeholder.ts`

---

### Phase 2: kt.empty() 統合

#### Iteration 2.1: empty() 命令型関数

**目標**: 状態取得とID生成ロジック

**Red（テスト作成）**:
```typescript
// tests/unit/widgets/empty.test.ts
describe("empty (imperative)", () => {
  it("generates unique ID when key not provided", () => {
    resetWidgetCounter();
    const p1 = empty();
    const p2 = empty();
    expect(p1.id).not.toBe(p2.id);
  });

  it("uses provided key as ID", () => {
    const p = empty({ key: "my-placeholder" });
    expect(p.id).toBe("my-placeholder");
  });

  it("restores state from previous run", () => {
    setWidgetValue("test-key", { html: "<p>Previous</p>", contentType: "text" });
    const p = empty({ key: "test-key" });
    // Placeholder は以前の状態を保持
  });
});
```

**Green（実装）**:
- `src/widgets/empty.ts` を作成

**成果物**: `src/widgets/empty.ts`

---

#### Iteration 2.2: kt.empty() 宣言的API

**目標**: RenderContext への HTML 出力と kt 名前空間統合

**Red（テスト作成）**:
```typescript
// tests/unit/kt/empty.test.ts
describe("kt.empty", () => {
  it("appends placeholder container to render context", () => {
    const ctx = createMockRenderContext();
    setRenderContext(ctx);
    kt.empty();
    expect(ctx.getHtml()).toContain('class="kt-empty"');
  });

  it("includes current state HTML in container", () => {
    setWidgetValue("my-key", { html: "<p>Hello</p>", contentType: "text" });
    const ctx = createMockRenderContext();
    setRenderContext(ctx);
    kt.empty({ key: "my-key" });
    expect(ctx.getHtml()).toContain("<p>Hello</p>");
  });

  it("returns Placeholder object", () => {
    const ctx = createMockRenderContext();
    setRenderContext(ctx);
    const p = kt.empty();
    expect(typeof p.write).toBe("function");
    expect(typeof p.empty).toBe("function");
  });
});
```

**Green（実装）**:
- `src/kt/empty.ts` を作成
- `src/kt/index.ts` に追加

**成果物**: `src/kt/empty.ts`, `src/kt/index.ts` 更新

---

### Phase 3: スタイルとE2E

#### Iteration 3.1: CSSスタイル

**目標**: .kt-empty, .kt-spinner スタイル

**作業内容**:
- `src/styles/default.ts` にスタイル追加

**成果物**: スタイル定義

---

#### Iteration 3.2: E2Eテスト

**目標**: Playwrightによる統合テスト

**作業内容**:
```typescript
// e2e/empty.spec.ts
test.describe("kt.empty", () => {
  test("updates content dynamically", async ({ page }) => {
    await page.goto("/empty-demo");

    // 初期状態
    await expect(page.locator(".kt-empty")).toBeEmpty();

    // ボタンクリックでコンテンツ更新
    await page.click('button:has-text("Show Message")');
    await expect(page.locator(".kt-empty")).toContainText("Hello!");

    // クリアボタン
    await page.click('button:has-text("Clear")');
    await expect(page.locator(".kt-empty")).toBeEmpty();
  });

  test("shows spinner then success", async ({ page }) => {
    await page.goto("/empty-demo");

    await page.click('button:has-text("Start Process")');
    await expect(page.locator(".kt-spinner")).toBeVisible();

    // 処理完了後
    await expect(page.locator(".kt-alert-success")).toBeVisible({ timeout: 5000 });
  });
});
```

**成果物**: `e2e/empty.spec.ts`

---

## 7. 検討事項

### 7.1 rerunモデルとの整合性

kantan-ui は rerun モデルを採用しており、状態変更時にスクリプト全体が再実行される。

**重要な制限事項**:

kantan-ui のアーキテクチャでは、プレースホルダーの状態更新は**次回のrerunまで表示に反映されません**。

```typescript
// 以下のコードでは、ボタンクリック時にスピナーは表示されない
const status = kt.empty({ key: "status" });
if (kt.button("Process")) {
  status.spinner("Processing...");  // 状態は保存されるが、HTMLは既に生成済み
}
```

**動作フロー**:
1. `kt.empty()` が呼ばれる → 現在の状態（空）でHTMLを生成
2. `kt.button()` が `true` を返す（クリックされた）
3. `status.spinner()` が呼ばれる → 状態を「スピナー」に更新
4. rerun完了 → クライアントには空のプレースホルダーが送信される
5. **次回rerun時に**スピナーが表示される

**推奨される使用パターン**:

```typescript
// パターン1: 状態に基づく条件分岐
const status = kt.empty({ key: "status" });
const isProcessing = getState("isProcessing", false);

if (isProcessing) {
  status.spinner("Processing...");
}

if (kt.button("Start") && !isProcessing) {
  setState("isProcessing", true);
  // 処理開始
}

// パターン2: 非同期処理後の状態更新
// （WebSocket経由で状態が更新され、自動的にrerunがトリガーされる）
```

**Streamlitとの違い**:
Streamlit の `st.empty()` は即座にUIを更新できますが、これはStreamlitがWebSocket経由でリアルタイムにDOMを操作する仕組みを持っているためです。kantan-ui の現在のアーキテクチャでは、状態変更は次回rerunまで反映されません。

### 7.2 ウィジェットメソッドの戻り値

`placeholder.button()` のようなウィジェットメソッドは値を返す必要がある。

**解決策**:
- ウィジェット値は `PlaceholderState.widgetValue` に保存
- rerun時にこの値を参照して返却

```typescript
button(label: string, config?: ButtonConfig): boolean {
  const buttonId = `${this.id}_button`;
  const pressed = isButtonPressed(buttonId);

  const html = renderButton(label, { ...config, key: buttonId });
  this.updateContent(html, "button", pressed);

  return pressed;
}
```

### 7.3 ネスト呼び出し

プレースホルダー内でプレースホルダーを使用するケース。

```typescript
const outer = kt.empty();
outer.write("Outer content");

// これは非推奨だが、エラーにはしない
const inner = kt.empty();
inner.write("Inner content");
```

**方針**: 特別な制限は設けず、通常のウィジェットと同様に扱う。

---

## 8. 非実装項目（将来検討）

以下は初期実装では含めない。

| 項目 | 理由 |
|------|------|
| `placeholder.chart()` | チャート機能自体が未実装 |
| `placeholder.dataframe()` | データフレーム機能が未実装 |
| `placeholder.container()` | 複雑度が高い、ユースケースが少ない |
| アニメーション遷移 | 初期実装では不要 |

---

## 9. チェックリスト

### 実装前

- [x] 既存の `wrapWidget` パターンを確認
- [x] `kt.tabs` の `TabFunction` 実装を参考にする
- [x] セッション状態管理の仕組みを確認

### 各イテレーション後

- [x] `bun run lint:fix` 実行
- [x] `bun run test` 実行
- [x] コミット

### 完了時

- [x] `bun run ci` 全パス
- [x] 全メソッドのテストがある
- [x] E2Eテストがパス
- [x] ドキュメント更新

---

## 10. 参考資料

- [Streamlit st.empty](https://docs.streamlit.io/develop/api-reference/layout/st.empty)
- kantan-ui 既存実装
  - `src/kt/sidebar.ts` - コンテキスト切り替えパターン
  - `src/widgets/tabs.ts` - TabFunction パターン
  - `src/widgets/registry.ts` - 状態管理
