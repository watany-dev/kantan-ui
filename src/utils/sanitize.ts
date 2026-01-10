/**
 * Windows reserved device names (case-insensitive)
 */
const WINDOWS_RESERVED_NAMES = [
	"CON",
	"PRN",
	"AUX",
	"NUL",
	"COM1",
	"COM2",
	"COM3",
	"COM4",
	"COM5",
	"COM6",
	"COM7",
	"COM8",
	"COM9",
	"LPT1",
	"LPT2",
	"LPT3",
	"LPT4",
	"LPT5",
	"LPT6",
	"LPT7",
	"LPT8",
	"LPT9",
];

/**
 * Maximum filename length in bytes (filesystem limit)
 */
const MAX_FILENAME_BYTES = 255;

/**
 * Sanitize a filename to prevent path traversal and other security issues.
 *
 * Security measures:
 * 1. NULL byte removal - prevents null byte injection attacks
 * 2. Unicode normalization (NFC) - prevents homograph attacks
 * 3. URL-encoded path separator removal - prevents encoded traversal
 * 4. Path separator removal (/ and \) - prevents path traversal
 * 5. Consecutive dot removal - prevents .. traversal
 * 6. Control character removal - prevents terminal injection
 * 7. OS forbidden character replacement - ensures cross-platform compatibility
 * 8. Leading/trailing space and dot removal - prevents filesystem issues
 * 9. Windows reserved name handling - prevents device name exploits
 * 10. Length truncation (255 bytes) - prevents buffer overflow
 *
 * @param filename The original filename to sanitize
 * @returns A sanitized filename safe for filesystem operations
 */
export function sanitizeFilename(filename: string): string {
	let sanitized = filename;

	// 1. Remove NULL bytes
	sanitized = sanitized.replace(/\0/g, "");

	// 2. Unicode normalization (NFC form)
	sanitized = sanitized.normalize("NFC");

	// 3. Remove URL-encoded path separators (case-insensitive)
	sanitized = sanitized.replace(/%2F/gi, "");
	sanitized = sanitized.replace(/%5C/gi, "");

	// 4. Remove path separators
	sanitized = sanitized.replace(/[/\\]/g, "");

	// 5. Remove consecutive dots (replace .. or more with single dot)
	sanitized = sanitized.replace(/\.{2,}/g, ".");

	// 6. Remove control characters (0x00-0x1F and 0x7F)
	// biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally matching control characters for security
	sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, "");

	// 7. Replace OS forbidden characters with underscore
	// Windows: < > : " | ? *
	// Note: / and \ already removed above
	sanitized = sanitized.replace(/[<>:"|?*]/g, "_");

	// 8. Remove leading and trailing spaces and dots
	sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, "");

	// 9. Handle Windows reserved names
	sanitized = handleWindowsReservedName(sanitized);

	// 10. Truncate to MAX_FILENAME_BYTES, preserving extension
	sanitized = truncateFilename(sanitized, MAX_FILENAME_BYTES);

	// If result is empty, generate a fallback name
	if (sanitized === "") {
		sanitized = generateFallbackFilename();
	}

	return sanitized;
}

/**
 * Handle Windows reserved device names by prefixing with underscore
 */
function handleWindowsReservedName(filename: string): string {
	// Extract base name (without extension)
	const dotIndex = filename.indexOf(".");
	const baseName = dotIndex === -1 ? filename : filename.substring(0, dotIndex);
	const extension = dotIndex === -1 ? "" : filename.substring(dotIndex);

	// Check if base name matches a reserved name (case-insensitive)
	const isReserved = WINDOWS_RESERVED_NAMES.some((reserved) => baseName.toUpperCase() === reserved);

	if (isReserved) {
		return `_${baseName}${extension}`;
	}

	return filename;
}

/**
 * Truncate filename to specified byte limit while preserving extension
 */
function truncateFilename(filename: string, maxBytes: number): string {
	const encoder = new TextEncoder();
	const currentBytes = encoder.encode(filename);

	if (currentBytes.length <= maxBytes) {
		return filename;
	}

	// Extract extension
	const lastDotIndex = filename.lastIndexOf(".");
	let extension = "";
	let baseName = filename;

	if (lastDotIndex > 0) {
		extension = filename.substring(lastDotIndex);
		baseName = filename.substring(0, lastDotIndex);

		// If extension itself is too long, truncate it
		const extBytes = encoder.encode(extension);
		if (extBytes.length >= maxBytes) {
			return truncateToBytes(filename, maxBytes);
		}
	}

	// Calculate available bytes for base name
	const extBytes = encoder.encode(extension).length;
	const availableForBase = maxBytes - extBytes;

	// Truncate base name
	const truncatedBase = truncateToBytes(baseName, availableForBase);

	return truncatedBase + extension;
}

/**
 * Truncate a string to specified byte limit without breaking multi-byte characters
 */
function truncateToBytes(str: string, maxBytes: number): string {
	const encoder = new TextEncoder();

	const bytes = encoder.encode(str);
	if (bytes.length <= maxBytes) {
		return str;
	}

	// Binary search for the correct cut point
	let low = 0;
	let high = str.length;

	while (low < high) {
		const mid = Math.floor((low + high + 1) / 2);
		const slice = str.substring(0, mid);
		const sliceBytes = encoder.encode(slice);

		if (sliceBytes.length <= maxBytes) {
			low = mid;
		} else {
			high = mid - 1;
		}
	}

	return str.substring(0, low);
}

/**
 * Generate a fallback filename when sanitization results in empty string
 */
function generateFallbackFilename(): string {
	const randomHex = Math.random().toString(16).substring(2, 10);
	return `file_${randomHex}`;
}

/**
 * Generate a secure file identifier (UUID v4 format)
 *
 * @returns A unique identifier safe for use in file paths and URLs
 */
export function generateSecureFileId(): string {
	// Use crypto.randomUUID if available (modern runtimes)
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}

	// Fallback: generate UUID v4 format manually
	const bytes = new Uint8Array(16);
	if (typeof crypto !== "undefined" && crypto.getRandomValues) {
		crypto.getRandomValues(bytes);
	} else {
		// Last resort: Math.random (not cryptographically secure)
		for (let i = 0; i < 16; i++) {
			bytes[i] = Math.floor(Math.random() * 256);
		}
	}

	// Set version (4) and variant bits
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;

	const hex = Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
