# Week4 詳細実装計画

作成日: 2026-01-02

## 概要

Week4は「ストリーミング更新 + Abort + 直列化」をテーマに、リアルタイムUI更新の堅牢性を高める。

---

## 前提条件（Week3完了状態）

- [x] diff統合の有効化（`src/app.ts:419-421`）
- [x] フォーカス維持テスト作成（`e2e/focus-preservation.spec.ts`）
- [x] グローバル状態の設計ノート追加（`src/runtime/rerun.ts:13-31`）
- [x] WSContext問題の解決（sessionIdベース管理を正式採用）

---

## タスク一覧

| # | タスク | 優先度 | 工数 | 依存 |
|---|--------|--------|------|------|
| 1 | フォーカス維持機能の強化 | 🔴 高 | 中 | - |
| 2 | 同一セッション直列化 | 🔴 高 | 中 | - |
| 3 | Abort機能 | 🟡 中 | 中 | #2 |
| 4 | ストリーミング更新 | 🟡 中 | 大 | #2, #3 |
| 5 | E2Eテスト安定化 | 🟡 中 | 小 | #1 |

---

## 1. フォーカス維持機能の強化 🔴 高優先度

### 現状の問題

`e2e/focus-preservation.spec.ts`で確認済み:
- `replaceRoot`/`replaceNode` パッチ適用後にフォーカスが失われる
- スライダー操作後にフォーカスが失われる
- text_inputテストがスキップ状態

### 現在の実装

`src/app.ts:84-111` でフォーカス保存・復元を実装済みだが、不完全:

```typescript
// saveFocusState() - IDベースでフォーカスを保存
// restoreFocusState() - requestAnimationFrameで復元
```

### 改善点

#### 1.1 フォーカス復元タイミングの最適化

```typescript
// 現在: requestAnimationFrame
requestAnimationFrame(() => restoreFocusState(focusState));

// 改善案: MutationObserverで確実に復元
function applyPatchWithFocusRestore(patches, focusState) {
  for (const patch of patches) {
    applyPatch(patch);
  }
  // 同期的に復元を試みる
  restoreFocusState(focusState);
  // バックアップとしてrAFも使用
  requestAnimationFrame(() => restoreFocusState(focusState));
}
```

#### 1.2 スクロール位置の保存・復元

```typescript
function saveFocusState() {
  const active = document.activeElement;
  if (!active || active === document.body) {
    return { scrollTop: window.scrollY, scrollLeft: window.scrollX };
  }
  return {
    id: active.id,
    selectionStart: active.selectionStart,
    selectionEnd: active.selectionEnd,
    scrollTop: window.scrollY,
    scrollLeft: window.scrollX,
  };
}

function restoreFocusState(state) {
  // ... フォーカス復元 ...
  // スクロール位置も復元
  if (state.scrollTop !== undefined) {
    window.scrollTo(state.scrollLeft, state.scrollTop);
  }
}
```

#### 1.3 IDなし要素への対応検討

現在IDがない要素はフォーカス復元できない。対応案:

- **案A**: data属性でフォーカス可能要素にマーカーを付与
- **案B**: DOM位置（XPath風）でフォーカスを特定
- **案C**: IDがない場合はreplaceRootを避ける（replaceNode優先）

**推奨**: 案Cを基本とし、kt.* APIで生成される要素には常にIDを付与

### 成果物

- [ ] `src/app.ts` のフォーカス復元ロジック改善
- [ ] `src/app.ts` のスクロール位置保存・復元
- [ ] `e2e/focus-preservation.spec.ts` の全テストパス

---

## 2. 同一セッション直列化 🔴 高優先度

### 目的

同一セッションからの複数イベントが順序通りに処理されることを保証する。

### 現状

```typescript
// src/app.ts:376-
onMessage: (event, ws) => {
  // イベントを即座に処理
  // 複数イベントが同時に来ると順序が保証されない
}
```

### 実装

#### 2.1 イベントキューの導入

```typescript
// src/session/types.ts に追加
export interface Session {
  id: SessionId;
  state: SessionState;
  lastHtml?: string;
  ws?: WSContext;
  // 新規追加
  eventQueue: EventQueueItem[];
  isProcessing: boolean;
}

interface EventQueueItem {
  widgetId: string;
  value: unknown;
  timestamp: number;
}
```

#### 2.2 SessionManagerの拡張

