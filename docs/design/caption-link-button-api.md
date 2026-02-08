# kt.caption / kt.link_button API 設計書

作成日: 2026-02-07
更新日: 2026-02-08（v3 — 実装完了）

## 実装ステータス

> **✅ 実装完了** (2026-02-08)
>
> `kt.caption()` と `kt.link_button()` を設計書通りに実装。テスト・CSS含む全4イテレーション完了。

---

## 1. 概要

### 1.1 目的

Streamlit の `st.caption()` と `st.link_button()` に相当する機能を kantan-ui に実装する。

- **caption**: 小さいフォントでキャプション・注釈テキストを表示する出力コンポーネント
- **link_button**: 指定URLに遷移するリンクボタンウィジェット

### 1.2 ユースケース

| コンポーネント | ユースケース | 説明 |
|--------------|-------------|------|
| `caption` | 注釈・補足説明 | チャートやテーブルの下に補足テキストを表示 |
| `caption` | フッター | ページ下部の著作権表示やバージョン情報 |
| `caption` | ヘルプテキスト | ウィジェットの補足説明 |
| `link_button` | 外部リンク | ドキュメントや外部サービスへの遷移 |
| `link_button` | ダウンロードリンク | 外部ファイルへのリンク（download_buttonとの使い分け） |
| `link_button` | OAuth認証 | 認証ページへの遷移ボタン |

### 1.3 設計原則

| 原則 | 説明 |
|------|------|
| **最小実装** | 標準HTML要素（`<div>`, `<a>`）を活用し、シンプルに保つ |
| **Streamlit互換** | `st.caption()` / `st.link_button()` と同様の使用感 |
| **既存パターン準拠** | kantan-ui の既存コンポーネントパターンに従う |
| **セキュリティ** | URL検証による危険なスキームの排除、テキストのXSSエスケープ |

---

## 2. caption API設計

### 2.1 分類

**出力コンポーネント**（title / header / subheader / text と同カテゴリ）

状態を持たず、HTMLを出力するだけのシンプルなコンポーネント。`src/kt/output.ts` に実装する。

### 2.2 基本API

```typescript
kt.caption("This is a caption");

kt.caption("Data source: *Wikipedia*");

kt.caption("Contains <b>HTML</b>", { unsafe_allow_html: true });
```

### 2.3 シグネチャ

```typescript
function caption(body: string, config?: CaptionConfig): void
```

### 2.4 パラメータ

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|------|------|-----------|------|
| `body` | `string` | ✅ | - | 表示するテキスト。デフォルトではMarkdownとして解釈 |
| `config` | `CaptionConfig` | - | `{}` | 設定オプション |

### 2.5 戻り値

`void` — 出力のみで値を返さない

### 2.6 型定義

`src/kt/output.ts` にインライン定義する（`AlertConfig` / `CodeConfig` / `MarkdownConfig` / `JsonConfig` と同じパターン）。

```typescript
export interface CaptionConfig {
  /**
   * HTMLタグの直接埋め込みを許可（デフォルト: false）
   * @security trueにするとXSSリスクあり
   */
  unsafe_allow_html?: boolean;
}
```

### 2.7 HTML構造

`<div>` を使用する。`<p>` だとMarkdownパース結果にブロック要素（`<p>`, `<ul>` 等）が含まれた場合に入れ子が不正HTMLになるため。既存の `kt.markdown()` が `<div class="kt-markdown">` を使用しているのと同じ方針。

```html
<!-- 通常（Markdownパース後） -->
<div class="kt-caption">This is a caption</div>

<!-- Markdownあり -->
<div class="kt-caption">Data source: <em>Wikipedia</em></div>

<!-- unsafe_allow_html: true -->
<div class="kt-caption">Contains <b>HTML</b></div>
```

### 2.8 レンダリング仕様

`kt.markdown()` と同じ処理フローを踏む。違いは外側のクラス名のみ。

| 条件 | 処理 |
|------|------|
| `unsafe_allow_html: false`（デフォルト） | `parseMarkdown()` → `sanitizeMarkdownHtml()` → `<div class="kt-caption">` で囲む |
| `unsafe_allow_html: true` | `parseMarkdown()` → サニタイズなし → `<div class="kt-caption">` で囲む |

