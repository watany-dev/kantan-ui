/**
 * Stream source types that write_stream() accepts
 * Uses Web standard APIs
 */
export type StreamSource =
	| ReadableStream<string>
	| AsyncIterable<string>
	| Iterable<string>
	| Response
	| (() => StreamSource);

/**
 * Normalize any source to ReadableStream<string>
 * Uses only Web standard APIs for multi-runtime compatibility
 */
export function toReadableStream(source: StreamSource): ReadableStream<string> {
	// Handle null/undefined
	if (source == null) {
		throw new TypeError("Invalid stream source: null or undefined");
	}

	// Factory function: unwrap and recurse
	if (typeof source === "function") {
		return toReadableStream(source());
	}

	// ReadableStream: return as-is
	if (source instanceof ReadableStream) {
		return source;
	}

	// Response: extract body and decode
	if (source instanceof Response) {
		if (!source.body) {
			throw new Error("Response body is null");
		}
		// Web standard: TextDecoderStream
		return source.body.pipeThrough(new TextDecoderStream());
	}

	// AsyncIterable / Iterable -> ReadableStream
	// Web standard: ReadableStream.from() (Chrome 119+, Node 20+, Deno, Bun)
	if (typeof source === "object" && (Symbol.asyncIterator in source || Symbol.iterator in source)) {
		// Type assertion needed: ReadableStream.from() is available but not in TypeScript's lib types
		const RS = ReadableStream as unknown as {
			from: (iterable: AsyncIterable<string> | Iterable<string>) => ReadableStream<string>;
		};
		return RS.from(source as AsyncIterable<string>);
	}

	throw new TypeError(
		`Invalid stream source: expected ReadableStream, AsyncIterable, Iterable, Response, or factory function`,
	);
}
