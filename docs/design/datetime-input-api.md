# kt.datetime_input API 設計書

作成日: 2026-02-08

## 実装ステータス

> **⏳ 計画中**

---

## 1. 概要

### 1.1 目的

`kt.date_input()` と `kt.time_input()` を統合した日時入力ウィジェットを提供する。HTML5 の `<input type="datetime-local">` を使用し、日付と時刻を1つのウィジェットで入力できるようにする。

### 1.2 Streamlitとの比較

Streamlit には `st.datetime_input` は存在せず、`st.date_input()` と `st.time_input()` を個別に使用する必要がある。kantan-ui では HTML5 の `<input type="datetime-local">` を活用し、日付と時刻を1つのウィジェットで扱える **kantan-ui 独自のAPI** として提供する。

| 機能 | Streamlit | kantan-ui `kt.datetime_input` |
|------|-----------|-------------------------------|
| 日時統合入力 | ❌（`date_input` + `time_input` を併用） | ✅ 単一ウィジェット |
| ネイティブUI | N/A（カスタムUI） | ✅ ブラウザネイティブ |
| min/max 制約 | ✅（`date_input` のみ） | ✅ 日時の範囲指定 |
| 秒精度対応 | ✅（`time_input` の step） | ✅ step パラメータ |
| Date オブジェクト入力 | ✅ | ✅ string / Date 両対応 |
| 戻り値 | `datetime` | `string`（ISO形式） |
| 型安全性 | ❌ | ✅ TypeScript |
| disabled | ✅ | ✅ |

> **kantan-ui の優位性**: Streamlit では日付と時刻を別々の変数で管理し、結合する必要があるが、kantan-ui では `datetime_input` 1つで完結する。

### 1.3 設計原則

| 原則 | 説明 |
|------|------|
| **Web標準準拠** | `<input type="datetime-local">` をそのまま活用 |
| **既存パターン踏襲** | `date_input` / `time_input` と同じアーキテクチャ |
| **最小実装** | ブラウザネイティブ機能を最大限利用し、カスタムUIは作らない |
| **ユーティリティ再利用** | 既存の `toDateString` / `toTimeString` を活用した変換関数 |

### 1.4 技術選定の根拠

#### `<input type="datetime-local">` を採用する理由

| 代替案 | 不採用理由 |
|--------|-----------|
| `date_input` + `time_input` を並べる | 2つのウィジェットが必要。日時の結合処理がユーザー負担になる |
| カスタムカレンダーUI（JavaScript） | 外部依存 or 大量のJS実装が必要。最小依存の原則に反する |
| `<input type="datetime">` | HTML仕様から削除済み（非推奨） |
| テキスト入力 + バリデーション | UXが劣る。ブラウザネイティブピッカーの方がモバイル対応も優れる |

#### ブラウザ対応状況

`<input type="datetime-local">` のサポート状況（2025年時点）:

| ブラウザ | サポート | 備考 |
|---------|---------|------|
| Chrome 20+ | ✅ | カレンダー＋時刻ポップアップ |
| Edge 12+ | ✅ | Chromium版で完全対応 |
| Firefox 93+ | ✅ | 2021年10月〜対応 |
| Safari 14.1+ | ✅ | macOS/iOS対応 |
| Can I Use 全体 | **96%+** | 主要ブラウザで広くサポート |

> **判断**: 96%以上のブラウザサポート率があり、未対応ブラウザ向けのpolyfillは不要と判断。Web標準優先の方針に合致する。

#### 戻り値を `string` にする理由

| 代替案 | 不採用理由 |
|--------|-----------|
| `Date` オブジェクト | `date_input` / `time_input` が `string` を返す既存パターンとの一貫性を優先。`Date` はタイムゾーン問題を伴う |
| `{ date: string, time: string }` | 構造化は便利だが、既存パターンとの対称性が崩れる。`new Date(value)` で容易に変換可能 |

### 1.5 ユースケース

