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

// ============================================================================
// Line Chart Types
// ============================================================================

/**
 * 折れ線グラフのデータ形式
 *
 * - number[]: 単純な数値配列（x軸はインデックス）
 * - Record<string, unknown>[]: オブジェクト配列（カラム名で x/y を指定）
 * - number[][]: 2D配列（各行が1データポイント、各列が1シリーズ）
 * - { columns, data }: 明示的な形式
 */
export type LineChartData =
	| number[]
	| Record<string, unknown>[]
	| number[][]
	| { columns: string[]; data: number[][] };

/**
 * 折れ線グラフの設定
 */
export interface LineChartConfig {
	/** x軸のカラム名（省略時: インデックスまたは最初の非数値カラム） */
	x?: string;

	/** y軸のカラム名（複数可、省略時: すべての数値カラム） */
	y?: string | string[];

	/** x軸ラベル */
	x_label?: string;

	/** y軸ラベル */
	y_label?: string;

	/** 線の色（HEX文字列、複数シリーズの場合は配列） */
	color?: string | string[];

	/** グラフの高さ（ピクセル、デフォルト: 400） */
	height?: number;

	/** コンテナ幅に合わせる（デフォルト: true） */
	use_container_width?: boolean;
}

/**
 * 正規化されたチャートシリーズ
 */
export interface NormalizedSeries {
	/** シリーズ名 */
	name: string;
	/** データポイント [x, y] の配列 */
	points: [number, number][];
}

/**
 * 正規化されたチャートデータ
 */
export interface NormalizedChartData {
	/** シリーズ一覧 */
	series: NormalizedSeries[];
	/** x軸ラベル一覧（文字列表示用） */
	xLabels: string[];
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
