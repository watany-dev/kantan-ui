# Phase 2: Streamlit API互換性 - レイアウトとフィードバック

作成日: 2026-01-04

## 概要

Phase 1で基本ウィジェットを追加した後、Streamlitの重要なレイアウト機能とフィードバック機能を実装する。
これにより、より複雑なUIを構築できるようになる。

---

## 追加機能一覧

| # | 機能 | Streamlit API | 工数 | 優先度 |
|---|------|---------------|------|--------|
| 1 | columns | `st.columns(n)` | 中 | 高 |
| 2 | expander | `st.expander(label)` | 中 | 高 |
| 3 | container | `st.container()` | 小 | 中 |
| 4 | success/error/warning/info | `st.success(msg)` | 小 | 高 |
| 5 | spinner | `st.spinner(text)` | 中 | 中 |
| 6 | progress | `st.progress(value)` | 小 | 中 |
| 7 | toast | `st.toast(msg)` | 中 | 低 |
| 8 | form | `st.form(key)` | 高 | 中 |

---

## 1. kt.columns()

### API設計

Streamlitでは `with` 文を使うが、JavaScriptでは関数コールバックで実現する。

```typescript
// Streamlit
col1, col2 = st.columns(2)
with col1:
    st.write("Left")
with col2:
    st.write("Right")

// kantan-ui
kt.columns(2, (cols) => {
  cols[0](() => {
    kt.write("Left");
  });
  cols[1](() => {
    kt.write("Right");
  });
});

// または、よりシンプルなAPI
kt.columns([
  () => kt.write("Left"),
  () => kt.write("Right"),
]);
```

### 型定義

```typescript
type ColumnRenderer = (content: () => void) => void;

// Option A: カラム数指定
function columns(n: number, render: (cols: ColumnRenderer[]) => void): void;

// Option B: コンテンツ配列（推奨・シンプル）
function columns(contents: Array<() => void>, config?: ColumnsConfig): void;

interface ColumnsConfig {
  gap?: string;      // "1rem" など
  ratios?: number[]; // [1, 2, 1] で 25%-50%-25%
}
```

### 使用例

```typescript
// 基本的な2カラム
kt.columns([
  () => {
    kt.header("Left Column");
    kt.write("Some content here");
  },
  () => {
    kt.header("Right Column");
    if (kt.button("Click")) {
      state.clicked = true;
    }
  },
]);

// 比率指定（1:2:1 = 25%:50%:25%）
kt.columns(
  [
    () => kt.write("Sidebar"),
    () => kt.write("Main content"),
    () => kt.write("Sidebar"),
  ],
  { ratios: [1, 2, 1] }
);
```

### 実装

```typescript
// src/kt/layout.ts
export function columns(
  contents: Array<() => void>,
  config: ColumnsConfig = {}
): void {
  const ctx = getRenderContext();
  const gap = config.gap ?? "1rem";
  const ratios = config.ratios ?? contents.map(() => 1);
  const totalRatio = ratios.reduce((a, b) => a + b, 0);

  ctx.append(`<div class="kt-columns" style="display: flex; gap: ${gap};">`);

  contents.forEach((content, i) => {
    const width = (ratios[i] / totalRatio) * 100;
    ctx.append(`<div class="kt-column" style="flex: 0 0 ${width}%;">`);
    content();  // ネストされたコンテンツを実行
    ctx.append(`</div>`);
  });

  ctx.append(`</div>`);
}
```

### 課題と解決策

**課題**: コールバック内でのウィジェット状態管理

ウィジェットIDは呼び出し順で決まるため、columns内でも正しく動作する。
ただし、条件分岐でカラム数が変わる場合は明示的な `key` が必要。

```typescript
// 問題: カラム数が動的に変わるとIDがずれる
if (showExtra) {
  kt.columns([...]);  // 3カラム
} else {
  kt.columns([...]);  // 2カラム
}

// 解決: keyを使う
kt.columns([
  () => kt.button("A", { key: "btn_a" }),
  () => kt.button("B", { key: "btn_b" }),
]);
```

### 成果物

