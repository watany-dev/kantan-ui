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
	let inList: "ul" | "ol" | null = null;
	let listItems: string[] = [];
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
		if (inList && listItems.length > 0) {
			const items = listItems.map((item) => `<li>${parseInline(item)}</li>`).join("");
			result.push(`<${inList}>${items}</${inList}>`);
			listItems = [];
			inList = null;
		}
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
				const langAttr = codeBlockLang ? ` class="language-${escapeHtml(codeBlockLang)}"` : "";
				result.push(`<pre><code${langAttr}>${codeBlockContent.join("\n")}</code></pre>`);
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

		// 無順リスト
		const unorderedListMatch = trimmedLine.match(/^[-*]\s+(.+)$/);
		if (unorderedListMatch?.[1]) {
			flushParagraph();
			flushBlockquote();
			if (inList !== "ul") {
				flushList();
				inList = "ul";
			}
			listItems.push(unorderedListMatch[1]);
			continue;
		}

		// 順序リスト
		const orderedListMatch = trimmedLine.match(/^\d+\.\s+(.+)$/);
		if (orderedListMatch?.[1]) {
			flushParagraph();
			flushBlockquote();
			if (inList !== "ol") {
				flushList();
				inList = "ol";
			}
			listItems.push(orderedListMatch[1]);
			continue;
		}

		// リスト外のテキストでリストを終了
		if (inList) {
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
		const langAttr = codeBlockLang ? ` class="language-${escapeHtml(codeBlockLang)}"` : "";
		result.push(`<pre><code${langAttr}>${codeBlockContent.join("\n")}</code></pre>`);
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
