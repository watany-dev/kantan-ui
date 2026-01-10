import { describe, expect, it } from "vitest";
import { generateSecureFileId, sanitizeFilename } from "../../../src/utils/sanitize";

describe("sanitizeFilename", () => {
	describe("path traversal prevention", () => {
		it("removes path traversal sequences", () => {
			expect(sanitizeFilename("../../../etc/passwd")).toBe("etcpasswd");
		});

		it("removes backslash path traversal", () => {
			expect(sanitizeFilename("..\\..\\..\\windows\\system32")).toBe("windowssystem32");
		});

		it("removes URL-encoded path separators", () => {
			expect(sanitizeFilename("..%2F..%2Fetc")).toBe("etc");
		});

		it("removes URL-encoded backslash", () => {
			expect(sanitizeFilename("..%5C..%5Cwindows")).toBe("windows");
		});

		it("removes forward slashes", () => {
			expect(sanitizeFilename("path/to/file.txt")).toBe("pathtofile.txt");
		});

		it("removes backslashes", () => {
			expect(sanitizeFilename("path\\to\\file.txt")).toBe("pathtofile.txt");
		});
	});

	describe("null byte removal", () => {
		it("removes null bytes", () => {
			expect(sanitizeFilename("file\0.txt")).toBe("file.txt");
		});

		it("removes multiple null bytes", () => {
			expect(sanitizeFilename("fi\0le\0.t\0xt")).toBe("file.txt");
		});
	});

	describe("unicode normalization", () => {
		it("normalizes unicode to NFC form", () => {
			// café with combining acute accent (NFD) should become NFC
			const nfd = "cafe\u0301.txt"; // e + combining acute
			const result = sanitizeFilename(nfd);
			expect(result).toBe("café.txt");
		});

		it("preserves already normalized unicode", () => {
			expect(sanitizeFilename("café.txt")).toBe("café.txt");
		});

		it("handles Japanese characters", () => {
			expect(sanitizeFilename("テスト.txt")).toBe("テスト.txt");
		});

		it("handles emoji", () => {
			expect(sanitizeFilename("file📁.txt")).toBe("file📁.txt");
		});
	});

	describe("control character removal", () => {
		it("removes control characters", () => {
			expect(sanitizeFilename("file\x01\x02\x03.txt")).toBe("file.txt");
		});

		it("removes DEL character", () => {
			expect(sanitizeFilename("file\x7f.txt")).toBe("file.txt");
		});

		it("removes tab and newline", () => {
			expect(sanitizeFilename("file\t\n\r.txt")).toBe("file.txt");
		});
	});

	describe("OS forbidden characters", () => {
		it("replaces Windows forbidden characters", () => {
			expect(sanitizeFilename('file<>:"|?*.txt')).toBe("file_______.txt");
		});

		it("handles asterisk", () => {
			expect(sanitizeFilename("file*.txt")).toBe("file_.txt");
		});

		it("handles question mark", () => {
			expect(sanitizeFilename("file?.txt")).toBe("file_.txt");
		});
	});

	describe("dot handling", () => {
		it("removes consecutive dots", () => {
			expect(sanitizeFilename("file..txt")).toBe("file.txt");
		});

		it("removes multiple consecutive dots", () => {
			expect(sanitizeFilename("file...txt")).toBe("file.txt");
		});

		it("removes leading dots", () => {
			expect(sanitizeFilename(".hidden.txt")).toBe("hidden.txt");
		});

		it("removes trailing dots", () => {
			expect(sanitizeFilename("file.txt.")).toBe("file.txt");
		});

		it("removes leading and trailing spaces", () => {
			expect(sanitizeFilename("  file.txt  ")).toBe("file.txt");
		});
	});

	describe("Windows reserved names", () => {
		it("prefixes CON", () => {
			expect(sanitizeFilename("CON")).toBe("_CON");
		});

		it("prefixes CON.txt", () => {
			expect(sanitizeFilename("CON.txt")).toBe("_CON.txt");
		});

		it("prefixes PRN", () => {
			expect(sanitizeFilename("PRN")).toBe("_PRN");
		});

		it("prefixes AUX", () => {
			expect(sanitizeFilename("AUX")).toBe("_AUX");
		});

		it("prefixes NUL", () => {
			expect(sanitizeFilename("NUL")).toBe("_NUL");
		});

		it("prefixes COM1-COM9", () => {
			expect(sanitizeFilename("COM1")).toBe("_COM1");
			expect(sanitizeFilename("COM9")).toBe("_COM9");
		});

		it("prefixes LPT1-LPT9", () => {
			expect(sanitizeFilename("LPT1")).toBe("_LPT1");
			expect(sanitizeFilename("LPT9")).toBe("_LPT9");
		});

		it("is case insensitive for reserved names", () => {
			expect(sanitizeFilename("con")).toBe("_con");
			expect(sanitizeFilename("Con")).toBe("_Con");
		});

		it("prefixes reserved name with extension", () => {
			expect(sanitizeFilename("nul.txt")).toBe("_nul.txt");
		});
	});

	describe("length truncation", () => {
		it("truncates to 255 bytes", () => {
			const longName = `${"a".repeat(300)}.pdf`;
			const result = sanitizeFilename(longName);
			expect(new TextEncoder().encode(result).length).toBeLessThanOrEqual(255);
		});

		it("preserves extension when truncating", () => {
			const longName = `${"a".repeat(300)}.pdf`;
			const result = sanitizeFilename(longName);
			expect(result.endsWith(".pdf")).toBe(true);
		});

		it("handles multi-byte characters when truncating", () => {
			const longName = `${"あ".repeat(100)}.txt`; // Each あ is 3 bytes in UTF-8
			const result = sanitizeFilename(longName);
			expect(new TextEncoder().encode(result).length).toBeLessThanOrEqual(255);
			expect(result.endsWith(".txt")).toBe(true);
		});

		it("truncates very long extension", () => {
			const longExt = `file.${"a".repeat(300)}`;
			const result = sanitizeFilename(longExt);
			expect(new TextEncoder().encode(result).length).toBeLessThanOrEqual(255);
		});
	});

	describe("fallback for empty result", () => {
		it("returns fallback for only dots", () => {
			const result = sanitizeFilename("...");
			expect(result).toMatch(/^file_[a-f0-9]+$/);
		});

		it("returns fallback for only spaces", () => {
			const result = sanitizeFilename("   ");
			expect(result).toMatch(/^file_[a-f0-9]+$/);
		});

		it("returns fallback for empty string", () => {
			const result = sanitizeFilename("");
			expect(result).toMatch(/^file_[a-f0-9]+$/);
		});

		it("returns fallback for only path separators", () => {
			const result = sanitizeFilename("///\\\\\\");
			expect(result).toMatch(/^file_[a-f0-9]+$/);
		});
	});

	describe("combined attack vectors", () => {
		it("handles path traversal with null bytes", () => {
			expect(sanitizeFilename("../../../etc\0/passwd")).toBe("etcpasswd");
		});

		it("handles encoded path traversal with unicode", () => {
			expect(sanitizeFilename("%2F..%2F..%2Fétc")).toBe("étc");
		});

		it("handles complex attack string", () => {
			const attack = "../\0..\\%2F<script>|CON.txt\x00";
			const result = sanitizeFilename(attack);
			expect(result).not.toContain("..");
			expect(result).not.toContain("/");
			expect(result).not.toContain("\\");
			expect(result).not.toContain("\0");
			expect(result).not.toContain("<");
		});
	});
});

describe("generateSecureFileId", () => {
	it("generates string ID", () => {
		const id = generateSecureFileId();
		expect(typeof id).toBe("string");
	});

	it("generates unique IDs", () => {
		const ids = new Set<string>();
		for (let i = 0; i < 100; i++) {
			ids.add(generateSecureFileId());
		}
		expect(ids.size).toBe(100);
	});

	it("generates IDs without path characters", () => {
		for (let i = 0; i < 100; i++) {
			const id = generateSecureFileId();
			expect(id).not.toContain("/");
			expect(id).not.toContain("\\");
			expect(id).not.toContain("..");
		}
	});

	it("generates URL-safe IDs", () => {
		for (let i = 0; i < 100; i++) {
			const id = generateSecureFileId();
			// UUID format is URL-safe
			expect(id).toMatch(/^[a-f0-9-]+$/);
		}
	});
});
