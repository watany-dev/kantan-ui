# Metric API 設計書

## 1. 概要

### 1.1 目的

Streamlit風のメトリクス表示API `kt.metric()` をkantan-uiに実装する。ダッシュボードやKPI表示で頻出するコンポーネント。

### 1.2 Streamlit互換性

```python
# Streamlit
st.metric(label="Revenue", value="$1,234", delta="+12%")
st.metric(label="Temperature", value="70 °F", delta="-1.2 °F", delta_color="inverse")
```

### 1.3 設計原則

| 原則 | 説明 |
|------|------|
| **シンプルAPI** | 最小限のパラメータで直感的に使える |
| **型安全** | 値に数値・文字列両方を許容 |
| **セキュア** | 全入力をエスケープ |
| **カスタマイズ可能** | delta色やヘルプテキストをオプションで指定 |

---

## 2. API設計

### 2.1 基本API

```typescript
// 基本使用
kt.metric("Revenue", "$1,234");

// 変化量付き
kt.metric("Revenue", "$1,234", { delta: "+12%" });

// 変化量の色を反転（増加=悪い場合）
kt.metric("Response Time", "120ms", { delta: "+15ms", delta_color: "inverse" });

// 変化量の色を無効化
kt.metric("Users", "1,234", { delta: "+100", delta_color: "off" });
```

### 2.2 シグネチャ

```typescript
function metric(
  label: string,
  value: string | number,
  config?: MetricConfig
): void;
```

### 2.3 使用例

```typescript
import { kt } from "kantan-ui";

// ダッシュボード KPI
kt.metric("Total Revenue", "$45,231", { delta: "+12.5%", help: "Compared to last month" });
kt.metric("Active Users", 1_234, { delta: 156, help: "Daily active users" });
kt.metric("Conversion Rate", "3.2%", { delta: "-0.5%", delta_color: "inverse" });

// カラムレイアウトと組み合わせ
kt.columns(3, (cols) => {
  cols[0].metric("Revenue", "$12,345", { delta: "+8%" });
  cols[1].metric("Orders", 523, { delta: "+12" });
  cols[2].metric("Avg Order", "$23.60", { delta: "-$1.20", delta_color: "inverse" });
});

// 数値フォーマット済みの値
const revenue = 45231.5;
kt.metric("Revenue", `$${revenue.toLocaleString()}`);

// ヘルプ付き
kt.metric("CPU Usage", "78%", {
  delta: "+5%",
  delta_color: "inverse",
  help: "High CPU usage may affect performance"
});
```

---

## 3. 型定義

### 3.1 MetricConfig

```typescript
/**
 * kt.metric() の設定オプション
 */
export interface MetricConfig {
  /**
   * 変化量（前回比など）
   * 文字列: そのまま表示 (例: "+12%", "-$5")
   * 数値: 自動で符号を付与 (例: 12 → "+12", -5 → "-5")
   */
  delta?: string | number;

  /**
   * 変化量の色設定
   * - "normal": 正=緑、負=赤（デフォルト）
   * - "inverse": 正=赤、負=緑（増加が悪い場合）
   * - "off": 色なし（グレー）
   * @default "normal"
   */
  delta_color?: "normal" | "inverse" | "off";

  /**
   * ヘルプテキスト（ツールチップ）
   */
  help?: string;

  /**
   * ラベルの表示位置
   * @default "top"
   */
  label_visibility?: "visible" | "hidden" | "collapsed";
}
```

### 3.2 内部型

```typescript
type DeltaDirection = "positive" | "negative" | "neutral";
```

---

## 4. 実装詳細

### 4.1 HTML構造

```html
<div class="kt-metric">
  <div class="kt-metric-label">Revenue</div>
  <div class="kt-metric-value">$1,234</div>
  <div class="kt-metric-delta kt-metric-delta-positive">
    <span class="kt-metric-delta-icon">▲</span>
    <span class="kt-metric-delta-text">+12%</span>
  </div>
</div>
```

### 4.2 CSS クラス

| クラス | 説明 |
|--------|------|
| `.kt-metric` | コンテナ |
| `.kt-metric-label` | ラベル部分 |
| `.kt-metric-value` | 値部分（大きいフォント） |
| `.kt-metric-delta` | 変化量部分 |
| `.kt-metric-delta-positive` | 正の変化（緑） |
| `.kt-metric-delta-negative` | 負の変化（赤） |
| `.kt-metric-delta-neutral` | 中立（グレー） |
| `.kt-metric-delta-icon` | 矢印アイコン |
| `.kt-metric-help` | ヘルプアイコン |