- [ ] `src/kt/layout.ts` 作成
- [ ] `columns` 関数実装
- [ ] CSS（kt-columns, kt-column）
- [ ] ユニットテスト
- [ ] E2Eテスト

---

## 2. kt.expander()

### API設計

```typescript
// Streamlit
with st.expander("See details"):
    st.write("Hidden content")

// kantan-ui
kt.expander("See details", () => {
  kt.write("Hidden content");
});

// またはデフォルト展開
kt.expander("See details", () => {
  kt.write("Hidden content");
}, { expanded: true });
```

### 型定義

```typescript
function expander(
  label: string,
  content: () => void,
  config?: ExpanderConfig
): void;

interface ExpanderConfig {
  expanded?: boolean;  // デフォルト: false
  key?: string;
}
```

### 実装

```typescript
// src/kt/layout.ts
export function expander(
  label: string,
  content: () => void,
  config: ExpanderConfig = {}
): void {
  const ctx = getRenderContext();
  const widgetId = registerWidget(config.key);
  const isExpanded = getWidgetState<boolean>(widgetId) ?? config.expanded ?? false;
  const openAttr = isExpanded ? " open" : "";

  ctx.append(`
    <details class="kt-expander" data-widget-id="${widgetId}"${openAttr}
      ontoggle="ktSendEvent('${widgetId}', this.open)">
      <summary class="kt-expander-header">${escapeHtml(label)}</summary>
      <div class="kt-expander-content">
  `);

  content();  // ネストされたコンテンツを実行

  ctx.append(`
      </div>
    </details>
  `);
}
```

### 使用例

```typescript
kt.expander("Advanced settings", () => {
  const debug = kt.checkbox("Debug mode");
  const logLevel = kt.selectbox("Log level", ["info", "debug", "error"]);
});

// デフォルトで展開
kt.expander("Important notice", () => {
  kt.write("Please read this carefully!");
}, { expanded: true });
```

### 成果物

- [ ] `expander` 関数実装
- [ ] HTML `<details>` 要素使用
- [ ] 展開状態の永続化
- [ ] テスト作成

---

## 3. kt.container()

### API設計

```typescript
// 論理的なグループ化（スタイル付け用）
kt.container((c) => {
  c.write("Grouped content");
  c.button("Action");
}, { border: true });

// または単純なラッパー
kt.container(() => {
  kt.write("Content");
});
```

### 型定義

```typescript
function container(
  content: () => void,
  config?: ContainerConfig
): void;

interface ContainerConfig {
  border?: boolean;
  height?: string;  // "300px", "50vh" など
}
```

### 実装

```typescript
// src/kt/layout.ts
export function container(
  content: () => void,
  config: ContainerConfig = {}
): void {
  const ctx = getRenderContext();
  const styles: string[] = [];

  if (config.border) {
    styles.push("border: 1px solid #ddd; padding: 1rem; border-radius: 4px;");
  }
  if (config.height) {
    styles.push(`height: ${config.height}; overflow: auto;`);
  }

  const styleAttr = styles.length ? ` style="${styles.join(" ")}"` : "";

  ctx.append(`<div class="kt-container"${styleAttr}>`);
  content();
  ctx.append(`</div>`);
}
```

### 成果物

- [ ] `container` 関数実装
- [ ] テスト作成

---

## 4. kt.success() / kt.error() / kt.warning() / kt.info()

### API設計

```typescript
kt.success("Operation completed successfully!");
kt.error("An error occurred");
kt.warning("Please check your input");
kt.info("FYI: New features available");

// アイコン付き（オプション）
kt.success("Saved!", { icon: "✓" });
```

### 型定義

```typescript
interface AlertConfig {
  icon?: string;
}

function success(message: string, config?: AlertConfig): void;
function error(message: string, config?: AlertConfig): void;
function warning(message: string, config?: AlertConfig): void;
function info(message: string, config?: AlertConfig): void;
```

### 実装

