import { button as imperativeButton, renderButton } from "../widgets/button";
import { checkbox as imperativeCheckbox, renderCheckbox } from "../widgets/checkbox";
import { color_picker as imperativeColorPicker, renderColorPicker } from "../widgets/color-picker";
import { date_input as imperativeDateInput, renderDateInput } from "../widgets/date-input";
import { download_button as imperativeDownloadButton } from "../widgets/download-button";
import { getFileUploaderValue, renderFileUploader } from "../widgets/file-uploader";
import { multiselect as imperativeMultiselect, renderMultiselect } from "../widgets/multiselect";
import { number_input as imperativeNumberInput, renderNumberInput } from "../widgets/number-input";
import { radio as imperativeRadio, renderRadio } from "../widgets/radio";
import { generateWidgetId } from "../widgets/registry";
import { selectbox as imperativeSelectbox, renderSelectbox } from "../widgets/selectbox";
import { slider as imperativeSlider, renderSlider } from "../widgets/slider";
import { text_area as imperativeTextArea, renderTextArea } from "../widgets/text-area";
import { text_input as imperativeTextInput, renderTextInput } from "../widgets/text-input";
import { time_input as imperativeTimeInput, renderTimeInput } from "../widgets/time-input";
import { toggle as imperativeToggle, renderToggle } from "../widgets/toggle";
import type {
	ButtonConfig,
	CheckboxConfig,
	ColorPickerConfig,
	DateInputConfig,
	DownloadButtonConfig,
	FileUploaderConfig,
	MultiselectConfig,
	NumberInputConfig,
	RadioConfig,
	SelectboxConfig,
	SliderConfig,
	TextAreaConfig,
	TextInputConfig,
	TimeInputConfig,
	ToggleConfig,
	UploadedFile,
} from "../widgets/types";
import { requireRenderContext } from "./context";
import { wrapWidget } from "./widget-helper";

/**
 * ボタンウィジェット（宣言的API）
 * HTMLを自動出力し、押された rerun でのみ true を返す
 */
export function button(label: string, config?: Partial<ButtonConfig>): boolean {
	return wrapWidget(
		config,
		(cfg) => imperativeButton(label, cfg),
		(_value, cfg) => renderButton(label, cfg),
	);
}

/**
 * スライダーウィジェット（宣言的API）
 * HTMLを自動出力し、現在の値を返す
 */
export function slider(
	label: string,
	min: number,
	max: number,
	defaultValue?: number,
	config?: Partial<SliderConfig>,
): number {
	return wrapWidget(
		config,
		(cfg) => imperativeSlider(label, min, max, defaultValue, cfg),
		(value, cfg) => renderSlider(label, min, max, value, cfg),
	);
}

/**
 * テキスト入力ウィジェット（宣言的API）
 * HTMLを自動出力し、現在の値を返す
 */
export function text_input(
	label: string,
	defaultValue?: string,
	config?: Partial<TextInputConfig>,
): string {
	return wrapWidget(
		config,
		(cfg) => imperativeTextInput(label, defaultValue, cfg),
		(value, cfg) => renderTextInput(label, value, cfg),
	);
}

/**
 * セレクトボックスウィジェット（宣言的API）
 * HTMLを自動出力し、選択された値を返す
 */
export function selectbox(
	label: string,
	options: string[],
	defaultValue?: string,
	config?: Partial<SelectboxConfig>,
): string {
	return wrapWidget(
		config,
		(cfg) => imperativeSelectbox(label, options, defaultValue, cfg),
		(value, cfg) => renderSelectbox(label, options, value, cfg),
	);
}

/**
 * ダウンロードボタンウィジェット（宣言的API）
 * HTMLを自動出力し、クリックされたかどうかを返す
 */
export function download_button(
	label: string,
	data: string | ArrayBuffer,
	filename: string,
	config?: DownloadButtonConfig,
): boolean {
	// download_buttonは直接実装されており、wrapWidgetを使用しない
	return imperativeDownloadButton(label, data, filename, config);
}

/**
 * チェックボックスウィジェット（宣言的API）
 * HTMLを自動出力し、チェック状態を返す
 */
export function checkbox(
	label: string,
	defaultValue?: boolean,
	config?: Partial<CheckboxConfig>,
): boolean {
	return wrapWidget(
		config,
		(cfg) => imperativeCheckbox(label, defaultValue, cfg),
		(value, cfg) => renderCheckbox(label, value, cfg),
	);
}

/**
 * カラーピッカーウィジェット（宣言的API）
 * HTMLを自動出力し、選択された色を返す
 *
 * @param label - ラベル
 * @param defaultValue - デフォルト色（HEX形式、例: "#ff0000"）
 * @param config - 設定
 * @returns 選択された色（HEX形式 "#RRGGBB"）
 *
 * @example
 * ```typescript
 * const color = kt.color_picker("Pick a color");
 * // → "#000000"
 *
 * const themeColor = kt.color_picker("Theme color", "#3498db");
 * // → "#3498db"
 * ```
 */
