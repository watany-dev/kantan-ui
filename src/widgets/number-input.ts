import { initializeNumberInputState, validateNumberInput } from "./core";
import { generateWidgetId } from "./registry";
import type { NumberInputConfig } from "./types";

/**
 * 数値入力ウィジェット
 * 入力された数値を返す（初回はデフォルト値、min値、または0）
 */
export function number_input(
	_label: string,
	min?: number,
	max?: number,
	defaultValue?: number,
	config?: Partial<NumberInputConfig>,
): number {
	validateNumberInput(min, max, defaultValue);
	const id = generateWidgetId(config?.key);
	return initializeNumberInputState(id, min, defaultValue);
}