```typescript
// src/kt/output.ts
type AlertType = "success" | "error" | "warning" | "info";

const defaultIcons: Record<AlertType, string> = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

const alertColors: Record<AlertType, { bg: string; border: string; text: string }> = {
  success: { bg: "#d4edda", border: "#c3e6cb", text: "#155724" },
  error: { bg: "#f8d7da", border: "#f5c6cb", text: "#721c24" },
  warning: { bg: "#fff3cd", border: "#ffeeba", text: "#856404" },
  info: { bg: "#d1ecf1", border: "#bee5eb", text: "#0c5460" },
};

function alert(type: AlertType, message: string, config: AlertConfig = {}): void {
  const ctx = getRenderContext();
  const colors = alertColors[type];
  const icon = config.icon ?? defaultIcons[type];

  ctx.append(`
    <div class="kt-alert kt-alert-${type}" style="
      background: ${colors.bg};
      border: 1px solid ${colors.border};
      color: ${colors.text};
      padding: 0.75rem 1rem;
      border-radius: 4px;
      margin: 0.5rem 0;
    ">
      <span class="kt-alert-icon">${icon}</span>
      <span class="kt-alert-message">${escapeHtml(message)}</span>
    </div>
  `);
}

export const success = (msg: string, cfg?: AlertConfig) => alert("success", msg, cfg);
export const error = (msg: string, cfg?: AlertConfig) => alert("error", msg, cfg);
export const warning = (msg: string, cfg?: AlertConfig) => alert("warning", msg, cfg);
export const info = (msg: string, cfg?: AlertConfig) => alert("info", msg, cfg);
```

### 使用例

```typescript
if (kt.button("Save")) {
  try {
    saveData();
    kt.success("Data saved successfully!");
  } catch (e) {
    kt.error(`Failed to save: ${e.message}`);
  }
}

kt.warning("This action cannot be undone");
kt.info("Tip: Use keyboard shortcuts for faster navigation");
```

### 成果物

- [ ] `success`, `error`, `warning`, `info` 関数実装
- [ ] CSS変数でカスタマイズ可能に
- [ ] テスト作成

---

## 5. kt.spinner()

### API設計

Streamlitでは `with` 文でスピナーを表示するが、kantan-uiではサーバーサイドレンダリングのため、
同期的な処理中のスピナー表示は難しい。

代替アプローチ:
1. **状態ベース**: ユーザーが明示的にスピナーを制御
2. **条件付き表示**: loadingフラグに基づいて表示

```typescript
// 状態ベース
if (state.isLoading) {
  kt.spinner("Processing...");
} else {
  kt.write("Done!");
}

// 簡易API（条件付き）
kt.spinner("Loading...", { show: state.isLoading });
```

### 型定義

```typescript
function spinner(text?: string, config?: SpinnerConfig): void;

interface SpinnerConfig {
  show?: boolean;  // デフォルト: true
  size?: "small" | "medium" | "large";
}
```

### 実装

```typescript
// src/kt/feedback.ts
export function spinner(text = "Loading...", config: SpinnerConfig = {}): void {
  const ctx = getRenderContext();
  const show = config.show ?? true;

  if (!show) return;

  const size = config.size ?? "medium";
  const sizeMap = { small: "16px", medium: "24px", large: "32px" };

  ctx.append(`
    <div class="kt-spinner kt-spinner-${size}">
      <div class="kt-spinner-icon" style="
        width: ${sizeMap[size]};
        height: ${sizeMap[size]};
        border: 2px solid #f3f3f3;
        border-top: 2px solid #3498db;
        border-radius: 50%;
        animation: kt-spin 1s linear infinite;
      "></div>
      ${text ? `<span class="kt-spinner-text">${escapeHtml(text)}</span>` : ""}
    </div>
    <style>
      @keyframes kt-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `);
}
```

### 使用パターン

```typescript
if (kt.button("Start process")) {
  state.isProcessing = true;
  // 別のWebSocket/APIで処理を開始
  // 完了時に state.isProcessing = false を設定
}

if (state.isProcessing) {
  kt.spinner("Processing your request...");
} else if (state.result) {
  kt.success("Process completed!");
  kt.write(state.result);
}
```

### 成果物

- [ ] `spinner` 関数実装
- [ ] CSSアニメーション
- [ ] テスト作成

---

## 6. kt.progress()

### API設計

```typescript
kt.progress(0.5);  // 50%
kt.progress(75);   // 0-100の場合は自動で0-1に正規化

// ラベル付き
kt.progress(0.75, { label: "Downloading... 75%" });
```

