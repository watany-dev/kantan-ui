# kt.caption / kt.link_button API 設計書

作成日: 2026-02-07

## 実装ステータス

> **📝 設計完了・未実装**

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
| **最小実装** | 標準HTML要素（`<p>`, `<a>`）を活用し、シンプルに保つ |
| **Streamlit互換** | `st.caption()` / `st.link_button()` と同様の使用感 |
| **既存パターン準拠** | kantan-ui の既存コンポーネントパターンに従う |
| **セキュリティ** | URL検証によるjavascript:スキームの排除、テキストのXSSエスケープ |

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

```html
<!-- 通常（Markdownパース後） -->
<p class="kt-caption">This is a caption</p>

<!-- Markdownあり -->
<p class="kt-caption">Data source: <em>Wikipedia</em></p>

<!-- unsafe_allow_html: true -->
<p class="kt-caption">Contains <b>HTML</b></p>
```

### 2.8 レンダリング仕様

| 条件 | 処理 |
|------|------|
| `unsafe_allow_html: false`（デフォルト） | Markdownとしてパース → サニタイズ → `<p class="kt-caption">` で囲む |
| `unsafe_allow_html: true` | HTMLをそのまま `<p class="kt-caption">` で囲む |

### 2.9 既存APIとの使い分け

| API | 用途 | フォントサイズ | 形式 |
|-----|------|-------------|------|
| `kt.title()` | ページタイトル | 最大（h1） | プレーンテキスト |
| `kt.header()` | セクション見出し | 大（h2） | プレーンテキスト |
| `kt.subheader()` | 小見出し | 中（h3） | プレーンテキスト |
| `kt.text()` | 固定幅テキスト | 標準（pre） | プレーンテキスト |
| `kt.write()` | 汎用出力 | 標準 | Markdown |
| **`kt.caption()`** | **注釈・補足** | **小** | **Markdown** |

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
| `label` | `string` | ✅ | - | ボタンに表示するラベル |
| `url` | `string` | ✅ | - | 遷移先のURL |
| `config` | `LinkButtonConfig` | - | `{}` | 設定オプション |

### 3.5 戻り値

`void` — ナビゲーション専用で値を返さない

> **Streamlitとの差異**: Streamlit の `st.link_button` も戻り値なし。`kt.button` や `kt.download_button` はクリック検知のために `boolean` を返すが、link_button はブラウザのネイティブナビゲーションで遷移するため、サーバーサイドでクリックを検知する意味がない。

### 3.6 型定義

```typescript
export interface LinkButtonConfig {
  /** ボタンを無効化 */
  disabled?: boolean;

  /** コンテナ幅に合わせる（デフォルト: false） */
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
| `href` | URL文字列 | 遷移先URL（disabled時は省略） |
| `target` | `"_blank"` | 新しいタブで開く |
| `rel` | `"noopener noreferrer"` | セキュリティ対策 |
| `class` | `"kt-link-button"` | ボタンスタイル用クラス |
| `aria-disabled` | `"true"` | disabled時のアクセシビリティ |
| `tabindex` | `"-1"` | disabled時のフォーカス無効化 |

### 3.9 セキュリティ

| リスク | 対策 |
|--------|------|
| `javascript:` スキーム | URL検証で `javascript:` / `data:` スキームを拒否 |
| XSS（ラベル） | `renderHtml` テンプレートタグによる自動エスケープ |
| Tabnapping | `rel="noopener noreferrer"` を固定付与 |

**URL検証ルール**:

```typescript
function isValidUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith("javascript:") || trimmed.startsWith("data:")) {
    return false;
  }
  return true;
}
```

不正なURLが渡された場合は `disabled` 状態と同様にレンダリングし、`href` を付与しない。

### 3.10 download_button との使い分け

| 項目 | `kt.link_button` | `kt.download_button` |
|------|------------------|--------------------|
| 用途 | 外部URLへの遷移 | サーバー上のデータをダウンロード |
| データ | なし（URLのみ） | `string \| ArrayBuffer` を受け取る |
| 戻り値 | `void` | `boolean`（クリック検知） |
| 状態管理 | なし | widget ID + session state |
| HTML要素 | `<a>` | `<button>` + JS download handler |

---

## 4. ファイル構成

```
src/kt/
├── output.ts              # caption を追加
└── widgets.ts             # link_button を追加（※または output.ts）

src/widgets/
└── types.ts               # CaptionConfig, LinkButtonConfig を追加

