# kt.chat_input() 設計書

## 1. 概要

### 1.1 目的
Streamlitの`st.chat_input()`相当の専用チャット入力ウィジェットを提供する。
画面下部に固定表示され、Enterキーで送信可能なチャット専用UIを実現する。

### 1.2 Streamlitとの比較

| 機能 | Streamlit `st.chat_input` | kantan-ui `kt.chat_input` |
|------|---------------------------|---------------------------|
| 基本入力 | ✅ | ✅ |
| 画面下部固定 | ✅ (自動) | ✅ (オプション、デフォルトtrue) |
| 戻り値 | `str \| None` | `string \| null` |
| 複数行入力 | ✅ | ✅ (Shift+Enter) |
| IME対応 | ✅ | ✅ |
| ファイル添付 | ✅ (2025) | ⏳ Phase 2 |
| 音声入力 | ✅ (2025) | ⏳ Phase 3 |
| 型安全性 | ❌ | ✅ TypeScript |

### 1.3 設計方針
- **Web標準優先**: 外部依存なし、Honoのみ
- **既存パターン踏襲**: プロジェクト内の実装パターンを活用
- **セキュリティ**: XSS対策、入力検証を徹底
- **アクセシビリティ**: ARIA属性、キーボード操作対応

---

## 2. API設計

### 2.1 関数シグネチャ

```typescript
function chat_input(
  placeholder?: string,
  config?: Partial<ChatInputConfig>
): string | null;
```

### 2.2 型定義

```typescript
/**
 * チャット入力の設定
 */
export interface ChatInputConfig {
  /** ウィジェットの一意キー */
  key?: string;

  /** 無効化 */
  disabled?: boolean;

  /** 最大文字数 */
  maxLength?: number;

  /** 画面下部に固定表示（デフォルト: true） */
  pinToBottom?: boolean;

  /** 送信ボタンのラベル（デフォルト: "送信"） */
  submitLabel?: string;

  /** 送信ボタンを非表示にする（Enterのみで送信） */
  hideSubmitButton?: boolean;
}
```

### 2.3 戻り値

| 状態 | 戻り値 | 説明 |
|------|--------|------|
| 未送信（通常描画時） | `null` | ユーザーがまだ送信していない |
| 送信時（空でない入力） | `string` | 入力されたテキスト（トリム済み） |
| 送信時（空入力） | `null` | 空文字は送信されない |

### 2.4 `text_input`との違い

| 機能 | `text_input` | `chat_input` |
|------|-------------|--------------|
| 入力形式 | `<input>` | `<textarea>` |
| 複数行 | ❌ | ✅ (Shift+Enter) |
| 戻り値タイミング | 常に現在値 | 送信時のみ値/null |
| 送信方法 | 自動（input event） | Enter or ボタン |
| 画面固定 | ❌ | ✅ (オプション) |
| 送信後クリア | 手動 | 自動 |
| イベントタイプ | `data-kt-event="input"` | `data-kt-event="chat-submit"` |

---

## 3. 使用例

### 3.1 基本的な使用法

```typescript
import { createApp, createTypedSessionState, kt } from "kantan-ui";

type Message = { role: "user" | "assistant"; content: string };
type State = { messages: Message[] };

const state = createTypedSessionState<State>({ messages: [] });

const script = () => {
  kt.title("チャット");

  // メッセージ表示
  kt.chat_container(() => {
    for (const msg of state.messages) {
      kt.chat_message(msg.role, msg.content);
    }
  });

  // チャット入力（画面下部に固定）
  const userInput = kt.chat_input("メッセージを入力...");

  if (userInput) {
    // 送信時のみ実行される
    state.messages.push({ role: "user", content: userInput });

    // AI応答（実際はLLM APIを呼び出す）
    const response = generateResponse(userInput);
    state.messages.push({ role: "assistant", content: response });
  }
};
```

### 3.2 詳細設定

```typescript
const input = kt.chat_input("質問を入力してください", {
  key: "main_chat",
  maxLength: 1000,
  submitLabel: "送る",
  pinToBottom: true,
});
```

### 3.3 インラインモード（固定しない）

