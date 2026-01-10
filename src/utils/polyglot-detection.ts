/**
 * Result of polyglot detection
 */
export interface PolyglotResult {
	/** Whether the file is suspicious (potential polyglot) */
	isSuspicious: boolean;
	/** Reasons why the file is suspicious */
	reasons: string[];
}

/**
 * Suspicious patterns to look for in binary files
 */
const SUSPICIOUS_BINARY_SIGNATURES = [
	{ bytes: [0x50, 0x4b, 0x03, 0x04], description: "ZIP archive signature" },
	{ bytes: [0x50, 0x4b, 0x05, 0x06], description: "ZIP archive signature (empty)" },
	{ bytes: [0x4d, 0x5a], description: "Windows executable (MZ)" },
	{ bytes: [0x7f, 0x45, 0x4c, 0x46], description: "ELF executable" },
	{ bytes: [0xfe, 0xed, 0xfa, 0xce], description: "Mach-O executable (32-bit)" },
	{ bytes: [0xfe, 0xed, 0xfa, 0xcf], description: "Mach-O executable (64-bit)" },
	{ bytes: [0xca, 0xfe, 0xba, 0xbe], description: "Java class file" },
];

/**
 * Suspicious text patterns to look for
 */
const SUSPICIOUS_TEXT_PATTERNS = [
	{ pattern: /<script[\s>]/i, description: "Script tag embedded" },
	{ pattern: /javascript\s*:/i, description: "JavaScript URL" },
	{ pattern: /vbscript\s*:/i, description: "VBScript URL" },
	{ pattern: /\bon\w+\s*=/i, description: "Event handler attribute" },
	{ pattern: /<!DOCTYPE\s+html/i, description: "HTML doctype" },
	{ pattern: /<html[\s>]/i, description: "HTML tag" },
	{ pattern: /<iframe[\s>]/i, description: "Iframe tag" },
	{ pattern: /<embed[\s>]/i, description: "Embed tag" },
	{ pattern: /<object[\s>]/i, description: "Object tag" },
];

/**
 * PDF-specific suspicious patterns
 */
