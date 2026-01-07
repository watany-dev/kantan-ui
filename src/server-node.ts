/**
 * Node.js用サンプルサーバー
 *
 * 使用方法:
 *   npx tsx src/server-node.ts
 *   または
 *   node --experimental-strip-types src/server-node.ts
 */
import { createApp } from "./app";
import { kt } from "./kt";
import { serve } from "./serve";
import { createTypedSessionState } from "./session";

type AppState = {
	counter: number;
};

const state = createTypedSessionState<AppState>({
	counter: 0,
});

const script = () => {
	kt.title("kantan-ui Node.js Demo");
	kt.write("Node.jsで動作するデモアプリです。");

	kt.divider();

	kt.header("Counter");

	if (kt.button("+ Increment", { key: "btn_inc" })) {
		state.counter++;
	}

	if (kt.button("- Decrement", { key: "btn_dec" })) {
		state.counter = Math.max(0, state.counter - 1);
	}

	kt.html(`<div id="counter-display" class="kt-write">Current count: ${state.counter}</div>`);

	kt.divider();

	kt.header("Text Input");
	const name = kt.text_input("Your Name", "World", { key: "name_input" });
	kt.write(`Hello, ${name}!`);

	return undefined;
};

const kantanApp = await createApp(script);
const { shutdown } = serve(kantanApp, { port: 3000 });

// Graceful shutdown
process.on("SIGINT", () => {
	console.log("\nShutting down...");
	shutdown();
	process.exit(0);
});
