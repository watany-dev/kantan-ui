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

type SpinnerSize = "small" | "medium" | "large";

export interface SpinnerConfig {
	show?: boolean;
	size?: SpinnerSize;
}

const spinnerSizes: Record<SpinnerSize, string> = {
	small: "16px",
	medium: "24px",
	large: "32px",
};

// ============================================
// Toast API
// ============================================

type ToastType = "success" | "info" | "warning" | "error";

export interface ToastConfig {
	type?: ToastType;
	duration?: number;
}

const toastColors: Record<ToastType, { bg: string; border: string; icon: string }> = {
	success: { bg: "#d4edda", border: "#c3e6cb", icon: "✓" },
	info: { bg: "#d1ecf1", border: "#bee5eb", icon: "ℹ" },
	warning: { bg: "#fff3cd", border: "#ffeeba", icon: "⚠" },
	error: { bg: "#f8d7da", border: "#f5c6cb", icon: "✕" },
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
	const colors = toastColors[type];

	ctx.append(
		`<div class="kt-toast kt-toast-${type}" data-duration="${duration}" style="background: ${colors.bg}; border: 1px solid ${colors.border}; padding: 12px 16px; border-radius: 4px; margin: 8px 0; display: flex; align-items: center;"><span class="kt-toast-icon" style="margin-right: 8px;">${colors.icon}</span><span class="kt-toast-message">${escapeHtml(message)}</span></div>`,
	);
}