```typescript
kt.columns([1, 1], (col) => {
  if (col === 0) {
    kt.chat_container(() => {
      for (const msg of state.messages) {
        kt.chat_message(msg.role, msg.content);
      }
    });

    // このカラム内に配置（固定しない）
    const input = kt.chat_input("返信を入力", {
      pinToBottom: false
    });
  }
});
```

### 3.4 送信ボタン非表示

```typescript
// Enterキーのみで送信（モバイル非推奨）
const input = kt.chat_input("メッセージ", {
  hideSubmitButton: true,
});
```

---

## 4. HTML構造

### 4.1 生成されるHTML

```html
<!-- pinToBottom: true (デフォルト) -->
<div class="kt-chat-input-wrapper kt-chat-input-pinned">
  <div class="kt-chat-input-container">
    <textarea
      id="kt-widget-xxx"
      class="kt-chat-input-field"
      placeholder="メッセージを入力..."
      data-kt-event="chat-submit"
      rows="1"
      aria-label="チャットメッセージ入力"
    ></textarea>
    <button
      type="button"
      class="kt-chat-input-submit"
      data-kt-event="click"
      data-kt-trigger="kt-widget-xxx"
      aria-label="送信"
    >
      送信
    </button>
  </div>
</div>
```

### 4.2 属性説明

| 属性 | 説明 |
|------|------|
| `data-kt-event="chat-submit"` | チャット送信用の新イベントタイプ |
| `data-kt-trigger="xxx"` | 送信ボタンが対象とするtextareaのID |
| `rows="1"` | 初期高さ（自動リサイズで変化） |

---

## 5. CSS設計

### 5.1 スタイル定義

```css
/* ========================================
   Chat Input Styles
   ======================================== */

/* Wrapper */
.kt-chat-input-wrapper {
  width: 100%;
  background: #ffffff;
  padding: 0.75rem;
  border-top: 1px solid #e9ecef;
  box-sizing: border-box;
}

/* 画面下部固定 */
.kt-chat-input-pinned {
  position: sticky;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
}

/* Container (flex layout) */
.kt-chat-input-container {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
  max-width: 800px;
  margin: 0 auto;
}

/* Input field (textarea) */
.kt-chat-input-field {
  flex: 1;
  min-height: 44px;
  max-height: 200px;
  padding: 0.625rem 0.75rem;
  border: 1px solid #ced4da;
  border-radius: 22px;
  font-family: inherit;
  font-size: 1rem;
  line-height: 1.5;
  resize: none;
  overflow-y: auto;
  box-sizing: border-box;
}

.kt-chat-input-field:focus {
  outline: none;
  border-color: #4a90d9;
  box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.2);
}

.kt-chat-input-field:disabled {
  background: #f8f9fa;
  color: #6c757d;
  cursor: not-allowed;
}

.kt-chat-input-field::placeholder {
  color: #adb5bd;
}

/* Submit button */
.kt-chat-input-submit {
  flex-shrink: 0;
  height: 44px;
  min-width: 44px;
  padding: 0 1.25rem;
  background: #4a90d9;
  color: white;
  border: none;
  border-radius: 22px;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
}

.kt-chat-input-submit:hover:not(:disabled) {
  background: #357abd;
}

.kt-chat-input-submit:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.4);
}

.kt-chat-input-submit:disabled {
  background: #adb5bd;
  cursor: not-allowed;
}

/* レスポンシブ対応 */
@media (max-width: 640px) {
  .kt-chat-input-wrapper {
    padding: 0.5rem;
  }

  .kt-chat-input-container {
    gap: 0.375rem;
  }

  .kt-chat-input-field {
    padding: 0.5rem 0.625rem;
    font-size: 16px; /* iOS zoom防止 */
  }

  .kt-chat-input-submit {
    padding: 0 0.75rem;
    font-size: 0.8125rem;
  }
}
```

### 5.2 配置場所

`src/styles/default.ts` の `chatStyles` セクションに追加

---

## 6. クライアントサイド JavaScript

### 6.1 追加するスクリプト