```typescript
// src/session/manager.ts に追加
export class SessionManager {
  // 既存メソッド...

  queueEvent(sessionId: SessionId, event: EventQueueItem): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.eventQueue.push(event);
    this.processEventQueue(sessionId);
  }

  private async processEventQueue(sessionId: SessionId): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.isProcessing) return;

    session.isProcessing = true;
    try {
      while (session.eventQueue.length > 0) {
        const event = session.eventQueue.shift()!;
        await this.processEvent(sessionId, event);
      }
    } finally {
      session.isProcessing = false;
    }
  }
}
```

#### 2.3 app.tsの修正

```typescript
// onMessageハンドラ
} else if (data.type === "event") {
  // イベントをキューに追加
  sessionManager.queueEvent(session.id, {
    widgetId: data.widgetId,
    value: data.value,
    timestamp: Date.now(),
  });
  // 処理完了後にパッチを送信（コールバック経由）
}
```

### テスト

```typescript
// tests/session/queue.test.ts
describe("Event Queue", () => {
  it("should process events in order", async () => {
    // 3つのイベントを連続で送信
    // 順序通りに処理されることを確認
  });

  it("should not process events concurrently", async () => {
    // 処理中に新しいイベントが来てもキューに追加される
  });
});
```

### 成果物

- [ ] `src/session/types.ts` にEventQueue型追加
- [ ] `src/session/manager.ts` にキュー処理メソッド追加
- [ ] `src/app.ts` でイベントキュー使用
- [ ] `tests/session/queue.test.ts` 作成

---

## 3. Abort機能 🟡 中優先度

### 目的

新しいイベント受信時に、前回のrerun処理を中断する。

### 前提

現在のrerun()は同期処理のため、Abortの必要性は低い。
将来の非同期スクリプト対応のための準備。

### 実装

#### 3.1 AbortControllerの導入

```typescript
// src/session/types.ts
export interface Session {
  // 既存フィールド...
  currentAbortController?: AbortController;
}
```

#### 3.2 rerun関数の拡張

```typescript
// src/runtime/rerun.ts
export function rerun(
  script: Script,
  event?: RerunContext["event"],
  sessionId?: string,
  signal?: AbortSignal
): string {
  // シグナルがabortされていたら早期リターン
  if (signal?.aborted) {
    throw new AbortError("Rerun was aborted");
  }

  // 既存の処理...
}
```

#### 3.3 app.tsでのAbort処理

```typescript
// イベント処理時
const session = sessionManager.getSession(data.sessionId);

// 前回のrunを中断
session.currentAbortController?.abort();
session.currentAbortController = new AbortController();

try {
  const newHtml = rerun(
    script,
    { widgetId, value: data.value },
    session.id,
    session.currentAbortController.signal
  );
  // パッチ送信...
} catch (e) {
  if (e instanceof AbortError) {
    // 中断されたrerunは無視
    return;
  }
  throw e;
}
```

### テスト

```typescript
// tests/runtime/abort.test.ts
describe("Abort", () => {
  it("should abort previous rerun when new event arrives", () => {
    // 1つ目のrerunを開始
    // 2つ目のイベントでabort
    // 2つ目のrerunの結果のみが反映される
  });
});
```

### 成果物

- [ ] `src/runtime/abort.ts` 作成（AbortError等）
- [ ] `src/runtime/rerun.ts` にシグナル対応追加
- [ ] `src/session/types.ts` にAbortController追加
- [ ] `src/app.ts` でAbort処理実装
- [ ] `tests/runtime/abort.test.ts` 作成

---

## 4. ストリーミング更新 🟡 中優先度

### 目的

rerun途中でも部分的なパッチを送信し、段階的にUIを更新する。

### 前提

- タスク#2（直列化）が完了していること
- タスク#3（Abort）が完了していること

### 実装アプローチ

#### 4.1 RenderContextの拡張

```typescript
// src/kt/context.ts
export class RenderContext {
  private buffer: string[] = [];
  private flushCallback?: (html: string) => void;
  private flushThreshold = 3; // 3要素ごとにフラッシュ

  setFlushCallback(callback: (html: string) => void): void {
    this.flushCallback = callback;
  }

  append(html: string): void {
    this.buffer.push(html);
    if (this.buffer.length >= this.flushThreshold && this.flushCallback) {
      this.flush();
    }
  }

  private flush(): void {
    if (this.buffer.length === 0) return;
    const html = this.buffer.join("\n");
    this.flushCallback?.(html);
    // バッファはクリアしない（最終HTMLに含める必要があるため）
  }
}
```

#### 4.2 ストリーミングパッチ送信

```typescript
// src/app.ts
const renderContext = new RenderContext();
renderContext.setFlushCallback((partialHtml) => {
  // 部分的なパッチを送信
  ws.send(JSON.stringify({
    type: "patch",
    patches: [{ type: "appendNode", parentId: "__root__", html: partialHtml }],
    partial: true, // 部分更新フラグ
  }));
});
```

