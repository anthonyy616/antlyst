import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ projectId: string; postId: string }> }
) {
    const { projectId, postId } = await context.params;
    const { userId, orgId } = await requireAuth();

    const body = await request.json();

    const schema = z.object({
        content: z.string().min(1, "Content is required").max(500, "Comment too long")
    });

    const validation = schema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }

    const { content } = validation.data;

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
