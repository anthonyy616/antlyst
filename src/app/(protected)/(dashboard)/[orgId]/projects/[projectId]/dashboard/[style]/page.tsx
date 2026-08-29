import { requireOrg, checkOrgAccess } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import SimpleEngine from '@/components/dashboard/simple-engine'; // Use implementation
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
    include: {
      files: true,
    },
  });

  if (!project) {
    notFound();
  }

  // Fetch analysis result
  const analysis = await prisma.analysisResult.findFirst({
    where: { fileId: project.files[0]?.id },
    select: {
      id: true,
      stats: true, // This contains the dashboard results
    }
  });

  const analysisResult = analysis?.stats as any || null;

  const renderEngine = () => {
    switch (style) {
      case 'simple':
        return <SimpleEngine analysisResult={analysisResult} />;
      case 'ml':
        return <MLPlotsEngine analysisResult={analysisResult} />;
      case 'powerbi':
        return <PowerBIEngine analysisResult={analysisResult} />;
      default:
        return <div>Unknown style</div>;
    }
  };

  return (
    <div className="py-4 md:py-6 px-2 sm:px-3 md:px-4 max-w-[1600px] mx-auto overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3 md:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link href={`/${orgId}/projects/${projectId}`}>
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg md:text-2xl font-bold truncate">{project.name}</h1>
            <p className="text-[10px] sm:text-xs md:text-sm text-slate-500 capitalize">{style} Dashboard</p>
          </div>
        </div>

        <div className="flex gap-1 sm:gap-1.5 md:gap-2 shrink-0">
          {['simple', 'ml', 'powerbi'].map((s) => (
            <Link key={s} href={`/${orgId}/projects/${projectId}/dashboard/${s}`}>
              <Button
                variant={style === s ? "default" : "outline"}
                size="sm"
                className="capitalize text-[10px] sm:text-xs md:text-sm px-2 sm:px-3"
              >
                {s}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm min-h-[400px] md:min-h-[800px] overflow-hidden">
        {renderEngine()}
      </div>
    </div>
  );
}