# File Uploader API 設計書

## 1. 概要

### 1.1 目的

Streamlit風の宣言的ファイルアップロードAPIをkantan-uiに実装する。Web標準に準拠しつつ、商用利用に耐えるセキュリティを確保する。

### 1.2 スコープ

- 単一/複数ファイルのアップロード
- ファイルタイプ・サイズの制限
- セキュアなファイル処理（MIME検証、Polyglot検出等）
- WebSocket経由のリアルタイムアップロード

### 1.3 設計原則

| 原則 | 説明 |
|------|------|
| **Web標準準拠** | File/Blob APIに準拠したインターフェース |
| **ファイルシステム非依存** | ディスクに書き込まない、メモリ内処理のみ |
| **多層防御** | クライアント・サーバー両方で検証 |
| **許可リスト方式** | 危険なファイルをブロックではなく、安全なファイルのみ許可 |

---

## 2. API設計

### 2.1 基本API

```typescript
// 単一ファイル
const file = kt.file_uploader("Upload a file");
if (file) {
  const content = file.text();
}

// 複数ファイル
const files = kt.file_uploader("Upload files", { multiple: true });
for (const f of files) {
  console.log(f.name, f.size);
}
```

### 2.2 シグネチャ

```typescript
// 単一ファイル（デフォルト）
function file_uploader(
  label: string,
  config?: Partial<Omit<FileUploaderConfig, "multiple">>
): UploadedFile | null;

// 複数ファイル
function file_uploader(
  label: string,
  config: Partial<FileUploaderConfig> & { multiple: true }
): UploadedFile[];
```

### 2.3 使用例

```typescript
import { kt } from "kantan-ui";

// 基本
const file = kt.file_uploader("Upload your resume");
if (file) {
  kt.write(`Uploaded: ${file.name} (${file.size} bytes)`);
}

// 画像のみ、サイズ制限
const image = kt.file_uploader("Upload an image", {
  accept: "image/*",
  maxSize: 5 * 1024 * 1024, // 5MB
});

// 複数ファイル、特定拡張子
const docs = kt.file_uploader("Upload documents", {
  accept: [".pdf", ".docx"],
  multiple: true,
});

// CSVをテキストとして読み込み
const csv = kt.file_uploader("Upload CSV", { accept: ".csv" });
if (csv) {
  const text = csv.text();
  // パース処理...
}

// バイナリ処理
const binary = kt.file_uploader("Upload binary", { accept: ".bin" });
if (binary) {
  const buffer = binary.arrayBuffer();
  const view = new DataView(buffer);
}

// 厳格モード（警告もエラーとして扱う）
const strict = kt.file_uploader("Secure upload", {
  strictMode: true,
});
```

---

## 3. 型定義

### 3.1 UploadedFile

```typescript
/**
 * アップロードされたファイルを表すオブジェクト
 * Web標準のFile/Blob APIに準拠
 */
export interface UploadedFile {
  /** ファイル名（サニタイズ済み） */
  readonly name: string;

  /** ファイルサイズ（バイト） */
  readonly size: number;

  /** 検証済みMIMEタイプ */
  readonly type: string;

  /** バイナリデータを取得（防御的コピー） */
  arrayBuffer(): ArrayBuffer;

  /** テキストとして取得（UTF-8） */
  text(): string;

  /** ReadableStreamとして取得 */
  stream(): ReadableStream<Uint8Array>;
}
```

### 3.2 FileUploaderConfig

```typescript
/**
 * file_uploader の設定オプション
 */
export interface FileUploaderConfig {
  /** 許可するファイルタイプ（MIME or 拡張子） */
  accept?: string | readonly string[];

  /** 複数ファイルを許可（デフォルト: false） */
  multiple?: boolean;

  /** 最大ファイルサイズ（バイト）（デフォルト: 200MB） */
  maxSize?: number;

  /** ウィジェットキー */
  key?: string;

  /** 無効化 */
  disabled?: boolean;

  /** ヘルプテキスト */
  help?: string;

  /** 厳格モード: 警告もエラーとして扱う（デフォルト: false） */
  strictMode?: boolean;

  /** Polyglot検出を有効化（デフォルト: true） */
  detectPolyglot?: boolean;

  /** マジックバイト検証を有効化（デフォルト: true） */
  verifyMagicBytes?: boolean;
}
```

