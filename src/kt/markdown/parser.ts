/**
 * 軽量Markdownパーサー
 *
 * 基本的なMarkdown構文をHTMLに変換する
 */

/**
 * Markdownをパースしてる
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

	const flushParagraph = () => {
		if (currentParagraph.length > 0) {
			const content = currentParagraph.join("<br>");
			result.push(`<p>${parseInline(content)}</p>`);
			currentParagraph = [];
		}
	};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmedLine = line.trim();

		// 空行はパラグラフの区切り
		if (trimmedLine === "") {
			flushParagraph();
			continue;
		}

		// 水平線
		if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmedLine)) {
			flushParagraph();
			result.push("<hr>");
			continue;
		}

		// 見出し
		const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
		if (headingMatch) {
			flushParagraph();
			const level = headingMatch[1].length;
			const text = headingMatch[2].trim();
			result.push(`<h${level}>${parseInline(text)}</h${level}>`);
			continue;
		}

		// 通常のテキスト行はパラグラフに追加
		currentParagraph.push(trimmedLine);
	}

	// 最後のパラグラフをフラッシュ
	flushParagraph();

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
