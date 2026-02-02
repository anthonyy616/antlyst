import { requireOrg, checkOrgAccess } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText } from 'lucide-react';

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId: userOrgId } = await requireOrg();
  const { orgId } = await params;

  const hasAccess = await checkOrgAccess(orgId);
  if (!hasAccess || orgId !== userOrgId) {
    redirect(`/${userOrgId}/projects`);
  }

  const projects = await prisma.project.findMany({
    where: { organizationId: orgId },
    include: {
      files: true,
      _count: {
        select: { dashboards: true, analyses: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">Projects</h1>
          <p className="text-slate-600 mt-2">
            Manage your data projects and dashboards
          </p>
        </div>
        <Link href={`/${orgId}/projects/new`}>
          <Button size="lg">
            <Plus className="mr-2 h-5 w-5" />
            New Project
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-slate-400" />
          <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
          <p className="text-slate-600 mb-6">
            Get started by creating your first project
          </p>
          <Link href={`/${orgId}/projects/new`}>
            <Button>Create Project</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link key={project.id} href={`/${orgId}/projects/${project.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <Badge
                      variant={
                        project.status === 'ready'
                          ? 'default'
                          : project.status === 'processing'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {project.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    {project.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>{project.files.length} file(s)</span>
                    <span>{project._count.dashboards} dashboard(s)</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}