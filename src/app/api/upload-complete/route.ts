import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const completeSchema = z.object({
    fileId: z.string().min(1),
    projectId: z.string().min(1),
});

export async function POST(request: NextRequest) {
    try {
        const { userId, orgId } = await auth();
        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = completeSchema.safeParse(await request.json());
        if (!body.success) {
            return NextResponse.json({ error: 'Invalid upload completion request' }, { status: 400 });
        }

        const file = await prisma.file.findUnique({
            where: { id: body.data.fileId },
            include: { project: true },
        });
        if (!file || file.project.id !== body.data.projectId) {
            return NextResponse.json({ error: 'Upload record not found' }, { status: 404 });
        }
        if (file.project.organizationId !== orgId || file.project.ownerId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await prisma.$transaction([
            prisma.file.update({
                where: { id: file.id },
                data: { uploadStatus: 'uploaded' },
            }),
            prisma.project.update({
                where: { id: file.projectId },
                data: { status: 'processing' },
            }),
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Upload completion error:', error);
        return NextResponse.json({ error: 'Failed to complete upload' }, { status: 500 });
    }
}
