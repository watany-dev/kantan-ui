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
 * 自己終了タグのSet（O(1)ルックアップ）
 */
const SELF_CLOSING_TAGS = new Set([
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
]);

/**
 * RegExpキャッシュ（タグ名→正規表現）
 * findClosingTagで毎回RegExpを生成するコストを削減
 */
const openTagRegexCache = new Map<string, RegExp>();
const closeTagRegexCache = new Map<string, RegExp>();

/**
 * 開始タグ用の正規表現を取得（キャッシュ付き）
 */
function getOpenTagRegex(tag: string): RegExp {
	const key = tag.toLowerCase();
	let regex = openTagRegexCache.get(key);
	if (!regex) {
		regex = new RegExp(`<${tag}[\\s>]`, "gi");
		openTagRegexCache.set(key, regex);
	}
	regex.lastIndex = 0;
	return regex;
}

/**
 * 終了タグ用の正規表現を取得（キャッシュ付き）
 */
function getCloseTagRegex(tag: string): RegExp {
	const key = tag.toLowerCase();
	let regex = closeTagRegexCache.get(key);
	if (!regex) {
		regex = new RegExp(`</${tag}>`, "gi");
		closeTagRegexCache.set(key, regex);
	}
	regex.lastIndex = 0;
	return regex;
}

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
 * 各ノードの親IDを事前計算してマップを返す O(k log k)
 * 親は「そのノードを包含する最も小さい要素」
 *
 * アルゴリズム:
 * 1. ノードをstartPosでソート
 * 2. スタックで「現在の親候補チェーン」を管理
 * 3. 各ノードについて、スタックから包含しない要素をpop
 * 4. スタックトップが最小の包含親
 */
function buildParentMap(parsedNodes: ParsedNode[]): Map<string, string | null> {
	const parentMap = new Map<string, string | null>();

	if (parsedNodes.length === 0) {
		return parentMap;
	}

	// Step 1: startPosでソート O(k log k)
	const sorted = [...parsedNodes].sort((a, b) => a.startPos - b.startPos);

	// Step 2: スタック走査 O(k)
	// スタック不変条件: endPosが降順（大→小）
	const stack: ParsedNode[] = [];

	for (const node of sorted) {
		// スタックから「このノードを包含しない」要素を除去
		// 包含条件: parent.startPos < node.startPos && parent.endPos > node.endPos
		// startPosでソート済みなので、startPos条件は自動的に満たされる
		// endPos条件のみチェック: parent.endPos > node.endPos
		while (stack.length > 0 && stack[stack.length - 1].endPos <= node.endPos) {
			stack.pop();
		}

		// スタックトップが最小の包含親（なければnull）
		parentMap.set(node.id, stack.length > 0 ? stack[stack.length - 1].id : null);

		// 自身をスタックに追加（将来の子ノードの親候補）
		stack.push(node);
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
 * O(1)ルックアップ（Setを使用）
 */
function isSelfClosingTag(tag: string): boolean {
	return SELF_CLOSING_TAGS.has(tag.toLowerCase());
}

/**
 * 対応する終了タグの位置を探す（ネストを考慮）
 * RegExpキャッシュを使用してパフォーマンスを向上
 */
function findClosingTag(html: string, startPos: number, tag: string, startTime: number): number {
	const openTag = getOpenTagRegex(tag);
	const closeTag = getCloseTagRegex(tag);

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
