import { initializeRadioState, validateRadio } from "./core";
import { generateWidgetId } from "./registry";
import type { RadioConfig } from "./types";

/**
 * ラジオボタンウィジェット
 * 選択された値を返す（初回はデフォルト値または最初のオプション）
 */
export function radio(
	_label: string,
	options: string[],
	defaultValue?: string,
	config?: Partial<RadioConfig>,
): string {
	validateRadio(options, defaultValue);
	const id = generateWidgetId(config?.key);
	return initializeRadioState(id, options, defaultValue);
}