**実装イメージ**:

```typescript
export function caption(body: string, config?: CaptionConfig): void {
  const ctx = requireRenderContext();
  let html = parseMarkdown(body);
  if (!config?.unsafe_allow_html) {
    html = sanitizeMarkdownHtml(html);
  }
  ctx.append(`<div class="kt-caption">${html}</div>`);
}
```

### 2.9 既存APIとの使い分け

| API | 用途 | フォントサイズ | 形式 | HTML要素 |
|-----|------|-------------|------|----------|
| `kt.title()` | ページタイトル | 最大 | プレーンテキスト | `<h1>` |
| `kt.header()` | セクション見出し | 大 | プレーンテキスト | `<h2>` |
| `kt.subheader()` | 小見出し | 中 | プレーンテキスト | `<h3>` |
| `kt.text()` | 固定幅テキスト | 標準 | プレーンテキスト | `<pre>` |
| `kt.write()` | 汎用出力 | 標準 | Markdown | `<div>` |
| `kt.markdown()` | Markdown出力 | 標準 | Markdown | `<div>` |
| **`kt.caption()`** | **注釈・補足** | **小（0.875rem）** | **Markdown** | **`<div>`** |

### 2.10 Streamlit との差異

| 項目 | Streamlit `st.caption` | kantan-ui `kt.caption` | 理由 |
|------|----------------------|----------------------|------|
| `help` ツールチップ | ✅ 対応 | ❌ 非対応 | kantan-ui全体で未実装。将来対応 |
| `width` | ✅ 対応 | ❌ 非対応 | 将来対応 |
| `text_alignment` | ✅ 対応 | ❌ 非対応 | 将来対応 |

---

## 3. link_button API設計

### 3.1 分類

**出力コンポーネント**（状態を持たないウィジェット）

link_buttonはURLへのナビゲーションのみを行い、クリック状態のトラッキングは不要。`<a>` 要素をボタンとしてスタイリングする。サーバーへのイベント送信は発生しないため、widget IDの生成やイベントハンドリングは不要。

### 3.2 基本API

```typescript
kt.link_button("Visit Google", "https://google.com");

kt.link_button("Documentation", "https://docs.example.com", {
  disabled: true,
});

kt.link_button("Full Width", "https://example.com", {
  use_container_width: true,
});
```

### 3.3 シグネチャ

```typescript
function link_button(label: string, url: string, config?: LinkButtonConfig): void
```

### 3.4 パラメータ

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|------|------|-----------|------|
| `label` | `string` | ✅ | - | ボタンに表示するラベル（プレーンテキスト、HTMLエスケープされる） |
| `url` | `string` | ✅ | - | 遷移先のURL（絶対URL推奨、相対URLも許可） |
| `config` | `LinkButtonConfig` | - | `{}` | 設定オプション |

### 3.5 戻り値

`void` — ナビゲーション専用で値を返さない

> **Streamlitとの整合性**: Streamlit の `st.link_button` も有意な戻り値を持たない（DeltaGeneratorを返すが利用しない）。`kt.button` や `kt.download_button` はクリック検知のために `boolean` を返すが、link_button はブラウザのネイティブナビゲーションで遷移するため、サーバーサイドでクリックを検知する意味がない。

### 3.6 型定義

`src/kt/output.ts` にインライン定義する（`CaptionConfig` と同じ方針）。

```typescript
export interface LinkButtonConfig {
  /** ボタンを無効化 */
  disabled?: boolean;

  /**
   * コンテナ幅に合わせる（デフォルト: false）
   *
   * 注: Streamlit では use_container_width は非推奨（width パラメータに置き換え）。
   * kantan-ui では現時点でシンプルな boolean で提供し、
   * 将来 width パラメータ導入時に非推奨化を検討する。
   */
  use_container_width?: boolean;
}
```

> **`key` を含めない理由**: link_button は状態を持たず、サーバーへのイベントも送信しない純粋な出力コンポーネントのため、widget IDによる状態管理が不要。

