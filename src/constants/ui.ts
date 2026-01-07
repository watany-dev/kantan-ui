/**
 * UI関連の定数
 */

// ============================================
// Alert
// ============================================

export type AlertType = "success" | "error" | "warning" | "info";

export const ALERT_ICONS: Record<AlertType, string> = {
	success: "✓",
	error: "✕",
	warning: "⚠",
	info: "ℹ",
};

// ============================================
// Spinner
// ============================================

export type SpinnerSize = "small" | "medium" | "large";

export const SPINNER_SIZES: Record<SpinnerSize, string> = {
	small: "16px",
	medium: "24px",
	large: "32px",
};

// ============================================
// Toast
// ============================================

export type ToastType = "success" | "info" | "warning" | "error";

export const TOAST_COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
	success: { bg: "#d4edda", border: "#c3e6cb", icon: "✓" },
	info: { bg: "#d1ecf1", border: "#bee5eb", icon: "ℹ" },
	warning: { bg: "#fff3cd", border: "#ffeeba", icon: "⚠" },
	error: { bg: "#f8d7da", border: "#f5c6cb", icon: "✕" },
};
