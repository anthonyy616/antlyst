import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { DashboardView } from '@/components/DashboardView';

export const dynamic = 'force-dynamic';

export default async function PresentationPage({
    params,
}: {
    params: Promise<{ dashboardId: string }>;
}) {
    const { dashboardId } = await params;
    const dashboard = await prisma.dashboard.findUnique({
        where: { id: dashboardId },
        select: { name: true, config: true, isPublic: true },
    });

    if (!dashboard?.isPublic || !dashboard.config) notFound();

    return (
        <main className="min-h-screen bg-white p-3 dark:bg-slate-950 md:p-8">
            <div className="mx-auto max-w-[1600px]">
                <h1 className="mb-4 text-center text-xl font-semibold md:text-3xl">{dashboard.name}</h1>
                <DashboardView config={dashboard.config as any} />
            </div>
        </main>
    );
}
