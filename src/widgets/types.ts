// Widget の基本インターフェース
export interface WidgetConfig<T = unknown> {
	id: string;
	label: string;
	defaultValue: T;
}

// Widget の状態
export interface WidgetState<T = unknown> {
	value: T;
}

// Widget レンダリング結果
export interface WidgetRenderResult {
	html: string;
	id: string;
}

// 各 Widget の設定
export interface ButtonConfig {
	label: string;
	key?: string;
	disabled?: boolean;
}

export interface SliderConfig {
	label: string;
	min: number;
	max: number;
	defaultValue?: number;
	step?: number;
	key?: string;
	disabled?: boolean;
}

export interface TextInputConfig {
	label: string;
	defaultValue?: string;
	placeholder?: string;
	key?: string;
	disabled?: boolean;
	maxLength?: number;
	type?: "text" | "password" | "email" | "tel" | "url";
}

export interface SelectboxConfig {
	label: string;
	options: string[];
	defaultValue?: string;
	key?: string;
	disabled?: boolean;
}

export interface DownloadButtonConfig {
	key?: string;
	mime?: string;
	disabled?: boolean;
}

export interface CheckboxConfig {
	label: string;
	defaultValue?: boolean;
	key?: string;
	disabled?: boolean;
}

export interface RadioConfig {
	label: string;
	options: string[];
	defaultValue?: string;
	key?: string;
	disabled?: boolean;
	horizontal?: boolean;
}

export interface NumberInputConfig {
	label: string;
	min?: number;
	max?: number;
	defaultValue?: number;
	step?: number;
	key?: string;
	disabled?: boolean;
}

export interface TextAreaConfig {
	label: string;
	defaultValue?: string;
	placeholder?: string;
	height?: number;
	maxChars?: number;
	key?: string;
	disabled?: boolean;
}

export interface ToggleConfig {
	label: string;
	defaultValue?: boolean;
	key?: string;
	disabled?: boolean;
}

export interface MultiselectConfig {
	label: string;
	options: string[];
	defaultValue?: string[];
	key?: string;
	maxSelections?: number;
	disabled?: boolean;
}

export interface DateInputConfig {
	label: string;
	defaultValue?: string | Date;
	min?: string | Date;
	max?: string | Date;
	key?: string;
	disabled?: boolean;
}

export interface TimeInputConfig {
	label: string;
	defaultValue?: string | Date;
	step?: number;
	key?: string;
	disabled?: boolean;
}

/**
 * 画像ソースの型
 * - string: URL, data URI, または SVG文字列
 * - Uint8Array: バイナリデータ（mimeType必須）
 * - ArrayBuffer: バイナリデータ（mimeType必須）
 * - Blob: Blobオブジェクト
 */
export type ImageSource = string | Uint8Array | ArrayBuffer | Blob;

export interface ImageConfig {
	/**
	 * 画像のキャプション
	 * 複数画像の場合は配列で指定
	 */
	caption?: string | string[];

	/**
	 * 画像の幅（ピクセル）
	 * useContainerWidth と併用不可
	 */
	width?: number;

	/**
	 * コンテナ幅に合わせる
	 * true の場合、width は無視される
	 */
	useContainerWidth?: boolean;

	/**
	 * アクセシビリティ用の代替テキスト
	 * 指定しない場合は caption が使用される
	 * 複数画像の場合は配列で指定
	 */
	alt?: string | string[];

	/**
	 * バイナリデータのMIMEタイプ
	 * Uint8Array / ArrayBuffer 使用時は必須
	 * @example "image/png", "image/jpeg", "image/webp"
	 */
	mimeType?: string;

	/**
	 * ウィジェットの一意キー
	 */
	key?: string;
}

// ============================================================================
// Audio Types
// ============================================================================

/**
 * オーディオソースの型
 * - string: URL または data URI
 * - Uint8Array: バイナリデータ（mimeType必須）
 * - ArrayBuffer: バイナリデータ（mimeType必須）
 */
export type AudioSource = string | Uint8Array | ArrayBuffer;

export interface AudioConfig {
	/**
	 * オーディオのMIMEタイプ
	 * URL の場合はブラウザが自動検出するため省略可
	 * バイナリデータの場合は必須
	 * @default "audio/wav"
	 * @example "audio/mp3", "audio/ogg", "audio/wav"
	 */
	mimeType?: string;

	/**
	 * ループ再生
	 * @default false
	 */
	loop?: boolean;

	/**
	 * 自動再生
	 * ※ 多くのブラウザではユーザー操作なしの自動再生がブロックされます
	 * @default false
	 */
	autoplay?: boolean;

