/** フラッシュコールバックの型 */
export type FlushCallback = (html: string, itemCount: number) => void;

/**
 * レンダリングコンテキスト
 * スクリプト実行中にHTMLを自動収集するためのバッファ
 */
export class RenderContext {
	private buffer: string[] = [];
	private flushCallback: FlushCallback | null = null;
	private flushThreshold = 0; // 0 = 無効（フラッシュしない）
	private flushedCount = 0;

	/**
	 * フラッシュコールバックを設定
	 * @param callback 部分HTMLがフラッシュされる際に呼び出されるコールバック
	 * @param threshold フラッシュをトリガーするバッファ内の要素数（0で無効）
	 */
	setFlushCallback(callback: FlushCallback | null, threshold = 3): void {
		this.flushCallback = callback;
		this.flushThreshold = threshold;
	}

	/**
	 * フラッシュしきい値を取得
	 */
	getFlushThreshold(): number {
		return this.flushThreshold;
	}

	/**
	 * HTMLをバッファに追加
	 */
	append(html: string): void {
		this.buffer.push(html);
		this.maybeFlush();
	}

	/**
	 * しきい値に達していたらフラッシュを実行
	 */
	private maybeFlush(): void {
		if (
			this.flushThreshold > 0 &&
			this.flushCallback &&
			this.buffer.length - this.flushedCount >= this.flushThreshold
		) {
			this.flush();
		}
	}

	/**
	 * 未フラッシュのバッファをフラッシュ
	 */
	flush(): void {
		if (!this.flushCallback || this.flushedCount >= this.buffer.length) {
			return;
		}
		const unflushed = this.buffer.slice(this.flushedCount);
		const html = unflushed.join("\n");
		const itemCount = unflushed.length;
		this.flushedCount = this.buffer.length;
		this.flushCallback(html, itemCount);
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
		this.flushedCount = 0;
	}

	/**
	 * バッファが空かどうか
	 */
	isEmpty(): boolean {
		return this.buffer.length === 0;
	}

	/**
	 * フラッシュ済みの要素数を取得
	 */
	getFlushedCount(): number {
		return this.flushedCount;
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
		throw new Error(
			"RenderContext is not available. kt APIs must be called within a script execution.",
		);
	}
	return currentRenderContext;
}
