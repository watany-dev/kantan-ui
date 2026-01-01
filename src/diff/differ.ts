import type {
	InsertNodePatch,
	Patch,
	RemoveNodePatch,
	ReplaceNodePatch,
	ReplaceRootPatch,
} from "../websocket/types";
import { buildNodeMap, parseHtml } from "./parser";
import type { DiffPatch, DiffResult, VNode } from "./types";

/**
 * 差分パッチの最大数のしきい値
 * これを超える場合はreplaceRootにフォールバック
 */
const PATCH_THRESHOLD = 10;

/**
 * VNodeの配列からID→VNodeのマップを作成
 */
function buildVNodeMap(nodes: VNode[]): Map<string, VNode> {
	const map = new Map<string, VNode>();
	for (const node of nodes) {
		map.set(node.id, node);
	}
	return map;
}

/**
 * 2つのHTML間の差分を検出
 */
export function diff(oldHtml: string, newHtml: string): DiffResult {
	const oldNodes = parseHtml(oldHtml);
	const newNodes = parseHtml(newHtml);

	const oldMap = buildNodeMap(oldNodes);
	const newVNodeMap = buildVNodeMap(newNodes);

	const patches: DiffPatch[] = [];

	// 変更または追加されたノードを検出
	for (const newNode of newNodes) {
		const oldNodeHtml = oldMap.get(newNode.id);

		if (oldNodeHtml === undefined) {
			// 新規ノード - 親IDと順序を使用
			patches.push({
				type: "insert",
				parentId: newNode.parentId ?? "__root__",
				index: newNode.order,
				html: newNode.html,
			});
		} else if (oldNodeHtml !== newNode.html) {
			// 変更されたノード
			patches.push({
				type: "replace",
				id: newNode.id,
				html: newNode.html,
			});
		}
	}

	// 削除されたノードを検出
	for (const [id] of oldMap) {
		if (!newVNodeMap.has(id)) {
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