### 3.7 HTML構造

```html
<!-- 通常 -->
<a href="https://google.com"
   class="kt-link-button"
   target="_blank"
   rel="noopener noreferrer">
  Visit Google
</a>

<!-- disabled -->
<a class="kt-link-button kt-link-button-disabled"
   aria-disabled="true"
   tabindex="-1">
  Disabled Link
</a>

<!-- use_container_width -->
<a href="https://example.com"
   class="kt-link-button kt-link-button-full"
   target="_blank"
   rel="noopener noreferrer">
  Full Width
</a>
```

### 3.8 属性仕様

| 属性 | 値 | 説明 |
|------|------|------|
| `href` | URL文字列 | 遷移先URL（disabled時・不正URL時は省略） |
| `target` | `"_blank"` | 新しいタブで開く |
| `rel` | `"noopener noreferrer"` | セキュリティ対策（Tabnapping防止） |
| `class` | `"kt-link-button"` | ボタンスタイル用クラス |
| `aria-disabled` | `"true"` | disabled時のアクセシビリティ |
| `tabindex` | `"-1"` | disabled時のフォーカス無効化 |

### 3.9 セキュリティ

| リスク | 対策 |
|--------|------|
| 危険なURIスキーム | URL検証で `javascript:` / `vbscript:` / `data:` スキームを拒否 |
| XSS（ラベル） | `renderHtml` テンプレートタグによる自動エスケープ |
| Tabnapping | `rel="noopener noreferrer"` を固定付与 |

**URL検証ルール**:

```typescript
function isSafeUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed === "") return false;

  const lower = trimmed.toLowerCase();
  const dangerousSchemes = ["javascript:", "vbscript:", "data:"];
  return !dangerousSchemes.some((scheme) => lower.startsWith(scheme));
}
```

**不正URL時の挙動**:
- 空文字列、`javascript:`, `vbscript:`, `data:` で始まるURL → disabled と同様にレンダリングし、`href` を付与しない
- 相対URL（例: `/about`, `./page`）→ 許可する（同一オリジン内のナビゲーション用途）

### 3.10 Streamlit との差異

| 項目 | Streamlit `st.link_button` | kantan-ui `kt.link_button` | 理由 |
|------|--------------------------|--------------------------|------|
| `help` ツールチップ | ✅ 対応 | ❌ 非対応 | kantan-ui全体で未実装 |
| `type` (primary/secondary/tertiary) | ✅ 対応 | ❌ 非対応 | ボタンバリアント全体で将来対応 |
| `icon` / `icon_position` | ✅ 対応 | ❌ 非対応 | アイコン機構が未実装 |
| `width` パラメータ | ✅ 対応 | ❌ 非対応 | `use_container_width` で代替 |
| `shortcut` | ✅ 対応 | ❌ 非対応 | キーボードショートカット機構が未実装 |
| ラベルのMarkdown対応 | ✅ 対応 | ❌ 非対応 | v1はプレーンテキスト。将来検討 |

### 3.11 download_button との使い分け

| 項目 | `kt.link_button` | `kt.download_button` |
|------|------------------|--------------------|
| 用途 | 外部URLへの遷移 | サーバー上のデータをダウンロード |
| データ | なし（URLのみ） | `string \| ArrayBuffer` を受け取る |
| 戻り値 | `void` | `boolean`（クリック検知） |
| 状態管理 | なし | widget ID + session state |
| HTML要素 | `<a>` | `<button>` + JS download handler |
| 実装場所 | `src/kt/output.ts` | `src/widgets/download-button.ts` |

---

## 4. ファイル構成

```
src/kt/
├── output.ts              # caption, link_button, CaptionConfig, LinkButtonConfig を追加
└── index.ts               # kt.caption, kt.link_button を登録

src/
└── index.ts               # CaptionConfig, LinkButtonConfig の型エクスポートを追加

tests/unit/kt/
└── output.test.ts         # caption, link_button のテストを追加
```

### 4.1 実装場所の判断

