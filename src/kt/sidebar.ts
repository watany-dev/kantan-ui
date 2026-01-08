/**
 * サイドバーAPI（オブジェクト記法対応）
 *
 * @example コールバック記法（既存）
 * ```typescript
 * kt.sidebar(() => {
 *   kt.title("Settings");
 *   kt.button("Reset");
 * });
 * ```
 *
 * @example オブジェクト記法（新規）
 * ```typescript
 * kt.sidebar.title("Settings");
 * kt.sidebar.button("Reset");
 * ```
 *
 * @example カスタム幅
 * ```typescript
 * kt.sidebar(() => {
 *   kt.title("Wide Sidebar");
 * }, { width: "350px" });
 * ```
 */

import * as chatModule from "./chat";
import { type SidebarConfig, requireRenderContext } from "./context";
import * as dataModule from "./data";
import * as feedbackModule from "./feedback";
import * as formModuleNS from "./form";
import { columns, container, expander, tabs, withSidebarContext } from "./layout";
import * as outputModule from "./output";
import * as widgetsModule from "./widgets";

// Re-export SidebarConfig for external API compatibility
export type { SidebarConfig };

/**
 * サイドバーで使用可能なAPI群
 * 除外: set_page_config, rerun, toast, sidebar自身
 */
interface SidebarAPIs {
	// Output APIs
	write: typeof outputModule.write;
	title: typeof outputModule.title;
	header: typeof outputModule.header;
	subheader: typeof outputModule.subheader;
	text: typeof outputModule.text;
	divider: typeof outputModule.divider;
	html: typeof outputModule.html;
	json: typeof outputModule.json;
	code: typeof outputModule.code;
	markdown: typeof outputModule.markdown;

	// Alert APIs
	success: typeof outputModule.success;
	error: typeof outputModule.error;
	warning: typeof outputModule.warning;
	info: typeof outputModule.info;

	// Feedback APIs (toast除外)
	progress: typeof feedbackModule.progress;
	spinner: typeof feedbackModule.spinner;

	// Data APIs
	table: typeof dataModule.table;

	// Layout APIs (sidebar除外)
	container: typeof container;
	columns: typeof columns;
	expander: typeof expander;
	tabs: typeof tabs;

	// Chat APIs
	chat_message: typeof chatModule.chat_message;
	chat_container: typeof chatModule.chat_container;

	// Form APIs
	form: typeof formModuleNS.form;
	form_submit_button: typeof formModuleNS.form_submit_button;
	validation_error: typeof formModuleNS.validation_error;
	validation_errors: typeof formModuleNS.validation_errors;

	// Widget APIs
	button: typeof widgetsModule.button;
	slider: typeof widgetsModule.slider;
	text_input: typeof widgetsModule.text_input;
	selectbox: typeof widgetsModule.selectbox;
	checkbox: typeof widgetsModule.checkbox;
	radio: typeof widgetsModule.radio;
	number_input: typeof widgetsModule.number_input;
	text_area: typeof widgetsModule.text_area;
	toggle: typeof widgetsModule.toggle;
	multiselect: typeof widgetsModule.multiselect;
	download_button: typeof widgetsModule.download_button;
}

/**
 * サイドバーAPI（コールバック記法 + オブジェクト記法）
 */
export interface SidebarAPI extends SidebarAPIs {
	(content: () => void, config?: SidebarConfig): void;
}

// ============================================
// Implementation
// ============================================

/**
 * 関数をサイドバーコンテキストでラップ
 * 呼び出し時に自動的にサイドバーバッファに出力される
 */
export function wrapForSidebar<F extends (...args: never[]) => unknown>(fn: F): F {
	return ((...args: Parameters<F>): ReturnType<F> => {
		return withSidebarContext(() => fn(...args)) as ReturnType<F>;
	}) as F;
}

// サイドバーで使用可能なAPI群（実装）
// biome-ignore lint/suspicious/noExplicitAny: Dynamic API mapping requires any type
const sidebarAPIs: Record<string, (...args: any[]) => any> = {
	// Output APIs
	write: outputModule.write,
	title: outputModule.title,
	header: outputModule.header,
	subheader: outputModule.subheader,
	text: outputModule.text,
	divider: outputModule.divider,
	html: outputModule.html,
	json: outputModule.json,
	code: outputModule.code,
	markdown: outputModule.markdown,

	// Alert APIs
	success: outputModule.success,
	error: outputModule.error,
	warning: outputModule.warning,
	info: outputModule.info,

	// Widget APIs
	button: widgetsModule.button,
	slider: widgetsModule.slider,
	text_input: widgetsModule.text_input,
	selectbox: widgetsModule.selectbox,
	checkbox: widgetsModule.checkbox,
	radio: widgetsModule.radio,
	number_input: widgetsModule.number_input,
	text_area: widgetsModule.text_area,
	toggle: widgetsModule.toggle,
	multiselect: widgetsModule.multiselect,
	download_button: widgetsModule.download_button,

	// Feedback APIs (toast除外)
	progress: feedbackModule.progress,
	spinner: feedbackModule.spinner,

	// Data APIs
	table: dataModule.table,

	// Layout APIs (sidebar除外)
	container: container,
	columns: columns,
	expander: expander,
	tabs: tabs,

	// Chat APIs
	chat_message: chatModule.chat_message,
	chat_container: chatModule.chat_container,

	// Form APIs
	form: formModuleNS.form,
	form_submit_button: formModuleNS.form_submit_button,
	validation_error: formModuleNS.validation_error,
	validation_errors: formModuleNS.validation_errors,
};

// コールバック記法のベース関数
function sidebarCallback(content: () => void, config?: SidebarConfig): void {
	if (config) {
		const ctx = requireRenderContext();
		ctx.setSidebarConfig(config);
	}
	withSidebarContext(content);
}

// ラップ済みAPI のキャッシュ
// biome-ignore lint/suspicious/noExplicitAny: Cache for wrapped functions
const wrappedCache = new Map<string, (...args: any[]) => any>();

/**
 * サイドバーAPI（Proxy実装）
 * コールバック記法とオブジェクト記法の両方をサポート
 */
export const sidebar: SidebarAPI = new Proxy(sidebarCallback as SidebarAPI, {
	get(_target, prop: string | symbol): unknown {
		if (typeof prop !== "string") {
			return undefined;
		}

		// キャッシュから取得
		const cached = wrappedCache.get(prop);
		if (cached) {
			return cached;
		}

		// APIが存在する場合、ラップして返す
		const api = sidebarAPIs[prop];
		if (api) {
			const wrapped = wrapForSidebar(api);
			wrappedCache.set(prop, wrapped);
			return wrapped;
		}

		return undefined;
	},
});
