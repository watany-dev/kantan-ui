/**
 * レンダリングコンテキスト
 * スクリプト実行中にHTMLを自動収集するためのバッファ
 */
export class RenderContext {
	private buffer: string[] = [];

	/**
	 * HTMLをバッファに追加
	 */
	append(html: string): void {
		this.buffer.push(html);
	}

	/**
	 * バッファを結合してHTMLを取得
	 */
	getHtml(): string {
		return this.buffer.join("\n");
	}

	/**
	 * バッファをクリア
	 */
	clear(): void {
		this.buffer = [];
	}

	/**
	 * バッファが空かどうか
	 */
	isEmpty(): boolean {
		return this.buffer.length === 0;
	}
}

// 現在のレンダリングコンテキスト
let currentRenderContext: RenderContext | null = null;

/**
 * レンダリングコンテキストを設定
 */
export function setRenderContext(ctx: RenderContext | null): void {
	currentRenderContext = ctx;
}

/**
 * 現在のレンダリングコンテキストを取得
 */
export function getRenderContext(): RenderContext | null {
	return currentRenderContext;
}

/**
 * レンダリングコンテキストが存在することを保証して取得
 * @throws コンテキストがない場合はエラー
 */
export function requireRenderContext(): RenderContext {
	if (!currentRenderContext) {
		throw new Error("RenderContext is not available. kt APIs must be called within a script execution.");
	}
	return currentRenderContext;
}
