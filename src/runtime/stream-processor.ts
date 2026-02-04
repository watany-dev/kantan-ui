import { parseMarkdown } from "../kt/markdown/parser.js";
import { sanitizeMarkdownHtml } from "../kt/markdown/sanitizer.js";
import {
	streamRegistry as defaultRegistry,
	type PendingStream,
	type StreamRegistry,
} from "../kt/stream-registry.js";
import type { Patch, StreamChunkPatch, StreamEndPatch } from "../websocket/types.js";

/**
 * Patch emission callback type
 */
export type EmitPatch = (patch: Patch) => void;

/**
 * Process a single stream, emitting patches for each chunk
 *
 * @param pending - The pending stream to process
 * @param emit - Callback to emit patches
 */
async function processStream(pending: PendingStream, emit: EmitPatch): Promise<void> {
	const reader = pending.stream.getReader();
	let fullText = "";

	try {
		while (true) {
			const { done, value } = await reader.read();

			if (done) {
				break;
			}

			// Emit chunk patch
			const chunkPatch: StreamChunkPatch = {
				type: "streamChunk",
				streamId: pending.id,
				content: value,
			};
			emit(chunkPatch);

			// Accumulate full text
			fullText += value;
		}

		// Create streamEnd patch
		const endPatch: StreamEndPatch = {
			type: "streamEnd",
			streamId: pending.id,
		};

		// Add finalHtml for markdown streams (with XSS sanitization)
		if (pending.options.markdown) {
			endPatch.finalHtml = sanitizeMarkdownHtml(parseMarkdown(fullText));
		}

		emit(endPatch);

		// Resolve the promise with full text
		pending.resolve(fullText);
	} catch (error) {
		// Reject the promise on error
		pending.reject(error instanceof Error ? error : new Error(String(error)));
	} finally {
		reader.releaseLock();
	}
}

/**
 * Process all pending streams for a session
 *
 * After rerun() completes, this function consumes all registered streams
 * and processes them in parallel, emitting patches for each chunk.
 *
 * @param sessionKey - Session identifier (object reference)
 * @param emit - Callback to emit patches
 * @param registry - Stream registry instance (defaults to global registry)
 *
 * @example
 * ```typescript
 * await processStreams(sessionKey, (patch) => {
 *   sessionManager.broadcast(sessionId, JSON.stringify({ type: "patch", patches: [patch] }));
 * });
 * ```
 */
export async function processStreams(
	sessionKey: object,
	emit: EmitPatch,
	registry: StreamRegistry = defaultRegistry,
): Promise<void> {
	const pending = registry.consume(sessionKey);

	if (pending.length === 0) {
		return;
	}

	// Process all streams in parallel
	await Promise.all(pending.map((stream) => processStream(stream, emit)));
}