```javascript
/**
 * チャット入力の自動リサイズ
 */
const chatInputResizeScript = `
function initChatInputResize() {
  const inputs = document.querySelectorAll(".kt-chat-input-field:not([data-kt-resize-init])");
  inputs.forEach((textarea) => {
    textarea.dataset.ktResizeInit = "true";

    function resize() {
      textarea.style.height = "auto";
      const maxHeight = 200;
      textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + "px";
    }

    textarea.addEventListener("input", resize);
    // 初期サイズ調整
    resize();
  });
}
`;

/**
 * チャット送信ハンドラ（Enterキー）
 */
const chatSubmitScript = `
function setupChatSubmitHandler(sendEvent) {
  const app = document.getElementById("app");

  // Enterキーで送信（Shift+Enterは改行）
  app.addEventListener("keydown", (e) => {
    if (isComposing) return; // IME入力中は無視

    const target = e.target;
    if (!target.dataset || target.dataset.ktEvent !== "chat-submit") return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitChatInput(target, sendEvent);
    }
  });

  // 送信ボタンクリック
  app.addEventListener("click", (e) => {
    const btn = e.target.closest(".kt-chat-input-submit[data-kt-trigger]");
    if (!btn) return;

    const targetId = btn.dataset.ktTrigger;
    const textarea = document.getElementById(targetId);
    if (textarea) {
      submitChatInput(textarea, sendEvent);
    }
  });
}

function submitChatInput(textarea, sendEvent) {
  const value = textarea.value.trim();
  if (!value || !textarea.id) return;

  // サーバーに送信
  sendEvent(textarea.id, value);

  // 入力をクリア
  textarea.value = "";
  textarea.style.height = "auto";

  // フォーカスを維持
  textarea.focus();
}
`;
```

### 6.2 統合方法

`src/client/script.ts` の `generateClientScript()` に追加:

```typescript
// 1. スクリプト定義を追加
const chatInputResizeScript = `...`;
const chatSubmitScript = `...`;

// 2. websocketScript内の初期化に追加
const websocketScript = `
  // ... existing code ...

  // 初期化
  connect();
  setupEventDelegation(window.sendEvent);
  setupChatSubmitHandler(window.sendEvent);  // 追加
  initSidebarToggle();
`;

// 3. DOM更新後の再初期化に追加
ws.onmessage = (e) => {
  // ... existing code ...

  if (msg.type === "patch" && msg.patches) {
    // ... existing code ...

    // Initialize components after DOM update
    initToasts();
    initChatAutoScroll();
    autoScrollChat();
    initChatInputResize();  // 追加
  }
};

// 4. generateClientScript の return に追加
return [
  configScript,
  connectionIndicatorScript,
  focusManagementScript,
  xssDetectionScript,
  patchApplyScript,
  chatAutoScrollScript,
  chatInputResizeScript,   // 追加
  chatSubmitScript,        // 追加
  sidebarToggleScript,
  toastScript,
  eventHandlingScript,
  websocketScript,
].join("\n");
```

---

## 7. サーバーサイド実装

### 7.1 ファイル構成

```
src/
├── kt/
│   └── chat.ts              # chat_input を追加（既存ファイル拡張）
├── widgets/
│   ├── chat-input.ts        # 新規: ロジック実装
│   └── types.ts             # ChatInputConfig 追加
├── styles/
│   └── default.ts           # CSS追加
└── client/
    └── script.ts            # クライアントJS追加
```

### 7.2 widgets/chat-input.ts

