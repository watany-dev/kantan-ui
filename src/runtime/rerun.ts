import {
	type FlushCallback,
	RenderContext,
	type SidebarConfig,
	setRenderContext,
} from "../kt/context";
import { setCurrentSessionId } from "../session/state";
import { resetWidgetCounter } from "../widgets/registry";
import { AbortError } from "./abort";
import { clearContext, type RerunContext, setContext } from "./context";

/**
 * スクリプトの型
 * - string を返す: 従来のAPI（手動HTML生成）
 * - undefined を返す: 宣言的API（kt.* を使用）
 */
export type Script = () => string | undefined;

/**
 * rerun()の戻り値型
 * サイドバー対応のため、メインとサイドバーのHTMLを分離して返す
 */
export interface RerunResult {
	/** メインエリアのHTML */
	mainHtml: string;
	/** サイドバーのHTML（サイドバー未使用時は空文字） */
	sidebarHtml: string;
	/** サイドバーが使用されているか */
	hasSidebar: boolean;
	/** サイドバー設定（幅など） */
	sidebarConfig: SidebarConfig | null;
}

/**
 * ストリーミング設定
 */
export interface StreamingOptions {
	/** フラッシュ時に呼び出されるコールバック */
	onFlush: FlushCallback;
	/** フラッシュしきい値（何要素ごとにフラッシュするか） */
	flushThreshold: number;
}

/**
 * グローバル状態管理についての設計ノート
 *
 * 現在の実装では以下のグローバル変数を使用:
 * - currentSessionId (session/state.ts)
 * - widgetCounter (widgets/registry.ts)
 * - currentRenderContext (kt/context.ts)
 * - globalSessionManager (session/manager.ts)
 *
 * この設計が安全な理由:
 * 1. rerun()は同期実行であり、スクリプト内でawaitは使用されない
 * 2. try/finallyで状態の設定/クリアを保証
 * 3. Node.js/Bunのシングルスレッドイベントループモデル
 *
 * 将来の非同期スクリプト対応時:
 * - AsyncLocalStorage の導入を検討
 * - または RequestContext パターンでDI
 *
 * @see docs/impl/week4-preparation.md
 */

export function rerun(
	script: Script,
	event?: RerunContext["event"],
	sessionId?: string,
	signal?: AbortSignal,
	streaming?: StreamingOptions,
): RerunResult {
	// シグナルがabortされていたら早期リターン
	if (signal?.aborted) {
		throw new AbortError("Rerun was aborted");
	}

	// レンダリングコンテキストを作成
	const renderContext = new RenderContext();

	// ストリーミングが有効な場合、フラッシュコールバックを設定
	if (streaming) {
		renderContext.setFlushCallback(streaming.onFlush, streaming.flushThreshold);
	}

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

		// スクリプトが文字列を返した場合はそれを使用（後方互換性）
		// void を返した場合はバッファからHTMLを取得
		if (typeof result === "string") {
			return {
				mainHtml: result,
				sidebarHtml: "",
				hasSidebar: false,
				sidebarConfig: null,
			};
		}

		return {
			mainHtml: renderContext.getMainHtml(),
			sidebarHtml: renderContext.getSidebarHtml(),
			hasSidebar: renderContext.hasSidebar(),
			sidebarConfig: renderContext.getSidebarConfig(),
		};
	} finally {
		// コンテキストをクリア
		clearContext();
		setCurrentSessionId(null);
		setRenderContext(null);
	}
}