### 3.3 制限値

```typescript
export const FILE_UPLOAD_LIMITS = {
  /** デフォルト最大ファイルサイズ: 200MB */
  DEFAULT_MAX_SIZE: 200 * 1024 * 1024,

  /** 絶対最大ファイルサイズ: 1GB（設定で超えられない） */
  ABSOLUTE_MAX_SIZE: 1 * 1024 * 1024 * 1024,

  /** セッション毎の最大ファイル数 */
  MAX_FILES_PER_SESSION: 100,

  /** アップロードデータのTTL: 10分 */
  UPLOAD_TTL_MS: 10 * 60 * 1000,

  /** チャンク分割閾値: 1MB */
  CHUNK_SIZE: 1 * 1024 * 1024,
} as const;
```

### 3.4 内部データ構造

```typescript
/**
 * サーバー内部でのアップロードデータ表現
 */
interface InternalUploadData {
  /** 内部識別子（UUID） */
  id: string;

  /** 元のファイル名（表示用、サニタイズ済み） */
  originalName: string;

  /** 検証済みMIMEタイプ */
  verifiedMime: string;

  /** 生データ */
  data: ArrayBuffer;

  /** ファイルサイズ */
  size: number;

  /** 検証結果 */
  validation: FileValidationResult;

  /** アップロード時刻 */
  uploadedAt: number;
}
```

---

## 4. セキュリティ設計

### 4.1 脅威モデル

| 脅威 | 説明 | 深刻度 |
|------|------|--------|
| **MIME Sniffing** | ブラウザがContent-Typeを無視してファイル内容からMIMEを推測 | High |
| **RCE** | アップロードファイルがサーバーで実行される | Critical |
| **Path Traversal** | `../../etc/passwd` などでシステムファイルにアクセス | Critical |
| **Polyglot Attack** | 複数形式として解釈可能なファイル（GIFAR等） | High |
| **DoS** | 大容量/大量ファイルでリソース枯渇 | Medium |
| **XSS** | ファイル名にスクリプトを含める | Medium |

### 4.2 対策マトリクス

| 脅威 | 対策 | 実装箇所 |
|------|------|----------|
| **MIME Sniffing** | `X-Content-Type-Options: nosniff` | レスポンスヘッダー |
| **MIME Sniffing** | `Content-Disposition: attachment` | レスポンスヘッダー |
| **MIME Sniffing** | マジックバイトによるMIME検証 | `magic-bytes.ts` |
| **RCE** | ファイルをディスクに保存しない | アーキテクチャ |
| **RCE** | 実行可能ファイルシグネチャをブロック | `magic-bytes.ts` |
| **Path Traversal** | NULLバイト除去 | `sanitize.ts` |
| **Path Traversal** | Unicode正規化 | `sanitize.ts` |
| **Path Traversal** | パス区切り文字除去 | `sanitize.ts` |
| **Path Traversal** | UUIDベースの識別子使用 | `sanitize.ts` |
| **Polyglot** | GIF内ZIPシグネチャ検出 | `polyglot-detection.ts` |
| **Polyglot** | 画像内スクリプト検出 | `polyglot-detection.ts` |
| **Polyglot** | MIME不一致検出 | `magic-bytes.ts` |
| **DoS** | ファイルサイズ制限 | クライアント・サーバー |
| **DoS** | セッション毎ファイル数制限 | `SessionManager` |
| **DoS** | TTLによる自動削除 | `SessionManager` |
| **XSS** | ファイル名サニタイズ | `sanitize.ts` |
| **XSS** | HTMLエスケープ | `escapeHtml` |

### 4.3 マジックバイト検証

