import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { testDataSource } from '@/lib/data-fetchers';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId, orgId } = await auth();
        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        const dataSource = await prisma.dataSource.findUnique({
            where: { id },
            include: { project: true },
        });

        if (!dataSource || dataSource.project.organizationId !== orgId) {
            return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
        }

        const result = await testDataSource(dataSource.type, dataSource.config as Record<string, string>);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Test data source error:', error);
        return NextResponse.json({ error: 'Failed to test connection' }, { status: 500 });
    }
}
