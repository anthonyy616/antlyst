import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateDashboardSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    style: z.enum(['simple', 'ml', 'powerbi']).optional(),
    config: z.any().optional(),
    layout: z.any().optional(),
    filterConfig: z.any().optional(),
    isPublic: z.boolean().optional(),
});

async function verifyAccess(userId: string, dashboardId: string) {
    const dashboard = await prisma.dashboard.findUnique({
        where: { id: dashboardId },
        include: {
            shares: { where: { userId } },
        },
    });

    if (!dashboard) return null;

    const isOwner = dashboard.ownerId === userId;
    const share = dashboard.shares[0];
    const hasEditAccess = isOwner || share?.permission === 'edit';

    return { dashboard, isOwner, hasEditAccess };
}

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

        const dashboard = await prisma.dashboard.findUnique({
            where: { id: dashboardId },
            include: {
                shares: {
                    include: { user: { select: { id: true, name: true, email: true, imageUrl: true } } },
                },
                _count: { select: { comments: true } },
            },
        });

        if (!dashboard) {
            return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
        }

        return NextResponse.json({ dashboard });
    } catch (error: any) {
        console.error('Get dashboard error:', error);
        return NextResponse.json({ error: 'Failed to get dashboard' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ projectId: string; dashboardId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { dashboardId } = await context.params;
        const access = await verifyAccess(userId, dashboardId);

        if (!access) {
            return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
        }

        if (!access.hasEditAccess) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const validation = updateDashboardSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: validation.error.issues },
                { status: 400 }
            );
        }

        const data = validation.data;
        const updateData: Record<string, any> = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.style !== undefined) updateData.style = data.style;
        if (data.config !== undefined) updateData.config = data.config;
        if (data.layout !== undefined) updateData.layout = data.layout;
        if (data.filterConfig !== undefined) updateData.filterConfig = data.filterConfig;
        if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;

        const dashboard = await prisma.dashboard.update({
            where: { id: dashboardId },
            data: updateData,
        });

        // Log activity
        await prisma.activityLog.create({
            data: {
                dashboardId,
                userId,
                action: 'updated',
                details: { fields: Object.keys(updateData) },
            },
        });

        return NextResponse.json({ dashboard });
    } catch (error: any) {
        console.error('Update dashboard error:', error);
        return NextResponse.json({ error: 'Failed to update dashboard' }, { status: 500 });
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
        const access = await verifyAccess(userId, dashboardId);

        if (!access) {
            return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
        }

        if (!access.isOwner) {
            return NextResponse.json({ error: 'Only the owner can delete a dashboard' }, { status: 403 });
        }

        await prisma.dashboard.delete({ where: { id: dashboardId } });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete dashboard error:', error);
        return NextResponse.json({ error: 'Failed to delete dashboard' }, { status: 500 });
    }
}
