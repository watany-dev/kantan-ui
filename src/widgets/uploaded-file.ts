import type { UploadedFile } from "./types";

/**
 * Create an UploadedFile object from raw data
 *
 * The returned object implements the UploadedFile interface with:
 * - Defensive copying for arrayBuffer() to prevent mutation
 * - UTF-8 decoding for text()
 * - ReadableStream creation for stream()
 * - Immutable properties (name, size, type)
 *
 * @param name Sanitized filename
 * @param type Verified MIME type
 * @param data Raw file data
 * @returns UploadedFile object
 */
export function createUploadedFile(name: string, type: string, data: ArrayBuffer): UploadedFile {
	// Store a copy of the data to ensure immutability
	const internalData = data.slice(0);

	// Create the file object with frozen properties
	const file: UploadedFile = Object.freeze({
		get name() {
			return name;
		},
		get size() {
			return internalData.byteLength;
		},
		get type() {
			return type;
		},
		arrayBuffer() {
			// Return a defensive copy
			return internalData.slice(0);
		},
		text() {
			return new TextDecoder("utf-8").decode(internalData);
		},
		stream() {
			// Create a new ReadableStream each time
			const bytes = new Uint8Array(internalData.slice(0));
			return new ReadableStream<Uint8Array>({
				start(controller) {
					controller.enqueue(bytes);
					controller.close();
				},
			});
		},
	});

	return file;
}

/**
 * Create an UploadedFile from internal upload data
 *
 * @param uploadData Internal upload data from session
 * @returns UploadedFile object
 */
export function createUploadedFileFromInternal(uploadData: {
	originalName: string;
	verifiedMime: string;
	data: ArrayBuffer;
}): UploadedFile {
	return createUploadedFile(uploadData.originalName, uploadData.verifiedMime, uploadData.data);
}
