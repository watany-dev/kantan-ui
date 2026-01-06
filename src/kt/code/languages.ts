/**
 * 構文ハイライト用の言語定義
 */

interface HighlightRule {
	pattern: RegExp;
	className: string;
}

type LanguageRules = HighlightRule[];

/**
 * TypeScript/JavaScript のハイライトルール
 */
const typescriptRules: LanguageRules = [
	// コメント（先に処理）
	{ pattern: /\/\/.*$/gm, className: "kt-code-comment" },
	// 文字列
	{ pattern: /"(?:[^"\\]|\\.)*"/g, className: "kt-code-string" },
	{ pattern: /'(?:[^'\\]|\\.)*'/g, className: "kt-code-string" },
	{ pattern: /`(?:[^`\\]|\\.)*`/g, className: "kt-code-string" },
	// キーワード
	{
		pattern:
			/\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|class|interface|type|import|export|from|default|async|await|new|this|typeof|instanceof|in|of|try|catch|finally|throw|void|null|undefined|true|false)\b/g,
		className: "kt-code-keyword",
	},
	// 数値
	{ pattern: /\b\d+\.?\d*\b/g, className: "kt-code-number" },
];

/**
 * Python のハイライトルール
 */
const pythonRules: LanguageRules = [
	// コメント
	{ pattern: /#.*$/gm, className: "kt-code-comment" },
	// 文字列
	{ pattern: /"""[\s\S]*?"""/g, className: "kt-code-string" },
	{ pattern: /'''[\s\S]*?'''/g, className: "kt-code-string" },
	{ pattern: /"(?:[^"\\]|\\.)*"/g, className: "kt-code-string" },
	{ pattern: /'(?:[^'\\]|\\.)*'/g, className: "kt-code-string" },
	// キーワード
	{
		pattern:
			/\b(def|class|if|elif|else|for|while|return|import|from|as|try|except|finally|raise|with|lambda|pass|break|continue|and|or|not|in|is|None|True|False|global|nonlocal|yield|async|await)\b/g,
		className: "kt-code-keyword",
	},
	// 数値
	{ pattern: /\b\d+\.?\d*\b/g, className: "kt-code-number" },
];

/**
 * JSON のハイライトルール
 */
const jsonRules: LanguageRules = [
	// 文字列（キーと値）
	{ pattern: /"(?:[^"\\]|\\.)*"/g, className: "kt-code-string" },
	// キーワード（true, false, null）
	{ pattern: /\b(true|false|null)\b/g, className: "kt-code-keyword" },
	// 数値
	{ pattern: /-?\b\d+\.?\d*(?:[eE][+-]?\d+)?\b/g, className: "kt-code-number" },
];

/**
 * Bash/Shell のハイライトルール
 */
const bashRules: LanguageRules = [
	// コメント
	{ pattern: /#.*$/gm, className: "kt-code-comment" },
	// 文字列
	{ pattern: /"(?:[^"\\]|\\.)*"/g, className: "kt-code-string" },
	{ pattern: /'[^']*'/g, className: "kt-code-string" },
	// キーワード
	{
		pattern:
			/\b(if|then|else|elif|fi|for|while|do|done|case|esac|function|return|exit|echo|cd|ls|cat|grep|sed|awk|export|source|alias|unalias|set|unset|local|readonly)\b/g,
		className: "kt-code-keyword",
	},
	// 数値
	{ pattern: /\b\d+\b/g, className: "kt-code-number" },
];

/**
 * HTML のハイライトルール
 */
const htmlRules: LanguageRules = [
	// コメント
	{ pattern: /&lt;!--[\s\S]*?--&gt;/g, className: "kt-code-comment" },
	// タグ
	{ pattern: /&lt;\/?[a-zA-Z][a-zA-Z0-9]*(?:\s[^&]*)?&gt;/g, className: "kt-code-keyword" },
	// 文字列（属性値）
	{ pattern: /"[^"]*"/g, className: "kt-code-string" },
	{ pattern: /'[^']*'/g, className: "kt-code-string" },
];

/**
 * CSS のハイライトルール
 */
const cssRules: LanguageRules = [
	// コメント
	{ pattern: /\/\*[\s\S]*?\*\//g, className: "kt-code-comment" },
	// 文字列
	{ pattern: /"[^"]*"/g, className: "kt-code-string" },
	{ pattern: /'[^']*'/g, className: "kt-code-string" },
	// キーワード（プロパティ名）
	{ pattern: /[a-z-]+(?=\s*:)/g, className: "kt-code-keyword" },
	// 数値（単位付き）
	{ pattern: /-?\d+\.?\d*(px|em|rem|%|vh|vw|s|ms)?/g, className: "kt-code-number" },
];

/**
 * SQL のハイライトルール
 */
const sqlRules: LanguageRules = [
	// コメント
	{ pattern: /--.*$/gm, className: "kt-code-comment" },
	// 文字列
	{ pattern: /'[^']*'/g, className: "kt-code-string" },
	// キーワード（大文字小文字問わず）
	{
		pattern:
			/\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TABLE|INDEX|INTO|VALUES|SET|AND|OR|NOT|NULL|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|UNION|DISTINCT|COUNT|SUM|AVG|MIN|MAX|CASE|WHEN|THEN|ELSE|END)\b/gi,
		className: "kt-code-keyword",
	},
	// 数値
	{ pattern: /\b\d+\.?\d*\b/g, className: "kt-code-number" },
];

/**
 * Go のハイライトルール
 */
const goRules: LanguageRules = [
	// コメント
	{ pattern: /\/\/.*$/gm, className: "kt-code-comment" },
	{ pattern: /\/\*[\s\S]*?\*\//g, className: "kt-code-comment" },
	// 文字列
	{ pattern: /"(?:[^"\\]|\\.)*"/g, className: "kt-code-string" },
	{ pattern: /`[^`]*`/g, className: "kt-code-string" },
	// キーワード
	{
		pattern:
			/\b(break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var|nil|true|false|iota)\b/g,
		className: "kt-code-keyword",
	},
	// 組み込み型
	{
		pattern:
			/\b(bool|byte|complex64|complex128|error|float32|float64|int|int8|int16|int32|int64|rune|string|uint|uint8|uint16|uint32|uint64|uintptr)\b/g,
		className: "kt-code-keyword",
	},
	// 数値
	{ pattern: /\b\d+\.?\d*\b/g, className: "kt-code-number" },
];

