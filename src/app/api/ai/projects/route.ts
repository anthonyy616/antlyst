import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/ai/projects
 * Returns all projects the user has access to (for AI chat project selector)
 */
export async function GET() {
  try {
    const { userId } = await auth();
    console.log('[AI Projects] userId:', userId);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all organizations the user is a member of
    const memberships = await prisma.orgMembership.findMany({
      where: { userId },
      select: { organizationId: true }
    });
    console.log('[AI Projects] memberships:', memberships);

    const orgIds = memberships.map(m => m.organizationId);

    if (orgIds.length === 0) {
      return NextResponse.json({
        projects: [],
        debug: { reason: 'No org memberships found', userId }
      });
    }

    // Get projects the user OWNS or projects in their organizations
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },  // Projects user owns
          { organizationId: { in: orgIds } }  // Projects in user's orgs
        ]
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true
          }
        },
        dashboards: {
          select: {
            style: true,
            updatedAt: true
          },
          orderBy: { updatedAt: 'desc' },
          take: 1
        },
        files: {
          select: { id: true, uploadStatus: true },
          take: 3
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 50
    });

    console.log('[AI Projects] orgIds:', orgIds);
    console.log('[AI Projects] Found projects:', projects.length);
    if (projects.length > 0) {
      console.log('[AI Projects] Sample:', projects[0]);
    }

    const formattedProjects = projects.map(p => ({
      id: p.id,
      name: p.name,
      organizationName: p.organization.name,
      dashboardStyle: p.dashboards[0]?.style || 'simple',
      lastUpdated: p.dashboards[0]?.updatedAt || p.updatedAt || p.createdAt,
      hasFiles: p.files.length > 0,
      fileStatuses: p.files.map(f => f.uploadStatus)
    }));

    // Debug: Check ALL projects in DB for this user
    const allUserProjects = await prisma.project.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, organizationId: true }
    });

    return NextResponse.json({
      projects: formattedProjects,
      debug: {
        userId,
        orgIds,
        projectsInOrgs: projects.length,
        allUserProjects: allUserProjects.map(p => ({
          id: p.id,
          name: p.name,
          orgId: p.organizationId,
          inUserOrgs: orgIds.includes(p.organizationId)
        }))
      }
    });

  } catch (error: any) {
    console.error('Error fetching projects for AI:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