	/**
	 * ウィジェットの一意キー
	 */
	key?: string;
}

// ============================================================================
// Video Types
// ============================================================================

/**
 * 動画ソースの型
 * - string: URL または data URI
 * - Uint8Array: バイナリデータ（mimeType必須）
 * - ArrayBuffer: バイナリデータ（mimeType必須）
 */
export type VideoSource = string | Uint8Array | ArrayBuffer;

/**
 * 字幕トラックの定義
 *
 * W3C HTML5 <track> 要素に対応する型。
 * srclang を明示的に管理することで、スクリーンリーダーや
 * ブラウザの字幕選択UIが正しく動作する。
 */
export interface SubtitleTrack {
	/** VTT ファイルの URL */
	src: string;

	/**
	 * BCP 47 言語タグ
	 * @example "ja", "en", "zh-Hans"
	 * @see https://www.w3.org/International/articles/language-tags/
	 */
	srclang: string;

	/**
	 * ユーザーに表示されるラベル
	 * @example "日本語", "English"
	 */
	label: string;
}

export interface VideoConfig {
	/**
	 * バイナリデータのMIMEタイプ
	 * Uint8Array / ArrayBuffer 使用時は必須。
	 * "video/" プレフィックスで始まる値のみ受け付ける。
	 * @example "video/mp4", "video/webm", "video/ogg"
	 */
	mimeType?: string;

	/**
	 * 再生開始位置（秒）
	 * 0以上の有限数であること。負値・NaN・Infinityはエラー。
	 * @default 0
	 */
	startTime?: number;

	/**
	 * 再生終了位置（秒）
	 * startTime より大きい有限数であること。
	 * 未指定の場合は動画の最後まで再生。
	 */
	endTime?: number;

	/**
	 * 字幕（WebVTT）
	 * - SubtitleTrack: 単一言語の字幕
	 * - SubtitleTrack[]: 複数言語の字幕（最初のトラックがデフォルト）
	 */
	subtitles?: SubtitleTrack | SubtitleTrack[];

	/**
	 * ループ再生
	 * @default false
	 */
	loop?: boolean;

	/**
	 * 自動再生
	 * ブラウザポリシーにより、muted: true との併用が推奨される。
	 * @default false
	 */
	autoplay?: boolean;

	/**
	 * ミュート（消音）
	 * @default false
	 */
	muted?: boolean;

	/**
	 * ポスター画像の URL
	 * 動画の読み込み前・再生前に表示されるサムネイル。
	 * @example "https://example.com/thumbnail.jpg"
	 */
	poster?: string;

	/**
	 * インライン再生（モバイル対応）
	 * iOS Safari でフルスクリーンに遷移せずインライン再生を行う。
	 * @default true
	 */
	playsinline?: boolean;

	/**
	 * ウィジェットの一意キー
	 */
	key?: string;
}

// ============================================================================
// File Uploader Types
// ============================================================================

/**
 * File upload limits
 */
export const FILE_UPLOAD_LIMITS = {
	/** Default maximum file size: 200MB */
	DEFAULT_MAX_SIZE: 200 * 1024 * 1024,

	/** Absolute maximum file size: 1GB (cannot be exceeded by config) */
	ABSOLUTE_MAX_SIZE: 1 * 1024 * 1024 * 1024,

	/** Maximum files per session */
	MAX_FILES_PER_SESSION: 100,

	/** Upload data TTL: 10 minutes */
	UPLOAD_TTL_MS: 10 * 60 * 1000,

	/** Chunk size threshold: 1MB */
	CHUNK_SIZE: 1 * 1024 * 1024,
} as const;

/**
 * Represents an uploaded file
 * Follows Web standard File/Blob API interface
 */
export interface UploadedFile {
	/** Sanitized filename */
	readonly name: string;

	/** File size in bytes */
	readonly size: number;

	/** Verified MIME type */
	readonly type: string;

	/** Get binary data (defensive copy) */
	arrayBuffer(): ArrayBuffer;

	/** Get content as text (UTF-8) */
	text(): string;

	/** Get content as ReadableStream */
	stream(): ReadableStream<Uint8Array>;
}

/**
 * Configuration options for file_uploader
 */
export interface FileUploaderConfig {
	/** Accepted file types (MIME type or extension) */
	accept?: string | readonly string[];

	/** Allow multiple files (default: false) */
	multiple?: boolean;

	/** Maximum file size in bytes (default: 200MB) */
	maxSize?: number;

	/** Widget key */
	key?: string;

	/** Disable the widget */
	disabled?: boolean;

