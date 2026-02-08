import { raw, renderHtml } from "../utils/html";
import { generateWidgetId, getWidgetValue, setWidgetValue } from "../widgets/registry";
import { requireRenderContext } from "./context";

/**
 * ステータスコンテナの状態
 */
export type StatusState = "running" | "complete" | "error";

/**
 * kt.status() の設定オプション
 */
export interface StatusConfig {
	/** ウィジェットのユニークキー（状態保持用） */
	key?: string;
	/** 初期展開状態 (デフォルト: state が "running" のとき true, それ以外は false) */
	expanded?: boolean;
	/** 初期状態 (デフォルト: "running") */
	state?: StatusState;
}

/**
 * status.update() のオプション
 */
export interface StatusUpdateOptions {
	/** ラベルを変更 */
	label?: string;
	/** 状態を変更 */
	state?: StatusState;
	/** 展開状態を変更 */
	expanded?: boolean;
}

/**
 * ステータスコンテナの制御オブジェクト
 */
export interface StatusController {
	update(options: StatusUpdateOptions): void;
}

/**
 * ステータスコンテナの内部状態（セッション状態に保存）
 */
interface StatusInternalState {
	label: string;
	state: StatusState;
	expanded: boolean;
}

const STATUS_ICONS: Record<StatusState, string> = {
	running:
		'<div class="kt-status-icon kt-status-running" aria-hidden="true"><div class="kt-spinner-icon" style="width: 16px; height: 16px;"></div></div>',
	complete: '<div class="kt-status-icon kt-status-complete" aria-hidden="true">&#10003;</div>',
	error: '<div class="kt-status-icon kt-status-error" aria-hidden="true">&#10007;</div>',
};

const STATUS_SR_TEXT: Record<StatusState, string> = {
	running: "実行中",
	complete: "完了",
	error: "エラー",
};

const VALID_STATES: Set<string> = new Set(["running", "complete", "error"]);

/** 状態値を検証し、不正な値はデフォルトにフォールバック */
function validateState(state: string): StatusState {
	return VALID_STATES.has(state) ? (state as StatusState) : "running";
}

/**
 * 長時間処理の進捗状況を展開/折りたたみ可能なコンテナで表示
 *
 * @param label - ステータスコンテナのラベル
 * @param content - コンテナ内に表示するコンテンツ（コールバック）
 * @param config - オプション設定
 */
export function status(
	label: string,
	content: (controller: StatusController) => void,
	config: StatusConfig = {},
): void {
	const ctx = requireRenderContext();
	const id = generateWidgetId(config.key);

	// 初期状態を決定（不正値はフォールバック）
	const initialState = validateState(config.state ?? "running");
	const initialExpanded = config.expanded ?? initialState === "running";

	// 保存済みの状態を取得（なければ初期値）
	const savedState = getWidgetValue<StatusInternalState>(id, {
		label,
		state: initialState,
		expanded: initialExpanded,
	});

	// 保存済み状態を検証（セッション改ざん対策）
	const currentState: StatusInternalState = {
		label: savedState.label,
		state: validateState(savedState.state),
		expanded: savedState.expanded,
	};

	const icon = STATUS_ICONS[currentState.state];
	const srText = STATUS_SR_TEXT[currentState.state];
	const openAttr = currentState.expanded ? " open" : "";

	// <details> 開始
	ctx.append(
		renderHtml`<details class="kt-status kt-status-${raw(currentState.state)}"${raw(openAttr)}><summary class="kt-status-header">${raw(icon)}<span class="kt-sr-only">${srText}: </span><span class="kt-status-label">${currentState.label}</span></summary><div class="kt-status-content">`,
	);

	// コールバック実行
	let updated = false;
	const controller: StatusController = {
		update(options) {
			updated = true;
			if (options.label !== undefined) currentState.label = options.label;
			if (options.state !== undefined) currentState.state = validateState(options.state);
			if (options.expanded !== undefined) currentState.expanded = options.expanded;
			setWidgetValue(id, currentState);
		},
	};

	try {
		content(controller);
	} finally {
		// update() が呼ばれていなければ自動完了
		if (!updated) {
			currentState.state = "complete";
			currentState.expanded = false;
			setWidgetValue(id, currentState);
		}

		// </details> 閉じ（例外時もHTMLの整合性を保証）
		ctx.append("</div></details>");
	}
}
