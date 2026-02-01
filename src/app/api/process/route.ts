import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { processFileJob } from '@/lib/processing-worker';

const processSchema = z.object({
    fileId: z.string(),
});

export async function POST(request: NextRequest) {
    try {
        const { userId, orgId } = await auth();

        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const validation = processSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: validation.error.issues },
                { status: 400 }
            );
        }

        const { fileId } = validation.data;

        // Fetch file record
        const file = await prisma.file.findUnique({
            where: { id: fileId },
            include: { project: true },
        });

        if (!file) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        if (file.project.organizationId !== orgId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Create Job
        const job = await prisma.job.create({
            data: {
                type: 'csv_ingest',
                status: 'queued',
                payload: { fileId },
                userId,
                orgId,
            }
        });

        // Trigger worker (Fire and forget, but in memory for now)
        // In a real production serverless env, this should be a queue or waitUntil
        // For Vercel, we can use waitUntil if available, or just not await
        // processFileJob(job.id).catch(console.error); // This can be risky in lambdas

        // Better: Assuming robust deployment, we run it.
        // We will call it without await, but we should ideally use `after` from nextjs if available.
        // For now, simple no-await.
        processFileJob(job.id).catch(err => console.error("Job Trigger Error", err));

        return NextResponse.json({
            success: true,
            jobId: job.id,
            message: 'Processing started in background'
        });

    } catch (error) {
        console.error('Processing request error:', error);
        return NextResponse.json(
            { error: 'Failed to initiate processing' },
            { status: 500 }
        );
    }
}
