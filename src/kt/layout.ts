import { escapeHtml } from "../utils/html";
import { generateWidgetId, getWidgetValue, setWidgetValue } from "../widgets/registry";
import { requireRenderContext } from "./context";

/**
 * タブウィジェットの設定
 */
export interface TabsConfig {
	/** ウィジェットのユニークキー */
	key?: string;
}

/**
 * タブ関数の型定義
 * コールバックを受け取り、アクティブな場合のみ実行する
 */
export interface TabFunction {
	(callback: () => void): void;
	/** このタブがアクティブかどうか */
	isActive: boolean;
	/** タブのインデックス */
	index: number;
}

/**
 * タブヘッダーをレンダリング
 */
export function renderTabsHeader(labels: string[], activeIndex: number, widgetId: string): string {
	const tabButtons = labels
		.map((label, index) => {
			const activeClass = index === activeIndex ? " kt-tab-active" : "";
			return `<button data-kt-tab="${index}" class="kt-tab${activeClass}">${escapeHtml(label)}</button>`;
		})
		.join("");

	return `<div id="${widgetId}" class="kt-tabs" data-kt-event="tab"><div class="kt-tabs-header">${tabButtons}</div></div>`;
}

/**
 * タブウィジェット
 * 複数のタブを作成し、各タブのコンテンツを管理する
 *
 * @example
 * const [tab1, tab2] = kt.tabs(["Tab 1", "Tab 2"]);
 * tab1(() => {
 *   kt.write("Content for Tab 1");
 * });
 * tab2(() => {
 *   kt.write("Content for Tab 2");
 * });
 */
export function tabs(labels: string[], config?: TabsConfig): TabFunction[] {
	const ctx = requireRenderContext();
	const widgetId = generateWidgetId(config?.key);

	// Get active tab from session state (default to 0)
	const activeIndex = getWidgetValue<number>(widgetId, 0);

	// Store the active index
	setWidgetValue(widgetId, activeIndex);

	// Render tabs header
	ctx.append(renderTabsHeader(labels, activeIndex, widgetId));

	// Create tab functions - content will be appended when callback is called
	const tabFunctions = labels.map((_, index): TabFunction => {
		const isActive = index === activeIndex;

		const tabFn: TabFunction = (callback: () => void) => {
			if (isActive) {
				ctx.append(`<div class="kt-tab-panel kt-tab-panel-active" data-kt-panel="${index}">`);
				callback();
				ctx.append("</div>");
			}
		};

		tabFn.isActive = isActive;
		tabFn.index = index;

		return tabFn;
	});

	return tabFunctions;
}
