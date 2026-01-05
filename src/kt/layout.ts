import { escapeHtml } from "../utils/html";
import { requireRenderContext } from "./context";

// ============================================
// Container API
// ============================================

export interface ContainerConfig {
	border?: boolean;
	height?: string;
}

/**
 * コンテンツをグループ化するコンテナ
 *
 * @param content - コンテナ内に表示するコンテンツ
 * @param config - オプション設定
 *
 * @example
 * ```typescript
 * kt.container(() => {
 *   kt.write("Grouped content");
 *   kt.button("Action");
 * });
 *
 * // ボーダー付き
 * kt.container(() => {
 *   kt.write("Bordered content");
 * }, { border: true });
 *
 * // スクロール可能なコンテナ
 * kt.container(() => {
 *   kt.write("Scrollable content");
 * }, { height: "300px" });
 * ```
 */
export function container(content: () => void, config: ContainerConfig = {}): void {
	const ctx = requireRenderContext();
	const styles: string[] = [];

	if (config.border) {
		styles.push("border: 1px solid #ddd");
		styles.push("padding: 1rem");
		styles.push("border-radius: 4px");
	}

	if (config.height) {
		styles.push(`height: ${config.height}`);
		styles.push("overflow: auto");
	}

	const styleAttr = styles.length > 0 ? ` style="${styles.join("; ")};"` : "";

	ctx.append(`<div class="kt-container"${styleAttr}>`);
	content();
	ctx.append("</div>");
}

// ============================================
// Columns API
// ============================================

export interface ColumnsConfig {
	gap?: string;
	ratios?: number[];
}

/**
 * 複数カラムのレイアウトを作成
 *
 * @param contents - 各カラムに表示するコンテンツの配列
 * @param config - オプション設定
 *
 * @example
 * ```typescript
 * // 基本的な2カラム
 * kt.columns([
 *   () => kt.write("Left"),
 *   () => kt.write("Right"),
 * ]);
 *
 * // 比率指定（1:2:1 = 25%:50%:25%）
 * kt.columns(
 *   [
 *     () => kt.write("Sidebar"),
 *     () => kt.write("Main content"),
 *     () => kt.write("Sidebar"),
 *   ],
 *   { ratios: [1, 2, 1] }
 * );
 * ```
 */
export function columns(contents: Array<() => void>, config: ColumnsConfig = {}): void {
	const ctx = requireRenderContext();
	const gap = config.gap ?? "1rem";
	const ratios = config.ratios ?? contents.map(() => 1);
	const totalRatio = ratios.reduce((a, b) => a + b, 0);

	ctx.append(`<div class="kt-columns" style="display: flex; gap: ${gap};">`);

	contents.forEach((content, i) => {
		const ratio = ratios[i] ?? 1;
		const width = (ratio / totalRatio) * 100;
		ctx.append(`<div class="kt-column" style="flex: 0 0 ${width}%;">`);
		content();
		ctx.append("</div>");
	});

	ctx.append("</div>");
}

// ============================================
// Expander API
// ============================================

export interface ExpanderConfig {
	expanded?: boolean;
}

/**
 * 展開/折りたたみ可能なセクション
 *
 * @param label - エキスパンダーのラベル
 * @param content - 展開時に表示するコンテンツ
 * @param config - オプション設定
 *
 * @example
 * ```typescript
 * kt.expander("See details", () => {
 *   kt.write("Hidden content");
 * });
 *
 * // デフォルトで展開
 * kt.expander("Important notice", () => {
 *   kt.write("Please read this!");
 * }, { expanded: true });
 * ```
 */
export function expander(label: string, content: () => void, config: ExpanderConfig = {}): void {
	const ctx = requireRenderContext();
	const openAttr = config.expanded ? " open" : "";

	ctx.append(
		`<details class="kt-expander"${openAttr}><summary class="kt-expander-header">${escapeHtml(label)}</summary><div class="kt-expander-content">`,
	);
	content();
	ctx.append("</div></details>");
}
