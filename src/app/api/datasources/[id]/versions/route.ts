import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;

        const versions = await prisma.datasetVersion.findMany({
            where: { dataSourceId: id },
            orderBy: { version: 'desc' },
        });

        return NextResponse.json({ versions });
    } catch (error: any) {
        console.error('List versions error:', error);
        return NextResponse.json({ error: 'Failed to list versions' }, { status: 500 });
    }
}