```typescript
import { escapeHtml } from "../utils/html";
import { generateWidgetId, getWidgetValue } from "./registry";
import type { ChatInputConfig } from "./types";

/**
 * チャット入力ウィジェット（命令的API）
 * 送信時のみ値を返し、通常時はnullを返す
 */
export function chat_input(
  _placeholder: string,
  config?: Partial<ChatInputConfig>
): string | null {
  const id = generateWidgetId(config?.key);
  // 送信されたテキストを取得（送信後はクリアされる）
  const value = getWidgetValue<string | null>(id, null);
  return value && typeof value === "string" ? value : null;
}

/**
 * チャット入力のHTMLをレンダリング
 */
export function renderChatInput(
  placeholder: string,
  config?: Partial<ChatInputConfig>
): string {
  const id = generateWidgetId(config?.key);
  const escapedPlaceholder = escapeHtml(placeholder || "メッセージを入力...");
  const disabled = config?.disabled ? " disabled" : "";
  const maxLength = validateMaxLength(config?.maxLength);
  const maxLengthAttr = maxLength ? ` maxlength="${maxLength}"` : "";
  const pinClass = config?.pinToBottom !== false ? " kt-chat-input-pinned" : "";
  const submitLabel = escapeHtml(config?.submitLabel || "送信");
  const buttonStyle = config?.hideSubmitButton ? ' style="display:none"' : "";
  const ariaLabel = escapeHtml(placeholder || "チャットメッセージ入力");

  return `<div class="kt-chat-input-wrapper${pinClass}">
  <div class="kt-chat-input-container">
    <textarea
      id="${id}"
      class="kt-chat-input-field"
      placeholder="${escapedPlaceholder}"
      data-kt-event="chat-submit"
      rows="1"
      aria-label="${ariaLabel}"${disabled}${maxLengthAttr}></textarea>
    <button
      type="button"
      class="kt-chat-input-submit"
      data-kt-event="click"
      data-kt-trigger="${id}"
      aria-label="送信"${disabled}${buttonStyle}>${submitLabel}</button>
  </div>
</div>`;
}

/**
 * maxLengthの検証
 */
function validateMaxLength(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return undefined;
  // 最大値を制限（DoS防止）
  return Math.min(num, 100000);
}
```

### 7.3 widgets/types.ts への追加

```typescript
/**
 * チャット入力の設定
 */
export interface ChatInputConfig {
  /** ウィジェットの一意キー */
  key?: string;

  /** 無効化 */
  disabled?: boolean;

  /** 最大文字数 */
  maxLength?: number;

  /** 画面下部に固定表示（デフォルト: true） */
  pinToBottom?: boolean;

  /** 送信ボタンのラベル（デフォルト: "送信"） */
  submitLabel?: string;

  /** 送信ボタンを非表示にする */
  hideSubmitButton?: boolean;
}
```

### 7.4 kt/chat.ts への追加

```typescript
// 既存のimportに追加
import {
  chat_input as imperativeChatInput,
  renderChatInput
} from "../widgets/chat-input";
import type { ChatInputConfig } from "../widgets/types";

// 既存のexportに追加
export type { ChatInputConfig };

/**
 * チャット入力ウィジェット（宣言的API）
 *
 * 送信時のみ入力テキストを返し、通常時はnullを返す。
 * 画面下部に固定表示され、Enterキーで送信可能。
 *
 * @param placeholder - プレースホルダーテキスト
 * @param config - オプション設定
 * @returns 送信されたテキスト、または null
 *
 * @example
 * ```typescript
 * const userInput = kt.chat_input("メッセージを入力...");
 *
 * if (userInput) {
 *   // ユーザーが送信した時のみ実行
 *   state.messages.push({ role: "user", content: userInput });
 * }
 * ```
 */
export function chat_input(
  placeholder?: string,
  config?: Partial<ChatInputConfig>
): string | null {
  const ctx = requireRenderContext();
  const id = generateWidgetId(config?.key);
  const configWithId = { ...config, key: id };

  // 値を取得
  const value = imperativeChatInput(placeholder ?? "", configWithId);

  // HTMLをレンダリング
  ctx.append(renderChatInput(placeholder ?? "", configWithId));

  return value;
}
```

### 7.5 kt/index.ts への追加

```typescript
// 既存のexportに追加
export { chat_input } from "./chat";
export type { ChatInputConfig } from "../widgets/types";
```

---

## 8. テスト計画

### 8.1 ユニットテスト

