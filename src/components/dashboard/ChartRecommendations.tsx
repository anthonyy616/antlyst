'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, PieChart, BarChart3, TrendingUp, GitBranch, LayoutGrid, Table2 } from 'lucide-react';

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

const CHART_ICONS: Record<string, typeof BarChart3> = {
    bar: BarChart3,
    line: TrendingUp,
    scatter: GitBranch,
    pie: PieChart,
    histogram: BarChart3,
    area: TrendingUp,
    heatmap: LayoutGrid,
    box: BarChart3,
    treemap: LayoutGrid,
    table: Table2,
};

const CATEGORY_COLORS: Record<string, string> = {
    distribution: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    comparison: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    trend: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    relationship: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    composition: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
};

export default function ChartRecommendations({ data, columns, projectId, onApply }: ChartRecommendationsProps) {
    const [recommendations, setRecommendations] = useState<ChartRecommendation[]>([]);
    const [summary, setSummary] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            <CardHeader className="pb-2 px-4 pt-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-indigo-500" />
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
            <CardContent className="px-4 pb-4">
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
                                const ChartIcon = CHART_ICONS[rec.chartType] || BarChart3;
                                const catColor = CATEGORY_COLORS[rec.category] || 'bg-slate-100 text-slate-700';
                                return (
                                    <div
                                        key={rec.id}
                                        className="border rounded-lg p-3 hover:shadow-sm transition-shadow cursor-pointer group"
                                        onClick={() => onApply?.(rec)}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <ChartIcon className="w-4 h-4 text-slate-500" />
                                                <span className="text-sm font-medium truncate">{rec.title}</span>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                                                {rec.chartType}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{rec.description}</p>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <Badge variant="secondary" className={`text-[10px] ${catColor}`}>
                                                {rec.category}
                                            </Badge>
                                            <Badge variant="outline" className="text-[10px]">
                                                {Math.round(rec.confidence * 100)}% match
                                            </Badge>
                                            {rec.xColumn && (
                                                <Badge variant="outline" className="text-[10px] font-mono">
                                                    {rec.xColumn}{rec.yColumn ? ` × ${rec.yColumn}` : ''}
                                                </Badge>
                                            )}
                                        </div>
                                        {onApply && (
                                            <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="default" size="sm" className="h-6 text-[10px] w-full">
                                                    Apply This Chart
                                                </Button>
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
