---
name: update-docs
description: 実装完了後にすべてのドキュメント（README・設計書・実装計画書・API比較表・チュートリアル）を最新化する。新機能の追加、バグ修正、リファクタリング後に使用する。
---

# ドキュメント一括最新化

機能の実装が完了した後、関連するすべてのドキュメントを最新の状態に更新する。

以下の3つのドキュメントカテゴリを順番に更新する:

1. **開発ドキュメント**（設計書・実装計画書・API比較表）
2. **README.md**
3. **チュートリアル**

---

## Phase 1: 変更内容の把握（共通）

```bash
git diff HEAD~5 --name-only
git log --oneline -10
```

変更されたソースファイルから、どの機能が実装・変更されたかを特定する。

---

## Phase 2: 開発ドキュメントの更新

### 対象ドキュメント

1. **設計書** (`docs/design/<feature>.md`) - API設計、型定義、Streamlit比較
2. **実装計画書** (`docs/impl/<feature>.md`) - イテレーション計画、ファイル構成
3. **API比較表** (`docs/streamlit-api-comparison.md`) - 実装状況の✅/❌を更新
4. **技術ブログ** (`docs/tech-blog-*.md`) - 必要に応じて新規作成

### Step 2-1: 設計書の更新 (`docs/design/`)

該当する設計書が存在する場合、以下を更新:

- **実装ステータス**: 冒頭のステータスブロックを更新
  ```markdown
  > **✅ 実装完了** (YYYY-MM-DD)
  >
  > 実装内容の簡潔な説明
  ```
- **API仕様**: 実装に合わせて型定義やパラメータを修正
- **Streamlitとの比較表**: 実装済み項目を更新

該当する設計書が存在しない場合、既存の設計書（例: `docs/design/cache-api.md`）のフォーマットに従って新規作成:

```markdown
# <機能名> 設計書

## 実装ステータス
> **✅ 実装完了** (YYYY-MM-DD)
> 実装内容の説明

## 1. 概要
### 1.1 目的
### 1.2 スコープ
### 1.3 設計原則

## 2. API仕様
## 3. 実装詳細
```

### Step 2-2: 実装計画書の更新 (`docs/impl/`)

該当する実装計画書が存在する場合:

- **実装ステータス**: 完了済みフェーズを更新
- **イテレーション完了状況**: 各フェーズの✅を追記
- **ファイル構成**: 実際に作成されたファイルと一致させる

### Step 2-3: API比較表の更新 (`docs/streamlit-api-comparison.md`)

新しくAPIが実装された場合:

- 該当行の状況を `❌` → `✅` に変更
- `kantan-ui` カラムに `kt.<api_name>` を記入
- 優先度・難易度カラムを `-` に変更
- 備考に `実装済み` を追記

---

## Phase 3: README.md の更新

### 対象ファイル

- `README.md` (英語)

### README.md のセクション構成

現在のREADMEは以下の構造を持つ。更新箇所を特定して必要なセクションのみ更新する:

1. **Features** - 主要機能のバレットリスト
2. **Quick Start** - インストール・起動手順
3. **Usage** - 基本的なコード例
4. **API Reference** - 各APIカテゴリのリファレンス
   - Output API / Streaming API / Alert API / Feedback API
   - Data Display / Page Config / Widget API / Media API
   - Layout API / Form API / Chat API / Empty Placeholder API
   - Cache API / Session State
5. **How It Works** - アーキテクチャ説明
6. **Development** - npm scripts
7. **License**

### Step 3-1: 新機能の追加

新しいAPIやウィジェットが実装された場合:

1. **Features セクション**: 必要であれば新しい特徴を追加
2. **API Reference セクション**: 該当するカテゴリに新APIを追加

APIリファレンスの記述フォーマット（既存パターンに従う）:

````markdown
### API名

