# セキュリティ脆弱性修正計画

## 概要

過去1週間のコミットで発見されたセキュリティ脆弱性を修正する計画。

## 発見された脆弱性

### 高リスク: CSSインジェクション

| 優先度 | ファイル | 行 | 問題 |
|--------|----------|-----|------|
| P1 | `src/kt/layout.ts` | 134 | `container` の height |
| P1 | `src/kt/layout.ts` | 190 | `columns` の gap |
| P1 | `src/kt/chat.ts` | 88 | `chat_container` の height |
| P1 | `src/kt/feedback.ts` | 101 | `progress` の color |
| P2 | `src/utils/html.ts` | 36 | `buildStyleAttr` のエスケープ漏れ |

### 中リスク: 実行時型検証の欠如

| 優先度 | ファイル | 行 | 問題 |
|--------|----------|-----|------|
| P2 | `src/widgets/text-input.ts` | 31 | input type の未検証 |
| P2 | `src/widgets/time-input.ts` | 39 | step 属性の未検証 |

## 設計方針

### 1. CSS値サニタイズ戦略

CSSインジェクションを防ぐため、2層の防御を実装:

```
┌─────────────────────────────────────────────────────┐
│                    入力値                            │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│  Layer 1: 型検証 (TypeScript + Runtime Validation)  │
│  - 許可された型のみ受け入れ                          │
│  - 数値は Number() でパース                          │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│  Layer 2: サニタイズ (危険な文字を除去/エスケープ)   │
│  - セミコロン、波括弧、url() 等を除去                │
│  - CSS値として安全な形式に正規化                     │
└──────────────────────┬──────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────┐
│                  安全な出力                          │
└─────────────────────────────────────────────────────┘
```

### 2. 新規ユーティリティ関数

`src/utils/css.ts` に以下を追加:

```typescript
/**
 * CSS長さ値をサニタイズ（height, width, gap 等用）
 * 許可: 数値 + 単位 (px, rem, em, %, vh, vw, etc.)
 *
 * @example
 * sanitizeCssLength("100px")     // "100px"
 * sanitizeCssLength("10rem")     // "10rem"
 * sanitizeCssLength("50%")       // "50%"
 * sanitizeCssLength("100px; background: red") // "100px" (危険部分除去)
 */
export function sanitizeCssLength(value: string): string;

/**
 * CSS色値をサニタイズ
 * 許可: hex, rgb(), rgba(), hsl(), hsla(), 色名
 *
 * @example
 * sanitizeCssColor("#ff0000")           // "#ff0000"
 * sanitizeCssColor("rgb(255, 0, 0)")    // "rgb(255, 0, 0)"
 * sanitizeCssColor("red")               // "red"
 * sanitizeCssColor("red; } .x {")       // "red" (危険部分除去)
 */
export function sanitizeCssColor(value: string): string;

/**
 * 汎用CSS値サニタイズ（セミコロン、波括弧等を除去）
 */
export function sanitizeCssValue(value: string): string;
```

### 3. 実行時型検証

ホワイトリスト方式で許可された値のみ受け入れ:

```typescript
// text-input の type 検証
const VALID_INPUT_TYPES = ["text", "password", "email", "tel", "url"] as const;
type InputType = typeof VALID_INPUT_TYPES[number];

function validateInputType(type: unknown): InputType {
  if (typeof type === "string" && VALID_INPUT_TYPES.includes(type as InputType)) {
    return type as InputType;
  }
  return "text"; // デフォルト値にフォールバック
}
```

## イテレーション計画

### Iteration 1: CSSサニタイズユーティリティ追加

**目標**: 新規ユーティリティ `src/utils/css.ts` を TDD で実装

**ファイル**:
- `src/utils/css.ts` (新規)
- `tests/unit/utils/css.test.ts` (新規)

**テストケース**:
```typescript
describe("sanitizeCssLength", () => {
  it("accepts valid length values", () => {
    expect(sanitizeCssLength("100px")).toBe("100px");
    expect(sanitizeCssLength("1.5rem")).toBe("1.5rem");
    expect(sanitizeCssLength("50%")).toBe("50%");
    expect(sanitizeCssLength("100vh")).toBe("100vh");
  });

  it("removes dangerous characters", () => {
    expect(sanitizeCssLength("100px; background: red")).toBe("100px");
    expect(sanitizeCssLength("100px}")).toBe("100px");
    expect(sanitizeCssLength("url('evil.com')")).toBe(""); // 無効
  });
});

describe("sanitizeCssColor", () => {
  it("accepts valid color values", () => {
    expect(sanitizeCssColor("#fff")).toBe("#fff");
    expect(sanitizeCssColor("#ffffff")).toBe("#ffffff");
    expect(sanitizeCssColor("rgb(255, 0, 0)")).toBe("rgb(255, 0, 0)");
    expect(sanitizeCssColor("red")).toBe("red");
  });

  it("removes dangerous patterns", () => {
    expect(sanitizeCssColor("red; } .x {")).toBe("red");
    expect(sanitizeCssColor("url('evil')")).toBe(""); // 無効
  });
});
```

