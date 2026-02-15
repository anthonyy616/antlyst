import { Redis } from "@upstash/redis";

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface RateLimitResult {
    allowed: boolean;
    remainingTokens: number;
    remainingRequests: number;
    retryAfterMs?: number;
    error?: string;
}

export async function checkAIRateLimit(
    userId: string,
    tier: 'free' | 'pro' | 'enterprise',
    estimatedTokens: number
): Promise<RateLimitResult> {
    const now = Date.now();
    const dayKey = `ai:daily:${new Date().toISOString().split('T')[0]}`;
    const userKey = `ai:user:${userId}:${dayKey}`;
    const globalKey = `ai:global:${dayKey}`;
    const rpmKey = `ai:rpm:${Math.floor(now / 60000)}`;

    // Get current usage patterns
    const [userUsage, globalUsage, rpm] = await Promise.all([
        redis.hgetall(userKey) as Promise<Record<string, string>>,
        redis.hgetall(globalKey) as Promise<Record<string, string>>,
        redis.incr(rpmKey)
    ]);

    // Set RPM key expiry (1 minute)
    if (rpm === 1) await redis.expire(rpmKey, 60);

    // 1. Check Global RPM (Groq Hard Limit: 30/min)
    // We leave a buffer of 2 requests for system health checks
    if (rpm > 28) {
        return {
            allowed: false,
            remainingTokens: 0,
            remainingRequests: 0,
            retryAfterMs: 60000 - (now % 60000),
            error: "System busy. Please try again in a moment."
        };
    }

    // 2. Calculate Dynamic Caps
    const caps = calculateDynamicCaps(tier, globalUsage);
    const userTokensUsed = Number(userUsage?.tokens || 0);
    const userRequestsUsed = Number(userUsage?.requests || 0);

    // 3. Check User Limits
    if (userRequestsUsed >= caps.dailyRequests) {
        return {
            allowed: false,
            remainingTokens: 0,
            remainingRequests: 0,
            retryAfterMs: getTimeUntilMidnight(),
            error: "Daily request limit reached."
        };
    }

    if (userTokensUsed + estimatedTokens > caps.dailyTokens) {
        return {
            allowed: false,
            remainingTokens: Math.max(0, caps.dailyTokens - userTokensUsed),
            remainingRequests: Math.max(0, caps.dailyRequests - userRequestsUsed),
            retryAfterMs: getTimeUntilMidnight(),
            error: "Daily token limit reached."
        };
    }

    return {
        allowed: true,
        remainingTokens: caps.dailyTokens - userTokensUsed - estimatedTokens,
        remainingRequests: caps.dailyRequests - userRequestsUsed - 1
    };
}

export async function incrementAIUsage(
    userId: string,
    tokens: number,
    tier: 'free' | 'pro' | 'enterprise'
) {
    const dayKey = `ai:daily:${new Date().toISOString().split('T')[0]}`;
    const userKey = `ai:user:${userId}:${dayKey}`;
    const globalKey = `ai:global:${dayKey}`;

    const pipeline = redis.pipeline();

    // Update User Usage
    pipeline.hincrby(userKey, "tokens", tokens);
    pipeline.hincrby(userKey, "requests", 1);
    pipeline.expire(userKey, 86400); // 24h

    // Update Global Pool Usage
    pipeline.hincrby(globalKey, "totalTokensUsed", tokens);
    pipeline.hincrby(globalKey, `active${capitalize(tier)}Users`, 1); // Simple activity tracking
    pipeline.expire(globalKey, 86400 * 2); // 48h

    await pipeline.exec();
}

function calculateDynamicCaps(
    tier: string,
    globalUsage: Record<string, string> | null
) {
    // Defaults if global usage is empty
    const activeFree = Number(globalUsage?.activeFreeUsers || 1);
    const activePro = Number(globalUsage?.activeProUsers || 1);

    const DAILY_BUDGET = 500_000; // Groq Daily Limit
    const FREE_POOL = DAILY_BUDGET * 0.30; // 150k
    const PRO_POOL = DAILY_BUDGET * 0.60;  // 300k

    switch (tier) {
        case 'free':
            // Dynamic: Share of free pool, clamped between 2k and 10k
            const freeShare = Math.floor(FREE_POOL / Math.max(1, activeFree));
            return {
                dailyTokens: Math.max(2000, Math.min(10000, freeShare)),
                dailyRequests: 20
            };
        case 'pro':
            // Dynamic: Share of pro pool, clamped between 50k and 150k
            const proShare = Math.floor(PRO_POOL / Math.max(1, activePro));
            return {
                dailyTokens: Math.max(50000, Math.min(150000, proShare)),
                dailyRequests: 200
            };
        case 'enterprise':
            return {
                dailyTokens: 200000,
                dailyRequests: 1000
            };
        default:
            return { dailyTokens: 2000, dailyRequests: 5 };
    }
}

function getTimeUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime() - now.getTime();
}

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