### 4.3 Delta方向の判定ロジック

```typescript
function getDeltaDirection(delta: string | number): DeltaDirection {
  if (typeof delta === "number") {
    if (delta > 0) return "positive";
    if (delta < 0) return "negative";
    return "neutral";
  }

  // 文字列の場合: 先頭の符号または数値を解析
  const trimmed = delta.trim();
  if (trimmed.startsWith("+")) return "positive";
  if (trimmed.startsWith("-") || trimmed.startsWith("−")) return "negative";

  // 数値のみの文字列を解析
  const numMatch = trimmed.match(/^-?\d/);
  if (numMatch) {
    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      if (num > 0) return "positive";
      if (num < 0) return "negative";
    }
  }

  return "neutral";
}
```

### 4.4 色の決定ロジック

```typescript
function getDeltaColorClass(
  direction: DeltaDirection,
  colorMode: "normal" | "inverse" | "off"
): string {
  if (colorMode === "off") {
    return "kt-metric-delta-neutral";
  }

  if (colorMode === "inverse") {
    // 色を反転
    if (direction === "positive") return "kt-metric-delta-negative";
    if (direction === "negative") return "kt-metric-delta-positive";
    return "kt-metric-delta-neutral";
  }

  // normal
  return `kt-metric-delta-${direction}`;
}
```

### 4.5 アイコンの決定

```typescript
function getDeltaIcon(direction: DeltaDirection): string {
  switch (direction) {
    case "positive": return "▲";
    case "negative": return "▼";
    default: return "";
  }
}
```

---

## 5. セキュリティ

### 5.1 XSS対策

すべての入力値を `escapeHtml()` でエスケープ:

```typescript
function metric(label: string, value: string | number, config?: MetricConfig): void {
  const ctx = requireRenderContext();

  const escapedLabel = escapeHtml(label);
  const escapedValue = escapeHtml(String(value));
  const escapedDelta = config?.delta ? escapeHtml(formatDelta(config.delta)) : null;
  const escapedHelp = config?.help ? escapeHtml(config.help) : null;

  // ...
}
```

---

## 6. CSS スタイル

```css
/* Container */
.kt-metric {
  padding: 1rem;
  border-radius: 0.5rem;
  background: var(--kt-bg-secondary, #f8f9fa);
}

/* Label */
.kt-metric-label {
  font-size: 0.875rem;
  color: var(--kt-text-secondary, #6c757d);
  margin-bottom: 0.25rem;
}

/* Value */
.kt-metric-value {
  font-size: 2rem;
  font-weight: 600;
  color: var(--kt-text-primary, #212529);
  line-height: 1.2;
}

/* Delta container */
.kt-metric-delta {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

/* Delta colors */
.kt-metric-delta-positive {
  color: var(--kt-success, #28a745);
}

.kt-metric-delta-negative {
  color: var(--kt-danger, #dc3545);
}

.kt-metric-delta-neutral {
  color: var(--kt-text-secondary, #6c757d);
}

/* Delta icon */
.kt-metric-delta-icon {
  font-size: 0.75rem;
}

/* Help tooltip */
.kt-metric-help {
  display: inline-block;
  margin-left: 0.25rem;
  cursor: help;
  color: var(--kt-text-secondary, #6c757d);
}
```

---

## 7. イテレーション計画

### Iteration 1: 型定義とシンプル実装

**目標**: 基本的なmetric表示

**Red（テスト）**:
```typescript
// test/kt/metric.test.ts
describe("kt.metric", () => {
  it("renders label and value", () => {
    const ctx = createMockRenderContext();
    setRenderContext(ctx);
    metric("Revenue", "$1,234");
    const html = ctx.getHtml();
    expect(html).toContain("kt-metric");
    expect(html).toContain("Revenue");
    expect(html).toContain("$1,234");
  });

  it("escapes HTML in label and value", () => {
    const ctx = createMockRenderContext();
    setRenderContext(ctx);
    metric("<script>alert(1)</script>", "<img onerror=alert(1)>");
    const html = ctx.getHtml();
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
  });

  it("accepts number value", () => {
    const ctx = createMockRenderContext();
    setRenderContext(ctx);
    metric("Count", 1234);
    expect(ctx.getHtml()).toContain("1234");
  });
});
```

