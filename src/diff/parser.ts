import type { VNode } from "./types";

/**
 * パーサーの制限値
 */
export const PARSER_LIMITS = {
	/** HTML最大サイズ（バイト） */
	MAX_HTML_SIZE: 1024 * 1024, // 1MB
	/** 最大要素数 */
	MAX_ELEMENTS: 1000,
	/** ID最大長 */
	MAX_ID_LENGTH: 128,
	/** パース最大時間（ミリ秒） */
	MAX_PARSE_TIME_MS: 100,
} as const;

/**
 * 有効なID形式の正規表現
 * HTML5仕様: 少なくとも1文字、スペースを含まない
 */
const VALID_ID_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;

/**
 * IDが有効な形式かを検証
 */
export function isValidId(id: string): boolean {
	return id.length > 0 && id.length <= PARSER_LIMITS.MAX_ID_LENGTH && VALID_ID_PATTERN.test(id);
}

/**
 * HTML文字列からid属性を持つ要素を抽出してVNodeのマップを構築
 *
 * 注意: 完全なHTMLパーサーではなく、kantan-ui生成のHTMLに特化した軽量実装
 *
 * @param html - パース対象のHTML文字列（最大1MB）
 * @returns VNodeの配列（最大1000要素）
 * @throws {Error} サイズ超過、タイムアウト、要素数超過時
 */
/**
 * 中間データ構造：パース中のノード情報
 */
interface ParsedNode {
	id: string;
	tag: string;
	html: string;
	startPos: number;
	endPos: number;
}

export function parseHtml(html: string): VNode[] {
	// サイズチェック
	if (html.length > PARSER_LIMITS.MAX_HTML_SIZE) {
		throw new Error(`HTML size exceeds limit: ${html.length} > ${PARSER_LIMITS.MAX_HTML_SIZE}`);
	}
	const parsedNodes: ParsedNode[] = [];
	const startTime = performance.now();

	// id="xxx" を持つ要素を抽出する正規表現
	// 自己終了タグ（<input ... />）と通常タグ（<div>...</div>）の両方に対応
	// 非キャプチャグループ (?:...) を使用して未使用グループを最適化
	const idPattern =
		/<([a-z][a-z0-9]*)\s+(?:[^>]*?)id="([^"]+)"(?:[^>]*?)(\/?>)([\s\S]*?)(?:<\/\1>)?/gi;

	for (const match of html.matchAll(idPattern)) {
		// タイムアウトチェック（ReDoS対策）
		/* v8 ignore next 3 */
		if (performance.now() - startTime > PARSER_LIMITS.MAX_PARSE_TIME_MS) {
			throw new Error(`Parse timeout: exceeded ${PARSER_LIMITS.MAX_PARSE_TIME_MS}ms`);
		}

		// 要素数チェック
		if (parsedNodes.length >= PARSER_LIMITS.MAX_ELEMENTS) {
			throw new Error(`Element count exceeds limit: ${PARSER_LIMITS.MAX_ELEMENTS}`);
		}

		const [fullMatch, tag, id, closeTag] = match;

		// IDバリデーション（不正なIDはスキップ）
		if (!isValidId(id)) {
			continue;
		}

		const isSelfClosing = closeTag === "/>" || isSelfClosingTag(tag);
		const startPos = match.index ?? 0;

		// 自己終了タグでない場合は終了タグまでのHTMLを取得
		let nodeHtml = fullMatch;
		let endPos = startPos + fullMatch.length;

		if (!isSelfClosing && closeTag === ">" && match.index !== undefined) {
			// 終了タグを探す（ネストを考慮した簡易版）
			const endTagPos = findClosingTag(html, match.index + fullMatch.length, tag, startTime);
			if (endTagPos !== -1) {
				nodeHtml = html.substring(match.index, endTagPos);
				endPos = endTagPos;
			}
		}

		parsedNodes.push({
			id,
			tag,
			html: nodeHtml,
			startPos,
			endPos,
		});
	}

	// 親子関係と順序を計算
	return buildNodeTree(parsedNodes);
}

/**
 * 各ノードの親IDを事前計算してマップを返す O(k²)
 * 親は「そのノードを包含する最も小さい要素」
 */
