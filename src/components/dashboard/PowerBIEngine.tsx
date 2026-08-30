'use client';

import { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pencil, Maximize2, Minimize2 } from 'lucide-react';

import { KPICard } from './widgets/KPICard';
import { PieChartWidget } from './widgets/PieChartWidget';
import { TrendChart } from './widgets/TrendChart';
import { DataTable } from './widgets/DataTable';
import { ChartExportButton } from './widgets/ChartExportButton';
import { ChartEditor } from './ChartEditor';
import { FilterBar } from './FilterBar';
import { FilterProvider, useFilters } from '@/context/FilterContext';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface PowerBIEngineProps {
    analysisResult: any;
}

function PowerBIEngineInner({ analysisResult }: PowerBIEngineProps) {
    const [mounted, setMounted] = useState(false);
    const [charts, setCharts] = useState<any[]>([]);
    const [editingChart, setEditingChart] = useState<any | null>(null);
    const [expandedChart, setExpandedChart] = useState<string | null>(null);
    const { applyFilters } = useFilters();

    useEffect(() => {
        setMounted(true);
        if (analysisResult?.charts) {
            setCharts(analysisResult.charts);
        }
    }, [analysisResult]);

    // ALL hooks must be called unconditionally — before any early returns
    const { stats, kpis } = analysisResult || {};
    const rawData = stats?.preview || [];
    const columns = stats?.columns || [];
    const columnMeta = stats?.columnMeta || {};

    // Apply global filters to data
    const filteredData = useMemo(() => applyFilters(rawData), [rawData, applyFilters]);

    // Recalculate KPIs based on filtered data
    const filteredKPIs = useMemo(() => {
        if (!kpis) return [];

        // Recalculate numeric KPIs
        const numericCols = columns.filter((c: string) => typeof rawData[0]?.[c] === 'number');
        const validNumericCols = numericCols.filter((col: string) => {
            const uniqueValues = new Set(rawData.map((r: any) => r[col])).size;
            return uniqueValues < rawData.length * 0.95;
        });

        const newKPIs = [
            { label: "Filtered Rows", value: filteredData.length.toLocaleString(), change: filteredData.length !== rawData.length ? `${((filteredData.length / rawData.length) * 100).toFixed(1)}%` : undefined },
            { label: "Total Columns", value: columns.length.toLocaleString() },
        ];

        if (validNumericCols.length > 0) {
            const col = validNumericCols[0];
            const sum = filteredData.reduce((acc: number, row: any) => acc + (Number(row[col]) || 0), 0);
            const avg = filteredData.length > 0 ? sum / filteredData.length : 0;
            newKPIs.push({ label: `Sum of ${col}`, value: sum.toLocaleString(undefined, { maximumFractionDigits: 0 }) });
            newKPIs.push({ label: `Avg of ${col}`, value: avg.toLocaleString(undefined, { maximumFractionDigits: 2 }) });
        }

        return newKPIs;
    }, [filteredData, rawData, kpis, columns]);

    // Construct Grid Layout - responsive for mobile
    const layouts = useMemo(() => {
        if (!charts) return { lg: [], md: [], sm: [], xs: [] };

        const lg = charts.map((chart: any) => ({
            i: chart.id,
            x: chart.gridPos?.x || 0,
            y: chart.gridPos?.y || 0,
            w: chart.gridPos?.w || 6,
            h: chart.gridPos?.h || 6,
            minW: 3,
            minH: 3,
        }));

        // Mobile: stack everything single-column
        const sm = charts.map((chart: any, idx: number) => ({
            i: chart.id,
            x: 0,
            y: idx * 6,
            w: 6,
            h: 6,
            minW: 3,
            minH: 3,
        }));

        const xs = charts.map((chart: any, idx: number) => ({
            i: chart.id,
            x: 0,
            y: idx * 4,
            w: 4,
            h: 4,
            minW: 2,
            minH: 3,
        }));

        return { lg, md: lg, sm, xs };
    }, [charts]);

    if (!analysisResult || !analysisResult.stats || !analysisResult.stats.preview) {
        return <div className="p-8 text-center text-muted-foreground">No data available for Power BI Engine</div>;
    }

    const handleChartUpdate = (newChartConfig: any) => {
        setCharts(prev => prev.map(c => c.id === newChartConfig.id ? newChartConfig : c));
        setEditingChart(null);
    };

    // Helper to render widget based on type (with filtered data)
    const renderWidget = (chart: any) => {
        const { id, type, title, layout: chartLayout } = chart;

        // Determine click-to-filter column (categorical columns)
        const catCol = chartLayout?.xKey || columns.find((c: string) => typeof filteredData[0]?.[c] === 'string');

        const handleBarClick = (event: any) => {
            if (event?.points?.[0] && catCol) {
                const clickedValue = String(event.points[0].x || event.points[0].label);
                // Dispatch a custom event that FilterBar can listen to
                window.dispatchEvent(new CustomEvent('chart-filter', {
                    detail: { column: catCol, value: clickedValue }
                }));
            }
        };

        const handlePieClick = (event: any) => {
            if (event?.points?.[0] && catCol) {
                const clickedValue = String(event.points[0].label);
                window.dispatchEvent(new CustomEvent('chart-filter', {
                    detail: { column: catCol, value: clickedValue }
                }));
            }
        };

        let widget;

        switch (type) {
            case 'pie':
                widget = (
                    <div id={`chart-${id}`} className="w-full h-full">
                        <PieChartWidget
                            title={title}
                            data={filteredData}
                            categoryColumn={catCol || columns[0]}
                            onClick={handlePieClick}
                        />
                    </div>
                );
                break;
            case 'bar':
            case 'line':
            case 'area':
            case 'scatter':
                let xKey = chartLayout.xaxis?.title?.text || chartLayout.xKey;
                let yKey = chartLayout.yaxis?.title?.text || chartLayout.yKey;

                if (!xKey) xKey = columns.find((c: string) => typeof filteredData[0]?.[c] === 'string') || columns[0];
                if (!yKey) yKey = columns.find((c: string) => typeof filteredData[0]?.[c] === 'number') || columns[1];

                if (type === 'scatter' && !xKey) {
                    xKey = columns.find((c: string) => typeof filteredData[0]?.[c] === 'number' && c !== yKey) || columns[0];
                }

                widget = (
                    <div id={`chart-${id}`} className="w-full h-full">
                        <TrendChart
                            title={title}
                            data={filteredData}
                            xKey={xKey}
                            yKey={yKey}
                            type={type}
                            color={chartLayout?.marker?.color}
                            onClick={type === 'bar' ? handleBarClick : undefined}
                        />
                    </div>
                );
                break;
            case 'heatmap':
            case 'table':
                widget = (
                    <div id={`chart-${id}`} className="w-full h-full">
                        <DataTable
                            title={title}
                            data={filteredData}
                            columns={columns}
                            columnMeta={columnMeta}
                        />
                    </div>
                );
                break;
            default:
                widget = (
                    <div className="flex items-center justify-center h-full bg-slate-100 dark:bg-slate-800 rounded text-muted-foreground p-4">
                        Unknown Widget Type: {type}
                    </div>
                );
        }

        const isExpanded = expandedChart === id;

        return (
            <div className={`relative w-full h-full group/widget ${isExpanded ? 'z-50' : ''}`}>
                {/* Widget Toolbar */}
                <div className="absolute top-1 right-1 z-30 flex items-center gap-1 opacity-0 group-hover/widget:opacity-100 transition-opacity">
                    <ChartExportButton chartId={id} chartTitle={title} />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setExpandedChart(isExpanded ? null : id)}
                    >
                        {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditingChart(chart)}
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                </div>
                {widget}
            </div>
        );
    };

    if (!mounted) return <div className="p-8">Loading Dashboard Engine...</div>;

    return (
        <div className="bg-[#f3f4f6] dark:bg-slate-950 min-h-screen">
            {/* Filter Bar */}
            <FilterBar columns={columns} data={rawData} />

            <div className="p-3 md:p-4">
                {/* KPI Section */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
                    {(filteredKPIs.length > 0 ? filteredKPIs : kpis || []).map((kpi: any, idx: number) => (
                        <div key={idx} className="h-20 md:h-24">
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
                            margin={[12, 12]}
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

export default function PowerBIEngine({ analysisResult }: PowerBIEngineProps) {
    return (
        <FilterProvider>
            <PowerBIEngineInner analysisResult={analysisResult} />
        </FilterProvider>
    );
}
