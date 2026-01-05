# Phase 3 開発計画 - イテレーティブ実装

作成日: 2026-01-05

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

## Phase 3-A: 依存なし・小〜中規模

### 1. kt.set_page_config() [工数: 小]

#### Iteration 1-1: 型定義とページ設定の保存
```
目標: PageConfig型を定義し、設定を保存する機能
```

| Step | 内容 |
|------|------|
| 🔴 | `tests/unit/kt/config.test.ts` 作成 - `set_page_config()` のテスト |
| 🔴 | テスト内容: 設定保存、二重呼び出しの警告、getPageConfig取得 |
| 🟢 | `src/kt/config.ts` 作成 - PageConfig型、set_page_config、getPageConfig |
| 🔄 | 型定義を `src/kt/types.ts` に分離検討 |
| ✅ | `feat(kt): add set_page_config function with PageConfig type` |

#### Iteration 1-2: HTMLテンプレートへの反映
```
目標: title, icon, layoutをHTMLに反映
```

| Step | 内容 |
|------|------|
| 🔴 | `tests/unit/app.test.ts` に set_page_config 反映テスト追加 |
| 🟢 | `src/app.ts` を修正 - getPageConfig を使用してHTML生成 |
| 🟢 | wideレイアウト用CSS追加 (`.kt-layout-wide`) |
| 🔄 | HTMLテンプレート生成関数の抽出検討 |
| ✅ | `feat(kt): apply page config to HTML template` |

#### Iteration 1-3: kt APIへのエクスポート
```
目標: kt.set_page_config として公開
```

| Step | 内容 |
|------|------|
| 🔴 | `tests/unit/kt/index.test.ts` に set_page_config テスト追加 |
| 🟢 | `src/kt/index.ts` に set_page_config を追加 |
| 🟢 | `src/index.ts` にエクスポート追加 |
| ✅ | `feat(kt): export set_page_config in kt API` |

---

### 2. kt.rerun() [工数: 小]

#### Iteration 2-1: RerunException定義
```
目標: rerun用の例外クラスを定義
```

| Step | 内容 |
|------|------|
| 🔴 | `tests/unit/runtime/rerun-exception.test.ts` 作成 |
| 🟢 | `src/runtime/errors.ts` に RerunException 追加 |
| ✅ | `feat(runtime): add RerunException class` |

#### Iteration 2-2: rerun関数の実装
```
目標: kt.rerun() でスクリプト再実行をトリガー
```

| Step | 内容 |
|------|------|
| 🔴 | `tests/unit/kt/rerun.test.ts` 作成 - rerun()がRerunExceptionをスロー |
| 🟢 | `src/kt/control.ts` 作成 - rerun関数 |
| 🟢 | `src/runtime/rerun.ts` で RerunException をキャッチして再実行 |
| 🔄 | 無限ループ防止のガード追加検討 |
| ✅ | `feat(kt): implement rerun function` |

#### Iteration 2-3: kt APIへのエクスポート
```
目標: kt.rerun として公開
```

| Step | 内容 |
|------|------|
| 🟢 | `src/kt/index.ts` に rerun を追加 |
| 🟢 | `src/index.ts` にエクスポート追加 |
| ✅ | `feat(kt): export rerun in kt API` |

---

### 3. kt.table() [工数: 中]

#### Iteration 3-1: テーブルデータ正規化
```
目標: 様々な形式のデータをテーブル形式に正規化
```

| Step | 内容 |
|------|------|
| 🔴 | `tests/unit/kt/data.test.ts` 作成 - normalizeTableData テスト |
| 🔴 | テスト: オブジェクト配列、2D配列、明示的形式 |
| 🟢 | `src/kt/data.ts` 作成 - TableData型、normalizeTableData |
| ✅ | `feat(kt): add table data normalization` |

#### Iteration 3-2: table関数の基本実装
```
目標: シンプルなHTMLテーブル生成
```

| Step | 内容 |
|------|------|
| 🔴 | `tests/unit/kt/data.test.ts` に table() テスト追加 |
| 🔴 | テスト: ヘッダー生成、行生成、空データ |
| 🟢 | `src/kt/data.ts` に table関数追加 |
| 🟢 | CSS追加 (`.kt-table`) |
| ✅ | `feat(kt): implement table function` |

