/**
 * Basic認証オプション
 */
export interface BasicAuthOptions {
	/** 認証ユーザーリスト */
	users: Array<{ username: string; password: string }>;
	/** WWW-Authenticate realm */
	realm?: string;
	/** 認証除外パス */
	excludePaths?: string[];
}

/**
 * Bearer認証オプション
 */
export interface BearerAuthOptions {
	/** トークン検証関数 */
	verify: (token: string) => Promise<BearerPayload | null>;
	/** 認証除外パス */
	excludePaths?: string[];
}

/**
 * Bearerトークンのペイロード
 */
export interface BearerPayload {
	/** ユーザーID */
	sub: string;
	/** ユーザー名 */
	username?: string;
	/** ロール */
	roles?: string[];
	/** 有効期限（UNIXタイムスタンプ秒） */
	exp?: number;
	/** 発行日時（UNIXタイムスタンプ秒） */
	iat?: number;
}
