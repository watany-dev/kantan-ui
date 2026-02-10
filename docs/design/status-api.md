# kt.status API 設計書

作成日: 2026-02-08

## 実装ステータス

> **実装済み** (2026-02-08)

---

## 1. 概要

### 1.1 目的

Streamlit の `st.status` に相当する機能を kantan-ui に実装する。長時間処理の進捗状況を展開/折りたたみ可能なコンテナで表示し、処理の各ステップをユーザーに伝える。

### 1.2 ユースケース

| ユースケース | 説明 |
|-------------|------|
| データ取得表示 | API呼び出しの各ステップ（検索→取得→解析）を表示 |
| バッチ処理の進捗 | 複数ファイルの処理ステップを逐次表示 |
| AI推論の経過 | LLM呼び出しの各段階（プロンプト生成→推論→パース）を表示 |
| デプロイ処理 | ビルド→テスト→デプロイの各フェーズをステータスで表示 |
| フォーム送信結果 | 送信中→検証中→完了/エラーの遷移を表示 |

### 1.3 設計原則

| 原則 | 説明 |
|------|------|
| **Streamlit互換** | `st.status` と同様の使用感を提供 |
| **expanderの拡張** | 既存の `kt.expander` パターンを基盤に、状態アイコンを追加 |
| **Web標準活用** | `<details>` / `<summary>` 要素をベースに、CSS アニメーションで状態表示 |
| **アクセシビリティ** | ネイティブ `<details>` のセマンティクスを活用し、ARIA補助でスクリーンリーダー対応 |
| **rerunモデル対応** | `.update()` は状態を保存し、次回 rerun で反映 |

### 1.4 Streamlit との対応

| Streamlit | kantan-ui | 備考 |
|-----------|-----------|------|
| `with st.status("label") as s:` | `kt.status("label", (s) => { ... })` | コールバックパターンで代替 |
| `s.update(label=..., state=..., expanded=...)` | `s.update({ label, state, expanded })` | オブジェクト引数 |
| `st.write()` inside status | `kt.write()` inside callback | コンテキスト内で通常のAPIが使える |
| `status.write()` outside `with` | 非対応 | Streamlitはコンテナオブジェクト経由で外部からコンテンツ追加可能。kantan-uiはコールバック内のみ |
| state: "running" / "complete" / "error" | 同一 | 3状態をサポート |

---

## 2. API設計

### 2.1 基本API

```typescript
// 基本: コールバックで内容を定義
kt.status("Downloading data...", () => {
  kt.write("Searching for data...");
  kt.write("Found URL.");
  kt.write("Downloading data...");
});
// → コールバック終了時に自動的に state="complete" になる

// update で状態制御
kt.status("Downloading data...", (s) => {
  kt.write("Searching for data...");
  kt.write("Found URL.");
  s.update({ label: "Download complete!", state: "complete", expanded: false });
});

// エラー状態
kt.status("Processing...", (s) => {
  kt.write("Step 1: Validating...");
  if (hasError) {
    s.update({ label: "Processing failed", state: "error" });
  }
});
```

### 2.2 シグネチャ

```typescript
function status(
  label: string,
  content: (controller: StatusController) => void,
  config?: StatusConfig,
): void;
```

### 2.3 使用例

```typescript
import { kt } from "kantan-ui";

// 1. シンプルな長時間処理の表示
kt.status("Loading data...", () => {
  kt.write("Connecting to database...");
  kt.write("Fetching records...");
  kt.write("Processing 1,000 rows...");
});

// 2. 明示的なステータス制御
kt.status("Deploying application...", (s) => {
  kt.write("Building project...");
  kt.write("Running tests...");
  kt.write("Uploading artifacts...");
  s.update({
    label: "Deployment complete!",
    state: "complete",
    expanded: false,
  });
});

// 3. エラーハンドリング
kt.status("Importing CSV...", (s) => {
  kt.write("Reading file...");
  kt.write("Validating schema...");
  if (validationFailed) {
    kt.error("Invalid column: 'age' expected number");
    s.update({ label: "Import failed", state: "error" });
  }
});

// 4. 初期展開状態の指定
kt.status("Analysis results", () => {
  kt.write("Total records: 5,000");
  kt.write("Anomalies found: 3");
  kt.metric("Accuracy", "98.5%", "1.2%");
}, { expanded: true });

// 5. 初期状態の指定（完了済みを表示）
kt.status("Previous run", () => {
  kt.write("Completed at 14:30");
}, { state: "complete", expanded: false });

// 6. セッション状態と連携した動的な状態管理
const step = kt.session_state.get("step", 0);

kt.status(
  step >= 3 ? "Processing complete!" : "Processing...",
  () => {
    if (step >= 1) kt.write("Step 1: Data loaded");
    if (step >= 2) kt.write("Step 2: Analysis done");
    if (step >= 3) kt.write("Step 3: Report generated");
  },
  {
    state: step >= 3 ? "complete" : "running",
    expanded: step < 3,
  },
);
```

