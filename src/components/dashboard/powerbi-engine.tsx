'use client';

import { useMemo } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { KPICard } from './widgets/KPICard';
import { PieChartWidget } from './widgets/PieChartWidget';
import { TrendChart } from './widgets/TrendChart';
import { DataTable } from './widgets/DataTable';
import { Card, CardContent } from '@/components/ui/card';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface PowerBIEngineProps {
    analysisResult: any;
}

export default function PowerBIEngine({ analysisResult }: PowerBIEngineProps) {
    if (!analysisResult || !analysisResult.stats || !analysisResult.stats.preview) {
        return <div className="p-8 text-center text-muted-foreground">No data available for Power BI Engine</div>;
    }

    const { stats, kpis, charts } = analysisResult;
    const data = stats.preview;
    const columns = stats.columns || [];

    // Parse specific x/y keys from layout or heuristics
    // The analysis engine now populates 'charts' with specific types and gridPos

    // Construct Grid Layout
    const layouts = useMemo(() => {
        if (!charts) return { lg: [] };

        const lg = charts.map((chart: any) => ({
            i: chart.id,
            x: chart.gridPos?.x || 0,
            y: chart.gridPos?.y || 0,
            w: chart.gridPos?.w || 6,
            h: chart.gridPos?.h || 6,
            minW: 3,
            minH: 3
        }));
        return { lg };
    }, [charts]);

    // Helper to render widget based on type
    const renderWidget = (chart: any) => {
        const { id, type, title, layout } = chart;

        switch (type) {
            case 'pie':
                // Find categorical column if not in layout
                const catCol = columns.find((c: string) => typeof data[0][c] === 'string') || columns[0];
                return (
                    <PieChartWidget
                        title={title}
                        data={data}
                        categoryColumn={catCol}
                    />
                );
            case 'bar':
            case 'line':
            case 'area':
            case 'scatter':
                // Use layout keys or heuristics
                let xKey = layout.xaxis?.title?.text || layout.xKey;
                let yKey = layout.yaxis?.title?.text || layout.yKey;

                // Fallback if keys are missing (heuristic)
                if (!xKey) xKey = columns.find((c: string) => typeof data[0][c] === 'string') || columns[0];
                if (!yKey) yKey = columns.find((c: string) => typeof data[0][c] === 'number') || columns[1];

                return (
                    <TrendChart
                        title={title}
                        data={data}
                        xKey={xKey}
                        yKey={yKey}
                        type={type === 'scatter' ? 'line' : type} // Map scatter to line for now or handle in TrendChart
                    />
                );
            case 'heatmap': // Using 'heatmap' as Table placeholder per analysis-engine
            case 'table':
                return (
                    <DataTable
                        title={title}
                        data={data}
                        columns={columns}
                    />
                );
            default:
                return (
                    <div className="flex items-center justify-center h-full bg-slate-100 rounded text-muted-foreground">
                        Unknown Widget Type: {type}
                    </div>
                );
        }
    };

    return (
        <div className="bg-[#f3f4f6] dark:bg-slate-950 min-h-screen p-4">

            {/* KPI Section (Static Grid) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {kpis?.map((kpi: any, idx: number) => (
                    <div key={idx} className="h-24">
                        <KPICard
                            title={kpi.label}
                            value={kpi.value}
                            change={kpi.change}
                            trend={kpi.change?.includes('+') ? 'up' : kpi.change?.includes('-') ? 'down' : 'neutral'}
                        />
                    </div>
                ))}
            </div>

            {/* Draggable Dashboard Area */}
            <div className="bg-transparent">
                {charts && charts.length > 0 ? (
                    <ResponsiveGridLayout
                        className="layout"
                        layouts={layouts}
                        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                        rowHeight={50}
                        draggableHandle=".drag-handle"
                        margin={[16, 16]}
                    >
                        {charts.map((chart: any) => (
                            <div key={chart.id} className="relative group bg-white dark:bg-slate-900 rounded-lg shadow-sm border overflow-hidden">
                                {/* Drag Handle */}
                                <div className="drag-handle absolute top-0 left-0 right-0 h-6 cursor-move z-20 hover:bg-slate-100/50 transition-colors" title="Drag to move" />

                                <div className="h-full pt-4 pb-2 px-2">
                                    {renderWidget(chart)}
                                </div>
                            </div>
                        ))}
                    </ResponsiveGridLayout>
                ) : (
                    <div className="text-center py-20">
                        <p className="text-muted-foreground">No charts configured.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
