// Re-export Hono
export { Hono } from "hono";

// App factory
export { createApp } from "./app";

// Config
export type {
	ClientConfig,
	KantanConfig,
	ResolvedKantanConfig,
	SessionConfig,
} from "./config";
export {
	DEFAULT_CLIENT_CONFIG,
	DEFAULT_CONFIG,
	DEFAULT_SESSION_CONFIG,
	resolveConfig,
} from "./config";
// Diff (for advanced use)
export { buildNodeMap, diff, parseHtml, toWebSocketPatches } from "./diff";
export type { DiffPatch, DiffResult, VNode } from "./diff/types";
// kt - Declarative UI API
export { kt } from "./kt";
export {
	getPageConfig,
	type PageConfig,
	resetPageConfig,
	set_page_config,
} from "./kt/config";
export {
	getRenderContext,
	RenderContext,
	requireRenderContext,
	setRenderContext,
} from "./kt/context";
export type { RerunContext, Script } from "./runtime";
// Runtime
export { clearContext, getContext, rerun, setContext } from "./runtime";
// Session
export {
	createTypedSessionState,
	getCurrentSessionId,
	getSessionManager,
	resetSessionManager,
	SessionManager,
	setCurrentSessionId,
	setSessionManager,
} from "./session";
export type { Session, SessionId, SessionState } from "./session/types";
// WebSocket
export {
	createWebSocketHandler,
	upgradeWebSocket,
	websocket,
} from "./websocket";
export type {
	ClientMessage,
	InsertNodePatch,
	Patch,
	RemoveNodePatch,
	ReplaceNodePatch,
	ReplaceRootPatch,
	ServerMessage,
} from "./websocket/types";
// Widgets
export {
	button,
	checkbox,
	download_button,
	generateWidgetId,
	getWidgetValue,
	hasWidgetValue,
	multiselect,
	number_input,
	radio,
	renderButton,
	renderCheckbox,
	renderDownloadButton,
	renderMultiselect,
	renderNumberInput,
	renderRadio,
	renderSelectbox,
	renderSlider,
	renderTextArea,
	renderTextInput,
	renderToggle,
	resetWidgetCounter,
	selectbox,
	setWidgetValue,
	slider,
	text_area,
	text_input,
	toggle,
} from "./widgets";
export type {
	ButtonConfig,
	CheckboxConfig,
	DownloadButtonConfig,
	MultiselectConfig,
	NumberInputConfig,
	RadioConfig,
	SelectboxConfig,
	SliderConfig,
	TextAreaConfig,
	TextInputConfig,
	ToggleConfig,
	WidgetConfig,
	WidgetRenderResult,
	WidgetState,
} from "./widgets/types";
