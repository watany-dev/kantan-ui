import { raw, renderHtml } from "../utils/html";
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
			const html = renderHtml`<div class="kt-write">${String(content)}</div>`;
			updateContent(id, html, "write");
		},

		text(content: string): void {
			const html = renderHtml`<p class="kt-text">${content}</p>`;
			updateContent(id, html, "text");
		},

		markdown(content: string): void {
			// Note: Full markdown parsing would require a library
			// For now, we wrap in a container and let CSS handle basic styling
			const html = renderHtml`<div class="kt-markdown">${content}</div>`;
			updateContent(id, html, "markdown");
		},

		html(content: string): void {
			// WARNING: This is unsafe and can lead to XSS
			// User is responsible for sanitizing input
			const html = renderHtml`<div class="kt-html">${raw(content)}</div>`;
			updateContent(id, html, "html");
		},

		json(data: unknown): void {
			const formatted = JSON.stringify(data, null, 2);
			const html = renderHtml`<pre class="kt-json"><code>${formatted}</code></pre>`;
			updateContent(id, html, "json");
		},

		code(content: string, language?: string): void {
			const langClass = language ? renderHtml` language-${language}` : "";
			const html = renderHtml`<pre class="kt-code${raw(langClass)}"><code>${content}</code></pre>`;
			updateContent(id, html, "code");
		},

		success(message: string): void {
			const html = renderHtml`<div class="kt-alert kt-alert-success">${message}</div>`;
			updateContent(id, html, "success");
		},

		error(message: string): void {
			const html = renderHtml`<div class="kt-alert kt-alert-error">${message}</div>`;
			updateContent(id, html, "error");
		},

		warning(message: string): void {
			const html = renderHtml`<div class="kt-alert kt-alert-warning">${message}</div>`;
			updateContent(id, html, "warning");
		},

		info(message: string): void {
			const html = renderHtml`<div class="kt-alert kt-alert-info">${message}</div>`;
			updateContent(id, html, "info");
		},

		progress(value: number, config?: ProgressConfig): void {
			const percent = Math.max(0, Math.min(100, value * 100));
			const textHtml = config?.text
				? renderHtml`<span class="kt-progress-text">${config.text}</span>`
				: "";
			const html = renderHtml`<div class="kt-progress-container">${raw(textHtml)}<progress class="kt-progress" value="${percent}" max="100"></progress></div>`;
			updateContent(id, html, "progress");
		},

		spinner(text?: string): void {
			const textHtml = text ? renderHtml`<span class="kt-spinner-text">${text}</span>` : "";
			const html = renderHtml`<div class="kt-spinner">${raw(textHtml)}</div>`;
			updateContent(id, html, "spinner");
		},

		empty(): void {
			updateContent(id, "", "empty");
		},
	};
}
