/**
 * Markdown HTMLサニタイザー
 *
 * ホワイトリストベースでHTMLタグをフィルタリングし、
 * XSS攻撃を防ぐ
 */

/** 許可するHTMLタグ */
const ALLOWED_TAGS = new Set([
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"p",
	"br",
	"hr",
	"strong",
	"em",
	"code",
	"pre",
	"ul",
	"ol",
	"li",
	"blockquote",
	"a",
	"img",
	"table",
	"thead",
	"tbody",
	"tr",
	"th",
	"td",
]);

/** 許可する属性（タグごと） */
const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
	a: new Set(["href", "title", "target"]),
	img: new Set(["src", "alt", "title", "width", "height"]),
	code: new Set(["class"]),
	pre: new Set(["class"]),
	td: new Set(["colspan", "rowspan"]),
	th: new Set(["colspan", "rowspan"]),
};

/** 危険なURLスキーム */
const DANGEROUS_URL_SCHEMES = ["javascript:", "vbscript:", "data:"];

/** 安全なdata: URLプレフィックス（画像のみ許可） */
const SAFE_DATA_PREFIXES = ["data:image/"];

/**
 * URLが安全かどうかをチェック
 */
function isSafeUrl(url: string): boolean {
	const trimmed = url.trim().toLowerCase();

	// 安全なdata: URLの場合は許可
	for (const prefix of SAFE_DATA_PREFIXES) {
		if (trimmed.startsWith(prefix)) {
			return true;
		}
	}

	// 危険なスキームをブロック
	for (const scheme of DANGEROUS_URL_SCHEMES) {
		if (trimmed.startsWith(scheme)) {
			return false;
		}
	}

	return true;
}

/**
 * 属性をサニタイズ
 */
function sanitizeAttributes(tagName: string, attributes: string): string {
	const allowedAttrs = ALLOWED_ATTRIBUTES[tagName];
	if (!allowedAttrs) {
		return "";
	}

	const result: string[] = [];

	// 属性をパース（簡易的な正規表現）
	const attrPattern = /(\w+)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
	let match: RegExpExecArray | null = attrPattern.exec(attributes);

	while (match !== null) {
		// match[1] is guaranteed by regex pattern (\w+)
		const attrName = (match[1] as string).toLowerCase();
		// One of match[2-4] will be defined by the alternation pattern
		const attrValue = match[2] ?? match[3] ?? match[4] ?? "";

		if (allowedAttrs.has(attrName)) {
			// href と src は URL をチェック
			if ((attrName === "href" || attrName === "src") && !isSafeUrl(attrValue)) {
				// 危険なURLは空にする
				result.push(`${attrName}=""`);
			} else {
				result.push(`${attrName}="${attrValue}"`);
			}
		}

		match = attrPattern.exec(attributes);
	}

	return result.length > 0 ? ` ${result.join(" ")}` : "";
}

/** 完全に削除するタグ（コンテンツごと） */
const STRIP_TAGS_WITH_CONTENT = ["script", "style", "iframe", "object", "embed", "form"];

/**
 * HTMLをサニタイズ
 *
 * @param html - 入力HTML
 * @returns サニタイズされたHTML
 */
export function sanitizeMarkdownHtml(html: string): string {
	if (!html) {
		return "";
	}

	let sanitized = html;

	// 危険なタグをコンテンツごと削除（最初に実行）
	for (const tag of STRIP_TAGS_WITH_CONTENT) {
		const pattern = new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`, "gi");
		sanitized = sanitized.replace(pattern, "");
		// 自己終了タグも削除
		const selfClosingPattern = new RegExp(`<${tag}[^>]*\\/?>`, "gi");
		sanitized = sanitized.replace(selfClosingPattern, "");
	}

	// イベントハンドラ属性を削除（タグ解析前に）
	sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "");
	sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, "");

	// タグをパース
	const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^>]*)?)>/g;

	let result = "";
	let lastIndex = 0;

	let match: RegExpExecArray | null = tagPattern.exec(sanitized);

	while (match !== null) {
		const fullMatch = match[0];
		// match[1] is guaranteed by regex pattern ([a-zA-Z][a-zA-Z0-9]*)
		const tagName = (match[1] as string).toLowerCase();
		// match[2] is guaranteed by regex pattern ((?:\s+[^>]*)?)
		const attributes = match[2] as string;
		const isClosingTag = fullMatch.startsWith("</");
		const isSelfClosing = fullMatch.endsWith("/>");

		// マッチ前のテキストを追加
		result += sanitized.slice(lastIndex, match.index);

		if (ALLOWED_TAGS.has(tagName)) {
			if (isClosingTag) {
				result += `</${tagName}>`;
			} else {
				const sanitizedAttrs = sanitizeAttributes(tagName, attributes);
				result += `<${tagName}${sanitizedAttrs}${isSelfClosing ? "/" : ""}>`;
			}
		}
		// 許可されていないタグはスキップ（タグのみ削除、テキストコンテンツは保持）

		lastIndex = match.index + fullMatch.length;
		match = tagPattern.exec(sanitized);
	}

	// 残りのテキストを追加
	result += sanitized.slice(lastIndex);

	return result;
}