const PDF_SUSPICIOUS_PATTERNS = [
	{ pattern: /\/JS[\s(]/i, description: "PDF JavaScript object" },
	{ pattern: /\/JavaScript[\s/]/i, description: "PDF JavaScript action" },
	{ pattern: /\/OpenAction[\s/]/i, description: "PDF OpenAction (auto-execute)" },
	{ pattern: /\/AA[\s/]/i, description: "PDF Additional Actions" },
	{ pattern: /\/Launch[\s/]/i, description: "PDF Launch action" },
];

/**
 * Check if MIME type indicates an image
 */
function isImageMime(mime: string): boolean {
	return mime.toLowerCase().startsWith("image/");
}

/**
 * Check if MIME type indicates a PDF
 */
function isPdfMime(mime: string): boolean {
	return mime.toLowerCase() === "application/pdf";
}

/**
 * Detect polyglot files - files that can be interpreted as multiple formats
 *
 * This function scans file content for signatures and patterns that indicate
 * the file might be a polyglot (e.g., GIFAR - a file that is both GIF and JAR/ZIP)
 *
 * @param data The file data as ArrayBuffer
 * @param claimedMime The MIME type claimed for the file
 * @returns Detection result with suspicious flag and reasons
 */
export function detectPolyglot(data: ArrayBuffer, claimedMime: string): PolyglotResult {
	const result: PolyglotResult = {
		isSuspicious: false,
		reasons: [],
	};

	const bytes = new Uint8Array(data);

	// Empty or very small files are not suspicious polyglots
	if (bytes.length < 4) {
		return result;
	}

	// Check for embedded binary signatures
	const binaryCheck = checkBinarySignatures(bytes, claimedMime);
	if (binaryCheck.suspicious) {
		result.isSuspicious = true;
		result.reasons.push(...binaryCheck.reasons);
	}

	// Check for embedded text patterns (for images and binary files)
	if (isImageMime(claimedMime) || claimedMime === "application/octet-stream") {
		const textCheck = checkTextPatterns(bytes);
		if (textCheck.suspicious) {
			result.isSuspicious = true;
			result.reasons.push(...textCheck.reasons);
		}
	}

	// Check for PDF-specific dangers
	if (isPdfMime(claimedMime)) {
		const pdfCheck = checkPdfPatterns(bytes);
		if (pdfCheck.suspicious) {
			result.isSuspicious = true;
			result.reasons.push(...pdfCheck.reasons);
		}
	}

	return result;
}

/**
 * Check for suspicious binary signatures embedded in file
 */
function checkBinarySignatures(
	bytes: Uint8Array,
	claimedMime: string,
): { suspicious: boolean; reasons: string[] } {
	const reasons: string[] = [];

	// Skip the first few bytes (file header) and scan the rest
	const startOffset = getHeaderSize(claimedMime);

	for (const sig of SUSPICIOUS_BINARY_SIGNATURES) {
		// Look for signature after the header
		const found = findSignature(bytes, sig.bytes, startOffset);
		if (found !== -1) {
			reasons.push(`${sig.description} found at offset ${found}`);
		}
	}

	return {
		suspicious: reasons.length > 0,
		reasons,
	};
}

/**
 * Check for suspicious text patterns in binary data
 */
function checkTextPatterns(bytes: Uint8Array): { suspicious: boolean; reasons: string[] } {
	const reasons: string[] = [];

	// Convert to string for pattern matching
	// Only check a portion to avoid performance issues with large files
	const maxCheckSize = Math.min(bytes.length, 64 * 1024); // Check first 64KB
	const text = bytesToString(bytes.slice(0, maxCheckSize));

	for (const entry of SUSPICIOUS_TEXT_PATTERNS) {
		if (entry.pattern.test(text)) {
			reasons.push(entry.description);
		}
	}

	return {
		suspicious: reasons.length > 0,
		reasons,
	};
}

/**
 * Check for suspicious patterns in PDF files
 */
function checkPdfPatterns(bytes: Uint8Array): { suspicious: boolean; reasons: string[] } {
	const reasons: string[] = [];

	// Convert PDF to string for pattern matching
	const text = bytesToString(bytes);

	for (const entry of PDF_SUSPICIOUS_PATTERNS) {
		if (entry.pattern.test(text)) {
			reasons.push(entry.description);
		}
	}

	return {
		suspicious: reasons.length > 0,
		reasons,
	};
}

/**
 * Get estimated header size for a MIME type
 */
function getHeaderSize(mime: string): number {
	const normalized = mime.toLowerCase();

	// Image formats typically have small headers
	if (normalized === "image/png") return 8;
	if (normalized === "image/jpeg") return 2;
	if (normalized === "image/gif") return 6;
	if (normalized === "image/bmp") return 2;
	if (normalized === "image/webp") return 12;

	// PDF header is small
	if (normalized === "application/pdf") return 5;

	// Default: skip minimal amount
	return 4;
}

/**
 * Find a byte signature in data starting from offset
 */
function findSignature(data: Uint8Array, signature: number[], startOffset: number): number {
	const maxOffset = data.length - signature.length;

	for (let i = startOffset; i <= maxOffset; i++) {
		let match = true;
		for (let j = 0; j < signature.length; j++) {
			if (data[i + j] !== signature[j]) {
				match = false;
				break;
			}
		}
		if (match) {
			return i;
		}
	}

	return -1;
}

/**
 * Convert bytes to string for pattern matching
 * Uses Latin-1 encoding to preserve byte values
 */
function bytesToString(bytes: Uint8Array): string {
	// Use Latin-1 (ISO-8859-1) to preserve all byte values
	const result: string[] = [];
	for (let i = 0; i < bytes.length; i++) {
		result.push(String.fromCharCode(bytes[i]));
	}
	return result.join("");
}