```typescript
// 許可するファイルシグネチャ
const MAGIC_BYTES = {
  "image/png":  [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  "image/jpeg": [0xFF, 0xD8, 0xFF],
  "image/gif":  [0x47, 0x49, 0x46, 0x38], // GIF8
  "application/pdf": [0x25, 0x50, 0x44, 0x46, 0x2D], // %PDF-
  // ...
};

// ブロックするファイルシグネチャ
const DANGEROUS_SIGNATURES = [
  { bytes: [0x4D, 0x5A], description: "Windows executable (MZ)" },
  { bytes: [0x7F, 0x45, 0x4C, 0x46], description: "ELF executable" },
  { bytes: [0xCA, 0xFE, 0xBA, 0xBE], description: "Java class/Mach-O" },
  { bytes: [0x23, 0x21], description: "Shell script (#!)" },
  // ...
];
```

### 4.4 ファイル名サニタイズ

```typescript
function sanitizeFilename(filename: string): string {
  return filename
    // 1. NULLバイト除去
    .replace(/\0/g, "")
    // 2. Unicode正規化
    .normalize("NFC")
    // 3. URLエンコードされたパス区切り除去
    .replace(/%2F/gi, "")
    .replace(/%5C/gi, "")
    // 4. パス区切り除去
    .replace(/[/\\]/g, "")
    // 5. 連続ドット除去
    .replace(/\.{2,}/g, ".")
    // 6. 制御文字除去
    .replace(/[\x00-\x1f\x7f]/g, "")
    // 7. OS禁止文字置換
    .replace(/[<>:"|?*]/g, "_")
    // 8. 先頭末尾の空白・ドット除去
    .replace(/^[\s.]+|[\s.]+$/g, "")
    // 9. Windows予約語対策
    // 10. 長さ制限（255バイト）
    ;
}
```

### 4.5 レスポンスヘッダー

```typescript
// ファイルダウンロード時のセキュリティヘッダー
{
  "X-Content-Type-Options": "nosniff",
  "Content-Type": verifiedMime,
  "Content-Disposition": "attachment; filename=\"...\"; filename*=UTF-8''...",
  "Cache-Control": "no-store",
  "X-XSS-Protection": "1; mode=block",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "default-src 'none'; sandbox",
}
```

---

## 5. アーキテクチャ

### 5.1 システム構成

```
┌─────────────────────────────────────────────────────────────────────┐
│  Client (Browser)                                                   │
├─────────────────────────────────────────────────────────────────────┤
│  <input type="file" data-kt-event="change">                         │
│       │                                                             │
│       ▼                                                             │
│  ┌─────────────────────────────────────────┐                        │
│  │ Client-side Validation                  │                        │
│  │ - Size check                            │                        │
│  │ - Accept filter                         │                        │
│  └────────────────┬────────────────────────┘                        │
│                   │                                                 │
│                   ▼                                                 │
│  ┌─────────────────────────────────────────┐                        │
│  │ FileReader.readAsArrayBuffer()          │                        │
│  │ Base64 encode                           │                        │
│  │ Chunk split (if > 1MB)                  │                        │
│  └────────────────┬────────────────────────┘                        │
│                   │ WebSocket                                       │
└───────────────────┼─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Server (Hono)                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  WebSocket Handler                                                  │
│       │                                                             │
│       ▼                                                             │
│  ┌─────────────────────────────────────────┐                        │
│  │ Server-side Validation                  │                        │
│  │ - Size check (enforce limit)            │                        │
│  │ - Magic bytes verification              │                        │
│  │ - MIME mismatch detection               │                        │
│  │ - Polyglot detection                    │                        │
│  │ - Dangerous signature block             │                        │
│  │ - Filename sanitization                 │                        │
│  └────────────────┬────────────────────────┘                        │
│                   │                                                 │
│                   ▼                                                 │
│  ┌─────────────────────────────────────────┐                        │
│  │ SessionManager                          │                        │
│  │ ┌─────────────────────────────────────┐ │                        │
│  │ │ uploadData: Map<sessionId, Map<     │ │                        │
│  │ │   uploadId, InternalUploadData      │ │                        │
│  │ │ >>                                  │ │                        │
│  │ └─────────────────────────────────────┘ │                        │
│  │ - TTL cleanup (10 min)                  │                        │
│  │ - Session file count limit (100)        │                        │
│  └────────────────┬────────────────────────┘                        │
│                   │                                                 │
│                   ▼                                                 │
│  ┌─────────────────────────────────────────┐                        │
│  │ Script Rerun                            │                        │
│  │ file_uploader() returns UploadedFile    │                        │
│  └─────────────────────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 データフロー

```
1. ユーザーがファイルを選択
   └─▶ input[type=file] change event

