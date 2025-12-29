import { RenderContext, setRenderContext } from "../kt/context";
import { setCurrentSessionId } from "../session/state";
import { resetWidgetCounter } from "../widgets/registry";
import { type RerunContext, clearContext, setContext } from "./context";

/**
 * スクリプトの型
 * - string を返す: 従来のAPI（手動HTML生成）
 * - undefined を返す: 宣言的API（kt.* を使用）
 */
export type Script = () => string | undefined;

export function rerun(script: Script, event?: RerunContext["event"], sessionId?: string): string {
	// レンダリングコンテキストを作成
	const renderContext = new RenderContext();

	try {
		// Widget カウンターをリセット
		resetWidgetCounter();

		// セッションIDを設定
		setCurrentSessionId(sessionId ?? null);

		// コンテキストを設定
		setContext({ event, sessionId });

		// レンダリングコンテキストを設定
		setRenderContext(renderContext);

		// スクリプトを実行してHTMLを生成
		const result = script();

		// スクリプトが文字列を返した場合はそれを使用
		// void を返した場合はバッファからHTMLを取得
		if (typeof result === "string") {
			return result;
		}
		return renderContext.getHtml();
	} finally {
		// コンテキストをクリア
		clearContext();
		setCurrentSessionId(null);
		setRenderContext(null);
	}
}
