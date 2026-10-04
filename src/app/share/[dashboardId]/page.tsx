import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { DashboardView } from '@/components/DashboardView';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SharedDashboardPage({
    params,
}: {
    params: Promise<{ dashboardId: string }>;
}) {
    const { dashboardId } = await params;
    const dashboard = await prisma.dashboard.findUnique({
        where: { id: dashboardId },
        select: {
            id: true,
            name: true,
            description: true,
            config: true,
            isPublic: true,
            project: { select: { name: true } },
        },
    });

    if (!dashboard?.isPublic || !dashboard.config) notFound();

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <header className="border-b bg-white/90 px-4 py-3 backdrop-blur dark:bg-slate-900/90">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
                    <div className="min-w-0">
                        <p className="truncate text-xs text-muted-foreground">{dashboard.project.name}</p>
                        <h1 className="truncate text-lg font-semibold">{dashboard.name}</h1>
                    </div>
                    <Link href="/" className="shrink-0 text-sm font-medium text-brand-purple hover:underline">
                        Create your own dashboard
                    </Link>
                </div>
                {dashboard.description && (
                    <p className="mx-auto mt-1 max-w-7xl truncate text-sm text-muted-foreground">{dashboard.description}</p>
                )}
            </header>
            <div className="mx-auto max-w-7xl p-3 md:p-6">
                <DashboardView config={dashboard.config as any} />
            </div>
        </main>
    );
}
