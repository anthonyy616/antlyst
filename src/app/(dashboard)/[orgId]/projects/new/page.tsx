import { requireOrg, checkOrgAccess } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UploadWizard } from '@/components/UploadWizard';

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
    <div className="container mx-auto py-12 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">Create New Project</h1>
        <p className="text-muted-foreground">Upload your data and chose your visualization style.</p>
      </div>

      <UploadWizard orgId={orgId} />
    </div>
  );
}