#### Iteration 3-3: XSSセキュリティ対策
```
目標: セル内容のエスケープ処理
```

| Step | 内容 |
|------|------|
| 🔴 | テスト: スクリプトタグを含むデータのエスケープ |
| 🟢 | escapeHtml適用を確認 |
| 🔄 | セキュリティテストの充実 |
| ✅ | `test(kt): add security tests for table escaping` |

#### Iteration 3-4: kt APIへのエクスポート
```
目標: kt.table として公開
```

| Step | 内容 |
|------|------|
| 🟢 | `src/kt/index.ts` に table を追加 |
| 🟢 | `src/index.ts` にエクスポート追加 |
| ✅ | `feat(kt): export table in kt API` |

---

### 4. kt.download_button() [工数: 中]

#### Iteration 4-1: 型定義とWidgetID登録
```
目標: DownloadButtonConfig型とウィジェット登録
```

| Step | 内容 |
|------|------|
| 🔴 | `tests/unit/widgets/download-button.test.ts` 作成 |
| 🟢 | `src/widgets/types.ts` に DownloadButtonConfig 追加 |
| 🟢 | `src/widgets/download-button.ts` 作成 - 基本構造 |
| ✅ | `feat(widgets): add download button types` |

#### Iteration 4-2: Base64エンコード対応
```
目標: 文字列とArrayBufferのBase64変換
```

| Step | 内容 |
|------|------|
| 🔴 | `tests/unit/utils/base64.test.ts` 作成 |
| 🟢 | `src/utils/base64.ts` 作成 - エンコード関数 |
| ✅ | `feat(utils): add base64 encoding utilities` |

#### Iteration 4-3: renderDownloadButton実装
```
目標: data URL形式でダウンロードリンク生成
```

| Step | 内容 |
|------|------|
| 🔴 | renderDownloadButton のテスト追加 |
| 🟢 | renderDownloadButton 実装 |
| 🟢 | CSS追加 (`.kt-download-button`) |
| ✅ | `feat(widgets): implement download button rendering` |

#### Iteration 4-4: download_button関数とクリック検知
```
目標: ボタンクリック時にtrueを返す
```

| Step | 内容 |
|------|------|
| 🔴 | download_button の戻り値テスト |
| 🟢 | download_button 関数実装 |
| ✅ | `feat(widgets): implement download_button function` |

#### Iteration 4-5: kt APIへのエクスポート
```
目標: kt.download_button として公開
```

| Step | 内容 |
|------|------|
| 🟢 | `src/kt/index.ts` に download_button を追加 |
| 🟢 | `src/index.ts` にエクスポート追加 |
| ✅ | `feat(kt): export download_button in kt API` |

---

### 5. kt.tabs() [工数: 中]

#### Iteration 5-1: 型定義とウィジェット登録
```
目標: TabsConfig, TabDefinition 型定義
```

| Step | 内容 |
|------|------|
| 🔴 | `tests/unit/kt/layout.test.ts` 作成 - tabs 型テスト |
| 🟢 | `src/kt/layout.ts` 作成 - 型定義 |
| ✅ | `feat(kt): add tabs type definitions` |

#### Iteration 5-2: タブヘッダーのレンダリング
```
目標: タブボタンの生成
```

| Step | 内容 |
|------|------|
| 🔴 | タブヘッダーHTML生成テスト |
| 🟢 | tabs関数のヘッダー部分実装 |
| 🟢 | CSS追加 (`.kt-tabs`, `.kt-tabs-header`, `.kt-tab`) |
| ✅ | `feat(kt): implement tabs header rendering` |

#### Iteration 5-3: タブ状態管理
```
目標: アクティブタブの保持と切り替え
```

| Step | 内容 |
|------|------|
| 🔴 | アクティブタブ状態管理テスト |
| 🟢 | ウィジェット状態を使用したタブ状態管理 |
| 🟢 | クリックイベントでのタブ切り替え |
| ✅ | `feat(kt): implement tabs state management` |

#### Iteration 5-4: コンテンツレンダリング
```
目標: アクティブタブのコンテンツのみ表示
```

