import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createAlertSchema = z.object({
    name: z.string().min(1).max(200),
    metric: z.string().min(1),
    condition: z.enum(['above', 'below', 'drops_by_pct', 'increases_by_pct', 'anomaly_detected']),
    threshold: z.number(),
    enabled: z.boolean().optional().default(true),
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

        const alerts = await prisma.alertRule.findMany({
            where: { projectId },
            include: {
                _count: { select: { AlertEvent: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ alerts });
    } catch (error: any) {
        console.error('List alerts error:', error);
        return NextResponse.json({ error: 'Failed to list alerts' }, { status: 500 });
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
        const validation = createAlertSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: validation.error.issues },
                { status: 400 }
            );
        }

        const alert = await prisma.alertRule.create({
            data: {
                projectId,
                userId,
                ...validation.data,
            },
        });

        return NextResponse.json({ alert }, { status: 201 });
    } catch (error: any) {
        console.error('Create alert error:', error);
        return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
    }
}
