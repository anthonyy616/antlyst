import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ projectId: string; dashboardId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { dashboardId } = await context.params;
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

        const activities = await prisma.activityLog.findMany({
            where: { dashboardId },
            include: {
                user: { select: { id: true, name: true, email: true, imageUrl: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return NextResponse.json({ activities });
    } catch (error: any) {
        console.error('List activity error:', error);
        return NextResponse.json({ error: 'Failed to list activity' }, { status: 500 });
    }
}