| Step | 内容 |
|------|------|
| 🔴 | タブコンテンツ表示テスト |
| 🟢 | content関数の呼び出しとHTML生成 |
| 🔄 | アクティブタブスタイル改善 |
| ✅ | `feat(kt): implement tabs content rendering` |

#### Iteration 5-5: kt APIへのエクスポート
```
目標: kt.tabs として公開
```

| Step | 内容 |
|------|------|
| 🟢 | `src/kt/index.ts` に tabs を追加 |
| 🟢 | `src/index.ts` にエクスポート追加 |
| ✅ | `feat(kt): export tabs in kt API` |

---

## Phase 3-B: 依存なし・大規模

### 6. kt.cache_data / kt.cache_resource [工数: 中]

#### Iteration 6-1: CacheConfig型とデータキャッシュ基盤
```
目標: キャッシュ設定の型定義とMap基盤
```

| Step | 内容 |
|------|------|
| 🔴 | `tests/unit/cache/data-cache.test.ts` 作成 |
| 🟢 | `src/cache/types.ts` 作成 - CacheConfig型 |
| 🟢 | `src/cache/data-cache.ts` 作成 - 基本構造 |
| ✅ | `feat(cache): add cache types and data cache foundation` |

#### Iteration 6-2: cache_data基本機能
```
目標: 関数結果のキャッシュと取得
```

| Step | 内容 |
|------|------|
| 🔴 | キャッシュ保存・取得テスト |
| 🟢 | cache_data の基本実装 |
| ✅ | `feat(cache): implement cache_data basic functionality` |

#### Iteration 6-3: TTLとmaxEntries
```
目標: キャッシュ有効期限と最大エントリ数
```

| Step | 内容 |
|------|------|
| 🔴 | TTL期限切れテスト、maxEntries制限テスト |
| 🟢 | TTL、maxEntries 実装 |
| 🔄 | LRU削除ロジック検討 |
| ✅ | `feat(cache): add TTL and maxEntries to cache_data` |

#### Iteration 6-4: cache_resource実装
```
目標: リソース（参照）のキャッシュ
```

| Step | 内容 |
|------|------|
| 🔴 | `tests/unit/cache/resource-cache.test.ts` 作成 |
| 🟢 | `src/cache/resource-cache.ts` 作成 |
| ✅ | `feat(cache): implement cache_resource` |

#### Iteration 6-5: クリア機能
```
目標: cache_data.clear(), cache_resource.clear()
```

| Step | 内容 |
|------|------|
| 🔴 | クリア機能テスト |
| 🟢 | clear メソッド追加 |
| ✅ | `feat(cache): add cache clear functionality` |

#### Iteration 6-6: kt APIへのエクスポート
```
目標: kt.cache_data, kt.cache_resource として公開
```

| Step | 内容 |
|------|------|
| 🟢 | `src/kt/index.ts` に追加 |
| 🟢 | `src/index.ts` にエクスポート追加 |
| ✅ | `feat(kt): export cache_data and cache_resource in kt API` |

---

### 7. kt.sidebar [工数: 中]

#### Iteration 7-1: サイドバーコンテキスト管理
```
目標: メイン/サイドバーのコンテキスト切り替え
```

| Step | 内容 |
|------|------|
| 🔴 | `tests/unit/kt/sidebar.test.ts` 作成 |
| 🔴 | テスト: コンテキスト判定、切り替え |
| 🟢 | `src/kt/sidebar.ts` 作成 - isSidebarContext, sidebarContent管理 |
| ✅ | `feat(kt): add sidebar context management` |

#### Iteration 7-2: sidebar関数（コールバックスタイル）
```
目標: kt.sidebar(() => { ... }) 形式
```

| Step | 内容 |
|------|------|
| 🔴 | sidebar(callback)テスト |
| 🟢 | sidebar 関数実装 |
| 🔄 | ネストしたsidebar呼び出しのエラー処理 |
| ✅ | `feat(kt): implement sidebar callback style` |

#### Iteration 7-3: appendToContext修正
```
目標: 既存のkt.* APIがサイドバーコンテキストを認識
```

