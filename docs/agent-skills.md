# Agent Skills

## Overview

Agent Skills (<https://agentskills.io>) は、AIエージェントに新しい能力と専門知識を与えるための軽量でオープンなフォーマット標準。Anthropicが提唱し、Claude Code、VS Code Copilot、OpenAI Codex など複数のAIツールで採用されている。

"Write once, use everywhere" - 一度書けばどのエージェントでも使える。

## SKILL.md の基本構造

スキルは `SKILL.md` ファイルを含むディレクトリとして定義される。

```
my-skill/
├── SKILL.md           # メインの指示（必須）
├── reference.md       # 詳細ドキュメント（オプション）
├── examples/          # 出力例（オプション）
└── scripts/           # 実行可能スクリプト（オプション）
```

### フォーマット

YAMLフロントマターとMarkdownコンテンツの2部構成:

```yaml
---
name: my-skill-name          # 最大64文字、小文字+数字+ハイフンのみ
description: スキルの説明      # 最大1024文字
---

# スキルの指示内容（Markdown）
```

## フロントマターフィールド

### 標準仕様 (agentskills.io)

| フィールド | 必須 | 説明 |
|:--|:--|:--|
| `name` | Yes | スキルの一意識別子（最大64文字、小文字+数字+ハイフン） |
| `description` | Yes | 用途の説明。エージェントがこの記述でスキル選択を判断 |
| `license` | No | ライセンス情報 |
| `metadata` | No | author, version 等の追加メタデータ |

### Claude Code 拡張フィールド

| フィールド | 説明 |
|:--|:--|
| `disable-model-invocation` | `true`でエージェントの自動呼び出しを禁止 |
| `user-invocable` | `false`でユーザーの`/`メニューから非表示 |
| `allowed-tools` | スキル実行時に許可するツール |
| `context` | `fork`でサブエージェントとして分離実行 |
| `agent` | `context: fork`時のエージェント種別 |
| `model` | 使用モデルの指定 |
| `argument-hint` | 引数ヒント（例: `[issue-number]`） |
| `hooks` | スキルライフサイクルに紐づくフック |

## プログレッシブ・ディスクロージャー

スキルのコンテンツは3段階で段階的にロードされる:

| レベル | ロードタイミング | トークンコスト | 内容 |
|:--|:--|:--|:--|
| Level 1: メタデータ | 起動時（常時） | ~100 tokens/スキル | `name`と`description`のみ |
| Level 2: 指示 | スキル発動時 | ~5k tokens以下 | SKILL.md本文 |
| Level 3: リソース | 必要時のみ | 実質無制限 | 同梱ファイル・スクリプト |

この設計により、多数のスキルをインストールしてもコンテキストウィンドウを圧迫しない。

## スキルの配置場所

| スコープ | パス | 適用範囲 |
|:--|:--|:--|
| Enterprise | マネージド設定 | 組織全体 |
| Personal | `~/.claude/skills/<name>/SKILL.md` | 全プロジェクト |
| Project | `.claude/skills/<name>/SKILL.md` | そのプロジェクトのみ |
| Plugin | `<plugin>/skills/<name>/SKILL.md` | プラグイン有効時 |

優先度: Enterprise > Personal > Project

## 呼び出し制御

| 設定 | ユーザー呼び出し | エージェント呼び出し |
|:--|:--|:--|
| デフォルト | 可 | 可 |
| `disable-model-invocation: true` | 可 | 不可 |
| `user-invocable: false` | 不可 | 可 |

## 高度な機能

### 動的コンテキスト注入

`` !`command` `` 構文でシェルコマンドの出力をスキル内に埋め込める:

```yaml
---
name: pr-summary
description: PRの変更を要約
context: fork
agent: Explore
---

## PRコンテキスト
- PR diff: !`gh pr diff`
- 変更ファイル: !`gh pr diff --name-only`
```

### サブエージェント実行

`context: fork` で独立したコンテキストで実行:

```yaml
---
name: deep-research
description: トピックを徹底調査
context: fork
agent: Explore
---

$ARGUMENTS を徹底的に調査:
1. Glob と Grep で関連ファイルを検索
2. コードを読み分析
3. ファイル参照付きで所見をまとめる
```

### 引数

- `$ARGUMENTS` - 全引数
- `$ARGUMENTS[N]` / `$N` - N番目の引数（0始まり）
- `${CLAUDE_SESSION_ID}` - セッションID

### 拡張思考

スキル内に "ultrathink" を含めると extended thinking が有効化される。

## クロスプラットフォーム対応

Agent Skills はオープン標準のため複数のプラットフォームで動作:

- **Claude Code** / **Claude API** / **Claude.ai** - Anthropic
- **VS Code Copilot** - Microsoft
- **OpenAI Codex** - OpenAI

## セキュリティ

- 信頼できるソースからのスキルのみ使用を推奨
- スキルは指示とコードを通じて新しい能力を提供するため、悪意あるスキルはツール呼び出しやコード実行を想定外の方法で行う可能性がある
- 外部URLからデータを取得するスキルはリスクが高い
- ソフトウェアインストールと同等の注意が必要

## 参考リンク

- [Agent Skills 公式サイト](https://agentskills.io/home)
- [仕様書](https://agentskills.io/specification)
- [Claude Code Skills ドキュメント](https://code.claude.com/docs/en/skills)
- [Claude API Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [VS Code Copilot Agent Skills](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
- [OpenAI Codex Skills](https://developers.openai.com/codex/skills/)
- [anthropics/skills GitHub リポジトリ](https://github.com/anthropics/skills)
