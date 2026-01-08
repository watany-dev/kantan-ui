import type { ServerType } from "@hono/node-server";
import { serve as nodeServe } from "@hono/node-server";
import { getRuntimeKey } from "hono/adapter";

interface KantanApp {
	fetch: (request: Request) => Response | Promise<Response>;
	websocket?: unknown;
	injectWebSocket?: ((server: ServerType) => void) | undefined;
	shutdown: () => void;
}

interface ServeOptions {
	port?: number;
	hostname?: string;
}

interface ServeResult {
	server: ServerType;
	shutdown: () => void;
}

/**
 * Node.js用サーバー起動ヘルパー
 * createApp() の戻り値を受け取り、Node.jsサーバーを起動してWebSocketを有効化
 *
 * @example
 * ```typescript
 * import { createApp } from "kantan-ui";
 * import { serve } from "kantan-ui/serve";
 *
 * const kantanApp = createApp((ctx) => {
 *   ctx.write("Hello, World!");
 * });
 *
 * const { server, shutdown } = serve(kantanApp, { port: 3000 });
 * ```
 */
export function serve(kantanApp: KantanApp, options: ServeOptions = {}): ServeResult {
	const runtime = getRuntimeKey();

	if (runtime === "bun") {
		throw new Error(
			"serve() is for Node.js only. " +
				"For Bun, use: Bun.serve({ fetch: kantanApp.fetch, websocket: kantanApp.websocket, port })",
		);
	}

	const injectWebSocket = kantanApp.injectWebSocket;
	if (!injectWebSocket) {
		throw new Error("WebSocket adapter not initialized. Ensure createApp() was called correctly.");
	}

	const port = options.port ?? 3000;
	const hostname = options.hostname ?? "0.0.0.0";

	const server = nodeServe({
		fetch: kantanApp.fetch,
		port,
		hostname,
	});

	// WebSocketを有効化
	injectWebSocket(server);

	console.log(`Server running at http://${hostname}:${port}`);

	const shutdown = () => {
		kantanApp.shutdown();
		server.close();
	};

	return { server, shutdown };
}
