import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getProjectActivity } from '@/lib/activity-logger';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { userId, orgId } = await auth();
        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

        // Get all project IDs for this org
        const projects = await prisma.project.findMany({
            where: { organizationId: orgId },
            select: { id: true },
        });

        const projectIds = projects.map(p => p.id);

        // Get activity across all org dashboards
        const activities = await prisma.activityLog.findMany({
            where: {
                dashboard: { projectId: { in: projectIds } },
            },
            include: {
                user: { select: { id: true, name: true, email: true, imageUrl: true } },
                dashboard: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });

        return NextResponse.json({ activities });
    } catch (error: any) {
        console.error('List org activity error:', error);
        return NextResponse.json({ error: 'Failed to list activity' }, { status: 500 });
    }
}
