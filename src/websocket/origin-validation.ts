/**
 * WebSocket接続時のOrigin検証
 *
 * CSRF対策として、WebSocket接続時にOriginヘッダーを検証します。
 */

/**
 * Originヘッダーを検証する
 *
 * @param origin - クライアントからのOriginヘッダー値
 * @param host - サーバーのHostヘッダー値
 * @param allowedOrigins - 許可するOriginのリスト
 * @returns 接続を許可する場合はtrue
 */
export function validateOrigin(
	origin: string | undefined,
	host: string | undefined,
	allowedOrigins: string[],
): boolean {
	// Originヘッダーがない場合は同一オリジンリクエストとみなす
	// (ブラウザはsame-origin WebSocket接続時にOriginを送信しない場合がある)
	if (origin === undefined) {
		return true;
	}

	// 明示的な許可リストがある場合はそれをチェック
	if (allowedOrigins.length > 0) {
		return allowedOrigins.includes(origin);
	}

	// Hostが未定義の場合は拒否
	if (host === undefined) {
		return false;
	}

	// OriginのホストがHostと一致するかチェック
	try {
		const originUrl = new URL(origin);
		// ホスト名の比較（大文字小文字を区別しない）
		return originUrl.host.toLowerCase() === host.toLowerCase();
	} catch {
		// 無効なURL形式の場合は拒否
		return false;
	}
}
