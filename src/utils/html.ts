/**
 * Escape HTML special characters to prevent XSS attacks.
 * This function should be used for all user-provided text that will be rendered as HTML.
 */
export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}
