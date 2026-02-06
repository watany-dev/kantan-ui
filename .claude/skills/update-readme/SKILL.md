---
name: update-readme
description: README.mdを最新の実装状態に合わせて更新する。新機能の追加、APIの変更、使用例の追加・修正時に使用する。
---

# README.md 最新化

README.md を最新の実装に合わせて更新する。

## 対象ファイル

- `README.md` (英語)

## README.md のセクション構成

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

## 手順

### Step 1: 変更内容の把握

```bash
git diff HEAD~5 --name-only
git log --oneline -10
```

変更されたソースファイルから、READMEのどのセクションに影響があるか特定する。

### Step 2: 新機能の追加

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

### Step 3: 既存APIの変更

APIのシグネチャやパラメータが変更された場合:

1. 型定義をソースコード (`src/kt/`) と一致させる
2. パラメータテーブルを更新する
3. コード例が動作することを確認する

### Step 4: コード例の検証

README内のコード例が最新のAPIで動作するか確認:

1. `src/index.ts` のエクスポートと一致しているか
2. 型定義が正しいか
3. import文が正しいか（`kantan-ui` からのインポート）

### Step 5: 整合性の確認

以下を確認する:

1. `src/kt/index.ts` でエクスポートされている全APIがREADMEに記載されているか
2. パラメータのデフォルト値がソースコードと一致しているか
3. 型名がソースコードの型定義と一致しているか

## 記述ルール

- README.md は**英語**で記述する
- コード例は TypeScript で記述する
- 各APIにはパラメータテーブルと使用例を含める
- 既存のマークダウンスタイル・インデントを維持する
- 長くなりすぎないよう、詳細はチュートリアルやdocs/に委譲する
