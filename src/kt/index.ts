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
import * as feedback from "./feedback";
import * as layout from "./layout";
import * as output from "./output";
import * as widgets from "./widgets";

export const kt = {
	// Output APIs
	write: output.write,
	title: output.title,
	header: output.header,
	subheader: output.subheader,
	text: output.text,
	divider: output.divider,
	html: output.html,

	// Alert APIs
	success: output.success,
	error: output.error,
	warning: output.warning,
	info: output.info,

	// Feedback APIs
	progress: feedback.progress,
	spinner: feedback.spinner,

	// Layout APIs
	container: layout.container,
	columns: layout.columns,
	expander: layout.expander,

	// Widget APIs
	button: widgets.button,
	slider: widgets.slider,
	text_input: widgets.text_input,
	selectbox: widgets.selectbox,
	checkbox: widgets.checkbox,
	radio: widgets.radio,
	number_input: widgets.number_input,
	text_area: widgets.text_area,
	toggle: widgets.toggle,
	multiselect: widgets.multiselect,
};
