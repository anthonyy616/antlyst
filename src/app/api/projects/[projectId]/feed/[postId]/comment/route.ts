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
    const { content } = body;

    if (!content) return NextResponse.json({ error: "Content required" }, { status: 400 });

    // Verify access via Project
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { organizationId: true }
    });

    if (!project || project.organizationId !== orgId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const comment = await prisma.comment.create({
        data: {
            postId,
            userId,
            content
        },
        include: {
            user: {
                select: { id: true, name: true, imageUrl: true }
            }
        }
    });

    return NextResponse.json(comment);
}