| ユースケース | 説明 |
|-------------|------|
| イベント作成 | 開始・終了日時の指定 |
| 予約システム | 予約日時の選択 |
| ログフィルタ | 期間指定によるデータ絞り込み |
| スケジューラ | タスクの期限設定 |

---

## 2. API設計

### 2.1 基本API

```typescript
// 基本的な使い方
const dt = kt.datetime_input("Start time");
// → ""（未選択時）

// デフォルト値付き
const dt = kt.datetime_input("Start time", "2026-01-15T09:00");
// → "2026-01-15T09:00"

// Date オブジェクトをデフォルト値に
const dt = kt.datetime_input("Deadline", new Date(2026, 0, 15, 9, 0));
// → "2026-01-15T09:00"

// 範囲指定付き
const dt = kt.datetime_input("Appointment", undefined, {
  min: "2026-01-01T00:00",
  max: "2026-12-31T23:59",
});

// 秒精度付き
const dt = kt.datetime_input("Precise time", undefined, {
  step: 1,
});
// → "2026-01-15T09:30:45"

// キー指定
const dt = kt.datetime_input("Event start", undefined, {
  key: "event_start",
});
```

### 2.2 シグネチャ

```typescript
function datetime_input(
  label: string,
  defaultValue?: string | Date,
  config?: Partial<DatetimeInputConfig>,
): string
```

### 2.3 パラメータ

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|------|------|-----------|------|
| `label` | `string` | ✅ | - | ラベルテキスト |
| `defaultValue` | `string \| Date` | - | `""` | 初期値（ISO形式文字列 or Date） |
| `config` | `Partial<DatetimeInputConfig>` | - | `{}` | 設定オプション |

### 2.4 戻り値

| 型 | 説明 |
|------|------|
| `string` | 選択された日時（`"YYYY-MM-DDTHH:MM"` or `"YYYY-MM-DDTHH:MM:SS"` 形式） |

**フォーマット詳細**:
- デフォルト: `"YYYY-MM-DDTHH:MM"`（例: `"2026-01-15T09:30"`）
- `step < 60` の場合: `"YYYY-MM-DDTHH:MM:SS"`（例: `"2026-01-15T09:30:45"`）
- 未選択時: `""`（空文字列）

> **注意**: `<input type="datetime-local">` の値はタイムゾーン情報を含まない。ローカル日時として扱う。

---

## 3. 型定義

### 3.1 DatetimeInputConfig

```typescript
export interface DatetimeInputConfig {
  /** ラベルテキスト */
  label: string;

  /** デフォルト値（ISO形式文字列 or Date） */
  defaultValue?: string | Date;

  /** 選択可能な最小日時 */
  min?: string | Date;

  /** 選択可能な最大日時 */
  max?: string | Date;

  /**
   * 秒単位のステップ値
   * - undefined: デフォルト（分単位、秒なし）
   * - 60以上: 分単位のステップ
   * - 60未満: 秒精度が有効になる（例: 1 = 1秒刻み）
   */
  step?: number;

  /** ウィジェットキー（状態保持用） */
  key?: string;

  /** 無効化フラグ */
  disabled?: boolean;
}
```

> **注意**: `label` と `defaultValue` は関数の引数として渡されるため、`config` 経由では通常使用しない。既存の `DateInputConfig` / `TimeInputConfig` とのインターフェース対称性のために定義している。

---

## 4. 日時変換ユーティリティ

### 4.1 `toDatetimeString`

既存の `toDateString` / `toTimeString` と同様のパターンで、`src/utils/date.ts` に追加する。

```typescript
/**
 * Date オブジェクトまたは文字列を "YYYY-MM-DDTHH:MM" または
 * "YYYY-MM-DDTHH:MM:SS" 形式の文字列に変換
 *
 * Invalid Date が渡された場合は空文字列を返す（安全側に倒す）
 */
export function toDatetimeString(
  value: string | Date | undefined,
  includeSeconds = false,
): string {
  if (value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  // Invalid Date チェック
  if (Number.isNaN(value.getTime())) {
    return "";
  }
  const datePart = toDateString(value);
  const timePart = toTimeString(value, includeSeconds);
  return `${datePart}T${timePart}`;
}
```

