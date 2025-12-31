export { parseHtml, buildNodeMap } from "./parser";
export {
	diff,
	toWebSocketPatches,
	getWidgetIdFromContainerId,
	getContainerIdFromWidgetId,
} from "./differ";
export type { VNode, DiffPatch, DiffResult } from "./types";