2. クライアント側検証
   ├─▶ サイズチェック（設定値）
   ├─▶ acceptフィルター確認
   └─▶ 検証失敗 → エラー表示、送信中止

3. ファイル読み込み・エンコード
   ├─▶ FileReader.readAsArrayBuffer()
   ├─▶ Base64エンコード
   └─▶ 1MB超 → チャンク分割

4. WebSocket送信
   └─▶ { type: "file_upload", widgetId, files: [...] }

5. サーバー側検証
   ├─▶ サイズ再検証（絶対上限）
   ├─▶ マジックバイト検証
   ├─▶ MIME不一致検出
   ├─▶ Polyglot検出
   ├─▶ 危険シグネチャブロック
   ├─▶ ファイル名サニタイズ
   └─▶ 検証失敗 → エラー送信

6. セッション保存
   ├─▶ UUID生成
   ├─▶ uploadData Mapに保存
   └─▶ ファイル数制限チェック

7. スクリプト再実行
   ├─▶ file_uploader() が UploadedFile を返す
   └─▶ HTML差分をクライアントに送信
```

### 5.3 ファイル構成

```
src/
├── widgets/
│   ├── types.ts                 # FileUploaderConfig, UploadedFile 型定義
│   ├── file-uploader.ts         # file_uploader ウィジェット実装
│   └── uploaded-file.ts         # createUploadedFile ファクトリ
│
├── utils/
│   ├── sanitize.ts              # sanitizeFilename, generateSecureFileId
│   ├── file-validation.ts       # validateUploadedFile 統合検証
│   ├── magic-bytes.ts           # verifyMagicBytes マジックバイト検証
│   └── polyglot-detection.ts    # detectPolyglot ポリグロット検出
│
├── session/
│   └── manager.ts               # SessionManager (registerUpload, getUpload 追加)
│
├── kt/
│   └── widgets.ts               # kt.file_uploader 宣言的API
│
└── client/
    └── file-upload-handler.ts   # クライアント側ファイル処理
```

---

## 6. WebSocketプロトコル

### 6.1 クライアント → サーバー

```typescript
// ファイルアップロードメッセージ
interface FileUploadMessage {
  type: "file_upload";
  widgetId: string;
  files: FileUploadData[];
}

interface FileUploadData {
  /** 元のファイル名 */
  filename: string;
  /** ブラウザが報告したMIMEタイプ */
  mime: string;
  /** ファイルサイズ（バイト） */
  size: number;
  /** Base64エンコードされたデータ */
  data: string;
  /** チャンクインデックス（分割時） */
  chunkIndex?: number;
  /** 総チャンク数（分割時） */
  totalChunks?: number;
}
```

### 6.2 サーバー → クライアント

```typescript
// アップロードエラー
interface FileUploadErrorMessage {
  type: "file_upload_error";
  widgetId: string;
  error: FileUploadErrorCode;
  message: string;
}

type FileUploadErrorCode =
  | "SIZE_EXCEEDED"
  | "TYPE_NOT_ALLOWED"
  | "DANGEROUS_FILE"
  | "MIME_MISMATCH"
  | "POLYGLOT_DETECTED"
  | "LIMIT_EXCEEDED";