**設計判断**:
- `toDateString` と `toTimeString` を組み合わせることで、既存のテスト済みロジックを再利用し、重複を避ける
- Invalid Date に対しては空文字列を返す。`"NaN-NaN-NaN..."` のような不正値がHTMLに出力されることを防ぐ

---

## 5. HTML構造

### 5.1 生成されるHTML

```html
<div id="widget_0-container" class="kt-datetime-input-container">
  <label for="widget_0" class="kt-datetime-input-label">Start time</label>
  <input
    type="datetime-local"
    id="widget_0"
    value="2026-01-15T09:00"
    data-kt-event="change"
    class="kt-datetime-input" />
</div>
```

### 5.2 min/max/step 付き

```html
<div id="widget_0-container" class="kt-datetime-input-container">
  <label for="widget_0" class="kt-datetime-input-label">Appointment</label>
  <input
    type="datetime-local"
    id="widget_0"
    value=""
    min="2026-01-01T00:00"
    max="2026-12-31T23:59"
    step="1"
    data-kt-event="change"
    class="kt-datetime-input" />
</div>
```

### 5.3 属性

| 属性 | 値 | 説明 |
|------|------|------|
| `type` | `"datetime-local"` | ブラウザネイティブの日時ピッカー |
| `data-kt-event` | `"change"` | 値変更時にrerunをトリガー |
| `class` | `"kt-datetime-input"` | スタイリング用クラス |
| `min` | ISO日時文字列 | 選択可能な最小日時（任意） |
| `max` | ISO日時文字列 | 選択可能な最大日時（任意） |
| `step` | 数値 | ステップ値（秒単位、任意） |
| `disabled` | - | 入力無効化（任意） |

---

## 6. CSSスタイル

`src/styles/default.ts` の `baseStyles` セクションに追加。既存の `date-input` / `time-input` と同じパターン。

```css
/* Datetime Input */
.kt-datetime-input-container { margin: 10px 0; }
.kt-datetime-input-label { display: block; margin-bottom: 4px; }
.kt-datetime-input { padding: 8px; }
```

---

## 7. ファイル構成

```
src/
├── utils/
│   └── date.ts                    # toDatetimeString を追加
├── widgets/
│   ├── types.ts                   # DatetimeInputConfig を追加
│   ├── datetime-input.ts          # 新規: datetime_input / renderDatetimeInput
│   ├── core.ts                    # initializeDatetimeInputState を追加
│   └── index.ts                   # エクスポート追加
├── kt/
│   └── widgets.ts                 # 宣言的API追加
├── styles/
│   └── default.ts                 # CSS追加

tests/
├── unit/
│   ├── utils/
│   │   ├── date.test.ts           # toDatetimeString テスト追加
│   │   └── date.prop.test.ts      # toDatetimeString プロパティテスト追加
│   └── widgets/
│       └── datetime-input.test.ts # 新規: ユニットテスト
```

---

## 8. 実装詳細

### 8.1 命令型関数（`src/widgets/datetime-input.ts`）