#### 4.3 クライアント側の対応

```typescript
// クライアントスクリプト
if (msg.partial) {
  // 部分更新: 追加のみ行う
  const app = document.getElementById("app");
  const temp = document.createElement("div");
  temp.innerHTML = partialHtml;
  while (temp.firstChild) {
    app.appendChild(temp.firstChild);
  }
} else {
  // 完全更新: 差分を適用
  applyPatches(msg.patches);
}
```

### 考慮事項

1. **複雑性の増加**: ストリーミングは複雑性を大幅に増加させる
2. **フォーカス問題**: 部分更新中のフォーカス維持が困難
3. **順序保証**: 部分パッチと完全パッチの順序が重要

### 推奨アプローチ

**Phase 1（Week4）**: 基盤のみ実装
- RenderContextにフラッシュ機能を追加
- 実際のストリーミング送信は無効化（設定フラグで制御）

**Phase 2（Week5以降）**: 実際のストリーミング有効化
- テストで安定性を確認後に有効化

### 成果物

- [ ] `src/kt/context.ts` にフラッシュ機能追加
- [ ] `src/config/types.ts` にストリーミング設定追加
- [ ] `src/app.ts` にストリーミング基盤実装（無効状態）
- [ ] ストリーミングのユニットテスト

---

## 5. E2Eテスト安定化 🟡 中優先度

### 現在スキップ中のテスト

1. `e2e/websocket.spec.ts`: "should update text input value"
2. `e2e/websocket.spec.ts`: "should update selectbox value"
3. `e2e/focus-preservation.spec.ts`: "should maintain focus on text input during typing"

### 原因分析

- Playwrightの`fill()`/`selectOption()`とreplaceRootの競合
- イベント発火タイミングとDOM置換のタイミングの問題

### 対応策

#### 5.1 テストヘルパーの改善

```typescript
// e2e/helpers.ts
async function typeWithRerun(page: Page, selector: string, text: string) {
  const el = page.locator(selector);
  for (const char of text) {
    await el.press(char);
    // rerun完了を待機
    await page.waitForFunction(
      (sel) => document.querySelector(sel)?.value.includes(char),
      selector
    );
  }
}
```

#### 5.2 安定化のためのwait追加

```typescript
// 各操作後にrerunの完了を待機
await slider.fill("60");
await page.waitForSelector('[data-kt-value="60"]');
```

### 成果物

- [ ] `e2e/helpers.ts` 作成
- [ ] スキップ中のテストを有効化
- [ ] 全E2Eテストの安定実行

---

## 実装順序

```
Day 1-2: タスク#1（フォーカス維持機能の強化）
         ├── フォーカス復元ロジック改善
         └── スクロール位置保存・復元

Day 3-4: タスク#2（同一セッション直列化）
         ├── EventQueue実装
         ├── SessionManager拡張
         └── テスト作成

Day 5: タスク#3（Abort機能）
       ├── AbortError実装
       ├── rerun関数拡張
       └── テスト作成

Day 6-7: タスク#4（ストリーミング更新）
         ├── RenderContext拡張
         ├── 基盤実装（無効状態）
         └── テスト作成

Day 8: タスク#5（E2Eテスト安定化）
       ├── ヘルパー作成
       └── スキップテスト有効化

Day 9-10: バッファ + 全体確認
          └── bun run ci
```

---

## 完了基準

### 必須

- [ ] フォーカス維持テストがパス
- [ ] イベント順序保証のテストがパス
- [ ] `bun run ci` が成功

### 望ましい

- [ ] Abort機能が動作
- [ ] ストリーミング基盤が実装済み
- [ ] 全E2Eテストがパス（スキップなし）

---

## リスクと対策

| リスク | 対策 |
|--------|------|
| フォーカス復元の複雑性 | 段階的に改善、まずIDあり要素のみ対応 |
| 直列化によるレイテンシ増加 | キュー処理を最適化、バッチ処理検討 |
| ストリーミングの複雑性 | Phase 1では基盤のみ、有効化は後回し |
| E2Eテストの不安定性 | 適切なwait、リトライ機構の導入 |

---

## 次のステップ（Week5への橋渡し）

Week4完了後、以下をWeek5で対応:

1. **再接続・順序保証**: シーケンス番号管理、多重タブ対応
2. **ストリーミング有効化**: Phase 2として実際の送信を有効化
3. **パフォーマンス最適化**: イベントデバウンス、バッチパッチ

---

*対象バージョン: kantan-ui v0.0.3*
