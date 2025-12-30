# Week 3 詳細実装計画

## 目標

差分更新（Diff & Patch）の実装 - `replaceRoot` から `replaceNode` への進化

## 背景

現在の実装では、Widget操作のたびにHTML全体を再生成し、`replaceRoot`で全体を置き換えています。

```typescript
// 現在の動作
const message: ServerMessage = {
  type: "patch",
  patches: [{ type: "replaceRoot", html }],  // 全体置き換え
};
```

**問題点**:
- DOM全体の再構築によるパフォーマンス低下
- フォーム入力中のフォーカス喪失
- アニメーション・トランジションの中断
- 大規模UIでのちらつき

## 前提条件

- Week 2 完了済み（Widget API + セッション管理）
- Bun ランタイム環境
- Hono v4.6.0

---

## アーキテクチャ選定

### Option A: 仮想DOM + 差分検出（自作）

```
Script実行 → VNode生成 → diff(oldVNode, newVNode) → Patches → 送信
```

**利点**: 完全な制御、最適化の余地
**欠点**: 実装コストが高い

### Option B: morphdom ライブラリ使用

```
Script実行 → HTML文字列 → morphdom(oldDOM, newHTML) → DOM更新
```

**利点**: 実績あり、クライアント側で完結
**欠点**: サーバー側での差分計算不可

### Option C: ID-based 差分 + 部分更新（推奨）

```
Script実行 → HTML生成（ID付与）→ 変更ノード検出 → replaceNode送信
```

**利点**:
- 既存のHTML生成パイプラインを維持
- シンプルな実装
- 段階的に最適化可能

---

## 採用アプローチ: Option C（ID-based差分）

### 基本方針

1. 各WidgetにユニークIDを付与（既存）
2. 前回のHTML構造をキャッシュ
3. 差分を検出して`replaceNode`パッチを生成
4. クライアントは対象ノードのみ更新

---

## ファイル構成

```
src/
├── diff/                    # 新規ディレクトリ
│   ├── index.ts             # エクスポート
│   ├── types.ts             # 差分関連の型定義
│   ├── parser.ts            # HTML → ノードツリー変換
│   ├── differ.ts            # 差分検出ロジック
│   └── patch.ts             # パッチ生成
├── websocket/
│   └── types.ts             # ReplaceNodePatch 追加
└── app.ts                   # 差分更新ロジック統合

tests/
└── unit/
    └── diff/
        ├── parser.test.ts
        ├── differ.test.ts
        └── patch.test.ts
```

---

## Step 1: 型定義

### 1.1 `src/diff/types.ts`

```typescript
// ノードツリーの型
export interface VNode {
  id: string;
  tag: string;
  attributes: Record<string, string>;
  children: (VNode | string)[];  // VNode or テキスト
  html: string;                   // このノードのHTML文字列
}

// パッチの種類
export type DiffPatch =
  | { type: "replace"; id: string; html: string }
  | { type: "remove"; id: string }
  | { type: "insert"; parentId: string; index: number; html: string }
  | { type: "updateAttr"; id: string; attr: string; value: string | null };

// 差分結果
export interface DiffResult {
  patches: DiffPatch[];
  hasChanges: boolean;
}
```

### 1.2 `src/websocket/types.ts` 更新

```typescript
// 既存
export interface ReplaceRootPatch {
  type: "replaceRoot";
  html: string;
}

// 新規追加
export interface ReplaceNodePatch {
  type: "replaceNode";
  id: string;
  html: string;
}

export interface RemoveNodePatch {
  type: "removeNode";
  id: string;
}

export interface InsertNodePatch {
  type: "insertNode";
  parentId: string;
  index: number;
  html: string;
}

export type Patch = ReplaceRootPatch | ReplaceNodePatch | RemoveNodePatch | InsertNodePatch;
```

### 成果物
- [ ] `src/diff/types.ts` 作成
- [ ] `src/websocket/types.ts` 更新

---

## Step 2: HTMLパーサー

### 2.1 `src/diff/parser.ts`

軽量なHTMLパーサーで、ID付きノードをツリー構造に変換。