| Step | 内容 |
|------|------|
| 🔴 | sidebar内でkt.write等が動作するテスト |
| 🟢 | `src/kt/context.ts` または各API修正 |
| ✅ | `feat(kt): enable kt APIs to work within sidebar` |

#### Iteration 7-4: サイドバーレイアウトHTML/CSS
```
目標: aside/main構造のレンダリング
```

| Step | 内容 |
|------|------|
| 🔴 | 最終HTMLにサイドバー構造が含まれるテスト |
| 🟢 | `src/app.ts` でサイドバーHTML生成 |
| 🟢 | CSS追加 (`.kt-app`, `.kt-sidebar`, `.kt-main`) |
| ✅ | `feat(kt): add sidebar layout HTML and CSS` |

#### Iteration 7-5: kt APIへのエクスポート
```
目標: kt.sidebar として公開
```

| Step | 内容 |
|------|------|
| 🟢 | `src/kt/index.ts` に sidebar を追加 |
| 🟢 | `src/index.ts` にエクスポート追加 |
| ✅ | `feat(kt): export sidebar in kt API` |

---

### 8. kt.dataframe() [工数: 中]

#### Iteration 8-1: dataframe型定義
```
目標: DataFrameConfig型、table拡張
```

| Step | 内容 |
|------|------|
| 🔴 | `tests/unit/kt/data.test.ts` に dataframe テスト追加 |
| 🟢 | DataFrameConfig型追加 |
| ✅ | `feat(kt): add dataframe type definitions` |

#### Iteration 8-2: 基本的なdataframeレンダリング
```
目標: スクロール可能なテーブル
```

| Step | 内容 |
|------|------|
| 🔴 | dataframe HTML生成テスト |
| 🟢 | dataframe 基本実装（height, overflow） |
| 🟢 | CSS追加 (`.kt-dataframe`) |
| ✅ | `feat(kt): implement basic dataframe rendering` |

#### Iteration 8-3: ソート機能
```
目標: ヘッダークリックでソート
```

| Step | 内容 |
|------|------|
| 🔴 | ソートクリックイベントテスト |
| 🟢 | クライアントサイドソート用のonclick生成 |
| 🟢 | sortable設定に応じた動作切り替え |
| ✅ | `feat(kt): add sortable functionality to dataframe` |

#### Iteration 8-4: kt APIへのエクスポート
```
目標: kt.dataframe として公開
```

| Step | 内容 |
|------|------|
| 🟢 | `src/kt/index.ts` に dataframe を追加 |
| 🟢 | `src/index.ts` にエクスポート追加 |
| ✅ | `feat(kt): export dataframe in kt API` |

---

### 9. kt.file_uploader() [工数: 高]

#### Iteration 9-1: UploadedFile型とConfig
```
目標: アップロードファイル型定義
```

| Step | 内容 |
|------|------|
| 🔴 | `tests/unit/widgets/file-uploader.test.ts` 作成 |
| 🟢 | `src/widgets/types.ts` に UploadedFile, FileUploaderConfig 追加 |
| ✅ | `feat(widgets): add file uploader type definitions` |

#### Iteration 9-2: ファイル入力HTMLレンダリング
```
目標: <input type="file"> 生成
```

| Step | 内容 |
|------|------|
| 🔴 | renderFileUploader テスト |
| 🟢 | `src/widgets/file-uploader.ts` 作成 - renderFileUploader |
| 🟢 | accept属性、multiple属性の処理 |
| ✅ | `feat(widgets): implement file uploader HTML rendering` |

#### Iteration 9-3: クライアントサイドファイル読み込み
```
目標: FileReader APIでBase64エンコード
```

| Step | 内容 |
|------|------|
| 🔴 | クライアントスクリプトテスト（E2E必要か検討） |
| 🟢 | `src/client/file-upload.ts` 作成 - ktHandleFileUpload |
| 🟢 | `src/client/index.ts` に統合 |
| ✅ | `feat(client): add file upload handling` |

#### Iteration 9-4: サーバーサイドデコードと状態保存
```
目標: Base64デコードしてセッション状態に保存
```

| Step | 内容 |
|------|------|
| 🔴 | WebSocketメッセージ処理テスト |
| 🟢 | `src/websocket/handler.ts` でファイルイベント処理 |
| 🟢 | UploadedFileオブジェクト生成 |
| ✅ | `feat(websocket): handle file upload events` |

