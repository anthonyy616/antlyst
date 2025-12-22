"use client";

import { useEffect, useState } from 'react';
import { DashboardConfig } from '@/lib/analysis-engine';
import { DashboardView } from '@/components/DashboardView';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ProjectDashboardClientProps {
    projectId: string;
}

export default function ProjectDashboardClient({ projectId }: ProjectDashboardClientProps) {
    const [config, setConfig] = useState<DashboardConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await fetch(`/api/projects/${projectId}/dashboard`);
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Failed to load dashboard');
                }
                const data = await res.json();
                setConfig(data);
            } catch (err: any) {
                console.error(err);
                setError(err.message || "An unexpected error occurred");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
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

    return <DashboardView config={config} />;
}