/**
 * Rust のハイライトルール
 */
const rustRules: LanguageRules = [
	// コメント
	{ pattern: /\/\/.*$/gm, className: "kt-code-comment" },
	{ pattern: /\/\*[\s\S]*?\*\//g, className: "kt-code-comment" },
	// 文字列
	{ pattern: /"(?:[^"\\]|\\.)*"/g, className: "kt-code-string" },
	{ pattern: /r#*"[^"]*"#*/g, className: "kt-code-string" },
	// キーワード
	{
		pattern:
			/\b(as|async|await|break|const|continue|crate|dyn|else|enum|extern|false|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|true|type|unsafe|use|where|while)\b/g,
		className: "kt-code-keyword",
	},
	// 組み込み型
	{
		pattern:
			/\b(bool|char|str|u8|u16|u32|u64|u128|usize|i8|i16|i32|i64|i128|isize|f32|f64|Option|Result|String|Vec|Box|Rc|Arc|Cell|RefCell)\b/g,
		className: "kt-code-keyword",
	},
	// マクロ
	{ pattern: /\b[a-z_][a-z0-9_]*!/g, className: "kt-code-keyword" },
	// 数値
	{ pattern: /\b\d+\.?\d*\b/g, className: "kt-code-number" },
];

/**
 * 言語エイリアスのマッピング
 */
const languageAliases: Record<string, string> = {
	js: "typescript",
	ts: "typescript",
	javascript: "typescript",
	py: "python",
	sh: "bash",
	shell: "bash",
	golang: "go",
	rs: "rust",
};

/**
 * 言語別ルールのマッピング
 */
export const languageRules: Record<string, LanguageRules> = {
	typescript: typescriptRules,
	python: pythonRules,
	json: jsonRules,
	bash: bashRules,
	html: htmlRules,
	css: cssRules,
	sql: sqlRules,
	go: goRules,
	rust: rustRules,
};

/**
 * 言語名を正規化（エイリアス解決）
 */
export function normalizeLanguage(language: string): string {
	const lower = language.toLowerCase();
	return languageAliases[lower] ?? lower;
}