**コミット**: `feat(security): add CSS value sanitization utilities`

---

### Iteration 2: layout.ts の修正

**目標**: `container` と `columns` の CSSインジェクション修正

**変更前**:
```typescript
// container (line 134)
styles.push(`height: ${config.height}`);

// columns (line 190)
ctx.append(`...style="display: flex; gap: ${gap};">`);
```

**変更後**:
```typescript
import { sanitizeCssLength } from "../utils/css";

// container
styles.push(`height: ${sanitizeCssLength(config.height)}`);

// columns
const safeGap = sanitizeCssLength(gap);
ctx.append(`...style="display: flex; gap: ${safeGap};">`);
```

**テスト追加**:
```typescript
describe("container security", () => {
  it("sanitizes height to prevent CSS injection", () => {
    // height に悪意のある値を渡してもサニタイズされる
  });
});
```

**コミット**: `fix(security): sanitize CSS values in layout.ts`

---

### Iteration 3: chat.ts / feedback.ts の修正

**目標**: `chat_container` と `progress` の CSSインジェクション修正

**chat.ts 変更**:
```typescript
import { sanitizeCssLength } from "../utils/css";

// chat_container (line 88)
const height = sanitizeCssLength(config.height ?? "400px");
```

**feedback.ts 変更**:
```typescript
import { sanitizeCssColor } from "../utils/css";

// progress (line 101)
const color = sanitizeCssColor(config.color ?? "#3498db");
```

**コミット**: `fix(security): sanitize CSS values in chat.ts and feedback.ts`

---

### Iteration 4: 実行時型検証の追加

**目標**: text-input と time-input の実行時検証

**src/utils/validation.ts に追加**:
```typescript
// Input type ホワイトリスト
const VALID_INPUT_TYPES = ["text", "password", "email", "tel", "url"] as const;

export function validateInputType(type: unknown): string {
  if (typeof type === "string" &&
      (VALID_INPUT_TYPES as readonly string[]).includes(type)) {
    return type;
  }
  return "text";
}

// 数値属性の検証
export function validateNumericAttr(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}
```

**text-input.ts 変更**:
```typescript
import { validateInputType } from "../utils/validation";

const inputType = validateInputType(config?.type);
```

**time-input.ts 変更**:
```typescript
import { validateNumericAttr } from "../utils/validation";

const step = validateNumericAttr(config?.step);
const stepAttr = step !== undefined ? ` step="${step}"` : "";
```

**コミット**: `fix(security): add runtime type validation for widget attributes`

---

### Iteration 5: buildStyleAttr の修正

**目標**: `src/utils/html.ts` の `buildStyleAttr` を安全に

**変更前**:
```typescript
export function buildStyleAttr(styles: Record<string, string | number | undefined | null>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(styles)) {
    if (value === undefined || value === null || value === "") continue;
    parts.push(`${key}: ${value}`);  // 未サニタイズ
  }
  return parts.length > 0 ? `style="${parts.join("; ")}"` : "";
}
```

**変更後**:
```typescript
import { sanitizeCssValue } from "./css";

export function buildStyleAttr(styles: Record<string, string | number | undefined | null>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(styles)) {
    if (value === undefined || value === null || value === "") continue;
    const safeValue = typeof value === "number" ? String(value) : sanitizeCssValue(value);
    parts.push(`${key}: ${safeValue}`);
  }
  return parts.length > 0 ? `style="${parts.join("; ")}"` : "";
}
```

**コミット**: `fix(security): sanitize CSS values in buildStyleAttr`

---

## 完了条件

各イテレーション完了後:
1. `bun run lint:fix` が成功
2. `bun run ci` が成功
3. コミット & プッシュ

全イテレーション完了後:
1. 全テストが通過
2. 手動でCSSインジェクションが防がれることを確認
3. PRを作成

## リスク評価

| リスク | 対策 |
|--------|------|
| 既存機能の破壊 | 各変更でテストを追加、CIで確認 |
| サニタイズが厳しすぎる | 許可パターンを十分に広く設定 |
| パフォーマンス低下 | 正規表現を事前コンパイル、簡易チェックを先行 |

## タイムライン

- Iteration 1: ユーティリティ追加 (基盤)
- Iteration 2: layout.ts 修正
- Iteration 3: chat.ts / feedback.ts 修正
- Iteration 4: 実行時型検証追加
- Iteration 5: buildStyleAttr 修正
- 最終確認 & PR作成
