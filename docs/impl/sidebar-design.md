# kt.sidebar 設計書

作成日: 2026-01-07
更新日: 2026-01-08

## 実装状況

| 機能 | 状態 |
|------|------|
| 基本機能（コールバック形式） | ✅ 実装済み |
| オブジェクト形式API | ✅ 実装済み |
| CSS スタイル | ✅ 実装済み |
| トグル機能 | ✅ 実装済み |
| レスポンシブ対応（CSS） | ✅ 実装済み |
| レスポンシブE2Eテスト | ✅ 実装済み |
| サイドバー差分更新 | ✅ 実装済み |
| width設定 | ✅ 実装済み |

---

## 概要

Streamlit の `st.sidebar` に相当する機能。サイドバーは画面左側に固定表示されるパネルで、ナビゲーション、フィルター、設定などの補助的なUIを配置するために使用される。

---

## 使用例

### 基本的な使い方

```typescript
import { kt, createApp, createTypedSessionState } from "kantan-ui";

const state = createTypedSessionState({
  theme: "light",
  fontSize: 14,
});

const script = () => {
  // サイドバー
  kt.sidebar(() => {
    kt.title("⚙️ Settings");

    state.theme = kt.selectbox("Theme", ["light", "dark"], {
      defaultValue: state.theme,
    });

    state.fontSize = kt.slider("Font Size", 10, 24, state.fontSize);
  });

  // メインコンテンツ
  kt.title("My Application");
  kt.write(`Current theme: ${state.theme}`);
};

export default await createApp(script);
```

---

## 実装コミット履歴

- `87ef8eb` feat(kt): add dual buffer support to RenderContext for sidebar
- `e1c0967` feat(kt): add kt.sidebar() callback-style API
- `11ad630` feat(styles): add sidebar CSS styles
- `34e4527` feat(app): integrate sidebar HTML layout in initial render
- `a268314` feat(client): add sidebar toggle functionality
- `f1775ff` test(e2e): add sidebar E2E tests
- `87e8f34` refactor(sidebar): prevent duplicate event listener registration
- `3058cee` refactor(sidebar): convert magic numbers to CSS variables
- `25c021a` refactor(sidebar): remove unused SidebarConfig interface and _config parameter

---

## 今後の改善計画

### 1. サイドバー差分更新（優先度: 中）

現在はサイドバー内容変更時に全置換される。メインエリアと同様に差分アルゴリズムを適用することで、パフォーマンス向上とフォーカス維持が可能。

**設計:**
```typescript
// toWebSocketPatches に rootId パラメータを追加
const sidebarPatches = toWebSocketPatches(
  sidebarDiffResult,
  sidebarContentHtml,
  "kt-sidebar-content"  // ルートIDを指定
);
```

### 2. レスポンシブE2Eテスト（優先度: 高）

モバイルビューポートでのサイドバー動作をE2Eテストで検証する。

**テストケース:**
- モバイル（375px）でのfixed positioning
- オーバーレイ表示・クリック動作
- タブレット境界値（768px）
- デスクトップでのrelative positioning

### 3. width設定実装（優先度: 低）

`SidebarConfig.width` でサイドバー幅をカスタマイズ可能にする。

**設計:**
```typescript
kt.sidebar(() => {
  kt.write("Wide sidebar");
}, { width: "350px" });
```

CSS変数を使用して動的に幅を設定:
```css
.kt-sidebar {
  width: var(--kt-sidebar-width, 280px);
}
```

### 4. ネスト呼び出しドキュメント（優先度: 高）

`kt.sidebar()` のネスト呼び出し時の挙動をドキュメント化する。

**現在の挙動:**
```typescript
kt.sidebar(() => {
  kt.write("Outer");
  kt.sidebar(() => {
    kt.write("Inner"); // サイドバーに出力される
  });
});
```

内側の `kt.sidebar()` も同じサイドバーバッファに出力される。`try/finally` により例外発生時もターゲットは正しく復元される。

---

## アーキテクチャ

### RenderContext デュアルバッファ

```typescript
export class RenderContext {
  private mainBuffer: string[] = [];
  private sidebarBuffer: string[] = [];
  private currentTarget: RenderTarget = "main";

  setTarget(target: RenderTarget): void {
    this.currentTarget = target;
  }

  append(html: string): void {
    if (this.currentTarget === "sidebar") {
      this.sidebarBuffer.push(html);
    } else {
      this.mainBuffer.push(html);
    }
  }
}
```

### kt.sidebar() 実装

```typescript
export function sidebar(content: () => void): void {
  const ctx = requireRenderContext();
  const previousTarget = ctx.getTarget();
  ctx.setTarget("sidebar");

  try {
    content();
  } finally {
    ctx.setTarget(previousTarget);
  }
}
```

---

## 関連ファイル

- `src/kt/layout.ts` - sidebar() 関数
- `src/kt/context.ts` - RenderContext デュアルバッファ
- `src/styles/sidebar.ts` - サイドバースタイル
- `src/client/script.ts` - トグル処理
- `e2e/layout.spec.ts` - サイドバーE2Eテスト

---

## 参考

- [Streamlit st.sidebar](https://docs.streamlit.io/develop/api-reference/layout/st.sidebar)
