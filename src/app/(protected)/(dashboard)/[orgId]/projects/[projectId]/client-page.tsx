"use client";

import { useEffect, useState } from 'react';
import { DashboardConfig } from '@/lib/analysis-engine';
import { DashboardView } from '@/components/DashboardView';
import { ProjectFeed } from '@/components/feed/ProjectFeed';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ProjectDashboardClientProps {
    projectId: string;
}

export default function ProjectDashboardClient({ projectId }: ProjectDashboardClientProps) {
    const [config, setConfig] = useState<DashboardConfig | null>(null);
    const [feedData, setFeedData] = useState<any[] | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [dashboardRes, feedRes] = await Promise.all([
                    fetch(`/api/projects/${projectId}/dashboard`),
                    fetch(`/api/projects/${projectId}/feed`)
                ]);

                if (!dashboardRes.ok) {
                    const err = await dashboardRes.json();
                    throw new Error(err.error || 'Failed to load dashboard');
                }

                // Feed failure shouldn't block dashboard? The prompt says "fix waterfall", assuming success.
                // But let's just await both json.
                const [dashboardData, feedList] = await Promise.all([
                    dashboardRes.json(),
                    feedRes.ok ? feedRes.json() : []
                ]);

                setConfig(dashboardData);
                setFeedData(feedList);
            } catch (err: any) {
                console.error(err);
                setError(err.message || "An unexpected error occurred");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [projectId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
                <Loader2 className="h-12 w-12 text-brand-purple animate-spin" />
                <p className="text-muted-foreground animate-pulse">Generating your dashboard...</p>
                <p className="text-xs text-muted-foreground">This might take a moment for large datasets</p>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive" className="max-w-2xl mx-auto mt-8">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                    {error}
                </AlertDescription>
            </Alert>
        );
    }

    if (!config) {
        return null; // Should not happen if loading is false and no error
    }

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-65px)] overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 md:p-6">
                <DashboardView config={config} />
            </div>
            <div className="w-full lg:w-[350px] border-t lg:border-t-0 lg:border-l border-slate-200 bg-slate-50 dark:bg-slate-900 h-[300px] lg:h-full overflow-y-auto">
                <ProjectFeed projectId={projectId} initialData={feedData} />
            </div>
        </div>
    );
}
