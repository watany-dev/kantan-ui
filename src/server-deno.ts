/**
 * Deno用サンプルサーバー
 *
 * 使用方法:
 *   deno run --allow-net --allow-read src/server-deno.ts
 *   または
 *   deno task dev (watchモード)
 */
import { createApp } from "./app.ts";
import { kt } from "./kt/index.ts";
import { createTypedSessionState } from "./session/index.ts";

type AppState = {
	counter: number;
};

const state = createTypedSessionState<AppState>({
	counter: 0,
});

const script = () => {
	kt.title("kantan-ui Deno Demo");
	kt.write("Denoで動作するデモアプリです。");

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

const port = 3000;
console.log(`Server running at http://localhost:${port}`);

Deno.serve({ port }, kantanApp.fetch);
