import { requireOrg, checkOrgAccess } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ProjectDashboardClient from './client-page';

export default async function ProjectPage({
    params,
}: {
    params: Promise<{ orgId: string; projectId: string }>;
}) {
    const { orgId: userOrgId } = await requireOrg();
    const { orgId, projectId } = await params;

    // Security: verify user has access to this org
    const hasAccess = await checkOrgAccess(orgId);
    if (!hasAccess || orgId !== userOrgId) {
        redirect(`/${userOrgId}/projects`);
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold">Dashboard Analysis</h1>
            </div>

            <ProjectDashboardClient projectId={projectId} />
        </div>
    );
}
