# Streamlit API拡張計画（Phase 3-B）

作成日: 2025-01-06

## 概要

Streamlitチュートリアル相当の機能を実現するため、不足しているAPIを段階的に実装する。
本計画はPhase 3-A（Week5）の完了を前提とし、Week6以降の実装に先立つ中間フェーズとして位置づける。

---

## 現状の実装済みAPI（35個）

| カテゴリ | 実装済み |
|---------|---------|
| 出力 | write, title, header, subheader, text, divider, html |
| アラート | success, error, warning, info |
| フィードバック | progress, spinner, toast |
| データ | table |
| レイアウト | container, columns, expander, tabs |
| フォーム | form, form_submit_button |
| 入力ウィジェット | text_input, text_area, number_input, slider |
| 選択ウィジェット | button, checkbox, toggle, radio, selectbox, multiselect |
| その他 | download_button, rerun, set_page_config |

---

## 不足API一覧と実装計画

### Iteration 1: 出力系拡張（易）

**目標**: テキスト表示機能の強化

| API | 難易度 | 工数 | 実装内容 |
|-----|--------|------|----------|
| markdown | ⭐ 易 | 0.5日 | marked.js統合、XSSサニタイズ |
| code | ⭐ 易 | 0.5日 | highlight.js統合、言語自動検出 |
| json | ⭐ 易 | 0.5日 | 折りたたみ可能なJSONビューア |

**実装パターン**: 既存の`kt.html()`を拡張

```typescript
// kt.markdown() の実装イメージ
export function markdown(content: string): void {
  const ctx = getRenderContext();
  const html = marked.parse(content, { sanitize: true });
  ctx.append(`<div class="kt-markdown">${html}</div>`);
}
```

**成果物**:
- [ ] `src/kt/output.ts` に markdown, code, json 追加
- [ ] 外部ライブラリ選定（marked, highlight.js or 軽量代替）
- [ ] ユニットテスト
- [ ] XSSテスト

---

### Iteration 2: メディア表示（易）

**目標**: 画像・音声・動画の表示

| API | 難易度 | 工数 | 実装内容 |
|-----|--------|------|----------|
| image | ⭐ 易 | 0.5日 | URL/Base64/ArrayBuffer対応 |
| audio | ⭐ 易 | 0.5日 | `<audio>`タグ生成 |
| video | ⭐ 易 | 0.5日 | `<video>`タグ生成 |

**実装パターン**: HTMLタグ生成のみ

```typescript
// kt.image() の実装イメージ
interface ImageConfig {
  caption?: string;
  width?: number | string;
  use_column_width?: boolean;
}

export function image(
  src: string | ArrayBuffer,
  config?: ImageConfig
): void {
  const ctx = getRenderContext();
  const dataUrl = typeof src === "string"
    ? src
    : `data:image/png;base64,${arrayBufferToBase64(src)}`;

  const style = config?.width ? `width: ${config.width}` : "";
  ctx.append(`
    <figure class="kt-image">
      <img src="${escapeHtml(dataUrl)}" style="${style}" />
      ${config?.caption ? `<figcaption>${escapeHtml(config.caption)}</figcaption>` : ""}
    </figure>
  `);
}
```

**成果物**:
- [ ] `src/kt/media.ts` 新規作成
- [ ] `src/kt/index.ts` にエクスポート追加
- [ ] ユニットテスト

---

### Iteration 3: メトリクス表示（易）

**目標**: KPI・数値指標の表示

| API | 難易度 | 工数 | 実装内容 |
|-----|--------|------|----------|
| metric | ⭐ 易 | 0.5日 | 値・デルタ・ラベル表示 |

**Streamlit互換API**:
```typescript
kt.metric("Temperature", "70 °F", "1.2 °F");
kt.metric("Revenue", "$1.2M", "-$0.1M", delta_color: "inverse");
```

**実装パターン**: HTML/CSSのみ

```typescript
interface MetricConfig {
  delta_color?: "normal" | "inverse" | "off";
  help?: string;
}

export function metric(
  label: string,
  value: string | number,
  delta?: string | number,
  config?: MetricConfig
): void {
  const ctx = getRenderContext();
  const deltaClass = getDeltaClass(delta, config?.delta_color);

  ctx.append(`
    <div class="kt-metric">
      <label>${escapeHtml(label)}</label>
      <div class="kt-metric-value">${escapeHtml(String(value))}</div>
      ${delta !== undefined ? `<div class="kt-metric-delta ${deltaClass}">${escapeHtml(String(delta))}</div>` : ""}
    </div>
  `);
}
```

**成果物**:
- [ ] `src/kt/data.ts` に metric 追加
- [ ] CSSスタイル定義
- [ ] ユニットテスト

---

### Iteration 4: チャート基盤（中）

**目標**: データ可視化の基盤構築

| API | 難易度 | 工数 | 実装内容 |
|-----|--------|------|----------|
| line_chart | ⭐⭐ 中 | 1.5日 | Chart.js or 軽量SVG実装 |
| bar_chart | ⭐⭐ 中 | 0.5日 | line_chart基盤を流用 |
| area_chart | ⭐⭐ 中 | 0.5日 | line_chart基盤を流用 |

