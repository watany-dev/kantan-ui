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
