# kantan-ui API 実装ステータスボード

> Streamlit互換APIの実装状況を看板形式で一覧化したドキュメント
> 最終更新: 2026-02-10

---

## サマリー

| 状況 | 件数 | 割合 |
|------|------|------|
| ✅ Done | 51 | 63% |
| ⚠️ Partial | 1 | 1% |
| 🔲 To Do (P1) | 4 | 5% |
| 🔲 To Do (P2) | 21 | 26% |
| 🔲 To Do (P3) | 8 | 10% |
| **合計** | **85** | |

---

## 看板ボード

### ✅ Done (51件)

<table>
<tr>
<th>Input Widgets (17)</th>
<th>Text / Output (10)</th>
<th>Data Display (4)</th>
<th>Chart (4)</th>
</tr>
<tr valign="top">
<td>

`kt.button`
`kt.slider`
`kt.text_input`
`kt.text_area`
`kt.number_input`
`kt.selectbox`
`kt.multiselect`
`kt.checkbox`
`kt.toggle`
`kt.radio`
`kt.date_input`
`kt.time_input`
`kt.datetime_input` *
`kt.color_picker`
`kt.file_uploader`
`kt.download_button`
`kt.chat_input`

</td>
<td>

`kt.write`
`kt.title`
`kt.header`
`kt.subheader`
`kt.text`
`kt.markdown`
`kt.caption`
`kt.code`
`kt.divider`
`kt.html`

</td>
<td>

`kt.table`
`kt.dataframe`
`kt.metric`
`kt.json`

</td>
<td>

`kt.line_chart`
`kt.bar_chart`
`kt.area_chart`
`kt.scatter_chart`

</td>
</tr>
</table>

<table>
<tr>
<th>Layout (7)</th>
<th>Status / Feedback (8)</th>
<th>Chat (2)</th>
<th>Form (4)</th>
</tr>
<tr valign="top">
<td>

`kt.columns`
`kt.container`
`kt.expander`
`kt.tabs`
`kt.sidebar`
`kt.status`
`kt.empty`

</td>
<td>

`kt.success`
`kt.error`
`kt.warning`
`kt.info`
`kt.progress`
`kt.spinner`
`kt.toast`
`kt.link_button`

</td>
<td>

`kt.chat_message`
`kt.chat_container`

</td>
<td>

`kt.form`
`kt.form_submit_button`
`kt.validation_error`
`kt.validation_errors`

</td>
</tr>
</table>

<table>
<tr>
<th>Media (3)</th>
<th>Cache / State (3)</th>
<th>Config / Control (2)</th>
<th>Streaming (1)</th>
</tr>
<tr valign="top">
<td>

`kt.image`
`kt.audio`
`kt.video`

</td>
<td>

`kt.cache_data`
`kt.cache_resource`
`kt.clear_all_caches`

</td>
<td>

`kt.set_page_config`
`kt.rerun`

</td>
<td>

`kt.write_stream`

</td>
</tr>
</table>

> \* `kt.datetime_input` は kantan-ui 独自API (HTML5 datetime-local)

---

### ⚠️ Partial (1件)

| API | 状況 | 備考 |
|-----|------|------|
| `kt.session_state` | ⚠️ 部分実装 | 動的アクセスは動作。型安全版 `createTypedSessionState()` を推奨 |

---

### 🔲 To Do — P1 高優先 (4件)

| API | 難易度 | カテゴリ | 実装順 | 備考 |
|-----|--------|----------|--------|------|
| `st.dialog` | Hard | Layout | 1st | HTML5 `<dialog>` 活用。独立実装可 |
| `st.navigation` | Hard | Navigation | 2nd | マルチページルーティング基盤 |
| `st.Page` | Hard | Navigation | 2nd | navigation と密結合 |
| `st.data_editor` | Very Hard | Widget | 3rd | dataframe 拡張。最高難度 |

```
実装順の依存関係:

  dialog ──────────────────────── (独立)
     │
  navigation + Page ─────────┬── switch_page (P2)
                             └── page_link  (P2)
  data_editor ───────────────┬── column_config.* (P2)
```

---

### 🔲 To Do — P2 中優先 (21件)

#### Phase A: Easy wins

| API | 難易度 | カテゴリ | 備考 |
|-----|--------|----------|------|
| `st.stop` | Easy | Control | throw で実装可能 |
| `st.exception` | Easy | Status | 既存 alert 系パターン拡張 |
| `st.logo` | Easy | Media | `kt.image` パターン流用 |

#### Phase B: 選択系ウィジェット

| API | 難易度 | カテゴリ | 備考 |
|-----|--------|----------|------|
| `st.select_slider` | Medium | Widget | `kt.slider` 拡張 |
| `st.pills` | Medium | Widget | ピル型選択 UI |
| `st.segmented_control` | Medium | Widget | pills と類似構造 |
| `st.feedback` | Medium | Widget | 星/サムズアップ評価 |

#### Phase C: レイアウト拡張 (dialog 完了後)

