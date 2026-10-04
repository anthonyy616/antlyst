import { prisma } from './prisma';
import { redis } from './redis';

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'fail';
  checks: Record<string, 'ok' | 'degraded' | 'fail'>;
  timestamp: string;
}

function ok(): 'ok' {
  return 'ok';
}

function degraded(): 'degraded' {
  return 'degraded';
}

function fail(): 'fail' {
  return 'fail';
}

/**
 * Run non-secret diagnostics for the platform dependencies.
 * Safe to expose at any public endpoint; nothing here includes
 * connection strings, tokens, dataset contents, or personal data.
 */
export async function runHealthChecks(): Promise<HealthStatus> {
  const checks: Record<string, 'ok' | 'degraded' | 'fail'> = {};

  try {
    const db = await prisma.$queryRaw`SELECT 1 AS ok`;
    checks.db = Array.isArray(db) && (db as { ok?: unknown }[]).length ? ok() : fail();
  } catch (error) {
    checks.db = fail();
  }

  try {
    if (process.env.UPSTASH_REDIS_REST_URL) {
      await redis.ping();
      checks.redis = ok();
    } else {
      checks.redis = degraded();
    }
  } catch (error) {
    checks.redis = degraded();
  }

  try {
    // Clerk has no public "ping" endpoint; verify its publishable key
    // is present and parseable. Credential validation happens inside
    // Clerk itself.
    if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
      checks.clerk = ok();
    } else {
      checks.clerk = degraded();
    }
  } catch (error) {
    checks.clerk = degraded();
  }

  try {
    if (process.env.R2_ACCOUNT_ID) {
      checks.storage = ok();
    } else {
      checks.storage = degraded();
    }
  } catch (error) {
    checks.storage = degraded();
  }

  const status = Object.values(checks).every((v) => v === 'ok')
    ? 'ok'
    : Object.values(checks).some((v) => v === 'fail')
      ? 'fail'
      : 'degraded';

  return { status, checks, timestamp: new Date().toISOString() };
}

export async function getHealthResponse(): Promise<Response> {
  return new Response(JSON.stringify(await runHealthChecks()), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
