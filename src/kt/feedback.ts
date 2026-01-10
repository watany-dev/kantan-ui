import { SPINNER_SIZES, type SpinnerSize } from "../constants";
import { sanitizeCssColor } from "../utils/css";
import { escapeHtml } from "../utils/html";
import { requireRenderContext } from "./context";
import { type MessageType, messageColors } from "./theme";

// ============================================
// Progress API
// ============================================

/**
 * Progress value interpretation format
 * - "auto": Values > 1 are treated as percentage (0-100), others as fraction (0-1)
 * - "fraction": Always interpret as fraction (0-1)
 * - "percentage": Always interpret as percentage (0-100)
 */
export type ProgressFormat = "auto" | "fraction" | "percentage";

export interface ProgressConfig {
	label?: string;
	color?: string;
	/** Show animated stripes effect (useful for indeterminate progress) */
	animated?: boolean;
	/**
	 * How to interpret the progress value
	 * @default "auto"
	 */
	format?: ProgressFormat;
}

// ============================================
// Spinner API
// ============================================

export interface SpinnerConfig {
	show?: boolean;
	size?: SpinnerSize;
}

// ============================================
// Toast API
// ============================================

export interface ToastConfig {
	type?: MessageType;
	duration?: number;
}

/**
 * Normalize progress value based on format
 */
function normalizeProgressValue(value: number, format: ProgressFormat): number {
	switch (format) {
		case "fraction":
			// Always interpret as 0-1, then convert to percentage
			return value * 100;
		case "percentage":
			// Always interpret as 0-100
			return value;
		default:
			// Values > 1 are treated as percentage, otherwise as fraction
			return value > 1 ? value : value * 100;
	}
}

/**
 * プログレスバーを表示
 *
 * @param value - 進捗値 (0-1 または 0-100)
 * @param config - オプション設定
 *
 * @example
 * ```typescript
 * // Auto format (default): automatically detects based on value
 * kt.progress(0.5);  // 50%
 * kt.progress(75);   // 75% (0-100を自動正規化)
 * kt.progress(0.75, { label: "Downloading... 75%" });
 *
 * // Fraction format: always interpret as 0-1
 * kt.progress(0.5, { format: "fraction" });  // 50%
 * kt.progress(0.75, { format: "fraction" }); // 75%
 *
 * // Percentage format: always interpret as 0-100
 * kt.progress(50, { format: "percentage" });  // 50%
 * kt.progress(75, { format: "percentage" });  // 75%
 * ```
 */
export function progress(value: number, config: ProgressConfig = {}): void {
	const ctx = requireRenderContext();

	const format = config.format ?? "auto";
	// Normalize based on format and clamp to 0-100%
	const percentage = Math.min(Math.max(normalizeProgressValue(value, format), 0), 100);
	const rawColor = config.color ?? "#3498db";
	const color = sanitizeCssColor(rawColor) || "#3498db";
	const animatedClass = config.animated ? " kt-progress-animated" : "";

	const labelHtml = config.label
		? `<div class="kt-progress-label">${escapeHtml(config.label)}</div>`
		: "";

	ctx.append(
		`<div class="kt-progress">${labelHtml}<div class="kt-progress-bar"><div class="kt-progress-fill${animatedClass}" style="background: ${color}; width: ${percentage}%;"></div></div></div>`,
	);
}

/**
 * ローディングスピナーを表示
 *
 * @param text - 表示テキスト (デフォルト: "Loading...")
 * @param config - オプション設定
 *
 * @example
 * ```typescript
 * kt.spinner();  // "Loading..."
 * kt.spinner("Processing data...");
 * kt.spinner("Loading...", { size: "large" });
 * kt.spinner("Loading...", { show: false });  // 非表示
 * ```
 */
export function spinner(text = "Loading...", config: SpinnerConfig = {}): void {
	const ctx = requireRenderContext();

	// show=falseの場合は何も出力しない
	if (config.show === false) {
		return;
	}

	const size = SPINNER_SIZES[config.size ?? "medium"];

	ctx.append(
		`<div class="kt-spinner"><div class="kt-spinner-icon" style="width: ${size}; height: ${size};"></div><span class="kt-spinner-text">${escapeHtml(text)}</span></div>`,
	);
}

/**
 * トースト通知を表示
 *
 * 画面の隅に一時的な通知メッセージを表示します。
 * 指定時間後に自動的に消えます。
 *
 * @param message - 表示するメッセージ
 * @param config - オプション設定
 *
 * @example
 * ```typescript
 * kt.toast("Saved successfully!");
 * kt.toast("Error occurred", { type: "error" });
 * kt.toast("Please wait...", { type: "info", duration: 5000 });
 * ```
 */
export function toast(message: string, config: ToastConfig = {}): void {
	const ctx = requireRenderContext();

	const type = config.type ?? "success";
	const duration = config.duration ?? 4000;
	const colors = messageColors[type];

	ctx.append(
		`<div class="kt-toast kt-toast-${type}" data-duration="${duration}" style="background: ${colors.bg}; border: 1px solid ${colors.border}; padding: 12px 16px; border-radius: 4px; margin: 8px 0; display: flex; align-items: center;"><span class="kt-toast-icon" style="margin-right: 8px;">${colors.icon}</span><span class="kt-toast-message">${escapeHtml(message)}</span></div>`,
	);
}
