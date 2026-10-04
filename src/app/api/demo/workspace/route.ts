import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateDashboard } from '@/lib/analysis-engine';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const style = body.style === 'ml' || body.style === 'powerbi' ? body.style : 'simple';

    const organizationId = `org_${userId}`;
    await prisma.organization.upsert({
      where: { id: organizationId },
      update: {},
      create: {
        id: organizationId,
        name: 'Demo Workspace',
        slug: `demo-${userId}`,
      },
    });

    await prisma.user.upsert({
      where: { id: userId },
      update: { organizationId },
      create: {
        id: userId,
        email: `demo_${userId}@placeholder.dev`,
        organizationId,
      },
    });

    await prisma.orgMembership.upsert({
      where: { userId_organizationId: { userId, organizationId } },
      update: {},
      create: { userId, organizationId, role: 'owner' },
    });

    const project = await prisma.project.findFirst({ where: { organizationId } });
    if (project) {
      return NextResponse.json({
        demoWorkspace: false,
        organizationId,
        projectId: project.id,
        project: { id: project.id, name: project.name },
      });
    }

    const sample = `date,product,category,region,units,revenue,segment,channel,customer_age,profit
2026-01-01,Widget A,Electronics,West,120,12000,Corporate,Online,34,2400
2026-01-02,Widget B,Electronics,West,95,9500,Enterprise,Online,41,1900
2026-01-03,Widget A,Electronics,East,130,13000,Consumer,Store,28,2600
2026-01-04,Widget B,Electronics,East,80,8000,Enterprise,Store,36,1600
2026-01-05,Widget C,Apparel,West,200,6000,Consumer,Online,22,1200
2026-01-06,Widget C,Apparel,East,210,6300,Consumer,Store,26,1890
2026-01-07,Widget D,Home&Ergonomic,West,55,16500,Corporate,Online,45,3300
2026-01-08,Widget D,Home&Ergonomic,East,50,15000,Enterprise,Store,38,3000
2026-01-09,Widget A,Electronics,West,125,12500,Corporate,Store,40,2500
2026-01-10,Widget B,Electronics,East,90,9000,Enterprise,Online,44,1800
2026-01-11,Widget C,Apparel,West,180,5400,Consumer,Store,30,1620
2026-01-12,Widget D,Home&Ergonomic,East,60,18000,Corporate,Store,50,4500
2026-01-13,Widget A,Electronics,West,110,11000,Enterprise,Online,42,2200
2026-01-14,Widget B,Electronics,East,85,8500,Consumer,Store,27,1700
2026-01-15,Widget C,Apparel,West,195,5850,Enterprise,Online,49,2925
2026-01-16,Widget D,Home&Ergonomic,East,58,17400,Consumer,Online,35,2610
2026-01-17,Widget A,Electronics,West,140,14000,Consumer,Store,24,2800
2026-01-18,Widget B,Electronics,East,100,10000,Corporate,Store,46,2000
2026-01-19,Widget C,Apparel,West,210,6300,Enterprise,Store,39,3780
2026-01-20,Widget D,Home&Ergonomic,East,62,18600,Enterprise,Online,43,3720
2026-01-21,Widget A,Electronics,West,115,11500,Corporate,Online,51,2300
2026-01-22,Widget B,Electronics,East,95,9500,Consumer,Store,29,1900
2026-01-23,Widget C,Apparel,West,205,6150,Corporate,Online,47,3090
2026-01-24,Widget D,Home&Ergonomic,East,52,15600,Consumer,Store,33,2340
2026-01-25,Widget A,Electronics,West,135,13500,Enterprise,Store,48,2700
2026-01-26,Widget B,Electronics,East,88,8800,Enterprise,Online,45,1760
2026-01-27,Widget C,Apparel,West,185,5550,Corporate,Store,52,3345
2026-01-28,Widget D,Home&Ergonomic,East,64,19200,Enterprise,Online,37,3840
2026-01-29,Widget A,Electronics,West,105,10500,Consumer,Store,26,2100
2026-01-30,Widget B,Electronics,East,98,9800,Consumer,Online,32,1960
2026-01-31,Widget C,Apparel,West,200,6000,Corporate,Online,44,3000`;

    const projectRecord = await prisma.project.create({
      data: {
        organizationId,
        ownerId: userId,
        name: `Demo: Sample Sales Data`,
        status: 'ready',
        description: 'Sample workspace generated for onboarding. Replace with your own data.',
      },
    });

    const dashboardConfig = await generateDashboard(sample, style);

    await prisma.file.create({
      data: {
        projectId: projectRecord.id,
        fileName: 'sample_sales.csv',
        fileSize: Buffer.byteLength(sample, 'utf-8'),
        mimeType: 'text/csv',
        r2Key: `demo/${projectRecord.id}/sample_sales.csv`,
        r2Url: '',
        uploadStatus: 'completed',
      },
    });

    await prisma.dashboard.create({
      data: {
        projectId: projectRecord.id,
        name: 'Sample Sales Dashboard',
        description: 'A guided example dashboard using sample sales data.',
        style,
        ownerId: userId,
        config: dashboardConfig as any,
      },
    });

    return NextResponse.json({
      demoWorkspace: true,
      organizationId,
      projectId: projectRecord.id,
      project: { id: projectRecord.id, name: projectRecord.name },
    });
  } catch (error) {
    console.error('Demo workspace creation failed:', error);
    return NextResponse.json({ error: 'Failed to create demo workspace' }, { status: 500 });
  }
}
