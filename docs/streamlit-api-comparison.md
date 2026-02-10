# Streamlit API vs kantan-ui 比較・未実装API分析

## 概要

このドキュメントは、Streamlit (v1.52.0+) と kantan-ui の API を比較し、未実装 API の優先度と実装難易度を分析したものです。

---

## 凡例

### 実装状況
- ✅ 実装済み
- ⚠️ 部分実装
- ❌ 未実装

### 優先度
- **P0**: 必須 - 基本的なアプリ構築に不可欠
- **P1**: 高 - 多くのユースケースで必要
- **P2**: 中 - 特定のユースケースで有用
- **P3**: 低 - ニッチなユースケース向け

### 実装難易度
- **Easy**: 1-2日で実装可能、既存パターンの拡張
- **Medium**: 3-5日、新しいコンポーネント設計が必要
- **Hard**: 1-2週間、複雑なロジックや外部依存が必要
- **Very Hard**: 2週間以上、大規模な設計変更が必要

---

## 1. Input Widgets (入力ウィジェット)

| Streamlit API | kantan-ui | 状況 | 優先度 | 難易度 | 備考 |
|---------------|-----------|------|--------|--------|------|
| `st.button` | `kt.button` | ✅ | - | - | 実装済み |
| `st.download_button` | `kt.download_button` | ✅ | - | - | 実装済み |
| `st.link_button` | `kt.link_button` | ✅ | - | - | 実装済み |
| `st.page_link` | - | ❌ | P2 | Medium | マルチページ前提 |
| `st.checkbox` | `kt.checkbox` | ✅ | - | - | 実装済み |
| `st.radio` | `kt.radio` | ✅ | - | - | 実装済み |
| `st.selectbox` | `kt.selectbox` | ✅ | - | - | 実装済み |
| `st.multiselect` | `kt.multiselect` | ✅ | - | - | 実装済み |
| `st.toggle` | `kt.toggle` | ✅ | - | - | 実装済み |
| `st.slider` | `kt.slider` | ✅ | - | - | 実装済み |
| `st.select_slider` | - | ❌ | P2 | Medium | リストから選択するスライダー |
| `st.number_input` | `kt.number_input` | ✅ | - | - | 実装済み |
| `st.text_input` | `kt.text_input` | ✅ | - | - | 実装済み |
| `st.text_area` | `kt.text_area` | ✅ | - | - | 実装済み |
| `st.date_input` | `kt.date_input` | ✅ | - | - | 実装済み |
| `st.time_input` | `kt.time_input` | ✅ | - | - | 実装済み |
| `st.datetime_input` | `kt.datetime_input` | ✅ | - | - | 実装済み（kantan-ui独自API、HTML5 datetime-local使用） |
| `st.file_uploader` | `kt.file_uploader` | ✅ | - | - | 実装済み |
| `st.camera_input` | - | ❌ | P2 | Hard | カメラからの画像取得 |
| `st.audio_input` | - | ❌ | P2 | Hard | マイク録音 |
| `st.color_picker` | `kt.color_picker` | ✅ | - | - | 実装済み |
| `st.pills` | - | ❌ | P2 | Medium | ピル型選択UI |
| `st.segmented_control` | - | ❌ | P2 | Medium | セグメントコントロール |
| `st.feedback` | - | ❌ | P2 | Medium | 評価/センチメント入力 |
| `st.data_editor` | - | ❌ | P1 | Very Hard | インタラクティブなデータ編集 |
| `st.chat_input` | `kt.chat_input` | ✅ | - | - | 実装済み |

---

## 2. Data Display (データ表示)

| Streamlit API | kantan-ui | 状況 | 優先度 | 難易度 | 備考 |
|---------------|-----------|------|--------|--------|------|
| `st.dataframe` | `kt.dataframe` | ✅ | - | - | 実装済み（ソート・検索・行選択） |
| `st.table` | `kt.table` | ✅ | - | - | 実装済み |
| `st.metric` | `kt.metric` | ✅ | - | - | 実装済み |
| `st.json` | `kt.json` | ✅ | - | - | 実装済み |
| `st.column_config.*` | - | ❌ | P2 | Hard | カラム設定API |

