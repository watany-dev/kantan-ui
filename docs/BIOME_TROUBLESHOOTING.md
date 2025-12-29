# Biome Linting 再発防止プラン

## 1. 現状の問題点

### 1.1 発生している問題
- **biomeが動作しない**: `node_modules`がインストールされていない状態でbiomeコマンドが実行できない
- **コード形式の不一致**: タブ/スペースの混在、import順序の問題が繰り返し発生
- **後追い修正の連続**: CIで失敗してから修正するパターンが常態化

### 1.2 根本原因
1. **ローカル開発環境でのbiome実行が任意**: 開発者が意識的に実行しないと動作しない
2. **pre-commitフックの不在**: コミット時の自動チェックがない
3. **エディタ設定の不統一**: VSCodeなどの設定が共有されていない

### 1.3 過去の修正履歴（問題の繰り返しを示す）
| コミット | 内容 |
|---------|------|
| `c4ac052` | コード全体をスペース→タブに変換 |
| `01b73a1` | タブ変換をリバート |
| `9339ef2` | import順序を修正 |
| `f4d15ca` | biome formatを適用 |
| `1c1154e` | .githubをignoreリストに追加 |
| `5ceebdc` | .githubをignoreリストから削除 |

---

## 2. 再発防止策

### 2.1 【緊急対応】lefthookによるpre-commitフック導入

**目的**: コミット前に自動でbiome checkを実行し、問題があればコミットをブロック

```yaml
# lefthook.yml
pre-commit:
  commands:
    biome-check:
      glob: "*.{js,ts,tsx,jsx,json}"
      run: bunx biome check --staged --no-errors-on-unmatched
      stage_fixed: true
```

**導入手順**:
```bash
# lefthookをインストール
bun add -D lefthook

# フックをインストール
bunx lefthook install
```

### 2.2 【緊急対応】VSCode設定の共有

**.vscode/settings.json**:
```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports.biome": "explicit"
  },
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[javascript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[json]": {
    "editor.defaultFormatter": "biomejs.biome"
  }
}
```

**.vscode/extensions.json**:
```json
{
  "recommendations": [
    "biomejs.biome"
  ]
}
```

### 2.3 【重要】package.jsonにセットアップスクリプト追加

```json
{
  "scripts": {
    "prepare": "lefthook install",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "format": "biome format --write ."
  }
}
```

- `prepare`スクリプトにより、`bun install`時に自動でlefthookがセットアップされる

### 2.4 【推奨】CI/CDの強化

現行CIに以下を追加:
```yaml
- name: Run linter
  run: bun run lint
  # すでに実装済み - 変更不要
```

**CI失敗時のエラーメッセージ改善**（任意）:
```yaml
- name: Run linter
  run: |
    if ! bun run lint; then
      echo "::error::Biome linting failed. Run 'bun run lint:fix' locally to fix."
      exit 1
    fi
```

---

## 3. 実装優先度

| 優先度 | 対策 | 効果 | 工数 |
|--------|------|------|------|
| 🔴 高 | lefthook導入 | コミット時に自動チェック | 30分 |
| 🔴 高 | VSCode設定共有 | 保存時に自動フォーマット | 15分 |
| 🟡 中 | prepareスクリプト追加 | install時に自動セットアップ | 5分 |
| 🟢 低 | CIエラーメッセージ改善 | デバッグ時間短縮 | 10分 |

---

## 4. 開発者向けガイドライン

### 4.1 初期セットアップ
```bash
# 依存関係をインストール（lefthookも自動セットアップ）
bun install

# VSCode拡張をインストール
# 推奨拡張機能の通知が出るので「Install All」をクリック
```

### 4.2 日常の開発フロー
1. **保存時**: VSCodeが自動でフォーマット
2. **コミット時**: lefthookが自動でbiome check実行
3. **問題発生時**: `bun run lint:fix` で自動修正

### 4.3 トラブルシューティング

**Q: biomeコマンドが見つからない**
```bash
bun install
```

**Q: pre-commitフックが動かない**
```bash
bunx lefthook install
```

**Q: VSCodeでフォーマットされない**
1. Biome拡張機能をインストール
2. `.vscode/settings.json`の設定を確認
3. ファイルを開き直す

**Q: CIで失敗したが、ローカルでは通る**
```bash
# 最新の依存関係に更新
bun install

# 全ファイルをチェック
bun run lint

# 自動修正
bun run lint:fix
```

---

## 5. 今後の監視項目

- [ ] lefthook導入後、biome関連の修正コミットが減少しているか
- [ ] CIのlintステップの失敗率が低下しているか
- [ ] 開発者からの「biomeが動かない」報告が減少しているか
