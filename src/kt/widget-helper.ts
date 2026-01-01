import { generateWidgetId } from "../widgets/registry";
import { requireRenderContext } from "./context";

/**
 * 宣言的ウィジェットのボイラープレートを処理するヘルパー
 *
 * @param config - ウィジェットの設定（keyを含む可能性がある）
 * @param imperativeFn - 命令的APIを呼び出す関数（IDを含む設定を受け取り、値を返す）
 * @param renderFn - レンダリング関数（値とIDを含む設定を受け取り、HTMLを返す）
 * @returns ウィジェットの現在値
 */
export function wrapWidget<TConfig extends { key?: string }, TValue>(
	config: Partial<TConfig> | undefined,
	imperativeFn: (configWithId: Partial<TConfig> & { key: string }) => TValue,
	renderFn: (value: TValue, configWithId: Partial<TConfig> & { key: string }) => string,
): TValue {
	const ctx = requireRenderContext();
	const id = generateWidgetId(config?.key);
	const configWithId = { ...config, key: id } as Partial<TConfig> & { key: string };
	const value = imperativeFn(configWithId);
	ctx.append(renderFn(value, configWithId));
	return value;
}