**Green（実装）**:
- `src/kt/metric.ts` 作成
- 基本のHTML生成

**成果物**: 基本metric表示

---

### Iteration 2: Delta表示

**目標**: 変化量の表示と色分け

**Red（テスト）**:
```typescript
describe("metric delta", () => {
  it("renders positive delta with green color", () => {
    metric("Revenue", "$1,234", { delta: "+12%" });
    const html = ctx.getHtml();
    expect(html).toContain("kt-metric-delta-positive");
    expect(html).toContain("+12%");
    expect(html).toContain("▲");
  });

  it("renders negative delta with red color", () => {
    metric("Revenue", "$1,234", { delta: "-5%" });
    const html = ctx.getHtml();
    expect(html).toContain("kt-metric-delta-negative");
    expect(html).toContain("▼");
  });

  it("handles numeric delta", () => {
    metric("Users", 100, { delta: 15 });
    expect(ctx.getHtml()).toContain("+15");
  });

  it("handles negative numeric delta", () => {
    metric("Users", 100, { delta: -15 });
    expect(ctx.getHtml()).toContain("-15");
  });
});
```

**Green（実装）**:
- delta解析ロジック
- 色クラス適用

**成果物**: delta付きmetric

---

### Iteration 3: Delta色モード

**目標**: inverse/off モード

**Red（テスト）**:
```typescript
describe("metric delta_color", () => {
  it("inverse mode: positive shows red", () => {
    metric("Response Time", "120ms", { delta: "+15ms", delta_color: "inverse" });
    expect(ctx.getHtml()).toContain("kt-metric-delta-negative");
  });

  it("inverse mode: negative shows green", () => {
    metric("Response Time", "120ms", { delta: "-15ms", delta_color: "inverse" });
    expect(ctx.getHtml()).toContain("kt-metric-delta-positive");
  });

  it("off mode: neutral color", () => {
    metric("Users", 100, { delta: "+50", delta_color: "off" });
    expect(ctx.getHtml()).toContain("kt-metric-delta-neutral");
  });
});
```

**Green（実装）**:
- delta_color ロジック

**成果物**: 完全なdelta色制御

---

### Iteration 4: Help & Label visibility

**目標**: ヘルプテキストとラベル表示制御

**Red（テスト）**:
```typescript
describe("metric help", () => {
  it("renders help tooltip", () => {
    metric("Revenue", "$1,234", { help: "Monthly revenue" });
    const html = ctx.getHtml();
    expect(html).toContain("kt-metric-help");
    expect(html).toContain("Monthly revenue");
  });

  it("escapes help text", () => {
    metric("Revenue", "$1,234", { help: "<script>xss</script>" });
    expect(ctx.getHtml()).not.toContain("<script>");
  });
});

describe("metric label_visibility", () => {
  it("hides label when hidden", () => {
    metric("Revenue", "$1,234", { label_visibility: "hidden" });
    expect(ctx.getHtml()).toContain('aria-label="Revenue"');
    expect(ctx.getHtml()).toContain("kt-sr-only");
  });

  it("collapses label when collapsed", () => {
    metric("Revenue", "$1,234", { label_visibility: "collapsed" });
    expect(ctx.getHtml()).not.toContain("Revenue");
  });
});
```

**Green（実装）**:
- help属性追加
- label_visibility実装

**成果物**: 完全なmetric API

---

### Iteration 5: CSS & 統合

**目標**: スタイルとkt名前空間への統合

**作業内容**:
- `src/styles/metric.ts` または既存スタイルに追加
- `src/kt/index.ts` にexport追加
- CSSをbase-styles.tsに追加

**成果物**: 完成したmetric API

---

## 8. チェックリスト

### 実装前
- [ ] 既存output.tsのパターン確認
- [ ] CSS変数の確認

### 各イテレーション後
- [ ] `bun run lint:fix`
- [ ] `bun run test`
- [ ] コミット

### 完了時
- [ ] `bun run ci` 全パス
- [ ] 全入力がエスケープされている
- [ ] Streamlit互換APIになっている

---

## 9. 参考資料

- [Streamlit st.metric](https://docs.streamlit.io/library/api-reference/data/st.metric)
- 既存実装: `src/kt/output.ts`, `src/kt/feedback.ts`
