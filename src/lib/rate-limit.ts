import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Create a new Redis instance with credentials from environment variables
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * General Rate Limiter (Public API and Website)
 * 100 requests per minute per IP
 */
export const generalLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "60 s"),
    analytics: true,
    prefix: "@ratelimit/general",
});

/**
 * AI Endpoints Rate Limiter
 * 10 requests per minute per User (or IP if not logged in)
 */
export const aiLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "60 s"),
    analytics: true,
    prefix: "@ratelimit/ai",
});

/**
 * Upload Rate Limiter
 * 20 uploads per hour per User
 */
export const uploadLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 h"),
    analytics: true,
    prefix: "@ratelimit/upload",
});
