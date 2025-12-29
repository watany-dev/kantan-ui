import { clearContext, setContext, type RerunContext } from "./context";

export type Script = () => string;

export function rerun(script: Script, event?: RerunContext["event"]): string {
	try {
		// コンテキストを設定
		setContext({ event });

		// スクリプトを実行してHTMLを生成
		const html = script();

		return html;
	} finally {
		// コンテキストをクリア
		clearContext();
	}
}
