'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, TrendingUp, AlertTriangle, BarChart3, GitBranch, Activity, Lightbulb } from 'lucide-react';

interface Insight {
    id: string;
    type: string;
    severity: string;
    confidence: number;
    title: string;
    finding: string;
    evidence: string;
    relevantColumns: string[];
    suggestedVisualization?: string;
}

interface DataInsightsPanelProps {
    data: any[];
    columns: string[];
}

const SEVERITY_CONFIG: Record<string, { color: string; icon: typeof TrendingUp }> = {
    high: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle },
    medium: { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Activity },
    low: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Lightbulb },
};

const TYPE_ICONS: Record<string, typeof TrendingUp> = {
    trend: TrendingUp,
    outlier: AlertTriangle,
    correlation: GitBranch,
    distribution: BarChart3,
    group_difference: Activity,
    summary: Lightbulb,
};

export default function DataInsightsPanel({ data, columns }: DataInsightsPanelProps) {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [summary, setSummary] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchInsights = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/datasets/insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rows: data, maxInsights: 10 }),
            });
            if (!res.ok) throw new Error('Failed to fetch insights');
            const result = await res.json();
            setInsights(result.insights || []);
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
                        <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
                        Automated Insights
                    </CardTitle>
                    {!fetched && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={fetchInsights}
                            disabled={loading || data.length === 0}
                        >
                            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                            Detect
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                {loading && (
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Analyzing dataset...
                    </div>
                )}
                {error && (
                    <div className="text-sm text-red-500 py-4">{error}</div>
                )}
                {!loading && !error && !fetched && data.length > 0 && (
                    <p className="text-xs text-muted-foreground py-4">
                        Click &quot;Detect&quot; to automatically find trends, outliers, correlations, and other patterns in your data.
                    </p>
                )}
                {!loading && fetched && insights.length === 0 && (
                    <p className="text-xs text-muted-foreground py-4">No significant insights detected.</p>
                )}
                {fetched && insights.length > 0 && (
                    <div className="space-y-2 sm:space-y-3">
                        {summary && (
                            <p className="text-xs text-muted-foreground bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                                {summary}
                            </p>
                        )}
                        {insights.map((insight) => {
                            const sev = SEVERITY_CONFIG[insight.severity] || SEVERITY_CONFIG.low;
                            const TypeIcon = TYPE_ICONS[insight.type] || Lightbulb;
                            return (
                                <div
                                    key={insight.id}
                                    className="border rounded-lg p-2.5 sm:p-3 space-y-1.5 sm:space-y-2 hover:shadow-sm transition-shadow"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <TypeIcon className="w-4 h-4 shrink-0 text-slate-500" />
                                            <span className="text-xs sm:text-sm font-medium truncate">{insight.title}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <Badge variant="outline" className={`text-[10px] ${sev.color}`}>
                                                {insight.severity}
                                            </Badge>
                                            <Badge variant="secondary" className="text-[10px]">
                                                {Math.round(insight.confidence * 100)}%
                                            </Badge>
                                        </div>
                                    </div>
                                    <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400">{insight.finding}</p>
                                    <p className="text-[10px] text-muted-foreground">{insight.evidence}</p>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {insight.relevantColumns.map((col) => (
                                            <Badge key={col} variant="outline" className="text-[10px] font-mono">
                                                {col}
                                            </Badge>
                                        ))}
                                        {insight.suggestedVisualization && (
                                            <Badge variant="secondary" className="text-[10px]">
                                                Try: {insight.suggestedVisualization}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
