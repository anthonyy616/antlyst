'use client';

import { useMemo, useState, useEffect } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';

import { KPICard } from './widgets/KPICard';
import { PieChartWidget } from './widgets/PieChartWidget';
import { TrendChart } from './widgets/TrendChart';
import { DataTable } from './widgets/DataTable';
import { ChartEditor } from './ChartEditor';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface PowerBIEngineProps {
    analysisResult: any;
}

export default function PowerBIEngine({ analysisResult }: PowerBIEngineProps) {
    const [mounted, setMounted] = useState(false);
    const [charts, setCharts] = useState<any[]>([]);
    const [editingChart, setEditingChart] = useState<any | null>(null);

    useEffect(() => {
        setMounted(true);
        if (analysisResult?.charts) {
            setCharts(analysisResult.charts);
        }
    }, [analysisResult]);

    if (!analysisResult || !analysisResult.stats || !analysisResult.stats.preview) {
        return <div className="p-8 text-center text-muted-foreground">No data available for Power BI Engine</div>;
    }

    const { stats, kpis } = analysisResult;
    // const { charts } = analysisResult; // Now using local state
    const data = stats.preview;
    const columns = stats.columns || [];

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

    const handleChartUpdate = (newChartConfig: any) => {
        setCharts(prev => prev.map(c => c.id === newChartConfig.id ? newChartConfig : c));
        setEditingChart(null);
    };

    // Helper to render widget based on type
    const renderWidget = (chart: any) => {
        const { id, type, title, layout } = chart;
        let widget;

        switch (type) {
            case 'pie':
                // Find categorical column if not in layout
                const catCol = layout?.xKey || columns.find((c: string) => typeof data[0][c] === 'string') || columns[0];
                widget = (
                    <PieChartWidget
                        title={title}
                        data={data}
                        categoryColumn={catCol}
                    />
                );
                break;
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

                // For scatter, x might be numeric
                if (type === 'scatter' && !xKey) {
                    xKey = columns.find((c: string) => typeof data[0][c] === 'number' && c !== yKey) || columns[0];
                }

                widget = (
                    <TrendChart
                        title={title}
                        data={data}
                        xKey={xKey}
                        yKey={yKey}
                        type={type}
                        color={layout?.marker?.color}
                    />
                );
                break;
            case 'heatmap': // Using 'heatmap' as Table placeholder per analysis-engine for now
            case 'table':
                widget = (
                    <DataTable
                        title={title}
                        data={data}
                        columns={columns}
                    />
                );
                break;
            default:
                widget = (
                    <div className="flex items-center justify-center h-full bg-slate-100 dark:bg-slate-800 rounded text-muted-foreground p-4">
                        Unknown Widget Type: {type}
                    </div>
                );
        }

        return (
            <div className="relative w-full h-full group/widget">
                <div className="absolute top-2 right-2 z-30 opacity-0 group-hover/widget:opacity-100 transition-opacity">
                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setEditingChart(chart)}>
                        <Pencil className="h-3 w-3" />
                    </Button>
                </div>
                {widget}
            </div>
        );
    };

    if (!mounted) return <div className="p-8">Loading Dashboard Engine...</div>;

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
                        isDraggable={true}
                        isResizable={true}
                    >
                        {charts.map((chart: any) => (
                            <div key={chart.id} className="relative group bg-white dark:bg-slate-900 rounded-lg shadow-sm border overflow-hidden flex flex-col">
                                {/* Drag Handle */}
                                <div className="drag-handle absolute top-0 left-0 right-0 h-6 cursor-move z-20 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors" title="Drag to move" />

                                <div className="flex-1 h-full min-h-0 pt-4 pb-2 px-2">
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

            {/* Chart Editor Dialog */}
            {editingChart && (
                <ChartEditor
                    open={!!editingChart}
                    onClose={() => setEditingChart(null)}
                    chartConfig={editingChart}
                    onSave={handleChartUpdate}
                    columns={columns}
                />
            )}
        </div>
    );
}
