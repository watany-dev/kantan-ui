import { initializeTextInputState } from "./core";
import { generateWidgetId } from "./registry";
import type { TextAreaConfig } from "./types";

/**
 * テキストエリアウィジェット
 * 入力されたテキストを返す（初回はデフォルト値または空文字列）
 */
export function text_area(
	_label: string,
	defaultValue?: string,
	config?: Partial<TextAreaConfig>,
): string {
	const id = generateWidgetId(config?.key);
	return initializeTextInputState(id, defaultValue);
}
