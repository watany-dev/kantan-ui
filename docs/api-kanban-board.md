# kantan-ui API 実装状況 看板ボード

> Streamlit API との比較に基づく実装ステータスの可視化。
> 詳細は [streamlit-api-comparison.md](./streamlit-api-comparison.md) を参照。

## 看板ボード

```mermaid
---
config:
  kanban:
    ticketBaseUrl: 'https://docs.streamlit.io/develop/api-reference/#TICKET#'
---
kanban
  done[✅ 実装済み 51件]
    input[Input Widgets 17件]@{ priority: 'Very High' }
    data[Data Display 4件]@{ priority: 'Very High' }
    chart[Chart Elements 4件]@{ priority: 'Very High' }
    text[Text Elements 10件]@{ priority: 'Very High' }
    media[Media 3件]@{ priority: 'Very High' }
    layout[Layout 6件]@{ priority: 'Very High' }
    chat[Chat 2件]@{ priority: 'Very High' }
    status[Status 8件]@{ priority: 'Very High' }
    control[Control Flow 3件]@{ priority: 'Very High' }
    cacheState[Cache / State 3件]@{ priority: 'Very High' }
    util[Utilities 2件]@{ priority: 'Very High' }
  partial[⚠️ 部分実装]
    sessionState[session_state 型付き版推奨]@{ priority: 'High' }
  p1[🔴 P1 高優先度]
    dialog[kt.dialog モーダルダイアログ]@{ priority: 'Very High' }
    nav[kt.navigation マルチページナビ]@{ priority: 'Very High' }
    page[kt.Page ページ定義]@{ priority: 'Very High' }
    switchPage[kt.switch_page ページ切替]@{ priority: 'High' }
    dataEditor[kt.data_editor データ編集]@{ priority: 'Very High' }
  p2easy[🟡 P2 Easy]
    stop[kt.stop スクリプト停止]@{ priority: 'Low' }
    exception[kt.exception 例外表示]@{ priority: 'Low' }
    logo[kt.logo ロゴ表示]@{ priority: 'Low' }
  p2medium[🟡 P2 Medium]
    selectSlider[kt.select_slider 選択スライダー]@{ priority: 'Low' }
    pills[kt.pills ピル選択]@{ priority: 'Low' }
    segmented[kt.segmented_control セグメントコントロール]@{ priority: 'Low' }
    feedback[kt.feedback フィードバック入力]@{ priority: 'Low' }
    popover[kt.popover ポップオーバー]@{ priority: 'Low' }
    pageLink[kt.page_link ページリンク]@{ priority: 'Low' }
    queryParams[kt.query_params クエリパラメータ]@{ priority: 'Low' }
    user[kt.user ユーザー情報]@{ priority: 'Low' }
    latex[kt.latex LaTeX数式]@{ priority: 'Low' }
    pdf[kt.pdf PDF表示]@{ priority: 'Low' }
  p2hard[🟡 P2 Hard]
    cameraInput[kt.camera_input カメラ入力]@{ priority: 'High' }
    audioInput[kt.audio_input 音声入力]@{ priority: 'High' }
    columnConfig[kt.column_config カラム設定]@{ priority: 'High' }
    fragment[kt.fragment 部分再実行]@{ priority: 'High' }
    map[kt.map 地図表示]@{ priority: 'Very High' }
    altairChart[kt.altair_chart Altair統合]@{ priority: 'Very High' }
    plotlyChart[kt.plotly_chart Plotly統合]@{ priority: 'Very High' }
  p3[🔵 P3 低優先度]
    pyplot[kt.pyplot Matplotlib統合]@{ priority: 'Very Low' }
    pydeckChart[kt.pydeck_chart PyDeck統合]@{ priority: 'Very Low' }
    graphvizChart[kt.graphviz_chart GraphViz統合]@{ priority: 'Very Low' }
    echo[kt.echo コード表示+実行]@{ priority: 'Very Low' }
    balloons[kt.balloons バルーンアニメ]@{ priority: 'Very Low' }
    snow[kt.snow 雪アニメ]@{ priority: 'Very Low' }
    help[kt.help ヘルプ表示]@{ priority: 'Very Low' }
    context[kt.context 実行コンテキスト]@{ priority: 'Very Low' }
```

## 実装済み API 詳細

### Input Widgets (17件)

```mermaid
kanban
  implemented[✅ 実装済み]
    btn[kt.button]
    dlBtn[kt.download_button]
    linkBtn[kt.link_button]
    chk[kt.checkbox]
    rad[kt.radio]
    sel[kt.selectbox]
    multi[kt.multiselect]
    tog[kt.toggle]
    sld[kt.slider]
    num[kt.number_input]
    txtIn[kt.text_input]
    txtArea[kt.text_area]
    dateIn[kt.date_input]
    timeIn[kt.time_input]
    dtIn[kt.datetime_input 独自API]
    fileUp[kt.file_uploader]
    color[kt.color_picker]
  notyet[❌ 未実装]
    chatIn[kt.chat_input ✅ Chat欄で実装済み]
    selSlider[kt.select_slider P2]
    pills2[kt.pills P2]
    segCtrl[kt.segmented_control P2]
    fb[kt.feedback P2]
    dataEd[kt.data_editor P1]
    camIn[kt.camera_input P2]
    audIn[kt.audio_input P2]
```

