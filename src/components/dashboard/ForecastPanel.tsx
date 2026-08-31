'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp } from 'lucide-react';

const MiniPlot = dynamic(() => import('./PlotWrapper'), { ssr: false });

interface ForecastPanelProps {
    data: any[];
    columns: string[];
}

export function ForecastPanel({ data, columns }: ForecastPanelProps) {
    const [timeCol, setTimeCol] = useState('');
    const [valueCol, setValueCol] = useState('');
    const [method, setMethod] = useState('linear_trend');
    const [horizon, setHorizon] = useState(5);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');

    const numericCols = useMemo(() =>
        columns.filter((c) => typeof data[0]?.[c] === 'number'),
        [columns, data]
    );

    const runForecast = async () => {
        if (!timeCol || !valueCol) return;
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/datasets/forecast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, timeColumn: timeCol, valueColumn: valueCol, method, horizon }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error);
            }
            const json = await res.json();
            setResult(json.forecast);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const plotData = useMemo(() => {
        if (!result) return null;
        return [
            { x: result.historical.map((h: any) => h.x), y: result.historical.map((h: any) => h.y), type: 'scatter', mode: 'lines', name: 'Historical', line: { color: '#6366f1' } },
            { x: result.forecast.map((f: any) => f.x), y: result.forecast.map((f: any) => f.y), type: 'scatter', mode: 'lines+markers', name: 'Forecast', line: { color: '#f59e0b', dash: 'dash' } },
            { x: [...result.forecast.map((f: any) => f.x), ...result.forecast.map((f: any) => f.x).reverse()],
              y: [...result.forecast.map((f: any) => f.upper || f.y), ...result.forecast.map((f: any) => f.lower || f.y).reverse()],
              type: 'scatter', fill: 'toself', fillcolor: 'rgba(245,158,11,0.1)', line: { color: 'transparent' }, name: 'Confidence', showlegend: true },
        ] as any[];
    }, [result]);

    return (
        <Card>
            <CardHeader className="pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
                <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-500 shrink-0" />
                    Forecasting
                </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                    <div>
                        <Label className="text-[10px] text-muted-foreground">Time Column</Label>
                        <Select value={timeCol} onValueChange={setTimeCol}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                                {columns.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-[10px] text-muted-foreground">Value Column</Label>
                        <Select value={valueCol} onValueChange={setValueCol}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                                {numericCols.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-[10px] text-muted-foreground">Method</Label>
                        <Select value={method} onValueChange={setMethod}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="linear_trend" className="text-xs">Linear Trend</SelectItem>
                                <SelectItem value="moving_average" className="text-xs">Moving Average</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-[10px] text-muted-foreground">Horizon</Label>
                        <Input type="number" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} className="h-8 text-xs" min={1} max={100} />
                    </div>
                </div>
                <Button size="sm" className="h-7 text-xs w-full mb-3" onClick={runForecast} disabled={loading || !timeCol || !valueCol}>
                    {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null} Generate Forecast
                </Button>
                {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
                {result && (
                    <div className="space-y-2">
                        <div className="flex gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px]">{result.method}</Badge>
                            <Badge variant="outline" className="text-[10px]">{result.metadata.dataPoints} data points</Badge>
                            {result.accuracy && (
                                <>
                                    <Badge variant="outline" className="text-[10px]">MAE: {result.accuracy.mae.toFixed(2)}</Badge>
                                    <Badge variant="outline" className="text-[10px]">MAPE: {result.accuracy.mape.toFixed(1)}%</Badge>
                                </>
                            )}
                        </div>
                        {plotData && (
                            <div className="h-[250px]">
                                <MiniPlot data={plotData} layout={{ autosize: true, margin: { t: 10, b: 40, l: 40, r: 10 }, legend: { font: { size: 10 } } }} config={{ displayModeBar: false, responsive: true }} style={{ width: '100%', height: '100%' }} />
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
