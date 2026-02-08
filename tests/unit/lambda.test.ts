import { Hono } from "hono";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { KantanApp } from "../../src/app";
import { createLambdaHandler, createLambdaStreamHandler } from "../../src/lambda";

function createMockKantanApp(): KantanApp {
	const app = new Hono();
	app.get("/", (c) => c.text("Hello from Lambda"));
	app.get("/download/:id", (c) => c.text(`Download: ${c.req.param("id")}`));

	return {
		fetch: app.fetch,
		websocket: undefined,
		port: undefined,
		hostname: undefined,
		injectWebSocket: undefined,
		shutdown: () => {},
		app,
	};
}

describe("createLambdaHandler", () => {
	it("should return a function", () => {
		const kantanApp = createMockKantanApp();
		const handler = createLambdaHandler(kantanApp);
		expect(typeof handler).toBe("function");
	});

	it("should handle API Gateway v2 HTTP API event", async () => {
		const kantanApp = createMockKantanApp();
		const handler = createLambdaHandler(kantanApp);

		const event = {
			version: "2.0",
			routeKey: "GET /",
			rawPath: "/",
			rawQueryString: "",
			headers: {
				host: "example.com",
			},
			requestContext: {
				accountId: "123456789012",
				apiId: "api-id",
				domainName: "example.com",
				domainPrefix: "example",
				http: {
					method: "GET",
					path: "/",
					protocol: "HTTP/1.1",
					sourceIp: "127.0.0.1",
					userAgent: "test",
				},
				requestId: "request-id",
				routeKey: "GET /",
				stage: "$default",
				time: "01/Jan/2024:00:00:00 +0000",
				timeEpoch: 1704067200000,
			},
			isBase64Encoded: false,
		};

		const result = await handler(event);
		expect(result.statusCode).toBe(200);
		expect(result.body).toContain("Hello from Lambda");
	});

	it("should handle API Gateway v1 REST API event", async () => {
		const kantanApp = createMockKantanApp();
		const handler = createLambdaHandler(kantanApp);

		const event = {
			version: "1.0",
			resource: "/",
			path: "/",
			httpMethod: "GET",
			headers: {
				Host: "example.com",
			},
			queryStringParameters: null,
			multiValueQueryStringParameters: null,
			pathParameters: null,
			stageVariables: null,
			requestContext: {
				resourceId: "resource-id",
				resourcePath: "/",
				httpMethod: "GET",
				path: "/",
				accountId: "123456789012",
				stage: "prod",
				requestId: "request-id",
				identity: {
					sourceIp: "127.0.0.1",
				},
			},
			body: null,
			isBase64Encoded: false,
		};

		const result = await handler(event);
		expect(result.statusCode).toBe(200);
		expect(result.body).toContain("Hello from Lambda");
	});
});

describe("createLambdaStreamHandler", () => {
	// streamHandle requires the `awslambda` global (Lambda runtime only)
	// biome-ignore lint/suspicious/noExplicitAny: mock Lambda runtime global
	const g = globalThis as any;

	beforeAll(() => {
		g.awslambda = {
			streamifyResponse: (fn: unknown) => fn,
		};
	});

	afterAll(() => {
		delete g.awslambda;
	});

	it("should return a function", () => {
		const kantanApp = createMockKantanApp();
		const handler = createLambdaStreamHandler(kantanApp);
		expect(typeof handler).toBe("function");
	});
});
