# file_uploader 改善設計書

本ドキュメントでは、`kt.file_uploader` の5つの改善点について設計を行う。

---

## 目次

1. [ファイルアップロード専用レート制限](#1-ファイルアップロード専用レート制限)
2. [E2Eテスト](#2-e2eテスト)
3. [チャンクアップロード](#3-チャンクアップロード)
4. [プログレス表示](#4-プログレス表示)
5. [CSRF対策](#5-csrf対策)

---

## 1. ファイルアップロード専用レート制限

### 1.1 現状分析

**既存実装** (`src/session/manager.ts:520-556`):
- スライディングウィンドウ方式の汎用レート制限
- デフォルト: 100イベント/秒/セッション
- クールダウン: 1秒

**課題**:
- ファイルアップロードは通常イベントより重い処理
- 大きいファイルのBase64エンコードはサーバーリソースを消費
- 汎用レート制限では細かい制御ができない

### 1.2 設計

#### 1.2.1 設定インターフェース

```typescript
// src/config/types.ts に追加
export interface FileUploadRateLimitConfig {
  /** 1分あたりの最大アップロード数（デフォルト: 30） */
  maxUploadsPerMinute?: number;
  /** 1分あたりの最大アップロードサイズ（バイト、デフォルト: 100MB） */
  maxBytesPerMinute?: number;
  /** 同時アップロード数の上限（デフォルト: 3） */
  maxConcurrentUploads?: number;
  /** レート制限超過時のクールダウン（ミリ秒、デフォルト: 5000） */
  uploadRateLimitCooldown?: number;
}

export interface SecurityConfig {
  // 既存フィールド...
  /** ファイルアップロード専用のレート制限 */
  fileUploadRateLimit?: FileUploadRateLimitConfig;
}
```

#### 1.2.2 レート制限状態

```typescript
// src/session/manager.ts に追加
interface FileUploadRateLimitState {
  /** 現在のウィンドウでのアップロード数 */
  uploadCount: number;
  /** 現在のウィンドウでのアップロードバイト数 */
  bytesUploaded: number;
  /** ウィンドウ開始時刻 */
  windowStart: number;
  /** 現在進行中のアップロード数 */
  concurrentUploads: number;
  /** クールダウン終了時刻 */
  cooldownUntil: number;
}

interface FileUploadRateLimitResult {
  allowed: boolean;
  reason?: 'count_exceeded' | 'bytes_exceeded' | 'concurrent_exceeded' | 'cooldown';
  retryAfter?: number;
}
```

#### 1.2.3 実装フロー

```
[ファイルアップロード受信]
       ↓
[checkFileUploadRateLimit(sessionId, fileSize)]
       ↓
   ┌─ allowed=true ─→ [incrementConcurrentUploads()]
   │                         ↓
   │                   [アップロード処理]
   │                         ↓
   │                   [decrementConcurrentUploads()]
   │                         ↓
   │                   [recordUploadCompletion(size)]
   │
   └─ allowed=false ─→ [エラーレスポンス送信]
                       {type: "upload_error",
                        code: "UPLOAD_RATE_LIMITED",
                        retryAfter: ms}
```

### 1.3 影響範囲

| ファイル | 変更内容 |
|---------|---------|
| `src/config/types.ts` | `FileUploadRateLimitConfig` 追加 |
| `src/config/defaults.ts` | デフォルト値追加 |
| `src/session/manager.ts` | レート制限ロジック追加 |
| `src/websocket/file-upload-handler.ts` | レート制限チェック呼び出し |
| `src/websocket/types.ts` | エラーメッセージ型追加 |

### 1.4 テスト計画

- [ ] 1分間に30回以上アップロードでレート制限発動
- [ ] 1分間に100MB以上アップロードでレート制限発動
- [ ] 同時3ファイル以上でレート制限発動
- [ ] クールダウン後にアップロード可能

---

## 2. E2Eテスト

### 2.1 現状分析

**既存構造** (`e2e/`):
- Playwright使用
- `e2e/helpers.ts` にユーティリティ関数
- `e2e/websocket.spec.ts` でWebSocketテスト

**課題**:
- `file_uploader` 専用のE2Eテストがない
- ファイル選択、アップロード、エラー表示の検証がない

### 2.2 設計

#### 2.2.1 テストファイル構成

```
e2e/
├── file-uploader.spec.ts       # メインテストスイート
├── fixtures/
│   ├── test-image.png          # 有効なPNG画像（1KB）
│   ├── test-document.pdf       # 有効なPDF（2KB）
│   ├── test-text.txt           # テキストファイル
│   ├── large-file.bin          # サイズ超過テスト用（生成）
│   └── fake-image.png          # 拡張子詐称（実際はテキスト）
└── helpers.ts                  # 既存 + 追加ヘルパー
```

#### 2.2.2 ヘルパー関数追加

```typescript
// e2e/helpers.ts に追加

/**
 * ファイルアップローダーにファイルを設定
 */
export async function uploadFile(
  page: Page,
  selector: string,
  filePath: string
): Promise<void> {
  const input = page.locator(selector);
  await input.setInputFiles(filePath);
}

/**
 * アップロード完了を待機
 */
export async function waitForUploadComplete(
  page: Page,
  widgetId: string,
  timeout = 10000
): Promise<void> {
  // WebSocketメッセージを監視して upload_result を待つ
  await page.waitForFunction(
    (id) => {
      const container = document.querySelector(`#${id}-container`);
      return container?.classList.contains('kt-upload-complete');
    },
    widgetId,
    { timeout }
  );
}

/**
 * アップロードエラーメッセージを取得
 */
export async function getUploadError(
  page: Page,
  widgetId: string
): Promise<string | null> {
  const errorDiv = page.locator(`#${widgetId}-container .kt-file-uploader-error`);
  if (await errorDiv.isVisible()) {
    return errorDiv.textContent();
  }
  return null;
}
```

#### 2.2.3 テストケース

```typescript
// e2e/file-uploader.spec.ts

import { expect, test } from "@playwright/test";
import { gotoAndWait, uploadFile, waitForUploadComplete, getUploadError } from "./helpers";
import * as path from "path";

test.describe("File Uploader E2E", () => {

  test.describe("基本機能", () => {
    test("単一ファイルをアップロードできる", async ({ page }) => {
      await gotoAndWait(page);

      const filePath = path.join(__dirname, "fixtures/test-text.txt");
      await uploadFile(page, "#file_uploader", filePath);

      // アップロード成功を確認
      await waitForUploadComplete(page, "file_uploader");

      // ファイル名が表示される
      await expect(page.locator("#uploaded-file-name")).toContainText("test-text.txt");
    });

    test("複数ファイルをアップロードできる", async ({ page }) => {
      await gotoAndWait(page);

      const files = [
        path.join(__dirname, "fixtures/test-text.txt"),
        path.join(__dirname, "fixtures/test-image.png"),
      ];

      await page.locator("#multi_uploader").setInputFiles(files);

      // 両方のファイルが処理される
      await expect(page.locator("#uploaded-files-count")).toContainText("2");
    });
  });

  test.describe("バリデーション", () => {
    test("サイズ超過ファイルを拒否する", async ({ page }) => {
      await gotoAndWait(page);

      // 大きすぎるファイルを作成（テスト用）
      const buffer = Buffer.alloc(250 * 1024 * 1024); // 250MB
      // ... ファイル作成ロジック

      await uploadFile(page, "#file_uploader", largePath);

      const error = await getUploadError(page, "file_uploader");
      expect(error).toContain("exceeds maximum");
    });

    test("許可されていないファイルタイプを拒否する", async ({ page }) => {
      await gotoAndWait(page);

      // accept="image/*" のアップローダーに.txtをアップロード
      const filePath = path.join(__dirname, "fixtures/test-text.txt");
      await uploadFile(page, "#image_uploader", filePath);

      const error = await getUploadError(page, "image_uploader");
      expect(error).toContain("not allowed");
    });

    test("拡張子詐称ファイルを検出する（strictMode）", async ({ page }) => {
      await gotoAndWait(page);

      // fake-image.png（実際はテキスト）をアップロード
      const filePath = path.join(__dirname, "fixtures/fake-image.png");
      await uploadFile(page, "#strict_uploader", filePath);

      const error = await getUploadError(page, "strict_uploader");
      expect(error).toContain("MIME mismatch");
    });
  });

  test.describe("セキュリティ", () => {
    test("実行ファイルを拒否する", async ({ page }) => {
      await gotoAndWait(page);

      // MZヘッダーを持つファイルを作成
      const exePath = path.join(__dirname, "fixtures/test.exe");
      await uploadFile(page, "#file_uploader", exePath);

      const error = await getUploadError(page, "file_uploader");
      expect(error).toContain("Dangerous file");
    });

    test("パストラバーサルを含むファイル名を無害化する", async ({ page }) => {
      // サーバー側でサニタイズされることを確認
      // ファイル名に ../../../etc/passwd を含むファイルをアップロード
      // 結果のファイル名に .. や / が含まれないことを確認
    });
  });

  test.describe("UI/UX", () => {
    test("ドラッグ&ドロップでアップロードできる", async ({ page }) => {
      await gotoAndWait(page);

      // DataTransferを使用してドラッグ&ドロップをシミュレート
      const filePath = path.join(__dirname, "fixtures/test-text.txt");

      const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
      // ... ドロップイベント発火
    });

    test("無効状態ではファイル選択できない", async ({ page }) => {
      await gotoAndWait(page);

      const input = page.locator("#disabled_uploader");
      await expect(input).toBeDisabled();
    });
  });
});
```

### 2.3 CI設定

```yaml
# .github/workflows/e2e.yml に追加
- name: Create test fixtures
  run: |
    mkdir -p e2e/fixtures
    echo "test content" > e2e/fixtures/test-text.txt
    # PNG画像生成（ImageMagick使用）
    convert -size 100x100 xc:red e2e/fixtures/test-image.png
```

### 2.4 テスト計画

| カテゴリ | テスト数 | 優先度 |
|---------|---------|--------|
| 基本機能 | 5 | 高 |
| バリデーション | 8 | 高 |
| セキュリティ | 6 | 高 |
| UI/UX | 4 | 中 |
| エッジケース | 5 | 低 |
| **合計** | **28** | - |

---

## 3. チャンクアップロード

### 3.1 現状分析

**既存コード**:
```typescript
// src/client/script.ts:343
const FILE_UPLOAD_CHUNK_SIZE = 1 * 1024 * 1024; // 1MB

// src/websocket/types.ts
interface FileUploadMessage {
  isChunked: false;  // 常にfalse
  totalChunks?: number;
  chunkIndex?: number;
}
```

**課題**:
- `isChunked` フィールドは定義されているが未使用
- 大きいファイル（>10MB）でメモリ問題の可能性
- WebSocket単一メッセージのサイズ制限

### 3.2 設計

#### 3.2.1 チャンクメッセージ形式

```typescript
// src/websocket/types.ts

/** チャンクアップロード開始メッセージ */
interface ChunkUploadStartMessage {
  type: "chunk_upload_start";
  widgetId: string;
  uploadId: string;           // クライアント生成のUUID
  filename: string;
  mimeType: string;
  totalSize: number;
  totalChunks: number;
  chunkSize: number;          // 通常1MB
}

/** チャンクデータメッセージ */
interface ChunkUploadDataMessage {
  type: "chunk_upload_data";
  uploadId: string;
  chunkIndex: number;         // 0-indexed
  data: string;               // Base64
  checksum?: string;          // SHA-256（オプション）
}

/** チャンクアップロード完了メッセージ */
interface ChunkUploadCompleteMessage {
  type: "chunk_upload_complete";
  uploadId: string;
}

/** サーバーからのチャンク応答 */
interface ChunkUploadResponse {
  type: "chunk_upload_response";
  uploadId: string;
  status: "chunk_received" | "upload_complete" | "error";
  chunkIndex?: number;
  progress?: number;          // 0-100
  error?: {
    code: string;
    message: string;
  };
}
```

#### 3.2.2 サーバー側状態管理

```typescript
// src/session/manager.ts に追加

interface ChunkUploadState {
  uploadId: string;
  widgetId: string;
  filename: string;
  mimeType: string;
  totalSize: number;
  totalChunks: number;
  receivedChunks: Set<number>;
  chunks: Map<number, ArrayBuffer>;
  startedAt: number;
  lastActivityAt: number;
}

// SessionManager クラスに追加
private chunkUploads: Map<string, ChunkUploadState> = new Map();

/** チャンクアップロードのタイムアウト（5分） */
private static readonly CHUNK_UPLOAD_TIMEOUT = 5 * 60 * 1000;
```

#### 3.2.3 クライアント側実装

```javascript
// src/client/script.ts

async function handleChunkedUpload(file, widgetId) {
  const uploadId = crypto.randomUUID();
  const chunkSize = FILE_UPLOAD_CHUNK_SIZE;
  const totalChunks = Math.ceil(file.size / chunkSize);

  // 1. 開始メッセージ送信
  sendMessage({
    type: "chunk_upload_start",
    widgetId,
    uploadId,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    totalSize: file.size,
    totalChunks,
    chunkSize
  });

  // 2. チャンク送信（順次）
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    const buffer = await chunk.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);

    sendMessage({
      type: "chunk_upload_data",
      uploadId,
      chunkIndex: i,
      data: base64
    });

    // サーバーからのACKを待つ（フロー制御）
    await waitForChunkAck(uploadId, i);

    // プログレス更新
    updateProgress(widgetId, ((i + 1) / totalChunks) * 100);
  }

  // 3. 完了メッセージ送信
  sendMessage({
    type: "chunk_upload_complete",
    uploadId
  });
}

