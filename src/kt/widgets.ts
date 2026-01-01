import { button as imperativeButton, renderButton } from "../widgets/button";
import { selectbox as imperativeSelectbox, renderSelectbox } from "../widgets/selectbox";
import { slider as imperativeSlider, renderSlider } from "../widgets/slider";
import { text_input as imperativeTextInput, renderTextInput } from "../widgets/text-input";
import type {
	ButtonConfig,
	SelectboxConfig,
	SliderConfig,
	TextInputConfig,
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
