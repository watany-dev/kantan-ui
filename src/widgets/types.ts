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
	defaultValue?: string;
	min?: string;
	max?: string;
	key?: string;
	disabled?: boolean;
}

export interface TimeInputConfig {
	label: string;
	defaultValue?: string;
	step?: number;
	key?: string;
	disabled?: boolean;
}
