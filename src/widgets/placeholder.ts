import { escapeHtml } from "../utils/html";
import { setWidgetValue } from "./registry";
import type {
	Placeholder,
	PlaceholderContentType,
	PlaceholderState,
	ProgressConfig,
} from "./types";

/**
 * Update placeholder content in session state
 */
function updateContent(id: string, html: string, contentType: PlaceholderContentType): void {
	const state: PlaceholderState = { html, contentType };
	setWidgetValue(id, state);
}

/**
 * Create a Placeholder object for dynamic content updates
 * @param id - Placeholder ID
 * @returns Placeholder object with methods to update content
 */
export function createPlaceholder(id: string): Placeholder {
	return {
		id,

		write(content: string | number | boolean): void {
			const html = `<div class="kt-write">${escapeHtml(String(content))}</div>`;
			updateContent(id, html, "write");
		},

		text(content: string): void {
			const html = `<p class="kt-text">${escapeHtml(content)}</p>`;
			updateContent(id, html, "text");
		},

		markdown(content: string): void {
			// Note: Full markdown parsing would require a library
			// For now, we wrap in a container and let CSS handle basic styling
			const html = `<div class="kt-markdown">${escapeHtml(content)}</div>`;
			updateContent(id, html, "markdown");
		},

		html(content: string): void {
			// WARNING: This is unsafe and can lead to XSS
			// User is responsible for sanitizing input
			const html = `<div class="kt-html">${content}</div>`;
			updateContent(id, html, "html");
		},

		json(data: unknown): void {
			const formatted = JSON.stringify(data, null, 2);
			const html = `<pre class="kt-json"><code>${escapeHtml(formatted)}</code></pre>`;
			updateContent(id, html, "json");
		},

		code(content: string, language?: string): void {
			const langClass = language ? ` language-${escapeHtml(language)}` : "";
			const html = `<pre class="kt-code${langClass}"><code>${escapeHtml(content)}</code></pre>`;
			updateContent(id, html, "code");
		},

		success(message: string): void {
			const html = `<div class="kt-alert kt-alert-success">${escapeHtml(message)}</div>`;
			updateContent(id, html, "success");
		},

		error(message: string): void {
			const html = `<div class="kt-alert kt-alert-error">${escapeHtml(message)}</div>`;
			updateContent(id, html, "error");
		},

		warning(message: string): void {
			const html = `<div class="kt-alert kt-alert-warning">${escapeHtml(message)}</div>`;
			updateContent(id, html, "warning");
		},

		info(message: string): void {
			const html = `<div class="kt-alert kt-alert-info">${escapeHtml(message)}</div>`;
			updateContent(id, html, "info");
		},

		progress(value: number, config?: ProgressConfig): void {
			const percent = Math.max(0, Math.min(100, value * 100));
			const textHtml = config?.text
				? `<span class="kt-progress-text">${escapeHtml(config.text)}</span>`
				: "";
			const html = `<div class="kt-progress-container">${textHtml}<progress class="kt-progress" value="${percent}" max="100"></progress></div>`;
			updateContent(id, html, "progress");
		},

		spinner(text?: string): void {
			const textHtml = text ? `<span class="kt-spinner-text">${escapeHtml(text)}</span>` : "";
			const html = `<div class="kt-spinner">${textHtml}</div>`;
			updateContent(id, html, "spinner");
		},

		empty(): void {
			updateContent(id, "", "empty");
		},
	};
}
