/**
 * テーマ定義
 *
 * メッセージタイプ（成功・エラー・警告・情報）の統一された
 * 色とアイコンの定義を提供します。
 */

// ============================================
// Message Types
// ============================================

/**
 * メッセージタイプ
 * アラート、トースト、その他のフィードバックUIで使用
 */
export type MessageType = "success" | "error" | "warning" | "info";

// ============================================
// Message Icons
// ============================================

/**
 * メッセージタイプごとのアイコン
 */
export const messageIcons: Record<MessageType, string> = {
	success: "✓",
	error: "✕",
	warning: "⚠",
	info: "ℹ",
};

// ============================================
// Message Colors
// ============================================

/**
 * メッセージカラー定義
 */
export interface MessageColorScheme {
	/** 背景色 */
	bg: string;
	/** ボーダー色 */
	border: string;
	/** アイコン */
	icon: string;
}

/**
 * メッセージタイプごとの色定義
 */
export const messageColors: Record<MessageType, MessageColorScheme> = {
	success: { bg: "#d4edda", border: "#c3e6cb", icon: "✓" },
	error: { bg: "#f8d7da", border: "#f5c6cb", icon: "✕" },
	warning: { bg: "#fff3cd", border: "#ffeeba", icon: "⚠" },
	info: { bg: "#d1ecf1", border: "#bee5eb", icon: "ℹ" },
};

// ============================================
// Legacy Type Aliases (backward compatibility)
// ============================================

/**
 * @deprecated Use MessageType instead
 */
export type AlertType = MessageType;

/**
 * @deprecated Use MessageType instead
 */
export type ToastType = MessageType;

/**
 * @deprecated Use messageIcons instead
 */
export const ALERT_ICONS = messageIcons;

/**
 * @deprecated Use messageColors instead
 */
export const TOAST_COLORS = messageColors;