### 型定義

```typescript
function progress(value: number, config?: ProgressConfig): void;

interface ProgressConfig {
  label?: string;
  color?: string;
}
```

### 実装

```typescript
// src/kt/feedback.ts
export function progress(value: number, config: ProgressConfig = {}): void {
  const ctx = getRenderContext();

  // 0-100 を 0-1 に正規化
  const normalizedValue = value > 1 ? value / 100 : value;
  const percentage = Math.min(Math.max(normalizedValue * 100, 0), 100);
  const color = config.color ?? "#3498db";

  ctx.append(`
    <div class="kt-progress">
      ${config.label ? `<div class="kt-progress-label">${escapeHtml(config.label)}</div>` : ""}
      <div class="kt-progress-bar" style="
        background: #e0e0e0;
        border-radius: 4px;
        height: 8px;
        overflow: hidden;
      ">
        <div class="kt-progress-fill" style="
          background: ${color};
          width: ${percentage}%;
          height: 100%;
          transition: width 0.3s ease;
        "></div>
      </div>
    </div>
  `);
}
```

### 使用例

```typescript
kt.progress(state.uploadProgress, { label: `Uploading: ${state.uploadProgress}%` });

// 複数ステップの進捗
const steps = ["Validate", "Process", "Save"];
const currentStep = 2;
kt.progress(currentStep / steps.length, { label: `Step ${currentStep}/${steps.length}` });
```

### 成果物

- [ ] `progress` 関数実装
- [ ] テスト作成

---

## 7. kt.toast()

### API設計

トーストは一時的な通知で、自動的に消える。
クライアントサイドでの実装が必要。

```typescript
kt.toast("Settings saved!");
kt.toast("Error occurred", { type: "error", duration: 5000 });
```

### 型定義

```typescript
function toast(message: string, config?: ToastConfig): void;

interface ToastConfig {
  type?: "success" | "error" | "warning" | "info";
  duration?: number;  // ミリ秒、デフォルト: 3000
}
```

### 実装方針

1. サーバーから特殊なパッチを送信
2. クライアントでトースト要素を動的に追加
3. duration後に自動削除

```typescript
// src/kt/feedback.ts
export function toast(message: string, config: ToastConfig = {}): void {
  const ctx = getRenderContext();
  const type = config.type ?? "info";
  const duration = config.duration ?? 3000;
  const toastId = `toast_${Date.now()}`;

  // トースト用の特殊なHTML（クライアントで処理）
  ctx.append(`
    <div class="kt-toast kt-toast-${type}" id="${toastId}"
         data-duration="${duration}"
         style="/* position: fixed などのスタイル */">
      ${escapeHtml(message)}
    </div>
    <script>
      setTimeout(() => {
        document.getElementById('${toastId}')?.remove();
      }, ${duration});
    </script>
  `);
}
```

### 注意点

- CSP (Content Security Policy) との互換性を考慮
- インラインスクリプトは避け、クライアントスクリプトで処理するのが望ましい

### 成果物

- [ ] `toast` 関数実装
- [ ] クライアントサイドのトースト処理
- [ ] CSSアニメーション（フェードイン/アウト）
- [ ] テスト作成

---

## 8. kt.form()

### API設計

フォームは複数の入力を一度に送信する。
Streamlitでは `with st.form()` と `st.form_submit_button()` を使用。

```typescript
// Streamlit
with st.form("my_form"):
    name = st.text_input("Name")
    age = st.number_input("Age")
    submitted = st.form_submit_button("Submit")
    if submitted:
        st.write(f"Hello {name}, age {age}")

// kantan-ui
kt.form("my_form", () => {
  const name = kt.text_input("Name");
  const age = kt.number_input("Age", 0, 120);

  if (kt.form_submit_button("Submit")) {
    kt.write(`Hello ${name}, age ${age}`);
  }
});
```

### 型定義

```typescript
function form(key: string, content: () => void, config?: FormConfig): void;

interface FormConfig {
  clearOnSubmit?: boolean;  // 送信後に入力をクリア
}

function form_submit_button(label: string, config?: ButtonConfig): boolean;
```

