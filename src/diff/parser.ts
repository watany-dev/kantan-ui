import type { VNode } from "./types";

/**
 * HTML文字列からid属性を持つ要素を抽出してVNodeのマップを構築
 *
 * 注意: 完全なHTMLパーサーではなく、kantan-ui生成のHTMLに特化した軽量実装
 */
export function parseHtml(html: string): VNode[] {
	const nodes: VNode[] = [];

	// id="xxx" を持つ要素を抽出する正規表現
	// 自己終了タグ（<input ... />）と通常タグ（<div>...</div>）の両方に対応
	const idPattern = /<([a-z][a-z0-9]*)\s+([^>]*?)id="([^"]+)"([^>]*?)(\/?>)([\s\S]*?)(?:<\/\1>)?/gi;

	for (const match of html.matchAll(idPattern)) {
		const [fullMatch, tag, beforeId, id, afterId, closeTag] = match;
		const isSelfClosing = closeTag === "/>" || isSelfClosingTag(tag);

		// 自己終了タグでない場合は終了タグまでのHTMLを取得
		let nodeHtml = fullMatch;
		if (!isSelfClosing && closeTag === ">" && match.index !== undefined) {
			// 終了タグを探す（ネストを考慮した簡易版）
			const endTagPos = findClosingTag(html, match.index + fullMatch.length, tag);
			if (endTagPos !== -1) {
				nodeHtml = html.substring(match.index, endTagPos);
			}
		}

		const attributes = extractAttributes(`${beforeId} id="${id}" ${afterId}`);

		nodes.push({
			id,
			tag,
			attributes,
			html: nodeHtml,
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
function findClosingTag(html: string, startPos: number, tag: string): number {
	const openTag = new RegExp(`<${tag}[\\s>]`, "gi");
	const closeTag = new RegExp(`</${tag}>`, "gi");

	let depth = 1;
	let pos = startPos;

	while (depth > 0 && pos < html.length) {
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

	return -1;
}

/**
 * タグ文字列から属性を抽出
 */
function extractAttributes(attrString: string): Record<string, string> {
	const attrs: Record<string, string> = {};
	const attrPattern = /([a-z][a-z0-9-]*)\s*=\s*"([^"]*)"/gi;

	for (const match of attrString.matchAll(attrPattern)) {
		attrs[match[1].toLowerCase()] = match[2];
	}

	return attrs;
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
