/**
 * キャッシュキー生成ユーティリティ
 *
 * 引数からキャッシュキーを生成する
 */

// 関数やSymbolなど、JSON.stringifyできないオブジェクトのID管理
const objectIdMap = new WeakMap<object, string>();
let objectIdCounter = 0;

/**
 * オブジェクトに一意のIDを割り当てる（またはすでに割り当てられたIDを返す）
 */
function getOrCreateObjectId(obj: object): string {
	let id = objectIdMap.get(obj);
	if (id === undefined) {
		id = `__obj_${objectIdCounter++}__`;
		objectIdMap.set(obj, id);
	}
	return id;
}

/**
 * オブジェクトキーをソートしてJSONに安定化
 * キーの順序に関係なく同じ文字列を生成
 */
export function stableStringify(value: unknown): string {
	if (value === null) {
		return "null";
	}
	if (value === undefined) {
		return "undefined";
	}

	const type = typeof value;

	if (type === "string" || type === "number" || type === "boolean") {
		return JSON.stringify(value);
	}

	if (type === "function" || type === "symbol") {
		return getOrCreateObjectId(value as object);
	}

	if (Array.isArray(value)) {
		const items = value.map((item) => stableStringify(item));
		return `[${items.join(",")}]`;
	}

	if (type === "object") {
		// オブジェクトのキーをソート
		const obj = value as Record<string, unknown>;
		const keys = Object.keys(obj).sort();
		const pairs = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(obj[key])}`);
		return `{${pairs.join(",")}}`;
	}

	// その他（BigInt等）
	return String(value);
}

/**
 * 引数配列からキャッシュキーを生成
 *
 * 戦略:
 * 1. プリミティブ: 型と値を文字列化
 * 2. オブジェクト/配列: stableStringify でシリアライズ
 * 3. 関数/Symbol: 一意IDを生成（WeakMapで管理）
 * 4. undefined/null: 固定文字列
 *
 * @throws Error 循環参照を含むオブジェクトの場合
 */
export function generateCacheKey(args: unknown[]): string {
	try {
		return args
			.map((arg) => {
				if (arg === null) {
					return "null";
				}
				if (arg === undefined) {
					return "undefined";
				}

				const type = typeof arg;

				if (type === "string") {
					return `string:${arg}`;
				}
				if (type === "number") {
					return `number:${arg}`;
				}
				if (type === "boolean") {
					return `boolean:${arg}`;
				}
				if (type === "function" || type === "symbol") {
					return `ref:${getOrCreateObjectId(arg as object)}`;
				}

				// object, array
				return `json:${stableStringify(arg)}`;
			})
			.join("|");
	} catch (e) {
		if (e instanceof TypeError) {
			throw new Error(
				"Cannot cache arguments with circular references. " +
					"Consider using a custom hash_func option.",
			);
		}
		throw e;
	}
}

/**
 * 循環参照を検出するためのヘルパー
 * stableStringifyは再帰的に処理するため、循環参照があるとスタックオーバーフローする
 * これを防ぐためにオブジェクトを検証
 */
export function hasCircularReference(obj: unknown, seen = new WeakSet<object>()): boolean {
	if (obj === null || typeof obj !== "object") {
		return false;
	}

	if (seen.has(obj)) {
		return true;
	}

	seen.add(obj);

	if (Array.isArray(obj)) {
		for (const item of obj) {
			if (hasCircularReference(item, seen)) {
				return true;
			}
		}
	} else {
		for (const key of Object.keys(obj as Record<string, unknown>)) {
			if (hasCircularReference((obj as Record<string, unknown>)[key], seen)) {
				return true;
			}
		}
	}

	seen.delete(obj);
	return false;
}

/**
 * 安全なキャッシュキー生成（循環参照チェック付き）
 */
export function generateCacheKeySafe(args: unknown[]): string {
	for (const arg of args) {
		if (hasCircularReference(arg)) {
			throw new Error(
				"Cannot cache arguments with circular references. " +
					"Consider using a custom hash_func option.",
			);
		}
	}
	return generateCacheKey(args);
}