### 実装方針

**課題**: 通常のウィジェットは値が変わるたびにイベントを送信するが、
フォーム内のウィジェットは `submit` まで値を送信しない。

**解決策**:
1. フォームコンテキストをグローバル状態で管理
2. フォーム内のウィジェットは `onchange` ではなくフォームの `onsubmit` で値を収集
3. `form_submit_button` がクリックされたときに全ウィジェットの値を一括送信

```typescript
// src/kt/form.ts
let currentFormKey: string | null = null;

export function form(key: string, content: () => void, config: FormConfig = {}): void {
  const ctx = getRenderContext();

  ctx.append(`
    <form class="kt-form" data-form-key="${key}"
          onsubmit="ktSubmitForm(event, '${key}')">
  `);

  currentFormKey = key;
  content();
  currentFormKey = null;

  ctx.append(`</form>`);
}

export function form_submit_button(label: string, config: ButtonConfig = {}): boolean {
  if (!currentFormKey) {
    throw new Error("form_submit_button must be used inside a form");
  }

  const ctx = getRenderContext();
  const widgetId = registerWidget(config.key);

  ctx.append(`
    <button type="submit" class="kt-form-submit" data-widget-id="${widgetId}">
      ${escapeHtml(label)}
    </button>
  `);

  // フォーム送信イベントがトリガーされたかチェック
  const event = getRerunEvent();
  return event?.widgetId === widgetId;
}
```

### クライアントサイド

```javascript
function ktSubmitForm(event, formKey) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const values = {};

  for (const [key, value] of formData.entries()) {
    values[key] = value;
  }

  // 一括送信
  ktSendFormEvent(formKey, values);
}
```

### 成果物

- [ ] `form` 関数実装
- [ ] `form_submit_button` 関数実装
- [ ] フォームコンテキスト管理
- [ ] クライアントサイドのフォーム処理
- [ ] テスト作成

---

## 実装順序

```
Week 1:
├── success/error/warning/info（最も簡単）
├── progress（シンプル）
└── テスト

Week 2:
├── columns（レイアウトの基本）
├── container
└── テスト

Week 3:
├── expander（状態管理あり）
├── spinner
└── テスト

Week 4:
├── form + form_submit_button（複雑）
├── toast（クライアント連携）
└── 統合テスト・E2Eテスト
```

---

## CSS設計

すべてのスタイルを `kt-` プレフィックスで名前空間化し、
ユーザーが簡単にオーバーライドできるようにする。

```css
/* src/client/styles.css */
.kt-columns { display: flex; gap: 1rem; }
.kt-column { flex: 1; }

.kt-expander { border: 1px solid #ddd; border-radius: 4px; margin: 0.5rem 0; }
.kt-expander-header { padding: 0.75rem; cursor: pointer; }
.kt-expander-content { padding: 0.75rem; border-top: 1px solid #ddd; }

.kt-alert { padding: 0.75rem 1rem; border-radius: 4px; margin: 0.5rem 0; }
.kt-alert-success { background: #d4edda; color: #155724; }
.kt-alert-error { background: #f8d7da; color: #721c24; }
.kt-alert-warning { background: #fff3cd; color: #856404; }
.kt-alert-info { background: #d1ecf1; color: #0c5460; }

.kt-spinner { display: flex; align-items: center; gap: 0.5rem; }
.kt-progress { margin: 0.5rem 0; }
.kt-progress-bar { background: #e0e0e0; border-radius: 4px; height: 8px; }
.kt-progress-fill { background: #3498db; height: 100%; transition: width 0.3s; }

.kt-form { display: flex; flex-direction: column; gap: 1rem; }
.kt-form-submit { padding: 0.5rem 1rem; cursor: pointer; }
```

---

## 完了基準

- [ ] 全8機能の実装完了
- [ ] 各機能のユニットテスト
- [ ] E2Eテストで基本操作を確認
- [ ] `bun run lint:fix && bun run ci` パス
- [ ] TUTORIALにレイアウト・フィードバック使用例追加
- [ ] CSSファイル整備

---

*対象バージョン: kantan-ui v0.3.0*
*前提: Phase 1完了*
