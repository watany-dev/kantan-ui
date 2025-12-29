import { type RerunContext, clearContext, setContext } from "./context";
import { setCurrentSessionId } from "../session/state";
import { resetWidgetCounter } from "../widgets/registry";

export type Script = () => string;

export function rerun(
	script: Script,
	event?: RerunContext["event"],
	sessionId?: string,
): string {
	try {
		// Widget カウンターをリセット
		resetWidgetCounter();

		// セッションIDを設定
		setCurrentSessionId(sessionId ?? null);

		// コンテキストを設定
		setContext({ event, sessionId });

		// スクリプトを実行してHTMLを生成
		const html = script();

		return html;
	} finally {
		// コンテキストをクリア
		clearContext();
		setCurrentSessionId(null);
	}
}
