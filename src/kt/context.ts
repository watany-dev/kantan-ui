/** フラッシュコールバックの型 */
export type FlushCallback = (html: string, itemCount: number) => void;

/** レンダリングターゲット */
export type RenderTarget = "main" | "sidebar";

/** サイドバー設定 */
export interface SidebarConfig {
	width?: string;
}

/**
 * レンダリングコンテキスト
 * スクリプト実行中にHTMLを自動収集するためのバッファ
 * メインエリアとサイドバーエリアの2つのバッファを持つ
 */
export class RenderContext {
	private mainBuffer: string[] = [];
	private sidebarBuffer: string[] = [];
	private currentTarget: RenderTarget = "main";
	private flushCallback: FlushCallback | null = null;
	private flushThreshold = 0; // 0 = 無効（フラッシュしない）
	private flushedCount = 0;
	private sidebarConfig: SidebarConfig | null = null;

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
	 * 現在のターゲットを設定
	 */
	setTarget(target: RenderTarget): void {
		this.currentTarget = target;
	}

	/**
	 * 現在のターゲットを取得
	 */
	getTarget(): RenderTarget {
		return this.currentTarget;
	}

	/**
	 * HTMLをバッファに追加（現在のターゲットに応じて振り分け）
	 */
	append(html: string): void {
		if (this.currentTarget === "sidebar") {
			this.sidebarBuffer.push(html);
		} else {
			this.mainBuffer.push(html);
			this.maybeFlush(); // ストリーミングはメインのみ
		}
	}

	/**
	 * しきい値に達していたらフラッシュを実行（メインバッファのみ）
	 */
	private maybeFlush(): void {
		if (
			this.flushThreshold > 0 &&
			this.flushCallback &&
			this.mainBuffer.length - this.flushedCount >= this.flushThreshold
		) {
			this.flush();
		}
	}

	/**
	 * 未フラッシュのバッファをフラッシュ（メインバッファのみ）
	 */
	flush(): void {
		if (!this.flushCallback || this.flushedCount >= this.mainBuffer.length) {
			return;
		}
		const unflushed = this.mainBuffer.slice(this.flushedCount);
		const html = unflushed.join("\n");
		const itemCount = unflushed.length;
		this.flushedCount = this.mainBuffer.length;
		this.flushCallback(html, itemCount);
	}

	/**
	 * メインエリアのHTMLを取得
	 */
	getMainHtml(): string {
		return this.mainBuffer.join("\n");
	}

	/**
	 * サイドバーのHTMLを取得
	 */
	getSidebarHtml(): string {
		return this.sidebarBuffer.join("\n");
	}

	/**
	 * サイドバーが使用されているか
	 */
	hasSidebar(): boolean {
		return this.sidebarBuffer.length > 0;
	}

	/**
	 * サイドバー設定を設定
	 */
	setSidebarConfig(config: SidebarConfig): void {
		this.sidebarConfig = config;
	}

	/**
	 * サイドバー設定を取得
	 */
	getSidebarConfig(): SidebarConfig | null {
		return this.sidebarConfig;
	}

	/**
	 * バッファを結合してHTMLを取得（getMainHtml のエイリアス）
	 */
	getHtml(): string {
		return this.getMainHtml();
	}

	/**
	 * バッファをクリア
	 */
	clear(): void {
		this.mainBuffer = [];
		this.sidebarBuffer = [];
		this.currentTarget = "main";
		this.flushedCount = 0;
		this.sidebarConfig = null;
	}

	/**
	 * メインバッファが空かどうか
	 */
	isEmpty(): boolean {
		return this.mainBuffer.length === 0;
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
