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
 */

import type * as chat from "./chat";
import type * as data from "./data";
import type * as feedback from "./feedback";
import type * as formModule from "./form";
import type * as layout from "./layout";
import type * as output from "./output";
import type * as widgets from "./widgets";

/**
 * サイドバーで使用可能なAPI群
 * 除外: set_page_config, rerun, toast, sidebar自身
 */
export interface SidebarAPIs {
	// Output APIs
	write: typeof output.write;
	title: typeof output.title;
	header: typeof output.header;
	subheader: typeof output.subheader;
	text: typeof output.text;
	divider: typeof output.divider;
	html: typeof output.html;
	json: typeof output.json;
	code: typeof output.code;
	markdown: typeof output.markdown;

	// Alert APIs
	success: typeof output.success;
	error: typeof output.error;
	warning: typeof output.warning;
	info: typeof output.info;

	// Feedback APIs (toast除外)
	progress: typeof feedback.progress;
	spinner: typeof feedback.spinner;

	// Data APIs
	table: typeof data.table;

	// Layout APIs (sidebar除外)
	container: typeof layout.container;
	columns: typeof layout.columns;
	expander: typeof layout.expander;
	tabs: typeof layout.tabs;

	// Chat APIs
	chat_message: typeof chat.chat_message;
	chat_container: typeof chat.chat_container;

	// Form APIs
	form: typeof formModule.form;
	form_submit_button: typeof formModule.form_submit_button;
	validation_error: typeof formModule.validation_error;
	validation_errors: typeof formModule.validation_errors;

	// Widget APIs
	button: typeof widgets.button;
	slider: typeof widgets.slider;
	text_input: typeof widgets.text_input;
	selectbox: typeof widgets.selectbox;
	checkbox: typeof widgets.checkbox;
	radio: typeof widgets.radio;
	number_input: typeof widgets.number_input;
	text_area: typeof widgets.text_area;
	toggle: typeof widgets.toggle;
	multiselect: typeof widgets.multiselect;
	download_button: typeof widgets.download_button;
}

/**
 * サイドバーAPI（コールバック記法 + オブジェクト記法）
 */
export interface SidebarAPI extends SidebarAPIs {
	(content: () => void): void;
}

// ============================================
// Implementation
// ============================================

import { withSidebarContext } from "./layout";
import * as output from "./output";

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
	write: output.write,
	title: output.title,
	header: output.header,
	subheader: output.subheader,
	text: output.text,
	divider: output.divider,
	html: output.html,
	json: output.json,
	code: output.code,
	markdown: output.markdown,

	// Alert APIs
	success: output.success,
	error: output.error,
	warning: output.warning,
	info: output.info,
};

// コールバック記法のベース関数
function sidebarCallback(content: () => void): void {
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
