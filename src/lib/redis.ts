import { Redis } from '@upstash/redis';

// Initialize Redis client using Upstash HTTP ReST
export const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const CACHE_TTL = {
    SHORT: 60 * 5,       // 5 minutes
    MEDIUM: 60 * 60,     // 1 hour
    LONG: 60 * 60 * 24   // 24 hours
};
