import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const commentSchema = z.object({
    content: z.string().min(1).max(2000),
    parentId: z.string().optional(),
});

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

        const comments = await prisma.dashboardComment.findMany({
            where: { dashboardId },
            include: {
                user: { select: { id: true, name: true, email: true, imageUrl: true } },
            },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json({ comments });
    } catch (error: any) {
        console.error('List comments error:', error);
        return NextResponse.json({ error: 'Failed to list comments' }, { status: 500 });
    }
}

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
        const validation = commentSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: validation.error.issues },
                { status: 400 }
            );
        }

        const { content, parentId } = validation.data;

        // Check dashboard exists
        const dashboard = await prisma.dashboard.findUnique({
            where: { id: dashboardId },
        });

        if (!dashboard) {
            return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
        }

        const comment = await prisma.dashboardComment.create({
            data: {
                dashboardId,
                userId,
                content,
                parentId: parentId || null,
            },
            include: {
                user: { select: { id: true, name: true, email: true, imageUrl: true } },
            },
        });

        // Log activity
        await prisma.activityLog.create({
            data: {
                dashboardId,
                userId,
                action: 'commented',
                details: { commentId: comment.id, preview: content.slice(0, 100) },
            },
        });

        return NextResponse.json({ comment }, { status: 201 });
    } catch (error: any) {
        console.error('Add comment error:', error);
        return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
    }
}
