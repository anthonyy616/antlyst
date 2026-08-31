'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, History } from 'lucide-react';

interface Activity {
    id: string;
    action: string;
    details: any;
    createdAt: string;
    user: { id: string; name: string; email: string };
}

const ACTION_COLORS: Record<string, string> = {
    created: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    updated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    shared: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    commented: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    deleted: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

interface ActivityLogPanelProps {
    dashboardId: string;
    projectId: string;
}

export function ActivityLogPanel({ dashboardId, projectId }: ActivityLogPanelProps) {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchActivity();
    }, [dashboardId]);

    const fetchActivity = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/dashboards/${dashboardId}/activity?limit=20`);
            if (res.ok) {
                const data = await res.json();
                setActivities(data.activities || []);
            }
        } catch (err) {
            console.error('Failed to fetch activity:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader className="pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
                <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                    <History className="w-4 h-4 text-amber-500 shrink-0" />
                    Activity Log
                </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                {loading ? (
                    <div className="flex items-center justify-center py-4 text-muted-foreground text-xs">
                        <Loader2 className="h-3 w-3 animate-spin mr-2" /> Loading...
                    </div>
                ) : activities.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">No activity yet.</p>
                ) : (
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                        {activities.map((a) => (
                            <div key={a.id} className="flex items-start gap-2 text-xs p-2 border rounded-lg">
                                <Badge variant="outline" className={`text-[9px] shrink-0 capitalize ${ACTION_COLORS[a.action] || ''}`}>
                                    {a.action}
                                </Badge>
                                <div className="min-w-0 flex-1">
                                    <span className="font-medium">{a.user.name || a.user.email}</span>
                                    <span className="text-muted-foreground ml-1">{a.action} this dashboard</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground shrink-0">
                                    {new Date(a.createdAt).toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