function shouldUseChunkedUpload(fileSize) {
  // 10MB以上でチャンクアップロード使用
  return fileSize > 10 * 1024 * 1024;
}
```

#### 3.2.4 サーバー側処理フロー

```
[chunk_upload_start]
       ↓
[ChunkUploadState 作成]
       ↓
   ┌───────────────────────┐
   │ [chunk_upload_data]   │ ← 繰り返し
   │       ↓               │
   │ [チャンク保存]         │
   │       ↓               │
   │ [ACK送信]             │
   └───────────────────────┘
       ↓
[chunk_upload_complete]
       ↓
[全チャンク結合]
       ↓
[validateUploadedFile()]
       ↓
[registerUpload()]
       ↓
[rerun トリガー]
```

### 3.3 エラーハンドリング

| エラー | 対応 |
|--------|------|
| チャンク欠落 | 5分後タイムアウト、状態クリア |
| 順序不正 | 受け入れ（Set で管理） |
| 重複チャンク | 無視（冪等性） |
| サイズ不一致 | upload_complete 時に検証 |

### 3.4 影響範囲

| ファイル | 変更内容 |
|---------|---------|
| `src/websocket/types.ts` | チャンクメッセージ型追加 |
| `src/session/manager.ts` | チャンク状態管理追加 |
| `src/websocket/file-upload-handler.ts` | チャンクハンドラー追加 |
| `src/client/script.ts` | チャンク送信ロジック追加 |
| `src/app.ts` | メッセージルーティング追加 |

---

## 4. プログレス表示

### 4.1 現状分析

**課題**:
- アップロード中のフィードバックがない
- 大きいファイルで「フリーズした」ように見える

### 4.2 設計

#### 4.2.1 プログレスUI

```html
<!-- アップロード中のHTML -->
<div id="uploader1-container" class="kt-file-uploader-container">
  <label for="uploader1" class="kt-file-uploader-label">Upload File</label>
  <input type="file" id="uploader1" class="kt-file-uploader" />

  <!-- プログレス表示（アップロード中のみ表示） -->
  <div class="kt-file-uploader-progress" style="display: none;">
    <div class="kt-progress-bar">
      <div class="kt-progress-fill" style="width: 0%"></div>
    </div>
    <div class="kt-progress-text">
      <span class="kt-progress-percent">0%</span>
      <span class="kt-progress-size">0 MB / 10 MB</span>
    </div>
  </div>

  <!-- アップロード完了表示 -->
  <div class="kt-file-uploader-complete" style="display: none;">
    <span class="kt-file-name"></span>
    <button class="kt-file-remove" data-upload-id="">×</button>
  </div>