**ライブラリ選定**:

| Option | サイズ | 特徴 |
|--------|--------|------|
| Chart.js | ~60KB | 高機能、広く使われている |
| uPlot | ~30KB | 高速、軽量 |
| 自作SVG | 0KB | 最小依存、カスタマイズ自由 |

**推奨**: uPlot（軽量かつ十分な機能）

```typescript
interface ChartData {
  [column: string]: number[];
}

export function line_chart(
  data: ChartData | number[][],
  config?: ChartConfig
): void {
  const ctx = getRenderContext();
  const chartId = `chart-${generateId()}`;
  const normalized = normalizeChartData(data);

  ctx.append(`
    <div class="kt-chart" id="${chartId}">
      <canvas></canvas>
    </div>
    <script>
      window.__ktCharts = window.__ktCharts || {};
      window.__ktCharts["${chartId}"] = ${JSON.stringify(normalized)};
    </script>
  `);
}
```

**成果物**:
- [ ] `src/kt/charts.ts` 新規作成
- [ ] チャートライブラリ統合
- [ ] クライアント側レンダリングロジック
- [ ] ユニットテスト
- [ ] E2Eテスト（描画確認）

---

### Iteration 5: 日付・時刻入力（中）

**目標**: 日付・時刻入力ウィジェット

| API | 難易度 | 工数 | 実装内容 |
|-----|--------|------|----------|
| date_input | ⭐⭐ 中 | 1日 | `<input type="date">` + 状態管理 |
| time_input | ⭐⭐ 中 | 0.5日 | `<input type="time">` + 状態管理 |
| color_picker | ⭐ 易 | 0.5日 | `<input type="color">` + 状態管理 |

**実装パターン**: 既存ウィジェットパターンを踏襲

```typescript
// kt.date_input() の実装イメージ
interface DateInputConfig {
  key?: string;
  min?: Date;
  max?: Date;
  disabled?: boolean;
}

export function date_input(
  label: string,
  defaultValue?: Date,
  config?: DateInputConfig
): Date {
  const widgetId = config?.key ?? `widget_${getNextWidgetId()}`;
  const sessionId = getCurrentSessionId();

  // 状態の初期化・取得
  const storedValue = getWidgetState(sessionId, widgetId);
  const value = storedValue !== undefined
    ? new Date(storedValue as string)
    : defaultValue ?? new Date();

  // HTML生成
  const ctx = getRenderContext();
  ctx.append(renderDateInput(widgetId, label, value, config));

  return value;
}
```

**成果物**:
- [ ] `src/widgets/date-input.ts` 新規作成
- [ ] `src/widgets/time-input.ts` 新規作成
- [ ] `src/widgets/color-picker.ts` 新規作成
- [ ] クライアント側イベントハンドラ追加
- [ ] ユニットテスト

---

### Iteration 6: データフレーム拡張（中）

**目標**: インタラクティブなデータ表示

| API | 難易度 | 工数 | 実装内容 |
|-----|--------|------|----------|
| dataframe | ⭐⭐ 中 | 1.5日 | table拡張、ソート・フィルタ |

**既存tableとの差分**:

| 機能 | table | dataframe |
|------|-------|-----------|
| 基本表示 | ✓ | ✓ |
| ソート | - | ✓ |
| フィルタ | - | ✓ |
| ページング | - | ✓ |
| 列幅調整 | - | ✓ |
| 行選択 | - | ✓ |

**実装方針**:
- 既存`table`のHTML構造を拡張
- クライアント側でソート・フィルタロジック実装
- サーバー状態は持たない（クライアント完結）

**成果物**:
- [ ] `src/kt/data.ts` に dataframe 追加
- [ ] クライアント側インタラクションロジック
- [ ] CSSスタイル
- [ ] ユニットテスト

---

### Iteration 7: ファイルアップロード（難）

**目標**: ファイル入力機能

| API | 難易度 | 工数 | 実装内容 |
|-----|--------|------|----------|
| file_uploader | ⭐⭐⭐ 難 | 2.5日 | マルチパート処理、メモリ管理 |

**実装上の課題**:

1. **ファイルサイズ制限**: デフォルト200MB、設定可能に
2. **メモリ管理**: 大容量ファイルのストリーミング処理
3. **セキュリティ**: ファイル拡張子・MIMEタイプ検証
4. **一時ファイル**: アップロード後の自動クリーンアップ

```typescript
interface FileUploaderConfig {
  key?: string;
  type?: string | string[];  // 許可する拡張子
  accept_multiple_files?: boolean;
  max_size?: number;  // バイト
}

interface UploadedFile {
  name: string;
  type: string;
  size: number;
  getBytes(): ArrayBuffer;
  getText(): string;
}

export function file_uploader(
  label: string,
  config?: FileUploaderConfig
): UploadedFile | UploadedFile[] | null {
  // WebSocket経由でバイナリ受信
  // 一時ストレージに保存
  // UploadedFileオブジェクトを返却
}
```

