'use client';

import { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, LayoutGrid, X } from 'lucide-react';

const MiniPlot = dynamic(() => import('./PlotWrapper'), { ssr: false, loading: () => <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">Loading chart...</div> });

interface ChartRecommendation {
    id: string;
    chartType: string;
    title: string;
    description: string;
    reason: string;
    confidence: number;
    xColumn?: string;
    yColumn?: string;
    category: string;
}

interface ChartRecommendationsProps {
    data: any[];
    columns: string[];
    projectId?: string;
    onApply?: (rec: ChartRecommendation) => void;
}

function buildChartData(rec: ChartRecommendation, data: any[]) {
    if (!data.length || !rec.xColumn) return null;

    try {
        switch (rec.chartType) {
            case 'bar': {
                const grouped: Record<string, number> = {};
                data.forEach(row => {
                    const key = String(row[rec.xColumn!] ?? 'Other');
                    const val = Number(row[rec.yColumn || rec.xColumn!]) || 0;
                    grouped[key] = (grouped[key] || 0) + val;
                });
                const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 15);
                return {
                    data: [{ type: 'bar', x: sorted.map(s => s[0]), y: sorted.map(s => s[1]), marker: { color: '#6366f1' } }],
                    layout: { margin: { t: 8, b: 40, l: 40, r: 8 }, height: 200, font: { size: 10 } },
                };
            }
            case 'pie': {
                const counts: Record<string, number> = {};
                data.forEach(row => {
                    const key = String(row[rec.xColumn!] ?? 'Other');
                    counts[key] = (counts[key] || 0) + 1;
                });
                const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
                return {
                    data: [{ type: 'pie', labels: sorted.map(s => s[0]), values: sorted.map(s => s[1]), hole: 0.4, textinfo: 'label+percent', textposition: 'outside' }],
                    layout: { margin: { t: 8, b: 8, l: 8, r: 8 }, height: 200, showlegend: false, font: { size: 10 } },
                };
            }
            case 'scatter': {
                if (!rec.yColumn) return null;
                const xVals: number[] = [];
                const yVals: number[] = [];
                data.forEach(row => {
                    const x = Number(row[rec.xColumn!]);
                    const y = Number(row[rec.yColumn!]);
                    if (!isNaN(x) && !isNaN(y)) { xVals.push(x); yVals.push(y); }
                });
                return {
                    data: [{ type: 'scatter', mode: 'markers', x: xVals, y: yVals, marker: { size: 4, color: '#8b5cf6', opacity: 0.6 } }],
                    layout: { margin: { t: 8, b: 40, l: 40, r: 8 }, height: 200, font: { size: 10 } },
                };
            }
            case 'line':
            case 'area': {
                if (!rec.yColumn) return null;
                const xVals: string[] = [];
                const yVals: number[] = [];
                data.forEach(row => {
                    const x = String(row[rec.xColumn!] ?? '');
                    const y = Number(row[rec.yColumn!]);
                    if (x && !isNaN(y)) { xVals.push(x); yVals.push(y); }
                });
                return {
                    data: [{ type: rec.chartType === 'area' ? 'scatter' : 'scatter', mode: 'lines', x: xVals, y: yVals, fill: rec.chartType === 'area' ? 'tozeroy' : undefined, line: { color: '#06b6d4', width: 2 } }],
                    layout: { margin: { t: 8, b: 40, l: 40, r: 8 }, height: 200, font: { size: 10 } },
                };
            }
            case 'histogram': {
                const vals = data.map(row => Number(row[rec.xColumn!])).filter(v => !isNaN(v));
                return {
                    data: [{ type: 'histogram', x: vals, marker: { color: '#f59e0b' }, nbinsx: 20 }],
                    layout: { margin: { t: 8, b: 40, l: 40, r: 8 }, height: 200, font: { size: 10 } },
                };
            }
            case 'box': {
                const vals = data.map(row => Number(row[rec.xColumn!])).filter(v => !isNaN(v));
                return {
                    data: [{ type: 'box', y: vals, marker: { color: '#ec4899' }, boxpoints: 'outliers' }],
                    layout: { margin: { t: 8, b: 8, l: 40, r: 8 }, height: 200, font: { size: 10 } },
                };
            }
            default:
                return null;
        }
    } catch {
        return null;
    }
}

export default function ChartRecommendations({ data, columns, projectId, onApply }: ChartRecommendationsProps) {
    const [recommendations, setRecommendations] = useState<ChartRecommendation[]>([]);
    const [summary, setSummary] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchRecommendations = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/datasets/recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, projectId, maxRecommendations: 8 }),
            });
            if (!res.ok) throw new Error('Failed to fetch recommendations');
            const result = await res.json();
            setRecommendations(result.recommendations || []);
            setSummary(result.summary || '');
            setFetched(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader className="pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-indigo-500 shrink-0" />
                        Chart Recommendations
                    </CardTitle>
                    {!fetched && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={fetchRecommendations}
                            disabled={loading || data.length === 0}
                        >
                            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <LayoutGrid className="h-3 w-3" />}
                            Get Suggestions
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                {loading && (
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Analyzing data structure...
                    </div>
                )}
                {error && (
                    <div className="text-sm text-red-500 py-4">{error}</div>
                )}
                {!loading && !error && !fetched && data.length > 0 && (
                    <p className="text-xs text-muted-foreground py-4">
                        Get AI-powered suggestions for the best chart types based on your data structure and column types.
                    </p>
                )}
                {!loading && fetched && recommendations.length === 0 && (
                    <p className="text-xs text-muted-foreground py-4">No recommendations available for this dataset.</p>
                )}
                {fetched && recommendations.length > 0 && (
                    <div className="space-y-2">
                        {summary && (
                            <p className="text-xs text-muted-foreground bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                                {summary}
                            </p>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {recommendations.map((rec) => {
                                const isExpanded = expandedId === rec.id;
                                const chartData = useMemo(() => {
                                    if (isExpanded) return buildChartData(rec, data);
                                    return null;
                                }, [isExpanded, rec, data]);

                                return (
                                    <div key={rec.id} className="border rounded-lg overflow-hidden">
                                        <div
                                            className="p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                            onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                                <span className="text-xs sm:text-sm font-medium truncate">{rec.title}</span>
                                                <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                                                    {rec.chartType}
                                                </Badge>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground mb-2 line-clamp-2">{rec.description}</p>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <Badge variant="secondary" className="text-[10px]">
                                                    {rec.category}
                                                </Badge>
                                                <Badge variant="outline" className="text-[10px]">
                                                    {Math.round(rec.confidence * 100)}% match
                                                </Badge>
                                                {rec.xColumn && (
                                                    <Badge variant="outline" className="text-[10px] font-mono">
                                                        {rec.xColumn}{rec.yColumn ? ` x ${rec.yColumn}` : ''}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        {isExpanded && (
                                            <div className="border-t bg-slate-50 dark:bg-slate-900 p-3">
                                                {chartData ? (
                                                    <MiniPlot
                                                        data={chartData.data}
                                                        layout={{ ...chartData.layout, autosize: true }}
                                                        config={{ displayModeBar: false, responsive: true }}
                                                        style={{ width: '100%', height: 200 }}
                                                    />
                                                ) : (
                                                    <div className="h-[120px] flex items-center justify-center text-xs text-muted-foreground">
                                                        Preview not available for this chart type
                                                    </div>
                                                )}
                                                <div className="flex gap-2 mt-2">
                                                    <Button
                                                        variant="default"
                                                        size="sm"
                                                        className="h-7 text-xs flex-1"
                                                        onClick={(e) => { e.stopPropagation(); onApply?.(rec); }}
                                                    >
                                                        Apply This Chart
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-xs"
                                                        onClick={(e) => { e.stopPropagation(); setExpandedId(null); }}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
