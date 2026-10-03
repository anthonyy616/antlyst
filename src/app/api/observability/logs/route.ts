import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * GET /api/observability/logs
 *
 * Returns safe structured server logs filtered by category.
 * Logs are separated by request ID; dataset contents and tokens are never
 * stored in this log stream.
 */
const allowedCategories = [
  'validation_error',
  'not_found',
  'unauthorized',
  'forbidden',
  'rate_limit',
  'upload',
  'processing',
  'database',
  'ai',
  'mail',
  'storage',
  'external_service',
  'unexpected',
];

const logs: LogEntry[] = [];

interface LogEntry {
  message: string;
  category: string;
  requestId: string;
  userId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') ?? 'all';

    if (category !== 'all' && !allowedCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const filtered = category === 'all'
      ? logs.slice()
      : logs.filter((log) => log.category === category);

    // Keep the response bounded and deterministic.
    return NextResponse.json({ logs: filtered.slice(-200) });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load logs' },
      { status: 500 }
    );
  }
}
