'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Shield, AlertTriangle, CheckCircle, Info, BarChart3 } from 'lucide-react';

interface DataProfilerPanelProps {
    data: any[];
    columns: string[];
    projectId?: string;
}

const SEVERITY_ICONS: Record<string, typeof CheckCircle> = {
    critical: AlertTriangle,
    warning: Info,
    info: CheckCircle,
};

const SEVERITY_COLORS: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

export default function DataProfilerPanel({ data, columns, projectId }: DataProfilerPanelProps) {
    const [profile, setProfile] = useState<any>(null);
    const [summary, setSummary] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProfile = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/datasets/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, projectId, datasetName: 'Current Dataset' }),
            });
            if (!res.ok) throw new Error('Failed to profile dataset');
            const result = await res.json();
            setProfile(result.profile);
            setSummary(result.summary || '');
            setFetched(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const qualityScore = profile?.quality?.overallScore ?? 0;

    return (
        <Card>
            <CardHeader className="pb-2 px-4 pt-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-500" />
                        Data Quality Profile
                    </CardTitle>
                    {!fetched && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={fetchProfile}
                            disabled={loading || data.length === 0}
                        >
                            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
                            Profile Data
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
                {loading && (
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Profiling dataset...
                    </div>
                )}
                {error && (
                    <div className="text-sm text-red-500 py-4">{error}</div>
                )}
                {!loading && !error && !fetched && data.length > 0 && (
                    <p className="text-xs text-muted-foreground py-4">
                        Run a full data profile to get quality scores, column statistics, and data quality issues.
                    </p>
                )}
                {fetched && profile && (
                    <div className="space-y-4">
                        {/* Quality Score */}
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium">Quality Score</span>
                                <span className={`text-lg font-bold ${qualityScore >= 80 ? 'text-green-600' : qualityScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {qualityScore}/100
                                </span>
                            </div>
                            <Progress value={qualityScore} className="h-2" />
                            {profile.quality?.summary && (
                                <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                                    <span>✅ {profile.quality.summary.passed} passed</span>
                                    <span>⚠️ {profile.quality.summary.warnings} warnings</span>
                                    <span>🚨 {profile.quality.summary.critical} critical</span>
                                </div>
                            )}
                        </div>

                        {/* Dataset Overview */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2 text-center">
                                <div className="text-lg font-bold">{profile.totalRows?.toLocaleString()}</div>
                                <div className="text-[10px] text-muted-foreground">Rows</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2 text-center">
                                <div className="text-lg font-bold">{profile.totalColumns}</div>
                                <div className="text-[10px] text-muted-foreground">Columns</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2 text-center">
                                <div className="text-lg font-bold">{profile.columns?.filter((c: any) => c.detectedType === 'numeric').length}</div>
                                <div className="text-[10px] text-muted-foreground">Numeric</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2 text-center">
                                <div className="text-lg font-bold">{profile.columns?.filter((c: any) => c.detectedType === 'categorical').length}</div>
                                <div className="text-[10px] text-muted-foreground">Categorical</div>
                            </div>
                        </div>

                        {/* Column Details */}
                        <div>
                            <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                                <BarChart3 className="w-3 h-3" /> Column Details
                            </h4>
                            <ScrollArea className="max-h-[300px]">
                                <div className="space-y-1.5">
                                    {profile.columns?.map((col: any) => (
                                        <div key={col.name} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800 rounded px-3 py-1.5">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Badge variant="outline" className="text-[9px] shrink-0 capitalize">
                                                    {col.detectedType}
                                                </Badge>
                                                <span className="font-mono truncate">{col.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 text-muted-foreground">
                                                {col.missingPercentage > 0 && (
                                                    <span className="text-yellow-500">{col.missingPercentage.toFixed(1)}% missing</span>
                                                )}
                                                <span>{col.uniqueCount} unique</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Quality Issues */}
                        {profile.quality?.issues?.length > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Quality Issues ({profile.quality.issues.length})
                                </h4>
                                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                                    {profile.quality.issues.map((issue: any, idx: number) => {
                                        const IssueIcon = SEVERITY_ICONS[issue.severity] || Info;
                                        return (
                                            <div key={idx} className="flex items-start gap-2 text-xs p-2 bg-slate-50 dark:bg-slate-800 rounded">
                                                <IssueIcon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${SEVERITY_COLORS[issue.severity] || ''}`} />
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-medium">{issue.title}</span>
                                                        <Badge variant="outline" className={`text-[9px] ${SEVERITY_COLORS[issue.severity] || ''}`}>
                                                            {issue.severity}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-muted-foreground mt-0.5">{issue.description}</p>
                                                    {issue.suggestion && (
                                                        <p className="text-muted-foreground mt-0.5 italic">💡 {issue.suggestion}</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