---

## 3. 型定義

### 3.1 StatusState

```typescript
/**
 * ステータスコンテナの状態
 * - "running": 実行中（スピナーアイコン）
 * - "complete": 完了（チェックマークアイコン）
 * - "error": エラー（エラーアイコン）
 */
export type StatusState = "running" | "complete" | "error";
```

### 3.2 StatusConfig

```typescript
/**
 * kt.status() の設定オプション
 */
export interface StatusConfig {
  /** ウィジェットのユニークキー（状態保持用） */
  key?: string;

  /** 初期展開状態 (デフォルト: state が "running" のとき true, それ以外は false) */
  expanded?: boolean;

  /** 初期状態 (デフォルト: "running") */
  state?: StatusState;
}
```

### 3.3 StatusUpdateOptions

```typescript
/**
 * status.update() のオプション
 * すべてのプロパティはオプション（指定したもののみ更新）
 */
export interface StatusUpdateOptions {
  /** ラベルを変更 */
  label?: string;

  /** 状態を変更 */
  state?: StatusState;

  /** 展開状態を変更 */
  expanded?: boolean;
}
```

### 3.4 StatusController

```typescript
/**
 * ステータスコンテナの制御オブジェクト
 * コールバック関数の引数として渡される
 */
export interface StatusController {
  /**
   * ステータスコンテナの表示を更新
   * 指定したプロパティのみが更新される
   *
   * @param options - 更新するプロパティ
   */
  update(options: StatusUpdateOptions): void;
}
```

### 3.5 StatusInternalState（内部）

```typescript
/**
 * ステータスコンテナの内部状態（セッション状態に保存）
 */
interface StatusInternalState {
  /** 現在のラベル */
  label: string;

  /** 現在の状態 */
  state: StatusState;

  /** 展開状態 */
  expanded: boolean;
}
```

---

## 4. アーキテクチャ

### 4.1 システム構成

```
┌──────────────────────────────────────────────────────────────────┐
│  kt.status("Loading...", (s) => { ... }) 呼び出し               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 1. Widget ID 生成                                        │    │
│  │    - key指定あり: そのまま使用                           │    │
│  │    - key指定なし: generateWidgetId()                    │    │
│  └────────────────────┬─────────────────────────────────────┘    │
│                       │                                          │
│                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 2. 保存済みステータス状態を取得                          │    │
│  │    - なければ config から初期値を生成                    │    │
│  │    - { label, state, expanded }                          │    │
│  └────────────────────┬─────────────────────────────────────┘    │
│                       │                                          │
│                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 3. <details> コンテナ開始タグ出力                        │    │
│  │    - 状態アイコン (spinner / ✓ / ✗) を <summary> に配置  │    │
│  │    - expanded に応じて open 属性を付与                   │    │
│  └────────────────────┬─────────────────────────────────────┘    │
│                       │                                          │
│                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 4. StatusController 生成 & content(controller) 実行      │    │
│  │    - controller.update() で状態を保存                    │    │
│  │    - コールバック内の kt.* はコンテナ内に出力            │    │
│  └────────────────────┬─────────────────────────────────────┘    │
│                       │                                          │
│                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 5. コールバック終了                                      │    │
│  │    - update() 未呼び出し → 自動で "complete" に遷移     │    │
│  │    - update() 呼び出し済み → その状態を維持              │    │
│  └────────────────────┬─────────────────────────────────────┘    │
│                       │                                          │
│                       ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 6. </details> 閉じタグ出力                               │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 データフロー

```
1. kt.status("Loading...", callback, config) 呼び出し
   └─▶ Widget ID 生成
   └─▶ 保存済み状態取得（または config + label から初期化）
   └─▶ 現在の状態に基づいて <details> 開始タグ出力
   └─▶ StatusController を生成

2. content(controller) 実行
   └─▶ コールバック内の kt.write() 等は通常通りバッファに追加
   └─▶ controller.update() が呼ばれた場合
       └─▶ StatusInternalState を更新して保存
       └─▶ updated フラグを true に設定

3. コールバック完了
   └─▶ updated === false の場合
       └─▶ state を "complete" に自動遷移
       └─▶ expanded を false に自動変更
       └─▶ StatusInternalState を保存
   └─▶ </details> 閉じタグ出力

