import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { fetchDataInBackground } from '@/lib/background-fetch';

const createDataSourceSchema = z.object({
    projectId: z.string(),
    name: z.string().min(1),
    type: z.enum(['upload', 'url', 'api', 'google-sheets', 's3']),
    config: z.record(z.string(), z.string()),
});

export async function POST(req: NextRequest) {
    try {
        const { userId, orgId } = await auth();
        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const validation = createDataSourceSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid request', details: validation.error.issues }, { status: 400 });
        }

        const { projectId, name, type, config } = validation.data;

        // Verify project exists and user has access
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project || project.organizationId !== orgId) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // Create data source record
        const dataSource = await prisma.dataSource.create({
            data: {
                projectId,
                name,
                type,
                config,
                status: 'fetching',
            },
        });

        // Trigger background fetch (fire and forget)
        fetchDataInBackground(dataSource.id, type, config).catch(err => {
            console.error('Background fetch error:', err);
        });

        return NextResponse.json({ id: dataSource.id, status: 'fetching' });
    } catch (error) {
        console.error('Create data source error:', error);
        return NextResponse.json({ error: 'Failed to create data source' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { userId, orgId } = await auth();
        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get('projectId');

        if (!projectId) {
            return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }

        // Verify project access
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project || project.organizationId !== orgId) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const dataSources = await prisma.dataSource.findMany({
            where: { projectId },
            select: {
                id: true,
                name: true,
                type: true,
                status: true,
                lastSyncAt: true,
                errorMessage: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ dataSources });
    } catch (error) {
        console.error('List data sources error:', error);
        return NextResponse.json({ error: 'Failed to list data sources' }, { status: 500 });
    }
}
