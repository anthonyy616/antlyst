import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ projectId: string; dashboardId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { dashboardId } = await context.params;

        const original = await prisma.dashboard.findUnique({
            where: { id: dashboardId },
        });

        if (!original) {
            return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
        }

        const duplicate = await prisma.dashboard.create({
            data: {
                projectId: original.projectId,
                name: `${original.name} (Copy)`,
                description: original.description,
                style: original.style,
                config: original.config as any,
                layout: original.layout as any,
                filterConfig: original.filterConfig as any,
                ownerId: userId,
            },
        });

        // Log activity
        await prisma.activityLog.create({
            data: {
                dashboardId: duplicate.id,
                userId,
                action: 'created',
                details: { duplicatedFrom: dashboardId, name: duplicate.name },
            },
        });

        return NextResponse.json({ dashboard: duplicate }, { status: 201 });
    } catch (error: any) {
        console.error('Duplicate dashboard error:', error);
        return NextResponse.json({ error: 'Failed to duplicate dashboard' }, { status: 500 });
    }
}