```typescript
import type { VNode } from "./types";

/**
 * HTML文字列からVNodeツリーを構築
 *
 * 注意: 完全なHTMLパーサーではなく、kantan-ui生成のHTMLに特化
 */
export function parseHtml(html: string): VNode {
  // 正規表現ベースの軽量パーサー
  // id属性を持つ要素のみをノードとして抽出

  const root: VNode = {
    id: "__root__",
    tag: "div",
    attributes: {},
    children: [],
    html: html,
  };

  // id="xxx" を持つ要素を抽出
  const idPattern = /<([a-z][a-z0-9]*)\s+[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/gi;

  let match: RegExpExecArray | null;
  while ((match = idPattern.exec(html)) !== null) {
    const [fullMatch, tag, id, innerHTML] = match;
    root.children.push({
      id,
      tag,
      attributes: extractAttributes(fullMatch),
      children: [],  // 深いネストは今は無視
      html: fullMatch,
    });
  }

  return root;
}

function extractAttributes(tagHtml: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrPattern = /(\w+)="([^"]*)"/g;

  let match: RegExpExecArray | null;
  while ((match = attrPattern.exec(tagHtml)) !== null) {
    attrs[match[1]] = match[2];
  }

  return attrs;
}

/**
 * VNodeからID→HTML のマップを作成
 */
export function buildNodeMap(vnode: VNode): Map<string, string> {
  const map = new Map<string, string>();

  function traverse(node: VNode) {
    map.set(node.id, node.html);
    for (const child of node.children) {
      if (typeof child !== "string") {
        traverse(child);
      }
    }
  }

  traverse(vnode);
  return map;
}
```

### 成果物
- [ ] `src/diff/parser.ts` 作成
- [ ] パーサーのユニットテスト

---

## Step 3: 差分検出

### 3.1 `src/diff/differ.ts`

```typescript
import type { DiffPatch, DiffResult } from "./types";
import { buildNodeMap, parseHtml } from "./parser";

/**
 * 2つのHTML間の差分を検出
 */
export function diff(oldHtml: string, newHtml: string): DiffResult {
  const oldTree = parseHtml(oldHtml);
  const newTree = parseHtml(newHtml);

  const oldMap = buildNodeMap(oldTree);
  const newMap = buildNodeMap(newTree);

  const patches: DiffPatch[] = [];

  // 変更または追加されたノードを検出
  for (const [id, newNodeHtml] of newMap) {
    const oldNodeHtml = oldMap.get(id);

    if (oldNodeHtml === undefined) {
      // 新規ノード（親IDの特定が必要、簡易実装では replaceRoot にフォールバック）
      patches.push({ type: "insert", parentId: "__root__", index: -1, html: newNodeHtml });
    } else if (oldNodeHtml !== newNodeHtml) {
      // 変更されたノード
      patches.push({ type: "replace", id, html: newNodeHtml });
    }
  }

  // 削除されたノードを検出
  for (const [id] of oldMap) {
    if (!newMap.has(id) && id !== "__root__") {
      patches.push({ type: "remove", id });
    }
  }

  return {
    patches,
    hasChanges: patches.length > 0,
  };
}

/**
 * 差分パッチをWebSocketパッチ形式に変換
 */
export function toWebSocketPatches(diffResult: DiffResult, fullHtml: string): Patch[] {
  // 差分が多すぎる場合は replaceRoot にフォールバック
  const PATCH_THRESHOLD = 10;

  if (!diffResult.hasChanges) {
    return [];
  }

  if (diffResult.patches.length > PATCH_THRESHOLD) {
    return [{ type: "replaceRoot", html: fullHtml }];
  }

  return diffResult.patches.map(p => {
    switch (p.type) {
      case "replace":
        return { type: "replaceNode" as const, id: p.id, html: p.html };
      case "remove":
        return { type: "removeNode" as const, id: p.id };
      case "insert":
        return { type: "insertNode" as const, parentId: p.parentId, index: p.index, html: p.html };
      default:
        // updateAttr は後で実装
        return { type: "replaceRoot" as const, html: fullHtml };
    }
  });
}
```

### 成果物
- [ ] `src/diff/differ.ts` 作成
- [ ] 差分検出のユニットテスト

---

## Step 4: クライアント側のパッチ適用

### 4.1 `src/app.ts` クライアントスクリプト更新

