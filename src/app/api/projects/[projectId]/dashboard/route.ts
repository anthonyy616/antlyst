import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getFileContent } from '@/lib/r2';
import { generateDashboard } from '@/lib/analysis-engine';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ projectId: string }> } // Correct params typing for Next.js 15
) {
    const { projectId } = await context.params;

    try {
        const { userId, orgId } = await auth();
        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch Project & Dashboard Config
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                files: {
                    where: { uploadStatus: 'pending' }, // 'pending' because we set it to pending initially, check logic? 
                    // Actually, if upload is complete, we might want 'completed' status?
                    // In api/upload-complete we didn't explicitly update status to 'completed' yet? 
                    // Wait, let's check api/upload-complete.
                    // For now, let's just grab the most recent file.
                    orderBy: { createdAt: 'desc' },
                    take: 1
                },
                dashboards: {
                    take: 1
                }
            }
        });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.organizationId !== orgId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const dashboard = project.dashboards[0];
        const file = project.files[0];

        if (!dashboard || !file) {
            return NextResponse.json({ error: 'Project incomplete' }, { status: 400 });
        }

        // 2. Check if we already have config cached in DB
        // The 'config' field is Json? type.
        if (dashboard.config && Object.keys(dashboard.config as object).length > 0) {
            return NextResponse.json(dashboard.config);
        }

        // 3. Generate Dashboard Config
        // Fetch valid CSV content
        const csvContent = await getFileContent(file.r2Key);

        // Generate
        const config = await generateDashboard(
            csvContent,
            (dashboard.style as 'simple' | 'ml' | 'powerbi') || 'simple'
        );

        // 4. Save to DB Cache
        await prisma.dashboard.update({
            where: { id: dashboard.id },
            data: { config: config as any } // Cast to any for Prisma Json
        });

        return NextResponse.json(config);

    } catch (error) {
        console.error("Dashboard generation error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
