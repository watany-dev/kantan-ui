# Property-Based Testing (PBT) 導入計画

## 概要

既存のexample-basedテストを補完し、fast-checkライブラリを用いたProperty-Based Testingを導入する。
セキュリティクリティカルなコードから優先的に適用し、エッジケースの検出力を強化する。

## 前提条件

### 現状

| 項目 | 内容 |
|------|------|
| テストフレームワーク | Vitest v4.0.16 |
| E2E | Playwright v1.50.0 |
| カバレッジ閾値 | lines: 98%, functions: 98%, branches: 93%, statements: 97% |
| PBTライブラリ | 未導入 |

### 導入するライブラリ

```bash
bun add -D fast-check
```

fast-checkはVitestと直接統合でき、追加のアダプタは不要。

---

## 対象モジュールと優先度

### Phase 1: セキュリティクリティカル

最優先で導入する。脆弱性の見落としを防ぐため、PBTの効果が最も高い領域。

| # | モジュール | ファイル | テストファイル |
|---|-----------|---------|--------------|
| 1 | HTMLエスケープ | `src/utils/html.ts` | `tests/unit/pbt/html.pbt.test.ts` |
| 2 | ファイル名サニタイズ | `src/utils/sanitize.ts` | `tests/unit/pbt/sanitize.pbt.test.ts` |
| 3 | ファイルバリデーション | `src/utils/file-validation.ts` | `tests/unit/pbt/file-validation.pbt.test.ts` |
| 4 | CSSサニタイズ | `src/utils/css.ts` | `tests/unit/pbt/css.pbt.test.ts` |

### Phase 2: データ変換

複雑なパース処理やキー生成のエッジケースを検出する。

| # | モジュール | ファイル | テストファイル |
|---|-----------|---------|--------------|
| 5 | Markdownパーサー | `src/kt/markdown/parser.ts` | `tests/unit/pbt/markdown-parser.pbt.test.ts` |
| 6 | HTML Diffパーサー | `src/diff/parser.ts` | `tests/unit/pbt/diff-parser.pbt.test.ts` |
| 7 | キャッシュキー生成 | `src/kt/cache/cache-key.ts` | `tests/unit/pbt/cache-key.pbt.test.ts` |

### Phase 3: バリデーションロジック

入力検証の網羅性を強化する。

| # | モジュール | ファイル | テストファイル |
|---|-----------|---------|--------------|
| 8 | Widgetバリデーション | `src/widgets/core.ts` | `tests/unit/pbt/widget-validation.pbt.test.ts` |
| 9 | 日付・時刻ユーティリティ | `src/utils/date.ts` | `tests/unit/pbt/date.pbt.test.ts` |
| 10 | セッション状態管理 | `src/session/state.ts` | `tests/unit/pbt/session-state.pbt.test.ts` |

### Phase 4: 統合

| # | モジュール | ファイル | テストファイル |
|---|-----------|---------|--------------|
| 11 | ストリームユーティリティ | `src/kt/stream-utils.ts` | `tests/unit/pbt/stream-utils.pbt.test.ts` |

---

## 各モジュールの検証プロパティ

### 1. HTMLエスケープ (`src/utils/html.ts`)

| プロパティ | 説明 |
|-----------|------|
| エスケープ完全性 | `&`, `<`, `>`, `"`, `'` がエスケープ後に生文字として残らない |
| XSS無効化 | 任意の入力に対し、`escapeHtml()` 結果に `<script>` や `onerror=` が含まれない |
| 危険パターン検出 | `containsUnsafeHtml()` が14種以上の攻撃パターンを検出する |
| 属性値エスケープ | `buildAttributes()` が値内の特殊文字をエスケープする |
| スタイル注入防止 | `buildStyleAttr()` が `url()`, `expression()`, `javascript:` を除去する |
| クラス属性フィルタ | `buildClassAttr()` がfalsy値（false, undefined, null）を除外する |

### 2. ファイル名サニタイズ (`src/utils/sanitize.ts`)