#### Iteration 9-5: file_uploader関数
```
目標: ウィジェット状態からファイル取得
```

| Step | 内容 |
|------|------|
| 🔴 | file_uploader 戻り値テスト |
| 🟢 | file_uploader 関数実装 |
| ✅ | `feat(widgets): implement file_uploader function` |

#### Iteration 9-6: サイズ制限・型制限
```
目標: maxSize, type バリデーション
```

| Step | 内容 |
|------|------|
| 🔴 | バリデーションテスト |
| 🟢 | クライアントサイド・サーバーサイドバリデーション |
| ✅ | `feat(widgets): add file upload validation` |

#### Iteration 9-7: kt APIへのエクスポート
```
目標: kt.file_uploader として公開
```

| Step | 内容 |
|------|------|
| 🟢 | `src/kt/index.ts` に file_uploader を追加 |
| 🟢 | `src/index.ts` にエクスポート追加 |
| ✅ | `feat(kt): export file_uploader in kt API` |

---

## Phase 3-C: チャート機能（オプショナル依存）

### 10. kt.line_chart() [工数: 高]

#### Iteration 10-1: ChartData型とデータ正規化
```
目標: チャートデータ形式の統一
```

| Step | 内容 |
|------|------|
| 🔴 | `tests/unit/kt/charts.test.ts` 作成 |
| 🔴 | normalizeChartData テスト |
| 🟢 | `src/kt/charts.ts` 作成 - ChartData型、normalizeChartData |
| ✅ | `feat(kt): add chart data normalization` |

#### Iteration 10-2: SVGパス生成
```
目標: データポイントからSVGパス計算
```

| Step | 内容 |
|------|------|
| 🔴 | SVGパス生成テスト |
| 🟢 | generateLinePath 関数実装 |
| ✅ | `feat(kt): add SVG path generation for line chart` |

#### Iteration 10-3: line_chart基本実装
```
目標: グリッド線、ライン、ポイントのSVG
```

| Step | 内容 |
|------|------|
| 🔴 | line_chart HTML生成テスト |
| 🟢 | line_chart 関数実装 |
| 🟢 | CSS追加 (`.kt-chart`, `.kt-line-chart`) |
| ✅ | `feat(kt): implement line_chart function` |

#### Iteration 10-4: タイトルとラベル
```
目標: チャートタイトル、X/Y軸ラベル
```

| Step | 内容 |
|------|------|
| 🔴 | タイトル・ラベル表示テスト |
| 🟢 | タイトル・ラベル実装 |
| ✅ | `feat(kt): add title and labels to line_chart` |

#### Iteration 10-5: kt APIへのエクスポート
```
目標: kt.line_chart として公開
```

| Step | 内容 |
|------|------|
| 🟢 | `src/kt/index.ts` に line_chart を追加 |
| 🟢 | `src/index.ts` にエクスポート追加 |
| ✅ | `feat(kt): export line_chart in kt API` |

---

### 11. kt.bar_chart() [工数: 高]

#### Iteration 11-1: bar_chart基本実装
```
目標: SVGで棒グラフを描画
```

| Step | 内容 |
|------|------|
| 🔴 | `tests/unit/kt/charts.test.ts` に bar_chart テスト追加 |
| 🟢 | generateBarRects 関数実装 |
| 🟢 | bar_chart 関数実装 |
| 🟢 | CSS追加 (`.kt-bar-chart`) |
| ✅ | `feat(kt): implement bar_chart function` |

#### Iteration 11-2: ラベル表示
```
目標: X軸ラベル（カテゴリ名）
```

| Step | 内容 |
|------|------|
| 🔴 | ラベル表示テスト |
| 🟢 | SVGテキスト要素でラベル追加 |
| ✅ | `feat(kt): add labels to bar_chart` |

#### Iteration 11-3: kt APIへのエクスポート
```
目標: kt.bar_chart として公開
```

| Step | 内容 |
|------|------|
| 🟢 | `src/kt/index.ts` に bar_chart を追加 |
| 🟢 | `src/index.ts` にエクスポート追加 |
| ✅ | `feat(kt): export bar_chart in kt API` |

