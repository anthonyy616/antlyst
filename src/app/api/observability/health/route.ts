import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { runHealthChecks } from '@/lib/health';

/**
 * GET /api/observability/health
 *
 * Internal diagnostics. No secrets are returned: connection strings,
 * tokens, dataset contents, and personal data are intentionally absent.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await runHealthChecks();

    return NextResponse.json({
      ...status,
      requestedBy: userId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to run health checks' },
      { status: 500 }
    );
  }
}
