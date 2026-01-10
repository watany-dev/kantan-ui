import { escapeHtml } from "../utils/html";
import { requireRenderContext } from "./context";

/**
 * kt.metric() の設定オプション
 */
export interface MetricConfig {
	/**
	 * 変化量（前回比など）
	 * 文字列: そのまま表示 (例: "+12%", "-$5")
	 * 数値: 自動で符号を付与 (例: 12 → "+12", -5 → "-5")
	 */
	delta?: string | number;

	/**
	 * 変化量の色設定
	 * - "normal": 正=緑、負=赤（デフォルト）
	 * - "inverse": 正=赤、負=緑（増加が悪い場合）
	 * - "off": 色なし（グレー）
	 * @default "normal"
	 */
	delta_color?: "normal" | "inverse" | "off";

	/**
	 * ヘルプテキスト（ツールチップ）
	 */
	help?: string;

	/**
	 * ラベルの表示位置
	 * @default "visible"
	 */
	label_visibility?: "visible" | "hidden" | "collapsed";
}

type DeltaDirection = "positive" | "negative" | "neutral";

/**
 * delta値から方向（positive/negative/neutral）を判定
 */
function getDeltaDirection(delta: string | number): DeltaDirection {
	if (typeof delta === "number") {
		if (delta > 0) return "positive";
		if (delta < 0) return "negative";
		return "neutral";
	}

	// 文字列の場合: 先頭の符号を確認
	const trimmed = delta.trim();
	if (trimmed.startsWith("+")) return "positive";
	if (trimmed.startsWith("-") || trimmed.startsWith("−")) return "negative";

	// 数値のみの文字列を解析
	const num = Number.parseFloat(trimmed);
	if (!Number.isNaN(num)) {
		if (num > 0) return "positive";
		if (num < 0) return "negative";
	}

	return "neutral";
}

/**
 * delta値を表示用文字列にフォーマット
 */
function formatDelta(delta: string | number): string {
	if (typeof delta === "number") {
		if (delta > 0) return `+${delta}`;
		return String(delta);
	}
	return delta;
}

/**
 * 方向に応じたアイコンを取得
 */
function getDeltaIcon(direction: DeltaDirection): string {
	switch (direction) {
		case "positive":
			return "▲";
		case "negative":
			return "▼";
		default:
			return "";
	}
}

/**
 * delta_colorモードに基づいて表示用のクラス名を決定
 */
function getDeltaColorClass(
	direction: DeltaDirection,
	colorMode: "normal" | "inverse" | "off",
): DeltaDirection {
	if (colorMode === "off") {
		return "neutral";
	}

	if (colorMode === "inverse") {
		if (direction === "positive") return "negative";
		if (direction === "negative") return "positive";
		return "neutral";
	}

	// normal mode
	return direction;
}

/**
 * メトリクス（KPI）を表示
 *
 * ダッシュボードやKPI表示で使用する、値と変化量を表示するコンポーネント。
 *
 * @param label - ラベル文字列
 * @param value - 表示する値（文字列または数値）
 * @param config - オプション設定
 *
 * @example
 * ```typescript
 * kt.metric("Revenue", "$1,234");
 * kt.metric("Revenue", "$1,234", { delta: "+12%" });
 * kt.metric("Response Time", "120ms", { delta: "+15ms", delta_color: "inverse" });
 * ```
 */
export function metric(label: string, value: string | number, config?: MetricConfig): void {
	const ctx = requireRenderContext();

	const escapedLabel = escapeHtml(label);
	const escapedValue = escapeHtml(String(value));
	const labelVisibility = config?.label_visibility ?? "visible";

	// Label部分の生成
	let labelHtml = "";
	if (labelVisibility === "visible") {
		labelHtml = `<div class="kt-metric-label">${escapedLabel}</div>`;
	} else if (labelVisibility === "hidden") {
		// スクリーンリーダー向けに保持
		labelHtml = `<div class="kt-metric-label kt-sr-only">${escapedLabel}</div>`;
	}
	// collapsed の場合は labelHtml は空のまま

	// Help部分の生成
	let helpHtml = "";
	if (config?.help) {
		const escapedHelp = escapeHtml(config.help);
		helpHtml = `<span class="kt-metric-help" title="${escapedHelp}">?</span>`;
	}

	// Delta部分の生成
	let deltaHtml = "";
	if (config?.delta !== undefined) {
		const direction = getDeltaDirection(config.delta);
		const colorMode = config.delta_color ?? "normal";
		const colorClass = getDeltaColorClass(direction, colorMode);
		const icon = getDeltaIcon(direction);
		const formattedDelta = formatDelta(config.delta);
		const escapedDelta = escapeHtml(formattedDelta);

		const iconHtml = icon ? `<span class="kt-metric-delta-icon">${icon}</span>` : "";
		deltaHtml = `<div class="kt-metric-delta kt-metric-delta-${colorClass}">${iconHtml}<span class="kt-metric-delta-text">${escapedDelta}</span></div>`;
	}

	ctx.append(
		`<div class="kt-metric">${labelHtml}${helpHtml}<div class="kt-metric-value">${escapedValue}</div>${deltaHtml}</div>`,
	);
}
