import { createPlaceholder } from "../widgets/placeholder";
import { generateWidgetId, getWidgetValue } from "../widgets/registry";
import type { EmptyConfig, Placeholder, PlaceholderState } from "../widgets/types";
import { requireRenderContext } from "./context";

/**
 * Default empty state
 */
const DEFAULT_STATE: PlaceholderState = {
	html: "",
	contentType: "empty",
};

/**
 * Create an empty placeholder that can be dynamically updated
 * Similar to Streamlit's st.empty()
 *
 * @param config - Configuration options
 * @returns Placeholder object with methods to update content
 *
 * @example
 * ```typescript
 * // Basic usage
 * const placeholder = kt.empty();
 * placeholder.write("Loading...");
 *
 * // Later update
 * placeholder.success("Done!");
 *
 * // Clear content
 * placeholder.empty();
 *
 * // With key for persistence
 * const status = kt.empty({ key: "status" });
 * status.spinner("Processing...");
 * ```
 */
export function empty(config?: EmptyConfig): Placeholder {
	const ctx = requireRenderContext();
	const id = generateWidgetId(config?.key);

	// Get current state (or default to empty)
	const state = getWidgetValue<PlaceholderState>(id, DEFAULT_STATE);

	// Render placeholder container with current content
	const containerHtml = `<div id="kt-empty-${id}" class="kt-empty">${state.html}</div>`;
	ctx.append(containerHtml);

	// Return Placeholder object for dynamic updates
	return createPlaceholder(id);
}