| コンポーネント | 実装場所 | 理由 |
|--------------|---------|------|
| `caption` | `src/kt/output.ts` | 状態なし。title/header/text/markdown と同列 |
| `link_button` | `src/kt/output.ts` | 状態なし。サーバーイベントも不要 |
| `CaptionConfig` | `src/kt/output.ts` | AlertConfig/CodeConfig/MarkdownConfig と同じパターン |
| `LinkButtonConfig` | `src/kt/output.ts` | 同上 |
| テスト | `tests/unit/kt/output.test.ts` | 既存の output テストに追加 |

> **`src/widgets/types.ts` に含めない理由**: `types.ts` はステートフルウィジェット（button, slider 等）の設定型の場所。出力コンポーネントの設定型は `output.ts` にインライン定義するのが既存の一貫したパターン。

---

## 5. エクスポート更新

### 5.1 `src/kt/index.ts`

```typescript
// Output APIs（既存のセクションに追加）
caption: output.caption,
link_button: output.link_button,
```

### 5.2 `src/index.ts`

```typescript
// 型エクスポートの追加
export type { CaptionConfig, LinkButtonConfig } from "./kt/output";
```

---

## 6. イテレーション計画

### Iteration 1: テスト作成（Red）

**目標**: caption / link_button のテストを作成（失敗する状態）

**作業内容**:
- `tests/unit/kt/output.test.ts` に caption テストを追加
- `tests/unit/kt/output.test.ts` に link_button テストを追加

**テストケース（caption）**:
- 基本テキストの出力（`<div class="kt-caption">` で囲まれる）
- Markdownの解釈（`*italic*` → `<em>`）
- HTMLエスケープ（`<script>` タグが無害化される）
- `unsafe_allow_html: true` でHTMLがそのまま出力される
- 空文字列の処理
- ブロック要素を含むMarkdown（`<div>` で囲んでいるため不正HTMLにならない）

**テストケース（link_button）**:
- 基本的なリンクボタンの出力（`<a>` 要素）
- `target="_blank"` と `rel="noopener noreferrer"` の付与
- ラベルのHTMLエスケープ
- `disabled: true` で `href` なし、`aria-disabled="true"` 付与
- `use_container_width: true` で追加クラス付与
- `javascript:` URLの拒否（disabled扱い）
- `vbscript:` URLの拒否（disabled扱い）
- `data:` URLの拒否（disabled扱い）
- 空文字列URLの拒否（disabled扱い）
- 相対URLの許可
- RenderContextなしでのエラー

---

### Iteration 2: caption 実装（Green）

**目標**: `kt.caption()` の実装とテストパス

**作業内容**:
- `src/kt/output.ts` に `CaptionConfig` インターフェースと `caption` 関数を追加
- `src/kt/index.ts` に `kt.caption` を登録
- `src/index.ts` に `CaptionConfig` 型エクスポートを追加

---

### Iteration 3: link_button 実装（Green）

**目標**: `kt.link_button()` の実装とテストパス

**作業内容**:
- `src/kt/output.ts` に `LinkButtonConfig` インターフェースと `link_button` 関数を追加
- `src/kt/output.ts` に `isSafeUrl` ヘルパー関数を追加
- `src/kt/index.ts` に `kt.link_button` を登録
- `src/index.ts` に `LinkButtonConfig` 型エクスポートを追加

---

### Iteration 4: スタイル

**目標**: CSSスタイルの追加

**作業内容**:
- `src/styles/default.ts` に `.kt-caption` スタイルを追加
- `src/styles/default.ts` に `.kt-link-button` 関連スタイルを追加

**スタイル仕様**:

```css
/* caption */
.kt-caption {
  font-size: 0.875rem;
  color: rgba(49, 51, 63, 0.6);
  line-height: 1.5;
  margin: 0.25rem 0;
}

/* link_button */
.kt-link-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem 0.75rem;
  border: 1px solid rgba(49, 51, 63, 0.2);
  border-radius: 0.5rem;
  color: inherit;
  text-decoration: none;
  font-size: 0.875rem;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
}

.kt-link-button:hover {
  border-color: rgba(49, 51, 63, 0.6);
}

.kt-link-button-disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.kt-link-button-full {
  display: flex;
  width: 100%;
}
```

