'use client';

import { useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { ExportButton } from './ExportButton';
import { TemplateGallery } from './TemplateGallery';
import { DataConnector } from './DataConnector';
import { BarChart3, BrainCircuit, LayoutGrid, LayoutTemplate, Plug, ChevronDown, ChevronUp } from 'lucide-react';

// Dynamic imports — only load the engine the user picks
const SimpleEngine = dynamic(() => import('./simple-engine'), { ssr: false });
const MLPlotsEngine = dynamic(() => import('./MLPlotsEngine'), { ssr: false });
const PowerBIEngine = dynamic(() => import('./PowerBIEngine'), { ssr: false });

// Lazy-load analysis panels
const DataInsightsPanel = dynamic(() => import('./DataInsightsPanel'), { ssr: false });
const ChartRecommendations = dynamic(() => import('./ChartRecommendations'), { ssr: false });
const DataProfilerPanel = dynamic(() => import('./DataProfilerPanel'), { ssr: false });
const TransformPanel = dynamic(() => import('./TransformPanel'), { ssr: false });

// ── Data Analysis Panels (collapsible below engine) ──────────────────

function DataAnalysisPanels({ analysisResult, projectId }: { analysisResult: any; projectId?: string }) {
    const [showPanels, setShowPanels] = useState(false);
    const data = analysisResult?.stats?.preview || [];
    const columns = analysisResult?.stats?.columns || [];

    if (data.length === 0) return null;

    return (
        <div className="mt-4 sm:mt-6">
            <button
                onClick={() => setShowPanels(!showPanels)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    🔬 Data Analysis & Insights
                </span>
                {showPanels ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
            </button>

            {showPanels && (
                <div className="mt-3 space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <DataInsightsPanel data={data} columns={columns} />
                        <ChartRecommendations data={data} columns={columns} projectId={projectId} />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <DataProfilerPanel data={data} columns={columns} projectId={projectId} />
                        <TransformPanel data={data} columns={columns} />
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Engine Wrapper ───────────────────────────────────────────────────

interface EngineWrapperProps {
    analysisResult: any;
    projectId?: string;
}

type EngineType = 'simple' | 'ml' | 'powerbi';

export default function EngineWrapper({ analysisResult, projectId }: EngineWrapperProps) {
    const [currentEngine, setCurrentEngine] = useState<EngineType>('simple');
    const [showTemplates, setShowTemplates] = useState(false);
    const [showConnectors, setShowConnectors] = useState(false);

    const columns = analysisResult?.stats?.columns || [];
    const sampleRow = analysisResult?.stats?.preview?.[0] || {};

    const handleApplyTemplate = (template: any) => {
        setCurrentEngine('powerbi');
    };

    return (
        <div className="flex flex-col min-h-screen max-w-full overflow-x-hidden">
            {/* Engine Switcher Toolbar */}
            <div className="bg-white dark:bg-slate-900 border-b shadow-sm sticky top-0 z-10">
                <div className="p-2 sm:p-3 md:p-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-base sm:text-lg md:text-xl font-bold text-black dark:text-white mr-auto">
                            Dashboard
                        </h1>
                        <ExportButton targetId="dashboard-content" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2">
                        {[
                            { key: 'simple' as EngineType, icon: BarChart3, label: 'Simple', shortLabel: 'Bar' },
                            { key: 'ml' as EngineType, icon: BrainCircuit, label: 'ML Plots', shortLabel: 'ML' },
                            { key: 'powerbi' as EngineType, icon: LayoutGrid, label: 'Power BI', shortLabel: 'Grid' },
                        ].map(({ key, icon: Icon, label, shortLabel }) => (
                            <Button
                                key={key}
                                variant={currentEngine === key ? 'default' : 'outline'}
                                onClick={() => setCurrentEngine(key)}
                                className="gap-1 text-[11px] sm:text-xs md:text-sm shrink-0 px-2 sm:px-3 h-8"
                                size="sm"
                            >
                                <Icon size={14} />
                                <span className="hidden sm:inline">{label}</span>
                                <span className="sm:hidden">{shortLabel}</span>
                            </Button>
                        ))}

                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-[11px] sm:text-xs h-8 shrink-0"
                            onClick={() => setShowTemplates(true)}
                        >
                            <LayoutTemplate size={14} />
                            <span className="hidden md:inline">Templates</span>
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-[11px] sm:text-xs h-8 shrink-0"
                            onClick={() => setShowConnectors(true)}
                        >
                            <Plug size={14} />
                            <span className="hidden md:inline">Connect</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Engine Content */}
            <div id="dashboard-content" className="flex-1 p-0 sm:p-3 md:p-6 bg-gray-50 dark:bg-slate-950 min-w-0 w-full">
                <Suspense fallback={<div className="flex items-center justify-center p-8 text-muted-foreground">Loading engine...</div>}>
                    {currentEngine === 'simple' && <SimpleEngine analysisResult={analysisResult} />}
                    {currentEngine === 'ml' && <MLPlotsEngine analysisResult={analysisResult} />}
                    {currentEngine === 'powerbi' && <PowerBIEngine analysisResult={analysisResult} />}
                </Suspense>

                {/* Data Analysis Panels */}
                <DataAnalysisPanels analysisResult={analysisResult} projectId={projectId} />
            </div>

            {/* Template Gallery Dialog */}
            <TemplateGallery
                open={showTemplates}
                onClose={() => setShowTemplates(false)}
                columns={columns}
                sampleRow={sampleRow}
                onApplyTemplate={handleApplyTemplate}
            />

            {/* Data Connector Dialog */}
            <DataConnector
                open={showConnectors}
                onClose={() => setShowConnectors(false)}
                projectId={projectId}
                onDataSourceCreated={() => window.location.reload()}
            />
        </div>
    );
}
