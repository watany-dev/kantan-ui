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

	// HTMLが異なる場合は変更があると判定（ID要素以外の変更も検出）
	const htmlDiffers = oldHtml !== newHtml;

	return {
		patches,
		hasChanges: htmlDiffers,
	};
}

/**
 * 差分パッチをWebSocketパッチ形式に変換
 * 差分が多すぎる場合やID追跡できない変更がある場合はreplaceRootにフォールバック
 * @param diffResult - 差分結果
 * @param fullHtml - 完全なHTML（フォールバック用）
 * @param rootId - ターゲット要素ID（デフォルト: undefined = "app"）
 */
export function toWebSocketPatches(
	diffResult: DiffResult,
	fullHtml: string,
	rootId?: string,
): Patch[] {
	if (!diffResult.hasChanges) {
		return [];
	}

	// ID追跡できない変更がある場合（hasChangesはtrueだがpatchesが空）
	// または差分が多すぎる場合はreplaceRootにフォールバック
	if (diffResult.patches.length === 0 || diffResult.patches.length > PATCH_THRESHOLD) {
		return [
			{ type: "replaceRoot", html: fullHtml, ...(rootId && { rootId }) } satisfies ReplaceRootPatch,
		];
	}

	// insertパッチがある場合はreplaceRootにフォールバック
	// insertのインデックスはID付き要素間の順序で計算されるが、
	// クライアント側ではすべてのDOM子要素に対してインデックスを適用するため、
	// ID無し要素が混在している場合に誤った位置に挿入される
	const hasInsertPatches = diffResult.patches.some((p) => p.type === "insert");
	if (hasInsertPatches) {
		return [
			{ type: "replaceRoot", html: fullHtml, ...(rootId && { rootId }) } satisfies ReplaceRootPatch,
		];
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
			default:
				throw new Error(`Unknown patch type: ${(p as { type: string }).type}`);
		}
	});
}