export function color_picker(
	label: string,
	defaultValue?: string,
	config?: Partial<ColorPickerConfig>,
): string {
	return wrapWidget(
		config,
		(cfg) => imperativeColorPicker(label, defaultValue, cfg),
		(value, cfg) => renderColorPicker(label, value, cfg),
	);
}

/**
 * ラジオボタンウィジェット（宣言的API）
 * HTMLを自動出力し、選択された値を返す
 */
export function radio(
	label: string,
	options: string[],
	defaultValue?: string,
	config?: Partial<RadioConfig>,
): string {
	return wrapWidget(
		config,
		(cfg) => imperativeRadio(label, options, defaultValue, cfg),
		(value, cfg) => renderRadio(label, options, value, cfg),
	);
}

/**
 * 数値入力ウィジェット（宣言的API）
 * HTMLを自動出力し、入力された数値を返す
 */
export function number_input(
	label: string,
	min?: number,
	max?: number,
	defaultValue?: number,
	config?: Partial<NumberInputConfig>,
): number {
	return wrapWidget(
		config,
		(cfg) => imperativeNumberInput(label, min, max, defaultValue, cfg),
		(value, cfg) => renderNumberInput(label, min, max, value, cfg),
	);
}

/**
 * テキストエリアウィジェット（宣言的API）
 * HTMLを自動出力し、入力されたテキストを返す
 */
export function text_area(
	label: string,
	defaultValue?: string,
	config?: Partial<TextAreaConfig>,
): string {
	return wrapWidget(
		config,
		(cfg) => imperativeTextArea(label, defaultValue, cfg),
		(value, cfg) => renderTextArea(label, value, cfg),
	);
}

/**
 * トグルウィジェット（宣言的API）
 * HTMLを自動出力し、トグル状態を返す
 */
export function toggle(
	label: string,
	defaultValue?: boolean,
	config?: Partial<ToggleConfig>,
): boolean {
	return wrapWidget(
		config,
		(cfg) => imperativeToggle(label, defaultValue, cfg),
		(value, cfg) => renderToggle(label, value, cfg),
	);
}

/**
 * マルチセレクトウィジェット（宣言的API）
 * HTMLを自動出力し、選択された値の配列を返す
 */
export function multiselect(
	label: string,
	options: string[],
	defaultValue?: string[],
	config?: Partial<MultiselectConfig>,
): string[] {
	return wrapWidget(
		config,
		(cfg) => imperativeMultiselect(label, options, defaultValue, cfg),
		(value, cfg) => renderMultiselect(label, options, value, cfg),
	);
}

/**
 * 日付入力ウィジェット（宣言的API）
 * HTMLを自動出力し、現在の値を返す（"YYYY-MM-DD" 形式）
 *
 * @param label - ラベル
 * @param defaultValue - デフォルト値（string または Date）
 * @param config - 設定（min, max も Date 対応）
 * @returns "YYYY-MM-DD" 形式の文字列
 */
export function date_input(
	label: string,
	defaultValue?: string | Date,
	config?: Partial<DateInputConfig>,
): string {
	return wrapWidget(
		config,
		(cfg) => imperativeDateInput(label, defaultValue, cfg),
		(value, cfg) => renderDateInput(label, value, cfg),
	);
}

/**
 * 時刻入力ウィジェット（宣言的API）
 * HTMLを自動出力し、現在の値を返す（"HH:MM" または "HH:MM:SS" 形式）
 *
 * @param label - ラベル
 * @param defaultValue - デフォルト値（string または Date）
 * @param config - 設定
 * @returns "HH:MM" または "HH:MM:SS" 形式の文字列
 */
export function time_input(
	label: string,
	defaultValue?: string | Date,
	config?: Partial<TimeInputConfig>,
): string {
	return wrapWidget(
		config,
		(cfg) => imperativeTimeInput(label, defaultValue, cfg),
		(value, cfg) => renderTimeInput(label, value, cfg),
	);
}

/**
 * ファイルアップローダーウィジェット（宣言的API）
 * HTMLを自動出力し、アップロードされたファイルを返す
 *
 * @param label - ラベル
 * @param config - 設定（accept, multiple, maxSize など）
 * @returns 単一モード: UploadedFile | null, 複数モード: UploadedFile[]
 *
 * @example
 * ```typescript
 * // 単一ファイル
 * const file = kt.file_uploader("Upload file");
 * if (file) {
 *   kt.write(`Uploaded: ${file.name}`);
 * }
 *
 * // 複数ファイル
 * const files = kt.file_uploader("Upload files", { multiple: true });
 * for (const file of files) {
 *   kt.write(`Uploaded: ${file.name}`);
 * }
 *
 * // 画像のみ許可
 * const image = kt.file_uploader("Upload image", { accept: "image/*" });
 * ```
 */
export function file_uploader(
	label: string,
	config?: Partial<FileUploaderConfig>,
): UploadedFile | UploadedFile[] | null {
	const ctx = requireRenderContext();
	const id = generateWidgetId(config?.key);
	const configWithId = { ...config, key: id };
	const multiple = config?.multiple ?? false;

	// HTMLをレンダリングして出力
	ctx.append(renderFileUploader(label, configWithId));

	// 現在の値を取得して返す
	return getFileUploaderValue(id, multiple);
}