| プロパティ | 説明 |
|-----------|------|
| パストラバーサル防止 | 出力に `/`, `\`, `..` が含まれない |
| NULLバイト除去 | 出力に `\0` が含まれない |
| 制御文字除去 | 出力に制御文字（0x00-0x1F, 0x7F）が含まれない |
| Windows予約名処理 | CON, PRN, AUX, NUL, COMx, LPTx に `_` プレフィクスを付与 |
| バイト長制約 | UTF-8で255バイト以下（マルチバイト文字を破壊しない） |
| 非空出力保証 | 任意の入力に対し空文字を返さない（フォールバック生成） |
| Unicode正規化冪等性 | `sanitize(sanitize(x)) === sanitize(x)` |

### 3. ファイルバリデーション (`src/utils/file-validation.ts`)

| プロパティ | 説明 |
|-----------|------|
| サイズ検証一貫性 | `size <= maxSize` のときのみ通過する |
| Acceptフィルタ論理 | ワイルドカードMIME（`image/*`）が基底型に一致する |
| 拡張子照合 | 大文字小文字を区別しない（`.PNG` は `.png` に一致） |
| Strictモード | strict有効時、warningもerrorとして扱う |

### 4. CSSサニタイズ (`src/utils/css.ts`)

| プロパティ | 説明 |
|-----------|------|
| 危険パターン除去 | `url()`, `expression()`, `javascript:`, HTMLタグを除去 |
| 長さ値フォーマット | 有効な長さ値（px, rem, em, %等）のみ通過する |
| 色値フォーマット | hex, rgb/rgba, hsl/hsla, キーワードのみ通過する |
| 無効値拒否 | 無効な値に対し空文字を返し、例外を投げない |
| 冪等性 | 有効な値はサニタイズ後も変化しない |

### 5. Markdownパーサー (`src/kt/markdown/parser.ts`)

| プロパティ | 説明 |
|-----------|------|
| 非空入力非空出力 | 空でないMarkdownに対し空でないHTMLを返す |
| プレーンテキスト保存 | Markdown構文を含まないテキストがそのまま出力に含まれる |
| コードブロック保存 | バッククォート内のテキストがMarkdown解析されない |
| HTMLエスケープ | ユーザー入力の `<script>` 等がエスケープされる |

### 6. HTML Diffパーサー (`src/diff/parser.ts`)

| プロパティ | 説明 |
|-----------|------|
| 親子関係整合性 | 親子関係にサイクルが存在しない（有効な木構造） |
| ID検証 | `isValidId()` が `/^[a-zA-Z_][a-zA-Z0-9_-]*$/` に一致する |
| 兄弟順序 | 同一親の子ノードの順序がHTMLドキュメント順と一致する |
| パフォーマンス制約 | 1MB超のHTML、1000要素超、100ms超で適切にエラーを投げる |

### 7. キャッシュキー生成 (`src/kt/cache/cache-key.ts`)

| プロパティ | 説明 |
|-----------|------|
| 決定性 | 同一引数は常に同一キーを生成する |
| キー順安定性 | オブジェクトのキー挿入順に依存しない |
| 型プレフィクス衝突回避 | 異なる型の値が同一キーを生成しない（`1` vs `"1"`） |
| 循環参照検出 | `hasCircularReference()` が全サイクルパターンを検出する |

### 8. Widgetバリデーション (`src/widgets/core.ts`)

| プロパティ | 説明 |
|-----------|------|
| Min/Max順序 | `min <= max` のときのみ検証が通過する |
| 範囲包含 | `min <= value <= max` のときのみ値が有効 |
| オプション所属 | selectbox/radioのデフォルト値がオプション配列に含まれる |
| 空オプション拒否 | 空のオプション配列は常にエラー |

### 9. 日付・時刻ユーティリティ (`src/utils/date.ts`)

| プロパティ | 説明 |
|-----------|------|
| フォーマット一貫性 | `toDateString()` が常に `/\d{4}-\d{2}-\d{2}/` に一致する |
| 文字列パススルー冪等性 | フォーマット済み文字列をそのまま返す |
| ゼロパディング | 1桁の月・日が2桁にパディングされる |
| includeSecondsフラグ | true時 `HH:MM:SS`、false時 `HH:MM` 形式 |

### 10. セッション状態管理 (`src/session/state.ts`)

| プロパティ | 説明 |
|-----------|------|
| 読み書き一貫性 | 書き込み後の読み取りが同一値を返す |
| セッション間分離 | あるセッションの変更が他セッションに影響しない |
| ディープクローン分離 | 配列・オブジェクトのミューテーションが格納済み値に影響しない |
| デフォルト値冪等性 | デフォルト値への複数回アクセスが同一クローンを返す |

### 11. ストリームユーティリティ (`src/kt/stream-utils.ts`)

| プロパティ | 説明 |
|-----------|------|
| 型判別正確性 | 各ソース型に対し正しい変換パスを選択する |
| ファクトリ関数展開 | ネストされたファクトリ関数を再帰的に展開する |
| 出力型一貫性 | 全分岐が `ReadableStream<string>` を返す |

---

## カスタム Arbitrary 定義

各モジュール用に再利用可能なジェネレータを `tests/unit/pbt/arbitraries/` に配置する。

```
tests/unit/pbt/
├── arbitraries/
│   ├── html.ts         # HTML文字列、属性、XSSベクターのArbitrary
│   ├── markdown.ts     # Markdown要素のArbitrary
│   ├── filename.ts     # ファイル名（パストラバーサル、Unicode等）のArbitrary
│   ├── css.ts          # CSS長さ値、色値のArbitrary
│   ├── widget.ts       # Widget設定のArbitrary
│   └── date.ts         # Date/時刻のArbitrary
├── html.pbt.test.ts
├── sanitize.pbt.test.ts
├── file-validation.pbt.test.ts
├── css.pbt.test.ts
├── markdown-parser.pbt.test.ts
├── diff-parser.pbt.test.ts
├── cache-key.pbt.test.ts
├── widget-validation.pbt.test.ts
├── date.pbt.test.ts
├── session-state.pbt.test.ts
└── stream-utils.pbt.test.ts
```

### Arbitrary設計例

```typescript
// tests/unit/pbt/arbitraries/html.ts
import * as fc from "fast-check";

/** XSS攻撃ベクター */
export const xssVectorArb = fc.oneof(
  fc.constant('<script>alert("xss")</script>'),
  fc.constant('<img src=x onerror="alert(1)">'),
  fc.constant('<svg onload="alert(1)">'),
  fc.constant("javascript:alert(1)"),
  fc.constant('<iframe src="http://evil.com">'),
  fc.constant('<embed src="http://evil.com">'),
  fc.constant('<form action="http://evil.com">'),
  fc.constant('<base href="http://evil.com">'),
);