</div>
```

#### 4.2.2 CSS

```css
/* src/styles/file-uploader.css */

.kt-file-uploader-progress {
  margin-top: 8px;
}

.kt-progress-bar {
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.kt-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
  transition: width 0.2s ease;
}

.kt-progress-text {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: #6c757d;
  margin-top: 4px;
}

/* アニメーション（処理中） */
.kt-progress-fill.indeterminate {
  background: linear-gradient(
    90deg,
    #4CAF50 25%,
    #8BC34A 50%,
    #4CAF50 75%
  );
  background-size: 200% 100%;
  animation: progress-shimmer 1.5s infinite;
}

@keyframes progress-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

#### 4.2.3 クライアント側実装

```javascript
// src/client/script.ts

function updateProgress(widgetId, percent, uploadedBytes, totalBytes) {
  const container = document.getElementById(`${widgetId}-container`);
  if (!container) return;

  const progressDiv = container.querySelector('.kt-file-uploader-progress');
  const fill = container.querySelector('.kt-progress-fill');
  const percentText = container.querySelector('.kt-progress-percent');
  const sizeText = container.querySelector('.kt-progress-size');

  if (progressDiv) {
    progressDiv.style.display = 'block';
  }

  if (fill) {
    fill.style.width = `${percent}%`;
    fill.classList.remove('indeterminate');
  }

  if (percentText) {
    percentText.textContent = `${Math.round(percent)}%`;
  }

  if (sizeText && uploadedBytes !== undefined && totalBytes !== undefined) {
    sizeText.textContent = `${formatBytes(uploadedBytes)} / ${formatBytes(totalBytes)}`;
  }
}

function showUploadComplete(widgetId, filename, uploadId) {
  const container = document.getElementById(`${widgetId}-container`);
  if (!container) return;

  // プログレス非表示
  const progressDiv = container.querySelector('.kt-file-uploader-progress');
  if (progressDiv) {
    progressDiv.style.display = 'none';
  }

  // 完了表示
  const completeDiv = container.querySelector('.kt-file-uploader-complete');
  if (completeDiv) {
    completeDiv.style.display = 'flex';
    completeDiv.querySelector('.kt-file-name').textContent = filename;
    completeDiv.querySelector('.kt-file-remove').dataset.uploadId = uploadId;
  }

  container.classList.add('kt-upload-complete');
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

#### 4.2.4 サーバーからのプログレスメッセージ

```typescript
// 非チャンクアップロードでもプログレス通知
interface UploadProgressMessage {
  type: "upload_progress";
  widgetId: string;
  uploadId: string;
  stage: "receiving" | "validating" | "storing" | "complete";
  progress?: number;
}
```

### 4.3 UXフロー

```
[ファイル選択]
     ↓
