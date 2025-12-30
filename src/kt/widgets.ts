import { button as imperativeButton, renderButton } from "../widgets/button";
import { generateWidgetId } from "../widgets/registry";
import { selectbox as imperativeSelectbox, renderSelectbox } from "../widgets/selectbox";
import { slider as imperativeSlider, renderSlider } from "../widgets/slider";
import { text_input as imperativeTextInput, renderTextInput } from "../widgets/text-input";
import type {
	ButtonConfig,
	SelectboxConfig,
	SliderConfig,
	TextInputConfig,
} from "../widgets/types";
import { requireRenderContext } from "./context";

/**
 * ボタンウィジェット（宣言的API）
 * HTMLを自動出力し、押された rerun でのみ true を返す
 */
export function button(label: string, config?: Partial<ButtonConfig>): boolean {
	const ctx = requireRenderContext();
	// IDを先に生成してロジックとレンダリングで共有
	const id = generateWidgetId(config?.key);
	const configWithId = { ...config, key: id };
	const pressed = imperativeButton(label, configWithId);
	ctx.append(renderButton(label, configWithId));
	return pressed;
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
	const ctx = requireRenderContext();
	// IDを先に生成してロジックとレンダリングで共有
	const id = generateWidgetId(config?.key);
	const configWithId = { ...config, key: id };
	const value = imperativeSlider(label, min, max, defaultValue, configWithId);
	ctx.append(renderSlider(label, min, max, value, configWithId));
	return value;
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
	const ctx = requireRenderContext();
	// IDを先に生成してロジックとレンダリングで共有
	const id = generateWidgetId(config?.key);
	const configWithId = { ...config, key: id };
	const value = imperativeTextInput(label, defaultValue, configWithId);
	ctx.append(renderTextInput(label, value, configWithId));
	return value;
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
	const ctx = requireRenderContext();
	// IDを先に生成してロジックとレンダリングで共有
	const id = generateWidgetId(config?.key);
	const configWithId = { ...config, key: id };
	const value = imperativeSelectbox(label, options, defaultValue, configWithId);
	ctx.append(renderSelectbox(label, options, value, configWithId));
	return value;
}
