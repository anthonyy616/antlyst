'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Cpu, Trophy } from 'lucide-react';

const MiniPlot = dynamic(() => import('./PlotWrapper'), { ssr: false });

interface AutoMLPanelProps {
    data: any[];
    columns: string[];
}

export function AutoMLPanel({ data, columns }: AutoMLPanelProps) {
    const [targetCol, setTargetCol] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');

    const runAutoML = async () => {
        if (!targetCol) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/datasets/automl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, targetColumn: targetCol }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error);
            }
            const json = await res.json();
            setResult(json.result);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const importancePlotData = useMemo(() => {
        if (!result?.bestModel?.featureImportance) return null;
        const sorted = Object.entries(result.bestModel.featureImportance)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);
        return [{
            y: sorted.map(([k]) => k),
            x: sorted.map(([, v]) => (v * 100)),
            type: 'bar',
            orientation: 'h',
            marker: { color: '#8b5cf6' },
        }] as any[];
    }, [result]);

    return (
        <Card>
            <CardHeader className="pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
                <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-violet-500 shrink-0" />
                    AutoML
                </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                <div className="flex gap-2 mb-3">
                    <Select value={targetCol} onValueChange={setTargetCol}>
                        <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Target column" /></SelectTrigger>
                        <SelectContent>
                            {columns.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button size="sm" className="h-8 text-xs" onClick={runAutoML} disabled={loading || !targetCol}>
                        {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null} Run
                    </Button>
                </div>
                {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
                {result && (
                    <div className="space-y-3">
                        <div className="flex gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] capitalize">{result.problemType}</Badge>
                            <Badge variant="outline" className="text-[10px]">{result.features.length} features</Badge>
                            <Badge variant="secondary" className="text-[10px]">
                                <Trophy className="w-2.5 h-2.5 mr-0.5" /> {result.bestModel.modelType}
                            </Badge>
                        </div>
                        <div className="space-y-1.5">
                            {result.models.map((m: any) => (
                                <div key={m.modelType} className="p-2 border rounded-lg text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium capitalize">{m.modelType.replace(/_/g, ' ')}</span>
                                        <span className="text-muted-foreground">{m.trainingTime}ms</span>
                                    </div>
                                    <div className="flex gap-2 mt-1 flex-wrap">
                                        {Object.entries(m.metrics).map(([k, v]) => (
                                            <Badge key={k} variant="outline" className="text-[9px]">
                                                {k}: {typeof v === 'number' ? v.toFixed(4) : String(v)}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {importancePlotData && (
                            <div>
                                <h4 className="text-[11px] font-semibold mb-1">Feature Importance</h4>
                                <div className="h-[200px]">
                                    <MiniPlot data={importancePlotData} layout={{ autosize: true, margin: { t: 5, b: 30, l: 100, r: 10 }, font: { size: 10 } }} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%', height: '100%' }} />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
