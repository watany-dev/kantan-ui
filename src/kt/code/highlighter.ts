/**
 * 構文ハイライト
 *
 * 正規表現ベースの軽量な構文ハイライト実装
 */

import { languageRules, normalizeLanguage } from "./languages";

/**
 * コードに構文ハイライトを適用
 *
 * @param code - エスケープ済みのコード文字列
 * @param language - プログラミング言語
 * @returns ハイライト用のspanタグが挿入されたHTML
 */
export function applyHighlight(code: string, language: string): string {
	if (!code || !language) {
		return code;
	}

	const normalizedLang = normalizeLanguage(language);
	const rules = languageRules[normalizedLang];

	if (!rules) {
		return code;
	}

	// プレースホルダーを使用してハイライトを適用
	// 既にハイライトされた部分を再度マッチさせないようにする
	interface Replacement {
		start: number;
		end: number;
		replacement: string;
	}

	const replacements: Replacement[] = [];

	for (const rule of rules) {
		// 各ルールのパターンをリセット（gフラグの場合）
		rule.pattern.lastIndex = 0;

		let match: RegExpExecArray | null = rule.pattern.exec(code);
		while (match !== null) {
			const start = match.index;
			const end = start + match[0].length;

			// 既存の置換と重複しないかチェック
			const overlaps = replacements.some(
				(r) => (start >= r.start && start < r.end) || (end > r.start && end <= r.end),
			);

			if (!overlaps) {
				replacements.push({
					start,
					end,
					replacement: `<span class="${rule.className}">${match[0]}</span>`,
				});
			}

			match = rule.pattern.exec(code);
		}
	}

	// 置換を後ろから適用（インデックスがずれないように）
	replacements.sort((a, b) => b.start - a.start);

	let result = code;
	for (const r of replacements) {
		result = result.slice(0, r.start) + r.replacement + result.slice(r.end);
	}

	return result;
}
