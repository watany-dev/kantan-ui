/**
 * Options for write_stream()
 */
export interface WriteStreamOptions {
	/** Render as Markdown after completion (default: false) */
	markdown?: boolean;
	/** CSS class to add to the element */
	className?: string;
}

/**
 * A pending stream waiting to be processed
 * Internal data structure used by StreamRegistry
 */
export interface PendingStream {
	/** Unique ID for the stream element */
	id: string;
	/** Normalized ReadableStream */
	stream: ReadableStream<string>;
	/** Options passed to write_stream() */
	options: WriteStreamOptions;
	/** Promise resolve callback (with full text) */
	resolve: (text: string) => void;
	/** Promise reject callback (on error) */
	reject: (error: Error) => void;
}

/**
 * StreamRegistry interface
 */
export interface StreamRegistry {
	/**
	 * Register a pending stream for a session
	 * @param sessionKey Session identifier (object reference)
	 * @param pending The pending stream to register
	 */
	register(sessionKey: object, pending: PendingStream): void;

	/**
	 * Consume all pending streams for a session
	 * @param sessionKey Session identifier
	 * @returns Array of pending streams (empties the registry for this session)
	 */
	consume(sessionKey: object): PendingStream[];

	/**
	 * Check if a session has pending streams
	 * @param sessionKey Session identifier
	 * @returns true if there are pending streams
	 */
	hasPending(sessionKey: object): boolean;

	/**
	 * Clear all pending streams for a session without processing
	 * @param sessionKey Session identifier
	 */
	clear(sessionKey: object): void;
}

/**
 * Create a new StreamRegistry instance
 * Uses WeakMap to allow garbage collection when sessions are destroyed
 */
export function createStreamRegistry(): StreamRegistry {
	// WeakMap allows sessions to be garbage collected when no longer referenced
	const pending = new WeakMap<object, PendingStream[]>();

	return {
		register(sessionKey: object, stream: PendingStream): void {
			const streams = pending.get(sessionKey) ?? [];
			streams.push(stream);
			pending.set(sessionKey, streams);
		},

		consume(sessionKey: object): PendingStream[] {
			const streams = pending.get(sessionKey) ?? [];
			pending.delete(sessionKey);
			return streams;
		},

		hasPending(sessionKey: object): boolean {
			const streams = pending.get(sessionKey);
			return streams !== undefined && streams.length > 0;
		},

		clear(sessionKey: object): void {
			pending.delete(sessionKey);
		},
	};
}

/**
 * Global stream registry instance
 * Used by write_stream() to register pending streams
 * and by the stream processor to consume them
 */
export const streamRegistry = createStreamRegistry();