```

---

## 7. イテレーション計画

### 概要

TDDサイクル（Red → Green → Refactor）に従い、小さな単位で実装を進める。各イテレーションで1つの機能を完成させ、コミットを行う。

### Phase 1: 基盤（セキュリティユーティリティ）

#### Iteration 1.1: ファイル名サニタイズ

**目標**: パストラバーサル攻撃を防ぐファイル名サニタイズ関数

**Red（テスト作成）**:
```typescript
// test/utils/sanitize.test.ts
describe("sanitizeFilename", () => {
  it("removes path traversal sequences", () => {
    expect(sanitizeFilename("../../../etc/passwd")).toBe("etcpasswd");
  });

  it("removes null bytes", () => {
    expect(sanitizeFilename("file\0.txt")).toBe("file.txt");
  });

  it("normalizes unicode", () => {
    expect(sanitizeFilename("café.txt")).toBe("café.txt");
  });

  it("removes URL-encoded path separators", () => {
    expect(sanitizeFilename("..%2F..%2Fetc")).toBe("etc");
  });

  it("handles Windows reserved names", () => {
    expect(sanitizeFilename("CON.txt")).toBe("_CON.txt");
  });

  it("truncates to 255 bytes preserving extension", () => {
    const longName = "a".repeat(300) + ".pdf";
    const result = sanitizeFilename(longName);
    expect(new TextEncoder().encode(result).length).toBeLessThanOrEqual(255);
    expect(result.endsWith(".pdf")).toBe(true);
  });

  it("returns fallback for empty result", () => {
    expect(sanitizeFilename("...")).toMatch(/^file_\d+$/);
  });
});
```

**Green（実装）**:
- `src/utils/sanitize.ts` に `sanitizeFilename` を実装
- `generateSecureFileId` も同時に実装

**Refactor**:
- 必要に応じてヘルパー関数を抽出

**成果物**: `src/utils/sanitize.ts`, `test/utils/sanitize.test.ts`

---

#### Iteration 1.2: マジックバイト検証

**目標**: ファイルシグネチャによるMIME検証と危険ファイル検出

**Red（テスト作成）**:
```typescript
// test/utils/magic-bytes.test.ts
describe("verifyMagicBytes", () => {
  it("detects PNG correctly", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const result = verifyMagicBytes(png.buffer, "image/png");
    expect(result.detectedMime).toBe("image/png");
    expect(result.isValid).toBe(true);
  });

  it("detects MIME mismatch", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const result = verifyMagicBytes(png.buffer, "image/jpeg");
    expect(result.mismatch).toBe(true);
  });

  it("blocks Windows executable", () => {
    const exe = new Uint8Array([0x4D, 0x5A, 0x00, 0x00]);
    const result = verifyMagicBytes(exe.buffer, "application/octet-stream");
    expect(result.isDangerous).toBe(true);
    expect(result.dangerousReason).toContain("executable");
  });

  it("blocks ELF executable", () => {
    const elf = new Uint8Array([0x7F, 0x45, 0x4C, 0x46]);
    const result = verifyMagicBytes(elf.buffer, "application/octet-stream");
    expect(result.isDangerous).toBe(true);
  });

  it("blocks shell scripts", () => {
    const shell = new TextEncoder().encode("#!/bin/bash\nrm -rf /");
    const result = verifyMagicBytes(shell.buffer, "text/plain");
    expect(result.isDangerous).toBe(true);
  });
});
```

**Green（実装）**:
- `src/utils/magic-bytes.ts` を実装

**成果物**: `src/utils/magic-bytes.ts`, `test/utils/magic-bytes.test.ts`

---

#### Iteration 1.3: Polyglot検出

**目標**: 複数形式として解釈可能なファイルの検出

**Red（テスト作成）**:
```typescript
// test/utils/polyglot-detection.test.ts
describe("detectPolyglot", () => {
  it("detects GIFAR (GIF with embedded ZIP)", () => {
    // GIF header + ZIP signature embedded
    const gifar = createGifar();
    const result = detectPolyglot(gifar, "image/gif");
    expect(result.isSuspicious).toBe(true);
    expect(result.reasons[0]).toContain("ZIP");
  });

  it("detects script in image", () => {
    const imageWithScript = createImageWithScript();
    const result = detectPolyglot(imageWithScript, "image/png");
    expect(result.isSuspicious).toBe(true);
  });

  it("detects JavaScript in PDF", () => {
    const pdfWithJs = createPdfWithJavaScript();
    const result = detectPolyglot(pdfWithJs, "application/pdf");
    expect(result.isSuspicious).toBe(true);
  });

  it("passes clean files", () => {
    const cleanPng = createCleanPng();
    const result = detectPolyglot(cleanPng, "image/png");
    expect(result.isSuspicious).toBe(false);
  });
});
```

**Green（実装）**:
- `src/utils/polyglot-detection.ts` を実装

**成果物**: `src/utils/polyglot-detection.ts`, `test/utils/polyglot-detection.test.ts`

---

#### Iteration 1.4: 統合検証関数

**目標**: 全てのセキュリティチェックを統合した検証関数

**Red（テスト作成）**:
```typescript
// test/utils/file-validation.test.ts
describe("validateUploadedFile", () => {
  it("validates size", () => {
    const data = new ArrayBuffer(300 * 1024 * 1024); // 300MB
    const result = validateUploadedFile(data, "large.bin", "application/octet-stream", {
      maxSize: 200 * 1024 * 1024,
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("SIZE_EXCEEDED");
  });

  it("validates file type", () => {
    const png = createValidPng();
    const result = validateUploadedFile(png, "image.png", "image/png", {
      accept: ".pdf",
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0].code).toBe("TYPE_NOT_ALLOWED");
  });

  it("returns verified MIME", () => {
    const png = createValidPng();
    const result = validateUploadedFile(png, "image.png", "image/png", {});
    expect(result.verifiedMime).toBe("image/png");
  });

  it("treats warnings as errors in strict mode", () => {
    const suspiciousFile = createSuspiciousFile();
    const result = validateUploadedFile(suspiciousFile, "file.gif", "image/gif", {
      strictMode: true,
    });
    expect(result.valid).toBe(false);
  });
});
```

**Green（実装）**:
- `src/utils/file-validation.ts` を実装

**成果物**: `src/utils/file-validation.ts`, `test/utils/file-validation.test.ts`

---

### Phase 2: 型定義とコアモデル

#### Iteration 2.1: 型定義追加

**目標**: FileUploaderConfig, UploadedFile の型定義

**作業内容**:
- `src/widgets/types.ts` に型定義を追加
- `FILE_UPLOAD_LIMITS` 定数を追加

**成果物**: `src/widgets/types.ts` の更新

---

#### Iteration 2.2: UploadedFile実装

**目標**: UploadedFile インターフェースの実装

**Red（テスト作成）**:
```typescript
// test/widgets/uploaded-file.test.ts
describe("createUploadedFile", () => {
  it("returns correct name, size, type", () => {
    const data = new TextEncoder().encode("hello");
    const file = createUploadedFile("test.txt", "text/plain", data.buffer);
    expect(file.name).toBe("test.txt");
    expect(file.size).toBe(5);
    expect(file.type).toBe("text/plain");
  });

  it("arrayBuffer returns defensive copy", () => {
    const data = new TextEncoder().encode("hello");
    const file = createUploadedFile("test.txt", "text/plain", data.buffer);
    const buf1 = file.arrayBuffer();
    const buf2 = file.arrayBuffer();
    expect(buf1).not.toBe(buf2); // 異なるインスタンス
  });

  it("text returns UTF-8 decoded string", () => {
    const data = new TextEncoder().encode("こんにちは");
    const file = createUploadedFile("test.txt", "text/plain", data.buffer);
    expect(file.text()).toBe("こんにちは");
  });

  it("stream returns ReadableStream", async () => {
    const data = new TextEncoder().encode("stream test");
    const file = createUploadedFile("test.txt", "text/plain", data.buffer);
    const reader = file.stream().getReader();
    const { value } = await reader.read();
    expect(new TextDecoder().decode(value)).toBe("stream test");
  });
});
```

**Green（実装）**:
- `src/widgets/uploaded-file.ts` を実装

**成果物**: `src/widgets/uploaded-file.ts`, `test/widgets/uploaded-file.test.ts`

---

### Phase 3: セッション管理

#### Iteration 3.1: アップロードデータ管理

**目標**: SessionManagerにアップロード管理機能を追加

**Red（テスト作成）**:
```typescript
// test/session/upload-management.test.ts
describe("SessionManager upload management", () => {
  it("registers upload and returns ID", () => {
    const manager = new SessionManager();
    const data = new ArrayBuffer(100);
    const id = manager.registerUpload("session1", data, "test.txt", "text/plain");
    expect(id).toBeDefined();
    expect(typeof id).toBe("string");
  });

  it("retrieves uploaded data", () => {
    const manager = new SessionManager();
    const data = new TextEncoder().encode("content").buffer;
    const id = manager.registerUpload("session1", data, "test.txt", "text/plain");
    const upload = manager.getUpload("session1", id!);
    expect(upload?.originalName).toBe("test.txt");
  });

  it("enforces file count limit per session", () => {
    const manager = new SessionManager();
    for (let i = 0; i < 100; i++) {
      manager.registerUpload("session1", new ArrayBuffer(10), `file${i}.txt`, "text/plain");
    }
    const id = manager.registerUpload("session1", new ArrayBuffer(10), "overflow.txt", "text/plain");
    expect(id).toBeNull();
  });

  it("cleans up expired uploads", async () => {
    const manager = new SessionManager();
    // TTLを短くしてテスト
  });

  it("deletes uploads when session is destroyed", () => {
    const manager = new SessionManager();
    manager.registerUpload("session1", new ArrayBuffer(10), "test.txt", "text/plain");
    manager.destroySession("session1");
    // uploads should be empty
  });
});
```

**Green（実装）**:
- `src/session/manager.ts` に `registerUpload`, `getUpload`, `cleanupUploads` を追加

**成果物**: `src/session/manager.ts` の更新, `test/session/upload-management.test.ts`

---

### Phase 4: ウィジェット実装

#### Iteration 4.1: file_uploader ロジック層

**目標**: file_uploader 関数の状態管理ロジック

**Red（テスト作成）**:
```typescript
// test/widgets/file-uploader.test.ts
describe("file_uploader", () => {
  it("returns null when no file uploaded", () => {
    const file = file_uploader("Upload");
    expect(file).toBeNull();
  });

  it("returns UploadedFile when file exists in state", () => {
    // セッション状態にファイルを設定
    setWidgetValue("test-widget", { /* upload data */ });
    const file = file_uploader("Upload", { key: "test-widget" });
    expect(file).not.toBeNull();
    expect(file?.name).toBe("test.txt");
  });

  it("returns array when multiple: true", () => {
    const files = file_uploader("Upload", { multiple: true });
    expect(Array.isArray(files)).toBe(true);
  });
});
```

**Green（実装）**:
- `src/widgets/file-uploader.ts` の状態管理ロジック

**成果物**: `src/widgets/file-uploader.ts`, `test/widgets/file-uploader.test.ts`

---

#### Iteration 4.2: file_uploader レンダリング層

**目標**: file_uploader のHTML生成

**Red（テスト作成）**:
```typescript
// test/widgets/file-uploader-render.test.ts
describe("renderFileUploader", () => {
  it("renders input with correct attributes", () => {
    const html = renderFileUploader("Upload file", {});
    expect(html).toContain('type="file"');
    expect(html).toContain('data-kt-event="change"');
  });

  it("includes accept attribute", () => {
    const html = renderFileUploader("Upload", { accept: "image/*" });
    expect(html).toContain('accept="image/*"');
  });

  it("includes multiple attribute", () => {
    const html = renderFileUploader("Upload", { multiple: true });
    expect(html).toContain("multiple");
  });

  it("escapes label for XSS prevention", () => {
    const html = renderFileUploader("<script>alert(1)</script>", {});
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("includes data-max-size for client validation", () => {
    const html = renderFileUploader("Upload", { maxSize: 1024 });
    expect(html).toContain('data-max-size="1024"');
  });
});
```

**Green（実装）**:
- `src/widgets/file-uploader.ts` に `renderFileUploader` を追加

**成果物**: `src/widgets/file-uploader.ts` の更新

---

#### Iteration 4.3: kt.file_uploader 宣言的API

**目標**: kt名前空間への統合

**Red（テスト作成）**:
```typescript
// test/kt/file-uploader.test.ts
describe("kt.file_uploader", () => {
  it("appends HTML to render context", () => {
    const ctx = createMockRenderContext();
    setRenderContext(ctx);
    kt.file_uploader("Upload");
    expect(ctx.getHtml()).toContain('type="file"');
  });

  it("returns value from state", () => {
    // ...
  });
});
```

**Green（実装）**:
- `src/kt/widgets.ts` に `file_uploader` を追加

**成果物**: `src/kt/widgets.ts` の更新

---

### Phase 5: クライアント側実装

#### Iteration 5.1: ファイル読み込み・エンコード

**目標**: クライアント側のファイル読み込みとBase64エンコード

**作業内容**:
- `src/client/file-upload-handler.ts` を作成
- FileReader処理
- Base64エンコード
- チャンク分割

**成果物**: `src/client/file-upload-handler.ts`

---

#### Iteration 5.2: WebSocket送信

**目標**: アップロードメッセージの送信

**作業内容**:
- file_upload メッセージ送信
- チャンク送信
- 進捗表示（オプション）

**成果物**: `src/client/file-upload-handler.ts` の更新

---

### Phase 6: サーバー側WebSocket処理

#### Iteration 6.1: アップロードメッセージ受信

**目標**: WebSocketでのアップロード受信と検証

**Red（テスト作成）**:
```typescript
// test/app/file-upload-handler.test.ts
describe("WebSocket file upload handler", () => {
  it("validates and stores uploaded file", async () => {
    // WebSocketメッセージをシミュレート
  });

  it("rejects oversized files", async () => {
    // エラーレスポンスを検証
  });

  it("rejects dangerous files", async () => {
    // 実行可能ファイルの拒否を検証
  });
});
```

**Green（実装）**:
- `src/app.ts` のWebSocketハンドラーを更新

**成果物**: `src/app.ts` の更新

---

#### Iteration 6.2: エラーハンドリング

**目標**: アップロードエラーのクライアント通知

**作業内容**:
- エラーメッセージ送信
- クライアント側エラー表示

**成果物**: エラー処理の完成

---

### Phase 7: セキュリティレスポンスヘッダー

#### Iteration 7.1: セキュアなファイルダウンロード

**目標**: アップロードファイル再ダウンロード時のセキュリティヘッダー

**Red（テスト作成）**:
```typescript
// test/app/secure-download.test.ts
describe("secure file download", () => {
  it("includes X-Content-Type-Options: nosniff", async () => {
    const res = await app.request("/download/xxx");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("forces download with Content-Disposition", async () => {
    const res = await app.request("/download/xxx");
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
  });

  it("includes CSP sandbox", async () => {
    const res = await app.request("/download/xxx");
    expect(res.headers.get("Content-Security-Policy")).toContain("sandbox");
  });
});
```

**Green（実装）**:
- セキュリティヘッダー付きレスポンス生成

**成果物**: セキュアダウンロード機能

---

### Phase 8: E2Eテスト・ドキュメント

#### Iteration 8.1: E2Eテスト

**目標**: Playwrightによる統合テスト

**作業内容**:
- ファイルアップロードフロー全体のテスト
- エラーケースのテスト

**成果物**: `e2e/file-upload.spec.ts`

---

#### Iteration 8.2: 型エクスポート・公開API整理

**目標**: 公開APIの整理とエクスポート

**作業内容**:
- `src/index.ts` の更新
- 型のエクスポート

**成果物**: 公開API完成

---

## 8. チェックリスト

### 実装前

- [ ] 既存のウィジェット実装パターンを確認
- [ ] SessionManagerの現在の実装を確認
- [ ] クライアント側イベント処理の仕組みを確認

### 各イテレーション後

- [ ] `bun run lint:fix` 実行
- [ ] `bun run test` 実行（該当テストがパス）
- [ ] コミット

### 完了時

- [ ] `bun run ci` 全パス
- [ ] 全セキュリティ対策が実装されている
- [ ] E2Eテストがパス

---

## 9. 参考資料

- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [List of file signatures (Wikipedia)](https://en.wikipedia.org/wiki/List_of_file_signatures)
- [Streamlit file_uploader API](https://docs.streamlit.io/library/api-reference/widgets/st.file_uploader)
- [MDN File API](https://developer.mozilla.org/en-US/docs/Web/API/File)
- [MDN Blob API](https://developer.mozilla.org/en-US/docs/Web/API/Blob)
