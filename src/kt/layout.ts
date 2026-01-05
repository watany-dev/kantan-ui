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