---

## 3. Chart Elements (チャート)

| Streamlit API | kantan-ui | 状況 | 優先度 | 難易度 | 備考 |
|---------------|-----------|------|--------|--------|------|
| `st.line_chart` | `kt.line_chart` | ✅ | - | - | 実装済み（SVGベース） |
| `st.area_chart` | `kt.area_chart` | ✅ | - | - | 実装済み（SVGベース、積み上げ対応） |
| `st.bar_chart` | `kt.bar_chart` | ✅ | - | - | 実装済み（SVGベース、グループ化/積み上げ/横向き対応） |
| `st.scatter_chart` | `kt.scatter_chart` | ✅ | - | - | 実装済み（SVGベース、バブルチャート・グルーピング対応） |
| `st.map` | - | ❌ | P2 | Very Hard | 地図表示 |
| `st.pyplot` | - | ❌ | P3 | Very Hard | Matplotlib統合 |
| `st.altair_chart` | - | ❌ | P2 | Very Hard | Vega-Lite/Altair統合 |
| `st.plotly_chart` | - | ❌ | P2 | Very Hard | Plotly統合 |
| `st.pydeck_chart` | - | ❌ | P3 | Very Hard | PyDeck統合 |
| `st.graphviz_chart` | - | ❌ | P3 | Hard | GraphViz統合 |

---

## 4. Text Elements (テキスト)

| Streamlit API | kantan-ui | 状況 | 優先度 | 難易度 | 備考 |
|---------------|-----------|------|--------|--------|------|
| `st.write` | `kt.write` | ✅ | - | - | 完全対応（Markdown、複数引数、オブジェクト/配列） |
| `st.title` | `kt.title` | ✅ | - | - | 実装済み |
| `st.header` | `kt.header` | ✅ | - | - | 実装済み |
| `st.subheader` | `kt.subheader` | ✅ | - | - | 実装済み |
| `st.text` | `kt.text` | ✅ | - | - | 固定幅フォント、Markdown非対応 |
| `st.markdown` | `kt.markdown` | ✅ | - | - | 実装済み |
| `st.caption` | `kt.caption` | ✅ | - | - | 実装済み |
| `st.code` | `kt.code` | ✅ | - | - | 実装済み |
| `st.latex` | - | ❌ | P2 | Medium | LaTeX数式表示 |
| `st.divider` | `kt.divider` | ✅ | - | - | 実装済み |
| `st.html` | `kt.html` | ✅ | - | - | 実装済み |
| `st.echo` | - | ❌ | P3 | Medium | コード表示+実行 |

---

## 5. Media Elements (メディア)

| Streamlit API | kantan-ui | 状況 | 優先度 | 難易度 | 備考 |
|---------------|-----------|------|--------|--------|------|
| `st.image` | `kt.image` | ✅ | - | - | 実装済み |
| `st.audio` | `kt.audio` | ✅ | - | - | 実装済み（URL、data URI、バイナリ対応） |
| `st.video` | `kt.video` | ✅ | - | - | 実装済み（ポスター、字幕トラック、時間範囲対応） |
| `st.logo` | - | ❌ | P2 | Easy | ロゴ表示 |
| `st.pdf` | - | ❌ | P2 | Medium | PDF表示 |

---

## 6. Layout & Containers (レイアウト)

| Streamlit API | kantan-ui | 状況 | 優先度 | 難易度 | 備考 |
|---------------|-----------|------|--------|--------|------|
| `st.columns` | `kt.columns` | ✅ | - | - | 実装済み |
| `st.container` | `kt.container` | ✅ | - | - | 実装済み |
| `st.expander` | `kt.expander` | ✅ | - | - | 実装済み |
| `st.tabs` | `kt.tabs` | ✅ | - | - | 実装済み |
| `st.sidebar` | `kt.sidebar` | ✅ | - | - | 実装済み |
| `st.popover` | - | ❌ | P2 | Medium | ポップオーバー |
| `st.dialog` | - | ❌ | P1 | Hard | モーダルダイアログ |
| `st.empty` | `kt.empty` | ✅ | - | - | 実装済み |
| `st.fragment` | - | ❌ | P2 | Hard | 部分再実行 |