4. 次回 rerun 時
   └─▶ 保存済み StatusInternalState から label, state, expanded を復元
   └─▶ 更新された状態でコンテナを再描画
```

### 4.3 ファイル構成

```
src/
├── kt/
│   ├── status.ts              # kt.status() 宣言的API
│   └── index.ts               # status エクスポート追加
│
└── styles/
    └── default.ts             # .kt-status-* スタイル追加

tests/
└── unit/
    └── kt/
        └── status.test.ts     # ユニットテスト

e2e/
└── status.spec.ts             # E2Eテスト
```

**配置の理由**: `kt.status` はレイアウトコンテナ（expanderの拡張）とフィードバック（spinner/状態表示）の両方の性質を持つ。専用ファイル `status.ts` に分離することで責務を明確にする。

### 4.4 技術選定の根拠

| 選定 | 理由 | 代替案と棄却理由 |
|------|------|-----------------|
| `<details>` / `<summary>` | ブラウザネイティブの展開/折りたたみ。JSなしで動作し、アクセシビリティが組み込まれている。`kt.expander` と同じパターンで実装コストが低い | カスタム `div` + JS トグル: 追加の JS とARIA属性が必要。`<details>` の方がWeb標準に沿う |
| CSSアニメーション（スピナー） | 既存の `.kt-spinner-icon` を再利用。外部ライブラリ不要 | SVGアニメーション: やや複雑で、既存CSSスピナーで十分 |
| `setWidgetValue` による状態保存 | 既存のウィジェット状態管理機構を流用。`kt.empty` と同じパターン | 独自ストア: 新たな状態管理の追加は複雑度が増す |
| `renderHtml` テンプレートタグ | 自動エスケープでXSS対策。プロジェクト標準のHTML生成方法 | 手動エスケープ: ミスのリスク大 |
| 状態値の検証（`validateState`） | `raw()` で状態をクラス名に埋め込むため、不正値によるCSS injection を防止 | 型のみに依存: JS利用時やセッション改ざん時に無防備 |

---

## 5. 実装詳細

### 5.1 状態アイコンとアクセシビリティラベルの定義

```typescript
const STATUS_ICONS: Record<StatusState, string> = {
  running: '<div class="kt-status-icon kt-status-running" aria-hidden="true"><div class="kt-spinner-icon" style="width: 16px; height: 16px;"></div></div>',
  complete: '<div class="kt-status-icon kt-status-complete" aria-hidden="true">&#10003;</div>',
  error: '<div class="kt-status-icon kt-status-error" aria-hidden="true">&#10007;</div>',
};

/** スクリーンリーダー用の状態テキスト */
const STATUS_SR_TEXT: Record<StatusState, string> = {
  running: "実行中",
  complete: "完了",
  error: "エラー",
};
```

### 5.2 kt.status() 実装

```typescript
// src/kt/status.ts
import { raw, renderHtml } from "../utils/html";
import { generateWidgetId, getWidgetValue, setWidgetValue } from "../widgets/registry";
import { requireRenderContext } from "./context";
import type { StatusConfig, StatusController, StatusInternalState, StatusState } from "./types";

const STATUS_ICONS: Record<StatusState, string> = {
  running:
    '<div class="kt-status-icon kt-status-running" aria-hidden="true"><div class="kt-spinner-icon" style="width: 16px; height: 16px;"></div></div>',
  complete: '<div class="kt-status-icon kt-status-complete" aria-hidden="true">&#10003;</div>',
  error: '<div class="kt-status-icon kt-status-error" aria-hidden="true">&#10007;</div>',
};

const STATUS_SR_TEXT: Record<StatusState, string> = {
  running: "実行中",
  complete: "完了",
  error: "エラー",
};

const VALID_STATES: Set<string> = new Set(["running", "complete", "error"]);

/** 状態値を検証し、不正な値はデフォルトにフォールバック */
function validateState(state: string): StatusState {
  return VALID_STATES.has(state) ? (state as StatusState) : "running";
}

