import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ projectId: string; postId: string }> }
) {
    const { projectId, postId } = await context.params;
    const { userId, orgId } = await requireAuth();

    const body = await request.json();
    const { emoji } = body; // e.g., 'like', 'thumbsup'

    if (!emoji) return NextResponse.json({ error: "Emoji required" }, { status: 400 });

    // Verify access
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { organizationId: true }
    });

    if (!project || project.organizationId !== orgId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Toggle reaction: if exists, delete it. If not, create it.
    const existing = await prisma.reaction.findUnique({
        where: {
            postId_userId_emoji: {
                postId,
                userId,
                emoji
            }
        }
    });

    if (existing) {
        await prisma.reaction.delete({
            where: { id: existing.id }
        });
        return NextResponse.json({ status: 'removed' });
    } else {
        await prisma.reaction.create({
            data: {
                postId,
                userId,
                emoji
            }
        });
        return NextResponse.json({ status: 'added' });
    }
}
