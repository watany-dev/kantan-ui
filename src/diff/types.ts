/**
 * 差分検出のための型定義
 */

/**
 * パースされたノードツリー
 */
export interface VNode {
	/** ノードのID（id属性の値） */
	id: string;
	/** HTMLタグ名 */
	tag: string;
	/** このノードのHTML文字列全体 */
	html: string;
	/** 親要素のID（ルート要素の場合はnull） */
	parentId: string | null;
	/** 兄弟間の順序（0から開始） */
	order: number;
}

/**
 * 差分パッチの種類
 */
export type DiffPatch =
	| { type: "replace"; id: string; html: string }
	| { type: "remove"; id: string }
	| { type: "insert"; parentId: string; index: number; html: string };

/**
 * 差分検出の結果
 */
export interface DiffResult {
	/** 検出されたパッチのリスト */
	patches: DiffPatch[];
	/** 変更があったかどうか */
	hasChanges: boolean;
}