---

## 7. Chat Elements (チャット)

| Streamlit API | kantan-ui | 状況 | 優先度 | 難易度 | 備考 |
|---------------|-----------|------|--------|--------|------|
| `st.chat_message` | `kt.chat_message` | ✅ | - | - | 実装済み |
| `st.chat_input` | `kt.chat_input` | ✅ | - | - | 実装済み |

---

## 8. Status Elements (ステータス)

| Streamlit API | kantan-ui | 状況 | 優先度 | 難易度 | 備考 |
|---------------|-----------|------|--------|--------|------|
| `st.progress` | `kt.progress` | ✅ | - | - | 実装済み |
| `st.spinner` | `kt.spinner` | ✅ | - | - | 実装済み |
| `st.toast` | `kt.toast` | ✅ | - | - | 実装済み |
| `st.success` | `kt.success` | ✅ | - | - | 実装済み |
| `st.info` | `kt.info` | ✅ | - | - | 実装済み |
| `st.warning` | `kt.warning` | ✅ | - | - | 実装済み |
| `st.error` | `kt.error` | ✅ | - | - | 実装済み |
| `st.status` | `kt.status` | ✅ | - | - | 実装済み |
| `st.exception` | - | ❌ | P2 | Easy | 例外表示 |
| `st.balloons` | - | ❌ | P3 | Easy | お祝いアニメーション |
| `st.snow` | - | ❌ | P3 | Easy | 雪アニメーション |

---

## 9. Control Flow (制御フロー)

| Streamlit API | kantan-ui | 状況 | 優先度 | 難易度 | 備考 |
|---------------|-----------|------|--------|--------|------|
| `st.form` | `kt.form` | ✅ | - | - | 実装済み |
| `st.form_submit_button` | `kt.form_submit_button` | ✅ | - | - | 実装済み |
| `st.rerun` | `kt.rerun` | ✅ | - | - | 実装済み |
| `st.stop` | - | ❌ | P2 | Easy | スクリプト停止 |
| `st.switch_page` | - | ❌ | P2 | Medium | ページ切替 |

---

## 10. Navigation (ナビゲーション)

| Streamlit API | kantan-ui | 状況 | 優先度 | 難易度 | 備考 |
|---------------|-----------|------|--------|--------|------|
| `st.navigation` | - | ❌ | P1 | Hard | マルチページナビゲーション |
| `st.Page` | - | ❌ | P1 | Hard | ページ定義 |
| `st.switch_page` | - | ❌ | P2 | Medium | プログラム的ページ切替 |

---

## 11. Caching & State (キャッシング・状態)

| Streamlit API | kantan-ui | 状況 | 優先度 | 難易度 | 備考 |
|---------------|-----------|------|--------|--------|------|
| `st.session_state` | Session API | ⚠️ | - | - | 部分実装（型付き版あり） |
| `st.cache_data` | `kt.cache_data` | ✅ | - | - | 実装済み |
| `st.cache_resource` | `kt.cache_resource` | ✅ | - | - | 実装済み |
| `st.query_params` | - | ❌ | P2 | Medium | クエリパラメータ管理 |

---

## 12. Configuration (設定)

| Streamlit API | kantan-ui | 状況 | 優先度 | 難易度 | 備考 |
|---------------|-----------|------|--------|--------|------|
| `st.set_page_config` | `kt.set_page_config` | ✅ | - | - | 実装済み |
| `st.context` | - | ❌ | P3 | Medium | 実行コンテキスト情報 |
| `st.user` | - | ❌ | P2 | Medium | ユーザー情報（2025年GA） |

---

## 13. Utilities (ユーティリティ)

| Streamlit API | kantan-ui | 状況 | 優先度 | 難易度 | 備考 |
|---------------|-----------|------|--------|--------|------|
| `st.write_stream` | `kt.write_stream` | ✅ | - | - | 実装済み |
| `st.help` | - | ❌ | P3 | Easy | ヘルプ表示 |

