# パフォーマンスボトルネック調査レポート

**調査日**: 2026-01-12
**調査対象**: kantan-ui コードベース全体
**特定されたボトルネック数**: 27件

---

## 目次

1. [サマリー](#サマリー)
2. [高優先度（重大な影響）](#高優先度重大な影響)
3. [中優先度](#中優先度)
4. [低優先度](#低優先度)
5. [改善提案](#改善提案)

---

## サマリー

| カテゴリ | 件数 | 重要度 |
|---------|------|--------|
| ブロッキング処理 | 3 | 高 |
| メモリ効率/リーク | 4 | 高 |
| 不必要なループ/再計算 | 2 | 中 |
| N+1/線形走査 | 2 | 中 |
| DOM操作 | 2 | 中 |
| キャッシュ未活用 | 2 | 中 |
| イベント処理 | 2 | 中 |
| async/await非効率 | 3 | 中 |
| 重複コード | 4 | 低 |
| 文字列操作 | 2 | 低 |
| バンドルサイズ | 1 | 低 |

---

## 高優先度（重大な影響）

### 1. LRUキャッシュのO(n)走査

**ファイル**: `src/kt/cache/cache-store.ts`
**行番号**: 118-137

**問題のコード**:
```typescript
private evictIfNeeded(): void {
  while (this.entries.size > this.maxEntries) {
    let oldestKey: string | undefined;
    let oldestTime = Number.POSITIVE_INFINITY;
    for (const [key, entry] of this.entries) {  // O(n) 毎回全走査
      if (entry.lastAccessedAt < oldestTime) {
        oldestTime = entry.lastAccessedAt;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      this.entries.delete(oldestKey);
    }
  }
}
```

**影響**:
- キャッシュサイズが大きい場合、エントリ追加の度にO(n)の走査が発生
- 最悪ケースでは O(n²) になる可能性（連続追加時）

**改善策**:
- 優先度キュー（Min-Heap）を使用してO(log n)で最古エントリを取得
- またはダブルリンクリスト + Mapでアクセス順序を管理しO(1)で削除

---

### 2. ストリーム処理での文字列連結 O(n²)

**ファイル**: `src/runtime/stream-processor.ts`
**行番号**: 41

**問題のコード**:
```typescript
fullText += value;  // 累積的な連結
```

**影響**:
- JavaScriptの文字列はイミュータブルなため、`+=` は毎回新しい文字列を生成
- 大量のストリームチャンク処理時にO(n²)のメモリコピーが発生
- 大容量テキスト（数MB以上）で顕著なパフォーマンス低下

**改善策**:
```typescript
// Before
let fullText = "";
for (const value of chunks) {
  fullText += value;
}

// After
const parts: string[] = [];
for (const value of chunks) {
  parts.push(value);
}
const fullText = parts.join("");
```

---

### 3. デバウンスタイマーMapのメモリリーク

**ファイル**: `src/client/script.ts`
**行番号**: 356-368

**問題のコード**:
```typescript
const debounceTimers = new Map();

function sendEventDebounced(widgetId, value, sendFn) {
  const existingTimer = debounceTimers.get(widgetId);
  if (existingTimer) clearTimeout(existingTimer);
  const timer = setTimeout(() => {
    sendFn(widgetId, value);
    debounceTimers.delete(widgetId);
  }, 300);
  debounceTimers.set(widgetId, timer);  // 無期限に保持される可能性
}
```

**影響**:
- セッション終了時やページ遷移時にMapがクリアされない
- 長時間セッションでwidgetIdが増え続けるとメモリが増加
- タイマーが発火せずに残り続けるケースも存在

**改善策**:
```typescript
// セッション終了時のクリーンアップ
function cleanupDebounceTimers() {
  for (const timer of debounceTimers.values()) {
    clearTimeout(timer);
  }
  debounceTimers.clear();
}

// beforeunload や visibilitychange で呼び出す
window.addEventListener("beforeunload", cleanupDebounceTimers);
```

---

### 4. アップロードデータの無期限保持

**ファイル**: `src/session/manager.ts`
**行番号**: 136, 897-898, 1075

**問題のコード**:
```typescript
private uploadData = new Map<SessionId, Map<UploadId, InternalUploadData>>();

// チャンク完了後もデータが保持され続ける
storeUploadChunk(sessionId: SessionId, uploadId: UploadId, chunk: ArrayBuffer): void {
  // ...
  uploadEntry.chunks.push(chunk);
  uploadEntry.receivedBytes += chunk.byteLength;
  // TTLなしで無期限保持
}
```

**影響**:
- 大ファイル（数十MB〜数GB）のアップロード後、メモリに残り続ける
- 複数ユーザーが大ファイルをアップロードするとサーバーメモリが枯渇
- セッション削除時には削除されるが、セッション存続中は保持

**改善策**:
```typescript
// アップロード完了後のTTL付き自動削除
completeUpload(sessionId: SessionId, uploadId: UploadId): void {
  // 処理完了後
  setTimeout(() => {
    this.deleteUploadData(sessionId, uploadId);
  }, UPLOAD_DATA_TTL); // 例: 5分
}
```

---

## 中優先度

### 5. HTMLサニタイザーの正規表現再生成

**ファイル**: `src/kt/markdown/sanitizer.ts`
**行番号**: 128-173

**問題のコード**:
```typescript
const STRIP_TAGS_WITH_CONTENT = ["script", "style", "iframe", "object", "embed", "form"];

// サニタイズ実行時に毎回正規表現を生成
for (const tag of STRIP_TAGS_WITH_CONTENT) {
  const pattern = new RegExp(
    `<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
    "gi"
  );
  sanitized = sanitized.replace(pattern, "");

  const selfClosingPattern = new RegExp(
    `<${tag}[^>]*\\/?>`,
    "gi"
  );
  sanitized = sanitized.replace(selfClosingPattern, "");
}
```

**影響**:
- 6タグ × 2パターン = 12回の正規表現コンパイルが毎回発生
- 大量のHTMLをサニタイズする場合にオーバーヘッドが蓄積

**改善策**:
```typescript
// モジュールスコープで事前コンパイル
const STRIP_PATTERNS = STRIP_TAGS_WITH_CONTENT.map(tag => ({
  content: new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi"),
  selfClosing: new RegExp(`<${tag}[^>]*\\/?>`, "gi")
}));

// または複合パターン
const COMBINED_STRIP_PATTERN = new RegExp(
  `<(script|style|iframe|object|embed|form)[^>]*>([\\s\\S]*?)<\\/\\1>`,
  "gi"
);
```

---

### 6. マークダウンパーサーの5回連続置換

**ファイル**: `src/kt/markdown/parser.ts`
**行番号**: 394-413

**問題のコード**:
```typescript
function parseInline(text: string): string {
  let result = text;

  // 画像
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
  // リンク
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // 太字
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // 斜体
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // コード
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');

  return result;
}
```

**影響**:
- 5回の文字列走査と置換が発生
- 大きなテキストでは各パスで全文字列をスキャン

**改善策**:
- トークナイザーベースのシングルパスパーサーに変更
- または優先順位を考慮した複合正規表現の使用

---

### 7. querySelectorAllの重複呼び出し

**ファイル**: `src/client/script.ts`
**行番号**: 279, 297, 338

**問題のコード**:
```typescript
function initChatAutoScroll() {
  const containers = document.querySelectorAll("[data-kt-chat-container]");
  // ...
}

function autoScrollChat() {
  const containers = document.querySelectorAll("[data-kt-chat-container]");  // 重複
  // ...
}

function setupChatHandlers() {
  const containers = document.querySelectorAll("[data-kt-chat-container]");  // 重複
  // ...
}
```

**影響**:
- 同じセレクタで複数回DOM走査が発生
- DOM要素数が多い場合にパフォーマンス低下

**改善策**:
```typescript
// キャッシュを使用
let chatContainersCache: NodeListOf<Element> | null = null;

function getChatContainers(): NodeListOf<Element> {
  if (!chatContainersCache) {
    chatContainersCache = document.querySelectorAll("[data-kt-chat-container]");
  }
  return chatContainersCache;
}

// DOM更新時にキャッシュを無効化
function invalidateChatContainersCache() {
  chatContainersCache = null;
}
```

---

### 8. セッションcleanupの線形走査

**ファイル**: `src/session/manager.ts`
**行番号**: 437-447

**問題のコード**:
```typescript
cleanup(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [id, session] of this.sessions) {  // O(n) 毎回全走査
    if (now - session.lastAccessedAt.getTime() > this.config.ttl) {
      this.sessions.delete(id);
      this.sessionStates.delete(id);
      this.uploadData.delete(id);
      cleaned++;
    }
  }

  return cleaned;
}
```

**影響**:
- セッション数が増加するとcleanup処理時間が線形に増加
- 定期実行される場合、サーバー負荷に影響

**改善策**:
- TTLでソートされた優先度キューを使用
- または期限切れセッションのみを管理する別のデータ構造を導入

---

### 9. HTMLパース時の正規表現再生成

**ファイル**: `src/diff/parser.ts`
**行番号**: 116-117

**問題のコード**:
```typescript
export function parseHtml(html: string): VNode[] {
  const idPattern = /<([a-z][a-z0-9]*)\b[^>]*\bid=["']([^"']+)["'][^>]*>/gi;

  for (const match of html.matchAll(idPattern)) {
    // ...
  }
}
```

**影響**:
- 関数呼び出し毎に正規表現がコンパイルされる
- 頻繁なHTML更新時にオーバーヘッドが蓄積

**改善策**:
```typescript
// モジュールスコープで定義
const ID_PATTERN = /<([a-z][a-z0-9]*)\b[^>]*\bid=["']([^"']+)["'][^>]*>/gi;

export function parseHtml(html: string): VNode[] {
  ID_PATTERN.lastIndex = 0;  // リセットして再利用
  for (const match of html.matchAll(ID_PATTERN)) {
    // ...
  }
}
```

---

### 10. WebSocket接続状態チェックの重複走査

**ファイル**: `src/session/manager.ts`
**行番号**: 212-243

**問題のコード**:
```typescript
sendPingToAll(): void {
  const now = Date.now();
  const deadConnections: WebSocket[] = [];

  // 1回目の走査: dead connectionを収集
  for (const [ws, lastPong] of this.wsLastPong) {
    if (now - lastPong > timeoutThreshold) {
      deadConnections.push(ws);
    }
  }

  // 2回目の走査: 削除処理
  for (const ws of deadConnections) {
    this.removeWebSocket(ws);
  }

  // 3回目の走査: ping送信
  for (const ws of this.wsLastPong.keys()) {
    ws.send("ping");
  }
}
```

**影響**:
- 接続数に比例して3回のイテレーションが発生
- 多数の接続がある場合にオーバーヘッド

**改善策**:
```typescript
// シングルパスで処理
sendPingToAll(): void {
  const now = Date.now();

  for (const [ws, lastPong] of this.wsLastPong) {
    if (now - lastPong > timeoutThreshold) {
      this.removeWebSocket(ws);
    } else {
      ws.send("ping");
    }
  }
}
```

---

### 11. イベントリスナーの重複登録リスク

**ファイル**: `src/client/script.ts`
**行番号**: 284, 319, 327, 788

**問題のコード**:
```typescript
function initChatAutoScroll() {
  const containers = document.querySelectorAll("[data-kt-chat-container]");
  containers.forEach((container) => {
    if (container.dataset.ktChatScrollInit) return;
    container.addEventListener("scroll", () => { ... });
    container.dataset.ktChatScrollInit = "true";
  });
}
```

**影響**:
- フラグチェックはあるが、DOM再構築時に要素が置き換わるとリスナーが重複
- メモリリークの原因になる可能性

**改善策**:
- イベント委譲パターンを使用して親要素で一括管理
- AbortControllerを使用してリスナーを管理

---

### 12. マルチセレクト時の毎回DOM走査

**ファイル**: `src/client/script.ts`
**行番号**: 888

**問題のコード**:
```typescript
if (target.type === "checkbox" && target.name) {
  const checkboxes = document.querySelectorAll(
    'input[type="checkbox"][name="' + target.name + '"]'
  );
  const values = [];
  checkboxes.forEach((cb) => {
    if (cb.checked) values.push(cb.value);
  });
}
```

**影響**:
- チェックボックス変更の度にDOM全体を走査
- 多数のチェックボックスがある場合にパフォーマンス低下

**改善策**:
```typescript
// グループごとにキャッシュを管理
const checkboxGroups = new Map<string, HTMLInputElement[]>();

function getCheckboxGroup(name: string): HTMLInputElement[] {
  if (!checkboxGroups.has(name)) {
    checkboxGroups.set(
      name,
      Array.from(document.querySelectorAll(`input[type="checkbox"][name="${name}"]`))
    );
  }
  return checkboxGroups.get(name)!;
}
```

---

### 13. フォーカス復元の二重実行

**ファイル**: `src/client/script.ts`
**行番号**: 984-985

**問題のコード**:
```typescript
if (focusState) {
  restoreFocusState(focusState, 0);
  requestAnimationFrame(() => restoreFocusState(focusState, 0));
}
```

**影響**:
- 同じ処理が2回実行される
- 不要なレンダリングサイクルが発生

**改善策**:
```typescript
// requestAnimationFrame のみで実行
if (focusState) {
  requestAnimationFrame(() => restoreFocusState(focusState, 0));
}
```

---

### 14. structuredCloneの過度な使用

**ファイル**: `src/session/state.ts`
**行番号**: 104

**問題のコード**:
```typescript
const defaultValue = defaults[prop as keyof T];
if (defaultValue !== null && typeof defaultValue === "object") {
  const clonedValue = deepClone(defaultValue);  // 毎アクセス時に実行
  getSessionManager().setState(currentSessionId, prop, clonedValue);
  return clonedValue;
}
```

**影響**:
- デフォルト値へのアクセス毎にディープクローンが発生
- 大きなオブジェクトや配列では顕著なコスト

**改善策**:
```typescript
// クローン結果をキャッシュ
const clonedDefaults = new Map<string, unknown>();

if (defaultValue !== null && typeof defaultValue === "object") {
  const cacheKey = `${currentSessionId}:${String(prop)}`;
  if (!clonedDefaults.has(cacheKey)) {
    clonedDefaults.set(cacheKey, deepClone(defaultValue));
  }
  const clonedValue = clonedDefaults.get(cacheKey);
  // ...
}
```

---

### 15-17. async/awaitの直列実行（並列化可能）

#### 15. ファイル検証の直列処理

**ファイル**: `src/utils/file-validation.ts`
**行番号**: 84-150

**問題のコード**:
```typescript
if (cfg.verifyMagicBytes) {
  const magicResult = verifyMagicBytes(data, claimedMime);
  // ...
}

if (cfg.detectPolyglot) {
  const polyglotResult = detectPolyglot(data, claimedMime);  // 前のステップに依存しない
  // ...
}
```

**改善策**:
```typescript
const [magicResult, polyglotResult] = await Promise.all([
  cfg.verifyMagicBytes ? verifyMagicBytes(data, claimedMime) : null,
  cfg.detectPolyglot ? detectPolyglot(data, claimedMime) : null
]);
```

#### 16-17. セッション初期化後のパッチ処理

**ファイル**: `src/app.ts`
**行番号**: 290-316

依存関係があるため並列化は限定的だが、一部の処理は並列化可能。

---

## 低優先度

### 18-21. 重複コード

#### 18. XSS検出ロジックの重複

**ファイル**:
- `src/utils/html.ts` (行125-128)
- `src/client/script.ts` (行54-76)

同じXSS検出ロジックがサーバー側とクライアント側で実装されている。

**改善策**:
- 共通ライブラリとして抽出
- または信頼境界を明確にしてクライアント側の検出を簡略化

#### 19. ファイルアップロード処理の重複

**ファイル**:
- `src/client/script.ts` (行360-500)
- `src/client/file-upload-handler.ts`

#### 20-21. その他の重複

- キャッシュクリア処理: `src/kt/cache/cache-resource.ts` (行91-104)
- ファイル拡張子チェック: `src/utils/file-validation.ts` (行109-115)

---

### 22-23. 文字列操作

#### 22. substring vs slice

**ファイル**: `src/diff/parser.ts`
**行番号**: 157

```typescript
nodeHtml = html.substring(match.index, endTagPos);
```

`slice()` の方が若干高速だが、影響は軽微。

#### 23. テーブルでの毎回String()変換

**ファイル**: `src/kt/data.ts`
**行番号**: 116

```typescript
parts.push(`<td>${escapeHtml(String(cell))}</td>`);
```

型が既に文字列の場合は不要な変換。

---

### 24-27. その他

#### 24. クライアントバンドル内のXSS正規表現パターン

**ファイル**: `src/client/script.ts`
**行番号**: 60-76

14個のXSS検出用正規表現パターンがバンドルに含まれている。

#### 25. テーブルヘッダーの処理

**ファイル**: `src/kt/markdown/parser.ts`
**行番号**: 128-135

forEach使用による微小なオーバーヘッド。

#### 26. キャッシュクリア処理の重複

**ファイル**: `src/kt/cache/cache-resource.ts`
**行番号**: 91-104

#### 27. 正規表現のlastIndexリセット

**ファイル**: `src/diff/parser.ts`
**行番号**: 60, 74

キャッシュされた正規表現でもlastIndexを毎回リセット。

---

## 改善提案

### 即座に対応すべき項目

1. **LRUキャッシュの最適化** - O(n) → O(1)
2. **ストリーム処理の文字列連結** - 配列 + join()
3. **デバウンスタイマーのクリーンアップ** - beforeunloadで削除
4. **アップロードデータのTTL** - 自動削除メカニズム

### 中期的に対応すべき項目

1. 正規表現の事前コンパイル（sanitizer, markdown parser, diff parser）
2. DOM操作の最適化（キャッシュ、イベント委譲）
3. セッションcleanupの効率化

### 長期的に検討すべき項目

1. マークダウンパーサーのトークナイザー化
2. 重複コードの統合
3. クライアントバンドルサイズの最適化

---

## 付録: 調査観点

本調査は以下の12観点で実施:

1. 同期的な重い処理（ブロッキング処理）
2. 不必要なループや再計算
3. メモリリーク・メモリ効率の悪い処理
4. N+1問題や非効率なデータアクセス
5. 不必要なファイルI/O
6. 過剰なDOM操作やレンダリング
7. 非効率な文字列操作
8. キャッシュが効いていない処理
9. 大きなバンドルサイズ
10. 非効率なイベントハンドリング
11. 重複した処理・冗長なコード
12. async/awaitの非効率な使用
