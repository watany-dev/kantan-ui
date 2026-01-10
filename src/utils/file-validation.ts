import { verifyMagicBytes } from "./magic-bytes";
import { detectPolyglot } from "./polyglot-detection";
import { sanitizeFilename } from "./sanitize";

/**
 * Error codes for file validation
 */
export type FileValidationErrorCode =
	| "SIZE_EXCEEDED"
	| "TYPE_NOT_ALLOWED"
	| "DANGEROUS_FILE"
	| "MIME_MISMATCH"
	| "POLYGLOT_DETECTED"
	| "VALIDATION_ERROR";

/**
 * Validation error or warning
 */
export interface FileValidationIssue {
	code: FileValidationErrorCode;
	message: string;
}

/**
 * Configuration for file validation
 */
export interface FileValidationConfig {
	/** Maximum file size in bytes */
	maxSize?: number;
	/** Accepted file types (MIME types or extensions) */
	accept?: string | readonly string[];
	/** Treat warnings as errors */
	strictMode?: boolean;
	/** Enable polyglot detection (default: true) */
	detectPolyglot?: boolean;
	/** Enable magic bytes verification (default: true) */
	verifyMagicBytes?: boolean;
}

/**
 * Result of file validation
 */
export interface FileValidationResult {
	/** Whether the file passed validation */
	valid: boolean;
	/** Validation errors (blocking) */
	errors: FileValidationIssue[];
	/** Validation warnings (non-blocking unless strictMode) */
	warnings: FileValidationIssue[];
	/** Sanitized filename */
	sanitizedFilename: string;
	/** Verified MIME type from magic bytes */
	verifiedMime: string;
}

/**
 * Default validation configuration
 */
const DEFAULT_CONFIG: Required<FileValidationConfig> = {
	maxSize: 200 * 1024 * 1024, // 200MB
	accept: [],
	strictMode: false,
	detectPolyglot: true,
	verifyMagicBytes: true,
};

/**
 * Validate an uploaded file
 *
 * This function performs comprehensive validation including:
 * - Size check
 * - File type check (accept filter)
 * - Magic bytes verification
 * - Dangerous file detection
 * - Polyglot detection
 * - Filename sanitization
 *
 * @param data File data as ArrayBuffer
 * @param filename Original filename
 * @param claimedMime MIME type claimed by client
 * @param config Validation configuration
 * @returns Validation result
 */
export function validateUploadedFile(
	data: ArrayBuffer,
	filename: string,
	claimedMime: string,
	config: FileValidationConfig,
): FileValidationResult {
	const cfg = { ...DEFAULT_CONFIG, ...config };
	const errors: FileValidationIssue[] = [];
	const warnings: FileValidationIssue[] = [];

	// Sanitize filename
	const sanitizedFilename = sanitizeFilename(filename);

	// Default verified MIME to claimed
	let verifiedMime = claimedMime;

	// 1. Size validation
	if (data.byteLength > cfg.maxSize) {
		errors.push({
			code: "SIZE_EXCEEDED",
			message: `File size ${formatSize(data.byteLength)} exceeds maximum ${formatSize(cfg.maxSize)}`,
		});
	}

	// 2. Accept filter validation
	const acceptList = normalizeAccept(cfg.accept);
	if (acceptList.length > 0 && !matchesAccept(filename, claimedMime, acceptList)) {
		errors.push({
			code: "TYPE_NOT_ALLOWED",
			message: `File type not allowed. Accepted: ${acceptList.join(", ")}`,
		});
	}

	// 3. Magic bytes verification
	if (cfg.verifyMagicBytes) {
		const magicResult = verifyMagicBytes(data, claimedMime);

		// Update verified MIME
		verifiedMime = magicResult.detectedMime;

		// Check for dangerous files
		if (magicResult.isDangerous) {
			errors.push({
				code: "DANGEROUS_FILE",
				message: `Dangerous file detected: ${magicResult.dangerousReason || "unknown threat"}`,
			});
		}

		// Check for MIME mismatch
		if (magicResult.mismatch && !magicResult.isDangerous) {
			warnings.push({
				code: "MIME_MISMATCH",
				message: `MIME mismatch: claimed ${claimedMime}, detected ${magicResult.detectedMime}`,
			});
		}
	}

	// 4. Polyglot detection
	if (cfg.detectPolyglot) {
		const polyglotResult = detectPolyglot(data, claimedMime);
		if (polyglotResult.isSuspicious) {
			warnings.push({
				code: "POLYGLOT_DETECTED",
				message: `Suspicious file content: ${polyglotResult.reasons.join(", ")}`,
			});
		}
	}

	// Determine validity
	let valid = errors.length === 0;

	// In strict mode, warnings become errors
	if (cfg.strictMode && warnings.length > 0) {
		valid = false;
	}

	return {
		valid,
		errors,
		warnings,
		sanitizedFilename,
		verifiedMime,
	};
}

/**
 * Normalize accept configuration to array
 */
function normalizeAccept(accept: string | readonly string[] | undefined): string[] {
	if (!accept) return [];
	if (typeof accept === "string") return [accept];
	return [...accept];
}

/**
 * Check if file matches accept filter
 */
function matchesAccept(filename: string, mime: string, acceptList: string[]): boolean {
	const ext = getExtension(filename);
	const normalizedMime = mime.toLowerCase();

	for (const accept of acceptList) {
		// Extension match (e.g., ".pdf")
		if (accept.startsWith(".")) {
			if (ext.toLowerCase() === accept.toLowerCase()) {
				return true;
			}
			continue;
		}

		// Wildcard MIME (e.g., "image/*")
		if (accept.endsWith("/*")) {
			const baseType = accept.slice(0, -2).toLowerCase();
			if (normalizedMime.startsWith(`${baseType}/`)) {
				return true;
			}
			continue;
		}

		// Exact MIME match
		if (normalizedMime === accept.toLowerCase()) {
			return true;
		}
	}

	return false;
}

/**
 * Get file extension including dot
 */
function getExtension(filename: string): string {
	const lastDot = filename.lastIndexOf(".");
	if (lastDot === -1 || lastDot === filename.length - 1) {
		return "";
	}
	return filename.slice(lastDot);
}

/**
 * Format byte size for display
 */
function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} bytes`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
