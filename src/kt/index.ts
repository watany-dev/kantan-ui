/**
 * kt - 宣言的UI構築API
 *
 * Streamlit風の直感的なAPIでUIを構築できます。
 * 各関数はHTMLを自動的にバッファに追加し、値を返します。
 *
 * @example
 * ```typescript
 * import { kt } from "kantan-ui";
 *
 * const script = () => {
 *   kt.title("My App");
 *
 *   if (kt.button("Click me")) {
 *     session_state.count++;
 *   }
 *
 *   const value = kt.slider("Volume", 0, 100, 50);
 *   kt.write(`Volume: ${value}`);
 * };
 * ```
 */

// kt オブジェクト（すべてのAPIを1つのオブジェクトにまとめる）
import * as config from "./config";
import * as control from "./control";
import * as data from "./data";
import * as output from "./output";
import * as widgets from "./widgets";

export const kt = {
	// Config APIs
	set_page_config: config.set_page_config,

	// Control APIs
	rerun: control.requestRerun,

	// Output APIs
	write: output.write,
	title: output.title,
	header: output.header,
	subheader: output.subheader,
	text: output.text,
	divider: output.divider,
	html: output.html,

	// Data APIs
	table: data.table,

	// Widget APIs
	button: widgets.button,
	slider: widgets.slider,
	text_input: widgets.text_input,
	selectbox: widgets.selectbox,
};