src/kt/
└── index.ts               # kt.caption, kt.link_button を登録

tests/unit/
├── kt/
│   └── output.test.ts     # caption テストを追加
└── widgets/
    └── link-button.test.ts # 新規作成
```

### 4.1 実装場所の判断

| コンポーネント | 実装場所 | 理由 |
|--------------|---------|------|
| `caption` | `src/kt/output.ts` | 状態を持たない出力コンポーネント。title/header/text と同列 |
| `link_button` | `src/kt/output.ts` | 状態を持たず、サーバーイベントも不要。実質的に出力コンポーネント |

> link_button は「ボタン」という名前だが、kantan-ui のアーキテクチャ上はサーバーサイドの状態管理が不要なため、output コンポーネントとして実装する方がシンプル。`wrapWidget` ヘルパーやwidget IDの生成は不要。

---

## 5. イテレーション計画

### Iteration 1: 型定義とテスト（Red）

**目標**: CaptionConfig / LinkButtonConfig の型定義とテスト作成

**作業内容**:
- `src/widgets/types.ts` に `CaptionConfig`, `LinkButtonConfig` を追加
- `tests/unit/kt/output.test.ts` に caption テストを追加
- `tests/unit/widgets/link-button.test.ts` を作成

**テストケース（caption）**:
- 基本テキストの出力
- Markdownの解釈（`*italic*` → `<em>`)
- HTMLエスケープ（XSS対策）
- `unsafe_allow_html: true` でHTMLがそのまま出力される
- 空文字列の処理

**テストケース（link_button）**:
- 基本的なリンクボタンの出力
- `target="_blank"` と `rel="noopener noreferrer"` の付与
- ラベルのHTMLエスケープ
- `disabled: true` で `href` なし、`aria-disabled="true"` 付与
- `use_container_width: true` で追加クラス付与
- `javascript:` URLの拒否
- `data:` URLの拒否

---

### Iteration 2: caption 実装（Green）

**目標**: `kt.caption()` の実装

**作業内容**:
- `src/kt/output.ts` に `caption` 関数を追加
- `src/kt/index.ts` に `kt.caption` を登録

---

### Iteration 3: link_button 実装（Green）

**目標**: `kt.link_button()` の実装

**作業内容**:
- `src/kt/output.ts` に `link_button` 関数を追加
- `src/kt/index.ts` に `kt.link_button` を登録

---

### Iteration 4: スタイル

**目標**: CSSスタイルの追加

**作業内容**:
- `src/styles/default.ts` に `.kt-caption` スタイルを追加
- `src/styles/default.ts` に `.kt-link-button` / `.kt-link-button-disabled` / `.kt-link-button-full` スタイルを追加

**スタイル仕様**:

```css
/* caption */
.kt-caption {
  font-size: 0.875rem;   /* 14px */
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
  border-color: #ff4b4b;
  color: #ff4b4b;
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

## 6. 非実装項目（将来検討）

| 項目 | 理由 |
|------|------|
| `help` パラメータ（ツールチップ） | kantan-ui 全体でヘルプツールチップ機構が未実装。全ウィジェット共通で将来対応 |
| `type` パラメータ（primary/secondary） | ボタンスタイルバリアント。button API全体と合わせて将来対応 |
| `icon` パラメータ | アイコンライブラリの導入が必要。将来対応 |
| caption の `help` ツールチップ | 上記と同様 |

---

## 7. チェックリスト

### 実装前

- [x] 既存コンポーネント実装パターンを確認（output.ts, button.ts）
- [x] Streamlit APIとの互換性を確認

### 各イテレーション後

- [ ] `bun run lint:fix` 実行
- [ ] `bun run test` 実行
- [ ] コミット

### 完了時

- [ ] `bun run ci` 全パス
- [ ] 単体テスト作成済み
- [ ] ドキュメント更新（API比較表、チュートリアル）

---

## 8. 参考資料

- [Streamlit st.caption](https://docs.streamlit.io/develop/api-reference/text/st.caption)
- [Streamlit st.link_button](https://docs.streamlit.io/develop/api-reference/widgets/st.link_button)
- kantan-ui 既存実装
  - `src/kt/output.ts` - 出力コンポーネント（title, header, text, markdown）
  - `src/widgets/button.ts` - ボタンウィジェットパターン
  - `src/widgets/download-button.ts` - ダウンロードボタン（link_buttonとの比較用）
