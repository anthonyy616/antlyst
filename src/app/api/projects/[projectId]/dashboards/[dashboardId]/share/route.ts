import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const shareSchema = z.object({
    userId: z.string().min(1),
    permission: z.enum(['view', 'edit']).default('view'),
});

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
        const body = await request.json();
        const validation = shareSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: validation.error.issues },
                { status: 400 }
            );
        }

        const { userId: targetUserId, permission } = validation.data;

        // Verify dashboard exists and user is owner
        const dashboard = await prisma.dashboard.findUnique({
            where: { id: dashboardId },
        });

        if (!dashboard) {
            return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
        }

        if (dashboard.ownerId !== userId) {
            return NextResponse.json({ error: 'Only the owner can share a dashboard' }, { status: 403 });
        }

        // Create or update share
        const share = await prisma.dashboardShare.upsert({
            where: {
                dashboardId_userId: { dashboardId, userId: targetUserId },
            },
            update: { permission },
            create: { dashboardId, userId: targetUserId, permission },
            include: {
                user: { select: { id: true, name: true, email: true, imageUrl: true } },
            },
        });

        // Log activity
        await prisma.activityLog.create({
            data: {
                dashboardId,
                userId,
                action: 'shared',
                details: { sharedWith: targetUserId, permission },
            },
        });

        return NextResponse.json({ share });
    } catch (error: any) {
        console.error('Share dashboard error:', error);
        return NextResponse.json({ error: 'Failed to share dashboard' }, { status: 500 });
    }
}

export async function DELETE(
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
        const targetUserId = searchParams.get('userId');

        if (!targetUserId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        const dashboard = await prisma.dashboard.findUnique({
            where: { id: dashboardId },
        });

        if (!dashboard) {
            return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
        }

        if (dashboard.ownerId !== userId) {
            return NextResponse.json({ error: 'Only the owner can manage shares' }, { status: 403 });
        }

        await prisma.dashboardShare.deleteMany({
            where: { dashboardId, userId: targetUserId },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Unshare dashboard error:', error);
        return NextResponse.json({ error: 'Failed to unshare dashboard' }, { status: 500 });
    }
}
