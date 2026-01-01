// Auth
export { basicAuth, timingSafeEqual, bearerAuth, extractBearerToken, authorize, hasRoles } from "./auth";
export type { BasicAuthOptions, BearerAuthOptions, BearerPayload, AuthorizeOptions } from "./auth";

// Rate Limit
export { RateLimitStore, rateLimit, getClientIp, WebSocketRateLimiter } from "./rate-limit";
export type {
	RateLimitEntry,
	RateLimitCheckResult,
	RateLimitOptions,
	WebSocketRateLimitOptions,
	MessageRateLimitResult,
} from "./rate-limit";

// HTTPS
export { httpsRedirect, getProtocol, buildHstsHeader } from "./https";
export type { HttpsRedirectOptions } from "./https";

// Types
export type {
	AuthResult,
	AuthUser,
	AuthConfig,
	BasicAuthConfig,
	BearerAuthConfig,
	RateLimitConfig,
	HttpRateLimitConfig,
	WebSocketRateLimitConfig,
	HttpsConfig,
	SecurityConfig,
} from "./types";