export function status(
  label: string,
  content: (controller: StatusController) => void,
  config: StatusConfig = {},
): void {
  const ctx = requireRenderContext();
  const id = generateWidgetId(config.key);

  // 初期状態を決定（不正値はフォールバック）
  const initialState = validateState(config.state ?? "running");
  const initialExpanded = config.expanded ?? (initialState === "running");

  // 保存済みの状態を取得（なければ初期値）
  const savedState = getWidgetValue<StatusInternalState>(id, {
    label,
    state: initialState,
    expanded: initialExpanded,
  });

  // 保存済み状態を検証（セッション改ざん対策）
  const currentState: StatusInternalState = {
    label: savedState.label,
    state: validateState(savedState.state),
    expanded: savedState.expanded,
  };

  const icon = STATUS_ICONS[currentState.state];
  const srText = STATUS_SR_TEXT[currentState.state];
  const openAttr = currentState.expanded ? " open" : "";

  // <details> 開始
  ctx.append(
    renderHtml`<details class="kt-status kt-status-${raw(currentState.state)}"${raw(openAttr)}><summary class="kt-status-header">${raw(icon)}<span class="kt-sr-only">${srText}: </span><span class="kt-status-label">${currentState.label}</span></summary><div class="kt-status-content">`,
  );

  // コールバック実行
  let updated = false;
  const controller: StatusController = {
    update(options) {
      updated = true;
      if (options.label !== undefined) currentState.label = options.label;
      if (options.state !== undefined) currentState.state = validateState(options.state);
      if (options.expanded !== undefined) currentState.expanded = options.expanded;
      setWidgetValue(id, currentState);
    },
  };

  try {
    content(controller);
  } finally {
    // update() が呼ばれていなければ自動完了
    if (!updated) {
      currentState.state = "complete";
      currentState.expanded = false;
      setWidgetValue(id, currentState);
    }

    // </details> 閉じ（例外時もHTMLの整合性を保証）
    ctx.append("</div></details>");
  }
}
```

### 5.3 HTML構造

```html
<!-- running 状態 (展開) -->
<details class="kt-status kt-status-running" open>
  <summary class="kt-status-header">
    <div class="kt-status-icon kt-status-running" aria-hidden="true">
      <div class="kt-spinner-icon" style="width: 16px; height: 16px;"></div>
    </div>
    <span class="kt-sr-only">実行中: </span>
    <span class="kt-status-label">Downloading data...</span>
  </summary>
  <div class="kt-status-content">
    <div class="kt-write">Searching for data...</div>
    <div class="kt-write">Found URL.</div>
  </div>
</details>

<!-- complete 状態 (折りたたみ) -->
<details class="kt-status kt-status-complete">
  <summary class="kt-status-header">
    <div class="kt-status-icon kt-status-complete" aria-hidden="true">&#10003;</div>
    <span class="kt-sr-only">完了: </span>
    <span class="kt-status-label">Download complete!</span>
  </summary>
  <div class="kt-status-content">
    <div class="kt-write">Searching for data...</div>
    <div class="kt-write">Found URL.</div>
    <div class="kt-write">Downloading data...</div>
  </div>
</details>

<!-- error 状態 (展開) -->
<details class="kt-status kt-status-error" open>
  <summary class="kt-status-header">
    <div class="kt-status-icon kt-status-error" aria-hidden="true">&#10007;</div>
    <span class="kt-sr-only">エラー: </span>
    <span class="kt-status-label">Import failed</span>
  </summary>
  <div class="kt-status-content">
    <div class="kt-write">Reading file...</div>
    <div class="kt-alert kt-alert-error">Invalid column: 'age'</div>
  </div>
</details>
```

### 5.4 CSSスタイル

```css
/* ステータスコンテナ */
.kt-status {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin: 0.5rem 0;
  overflow: hidden;
}

/* ヘッダー（summary） */
.kt-status-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  user-select: none;
  font-weight: 500;
  list-style: none; /* デフォルトの▶を非表示 */
}

/* Safari対応: デフォルトマーカー非表示 */
.kt-status-header::-webkit-details-marker {
  display: none;
}

/* ステータスアイコン共通 */
.kt-status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

/* running: スピナー（既存の kt-spinner-icon を再利用） */
.kt-status-running .kt-status-header {
  color: #1976d2;
}

/* complete: チェックマーク */
.kt-status-complete .kt-status-header {
  color: #388e3c;
}

.kt-status-icon.kt-status-complete {
  color: #388e3c;
  font-weight: bold;
}

/* error: エラーアイコン */
.kt-status-error .kt-status-header {
  color: #d32f2f;
}

.kt-status-icon.kt-status-error {
  color: #d32f2f;
  font-weight: bold;
}

/* コンテンツ領域 */
.kt-status-content {
  padding: 0 1rem 0.75rem 2.75rem; /* 左パディングでアイコン分インデント */
  border-top: 1px solid #e0e0e0;
}

/* 状態別ボーダーカラー */
.kt-status.kt-status-running {
  border-color: #90caf9;
}

.kt-status.kt-status-complete {
  border-color: #a5d6a7;
}