---

## 7. 非実装項目（将来検討）

| 項目 | Streamlit対応 | 理由 |
|------|-------------|------|
| `help` パラメータ（ツールチップ） | caption, link_button 両方 | kantan-ui 全体でヘルプツールチップ機構が未実装。全ウィジェット共通で将来対応 |
| `type` パラメータ（primary/secondary/tertiary） | link_button | ボタンスタイルバリアント。button API全体と合わせて将来対応 |
| `icon` / `icon_position` | link_button | アイコンライブラリの導入が必要 |
| `width` パラメータ | caption, link_button | Streamlitでは `use_container_width` を非推奨化し `width` に移行中。kantan-uiも将来的に `width` を導入し `use_container_width` を非推奨化する |
| `text_alignment` | caption | テキスト揃え。将来対応 |
| `shortcut` | link_button | キーボードショートカット機構が未実装 |
| ラベルのMarkdown対応 | link_button | v1はプレーンテキスト。ボタンラベル全体のMarkdown対応と合わせて検討 |

---

## 8. チェックリスト

### 実装前

- [x] 既存コンポーネント実装パターンを確認（output.ts の AlertConfig/CodeConfig/MarkdownConfig）
- [x] Streamlit APIとの互換性を確認（caption: body, unsafe_allow_html, help, width, text_alignment）
- [x] Streamlit APIとの互換性を確認（link_button: label, url, help, type, icon, disabled, width, shortcut）

### 各イテレーション後

- [x] `bun run lint:fix` 実行
- [x] `bun run test` 実行
- [x] コミット

### 完了時

- [x] `bun run ci` 全パス
- [x] 単体テスト作成済み
- [x] ドキュメント更新（API比較表、チュートリアル）

---

## 9. v1 → v2 変更履歴

| # | 変更内容 | 理由 |
|---|---------|------|
| 1 | caption の HTML 要素を `<p>` → `<div>` に変更 | Markdownパース結果にブロック要素が含まれると `<p>` 内に `<p>` がネストされ不正HTMLになる |
| 2 | 型定義場所を `src/widgets/types.ts` → `src/kt/output.ts` インラインに変更 | AlertConfig/CodeConfig/MarkdownConfig と同じパターンに統一 |
| 3 | link_button テストを `tests/unit/widgets/` → `tests/unit/kt/output.test.ts` に変更 | 出力コンポーネント分類と整合させる |
| 4 | ファイル構成セクションの `widgets.ts` の曖昧記述を削除 | link_button の配置先を output.ts に一本化 |
| 5 | `src/index.ts` のエクスポート更新をセクション5として追加 | 公開APIのエクスポート更新漏れを防止 |
| 6 | URL検証に `vbscript:` スキームと空文字列チェックを追加 | レガシーブラウザの攻撃ベクトルとエッジケースへの対応 |
| 7 | 相対URLの扱いを明記（許可） | 同一オリジン内ナビゲーション用途を考慮 |
| 8 | Streamlitとの差異テーブルを caption / link_button 両方に追加 | 未対応パラメータ（width, text_alignment, icon, shortcut 等）を明示 |
| 9 | `use_container_width` の Streamlit 非推奨状況を注記 | 将来の `width` パラメータ導入時の移行パスを明確化 |
| 10 | link_button のラベルMarkdown非対応を明記 | v1のスコープを明確化 |

---

## 10. 参考資料

- [Streamlit st.caption](https://docs.streamlit.io/develop/api-reference/text/st.caption)
- [Streamlit st.link_button](https://docs.streamlit.io/develop/api-reference/widgets/st.link_button)
- kantan-ui 既存実装
  - `src/kt/output.ts` — 出力コンポーネントと設定型（AlertConfig, CodeConfig, MarkdownConfig, JsonConfig）
  - `src/widgets/button.ts` — ボタンウィジェットパターン
  - `src/widgets/download-button.ts` — ダウンロードボタン（link_buttonとの比較用）
  - `tests/unit/kt/output.test.ts` — 出力コンポーネントのテストパターン
