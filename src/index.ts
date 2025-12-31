// Re-export Hono
export { Hono } from "hono";

// App factory
export { createApp } from "./app";

// Config
export type {
	KantanConfig,
	SessionConfig,
	ClientConfig,
	ResolvedKantanConfig,
} from "./config";
export {
	DEFAULT_SESSION_CONFIG,
	DEFAULT_CLIENT_CONFIG,
	DEFAULT_CONFIG,
	resolveConfig,
} from "./config";

// Runtime
export { rerun, getContext, setContext, clearContext } from "./runtime";
export type { Script, RerunContext } from "./runtime";

// Session
export {
	SessionManager,
	getSessionManager,
	setSessionManager,
	resetSessionManager,
	session_state,
	createTypedSessionState,
	setCurrentSessionId,
	getCurrentSessionId,
} from "./session";
export type { SessionId, Session, SessionState } from "./session/types";

// Widgets
export {
	button,
	renderButton,
	slider,
	renderSlider,
	text_input,
	renderTextInput,
	selectbox,
	renderSelectbox,
	generateWidgetId,
	resetWidgetCounter,
	getWidgetValue,
	setWidgetValue,
	hasWidgetValue,
} from "./widgets";
export type {
	WidgetConfig,
	WidgetState,
	WidgetRenderResult,
	ButtonConfig,
	SliderConfig,
	TextInputConfig,
	SelectboxConfig,
} from "./widgets/types";

// WebSocket
export {
	createWebSocketHandler,
	upgradeWebSocket,
	websocket,
} from "./websocket";
export type {
	ClientMessage,
	ServerMessage,
	Patch,
	ReplaceRootPatch,
	ReplaceNodePatch,
	RemoveNodePatch,
	InsertNodePatch,
} from "./websocket/types";

// Diff (for advanced use)
export {
	parseHtml,
	buildNodeMap,
	diff,
	toWebSocketPatches,
	getWidgetIdFromContainerId,
	getContainerIdFromWidgetId,
} from "./diff";
export type { VNode, DiffPatch, DiffResult } from "./diff/types";

// kt - Declarative UI API
export { kt } from "./kt";
export {
	RenderContext,
	setRenderContext,
	getRenderContext,
	requireRenderContext,
} from "./kt/context";