/** HTML特殊文字を含む文字列 */
export const htmlSpecialCharsArb = fc.stringOf(
  fc.oneof(
    fc.char(),
    fc.constant("&"),
    fc.constant("<"),
    fc.constant(">"),
    fc.constant('"'),
    fc.constant("'"),
  ),
);
```

```typescript
// tests/unit/pbt/arbitraries/filename.ts
import * as fc from "fast-check";

/** パストラバーサルパターン */
export const pathTraversalArb = fc.oneof(
  fc.constant("../../../etc/passwd"),
  fc.constant("..\\..\\windows\\system32"),
  fc.constant("....//....//etc"),
  fc.stringOf(fc.oneof(fc.constant(".."), fc.constant("/"), fc.char())),
);

/** Windows予約名 */
export const windowsReservedArb = fc.oneof(
  ...["CON", "PRN", "AUX", "NUL"].map((n) => fc.constant(n)),
  fc.integer({ min: 1, max: 9 }).map((i) => `COM${i}`),
  fc.integer({ min: 1, max: 9 }).map((i) => `LPT${i}`),
);
```

```typescript
// tests/unit/pbt/arbitraries/date.ts
import * as fc from "fast-check";

/** 有効なDate（うるう年の複雑さを回避） */
export const safeDateArb = fc
  .tuple(
    fc.integer({ min: 1900, max: 2100 }),
    fc.integer({ min: 0, max: 11 }),
    fc.integer({ min: 1, max: 28 }),
  )
  .map(([year, month, day]) => new Date(year, month, day));

/** 有効な時刻 */
export const safeTimeArb = fc
  .tuple(
    fc.integer({ min: 0, max: 23 }),
    fc.integer({ min: 0, max: 59 }),
    fc.integer({ min: 0, max: 59 }),
  )
  .map(([h, m, s]) => new Date(2024, 0, 1, h, m, s));