**WebSocket拡張**:
```typescript
// 新しいメッセージタイプ
type ClientMessage =
  | { type: "event"; widgetId: string; value: unknown }
  | { type: "file_upload"; widgetId: string; filename: string; data: ArrayBuffer };  // NEW
```

**成果物**:
- [ ] `src/widgets/file-uploader.ts` 新規作成
- [ ] WebSocketバイナリハンドラ
- [ ] 一時ファイル管理
- [ ] ファイルサイズ制限
- [ ] セキュリティバリデーション
- [ ] ユニットテスト
- [ ] E2Eテスト

---

### Iteration 8: サイドバー（難）

**目標**: Streamlit最重要レイアウト機能

| API | 難易度 | 工数 | 実装内容 |
|-----|--------|------|----------|
| sidebar | ⭐⭐⭐ 難 | 2.5日 | デュアルRenderContext、レイアウト変更 |

**アーキテクチャ変更**:

現状:
```
RenderContext (単一)
    └── append() → HTML蓄積
```

変更後:
```
RenderContext
    ├── main: HTMLBuffer
    ├── sidebar: HTMLBuffer
    └── append(target?: "main" | "sidebar")
```

**kt.sidebar実装**:

```typescript
// Proxyパターンでkt.*をsidebar版にラップ
export const sidebar = new Proxy({} as typeof kt, {
  get(_target, prop: string) {
    const original = (kt as Record<string, unknown>)[prop];
    if (typeof original !== "function") return original;

    return (...args: unknown[]) => {
      const ctx = getRenderContext();
      ctx.setTarget("sidebar");
      try {
        return (original as Function)(...args);
      } finally {
        ctx.setTarget("main");
      }
    };
  },
});

// 使用例
kt.sidebar.title("Settings");
kt.sidebar.slider("Value", 0, 100, 50);
```

**HTMLテンプレート変更**:
```html
<body>
  <aside id="kt-sidebar" class="kt-sidebar">
    <!-- sidebar content -->
  </aside>
  <main id="kt-main" class="kt-main">
    <!-- main content -->
  </main>
</body>
```

**WebSocket差分更新**:
```typescript
type Patch =
  | { type: "replaceRoot"; html: string; target?: "main" | "sidebar" }
  | { type: "streamAppend"; html: string; target?: "main" | "sidebar" }
  // ...
```

**成果物**:
- [ ] `src/kt/context.ts` デュアルバッファ対応
- [ ] `src/kt/sidebar.ts` 新規作成
- [ ] HTMLテンプレート更新
- [ ] CSSレイアウト（レスポンシブ）
- [ ] クライアント側DOM更新ロジック
- [ ] WebSocketパッチ拡張
- [ ] ユニットテスト
- [ ] E2Eテスト

---

## 実装スケジュール

```
Iteration 1 (0.5日): markdown, code, json        ← 出力系
Iteration 2 (0.5日): image, audio, video         ← メディア
Iteration 3 (0.5日): metric                      ← メトリクス
Iteration 4 (2.5日): line_chart, bar_chart       ← チャート
Iteration 5 (2.0日): date_input, time_input      ← 日付系入力
Iteration 6 (1.5日): dataframe                   ← データ表示
Iteration 7 (2.5日): file_uploader               ← ファイル入力
Iteration 8 (2.5日): sidebar                     ← レイアウト
─────────────────────────────────────────────────
合計: 約12.5日
```

---

## 優先度マトリクス

```
                    難易度
            易          中          難
        ┌───────────┬───────────┬───────────┐
   高   │ markdown  │ line_chart│ sidebar   │
優      │ image     │ dataframe │           │
先      ├───────────┼───────────┼───────────┤
度 中   │ code      │ date_input│file_uploader│
        │ metric    │ time_input│           │
        ├───────────┼───────────┼───────────┤
   低   │ json      │ bar_chart │           │
        │ audio     │ area_chart│           │
        │ video     │           │           │
        └───────────┴───────────┴───────────┘
```

**推奨順序**: 左上から右下へ（易×高 → 難×高 → 易×中 → ...）

---

## リスクと対策

| リスク | 影響 | 対策 |
|--------|------|------|
| チャートライブラリのサイズ | バンドルサイズ増加 | 遅延ロード、Tree shaking |
| サイドバーのアーキ変更 | 既存コード影響 | 段階的移行、フィーチャーフラグ |
| file_uploaderのメモリ | 大容量ファイルでOOM | ストリーミング処理、サイズ制限 |
| ブラウザ間差異 | date_input等の表示差 | Polyfill or カスタムUI |

---

## 完了基準

- [ ] 全ユニットテストパス
- [ ] 全E2Eテストパス
- [ ] `bun run ci` 成功
- [ ] Streamlitチュートリアル相当のサンプルが動作
- [ ] APIドキュメント更新

---

## 参考リンク

- [Streamlit API Reference](https://docs.streamlit.io/develop/api-reference)
- [Streamlit Cheat Sheet](https://docs.streamlit.io/develop/quick-reference/cheat-sheet)

---

*対象バージョン: kantan-ui v0.2.0*