```typescript
import { toDatetimeString } from "../utils/date";
import { raw, renderHtml } from "../utils/html";
import { initializeDatetimeInputState } from "./core";
import { generateWidgetId } from "./registry";
import type { DatetimeInputConfig } from "./types";

/**
 * 数値属性を検証し、無効な場合はundefinedを返す
 */
function validateNumericAttr(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

/**
 * 日時入力ウィジェット
 * 現在の入力値を返す（初回はデフォルト値）
 * 値は "YYYY-MM-DDTHH:MM" または "YYYY-MM-DDTHH:MM:SS" 形式の文字列
 */
export function datetime_input(
  _label: string,
  defaultValue?: string | Date,
  config?: Partial<DatetimeInputConfig>,
): string {
  const id = generateWidgetId(config?.key);
  const includeSeconds = config?.step !== undefined && config.step < 60;
  const defaultStr = toDatetimeString(defaultValue, includeSeconds);
  return initializeDatetimeInputState(id, defaultStr);
}

/**
 * 日時入力のHTMLをレンダリング
 */
export function renderDatetimeInput(
  label: string,
  value: string,
  config?: Partial<DatetimeInputConfig>,
): string {
  const id = generateWidgetId(config?.key);
  const disabled = config?.disabled ? " disabled" : "";

  const includeSeconds = config?.step !== undefined && config.step < 60;
  const minStr = toDatetimeString(config?.min, includeSeconds);
  const maxStr = toDatetimeString(config?.max, includeSeconds);
  const minAttr = minStr ? ` min="${minStr}"` : "";
  const maxAttr = maxStr ? ` max="${maxStr}"` : "";

  const validStep = validateNumericAttr(config?.step);
  const stepAttr = validStep !== undefined ? ` step="${validStep}"` : "";

  return renderHtml`<div id="${raw(id)}-container" class="kt-datetime-input-container">
  <label for="${raw(id)}" class="kt-datetime-input-label">${label}</label>
  <input type="datetime-local" id="${raw(id)}" value="${value}" data-kt-event="change" class="kt-datetime-input"${raw(minAttr)}${raw(maxAttr)}${raw(stepAttr)}${raw(disabled)} />
</div>`;
}
```

### 8.2 状態初期化（`src/widgets/core.ts` への追加）

```typescript
export function initializeDatetimeInputState(
  widgetId: string,
  defaultValue?: string,
): string {
  return initializeWidgetState(widgetId, defaultValue ?? "");
}
```

### 8.3 宣言的API（`src/kt/widgets.ts` への追加）

```typescript
import {
  datetime_input as imperativeDatetimeInput,
  renderDatetimeInput,
} from "../widgets/datetime-input";
import type { DatetimeInputConfig } from "../widgets/types";

export function datetime_input(
  label: string,
  defaultValue?: string | Date,
  config?: Partial<DatetimeInputConfig>,
): string {
  return wrapWidget(
    config,
    (cfg) => imperativeDatetimeInput(label, defaultValue, cfg),
    (value, cfg) => renderDatetimeInput(label, value, cfg),
  );
}
```

### 8.4 公開API（`src/kt/index.ts` への追加）

```typescript
// kt オブジェクトの Widgets セクション
datetime_input: widgets.datetime_input,
```

---

## 9. テスト計画

### 9.1 ユーティリティテスト（`tests/unit/utils/date.test.ts` への追加）

```typescript
describe("toDatetimeString", () => {
  it("should return empty string for undefined", () => {
    expect(toDatetimeString(undefined)).toBe("");
  });

  it("should return strings as-is", () => {
    expect(toDatetimeString("2026-01-15T09:30")).toBe("2026-01-15T09:30");
  });

  it("should convert Date to YYYY-MM-DDTHH:MM format", () => {
    const date = new Date(2026, 0, 15, 9, 30);
    expect(toDatetimeString(date)).toBe("2026-01-15T09:30");
  });

  it("should include seconds when includeSeconds is true", () => {
    const date = new Date(2026, 0, 15, 9, 30, 45);
    expect(toDatetimeString(date, true)).toBe("2026-01-15T09:30:45");
  });

  it("should zero-pad all components", () => {
    const date = new Date(2026, 0, 5, 3, 7);
    expect(toDatetimeString(date)).toBe("2026-01-05T03:07");
  });

  it("should handle midnight", () => {
    const date = new Date(2026, 0, 1, 0, 0, 0);
    expect(toDatetimeString(date)).toBe("2026-01-01T00:00");
    expect(toDatetimeString(date, true)).toBe("2026-01-01T00:00:00");
  });

  it("should handle end of day", () => {
    const date = new Date(2026, 11, 31, 23, 59, 59);
    expect(toDatetimeString(date, true)).toBe("2026-12-31T23:59:59");
  });

  it("should return empty string for Invalid Date", () => {
    expect(toDatetimeString(new Date("invalid"))).toBe("");
    expect(toDatetimeString(new Date(NaN))).toBe("");
  });
});
```

