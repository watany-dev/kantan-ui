---
name: update-tutorial
description: チュートリアル（docs/TUTORIAL.md）を最新の実装に合わせて更新する。新しいウィジェット、API、機能が追加された後に使用する。
---

# チュートリアル最新化

`docs/TUTORIAL.md` を最新の実装に合わせて更新する。

## 対象ファイル

- `docs/TUTORIAL.md` (日本語)

## チュートリアルの構成

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

## 手順

### Step 1: 変更内容の把握

```bash
git diff HEAD~5 --name-only
git log --oneline -10
```

新しく追加・変更されたAPIを特定し、チュートリアルのどのセクションに影響があるか判断する。

### Step 2: 既存セクションの更新

既存のウィジェットやAPIが変更された場合:

1. 該当セクションのコード例を最新APIに合わせて修正
2. パラメータの説明を更新
3. 新しいオプションがあれば追記

### Step 3: 新しいセクションの追加

新しいAPIカテゴリが追加された場合、既存セクションのフォーマットに従って追加する。

#### ウィジェットの場合（セクション4に追加）

既存パターン:

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

### <サブ機能1>

説明とコード例...

### <サブ機能2>

説明とコード例...
````

### Step 4: 実践例の更新

実践セクション（カウンター、TODO、チャット）に新機能を活用した例を追加できる場合は更新する。ただし、既存の動作例を壊さないよう注意する。

### Step 5: 目次の更新

セクションを追加・削除した場合、冒頭の目次を更新する:

```markdown
## 目次

1. [kantan-uiとは](#kantan-uiとは)
2. [環境構築](#環境構築)
...（新しいセクションを追加）
```

### Step 6: コード例の動作確認

チュートリアル内のコード例が実際に動作するか確認する:

1. `src/kt/index.ts` からのエクスポートと一致しているか
2. 型定義が正しいか
3. `createApp` と `kt` のインポートが正しいか

## 記述ルール

- チュートリアルは**日本語**で記述する
- 初心者が理解できるよう、段階的に説明する
- 各ウィジェットには最低1つのコード例を含める
- オプションパラメータはテーブルで整理する
- 既存の文体・トーンを維持する（丁寧語「です・ます」調）
- コード例は完全に動作するものにする（断片的なコードを避ける）
