import { requireOrg, checkOrgAccess } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import SimpleEngine from '@/components/dashboard/SimpleEngine';
import MLPlotsEngine from '@/components/dashboard/MLPlotsEngine';
import PowerBIEngine from '@/components/dashboard/PowerBIEngine';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgId: string; projectId: string; style: string }>;
}) {
  const { orgId: userOrgId } = await requireOrg();
  const { orgId, projectId, style } = await params;

  const hasAccess = await checkOrgAccess(orgId);
  if (!hasAccess || orgId !== userOrgId) {
    redirect(`/${userOrgId}/projects`);
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId: orgId,
    },
  });

  if (!project) {
    notFound();
  }

  const renderEngine = () => {
    switch (style) {
      case 'simple':
        return <SimpleEngine projectId={projectId} />;
      case 'ml':
        return <MLPlotsEngine projectId={projectId} />;
      case 'powerbi':
        return <PowerBIEngine projectId={projectId} />;
      default:
        return <div>Unknown style</div>;
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-[1600px]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/${orgId}/projects/${projectId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-sm text-slate-500 capitalize">{style} Dashboard</p>
          </div>
        </div>

        <div className="flex gap-2">
          {['simple', 'ml', 'powerbi'].map((s) => (
            <Link key={s} href={`/${orgId}/projects/${projectId}/dashboard/${s}`}>
              <Button
                variant={style === s ? "default" : "outline"}
                size="sm"
                className="capitalize"
              >
                {s}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm min-h-[800px]">
        {renderEngine()}
      </div>
    </div>
  );
}