### 9.2 プロパティテスト（`tests/unit/utils/date.prop.test.ts` への追加）

```typescript
describe("toDatetimeString (property-based)", () => {
  it("should always match YYYY-MM-DDTHH:MM format", () => {
    fc.assert(
      fc.property(fc.date(), (date) => {
        const result = toDatetimeString(date);
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
      }),
    );
  });

  it("should always match YYYY-MM-DDTHH:MM:SS format with seconds", () => {
    fc.assert(
      fc.property(fc.date(), (date) => {
        const result = toDatetimeString(date, true);
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
      }),
    );
  });

  it("should pass through strings unchanged", () => {
    fc.assert(
      fc.property(fc.string(), (str) => {
        expect(toDatetimeString(str)).toBe(str);
      }),
    );
  });

  it("without seconds should be prefix of with seconds", () => {
    fc.assert(
      fc.property(fc.date(), (date) => {
        const withoutSec = toDatetimeString(date);
        const withSec = toDatetimeString(date, true);
        expect(withSec.startsWith(withoutSec)).toBe(true);
      }),
    );
  });

  it("should equal toDateString + T + toTimeString", () => {
    fc.assert(
      fc.property(fc.date(), (date) => {
        const result = toDatetimeString(date);
        const expected = `${toDateString(date)}T${toTimeString(date)}`;
        expect(result).toBe(expected);
      }),
    );
  });
});
```

### 9.3 ウィジェットテスト（`tests/unit/widgets/datetime-input.test.ts`）

既存の `date-input.test.ts` と同じセットアップパターンを使用する。

