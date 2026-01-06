/**
 * 軽量Markdownパーサー
 *
 * 基本的なMarkdown構文をHTMLに変換する
 */

import { escapeHtml } from "../../utils/html";

/**
 * Markdownをパースする
 *
 * @param markdown - Markdown文字列
 * @returns HTML文字列
 */
export function parseMarkdown(markdown: string): string {
	if (!markdown || !markdown.trim()) {
		return "";
	}

	// 行ごとに分割
	const lines = markdown.split("\n");
	const result: string[] = [];
	let currentParagraph: string[] = [];
	let inCodeBlock = false;
	let codeBlockContent: string[] = [];
	let codeBlockLang = "";
	// ネストリスト用のスタック構造
	interface ListItem {
		content: string;
		indent: number;
		type: "ul" | "ol";
	}
	let listStack: ListItem[] = [];
	let inBlockquote = false;
	let blockquoteContent: string[] = [];

	const flushParagraph = () => {
		if (currentParagraph.length > 0) {
			const content = currentParagraph.join("<br>");
			result.push(`<p>${parseInline(content)}</p>`);
			currentParagraph = [];
		}
	};

	const flushList = () => {
		if (listStack.length === 0) return;

		// ネストしたリストをHTMLに変換
		const buildNestedList = (
			items: ListItem[],
			startIndex: number,
			baseIndent: number,
		): { html: string; endIndex: number } => {
			const result: string[] = [];
			let i = startIndex;
			const listType = items[i]?.type ?? "ul";

			while (i < items.length) {
				const item = items[i];
				if (!item) break;

				if (item.indent < baseIndent) {
					// 親レベルに戻る
					break;
				}

				if (item.indent > baseIndent) {
					// ネストしたリストを再帰的に処理
					const nested = buildNestedList(items, i, item.indent);
					// 最後のliにネストを追加
					if (result.length > 0) {
						const lastLi = result.pop();
						if (lastLi) {
							result.push(lastLi.replace(/<\/li>$/, `${nested.html}</li>`));
						}
					}
					i = nested.endIndex;
					continue;
				}

				// 同レベルの項目
				result.push(`<li>${parseInline(item.content)}</li>`);
				i++;
			}

			return {
				html: `<${listType}>${result.join("")}</${listType}>`,
				endIndex: i,
			};
		};

		const { html } = buildNestedList(listStack, 0, listStack[0]?.indent ?? 0);
		result.push(html);
		listStack = [];
	};

	const flushBlockquote = () => {
		if (inBlockquote && blockquoteContent.length > 0) {
			const content = blockquoteContent.map((line) => parseInline(line)).join("<br>");
			result.push(`<blockquote>${content}</blockquote>`);
			blockquoteContent = [];
			inBlockquote = false;
		}
	};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? "";
		const trimmedLine = line.trim();

		// コードブロック開始/終了
		if (trimmedLine.startsWith("```")) {
			if (!inCodeBlock) {
				flushParagraph();
				flushList();
				flushBlockquote();
				inCodeBlock = true;
				codeBlockLang = trimmedLine.slice(3).trim();
				codeBlockContent = [];
			} else {
				const escapedLang = escapeHtml(codeBlockLang);
				const langAttr = codeBlockLang ? ` class="language-${escapedLang}"` : "";
				const escapedContent = escapeHtml(codeBlockContent.join("\n"));
				result.push(`<pre><code${langAttr}>${escapedContent}</code></pre>`);
				inCodeBlock = false;
				codeBlockLang = "";
			}
			continue;
		}

		// コードブロック内
		if (inCodeBlock) {
			codeBlockContent.push(line);
			continue;
		}

		// 空行はパラグラフの区切り
		if (trimmedLine === "") {
			flushParagraph();
			flushList();
			flushBlockquote();
			continue;
		}

		// 水平線
		if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmedLine)) {
			flushParagraph();
			flushList();
			flushBlockquote();
			result.push("<hr>");
			continue;
		}

		// 見出し
		const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
		if (headingMatch?.[1] && headingMatch[2]) {
			flushParagraph();
			flushList();
			flushBlockquote();
			const level = headingMatch[1].length;
			const text = headingMatch[2].trim();
			result.push(`<h${level}>${parseInline(text)}</h${level}>`);
			continue;
		}

		// 引用
		const blockquoteMatch = trimmedLine.match(/^>\s*(.*)$/);
		if (blockquoteMatch) {
			flushParagraph();
			flushList();
			if (!inBlockquote) {
				inBlockquote = true;
				blockquoteContent = [];
			}
			blockquoteContent.push(blockquoteMatch[1] ?? "");
			continue;
		}

		// 引用の終了
		if (inBlockquote && !trimmedLine.startsWith(">")) {
			flushBlockquote();
		}

		// 無順リスト（インデント対応）
		const unorderedListMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
		if (unorderedListMatch?.[2]) {
			flushParagraph();
			flushBlockquote();
			const itemIndent = unorderedListMatch[1]?.length ?? 0;
			listStack.push({
				content: unorderedListMatch[2],
				indent: itemIndent,
				type: "ul",
			});
			continue;
		}

		// 順序リスト（インデント対応）
		const orderedListMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
		if (orderedListMatch?.[2]) {
			flushParagraph();
			flushBlockquote();
			const itemIndent = orderedListMatch[1]?.length ?? 0;
			listStack.push({
				content: orderedListMatch[2],
				indent: itemIndent,
				type: "ol",
			});
			continue;
		}

		// リスト外のテキストでリストを終了
		if (listStack.length > 0) {
			flushList();
		}

		// 通常のテキスト行はパラグラフに追加
		currentParagraph.push(trimmedLine);
	}

	// 残りをフラッシュ
	flushParagraph();
	flushList();
	flushBlockquote();

	// コードブロックが閉じられていない場合
	if (inCodeBlock) {
		const escapedLang = escapeHtml(codeBlockLang);
		const langAttr = codeBlockLang ? ` class="language-${escapedLang}"` : "";
		const escapedContent = escapeHtml(codeBlockContent.join("\n"));
		result.push(`<pre><code${langAttr}>${escapedContent}</code></pre>`);
	}

	return result.join("\n");
}

/**
 * インライン要素をパース
 *
 * @param text - テキスト
 * @returns HTML文字列
 */
function parseInline(text: string): string {
	let result = text;

	// 画像 ![alt](src) - リンクより先に処理
	result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

	// リンク [text](href)
	result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

	// インラインコード（先に処理してエスケープを避ける）
	result = result.replace(/`([^`]+)`/g, "<code>$1</code>");

	// 太字 (**text** または __text__)
	result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
	result = result.replace(/__([^_]+)__/g, "<strong>$1</strong>");

	// 斜体 (*text* または _text_)
	// 注意: 太字の後に処理する必要がある
	result = result.replace(/\*([^*]+)\*/g, "<em>$1</em>");
	result = result.replace(/_([^_]+)_/g, "<em>$1</em>");

	return result;
}