```typescript
const clientScript = `
  // ... 既存のWebSocket接続コード ...

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);

    if (msg.sessionId) {
      sessionId = msg.sessionId;
      localStorage.setItem("kt-session-id", sessionId);
    }

    if (msg.type === "patch" && msg.patches) {
      for (const patch of msg.patches) {
        applyPatch(patch);
      }
    }
  };

  function applyPatch(patch) {
    switch (patch.type) {
      case "replaceRoot":
        document.getElementById("app").innerHTML = patch.html;
        break;

      case "replaceNode": {
        const el = document.getElementById(patch.id);
        if (el) {
          const temp = document.createElement("div");
          temp.innerHTML = patch.html;
          el.replaceWith(temp.firstElementChild || temp.firstChild);
        }
        break;
      }

      case "removeNode": {
        const el = document.getElementById(patch.id);
        if (el) el.remove();
        break;
      }

      case "insertNode": {
        const parent = document.getElementById(patch.parentId) || document.getElementById("app");
        if (parent) {
          const temp = document.createElement("div");
          temp.innerHTML = patch.html;
          const newEl = temp.firstElementChild || temp.firstChild;
          if (patch.index >= 0 && patch.index < parent.children.length) {
            parent.insertBefore(newEl, parent.children[patch.index]);
          } else {
            parent.appendChild(newEl);
          }
        }
        break;
      }
    }
  }
`;
```

### 成果物
- [ ] クライアントスクリプト更新
- [ ] E2Eテストで動作確認

---

## Step 5: サーバー側統合

### 5.1 セッションにHTML履歴を保持

```typescript
// src/session/types.ts 更新
export interface Session {
  id: SessionId;
  state: SessionState;
  createdAt: Date;
  lastAccessedAt: Date;
  lastHtml?: string;  // 追加: 前回のHTML
}
```

### 5.2 `src/app.ts` のrerun処理更新

```typescript
import { diff, toWebSocketPatches } from "./diff";

// onMessage内
if (data.type === "event") {
  const session = sessionManager.getSessionByWebSocket(ws);
  if (!session) return;

  // Widget更新
  if (data.widgetId && data.value !== undefined) {
    sessionManager.setState(session.id, data.widgetId, data.value);
  }

  // rerun実行
  const newHtml = rerun(script, { widgetId: data.widgetId!, value: data.value }, session.id);

  // 差分計算
  const oldHtml = session.lastHtml;
  let patches: Patch[];

  if (oldHtml) {
    const diffResult = diff(oldHtml, newHtml);
    patches = toWebSocketPatches(diffResult, newHtml);
  } else {
    patches = [{ type: "replaceRoot", html: newHtml }];
  }

  // HTML履歴を更新
  session.lastHtml = newHtml;

  // パッチ送信
  if (patches.length > 0) {
    ws.send(JSON.stringify({ type: "patch", patches }));
  }
}
```

### 成果物
- [ ] `src/session/types.ts` 更新
- [ ] `src/app.ts` 差分更新対応
- [ ] 統合テスト

---

## Step 6: エクスポートと仕上げ

### 6.1 `src/diff/index.ts`

```typescript
export { parseHtml, buildNodeMap } from "./parser";
export { diff, toWebSocketPatches } from "./differ";
export type { VNode, DiffPatch, DiffResult } from "./types";
```

### 6.2 `src/index.ts` 更新

```typescript
// Diff (optional, for advanced use)
export { diff, toWebSocketPatches } from "./diff";
export type { VNode, DiffPatch, DiffResult } from "./diff/types";
```

### 成果物
- [ ] エクスポート整理
- [ ] 全テスト確認

---

## 実装順序（推奨）

```
Day 1: Step 1 + Step 2
       ├── 型定義
       └── HTMLパーサー

Day 2: Step 3
       └── 差分検出ロジック

Day 3: Step 4
       └── クライアント側パッチ適用

Day 4: Step 5
       └── サーバー側統合

Day 5: Step 6 + テスト
       ├── エクスポート整理
       └── E2Eテスト

Day 6: バグ修正 + パフォーマンス計測
       └── 最終確認
```

---

## 完了基準

### 機能要件
- [ ] ID付きノードの差分検出が動作する
- [ ] `replaceNode` パッチで部分更新できる
- [ ] 差分が多い場合は `replaceRoot` にフォールバック
- [ ] フォーム入力中のフォーカスが維持される

### 非機能要件
- [ ] ユニットテストがパスする
- [ ] E2Eテストがパスする
- [ ] lint エラーがない
- [ ] ビルドが成功する

### パフォーマンス目標
- [ ] Widget操作のレスポンス時間が改善（計測）
- [ ] 大規模UI（100+ Widget）でもスムーズに動作

---

## 次のステップ（Week 4 への橋渡し）

Week 3 完了後:

1. **レイアウトシステム**: `kt.columns()`, `kt.sidebar()` など
2. **データ表示Widget**: `kt.dataframe()`, `kt.chart()`
3. **ファイルアップロード**: `kt.file_uploader()`

---

*作成日: 2025-12-30*
*対象バージョン: kantan-ui v0.0.2*