```typescript
// tests/unit/widgets/chat-input.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { renderChatInput, chat_input } from "../../../src/widgets/chat-input";
import { clearWidgetRegistry } from "../../../src/widgets/registry";

describe("chat_input", () => {
  beforeEach(() => {
    clearWidgetRegistry();
  });

  describe("renderChatInput", () => {
    it("renders basic chat input", () => {
      const html = renderChatInput("メッセージを入力");

      expect(html).toContain('class="kt-chat-input-wrapper kt-chat-input-pinned"');
      expect(html).toContain('placeholder="メッセージを入力"');
      expect(html).toContain('data-kt-event="chat-submit"');
      expect(html).toContain(">送信</button>");
    });

    it("renders without pin when pinToBottom is false", () => {
      const html = renderChatInput("入力", { pinToBottom: false });

      expect(html).toContain('class="kt-chat-input-wrapper"');
      expect(html).not.toContain("kt-chat-input-pinned");
    });

    it("renders with custom submit label", () => {
      const html = renderChatInput("入力", { submitLabel: "送る" });

      expect(html).toContain(">送る</button>");
    });

    it("renders hidden submit button", () => {
      const html = renderChatInput("入力", { hideSubmitButton: true });

      expect(html).toContain('style="display:none"');
    });

    it("renders disabled state", () => {
      const html = renderChatInput("入力", { disabled: true });

      expect(html).toContain("disabled");
    });

    it("renders with maxLength", () => {
      const html = renderChatInput("入力", { maxLength: 500 });

      expect(html).toContain('maxlength="500"');
    });

    it("escapes XSS in placeholder", () => {
      const html = renderChatInput('<script>alert("xss")</script>');

      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });

    it("escapes XSS in submitLabel", () => {
      const html = renderChatInput("入力", {
        submitLabel: '<img onerror="alert(1)">'
      });

      expect(html).not.toContain("onerror");
    });
  });

  describe("chat_input value handling", () => {
    it("returns null when no submission", () => {
      const value = chat_input("入力");

      expect(value).toBeNull();
    });
  });
});
```

### 8.2 E2Eテスト

```typescript
// tests/e2e/chat-input.spec.ts
import { test, expect } from "@playwright/test";

test.describe("chat_input", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // WebSocket接続を待機
    await page.waitForSelector("[data-kt-event='chat-submit']");
  });

  test("submits on Enter key", async ({ page }) => {
    const input = page.locator(".kt-chat-input-field");

    await input.fill("こんにちは");
    await input.press("Enter");

    // メッセージが表示されることを確認
    await expect(page.locator(".kt-chat-message-user")).toContainText("こんにちは");

    // 入力がクリアされることを確認
    await expect(input).toHaveValue("");
  });

  test("does not submit on Shift+Enter", async ({ page }) => {
    const input = page.locator(".kt-chat-input-field");

    await input.fill("行1");
    await input.press("Shift+Enter");
    await input.type("行2");

    // 改行が入力されることを確認
    await expect(input).toHaveValue("行1\n行2");
  });

  test("submits on button click", async ({ page }) => {
    const input = page.locator(".kt-chat-input-field");
    const button = page.locator(".kt-chat-input-submit");

    await input.fill("ボタン送信テスト");
    await button.click();

    await expect(page.locator(".kt-chat-message-user")).toContainText("ボタン送信テスト");
  });

  test("does not submit empty input", async ({ page }) => {
    const input = page.locator(".kt-chat-input-field");
    const messageCount = await page.locator(".kt-chat-message").count();

    await input.fill("   "); // 空白のみ
    await input.press("Enter");

    // メッセージ数が変わらないことを確認
    await expect(page.locator(".kt-chat-message")).toHaveCount(messageCount);
  });

  test("auto-resizes on input", async ({ page }) => {
    const input = page.locator(".kt-chat-input-field");

    const initialHeight = await input.evaluate(el => el.offsetHeight);

    // 複数行入力
    await input.fill("行1\n行2\n行3\n行4");

    const newHeight = await input.evaluate(el => el.offsetHeight);
    expect(newHeight).toBeGreaterThan(initialHeight);
  });

  test("respects maxLength", async ({ page }) => {
    // maxLength: 10 の設定でテスト
    const input = page.locator(".kt-chat-input-field[maxlength='10']");

    await input.fill("12345678901234567890");

    await expect(input).toHaveValue("1234567890");
  });

  test("disabled state prevents input", async ({ page }) => {
    const input = page.locator(".kt-chat-input-field:disabled");

    await expect(input).toBeDisabled();
  });

  test("handles IME composition", async ({ page }) => {
    const input = page.locator(".kt-chat-input-field");

    // IME入力をシミュレート
    await input.focus();
    await page.keyboard.insertText("日本語"); // composition完了後の入力
    await input.press("Enter");

    await expect(page.locator(".kt-chat-message-user")).toContainText("日本語");
  });
});
```

