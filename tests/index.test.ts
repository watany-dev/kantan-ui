import { describe, expect, it } from "vitest";
import app from "../src/index";

describe("kantan-ui", () => {
	it("should return kantan-ui text", async () => {
		const res = await app.request("/");
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("kantan-ui");
	});
});
