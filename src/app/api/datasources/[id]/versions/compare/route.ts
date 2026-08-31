import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const compareSchema = z.object({
    fromVersion: z.number().int().min(1),
    toVersion: z.number().int().min(1),
});

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await context.params;
        const body = await request.json();
        const validation = compareSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: validation.error.issues },
                { status: 400 }
            );
        }

        const { fromVersion, toVersion } = validation.data;

        const versions = await prisma.datasetVersion.findMany({
            where: {
                dataSourceId: id,
                version: { in: [fromVersion, toVersion] },
            },
            orderBy: { version: 'asc' },
        });

        if (versions.length !== 2) {
            return NextResponse.json({ error: 'Both versions not found' }, { status: 404 });
        }

        const from = versions[0];
        const to = versions[1];

        const fromSchema = (from.schema as Record<string, string>) || {};
        const toSchema = (to.schema as Record<string, string>) || {};
        const fromKeys = new Set(Object.keys(fromSchema));
        const toKeys = new Set(Object.keys(toSchema));

        const comparison = {
            fromVersion,
            toVersion,
            from: {
                rowCount: from.rowCount,
                columnCount: from.columnCount,
                createdAt: from.createdAt,
            },
            to: {
                rowCount: to.rowCount,
                columnCount: to.columnCount,
                createdAt: to.createdAt,
            },
            changes: {
                rowsAdded: to.rowCount - from.rowCount,
                columnsAdded: [...toKeys].filter(k => !fromKeys.has(k)),
                columnsRemoved: [...fromKeys].filter(k => !toKeys.has(k)),
                columnsChanged: [...toKeys].filter(k =>
                    fromKeys.has(k) && fromSchema[k] !== toSchema[k]
                ).map(k => ({
                    column: k,
                    from: fromSchema[k],
                    to: toSchema[k],
                })),
            },
            changeSummary: to.changeSummary,
        };

        return NextResponse.json({ comparison });
    } catch (error: any) {
        console.error('Compare versions error:', error);
        return NextResponse.json({ error: 'Failed to compare versions' }, { status: 500 });
    }
}
