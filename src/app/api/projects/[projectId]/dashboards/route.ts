import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createDashboardSchema = z.object({
    name: z.string().min(1).max(200).optional(),
    style: z.enum(['simple', 'ml', 'powerbi']).default('powerbi'),
    description: z.string().optional(),
});

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { projectId } = await context.params;

        const dashboards = await prisma.dashboard.findMany({
            where: { projectId },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                name: true,
                description: true,
                style: true,
                isPublic: true,
                createdAt: true,
                updatedAt: true,
                ownerId: true,
                _count: {
                    select: { shares: true, comments: true },
                },
            },
        });

        return NextResponse.json({ dashboards });
    } catch (error: any) {
        console.error('List dashboards error:', error);
        return NextResponse.json({ error: 'Failed to list dashboards' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ projectId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { projectId } = await context.params;
        const body = await request.json();
        const validation = createDashboardSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: validation.error.issues },
                { status: 400 }
            );
        }

        const { name, style, description } = validation.data;

        const dashboard = await prisma.dashboard.create({
            data: {
                projectId,
                name: name || `${style.charAt(0).toUpperCase() + style.slice(1)} Dashboard`,
                style,
                description,
                ownerId: userId,
            },
        });

        // Log activity
        await prisma.activityLog.create({
            data: {
                dashboardId: dashboard.id,
                userId,
                action: 'created',
                details: { name: dashboard.name, style },
            },
        });

        return NextResponse.json({ dashboard }, { status: 201 });
    } catch (error: any) {
        console.error('Create dashboard error:', error);
        return NextResponse.json({ error: 'Failed to create dashboard' }, { status: 500 });
    }
}