```

---

## CI/CD 設定

### テスト実行の分離

PBTテストは既存のVitestコマンドで自動的に実行される（`*.test.ts` パターンに一致するため）。
追加の設定は不要。

### 実行回数の調整

```typescript
// テストファイル内で環境に応じて調整
const NUM_RUNS = process.env.CI ? 1000 : 100;

fc.assert(
  fc.property(/* ... */),
  { numRuns: NUM_RUNS },
);
```

### シード値管理

```typescript
// 失敗時の再現
fc.assert(
  fc.property(/* ... */),
  { seed: 12345 }, // 失敗時にログに出力されるシードを指定
);
```

---

## TDDサイクルとの統合

CLAUDE.mdのTDDサイクルに従い、各モジュールのPBTテストを以下の手順で実装する：

1. **Red**: プロパティを定義し、テストを書く（fast-check未導入の段階では失敗）
2. **Green**: 必要に応じて実装を修正し、プロパティを満たす
3. **Refactor**: Arbitraryの共通化、テストコードの整理

---

## イテレーション計画

### イテレーション 1: 環境セットアップ + HTMLエスケープ
- [ ] `bun add -d fast-check`
- [ ] `tests/unit/pbt/arbitraries/html.ts` 作成
- [ ] `tests/unit/pbt/html.pbt.test.ts` 作成
- [ ] 全プロパティの検証

### イテレーション 2: ファイル名サニタイズ
- [ ] `tests/unit/pbt/arbitraries/filename.ts` 作成
- [ ] `tests/unit/pbt/sanitize.pbt.test.ts` 作成
- [ ] 全プロパティの検証

### イテレーション 3: ファイルバリデーション
- [ ] `tests/unit/pbt/file-validation.pbt.test.ts` 作成
- [ ] 全プロパティの検証

### イテレーション 4: CSSサニタイズ
- [ ] `tests/unit/pbt/arbitraries/css.ts` 作成
- [ ] `tests/unit/pbt/css.pbt.test.ts` 作成
- [ ] 全プロパティの検証

### イテレーション 5: Markdownパーサー
- [ ] `tests/unit/pbt/arbitraries/markdown.ts` 作成
- [ ] `tests/unit/pbt/markdown-parser.pbt.test.ts` 作成
- [ ] 全プロパティの検証

### イテレーション 6: HTML Diffパーサー
- [ ] `tests/unit/pbt/diff-parser.pbt.test.ts` 作成
- [ ] 全プロパティの検証

### イテレーション 7: キャッシュキー生成
- [ ] `tests/unit/pbt/cache-key.pbt.test.ts` 作成
- [ ] 全プロパティの検証

### イテレーション 8: Widgetバリデーション
- [ ] `tests/unit/pbt/arbitraries/widget.ts` 作成
- [ ] `tests/unit/pbt/widget-validation.pbt.test.ts` 作成
- [ ] 全プロパティの検証

### イテレーション 9: 日付・時刻ユーティリティ
- [ ] `tests/unit/pbt/arbitraries/date.ts` 作成
- [ ] `tests/unit/pbt/date.pbt.test.ts` 作成
- [ ] 全プロパティの検証

### イテレーション 10: セッション状態管理
- [ ] `tests/unit/pbt/session-state.pbt.test.ts` 作成
- [ ] 全プロパティの検証

### イテレーション 11: ストリームユーティリティ
- [ ] `tests/unit/pbt/stream-utils.pbt.test.ts` 作成
- [ ] 全プロパティの検証

---

## 期待される成果

### 短期的効果
- example-basedテストでは見落としやすいエッジケース（境界値、Unicode、特殊文字）の検出
- セキュリティクリティカルなコード（エスケープ、サニタイズ、バリデーション）の信頼性向上
- プロパティ仕様による暗黙知の明文化

### 長期的効果
- 実装変更に対するプロパティの安定性（リファクタリング耐性）
- クロスランタイム（Node.js, Bun, Deno）でのプロパティ検証
- コードベース成長に伴うテストのスケーラビリティ向上