	/** Help text */
	help?: string;

	/** Strict mode: treat warnings as errors (default: false) */
	strictMode?: boolean;

	/** Enable polyglot detection (default: true) */
	detectPolyglot?: boolean;

	/** Enable magic bytes verification (default: true) */
	verifyMagicBytes?: boolean;
}

/**
 * Internal upload data stored in session
 */
export interface InternalUploadData {
	/** Internal identifier (UUID) */
	id: string;

	/** Original filename (sanitized, for display) */
	originalName: string;

	/** Verified MIME type */
	verifiedMime: string;

	/** Raw binary data */
	data: ArrayBuffer;

	/** File size in bytes */
	size: number;

	/** Upload timestamp */
	uploadedAt: number;
}

// ============================================================================
// Dataframe Types
// ============================================================================

/**
 * 行選択モード
 * - "single-row": 1行のみ選択可能
 * - "multi-row": 複数行選択可能
 */
export type DataframeSelectionMode = "single-row" | "multi-row";

/**
 * 選択結果
 */
export interface DataframeSelection {
	/** 選択された行のインデックス配列 */
	rows: number[];
}

/**
 * dataframe設定
 */
export interface DataframeConfig {
	/** コンテナの高さ（px）。デフォルト: 400 */
	height?: number;
	/** インデックス列を非表示。デフォルト: false */
	hideIndex?: boolean;
	/** カラム表示順序 */
	columnOrder?: string[];
	/** ウィジェットキー */
	key?: string;
	/** 選択動作: "ignore"=選択無効, "rerun"=選択時に再実行 */
	onSelect?: "ignore" | "rerun";
	/** 選択モード */
	selectionMode?: DataframeSelectionMode;
}

// ============================================================================
// Empty (Placeholder) Types
// ============================================================================

/**
 * Configuration options for kt.empty()
 */
export interface EmptyConfig {
	/** Widget key for state persistence */
	key?: string;
}

/**
 * チャット入力の設定
 */
export interface ChatInputConfig {
	/** ウィジェットの一意キー */
	key?: string;

	/** 無効化 */
	disabled?: boolean;

	/** 最大文字数 */
	maxLength?: number;

	/** 画面下部に固定表示（デフォルト: true） */
	pinToBottom?: boolean;

	/** 送信ボタンのラベル（デフォルト: "送信"） */
	submitLabel?: string;

	/** 送信ボタンを非表示にする */
	hideSubmitButton?: boolean;
}

/**
 * カラーピッカーの設定
 */
export interface ColorPickerConfig {
	/** ウィジェットの一意キー（状態保持用） */
	key?: string;

	/** 無効化フラグ */
	disabled?: boolean;
}

/**
 * Placeholder content type
 */
export type PlaceholderContentType =
	| "empty"
	| "write"
	| "text"
	| "markdown"
	| "html"
	| "json"
	| "code"
	| "success"
	| "error"
	| "warning"
	| "info"
	| "progress"
	| "spinner"
	| "button"
	| "image";

/**
 * Internal placeholder state stored in session
 */
export interface PlaceholderState {
	/** Current HTML content */
	html: string;

	/** Content type */
	contentType: PlaceholderContentType;

	/** Widget value (for button, etc.) */
	widgetValue?: unknown;
}

/**
 * Progress bar configuration
 */
export interface ProgressConfig {
	/** Text to display alongside the progress bar */
	text?: string;
}

/**
 * Placeholder object for dynamic content updates
 * Similar to Streamlit's st.empty()
 */
export interface Placeholder {
	// ========== Identifier ==========
	/** Placeholder ID */
	readonly id: string;

	// ========== Output Methods ==========
	/** Display text/number/boolean */
	write(content: string | number | boolean): void;

	/** Display plain text */
	text(content: string): void;

	/** Display markdown */
	markdown(content: string): void;

	/** Display raw HTML (caution: XSS risk) */
	html(content: string): void;

	/** Display formatted JSON */
	json(data: unknown): void;

	/** Display code block */
	code(content: string, language?: string): void;

	// ========== Alert Methods ==========
	/** Success message */
	success(message: string): void;

	/** Error message */
	error(message: string): void;

	/** Warning message */
	warning(message: string): void;

	/** Info message */
	info(message: string): void;

	// ========== Feedback Methods ==========
	/** Progress bar (0.0 ~ 1.0) */
	progress(value: number, config?: ProgressConfig): void;

	/** Spinner (loading indicator) */
	spinner(text?: string): void;

	// ========== Control Methods ==========
	/** Clear content */
	empty(): void;
}
