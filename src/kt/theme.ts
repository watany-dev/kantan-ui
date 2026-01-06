/**
 * 共通テーマ定義
 *
 * フィードバックやアラートで使用される色とアイコンの統一定義
 */

/**
 * メッセージタイプ
 */
export type MessageType = "success" | "error" | "warning" | "info";

/**
 * メッセージタイプごとの色定義
 */
export interface MessageColors {
	/** 背景色 */
	bg: string;
	/** ボーダー色 */
	border: string;
	/** テキスト色 */
	text: string;
}

/**
 * メッセージタイプごとのアイコン
 */
export const messageIcons: Record<MessageType, string> = {
	success: "✓",
	error: "✕",
	warning: "⚠",
	info: "ℹ",
};

/**
 * メッセージタイプごとの色
 */
export const messageColors: Record<MessageType, MessageColors> = {
	success: { bg: "#d4edda", border: "#c3e6cb", text: "#155724" },
	error: { bg: "#f8d7da", border: "#f5c6cb", text: "#721c24" },
	warning: { bg: "#fff3cd", border: "#ffeeba", text: "#856404" },
	info: { bg: "#d1ecf1", border: "#bee5eb", text: "#0c5460" },
};
