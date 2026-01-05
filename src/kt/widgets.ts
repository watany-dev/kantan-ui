import { button as imperativeButton, renderButton } from "../widgets/button";
import { checkbox as imperativeCheckbox, renderCheckbox } from "../widgets/checkbox";
import { number_input as imperativeNumberInput, renderNumberInput } from "../widgets/number-input";
import { radio as imperativeRadio, renderRadio } from "../widgets/radio";
import { selectbox as imperativeSelectbox, renderSelectbox } from "../widgets/selectbox";
import { slider as imperativeSlider, renderSlider } from "../widgets/slider";
import { text_area as imperativeTextArea, renderTextArea } from "../widgets/text-area";
import { text_input as imperativeTextInput, renderTextInput } from "../widgets/text-input";
import { toggle as imperativeToggle, renderToggle } from "../widgets/toggle";
import type {
	ButtonConfig,
	CheckboxConfig,
	NumberInputConfig,
	RadioConfig,
	SelectboxConfig,
	SliderConfig,
	TextAreaConfig,
	TextInputConfig,
	ToggleConfig,
} from "../widgets/types";
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
