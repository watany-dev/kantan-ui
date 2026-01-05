/**
 * kt コントロール関数
 *
 * スクリプトの実行フローを制御する関数群
 */

import { RerunException } from "../runtime/rerun-exception";

/**
 * スクリプトの再実行をリクエスト
 *
 * この関数を呼び出すと、現在のスクリプト実行が中断され、
 * 即座に再実行がトリガーされます。
 *
 * @throws {RerunException} 常にスローされます
 *
 * @example
 * ```typescript
 * if (someCondition) {
 *   kt.rerun();
 *   // ここには到達しない
 * }
 * ```
 */
export function requestRerun(): never {
	throw new RerunException();
}
