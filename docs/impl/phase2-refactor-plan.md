# Phase 2 リファクタリング計画

## 概要

コードレビューで発見された4つの改善点をイテレーティブに修正する。

## 改善点一覧

| # | 問題 | 優先度 | 影響範囲 |
|---|------|--------|----------|
| 1 | アイコンのエスケープ漏れ | 高 | output.ts |
| 2 | progress値の正規化ロジック | 中 | feedback.ts |
| 3 | 色定義の重複 | 中 | feedback.ts, output.ts |
| 4 | インラインスタイルの多用 | 低 | 全体 |

---

## Iteration 1: アイコンのエスケープ修正

### 問題
`output.ts:101` でカスタムアイコンがエスケープされていない。

```typescript
// 現状（危険）
const icon = config.icon ?? defaultIcons[type];
ctx.append(`<span class="kt-alert-icon">${icon}</span>`);
```

### 設計

**方針**: デフォルトアイコンは安全な値なのでそのまま、カスタムアイコンのみエスケープ。

```typescript
// 修正後
const icon = config.icon ? escapeHtml(config.icon) : defaultIcons[type];
```

### TDDサイクル

1. **Red**: カスタムアイコンにXSSペイロードを渡すテストを追加
2. **Green**: エスケープ処理を追加
3. **Refactor**: 不要

### 影響ファイル
- `src/kt/output.ts`
- `tests/unit/kt/output.test.ts`

---

## Iteration 2: progress値の正規化ロジック改善

### 問題
`value > 1` の判定では `1.5` などの値が意図しない動作になる。

```typescript
// 現状
const normalizedValue = value > 1 ? value / 100 : value;
// progress(1.5) → 1.5% (期待: 100%にクランプ)
```

### 設計

**方針**: 明確なしきい値（1.0）を境界とし、ドキュメントで仕様を明確化。

```typescript
// 修正後
// 0-1 範囲の値はそのまま使用、1より大きい値は0-100%として解釈
// 1.0は100%として扱う（0-1範囲の最大値）
const normalizedValue = value > 1 ? value / 100 : value;
// その後クランプで0-1に正規化
const clampedValue = Math.min(Math.max(normalizedValue, 0), 1);
const percentage = clampedValue * 100;
```

**代替案**: 明示的なオプションを追加

```typescript
interface ProgressConfig {
  label?: string;
  color?: string;
  format?: "fraction" | "percentage"; // 新規追加
}
```

**採用案**: 現行の挙動を維持しつつ、エッジケースのテストを追加してドキュメントを明確化。breaking changeを避ける。

### TDDサイクル

1. **Red**: エッジケースのテスト追加（1.5, -0.5, 150など）
2. **Green**: 必要に応じてロジック調整
3. **Refactor**: JSDocで仕様を明確化

### 影響ファイル
- `src/kt/feedback.ts`
- `tests/unit/kt/feedback.test.ts`

---

## Iteration 3: 色定義の共通化

### 問題
`feedback.ts` と `output.ts` で類似の色定義が重複。

```typescript
// feedback.ts - toastColors
success: { bg: "#d4edda", border: "#c3e6cb", icon: "✓" }

// output.ts - alertColors
success: { bg: "#d4edda", border: "#c3e6cb", text: "#155724" }
```

### 設計

**方針**: 共通の `theme.ts` を作成し、色定義を一元管理。

```typescript
// src/kt/theme.ts
export type MessageType = "success" | "error" | "warning" | "info";

export interface MessageColors {
  bg: string;
  border: string;
  text: string;
  icon: string;
}

export const messageColors: Record<MessageType, MessageColors> = {
  success: { bg: "#d4edda", border: "#c3e6cb", text: "#155724", icon: "✓" },
  error:   { bg: "#f8d7da", border: "#f5c6cb", text: "#721c24", icon: "✕" },
  warning: { bg: "#fff3cd", border: "#ffeeba", text: "#856404", icon: "⚠" },
  info:    { bg: "#d1ecf1", border: "#bee5eb", text: "#0c5460", icon: "ℹ" },
};
```

### TDDサイクル

1. **Red**: theme.tsの型テストを追加
2. **Green**: theme.ts作成、既存ファイルを更新
3. **Refactor**: 重複削除を確認

### 影響ファイル
- `src/kt/theme.ts` (新規)
- `src/kt/feedback.ts`
- `src/kt/output.ts`
- `src/kt/index.ts` (export追加)

---

## Iteration 4: インラインスタイルのCSS分離

### 問題
スタイルが直接HTML内に埋め込まれており、カスタマイズが困難。

### 設計

**方針**:
- CSSクラスベースのスタイリングに移行
- デフォルトCSSを提供しつつ、カスタマイズ可能に
- 既存の動作は維持（breaking changeなし）

**ディレクトリ構造**:
```
src/
├── kt/
│   └── ...
├── styles/
│   ├── index.css       # 全スタイルのエントリーポイント
│   ├── base.css        # ベーススタイル
│   ├── layout.css      # columns, container, expander
│   ├── feedback.css    # progress, spinner, toast
│   └── alerts.css      # success, error, warning, info
```

**段階的移行**:
1. CSSファイルを作成（新規）
2. インラインスタイルをCSSクラスに置き換え
3. 必要なスタイルのみインラインで残す（動的な値）

### TDDサイクル

1. **Red**: E2Eテストで見た目が変わらないことを確認
2. **Green**: CSSファイル作成、HTML側を更新
3. **Refactor**: 不要なインラインスタイル削除

### 影響ファイル
- `src/styles/*.css` (新規)
- `src/kt/layout.ts`
- `src/kt/feedback.ts`
- `src/kt/output.ts`
- `src/server.ts` (CSS読み込み)

---

## 実行順序

```
Iteration 1 (セキュリティ)
    ↓
Iteration 2 (ロジック修正)
    ↓
Iteration 3 (リファクタリング: 色定義)
    ↓
Iteration 4 (リファクタリング: CSS分離)
```

**理由**:
- セキュリティ問題を最優先
- 機能的な修正を先に行う
- 構造的なリファクタリングは後で行う（Tidy First原則）

---

## 完了条件

各イテレーション終了時:
- [ ] テストが全てパス
- [ ] lint/formatがパス
- [ ] コミット完了

全体完了時:
- [ ] `bun run ci` がパス
- [ ] E2Eテストがパス
- [ ] ドキュメント更新済み