function buildParentMap(parsedNodes: ParsedNode[]): Map<string, string | null> {
	const parentMap = new Map<string, string | null>();

	for (const node of parsedNodes) {
		let parentId: string | null = null;
		let smallestContainerSize = Number.POSITIVE_INFINITY;

		for (const potentialParent of parsedNodes) {
			if (potentialParent.id === node.id) continue;

			const containsNode =
				potentialParent.startPos < node.startPos && potentialParent.endPos > node.endPos;

			if (containsNode) {
				const containerSize = potentialParent.endPos - potentialParent.startPos;
				if (containerSize < smallestContainerSize) {
					smallestContainerSize = containerSize;
					parentId = potentialParent.id;
				}
			}
		}

		parentMap.set(node.id, parentId);
	}

	return parentMap;
}

/**
 * 同じ親を持つノードをグループ化する O(k)
 * 各グループはstartPosでソート済み
 */
function groupSiblings(
	parsedNodes: ParsedNode[],
	parentMap: Map<string, string | null>,
): Map<string | null, ParsedNode[]> {
	const siblingGroups = new Map<string | null, ParsedNode[]>();

	for (const node of parsedNodes) {
		const parentId = parentMap.get(node.id) ?? null;
		const group = siblingGroups.get(parentId) || [];
		group.push(node);
		siblingGroups.set(parentId, group);
	}

	// 各グループをstartPosでソート
	for (const [, group] of siblingGroups) {
		group.sort((a, b) => a.startPos - b.startPos);
	}

	return siblingGroups;
}

/**
 * パースされたノードから親子関係と順序を計算してVNodeを構築
 * 計算量: O(k²) - 親マップ構築がO(k²)、それ以外はO(k)
 */
function buildNodeTree(parsedNodes: ParsedNode[]): VNode[] {
	// Step 1: 親マップを事前計算 O(k²)
	const parentMap = buildParentMap(parsedNodes);

	// Step 2: 兄弟をグループ化 O(k)
	const siblingGroups = groupSiblings(parsedNodes, parentMap);

	// Step 3: VNodeを構築 O(k)
	const nodes: VNode[] = [];

	for (const node of parsedNodes) {
		const parentId = parentMap.get(node.id) ?? null;
		const siblings = siblingGroups.get(parentId) || [];
		const order = siblings.findIndex((s) => s.id === node.id);

		nodes.push({
			id: node.id,
			tag: node.tag,
			html: node.html,
			parentId,
			order: order >= 0 ? order : 0,
		});
	}

	return nodes;
}

/**
 * 自己終了タグかどうかを判定
 */
function isSelfClosingTag(tag: string): boolean {
	const selfClosingTags = [
		"input",
		"br",
		"hr",
		"img",
		"meta",
		"link",
		"area",
		"base",
		"col",
		"embed",
		"param",
		"source",
		"track",
		"wbr",
	];
	return selfClosingTags.includes(tag.toLowerCase());
}

/**
 * 対応する終了タグの位置を探す（ネストを考慮）
 */
function findClosingTag(html: string, startPos: number, tag: string, startTime: number): number {
	const openTag = new RegExp(`<${tag}[\\s>]`, "gi");
	const closeTag = new RegExp(`</${tag}>`, "gi");

	let depth = 1;
	let pos = startPos;

	while (depth > 0 && pos < html.length) {
		// タイムアウトチェック（ReDoS対策）
		/* v8 ignore next 3 */
		if (performance.now() - startTime > PARSER_LIMITS.MAX_PARSE_TIME_MS) {
			throw new Error(`Parse timeout: exceeded ${PARSER_LIMITS.MAX_PARSE_TIME_MS}ms`);
		}

		openTag.lastIndex = pos;
		closeTag.lastIndex = pos;

		const openMatch = openTag.exec(html);
		const closeMatch = closeTag.exec(html);

		if (!closeMatch) {
			return -1; // 終了タグが見つからない
		}

		if (openMatch && openMatch.index < closeMatch.index) {
			// 開始タグが先に見つかった
			depth++;
			pos = openMatch.index + openMatch[0].length;
		} else {
			// 終了タグが先に見つかった
			depth--;
			if (depth === 0) {
				return closeMatch.index + closeMatch[0].length;
			}
			pos = closeMatch.index + closeMatch[0].length;
		}
	}

	/* v8 ignore next */
	return -1;
}

/**
 * VNodeの配列からID→HTMLのマップを作成
 */
export function buildNodeMap(nodes: VNode[]): Map<string, string> {
	const map = new Map<string, string>();

	for (const node of nodes) {
		map.set(node.id, node.html);
	}

	return map;
}
