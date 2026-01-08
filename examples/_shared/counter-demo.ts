/**
 * 共通カウンターデモスクリプト
 * 各ランタイム用サーバーから使用される
 */
import { kt } from "../../src/kt";
import { createTypedSessionState } from "../../src/session";

export type AppState = {
	counter: number;
};

export const state = createTypedSessionState<AppState>({
	counter: 0,
});

/**
 * カウンターデモスクリプト
 */
export function counterScript(title: string, description: string) {
	return () => {
		kt.title(title);
		kt.write(description);

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
}