---

### 12. Chart.jsプラグイン連携 [工数: 中・オプション]

#### Iteration 12-1: プラグインインターフェース
```
目標: チャートプラグインの拡張ポイント定義
```

| Step | 内容 |
|------|------|
| 🔴 | `tests/unit/kt/chart-plugin.test.ts` 作成 |
| 🟢 | ChartPlugin インターフェース定義 |
| 🟢 | registerChartPlugin 関数 |
| ✅ | `feat(kt): add chart plugin interface` |

#### Iteration 12-2: プラグイン切り替えロジック
```
目標: プラグイン登録時にチャート関数を置換
```

| Step | 内容 |
|------|------|
| 🔴 | プラグイン登録後のチャート描画テスト |
| 🟢 | line_chart/bar_chart のプラグイン対応 |
| ✅ | `feat(kt): enable chart plugin switching` |

---

## E2Eテスト追加

### E2E Iteration 1: 基本機能
```
目標: Phase 3-A機能のE2Eテスト
```

| Step | 内容 |
|------|------|
| 🔴 | `tests/e2e/phase3-basic.test.ts` 作成 |
| 🟢 | set_page_config, rerun, table, download_button, tabs のE2Eテスト |
| ✅ | `test(e2e): add Phase 3-A e2e tests` |

### E2E Iteration 2: 高度な機能
```
目標: Phase 3-B機能のE2Eテスト
```

| Step | 内容 |
|------|------|
| 🔴 | `tests/e2e/phase3-advanced.test.ts` 作成 |
| 🟢 | cache, sidebar, dataframe, file_uploader のE2Eテスト |
| ✅ | `test(e2e): add Phase 3-B e2e tests` |

### E2E Iteration 3: チャート
```
目標: Phase 3-C機能のE2Eテスト
```

| Step | 内容 |
|------|------|
| 🔴 | `tests/e2e/phase3-charts.test.ts` 作成 |
| 🟢 | line_chart, bar_chart のE2Eテスト |
| ✅ | `test(e2e): add Phase 3-C e2e tests` |

---

## 実装順序サマリー

```
Week 1-2: Phase 3-A
├── Iter 1-1 ~ 1-3: set_page_config (3 commits)
├── Iter 2-1 ~ 2-3: rerun (3 commits)
├── Iter 3-1 ~ 3-4: table (4 commits)
├── Iter 4-1 ~ 4-5: download_button (5 commits)
└── Iter 5-1 ~ 5-5: tabs (5 commits)

Week 3-4: Phase 3-B
├── Iter 6-1 ~ 6-6: cache_data/cache_resource (6 commits)
├── Iter 7-1 ~ 7-5: sidebar (5 commits)
├── Iter 8-1 ~ 8-4: dataframe (4 commits)
└── Iter 9-1 ~ 9-7: file_uploader (7 commits)

Week 5: Phase 3-C
├── Iter 10-1 ~ 10-5: line_chart (5 commits)
├── Iter 11-1 ~ 11-3: bar_chart (3 commits)
└── Iter 12-1 ~ 12-2: Chart.js plugin (2 commits, optional)

Week 5-6: E2E & Polish
├── E2E Iter 1: Phase 3-A tests (1 commit)
├── E2E Iter 2: Phase 3-B tests (1 commit)
└── E2E Iter 3: Phase 3-C tests (1 commit)
```

**合計: 約54コミット**

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

## 各イテレーションの完了条件

1. テストがすべてパスする
2. `bun run lint:fix` で警告なし
3. `bun run ci` がすべて成功
4. コミットメッセージが規約に従っている
5. 既存機能が壊れていない（リグレッションなし）

---

## リスク管理

| リスク | 対策 |
|--------|------|
| file_uploaderの複雑さ | 小さなイテレーションに分割済み |
| チャートのSVG品質 | 基本機能優先、後からプラグイン拡張 |
| サイドバーのコンテキスト切り替え | 既存APIへの影響を最小化 |
| キャッシュのメモリリーク | TTLとmaxEntriesで制限 |

---

*作成: 2026-01-05*
*対象: kantan-ui v0.4.0 - v0.5.0*
