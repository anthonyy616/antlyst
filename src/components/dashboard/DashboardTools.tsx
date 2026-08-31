'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { DashboardManager } from './DashboardManager';
import { DashboardShareDialog } from './DashboardShareDialog';
import { DashboardComments } from './DashboardComments';
import { ActivityLogPanel } from './ActivityLogPanel';
import { AlertRulesPanel } from './AlertRulesPanel';
import { ForecastPanel } from './ForecastPanel';
import { AutoMLPanel } from './AutoMLPanel';
import { ReportGeneratorPanel } from './ReportGeneratorPanel';
import { DatasetVersionsPanel } from './DatasetVersionsPanel';
import { RefreshScheduleConfig } from './RefreshScheduleConfig';

interface DashboardToolsProps {
    projectId: string;
    orgId: string;
    data: any[];
    columns: string[];
    datasetName: string;
    stats?: any;
    insights?: any[];
    profile?: any;
    dataSourceId?: string;
}

export function DashboardTools({
    projectId,
    orgId,
    data,
    columns,
    datasetName,
    stats,
    insights,
    profile,
    dataSourceId,
}: DashboardToolsProps) {
    const [openSection, setOpenSection] = useState<string | null>(null);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);

    const toggle = (section: string) => {
        setOpenSection(openSection === section ? null : section);
    };

    const sections = [
        { id: 'dashboards', label: 'Dashboards', content: <DashboardManager projectId={projectId} orgId={orgId} /> },
        { id: 'alerts', label: 'Alert Rules', content: <AlertRulesPanel projectId={projectId} columns={columns} /> },
        { id: 'forecast', label: 'Forecasting', content: <ForecastPanel data={data} columns={columns} /> },
        { id: 'automl', label: 'AutoML', content: <AutoMLPanel data={data} columns={columns} /> },
        { id: 'report', label: 'Report Generator', content: <ReportGeneratorPanel data={data} columns={columns} datasetName={datasetName} stats={stats} insights={insights} profile={profile} /> },
        { id: 'comments', label: 'Comments', content: <DashboardComments dashboardId={projectId} projectId={projectId} /> },
        { id: 'activity', label: 'Activity Log', content: <ActivityLogPanel dashboardId={projectId} projectId={projectId} /> },
    ];

    if (dataSourceId) {
        sections.push(
            { id: 'versions', label: 'Dataset Versions', content: <DatasetVersionsPanel dataSourceId={dataSourceId} /> },
            { id: 'refresh', label: 'Refresh Schedule', content: <RefreshScheduleConfig dataSourceId={dataSourceId} /> },
        );
    }

    return (
        <div className="mt-6 border-t pt-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm sm:text-base font-bold text-gray-800 dark:text-white">
                    Analysis Tools
                </h2>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setShareDialogOpen(true)}
                >
                    Share Dashboard
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                {sections.map((section) => (
                    <div key={section.id}>
                        <button
                            onClick={() => toggle(section.id)}
                            className="w-full flex items-center justify-between px-3 py-2.5 bg-white dark:bg-slate-900 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                        >
                            <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                                {section.label}
                            </span>
                            {openSection === section.id ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                            )}
                        </button>
                        {openSection === section.id && (
                            <div className="mt-2">
                                {section.content}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <DashboardShareDialog
                open={shareDialogOpen}
                onClose={() => setShareDialogOpen(false)}
                dashboardId={projectId}
                projectId={projectId}
            />
        </div>
    );
}
