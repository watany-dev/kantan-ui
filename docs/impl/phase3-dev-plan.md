# Phase 3 開発計画 - イテレーティブ実装

作成日: 2026-01-05
更新日: 2026-01-08

## 実装状況サマリー

| Phase | 機能 | 状態 |
|-------|------|------|
| 3-A | set_page_config, rerun, table, download_button, tabs | ✅ **完了** |
| 3-B | sidebar | ✅ **完了** |
| 3-B | markdown, code, json | ✅ **完了** |
| 3-B | cache_data, cache_resource | ❌ 未実装 |
| 3-B | dataframe | ❌ 未実装 |
| 3-B | file_uploader | ❌ 未実装 |
| 3-C | line_chart, bar_chart | ❌ 未実装 |
| 3-C | Chart.jsプラグイン | ❌ 未実装 |

---

## 概要

`streamlit-compat-phase3.md` に基づく12機能の詳細な開発計画。
各イテレーションで `bun run lint:fix && bun run ci` を通してからコミット。

---

## 凡例

- 🔴 **Red**: テスト作成（失敗する状態）
- 🟢 **Green**: 最小限の実装でテスト通過
- 🔄 **Refactor**: コード改善・整理
- ✅ **Commit**: CI全パス後コミット

---

## Phase 3-A: 依存なし・小〜中規模 ✅ 完了

### 1. kt.set_page_config() ✅ 実装済み

実装コミット:
- `806f02b` feat(kt): add set_page_config function with PageConfig type
- `b233fda` feat(kt): export set_page_config in kt API

---

### 2. kt.rerun() ✅ 実装済み

実装コミット:
- `f24e9fa` feat(runtime): add RerunException class
- `ae139ed` feat(kt): implement requestRerun function
- `ef62bd7` feat(kt): export rerun in kt API

---

### 3. kt.table() ✅ 実装済み

実装コミット:
- `c3cde5c` feat(kt): implement table function with data normalization
- `59b6745` feat(kt): export table in kt API
- `27a0dfa` feat: add useFirstRowAsHeader option for 2D array tables

---

### 4. kt.download_button() ✅ 実装済み

実装コミット:
- `a3853e3` feat(widgets): implement download_button widget
- `65d2e9f` fix: export download_button from main module
- `899562c` refactor: remove Base64 download, use streaming for all sizes

---

### 5. kt.tabs() ✅ 実装済み

実装コミット:
- `c17db2f` feat(kt): implement tabs layout component

---

## Phase 3-B: 依存なし・大規模

### 6. kt.cache_data / kt.cache_resource ❌ 未実装

**優先度**: 中
**工数**: 中

#### 計画概要
- CacheConfig型とデータキャッシュ基盤
- TTLとmaxEntries
- cache_resource実装
- クリア機能

---

### 7. kt.sidebar ✅ 実装済み

実装コミット:
- `87ef8eb` feat(kt): add dual buffer support to RenderContext for sidebar
- `e1c0967` feat(kt): add kt.sidebar() callback-style API
- `11ad630` feat(styles): add sidebar CSS styles
- `34e4527` feat(app): integrate sidebar HTML layout in initial render
- `a268314` feat(client): add sidebar toggle functionality
- `87e8f34` refactor(sidebar): prevent duplicate event listener registration

---

### 8. kt.dataframe() ❌ 未実装

**優先度**: 低
**工数**: 中

#### 計画概要
- kt.table()の拡張版
- スクロール可能なテーブル
- ソート機能

---

### 9. kt.file_uploader() ❌ 未実装

**優先度**: 中
**工数**: 高

#### 計画概要
- UploadedFile型とConfig
- クライアントサイドファイル読み込み
- サーバーサイドデコードと状態保存
- サイズ制限・型制限

---

## Phase 3-B 追加: 出力系API ✅ 完了

### kt.markdown() ✅ 実装済み

実装コミット:
- `8321c60` feat(kt): add HTML sanitizer for markdown
- `7d5b631` feat(kt): add basic markdown parser
- `e8218a9` feat(kt): extend markdown parser with lists, links, and code blocks
- `95d6942` feat(kt): integrate kt.markdown() API
- `e1a38ab` feat: add table syntax support to markdown parser
- `c0dbfde` feat: add task list (checkbox) support to markdown parser

---

### kt.code() ✅ 実装済み

実装コミット:
- `1e50a63` feat(kt): add code() API for code block display
- `dc4c176` feat(kt): add syntax highlighting for code()
- `d3fe9c9` feat: add copy button feature to code blocks

---

### kt.json() ✅ 実装済み

実装コミット:
- `cba932c` feat(kt): add json() API for collapsible JSON viewer
- `beb44b9` style: add CSS for kt.json(), kt.code(), kt.markdown()

---

## Phase 3-C: チャート機能（オプショナル依存）❌ 未実装

### 10. kt.line_chart() ❌ 未実装

**優先度**: 低
**工数**: 高

#### 計画概要
- ChartData型とデータ正規化
- SVGパス生成
- グリッド線、ライン、ポイントのSVG

---

### 11. kt.bar_chart() ❌ 未実装

**優先度**: 低
**工数**: 高

#### 計画概要
- SVGで棒グラフを描画
- X軸ラベル（カテゴリ名）

---

### 12. Chart.jsプラグイン連携 ❌ 未実装

**優先度**: 低（オプション）
**工数**: 中

#### 計画概要
- プラグインインターフェース
- プラグイン切り替えロジック

---

## 今後の優先順位

1. **高**: file_uploader - ファイルアップロード機能は需要が高い
2. **中**: cache_data/cache_resource - パフォーマンス最適化に有用
3. **低**: dataframe - table()で代替可能
4. **低**: charts - SVG実装は工数が大きい、プラグイン優先を検討

---

## コミットメッセージ規約

```
<type>(<scope>): <description>

Types:
- feat: 新機能
- fix: バグ修正
- test: テスト追加
- refactor: リファクタリング
- docs: ドキュメント

Scopes:
- kt: kt.* API
- widgets: ウィジェット
- cache: キャッシュ機能
- runtime: 実行エンジン
- client: クライアントサイド
- websocket: WebSocket通信
- utils: ユーティリティ
- e2e: E2Eテスト
```

---

*作成: 2026-01-05*
*更新: 2026-01-08*
*対象: kantan-ui v0.4.0 - v0.5.0*
