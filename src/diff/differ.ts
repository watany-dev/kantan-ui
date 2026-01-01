import type {
	InsertNodePatch,
	Patch,
	RemoveNodePatch,
	ReplaceNodePatch,
	ReplaceRootPatch,
} from "../websocket/types";
import { buildNodeMap, parseHtml } from "./parser";
import type { DiffPatch, DiffResult } from "./types";

/**
 * 差分パッチの最大数のしきい値
 * これを超える場合はreplaceRootにフォールバック
 */
const PATCH_THRESHOLD = 10;

/**
 * 2つのHTML間の差分を検出
 */
export function diff(oldHtml: string, newHtml: string): DiffResult {
	const oldNodes = parseHtml(oldHtml);
	const newNodes = parseHtml(newHtml);

	const oldMap = buildNodeMap(oldNodes);
	const newMap = buildNodeMap(newNodes);

	const patches: DiffPatch[] = [];

	// 変更または追加されたノードを検出
	for (const [id, newNodeHtml] of newMap) {
		const oldNodeHtml = oldMap.get(id);

		if (oldNodeHtml === undefined) {
			// 新規ノード
			patches.push({
				type: "insert",
				parentId: "__root__",
				index: -1,
				html: newNodeHtml,
			});
		} else if (oldNodeHtml !== newNodeHtml) {
			// 変更されたノード
			patches.push({
				type: "replace",
				id,
				html: newNodeHtml,
			});
		}
	}

	// 削除されたノードを検出
	for (const [id] of oldMap) {
		if (!newMap.has(id)) {
			patches.push({
				type: "remove",
				id,
			});
		}
	}

	return {
		patches,
		hasChanges: patches.length > 0,
	};
}

/**
 * 差分パッチをWebSocketパッチ形式に変換
 * 差分が多すぎる場合はreplaceRootにフォールバック
 */
export function toWebSocketPatches(diffResult: DiffResult, fullHtml: string): Patch[] {
	if (!diffResult.hasChanges) {
		return [];
	}

	// 差分が多すぎる場合はreplaceRootにフォールバック
	if (diffResult.patches.length > PATCH_THRESHOLD) {
		return [{ type: "replaceRoot", html: fullHtml } satisfies ReplaceRootPatch];
	}

	return diffResult.patches.map((p): Patch => {
		switch (p.type) {
			case "replace":
				return {
					type: "replaceNode",
					id: p.id,
					html: p.html,
				} satisfies ReplaceNodePatch;
			case "remove":
				return {
					type: "removeNode",
					id: p.id,
				} satisfies RemoveNodePatch;
			case "insert":
				return {
					type: "insertNode",
					parentId: p.parentId,
					index: p.index,
					html: p.html,
				} satisfies InsertNodePatch;
		}
	});
}
