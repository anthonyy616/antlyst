import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Only create Redis/limiters if env vars are present
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = redisUrl && redisToken
    ? new Redis({ url: redisUrl, token: redisToken })
    : null;

type RateLimitResult = {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
};

type FallbackEntry = {
    count: number;
    reset: number;
};

const fallbackState = new Map<string, Map<string, FallbackEntry>>();
const lastRedisWarning = new Map<string, number>();

function createFallbackLimiter(
    prefix: string,
    limit: number,
    windowMs: number,
) {
    const entries = fallbackState.get(prefix) ?? new Map<string, FallbackEntry>();
    fallbackState.set(prefix, entries);

    return async (identifier: string): Promise<RateLimitResult> => {
        const now = Date.now();
        const current = entries.get(identifier);
        const entry = !current || current.reset <= now
            ? { count: 0, reset: now + windowMs }
            : current;

        entry.count += 1;
        entries.set(identifier, entry);

        // Keep the best-effort in-memory fallback bounded in long-lived runtimes.
        if (entries.size > 10_000) {
            for (const [key, value] of entries) {
                if (value.reset <= now) entries.delete(key);
            }
        }

        return {
            success: entry.count <= limit,
            limit,
            remaining: Math.max(0, limit - entry.count),
            reset: entry.reset,
        };
    };
}

function warnRedisFailureOnce(prefix: string, error: unknown) {
    const now = Date.now();
    const previousWarning = lastRedisWarning.get(prefix) ?? 0;

    if (now - previousWarning < 60_000) return;

    lastRedisWarning.set(prefix, now);
    console.warn(
        `[rate-limit] ${prefix} is temporarily unavailable; using an in-memory fallback.`,
        error instanceof Error ? error.message : undefined,
    );
}

function createLimiter(
    prefix: string,
    window: Parameters<typeof Ratelimit.slidingWindow>,
    fallbackLimit: number,
    fallbackWindowMs: number,
) {
    const fallback = createFallbackLimiter(prefix, fallbackLimit, fallbackWindowMs);
    if (!redis) return { limit: fallback };

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
                warnRedisFailureOnce(prefix, err);
                return fallback(identifier);
            }
        },
    };
}

export const generalLimiter = createLimiter("@ratelimit/general", [100, "60 s"], 100, 60_000);
export const aiLimiter = createLimiter("@ratelimit/ai", [10, "60 s"], 10, 60_000);
export const uploadLimiter = createLimiter("@ratelimit/upload", [20, "1 h"], 20, 60 * 60_000);
