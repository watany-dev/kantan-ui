/**
 * Result of magic bytes verification
 */
export interface MagicBytesResult {
	/** The MIME type detected from magic bytes */
	detectedMime: string;
	/** The MIME type claimed by the client */
	claimedMime: string;
	/** Whether the file signature is valid */
	isValid: boolean;
	/** Whether there's a mismatch between detected and claimed MIME */
	mismatch: boolean;
	/** Whether the file is potentially dangerous */
	isDangerous: boolean;
	/** Reason why file is dangerous (if applicable) */
	dangerousReason?: string;
}

/**
 * Known file signatures (magic bytes) for safe file types
 */
const SAFE_SIGNATURES: Array<{
	mime: string;
	signatures: Array<number[] | { bytes: number[]; offset?: number }>;
}> = [
	// Images
	{
		mime: "image/png",
		signatures: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
	},
	{
		mime: "image/jpeg",
		signatures: [[0xff, 0xd8, 0xff]],
	},
	{
		mime: "image/gif",
		signatures: [
			[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
			[0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
		],
	},
	{
		mime: "image/bmp",
		signatures: [[0x42, 0x4d]], // BM
	},
	{
		mime: "image/webp",
		signatures: [
			// RIFF....WEBP - need to check both parts
			{ bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF at start
		],
	},
	// Documents
	{
		mime: "application/pdf",
		signatures: [[0x25, 0x50, 0x44, 0x46, 0x2d]], // %PDF-
	},
	// Archives
	{
		mime: "application/zip",
		signatures: [
			[0x50, 0x4b, 0x03, 0x04], // Normal ZIP
			[0x50, 0x4b, 0x05, 0x06], // Empty ZIP
			[0x50, 0x4b, 0x07, 0x08], // Spanned ZIP
		],
	},
];

/**
 * Dangerous file signatures that should be blocked
 */
const DANGEROUS_SIGNATURES: Array<{
	bytes: number[] | string;
	description: string;
	isTextPattern?: boolean;
}> = [
	// Executables
	{ bytes: [0x4d, 0x5a], description: "Windows executable (MZ)" },
	{ bytes: [0x7f, 0x45, 0x4c, 0x46], description: "ELF executable" },
	{ bytes: [0xfe, 0xed, 0xfa, 0xce], description: "Mach-O executable (32-bit)" },
	{ bytes: [0xfe, 0xed, 0xfa, 0xcf], description: "Mach-O executable (64-bit)" },
	{ bytes: [0xcf, 0xfa, 0xed, 0xfe], description: "Mach-O executable (reverse)" },
	{ bytes: [0xca, 0xfe, 0xba, 0xbe], description: "Java class file / Mach-O fat binary" },

	// Scripts (text patterns)
	{ bytes: "#!", description: "Shell script (shebang)", isTextPattern: true },
	{ bytes: "@echo off", description: "Windows batch file", isTextPattern: true },
	{ bytes: "@ECHO OFF", description: "Windows batch file", isTextPattern: true },
];

/**
 * Check for WebP signature (RIFF + WEBP)
 */
function isWebP(data: Uint8Array): boolean {
	if (data.length < 12) return false;
	// Check RIFF at start
	if (data[0] !== 0x52 || data[1] !== 0x49 || data[2] !== 0x46 || data[3] !== 0x46) {
		return false;
	}
	// Check WEBP at offset 8
	if (data[8] !== 0x57 || data[9] !== 0x45 || data[10] !== 0x42 || data[11] !== 0x50) {
		return false;
	}
	return true;
}

/**
 * Check for SVG signature
 */
function isSvg(data: Uint8Array): boolean {
	// Convert first 256 bytes to string for pattern matching
	const headerSize = Math.min(data.length, 256);
	const header = new TextDecoder().decode(data.slice(0, headerSize));

	// Check for XML declaration or SVG tag
	const trimmed = header.trimStart().toLowerCase();
	return trimmed.startsWith("<?xml") || trimmed.startsWith("<svg");
}

/**
 * Verify magic bytes of uploaded file
 *
 * @param data The file data as ArrayBuffer
 * @param claimedMime The MIME type claimed by the client
 * @returns Verification result
 */
export function verifyMagicBytes(data: ArrayBuffer, claimedMime: string): MagicBytesResult {
	const bytes = new Uint8Array(data);

	// Default result
	const result: MagicBytesResult = {
		detectedMime: "application/octet-stream",
		claimedMime,
		isValid: true,
		mismatch: false,
		isDangerous: false,
	};

	// Empty file is valid but unknown type
	if (bytes.length === 0) {
		return result;
	}

	// Check for dangerous signatures first
	const dangerCheck = checkDangerousSignatures(bytes);
	if (dangerCheck.isDangerous) {
		result.isDangerous = true;
		if (dangerCheck.reason) {
			result.dangerousReason = dangerCheck.reason;
		}
		result.mismatch = true; // Dangerous files always mismatch safe types
		return result;
	}

	// Detect MIME type from magic bytes
	const detectedMime = detectMimeType(bytes);
	result.detectedMime = detectedMime;

	// Check for mismatch
	if (detectedMime !== "application/octet-stream" && !mimeTypesMatch(detectedMime, claimedMime)) {
		result.mismatch = true;
	}

	// For text types, validate content is actually text
	if (isTextMime(claimedMime) && !dangerCheck.isDangerous) {
		result.isValid = true;
	}

	return result;
}

/**
 * Check for dangerous file signatures
 */
function checkDangerousSignatures(bytes: Uint8Array): { isDangerous: boolean; reason?: string } {
	for (const sig of DANGEROUS_SIGNATURES) {
		if (sig.isTextPattern) {
			// Text pattern matching
			const pattern = sig.bytes as string;
			const headerSize = Math.min(bytes.length, 256);
			const header = new TextDecoder().decode(bytes.slice(0, headerSize));
			const trimmed = header.trimStart().toLowerCase();

			if (trimmed.startsWith(pattern.toLowerCase())) {
				return { isDangerous: true, reason: sig.description };
			}
		} else {
			// Binary signature matching
			const sigBytes = sig.bytes as number[];
			if (matchesSignature(bytes, sigBytes)) {
				return { isDangerous: true, reason: sig.description };
			}
		}
	}

	return { isDangerous: false };
}

/**
 * Detect MIME type from file contents
 */
function detectMimeType(bytes: Uint8Array): string {
	// Check WebP first (special case with two parts)
	if (isWebP(bytes)) {
		return "image/webp";
	}

	// Check SVG (text-based)
	if (isSvg(bytes)) {
		return "image/svg+xml";
	}

	// Check other signatures
	for (const entry of SAFE_SIGNATURES) {
		for (const sig of entry.signatures) {
			if (Array.isArray(sig)) {
				if (matchesSignature(bytes, sig)) {
					return entry.mime;
				}
			} else {
				// Object with offset
				if (matchesSignature(bytes, sig.bytes, sig.offset)) {
					return entry.mime;
				}
			}
		}
	}

	return "application/octet-stream";
}

/**
 * Check if bytes match a signature at given offset
 */
function matchesSignature(bytes: Uint8Array, signature: number[], offset = 0): boolean {
	if (bytes.length < offset + signature.length) {
		return false;
	}

	for (let i = 0; i < signature.length; i++) {
		if (bytes[offset + i] !== signature[i]) {
			return false;
		}
	}

	return true;
}

/**
 * Check if two MIME types are equivalent
 */
function mimeTypesMatch(detected: string, claimed: string): boolean {
	// Exact match
	if (detected === claimed) {
		return true;
	}

	// Normalize MIME types
	const normalizedDetected = detected.toLowerCase();
	const normalizedClaimed = claimed.toLowerCase();

	if (normalizedDetected === normalizedClaimed) {
		return true;
	}

	// Allow application/octet-stream as wildcard
	if (normalizedClaimed === "application/octet-stream") {
		return true;
	}

	// JPEG variants
	if (
		(normalizedDetected === "image/jpeg" || normalizedDetected === "image/jpg") &&
		(normalizedClaimed === "image/jpeg" || normalizedClaimed === "image/jpg")
	) {
		return true;
	}

	return false;
}

/**
 * Check if MIME type is a text type
 */
function isTextMime(mime: string): boolean {
	const normalized = mime.toLowerCase();
	return (
		normalized.startsWith("text/") ||
		normalized === "application/json" ||
		normalized === "application/javascript" ||
		normalized === "application/xml" ||
		normalized.endsWith("+xml") ||
		normalized.endsWith("+json")
	);
}
