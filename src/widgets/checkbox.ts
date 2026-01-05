import { initializeCheckboxState } from "./core";
import { generateWidgetId } from "./registry";
import type { CheckboxConfig } from "./types";

/**
 * チェックボックスウィジェット
 * チェック状態を返す（初回はデフォルト値またはfalse）
 */
export function checkbox(
	_label: string,
	defaultValue?: boolean,
	config?: Partial<CheckboxConfig>,
): boolean {
	const id = generateWidgetId(config?.key);
	return initializeCheckboxState(id, defaultValue);
}