### Data Display / Charts (8件 実装済み)

```mermaid
kanban
  dataImpl[✅ Data Display]
    df[kt.dataframe ソート・検索・行選択]
    tbl[kt.table 複数フォーマット対応]
    met[kt.metric KPI表示 delta対応]
    js[kt.json 折りたたみ対応]
  chartImpl[✅ Charts SVGベース]
    line[kt.line_chart 複数シリーズ]
    bar[kt.bar_chart グループ/積み上げ/横向き]
    area[kt.area_chart 積み上げ対応]
    scatter[kt.scatter_chart バブル対応]
  chartNotyet[❌ Charts 未実装]
    mp[kt.map P2 Very Hard]
    alt[kt.altair_chart P2 Very Hard]
    plot[kt.plotly_chart P2 Very Hard]
    py[kt.pyplot P3 Very Hard]
    pdk[kt.pydeck_chart P3 Very Hard]
    gv[kt.graphviz_chart P3 Hard]
```

### Text / Media / Layout (19件 実装済み)

```mermaid
kanban
  textImpl[✅ Text 10件]
    wr[kt.write Markdown・オブジェクト対応]
    ti[kt.title H1]
    hd[kt.header H2]
    sh[kt.subheader H3]
    tx[kt.text 固定幅]
    md[kt.markdown]
    cp[kt.caption]
    cd[kt.code シンタックスハイライト]
    dv[kt.divider]
    ht[kt.html]
  mediaImpl[✅ Media 3件]
    img[kt.image キャプション対応]
    aud[kt.audio URL・data URI・バイナリ]
    vid[kt.video ポスター・字幕・時間範囲]
  layoutImpl[✅ Layout 6件]
    col[kt.columns 比率指定対応]
    cnt[kt.container]
    exp[kt.expander 折りたたみ]
    tab[kt.tabs]
    side[kt.sidebar デュアルAPI]
    emp[kt.empty プレースホルダー]
```

### Status / Control / Cache (16件 実装済み)

```mermaid
kanban
  statusImpl[✅ Status 8件]
    prog[kt.progress]
    spin[kt.spinner]
    toast[kt.toast]
    succ[kt.success]
    err[kt.error]
    warn[kt.warning]
    info[kt.info]
    stat[kt.status 状態管理付き]
  controlImpl[✅ Control Flow 3件]
    form[kt.form]
    frmBtn[kt.form_submit_button]
    rerun[kt.rerun]
  cacheImpl[✅ Cache / State / Utilities]
    cData[kt.cache_data TTL・LRU]
    cRes[kt.cache_resource シングルトン]
    clr[kt.clear_all_caches]
    sess[session_state 型安全版あり]
    ws[kt.write_stream ストリーミング]
    spc[kt.set_page_config]
```

## P1 推奨実装順序

```mermaid
kanban
  step1[Step 1: 独立実装可能]
    d1[kt.dialog HTML dialog要素活用]@{ priority: 'Very High' }
  step2[Step 2: 基盤構築]
    n1[kt.navigation ルーティング管理]@{ priority: 'Very High' }
    p1[kt.Page ページ定義]@{ priority: 'Very High' }
  step3[Step 3: ナビ依存]
    sw1[kt.switch_page プログラム的切替]@{ priority: 'High' }
  step4[Step 4: 最高難度]
    de1[kt.data_editor セル編集・行追加削除]@{ priority: 'Very High' }
```

## サマリー

| カテゴリ | 実装済み | 未実装 | カバー率 |
|---------|---------|--------|---------|
| Input Widgets | 17 | 8 | 68% |
| Data Display | 4 | 1 | 80% |
| Charts | 4 | 6 | 40% |
| Text Elements | 10 | 2 | 83% |
| Media | 3 | 2 | 60% |
| Layout | 6 | 3 | 67% |
| Chat | 2 | 0 | 100% |
| Status | 8 | 3 | 73% |
| Control Flow | 3 | 2 | 60% |
| Navigation | 0 | 3 | 0% |
| Cache & State | 3 | 1 | 75% |
| Configuration | 1 | 2 | 33% |
| Utilities | 1 | 1 | 50% |
| **合計** | **51** | **29** | **64%** |

## 参考

- [Mermaid Kanban Diagram](https://mermaid.js.org/syntax/kanban.html)
- [Streamlit API Reference](https://docs.streamlit.io/develop/api-reference)
- [streamlit-api-comparison.md](./streamlit-api-comparison.md)