| API | 難易度 | カテゴリ | 備考 |
|-----|--------|----------|------|
| `st.popover` | Medium | Layout | dialog と類似パターン |

#### Phase D: ナビゲーション関連 (navigation 完了後)

| API | 難易度 | カテゴリ | 備考 |
|-----|--------|----------|------|
| `st.switch_page` | Medium | Navigation | navigation に依存 |
| `st.page_link` | Medium | Widget | navigation に依存 |

#### Phase E: プラットフォーム機能

| API | 難易度 | カテゴリ | 備考 |
|-----|--------|----------|------|
| `st.query_params` | Medium | State | URL 状態管理 |
| `st.user` | Medium | Platform | 認証・認可基盤 |

#### Phase F: コンテンツ表示

| API | 難易度 | カテゴリ | 備考 |
|-----|--------|----------|------|
| `st.latex` | Medium | Text | KaTeX 等クライアントサイド |
| `st.pdf` | Medium | Media | iframe/embed で表示 |

#### Phase G: メディア入力 (ブラウザ API 依存)

| API | 難易度 | カテゴリ | 備考 |
|-----|--------|----------|------|
| `st.camera_input` | Hard | Widget | MediaDevices API |
| `st.audio_input` | Hard | Widget | MediaRecorder API |

#### Phase H: 高度な機能

| API | 難易度 | カテゴリ | 備考 |
|-----|--------|----------|------|
| `st.column_config.*` | Hard | Data | data_editor と密結合 |
| `st.fragment` | Hard | Control | ランタイム設計変更必要 |

#### Phase I: 外部ライブラリ統合 (方針決定が先)

| API | 難易度 | カテゴリ | 備考 |
|-----|--------|----------|------|
| `st.map` | Very Hard | Chart | 地図ライブラリ依存 |
| `st.altair_chart` | Very Hard | Chart | Vega-Lite 統合 |
| `st.plotly_chart` | Very Hard | Chart | Plotly 統合 |

---

### 🔲 To Do — P3 低優先 (8件)

| API | 難易度 | カテゴリ | 備考 |
|-----|--------|----------|------|
| `st.balloons` | Easy | Status | お祝いアニメーション |
| `st.snow` | Easy | Status | 雪アニメーション |
| `st.help` | Easy | Utility | ヘルプ表示 |
| `st.echo` | Medium | Text | コード表示+実行 |
| `st.context` | Medium | Config | 実行コンテキスト情報 |
| `st.graphviz_chart` | Hard | Chart | GraphViz 統合 |
| `st.pyplot` | Very Hard | Chart | Matplotlib 統合 |
| `st.pydeck_chart` | Very Hard | Chart | PyDeck 統合 |

---

## カテゴリ別 進捗率

```
Input Widgets   ██████████████████████████░░░░  17/24  (71%)
Text / Output   ██████████████████████████████  10/11  (91%)
Data Display    █████████████████████████░░░░░   4/ 6  (67%)
Chart           ████████████░░░░░░░░░░░░░░░░░░   4/10  (40%)
Media           ██████████████████████░░░░░░░░   3/ 5  (60%)
Layout          █████████████████████████░░░░░   7/ 9  (78%)
Chat            ██████████████████████████████   2/ 2 (100%)
Status          ██████████████████████████░░░░   8/11  (73%)
Control / Form  ██████████████████████████░░░░   6/ 8  (75%)
Cache / State   ██████████████████████████░░░░   3/ 4  (75%)
Config          █████████████████░░░░░░░░░░░░░   1/ 2  (50%)
Navigation      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0/ 3  ( 0%)
Utility         █████████████████░░░░░░░░░░░░░   1/ 2  (50%)
```

---

## 難易度別 残タスク分布

| 難易度 | 件数 | API |
|--------|------|-----|
| **Easy** | 6 | stop, exception, logo, balloons, snow, help |
| **Medium** | 13 | select_slider, pills, segmented_control, feedback, popover, switch_page, page_link, query_params, user, latex, pdf, echo, context |
| **Hard** | 7 | dialog, navigation, Page, camera_input, audio_input, column_config, fragment, graphviz_chart |
| **Very Hard** | 4 | data_editor, map, altair_chart, plotly_chart, pyplot, pydeck_chart |

---

## kantan-ui 独自 API

Streamlit にはないが kantan-ui で実装済みの機能:

| API | 説明 |
|-----|------|
| `kt.datetime_input` | HTML5 datetime-local ベースの日時入力 |
| `kt.chat_container` | 自動スクロール付きチャットコンテナ |
| `kt.validation_error` / `kt.validation_errors` | フォームバリデーション表示 |
| `createTypedSessionState<T>()` | 型安全なセッション状態管理 |
| `kt.clear_all_caches` | 全キャッシュ一括クリア |

---

## 参考資料

- [Streamlit API Reference](https://docs.streamlit.io/develop/api-reference)
- [kantan-ui Streamlit API 比較](./streamlit-api-comparison.md)
