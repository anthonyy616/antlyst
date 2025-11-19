import { requireOrg, checkOrgAccess } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UploadZone } from '@/components/upload-zone';
import { AnalysisSelector } from '@/components/analysis-selector';

export default async function NewProjectPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId: userOrgId } = await requireOrg();
  const { orgId } = await params;

  // Security: verify user has access to this org
  const hasAccess = await checkOrgAccess(orgId);
  if (!hasAccess || orgId !== userOrgId) {
    redirect(`/${userOrgId}/projects`);
  }

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4">
      <h1 className="mb-8 text-4xl font-bold">Create New Project</h1>
      
      <div className="space-y-8">
        <section>
          <h2 className="mb-4 text-2xl font-semibold">1. Upload Your Data</h2>
          <UploadZone orgId={orgId} />
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">2. Select Analyses</h2>
          <AnalysisSelector />
        </section>
      </div>
    </div>
  );
}