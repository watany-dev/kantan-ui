import { describe, expect, it } from "vitest";
import { createUploadedFile } from "../../../src/widgets/uploaded-file";

describe("createUploadedFile", () => {
	describe("basic properties", () => {
		it("returns correct name, size, type", () => {
			const data = new TextEncoder().encode("hello");
			const file = createUploadedFile("test.txt", "text/plain", data.buffer);
			expect(file.name).toBe("test.txt");
			expect(file.size).toBe(5);
			expect(file.type).toBe("text/plain");
		});

		it("preserves original filename", () => {
			const data = new ArrayBuffer(100);
			const file = createUploadedFile("my-document.pdf", "application/pdf", data);
			expect(file.name).toBe("my-document.pdf");
		});

		it("handles empty file", () => {
			const data = new ArrayBuffer(0);
			const file = createUploadedFile("empty.txt", "text/plain", data);
			expect(file.name).toBe("empty.txt");
			expect(file.size).toBe(0);
		});
	});

	describe("arrayBuffer()", () => {
		it("returns data as ArrayBuffer", () => {
			const original = new TextEncoder().encode("hello world");
			const file = createUploadedFile("test.txt", "text/plain", original.buffer);
			const result = file.arrayBuffer();

			expect(result).toBeInstanceOf(ArrayBuffer);
			expect(result.byteLength).toBe(11);
		});

		it("returns defensive copy (different instance)", () => {
			const data = new TextEncoder().encode("hello");
			const file = createUploadedFile("test.txt", "text/plain", data.buffer);
			const buf1 = file.arrayBuffer();
			const buf2 = file.arrayBuffer();

			expect(buf1).not.toBe(buf2); // Different instances
			expect(new Uint8Array(buf1)).toEqual(new Uint8Array(buf2)); // Same content
		});

		it("modifications to copy do not affect original", () => {
			const original = new TextEncoder().encode("hello");
			const file = createUploadedFile("test.txt", "text/plain", original.buffer);

			const copy = file.arrayBuffer();
			new Uint8Array(copy)[0] = 0xff; // Modify copy

			const anotherCopy = file.arrayBuffer();
			expect(new Uint8Array(anotherCopy)[0]).toBe(0x68); // 'h' unchanged
		});
	});

	describe("text()", () => {
		it("returns UTF-8 decoded string", () => {
			const data = new TextEncoder().encode("Hello, World!");
			const file = createUploadedFile("test.txt", "text/plain", data.buffer);
			expect(file.text()).toBe("Hello, World!");
		});

		it("handles Japanese text", () => {
			const data = new TextEncoder().encode("こんにちは");
			const file = createUploadedFile("test.txt", "text/plain", data.buffer);
			expect(file.text()).toBe("こんにちは");
		});

		it("handles emoji", () => {
			const data = new TextEncoder().encode("Hello 👋 World 🌍");
			const file = createUploadedFile("test.txt", "text/plain", data.buffer);
			expect(file.text()).toBe("Hello 👋 World 🌍");
		});

		it("returns empty string for empty file", () => {
			const data = new ArrayBuffer(0);
			const file = createUploadedFile("empty.txt", "text/plain", data);
			expect(file.text()).toBe("");
		});

		it("handles multiline text", () => {
			const text = "Line 1\nLine 2\nLine 3";
			const data = new TextEncoder().encode(text);
			const file = createUploadedFile("test.txt", "text/plain", data.buffer);
			expect(file.text()).toBe(text);
		});
	});

	describe("stream()", () => {
		it("returns ReadableStream", () => {
			const data = new TextEncoder().encode("stream test");
			const file = createUploadedFile("test.txt", "text/plain", data.buffer);
			const stream = file.stream();

			expect(stream).toBeInstanceOf(ReadableStream);
		});

		it("stream can be read", async () => {
			const data = new TextEncoder().encode("stream content");
			const file = createUploadedFile("test.txt", "text/plain", data.buffer);
			const reader = file.stream().getReader();

			const chunks: Uint8Array[] = [];
			let done = false;
			while (!done) {
				const result = await reader.read();
				done = result.done;
				if (result.value) {
					chunks.push(result.value);
				}
			}

			const combined = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
			let offset = 0;
			for (const chunk of chunks) {
				combined.set(chunk, offset);
				offset += chunk.length;
			}

			expect(new TextDecoder().decode(combined)).toBe("stream content");
		});

		it("each stream call returns new stream", () => {
			const data = new TextEncoder().encode("test");
			const file = createUploadedFile("test.txt", "text/plain", data.buffer);
			const stream1 = file.stream();
			const stream2 = file.stream();

			expect(stream1).not.toBe(stream2);
		});
	});

	describe("binary data handling", () => {
		it("handles binary data correctly", () => {
			const binary = new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd]);
			const file = createUploadedFile("binary.bin", "application/octet-stream", binary.buffer);

			const result = new Uint8Array(file.arrayBuffer());
			expect(result).toEqual(binary);
		});

		it("handles PNG header", () => {
			const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
			const file = createUploadedFile("image.png", "image/png", png.buffer);

			expect(file.size).toBe(8);
			const result = new Uint8Array(file.arrayBuffer());
			expect(result).toEqual(png);
		});

		it("handles large data", () => {
			const size = 1024 * 1024; // 1MB
			const data = new ArrayBuffer(size);
			const file = createUploadedFile("large.bin", "application/octet-stream", data);

			expect(file.size).toBe(size);
			expect(file.arrayBuffer().byteLength).toBe(size);
		});
	});

	describe("immutability", () => {
		it("name is readonly", () => {
			const data = new ArrayBuffer(10);
			const file = createUploadedFile("test.txt", "text/plain", data);

			// TypeScript should prevent this, but runtime check
			expect(() => {
				// @ts-expect-error Testing runtime immutability
				file.name = "changed.txt";
			}).toThrow();
		});

		it("size is readonly", () => {
			const data = new ArrayBuffer(10);
			const file = createUploadedFile("test.txt", "text/plain", data);

			expect(() => {
				// @ts-expect-error Testing runtime immutability
				file.size = 999;
			}).toThrow();
		});

		it("type is readonly", () => {
			const data = new ArrayBuffer(10);
			const file = createUploadedFile("test.txt", "text/plain", data);

			expect(() => {
				// @ts-expect-error Testing runtime immutability
				file.type = "application/json";
			}).toThrow();
		});
	});
});
