/**
 * UI関連の定数
 */

// ============================================
// Alert & Toast (re-export from theme)
// ============================================

export {
	type AlertType,
	ALERT_ICONS,
	type MessageColorScheme,
	messageColors,
	messageIcons,
	type MessageType,
	TOAST_COLORS,
	type ToastType,
} from "../kt/theme";

// ============================================
// Spinner
// ============================================

export type SpinnerSize = "small" | "medium" | "large";

export const SPINNER_SIZES: Record<SpinnerSize, string> = {
	small: "16px",
	medium: "24px",
	large: "32px",
};
