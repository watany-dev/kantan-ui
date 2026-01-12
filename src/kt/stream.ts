import { requireRenderContext } from "./context.js";
import { type PendingStream, streamRegistry, type WriteStreamOptions } from "./stream-registry.js";
import { type StreamSource, toReadableStream } from "./stream-utils.js";

/**
 * Generates a unique stream ID
 */
function generateStreamId(): string {
	return `kt-stream-${crypto.randomUUID()}`;
}

/**
 * Generates placeholder HTML for stream display
 */
function generatePlaceholderHtml(streamId: string, options: WriteStreamOptions): string {
	const classNames = ["kt-stream"];
	if (options.className) {
		classNames.push(options.className);
	}

	const dataAttrs = options.markdown ? ' data-markdown="true"' : "";

	return `<div id="${streamId}" class="${classNames.join(" ")}"${dataAttrs}><span class="kt-stream-content"></span><span class="kt-stream-cursor"></span></div>`;
}

/**
 * Display streaming text from a source progressively
 *
 * @param source - Stream source (ReadableStream, AsyncIterable, Iterable, Response, or factory)
 * @param options - Display options
 * @returns Promise resolving to the full concatenated text
 *
 * @example
 * ```typescript
 * // AsyncGenerator (LLM-style)
 * async function* generateResponse() {
 *   yield "Hello, ";
 *   yield "World!";
 * }
 * const fullText = await kt.write_stream(generateResponse());
 *
 * // Array
 * await kt.write_stream(["Loading", ".", ".", "."]);
 *
 * // With Markdown rendering
 * await kt.write_stream(markdownStream, { markdown: true });
 * ```
 */
export function write_stream(
	source: StreamSource,
	options: WriteStreamOptions = {},
): Promise<string> {
	const ctx = requireRenderContext();

	// Generate unique ID for this stream element
	const streamId = generateStreamId();

	// Convert source to ReadableStream
	const stream = toReadableStream(source);

	// Generate and append placeholder HTML
	const html = generatePlaceholderHtml(streamId, options);
	ctx.append(html);

	// Create promise that will be resolved when stream processing completes
	return new Promise<string>((resolve, reject) => {
		const pending: PendingStream = {
			id: streamId,
			stream,
			options,
			resolve,
			reject,
		};

		// Register for processing after rerun completes
		// Using a simple object as session key for now
		// This will be replaced with proper session context in integration
		const sessionKey =
			(globalThis as unknown as { __ktStreamSession?: object }).__ktStreamSession ?? {};
		streamRegistry.register(sessionKey, pending);
	});
}

/**
 * Set the session key for stream registration
 * Called by rerun() to establish session context
 */
export function setStreamSessionKey(key: object | null): void {
	(globalThis as unknown as { __ktStreamSession?: object | null }).__ktStreamSession = key;
}