```typescript
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  resetSessionManager,
  SessionManager,
  setSessionManager,
} from "../../../src/session/manager";
import { setCurrentSessionId } from "../../../src/session/state";
import {
  datetime_input,
  renderDatetimeInput,
} from "../../../src/widgets/datetime-input";
import { resetWidgetCounter, setWidgetValue } from "../../../src/widgets/registry";

describe("datetime_input", () => {
  let manager: SessionManager;

  beforeEach(() => {
    resetWidgetCounter();
    manager = new SessionManager();
    setSessionManager(manager);
  });

  afterEach(() => {
    setCurrentSessionId(null);
    resetSessionManager();
  });

  // --- 状態管理 ---
  it("should return default value on first call", () => {
    const session = manager.createSession();
    setCurrentSessionId(session.id);
    const result = datetime_input("Start", "2026-01-15T09:00");
    expect(result).toBe("2026-01-15T09:00");
  });

  it("should return empty string when no default provided", () => {
    const session = manager.createSession();
    setCurrentSessionId(session.id);
    const result = datetime_input("Start");
    expect(result).toBe("");
  });

  it("should return stored value on subsequent calls", () => {
    const session = manager.createSession();
    setCurrentSessionId(session.id);
    datetime_input("Start", "2026-01-15T09:00", { key: "dt_test" });
    setWidgetValue("dt_test", "2026-06-01T14:30");
    const result = datetime_input("Start", "2026-01-15T09:00", { key: "dt_test" });
    expect(result).toBe("2026-06-01T14:30");
  });

  it("should use custom key when provided", () => {
    const session = manager.createSession();
    setCurrentSessionId(session.id);
    const result = datetime_input("Start", "2026-01-15T09:00", {
      key: "my_datetime",
    });
    expect(result).toBe("2026-01-15T09:00");
  });

  it("should accept Date object as default value", () => {
    const session = manager.createSession();
    setCurrentSessionId(session.id);
    const date = new Date(2026, 0, 15, 9, 0);
    const result = datetime_input("Start", date);
    expect(result).toBe("2026-01-15T09:00");
  });

  it("should include seconds when step < 60", () => {
    const session = manager.createSession();
    setCurrentSessionId(session.id);
    const date = new Date(2026, 0, 15, 9, 30, 45);
    const result = datetime_input("Start", date, { step: 1 });
    expect(result).toBe("2026-01-15T09:30:45");
  });
});

describe("renderDatetimeInput", () => {
  // --- HTML出力 ---
  it("should render datetime-local input", () => {
    const html = renderDatetimeInput("Start", "2026-01-15T09:00");
    expect(html).toContain('type="datetime-local"');
    expect(html).toContain('value="2026-01-15T09:00"');
  });

  it("should render min and max attributes", () => {
    const html = renderDatetimeInput("Start", "", {
      min: "2026-01-01T00:00",
      max: "2026-12-31T23:59",
    });
    expect(html).toContain('min="2026-01-01T00:00"');
    expect(html).toContain('max="2026-12-31T23:59"');
  });

  it("should render step attribute", () => {
    const html = renderDatetimeInput("Start", "", { step: 1 });
    expect(html).toContain('step="1"');
  });

  it("should escape HTML in labels", () => {
    const html = renderDatetimeInput("<script>alert(1)</script>", "");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("should support disabled attribute", () => {
    const html = renderDatetimeInput("Start", "", { disabled: true });
    expect(html).toContain("disabled");
  });

  it("should convert Date objects in min/max", () => {
    const html = renderDatetimeInput("Start", "", {
      min: new Date(2026, 0, 1, 0, 0),
      max: new Date(2026, 11, 31, 23, 59),
    });
    expect(html).toContain('min="2026-01-01T00:00"');
    expect(html).toContain('max="2026-12-31T23:59"');
  });

  it("should reject non-numeric step values (security)", () => {
    const html = renderDatetimeInput("Start", "", {
      step: Number.NaN,
    });
    expect(html).not.toContain("step=");
  });

  it("should use data-kt-event change", () => {
    const html = renderDatetimeInput("Start", "");
    expect(html).toContain('data-kt-event="change"');
  });
});
```

### 9.4 E2Eテスト（将来）

Playwright による E2E テストは環境構築後に実施する。テストシナリオ:

```typescript
test("datetime_input should update value on user interaction", async ({ page }) => {
  await page.goto("/");
  const input = page.locator('input[type="datetime-local"]');
  await input.fill("2026-03-15T10:30");
  // rerun後の値更新を確認
  await expect(input).toHaveValue("2026-03-15T10:30");
});

test("datetime_input should respect min/max constraints", async ({ page }) => {
  await page.goto("/");
  const input = page.locator('input[type="datetime-local"]');
  await expect(input).toHaveAttribute("min", "2026-01-01T00:00");
  await expect(input).toHaveAttribute("max", "2026-12-31T23:59");
});

test("datetime_input should be disabled when configured", async ({ page }) => {
  await page.goto("/");
  const input = page.locator('input[type="datetime-local"]');
  await expect(input).toBeDisabled();
});
```

---

## 10. イテレーション計画

### Iteration 1: ユーティリティ関数とテスト

**目標**: `toDatetimeString` の追加とテスト

**Red（テスト作成）**:
- `tests/unit/utils/date.test.ts` に `toDatetimeString` のテストを追加
- `tests/unit/utils/date.prop.test.ts` にプロパティテストを追加

**Green（実装）**:
- `src/utils/date.ts` に `toDatetimeString` を追加

**Refactor**:
- 既存の `toDateString` / `toTimeString` を再利用していることを確認

**成果物**: `toDatetimeString` 関数 + テスト

---

### Iteration 2: 型定義と命令型関数

**目標**: `DatetimeInputConfig` と `datetime_input()` 命令型関数の実装