[プログレスバー表示（0%）]
     ↓
[Base64エンコード中] → [indeterminate アニメーション]
     ↓
[送信開始] → [プログレス更新（チャンクの場合）]
     ↓
[サーバー検証中] → [indeterminate アニメーション]
     ↓
[完了] → [ファイル名 + 削除ボタン表示]
```

---

## 5. CSRF対策

### 5.1 現状分析

**既存対策**:
- Cookie: `SameSite=Lax`, `HttpOnly=true`
- セッションID: UUID v4形式の検証

**課題**:
- WebSocket接続時のOrigin検証がない
- CSRFトークンによる明示的な保護がない

### 5.2 設計

#### 5.2.1 Origin検証

```typescript
// src/app.ts WebSocketエンドポイント

app.get("/ws", upgradeWebSocket((c) => {
  // Origin検証
  const origin = c.req.header("Origin");
  const host = c.req.header("Host");

  if (!validateOrigin(origin, host, config.security?.allowedOrigins)) {
    // WebSocket接続を拒否
    return {
      onOpen: (_evt, ws) => {
        ws.close(4003, "Origin not allowed");
      }
    };
  }

  // 通常の処理...
}));

function validateOrigin(
  origin: string | undefined,
  host: string | undefined,
  allowedOrigins?: string[]
): boolean {
  // 開発環境では緩和（オプション）
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  if (!origin) {
    // Same-origin リクエストはOriginヘッダーがない場合がある
    return true;
  }

  // 明示的な許可リストがある場合
  if (allowedOrigins && allowedOrigins.length > 0) {
    return allowedOrigins.some(allowed =>
      origin === allowed || origin.endsWith(`.${allowed}`)
    );
  }

  // デフォルト: Hostと一致するか確認
  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}