.kt-status.kt-status-error {
  border-color: #ef9a9a;
}
```

---

## 6. イテレーション計画

TDDサイクル（Red → Green → Refactor）に従い実装。

### Iteration 1: 基本的な status コンテナ

**目標**: 静的なラベルとコンテンツを表示する `kt.status` の最小実装

**Red（テスト作成）**:
```typescript
// tests/unit/kt/status.test.ts
describe("kt.status", () => {
  it("renders a details element with kt-status class", () => {
    setupRenderContext();
    kt.status("Loading...", () => {});
    const html = getRenderedHtml();
    expect(html).toContain('<details class="kt-status');
    expect(html).toContain("</details>");
  });

  it("renders label in summary", () => {
    setupRenderContext();
    kt.status("Downloading data...", () => {});
    const html = getRenderedHtml();
    expect(html).toContain("Downloading data...");
  });

  it("renders callback content inside status container", () => {
    setupRenderContext();
    kt.status("Loading...", () => {
      kt.write("Step 1 done");
    });
    const html = getRenderedHtml();
    expect(html).toContain("Step 1 done");
  });

  it("escapes HTML in label", () => {
    setupRenderContext();
    kt.status("<script>alert(1)</script>", () => {});
    const html = getRenderedHtml();
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
```

**Green（実装）**:
- `src/kt/status.ts` に最小実装（label + content の描画のみ）
- `src/kt/index.ts` にエクスポート追加

**成果物**: 静的な status コンテナの描画

---

### Iteration 2: 状態アイコンと状態別スタイル

**目標**: running / complete / error の3状態をアイコンとスタイルで区別

**Red（テスト作成）**:
```typescript
describe("status states", () => {
  it("defaults to running state with spinner icon", () => {
    setupRenderContext();
    kt.status("Processing...", () => {});
    const html = getRenderedHtml();
    expect(html).toContain("kt-status-running");
    expect(html).toContain("kt-spinner-icon");
  });

  it("uses complete state when config.state is complete", () => {
    setupRenderContext();
    kt.status("Done", () => {}, { state: "complete" });
    const html = getRenderedHtml();
    expect(html).toContain("kt-status-complete");
    expect(html).toContain("&#10003;"); // checkmark
  });

  it("uses error state when config.state is error", () => {
    setupRenderContext();
    kt.status("Failed", () => {}, { state: "error" });
    const html = getRenderedHtml();
    expect(html).toContain("kt-status-error");
    expect(html).toContain("&#10007;"); // cross mark
  });

  it("defaults expanded=true when state is running", () => {
    setupRenderContext();
    kt.status("Processing...", () => {});
    const html = getRenderedHtml();
    expect(html).toContain(" open");
  });

  it("defaults expanded=false when state is complete", () => {
    setupRenderContext();
    kt.status("Done", () => {}, { state: "complete" });
    const html = getRenderedHtml();
    expect(html).not.toContain(" open");
  });

  it("respects explicit expanded config", () => {
    setupRenderContext();
    kt.status("Done", () => {}, { state: "complete", expanded: true });
    const html = getRenderedHtml();
    expect(html).toContain(" open");
  });
});
```

**Green（実装）**:
- 状態アイコン定数 `STATUS_ICONS` を追加
- `config.state` に応じた CSS クラスとアイコンの切り替え
- `expanded` のデフォルト値ロジック

**成果物**: 3状態の視覚的区別

---

### Iteration 3: StatusController と .update()

**目標**: コールバック内から状態を制御できる `.update()` メソッドの実装

**Red（テスト作成）**:
```typescript
describe("StatusController.update()", () => {
  it("auto-completes when update() is not called", () => {
    setupRenderContext();
    const id = "status_auto";
    kt.status("Processing...", () => {}, { key: id });
    const saved = getWidgetValue<StatusInternalState>(id);
    expect(saved.state).toBe("complete");
    expect(saved.expanded).toBe(false);
  });

  it("preserves state when update() is called", () => {
    setupRenderContext();
    const id = "status_manual";
    kt.status("Processing...", (s) => {
      s.update({ state: "error", label: "Failed!" });
    }, { key: id });
    const saved = getWidgetValue<StatusInternalState>(id);
    expect(saved.state).toBe("error");
    expect(saved.label).toBe("Failed!");
  });

  it("allows partial updates", () => {
    setupRenderContext();
    const id = "status_partial";
    kt.status("Processing...", (s) => {
      s.update({ label: "Almost done..." });
    }, { key: id });
    const saved = getWidgetValue<StatusInternalState>(id);
    expect(saved.label).toBe("Almost done...");
    // state は update() が呼ばれたので自動完了しない
  });

  it("restores saved state on next rerun", () => {
    const id = "status_rerun";
    // 1回目: update でエラー状態を保存
    setupRenderContext();
    kt.status("Processing...", (s) => {
      s.update({ state: "error", label: "Failed!" });
    }, { key: id });

    // 2回目: 保存された状態が復元される
    setupRenderContext();
    kt.status("Processing...", () => {}, { key: id });
    const html = getRenderedHtml();
    expect(html).toContain("Failed!");
    expect(html).toContain("kt-status-error");
  });
});
```

**Green（実装）**:
- `StatusController` オブジェクトの生成
- `setWidgetValue` による状態保存
- 自動完了ロジック（`updated` フラグ）
- 次回 rerun 時の状態復元

**成果物**: 完全な状態管理

---

### Iteration 3.5: エッジケースとセキュリティ

**目標**: 例外安全性、状態値検証、アクセシビリティのテスト

**Red（テスト作成）**:
```typescript
describe("edge cases and security", () => {
  it("closes details tag even when callback throws", () => {
    setupRenderContext();
    expect(() => {
      kt.status("Crash", () => {
        kt.write("Before error");
        throw new Error("Callback error");
      });
    }).toThrow("Callback error");
    const html = getRenderedHtml();
    expect(html).toContain("</details>");
  });

  it("auto-completes state after callback throws", () => {
    setupRenderContext();
    const id = "status_throw";
    try {
      kt.status("Crash", () => { throw new Error("fail"); }, { key: id });
    } catch { /* expected */ }
    const saved = getWidgetValue<StatusInternalState>(id);
    expect(saved.state).toBe("complete");
  });

  it("falls back to running for invalid state in config", () => {
    setupRenderContext();
    kt.status("Test", () => {}, { state: "invalid" as StatusState });
    const html = getRenderedHtml();
    expect(html).toContain("kt-status-running");
  });

  it("falls back to running for invalid saved state", () => {
    const id = "status_invalid_saved";
    setWidgetValue(id, { label: "Bad", state: "hacked", expanded: true });
    setupRenderContext();
    kt.status("Test", () => {}, { key: id });
    const html = getRenderedHtml();
    expect(html).toContain("kt-status-running");
  });

  it("renders with empty label", () => {
    setupRenderContext();
    kt.status("", () => { kt.write("Content"); });
    const html = getRenderedHtml();
    expect(html).toContain("kt-status-label");
    expect(html).toContain("Content");
  });

  it("includes aria-hidden on status icon", () => {
    setupRenderContext();
    kt.status("Loading", () => {});
    const html = getRenderedHtml();
    expect(html).toContain('aria-hidden="true"');
  });

  it("includes sr-only text for screen readers", () => {
    setupRenderContext();
    kt.status("Loading", () => {});
    const html = getRenderedHtml();
    expect(html).toContain("kt-sr-only");
  });

  it("validates state in update() call", () => {
    setupRenderContext();
    const id = "status_update_invalid";
    kt.status("Test", (s) => {
      s.update({ state: "hacked" as StatusState });
    }, { key: id });
    const saved = getWidgetValue<StatusInternalState>(id);
    expect(saved.state).toBe("running"); // fallback
  });
});
```

**Green（実装）**:
- `try/finally` ブロック追加
- `validateState()` 関数の実装
- アイコンに `aria-hidden="true"` 追加
- `kt-sr-only` スパン追加

**成果物**: エッジケースの安全な処理

---

### Iteration 4: CSSスタイル統合

**目標**: スタイルの追加と視覚的な完成

**作業内容**:
- `src/styles/default.ts` に `.kt-status-*` スタイルを追加
- 既存の `.kt-spinner-icon` アニメーションを再利用
- 状態別のボーダーカラー・アイコンカラー

**成果物**: スタイル定義、視覚的に完成した status コンテナ

---

### Iteration 5: E2Eテスト

**目標**: Playwrightによる統合テスト

**作業内容**:
```typescript
// e2e/status.spec.ts
test.describe("kt.status", () => {
  test("shows running state with spinner and expanded by default", async ({ page }) => {
    await page.goto("/status-demo");
    const status = page.locator(".kt-status-running");
    await expect(status).toBeVisible();
    await expect(status.locator(".kt-spinner-icon")).toBeVisible();
    await expect(status).toHaveAttribute("open");
  });

  test("shows complete state with checkmark and collapsed", async ({ page }) => {
    await page.goto("/status-demo");
    const status = page.locator(".kt-status-complete");
    await expect(status).toBeVisible();
    await expect(status.locator(".kt-status-icon")).toContainText("✓");
    await expect(status).not.toHaveAttribute("open");
  });

  test("shows error state with cross mark", async ({ page }) => {
    await page.goto("/status-demo");
    const status = page.locator(".kt-status-error");
    await expect(status).toBeVisible();
    await expect(status.locator(".kt-status-icon")).toContainText("✗");
  });

  test("expands and collapses on summary click", async ({ page }) => {
    await page.goto("/status-demo");
    const status = page.locator(".kt-status-complete").first();
    const summary = status.locator("summary");

    // Initially collapsed
    await expect(status).not.toHaveAttribute("open");

    // Click to expand
    await summary.click();
    await expect(status).toHaveAttribute("open");

    // Click to collapse
    await summary.click();
    await expect(status).not.toHaveAttribute("open");
  });

  test("has accessible sr-only text", async ({ page }) => {
    await page.goto("/status-demo");
    const srText = page.locator(".kt-status-running .kt-sr-only");
    await expect(srText).toHaveText(/実行中/);
  });

  test("has aria-hidden on icons", async ({ page }) => {
    await page.goto("/status-demo");
    const icon = page.locator(".kt-status-icon").first();
    await expect(icon).toHaveAttribute("aria-hidden", "true");
  });
});
```

**成果物**: `e2e/status.spec.ts`

---

## 7. 検討事項

### 7.1 rerunモデルとの整合性

kantan-ui は rerun モデルを採用しており、`controller.update()` の効果は**現在の rerun では HTML に反映されない**。

```typescript
kt.status("Loading...", (s) => {
  kt.write("Step 1");
  s.update({ label: "Step 1 complete" }); // → 状態は保存される
  // ただし、この rerun で描画される HTML のヘッダーは "Loading..." のまま
});
// 次回 rerun 時に "Step 1 complete" が表示される
```

**対処方針**:
- これは kantan-ui のアーキテクチャ上の制約であり、`kt.empty` と同じ挙動
- ドキュメントで明記する
- セッション状態と `config` を組み合わせた宣言的パターン（使用例6）を推奨する

### 7.2 自動完了の設計判断

Streamlit では `with` ブロック終了時に自動で `complete` になる。kantan-ui でも同様に、`update()` が呼ばれなければ自動完了とする。

**理由**:
- 最も一般的なユースケース（処理ステップの表示→完了）をシンプルに書ける
- 明示的に状態を維持したい場合は `update()` を呼べばよい
- Streamlit との互換性

### 7.3 ネストされた status

```typescript
kt.status("Outer", () => {
  kt.status("Inner", () => { // 技術的には可能だが非推奨
    kt.write("Nested content");
  });
});
```

**方針**: Streamlit と同様、ネストは非推奨とするがエラーにはしない。ドキュメントで注意を記載する。

### 7.4 config.key の省略時

`key` を省略した場合は `generateWidgetId()` で自動生成される。ただし、rerun 間で安定した ID が必要なため、動的に `kt.status` の呼び出し数が変わるケースでは明示的な `key` 指定を推奨する。

### 7.5 コールバック内で例外が発生した場合

コールバック実行中に例外がスローされた場合、`</details>` 閉じタグが出力されず HTML が壊れる可能性がある。`try/finally` で閉じタグの出力を保証する。

```typescript
try {
  content(controller);
} finally {
  // update() が呼ばれていなければ自動完了
  if (!updated) {
    currentState.state = "complete";
    currentState.expanded = false;
    setWidgetValue(id, currentState);
  }
  ctx.append("</div></details>");
}
```

**例外自体の処理**: 例外は呼び出し元に再スローする（握りつぶさない）。`kt.expander` や `kt.container` と同じ方針。

**自動完了の適用**: 例外発生時も `update()` が呼ばれていなければ `"complete"` に自動遷移する。これは意図的な設計判断である。理由: 例外はユーザーコードの問題であり、status コンテナの状態とは独立。エラー状態にしたい場合は `try/catch` 内で `s.update({ state: "error" })` を明示的に呼ぶべき。

### 7.6 空ラベル

空文字列のラベルは許容する。`<summary>` 内にアイコンのみが表示される。バリデーションエラーにはしないが、アクセシビリティ上は非推奨。

### 7.7 不正な config.state

`StatusConfig.state` に `"running" | "complete" | "error"` 以外の値が渡された場合、`validateState()` により `"running"` にフォールバックする（セクション8.2 参照）。TypeScript の型チェックにより通常は発生しないが、JavaScript からの利用を考慮する。

### 7.8 アクセシビリティ

`<details>` / `<summary>` はブラウザネイティブの展開/折りたたみセマンティクスを持つため、スクリーンリーダーが自動的に「折りたたまれています」「展開されています」を読み上げる。

追加のアクセシビリティ対応:
- `<summary>` に `role="status"` 属性は **付与しない**（`<summary>` は暗黙のロールを持っており、上書きは不適切）
- 状態アイコンに `aria-hidden="true"` を付与し、スクリーンリーダーでの冗長な読み上げを防ぐ
- 状態を示すスクリーンリーダー用テキストを `<span class="kt-sr-only">` で追加

```html
<summary class="kt-status-header">
  <div class="kt-status-icon kt-status-running" aria-hidden="true">...</div>
  <span class="kt-sr-only">実行中: </span>
  <span class="kt-status-label">Downloading data...</span>
</summary>
```

---

## 8. セキュリティ考慮

### 8.1 ラベルのXSS対策

ラベルは `renderHtml` テンプレートタグで自動エスケープされる。ユーザー入力を直接ラベルに渡しても安全。

```typescript
// 安全: renderHtml がエスケープ
kt.status(userInput, () => { ... });
// <script> → &lt;script&gt; に変換される
```

### 8.2 状態値の検証

`StatusState` は `"running" | "complete" | "error"` の3値のみ許容する。保存済みの状態を復元する際に不正な値が含まれている可能性があるため、検証を行う。

```typescript
const VALID_STATES: Set<string> = new Set(["running", "complete", "error"]);

function validateState(state: string): StatusState {
  if (VALID_STATES.has(state)) {
    return state as StatusState;
  }
  return "running"; // 不正値はデフォルトにフォールバック
}
```

**理由**: `raw(currentState.state)` を CSS クラス名に使用するため、不正な値がセッション状態に保存された場合に CSS class injection を防ぐ必要がある。

### 8.3 CSS class injection の防止

HTML出力で `kt-status-${raw(currentState.state)}` のように状態値を直接クラス名に埋め込むため、状態値は検証済みの値のみ使用する（8.2 の `validateState` で担保）。

### 8.4 update() の label 安全性

`controller.update({ label })` で保存されたラベルは、次回 rerun 時に `renderHtml` テンプレートタグ内の `${currentState.label}` として出力される。`renderHtml` は自動エスケープするため、ユーザー入力を含む label も安全に処理される。

### 8.5 コンテンツ領域のセキュリティ

status コンテナ内で呼ばれる `kt.write()` や `kt.html()` 等は、それぞれの API が持つエスケープ・サニタイズ機構に従う。status 側で追加のサニタイズは不要。

---

## 9. 非実装項目（将来検討）

| 項目 | 理由 |
|------|------|
| WebSocket による即時 UI 更新 | 現在の rerun モデルでは不要。将来 streaming 対応時に検討 |
| アニメーション遷移 | running → complete の遷移アニメーション。初期実装では不要 |
| カスタムアイコン | ユーザー定義アイコンの指定。ユースケースが明確になってから |
| プログレス統合 | status 内に進捗バーを統合表示。`kt.progress` で代替可能 |

---

## 10. チェックリスト

### 実装前

- [ ] 既存の `kt.expander` パターンを確認
- [ ] `kt.empty` の rerun モデル対応を確認
- [ ] `generateWidgetId` / `getWidgetValue` / `setWidgetValue` の使い方を確認

### 各イテレーション後

- [ ] `bun run lint:fix` 実行
- [ ] `bun run test` 実行
- [ ] コミット

### 完了時

- [ ] `bun run ci` 全パス
- [ ] 全状態（running / complete / error）のテストがある
- [ ] `update()` のテストがある
- [ ] 自動完了のテストがある
- [ ] 例外安全性のテストがある（`try/finally`）
- [ ] 状態値検証のテストがある（`validateState`）
- [ ] アクセシビリティのテストがある（`aria-hidden`, `kt-sr-only`）
- [ ] E2Eテストがパス
- [ ] `src/kt/index.ts` にエクスポート追加
- [ ] CSS スタイルが追加されている
- [ ] ドキュメント更新

---

## 11. 参考資料

- [Streamlit st.status](https://docs.streamlit.io/develop/api-reference/status/st.status)
- kantan-ui 既存実装
  - `src/kt/layout.ts` - expander パターン（`<details>` ベース）
  - `src/kt/feedback.ts` - spinner パターン
  - `src/widgets/placeholder.ts` - Placeholder パターン（状態保存 + update）
  - `src/widgets/registry.ts` - 状態管理（getWidgetValue / setWidgetValue）
  - `src/kt/empty.ts` - rerun モデルでの状態復元パターン