**Red（テスト作成）**:
- `tests/unit/widgets/datetime-input.test.ts` を作成

**Green（実装）**:
- `src/widgets/types.ts` に `DatetimeInputConfig` を追加
- `src/widgets/core.ts` に `initializeDatetimeInputState` を追加
- `src/widgets/datetime-input.ts` を新規作成
- `src/widgets/index.ts` にエクスポート追加

**Refactor**:
- `date_input` / `time_input` との対称性を確認

**成果物**: 命令型 `datetime_input` + `renderDatetimeInput` + テスト

---

### Iteration 3: 宣言的APIとスタイル

**目標**: `kt.datetime_input()` の実装とCSS追加

**Red（テスト作成）**:
- 宣言的APIのテスト（`wrapWidget` 経由で `renderContext` に HTML が追加されることを確認）

**Green（実装）**:
- `src/kt/widgets.ts` に `datetime_input` ラッパーを追加
- `src/kt/index.ts` の `kt` オブジェクトにエクスポート追加
- `src/styles/default.ts` に `.kt-datetime-input-*` スタイルを追加

**Refactor**:
- `kt.date_input` / `kt.time_input` / `kt.datetime_input` の3つが対称的な構造であることを確認

**成果物**: 完全な `kt.datetime_input()` API

---

## 11. `date_input` / `time_input` との対称性

| 項目 | `date_input` | `time_input` | `datetime_input` |
|------|-------------|-------------|------------------|
| HTML type | `date` | `time` | `datetime-local` |
| 戻り値 | `"YYYY-MM-DD"` | `"HH:MM"` / `"HH:MM:SS"` | `"YYYY-MM-DDTHH:MM"` / `"YYYY-MM-DDTHH:MM:SS"` |
| min/max | ✅ `string \| Date` | ❌ | ✅ `string \| Date` |
| step | ❌ | ✅ | ✅ |
| disabled | ✅ | ✅ | ✅ |
| Date 入力 | ✅ | ✅ | ✅ |
| 変換関数 | `toDateString` | `toTimeString` | `toDatetimeString` |
| イベント | `change` | `change` | `change` |

---

## 12. 非実装項目（将来検討）

| 項目 | 理由 |
|------|------|
| タイムゾーン対応 | `datetime-local` はタイムゾーンを含まない。必要な場合はユーザー側で変換 |
| 日時範囲選択（from/to） | 2つの `datetime_input` を組み合わせることで実現可能 |
| カスタムカレンダーUI | ブラウザネイティブUIを優先。カスタムUIはPhase 2で検討 |
| Date オブジェクト返却 | 文字列返却で統一。`new Date(value)` でユーザー側で変換可能 |
| ISO 8601 タイムゾーン付き形式 | `"Z"` や `"+09:00"` 付き形式はスコープ外 |

---

## 13. エッジケース・異常系

### 13.1 入力値の異常系

| ケース | 挙動 | 理由 |
|--------|------|------|
| `defaultValue` が `undefined` | 空文字列 `""` を返す | 既存 `date_input` / `time_input` と同じ挙動 |
| `defaultValue` が不正な文字列（例: `"abc"`） | そのまま文字列として保存される | `toDatetimeString` は文字列をパススルーする。ブラウザ側が `<input>` で無効値として扱う |
| `defaultValue` が Invalid Date | 空文字列 `""` を返す | `toDatetimeString` 内で `Number.isNaN(value.getTime())` チェックを行い、Invalid Date は `""` に変換する。既存の `toDateString` / `toTimeString` との一貫性は崩れるが、安全側に倒す |
| ユーザーがブラウザで入力をクリア | 空文字列 `""` が状態に保存される | `<input type="datetime-local">` のクリア操作は `change` イベントで `""` を送信する。これは正常な操作であり、未選択状態として扱う |
| `min` > `max` | ブラウザのネイティブ挙動に委ねる | HTML仕様上、ブラウザは `min` > `max` を無視する。サーバーサイド検証は行わない |
| `step` が負数 | `validateNumericAttr` により有効な数値として扱われる | HTML仕様上、負の step は無視される。ブラウザのネイティブ挙動に委ねる |
| `step` が `0` | `validateNumericAttr` により `0` がそのまま出力 | HTML仕様上、`step="0"` はエラー。ブラウザ側で適切に処理される |
| `step` が `Infinity` | `Number.isFinite` チェックにより除外 | `validateNumericAttr` で `undefined` 扱い |