---

## 9. 実装イテレーション

### Phase 1: 基本実装（MVP）
1. [ ] `ChatInputConfig` 型定義を `widgets/types.ts` に追加
2. [ ] `widgets/chat-input.ts` を新規作成
3. [ ] `kt/chat.ts` に `chat_input` 関数を追加
4. [ ] CSS スタイルを `styles/default.ts` に追加
5. [ ] クライアントJS を `client/script.ts` に追加
6. [ ] ユニットテスト作成・実行
7. [ ] E2Eテスト作成・実行

### Phase 2: ファイル添付対応（将来）
```typescript
export interface ChatInputConfig {
  // ... existing ...

  /** ファイル添付を許可 */
  allowAttachments?: boolean;

  /** 許可するファイルタイプ */
  acceptFileTypes?: string[];

  /** 最大ファイルサイズ */
  maxFileSize?: number;
}

export interface ChatInputResult {
  text: string;
  attachments?: UploadedFile[];
}
```

### Phase 3: 音声入力対応（将来）
```typescript
export interface ChatInputConfig {
  // ... existing ...

  /** 音声入力を許可 */
  allowVoice?: boolean;

  /** 音声認識言語 */
  voiceLanguage?: string;
}
```

---

## 10. セキュリティ考慮事項

### 10.1 XSS対策
- `escapeHtml()` でユーザー入力をエスケープ
- プレースホルダー、ラベル、すべての表示テキストに適用

### 10.2 入力検証
- `maxLength` の上限値制限（100,000文字）
- 空白のみの入力は送信しない（`trim()`後に検証）
- 型検証: `maxLength` が数値であることを確認

### 10.3 DoS対策
- 最大文字数の強制上限
- クライアント・サーバー両方で検証

---

## 11. アクセシビリティ

### 11.1 ARIA属性
- `aria-label`: テキストエリアと送信ボタンに設定
- `role`: 必要に応じて追加

### 11.2 キーボード操作
- `Enter`: 送信
- `Shift+Enter`: 改行
- `Tab`: 送信ボタンへフォーカス移動

### 11.3 スクリーンリーダー対応
- プレースホルダーを `aria-label` に使用
- 送信完了のアナウンス（将来検討）

---

## 12. 使用するAPI一覧

### Web標準API
| API | 用途 |
|-----|------|
| `KeyboardEvent.key` | Enterキー検出 |
| `KeyboardEvent.shiftKey` | Shift+Enter判定 |
| `compositionstart/end` | IME入力検出 |
| `HTMLTextAreaElement.scrollHeight` | 自動リサイズ |
| `Element.closest()` | イベント委譲 |

### 既存プロジェクトAPI
| API | 用途 |
|-----|------|
| `escapeHtml()` | XSS対策 |
| `generateWidgetId()` | ID生成 |
| `getWidgetValue()` | 値取得 |
| `requireRenderContext()` | HTML出力 |
| `sendEvent()` | WebSocket送信 |

### Hono API
| API | 用途 |
|-----|------|
| なし（新規追加不要） | - |

---

## 13. 参考資料

- [Streamlit st.chat_input](https://docs.streamlit.io/develop/api-reference/chat/st.chat_input)
- [Streamlit Chat Elements](https://docs.streamlit.io/develop/api-reference/chat)
- [WCAG 2.1 Keyboard Accessible](https://www.w3.org/WAI/WCAG21/Understanding/keyboard-accessible)
- [MDN: KeyboardEvent](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent)
- [MDN: CompositionEvent](https://developer.mozilla.org/en-US/docs/Web/API/CompositionEvent)