---

## 優先度別 未実装API一覧

### P0 (必須) - 0件

すべてのP0 APIが実装済みです。

### P1 (高) - 5件
| API | 難易度 | 説明 |
|-----|--------|------|
| `st.data_editor` | Very Hard | データ編集ウィジェット |
| `st.dialog` | Hard | モーダルダイアログ |
| `st.navigation` | Hard | マルチページナビ |
| `st.Page` | Hard | ページ定義 |

### P2 (中) - 17件
| API | 難易度 | 説明 |
|-----|--------|------|
| `st.page_link` | Medium | ページリンク |
| `st.select_slider` | Medium | 選択スライダー |
| `st.camera_input` | Hard | カメラ入力 |
| `st.audio_input` | Hard | 音声入力 |
| `st.pills` | Medium | ピル選択 |
| `st.segmented_control` | Medium | セグメントコントロール |
| `st.feedback` | Medium | フィードバック入力 |
| `st.column_config.*` | Hard | カラム設定 |
| `st.map` | Very Hard | 地図表示 |
| `st.altair_chart` | Very Hard | Altairチャート |
| `st.plotly_chart` | Very Hard | Plotlyチャート |
| `st.latex` | Medium | LaTeX数式 |
| `st.logo` | Easy | ロゴ |
| `st.pdf` | Medium | PDF表示 |
| `st.popover` | Medium | ポップオーバー |
| `st.fragment` | Hard | 部分再実行 |
| `st.exception` | Easy | 例外表示 |
| `st.stop` | Easy | スクリプト停止 |
| `st.switch_page` | Medium | ページ切替 |
| `st.query_params` | Medium | クエリパラメータ |
| `st.user` | Medium | ユーザー情報 |

### P3 (低) - 7件
| API | 難易度 | 説明 |
|-----|--------|------|
| `st.pyplot` | Very Hard | Matplotlib統合 |
| `st.pydeck_chart` | Very Hard | PyDeck統合 |
| `st.graphviz_chart` | Hard | GraphViz統合 |
| `st.echo` | Medium | コード表示+実行 |
| `st.balloons` | Easy | バルーンアニメーション |
| `st.snow` | Easy | 雪アニメーション |
| `st.help` | Easy | ヘルプ表示 |
| `st.context` | Medium | 実行コンテキスト |

---

## 推奨実装順序

### Phase 1: チャート基盤 (P0)
1. ~~**`st.line_chart`**~~ - ✅ 実装済み
2. ~~**`st.bar_chart`**~~ - ✅ 実装済み
3. ~~**`st.dataframe`**~~ - ✅ 実装済み

### Phase 2: UX改善
4. ~~**`st.status`**~~ - ✅ 実装済み
5. **`st.dialog`** - モーダル対応
6. ~~**`st.datetime_input`**~~ - ✅ 実装済み

### Phase 3: マルチページ対応
7. **`st.navigation`** / **`st.Page`** - マルチページアプリ

---

## 実装済みAPI サマリー

kantan-uiで実装済みのStreamlit互換API: **51件**

- Input Widgets: 17件
- Data Display: 4件
- Chart Elements: 4件 (line_chart, bar_chart, area_chart, scatter_chart)
- Text Elements: 9件
- Media: 3件 (image, audio, video)
- Layout: 6件
- Chat: 2件
- Status: 8件
- Control Flow: 3件
- Configuration: 1件
- Caching & State: 2件 (cache_data, cache_resource)
- Utilities: 1件 (write_stream)

---

## 参考資料

- [Streamlit API Reference](https://docs.streamlit.io/develop/api-reference)
- [Streamlit Input Widgets](https://docs.streamlit.io/develop/api-reference/widgets)
- [Streamlit Chart Elements](https://docs.streamlit.io/develop/api-reference/charts)
- [Streamlit Layout](https://docs.streamlit.io/develop/api-reference/layout)
- [Streamlit 2025 Release Notes](https://docs.streamlit.io/develop/quick-reference/release-notes/2025)
- [Streamlit Caching](https://docs.streamlit.io/develop/api-reference/caching-and-state)