```

#### 5.2.2 設定インターフェース

```typescript
// src/config/types.ts に追加

export interface SecurityConfig {
  // 既存フィールド...

  /** 許可するOriginのリスト（未設定時はHostと一致で許可） */
  allowedOrigins?: string[];

  /** WebSocket接続時のOrigin検証を有効化（デフォルト: true） */
  validateWebSocketOrigin?: boolean;
}
```

#### 5.2.3 CSRFトークン（オプション強化）

```typescript
// より高いセキュリティが必要な場合のオプション機能

// セッション作成時にCSRFトークンを生成
interface Session {
  // 既存フィールド...
  csrfToken: string;
}

// トークン生成
function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

// クライアントにトークンを提供（初期HTMLに埋め込み）
<script>
  window.__KT_CSRF_TOKEN__ = "${session.csrfToken}";
</script>

// WebSocketメッセージにトークンを含める
interface ClientMessage {
  // 既存フィールド...
  csrfToken?: string;
}

// サーバー側で検証
if (config.security?.requireCsrfToken) {
  if (data.csrfToken !== session.csrfToken) {
    ws.send(createErrorMessageJson("CSRF_INVALID", "Invalid CSRF token"));
    return;
  }
}
```

### 5.3 脅威モデルと対策マトリクス

| 脅威 | 現状 | 追加対策 |
|------|------|---------|
| Cross-Site WebSocket Hijacking | △ | Origin検証 |
| Session Fixation | ○ UUID検証 | - |
| Cookie Theft | ○ HttpOnly | - |
| CSRF via WebSocket | △ | CSRFトークン（オプション） |

### 5.4 実装優先度

1. **Origin検証**: 必須、低コスト
2. **allowedOrigins設定**: 推奨、設定のみ
3. **CSRFトークン**: オプション、高セキュリティ要件時

---

## 実装ロードマップ

### Phase 1: 必須機能（優先度: 高）

| 項目 | 工数目安 | 依存関係 |
|------|---------|---------|
| Origin検証 | 0.5日 | なし |
| E2Eテスト基盤 | 1日 | なし |
| E2Eテスト（基本） | 1日 | E2E基盤 |

### Phase 2: 重要機能（優先度: 中）

| 項目 | 工数目安 | 依存関係 |
|------|---------|---------|
| プログレス表示 | 1日 | なし |
| ファイルアップロードレート制限 | 1日 | なし |
| E2Eテスト（セキュリティ） | 0.5日 | E2E基盤 |

### Phase 3: 拡張機能（優先度: 低）

| 項目 | 工数目安 | 依存関係 |
|------|---------|---------|
| チャンクアップロード | 2-3日 | プログレス表示 |
| CSRFトークン | 1日 | なし |
| E2Eテスト（チャンク） | 0.5日 | チャンクアップロード |

---

## 参考資料

- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [OWASP WebSocket Security](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/11-Client-side_Testing/10-Testing_WebSockets)
- [RFC 6455 - WebSocket Protocol](https://tools.ietf.org/html/rfc6455)
