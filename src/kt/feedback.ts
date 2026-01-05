import { escapeHtml } from "../utils/html";
import { requireRenderContext } from "./context";

// ============================================
// Progress API
// ============================================

export interface ProgressConfig {
	label?: string;
	color?: string;
}

// ============================================
// Spinner API
// ============================================

export type SpinnerSize = "small" | "medium" | "large";

export interface SpinnerConfig {
	show?: boolean;
	size?: SpinnerSize;
}

const spinnerSizes: Record<SpinnerSize, string> = {
	small: "16px",
	medium: "24px",
	large: "32px",
};

/**
 * プログレスバーを表示
 *
 * @param value - 進捗値 (0-1 または 0-100)
 * @param config - オプション設定
 *
 * @example
 * ```typescript
 * kt.progress(0.5);  // 50%
 * kt.progress(75);   // 75% (0-100を自動正規化)
 * kt.progress(0.75, { label: "Downloading... 75%" });
 * ```
 */
export function progress(value: number, config: ProgressConfig = {}): void {
	const ctx = requireRenderContext();

	// 0-100 を 0-1 に正規化
	const normalizedValue = value > 1 ? value / 100 : value;
	// 0-100% にクランプ
	const percentage = Math.min(Math.max(normalizedValue * 100, 0), 100);
	const color = config.color ?? "#3498db";

	const labelHtml = config.label
		? `<div class="kt-progress-label">${escapeHtml(config.label)}</div>`
		: "";

	ctx.append(
		`<div class="kt-progress">${labelHtml}<div class="kt-progress-bar" style="background: #e0e0e0; border-radius: 4px; height: 8px; overflow: hidden;"><div class="kt-progress-fill" style="background: ${color}; width: ${percentage}%; height: 100%; transition: width 0.3s ease;"></div></div></div>`,
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

	const size = spinnerSizes[config.size ?? "medium"];

	ctx.append(
		`<div class="kt-spinner"><style>@keyframes kt-spin { to { transform: rotate(360deg); } }</style><div class="kt-spinner-icon" style="width: ${size}; height: ${size}; border: 2px solid #e0e0e0; border-top-color: #3498db; border-radius: 50%; animation: kt-spin 1s linear infinite;"></div><span class="kt-spinner-text">${escapeHtml(text)}</span></div>`,
	);
}