```typescript
kt.api_name(param1: Type1, param2?: Type2): ReturnType
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| param1 | `Type1` | - | 説明 |
| param2 | `Type2` | `default` | 説明 |

```typescript
// Usage example
kt.api_name("value");
```
````

### Step 3-2: 既存APIの変更

APIのシグネチャやパラメータが変更された場合:

1. 型定義をソースコード (`src/kt/`) と一致させる
2. パラメータテーブルを更新する
3. コード例が動作することを確認する

### Step 3-3: コード例の検証

README内のコード例が最新のAPIで動作するか確認:

1. `src/index.ts` のエクスポートと一致しているか
2. 型定義が正しいか
3. import文が正しいか（`kantan-ui` からのインポート）

---

## Phase 4: チュートリアルの更新

### 対象ファイル

- `docs/TUTORIAL.md` (日本語)

### チュートリアルの構成

現在のチュートリアルは以下のセクションで構成されている:

1. kantan-uiとは
2. 環境構築
3. Hello World
4. ウィジェットの使い方（全ウィジェット）
5. データ表示（table, metric）
6. メディア（image, audio, video）
7. レイアウト（tabs, columns, container, expander）
8. チャットUI（chat_message, chat_container, chat_input）
9. セッションステート（createTypedSessionState）
10. キャッシュ（cache_data, cache_resource）
11. ページ設定（set_page_config）
12. 実践: カウンターアプリ
13. 実践: TODOアプリ
14. 実践: チャットアプリ
15. 設定オプション
16. 次のステップ

### Step 4-1: 既存セクションの更新

既存のウィジェットやAPIが変更された場合:

1. 該当セクションのコード例を最新APIに合わせて修正
2. パラメータの説明を更新
3. 新しいオプションがあれば追記

### Step 4-2: 新しいセクションの追加

新しいAPIカテゴリが追加された場合、既存セクションのフォーマットに従って追加する。

#### ウィジェットの場合（セクション4に追加）

````markdown
### <ウィジェット名>

`kt.<widget_name>()` は<説明>。

```typescript
const value = kt.<widget_name>("ラベル", options);
kt.write(`選択値: ${value}`);
```

**オプション:**

| パラメータ | 型 | デフォルト | 説明 |
|-----------|------|---------|------|
| label | `string` | - | ラベル |
| options | `object` | `{}` | 設定 |
````

#### 新しいAPIカテゴリの場合

目次に新しい項目を追加し、セクションを作成する:

````markdown
---

## <新セクション名>

<概要説明>

### 基本的な使い方

```typescript
import { createApp, kt } from "kantan-ui";

const script = () => {
  // コード例
};

export default await createApp(script);
```
````

### Step 4-3: 実践例の更新

実践セクション（カウンター、TODO、チャット）に新機能を活用した例を追加できる場合は更新する。ただし、既存の動作例を壊さないよう注意する。

### Step 4-4: 目次の更新

セクションを追加・削除した場合、冒頭の目次を更新する。

---

## Phase 5: 一貫性チェック（全体）

すべてのドキュメントを更新した後、以下を確認:

1. `src/kt/index.ts` でエクスポートされている全APIがREADMEに記載されているか
2. パラメータのデフォルト値がソースコードと一致しているか
3. 型名がソースコードの型定義と一致しているか
4. 設計書と実装計画書のステータスが矛盾していないか
5. ドキュメント内の日付が正しいこと
6. ファイルパスの参照が実際のコードと一致すること

## 記述ルール

- `README.md` は**英語**で記述する
- `docs/TUTORIAL.md` と開発ドキュメントは**日本語**で記述する
- コード例は TypeScript で記述する
- 各APIにはパラメータテーブルと使用例を含める
- 既存のマークダウンスタイル・インデントを維持する
- チュートリアルは初心者が理解できるよう段階的に説明する（丁寧語「です・ます」調）
- コード例は完全に動作するものにする（断片的なコードを避ける）
- 不要になった設計書は `docs/archive/` に移動する