### 13.2 ブラウザ間の挙動差異

| ブラウザ | 挙動 |
|---------|------|
| Chrome/Edge | カレンダー＋時刻ポップアップ表示。秒入力はstep依存 |
| Firefox | テキストフィールド風のUI。スピナーボタン付き |
| Safari | macOS/iOSでネイティブ対応（iOS 14.5+、macOS Safari 14.1+） |
| モバイル全般 | OS標準の日時ピッカーが表示される |

> **対応方針**: ブラウザネイティブUIに委ねる。未対応ブラウザへのpolyfillやfallbackは提供しない（最小実装の原則）。Can I Use 上の `datetime-local` サポート率は主要ブラウザで96%以上（2025年時点）。

### 13.3 タイムゾーンに関する注意

`<input type="datetime-local">` はタイムゾーン情報を含まない。値は常にローカル日時として扱われる。

- サーバーに送信する際にUTC変換が必要な場合、ユーザー側で `new Date(value)` を使用して変換する
- 異なるタイムゾーンのユーザー間で日時を共有する場合は、アプリケーション層でタイムゾーン管理が必要

---

## 14. セキュリティ考慮事項

| 脅威 | 対策 | 実装箇所 |
|------|------|---------|
| XSS（label注入） | Hono テンプレートリテラルによる自動エスケープ | `renderDatetimeInput` |
| 属性注入（step） | `validateNumericAttr` による数値検証（`Number.isFinite`） | `renderDatetimeInput` |
| 属性注入（min/max） | `toDatetimeString` が文字列/Dateのみ許可。`raw()` はID等の内部生成値のみに使用 | `renderDatetimeInput` |
| value属性への注入 | Hono テンプレートリテラルが `value="${value}"` を自動エスケープ | `renderDatetimeInput` |
| data-kt-event改ざん | サーバーサイドでイベント種別を検証。`"change"` のみ受け付ける | イベントハンドラ（既存基盤） |

> **サーバーサイド検証について**: `datetime-local` の制約（min/max/step）はクライアントサイドのみの検証であり、ユーザーがDevToolsで値を改変可能。アプリケーション層で日時値のバリデーションが必要な場合は、ユーザーコード側で実施する。kantan-uiフレームワークとしては、XSS防止とHTML属性注入防止に責任を持つ。

---

## 15. チェックリスト

### 実装前

- [ ] 既存ウィジェット実装パターンを確認（`date-input.ts` / `time-input.ts`）
- [ ] `<input type="datetime-local">` のブラウザ対応状況を確認

### 各イテレーション後

- [ ] `bun run lint:fix` 実行
- [ ] `bun run test` 実行
- [ ] コミット

### 完了時

- [ ] `bun run ci` 全パス
- [ ] 単体テスト作成済み
- [ ] プロパティテスト作成済み
- [ ] ドキュメント更新（本設計書の実装ステータスを ✅ に変更）

---

## 16. 参考資料

- [MDN input type="datetime-local"](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/datetime-local)
- [HTML Living Standard - datetime-local](https://html.spec.whatwg.org/multipage/input.html#local-date-and-time-state-(type=datetime-local))
- kantan-ui 既存実装
  - `src/widgets/date-input.ts` - 日付入力パターン
  - `src/widgets/time-input.ts` - 時刻入力パターン
  - `src/utils/date.ts` - 日時変換ユーティリティ
  - `src/widgets/types.ts` - Config インターフェース定義
