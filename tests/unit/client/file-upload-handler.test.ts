/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	arrayBufferToBase64,
	createFileChunks,
	formatBytes,
	getMaxFileSize,
	hideUploadError,
	hideUploadProgress,
	showUploadComplete,
	showUploadError,
	updateUploadProgress,
	validateFileSize,
	validateFileType,
} from "../../../src/client/file-upload-handler";

describe("file-upload-handler", () => {
	describe("arrayBufferToBase64", () => {
		it("converts empty buffer to empty string", () => {
			const buffer = new ArrayBuffer(0);
			expect(arrayBufferToBase64(buffer)).toBe("");
		});

		it("converts simple data to base64", () => {
			const data = new TextEncoder().encode("Hello");
			const base64 = arrayBufferToBase64(data.buffer);
			expect(base64).toBe("SGVsbG8=");
		});

		it("converts binary data correctly", () => {
			const data = new Uint8Array([0x00, 0x01, 0xff, 0xfe]);
			const base64 = arrayBufferToBase64(data.buffer);
			expect(base64).toBe("AAH//g==");
		});
	});

	describe("createFileChunks", () => {
		it("returns single chunk for small data", () => {
			const data = new TextEncoder().encode("Hello");
			const chunks = createFileChunks(data.buffer, 1024);
			expect(chunks).toHaveLength(1);
			expect(chunks[0]).toBe("SGVsbG8=");
		});

		it("splits large data into multiple chunks", () => {
			// Create 3KB of data
			const data = new Uint8Array(3 * 1024);
			for (let i = 0; i < data.length; i++) {
				data[i] = i % 256;
			}
			// Chunk size 1KB
			const chunks = createFileChunks(data.buffer, 1024);
			expect(chunks.length).toBeGreaterThan(1);
		});

		it("returns empty array for empty data", () => {
			const data = new ArrayBuffer(0);
			const chunks = createFileChunks(data, 1024);
			expect(chunks).toHaveLength(0);
		});
	});

	describe("getMaxFileSize", () => {
		it("returns data-max-size value", () => {
			const element = {
				dataset: { maxSize: "1024" },
			} as unknown as HTMLElement;
			expect(getMaxFileSize(element)).toBe(1024);
		});

		it("returns default value when no data-max-size", () => {
			const element = {
				dataset: {},
			} as unknown as HTMLElement;
			const defaultSize = 200 * 1024 * 1024;
			expect(getMaxFileSize(element)).toBe(defaultSize);
		});

		it("returns default for invalid value", () => {
			const element = {
				dataset: { maxSize: "invalid" },
			} as unknown as HTMLElement;
			const defaultSize = 200 * 1024 * 1024;
			expect(getMaxFileSize(element)).toBe(defaultSize);
		});
	});

	describe("validateFileSize", () => {
		it("returns valid for file within limit", () => {
			const result = validateFileSize(1000, 2000);
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it("returns invalid for file exceeding limit", () => {
			const result = validateFileSize(3000, 2000);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("exceeds");
		});

		it("returns valid for file at exact limit", () => {
			const result = validateFileSize(2000, 2000);
			expect(result.valid).toBe(true);
		});
	});

	describe("validateFileType", () => {
		it("returns valid when no accept restriction", () => {
			const result = validateFileType("test.pdf", "application/pdf", undefined);
			expect(result.valid).toBe(true);
		});

		it("validates file extension match", () => {
			const result = validateFileType("image.png", "image/png", ".png,.jpg");
			expect(result.valid).toBe(true);
		});

		it("validates MIME type match", () => {
			const result = validateFileType("image.png", "image/png", "image/png");
			expect(result.valid).toBe(true);
		});

		it("validates wildcard MIME type", () => {
			const result = validateFileType("photo.jpg", "image/jpeg", "image/*");
			expect(result.valid).toBe(true);
		});

		it("rejects non-matching file", () => {
			const result = validateFileType("document.pdf", "application/pdf", ".png,.jpg");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("not allowed");
		});

		it("handles multiple accept values", () => {
			const result = validateFileType("doc.pdf", "application/pdf", ".pdf,.doc,.docx");
			expect(result.valid).toBe(true);
		});
	});

	describe("formatBytes", () => {
		it("formats bytes", () => {
			expect(formatBytes(512)).toBe("512 B");
		});

		it("formats kilobytes", () => {
			expect(formatBytes(1024)).toBe("1.0 KB");
			expect(formatBytes(1536)).toBe("1.5 KB");
		});

		it("formats megabytes", () => {
			expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
			expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
		});

		it("formats gigabytes", () => {
			expect(formatBytes(1024 * 1024 * 1024)).toBe("1.0 GB");
		});

		it("formats zero bytes", () => {
			expect(formatBytes(0)).toBe("0 B");
		});
	});

	describe("progress UI functions", () => {
		let container: HTMLElement;

		beforeEach(() => {
			// Create mock DOM structure
			container = document.createElement("div");
			container.id = "uploader1-container";
			container.innerHTML = `
				<div class="kt-file-uploader-progress" style="display: none">
					<div class="kt-progress-bar">
						<div class="kt-progress-fill" style="width: 0%"></div>
					</div>
					<div class="kt-progress-text">
						<span class="kt-progress-percent">0%</span>
						<span class="kt-progress-size"></span>
					</div>
				</div>
				<div class="kt-file-uploader-complete" style="display: none">
					<span class="kt-file-name"></span>
					<button type="button" class="kt-file-remove" data-upload-id="">×</button>
				</div>
				<div class="kt-file-uploader-error" style="display: none"></div>
			`;
			document.body.appendChild(container);
		});

		afterEach(() => {
			document.body.removeChild(container);
		});

		describe("updateUploadProgress", () => {
			it("shows progress container", () => {
				updateUploadProgress("uploader1", 50, 512, 1024);
				const progress = container.querySelector(".kt-file-uploader-progress") as HTMLElement;
				expect(progress.style.display).toBe("block");
			});

			it("updates progress bar width", () => {
				updateUploadProgress("uploader1", 75, 768, 1024);
				const fill = container.querySelector(".kt-progress-fill") as HTMLElement;
				expect(fill.style.width).toBe("75%");
			});

			it("updates percent text", () => {
				updateUploadProgress("uploader1", 50, 512, 1024);
				const percent = container.querySelector(".kt-progress-percent");
				expect(percent?.textContent).toBe("50%");
			});

			it("updates size text", () => {
				updateUploadProgress("uploader1", 50, 512, 1024);
				const size = container.querySelector(".kt-progress-size");
				expect(size?.textContent).toBe("512 B / 1.0 KB");
			});

			it("does nothing if container not found", () => {
				// Should not throw
				expect(() => updateUploadProgress("nonexistent", 50, 512, 1024)).not.toThrow();
			});
		});

		describe("hideUploadProgress", () => {
			it("hides progress container", () => {
				const progress = container.querySelector(".kt-file-uploader-progress") as HTMLElement;
				progress.style.display = "block";

				hideUploadProgress("uploader1");
				expect(progress.style.display).toBe("none");
			});
		});

		describe("showUploadComplete", () => {
			it("shows complete container", () => {
				showUploadComplete("uploader1", "test.txt", "upload-123");
				const complete = container.querySelector(".kt-file-uploader-complete") as HTMLElement;
				expect(complete.style.display).toBe("flex");
			});

			it("sets file name", () => {
				showUploadComplete("uploader1", "document.pdf", "upload-123");
				const filename = container.querySelector(".kt-file-name");
				expect(filename?.textContent).toBe("document.pdf");
			});

			it("sets upload id on remove button", () => {
				showUploadComplete("uploader1", "test.txt", "upload-456");
				const removeBtn = container.querySelector(".kt-file-remove") as HTMLButtonElement;
				expect(removeBtn.dataset?.["uploadId"]).toBe("upload-456");
			});

			it("hides progress container", () => {
				const progress = container.querySelector(".kt-file-uploader-progress") as HTMLElement;
				progress.style.display = "block";

				showUploadComplete("uploader1", "test.txt", "upload-123");
				expect(progress.style.display).toBe("none");
			});

			it("adds upload-complete class to container", () => {
				showUploadComplete("uploader1", "test.txt", "upload-123");
				expect(container.classList.contains("kt-upload-complete")).toBe(true);
			});
		});

		describe("showUploadError", () => {
			it("shows error container", () => {
				showUploadError("uploader1", "File too large");
				const error = container.querySelector(".kt-file-uploader-error") as HTMLElement;
				expect(error.style.display).toBe("block");
			});

			it("sets error message", () => {
				showUploadError("uploader1", "File type not allowed");
				const error = container.querySelector(".kt-file-uploader-error");
				expect(error?.textContent).toBe("File type not allowed");
			});

			it("hides progress container", () => {
				const progress = container.querySelector(".kt-file-uploader-progress") as HTMLElement;
				progress.style.display = "block";

				showUploadError("uploader1", "Error occurred");
				expect(progress.style.display).toBe("none");
			});
		});

		describe("hideUploadError", () => {
			it("hides error container", () => {
				const error = container.querySelector(".kt-file-uploader-error") as HTMLElement;
				error.style.display = "block";

				hideUploadError("uploader1");
				expect(error.style.display).toBe("none");
			});
		});
	});
});
