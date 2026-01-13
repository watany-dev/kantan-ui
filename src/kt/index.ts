/**
 * kt - 宣言的UI構築API
 *
 * Streamlit風の直感的なAPIでUIを構築できます。
 * 各関数はHTMLを自動的にバッファに追加し、値を返します。
 *
 * @example
 * ```typescript
 * import { kt, createTypedSessionState } from "kantan-ui";
 *
 * const state = createTypedSessionState({ count: 0 });
 *
 * const script = () => {
 *   kt.title("My App");
 *
 *   if (kt.button("Click me")) {
 *     state.count++;
 *   }
 *
 *   const value = kt.slider("Volume", 0, 100, 50);
 *   kt.write(`Volume: ${value}`);
 * };
 * ```
 */

// kt オブジェクト（すべてのAPIを1つのオブジェクトにまとめる）
import { cache_data, cache_resource, clear_all_caches } from "./cache";
import * as chat from "./chat";
import * as config from "./config";
import * as control from "./control";
import * as data from "./data";
import { empty } from "./empty";
import * as feedback from "./feedback";
import * as formModule from "./form";
import * as layout from "./layout";
import * as media from "./media";
import * as metricModule from "./metric";
import * as output from "./output";
import { sidebar } from "./sidebar";
import { write_stream } from "./stream";
import * as widgets from "./widgets";

export type { CacheDataOptions, CacheResourceOptions } from "./cache";
export type { SidebarAPI } from "./sidebar";
export type { WriteStreamOptions } from "./stream-registry";
export type { StreamSource } from "./stream-utils";

export const kt = {
	// Config APIs
	set_page_config: config.set_page_config,

	// Control APIs
	rerun: control.requestRerun,

	// Cache APIs
	cache_data,
	cache_resource,
	clear_all_caches,

	// Chat APIs
	chat_message: chat.chat_message,
	chat_container: chat.chat_container,
	chat_input: chat.chat_input,

	// Output APIs
	write: output.write,
	write_stream,
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

	// Feedback APIs
	progress: feedback.progress,
	spinner: feedback.spinner,
	toast: feedback.toast,

	// Data APIs
	table: data.table,
	metric: metricModule.metric,

	// Layout APIs
	container: layout.container,
	columns: layout.columns,
	expander: layout.expander,
	tabs: layout.tabs,
	sidebar,
	empty,

	// Form APIs
	form: formModule.form,
	form_submit_button: formModule.form_submit_button,
	validation_error: formModule.validation_error,
	validation_errors: formModule.validation_errors,

	// Media APIs
	image: media.image,

	// Widget APIs
	button: widgets.button,
	slider: widgets.slider,
	text_input: widgets.text_input,
	selectbox: widgets.selectbox,
	download_button: widgets.download_button,
	checkbox: widgets.checkbox,
	color_picker: widgets.color_picker,
	radio: widgets.radio,
	number_input: widgets.number_input,
	text_area: widgets.text_area,
	toggle: widgets.toggle,
	multiselect: widgets.multiselect,
	date_input: widgets.date_input,
	time_input: widgets.time_input,
	file_uploader: widgets.file_uploader,
};
