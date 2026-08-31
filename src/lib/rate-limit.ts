import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Only create Redis/limiters if env vars are present
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = redisUrl && redisToken
    ? new Redis({ url: redisUrl, token: redisToken })
    : null;

/** No-op limiter that always succeeds when Redis is unavailable */
const noopLimiter = {
    limit: async (_identifier: string) => ({ success: true, limit: 0, remaining: 0, reset: 0 }),
};

function createLimiter(prefix: string, window: Parameters<typeof Ratelimit.slidingWindow>) {
    if (!redis) return null;
    const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(...window),
        analytics: true,
        prefix,
    });
    // Wrap with a safe fallback that catches connection errors
    return {
        limit: async (identifier: string) => {
            try {
                return await limiter.limit(identifier);
            } catch (err) {
                console.error(`[rate-limit] ${prefix} Redis error, falling back:`, err instanceof Error ? err.message : err);
                return noopLimiter.limit(identifier);
            }
        },
    };
}

export const generalLimiter = createLimiter("@ratelimit/general", [100, "60 s"]) ?? noopLimiter;
export const aiLimiter = createLimiter("@ratelimit/ai", [10, "60 s"]) ?? noopLimiter;
export const uploadLimiter = createLimiter("@ratelimit/upload", [20, "1 h"]) ?? noopLimiter;
