import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, checkOrgAccess } from '@/lib/auth';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ projectId: string }> }
) {
    const { projectId } = await context.params;
    const { userId, orgId } = await requireAuth();

    // Verify access
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { organizationId: true }
    });

    if (!project || project.organizationId !== orgId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const posts = await prisma.post.findMany({
        where: { projectId },
        include: {
            user: {
                select: { id: true, name: true, imageUrl: true }
            },
            _count: {
                select: { comments: true, reactions: true }
            },
            reactions: {
                where: { userId }, // Only fetch current user's reactions to check 'liked' state? 
                // actually better to fetch all to show counts per type, 
                // but for MVP just showing logic.
                include: { user: true }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
    });

    // Transform for easier frontend consumption
    const feed = posts.map(p => ({
        ...p,
        hasReacted: p.reactions.some(r => r.userId === userId),
        reactionCount: p._count.reactions,
        commentCount: p._count.comments
    }));

    return NextResponse.json(feed);
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ projectId: string }> }
) {
    const { projectId } = await context.params;
    const { userId, orgId } = await requireAuth();

    const body = await request.json();
    const { content } = body;

    if (!content) return NextResponse.json({ error: "Content required" }, { status: 400 });

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { organizationId: true }
    });

    if (!project || project.organizationId !== orgId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const post = await prisma.post.create({
        data: {
            projectId,
            userId,
            content
        },
        include: {
            user: {
                select: { id: true, name: true, imageUrl: true }
            }
        }
    });

    return NextResponse.json(post);
}
