import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { setRefreshSchedule, executeRefresh, type RefreshSchedule } from '@/lib/scheduled-refresh';
import { z } from 'zod';

const scheduleSchema = z.object({
    schedule: z.enum(['manual', 'hourly', 'daily', 'weekly', 'monthly']),
});

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;

        // Verify data source exists
        const dataSource = await prisma.dataSource.findUnique({
            where: { id },
        });

        if (!dataSource) {
            return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
        }

        // Execute refresh
        const result = await executeRefresh(id);

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Refresh error:', error);
        return NextResponse.json({ error: 'Failed to refresh' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;
        const body = await request.json();
        const validation = scheduleSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: validation.error.issues },
                { status: 400 }
            );
        }

        const { schedule } = validation.data;
        await setRefreshSchedule(id, schedule as RefreshSchedule);

        return NextResponse.json({ success: true, schedule });
    } catch (error: any) {
        console.error('Update schedule error:', error);
        return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
    }
}
