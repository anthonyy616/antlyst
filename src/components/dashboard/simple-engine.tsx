'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import dynamic from 'next/dynamic';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, X, BarChart3 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Dynamically import Plotly
const Plot = dynamic(() => import('react-plotly.js'), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center text-muted-foreground">Loading Chart Engine...</div>
});

interface SimpleEngineProps {
    analysisResult: any;
}

export default function SimpleEngine({ analysisResult }: SimpleEngineProps) {
    if (!analysisResult || !analysisResult.stats || !analysisResult.stats.preview) {
        return <div>No data available</div>;
    }

    const data = analysisResult.stats.preview;
    const columns = analysisResult.stats.columns || [];

    // Helper: Identify types
    const numericColumns = useMemo(() => columns.filter((c: string) => typeof data[0][c] === 'number'), [columns, data]);
    const stringColumns = useMemo(() => columns.filter((c: string) => typeof data[0][c] === 'string'), [columns, data]);

    // Initial Defaults
    const [xKey, setXKey] = useState<string>(stringColumns[0] || columns[0]);
    const [yKey, setYKey] = useState<string>(numericColumns[0] || columns[1]);
    const [aggType, setAggType] = useState<'sum' | 'avg' | 'min' | 'max' | 'count'>('avg');

    // Stats Selection State
    const [statKeys, setStatKeys] = useState<string[]>([]);

    // Sorting State for Data Preview
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    const sortedData = useMemo(() => {
        if (!sortConfig) return data;

        return [...data].sort((a: any, b: any) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return current.direction === 'asc'
                    ? { key, direction: 'desc' }
                    : null;
            }
            return { key, direction: 'asc' };
        });
    };

    useEffect(() => {
        // Reset or init stat keys when columns change
        if (numericColumns.length > 0) {
            if (numericColumns.includes(yKey)) {
                setStatKeys([yKey]);
            } else {
                setStatKeys([numericColumns[0]]);
            }
        }
    }, [numericColumns, yKey]);

    // Helper function to calculate stats for a single column
    const calculateStats = (key: string) => {
        const isNumeric = numericColumns.includes(key);
        const values = data.map((d: any) => d[key]);

        if (isNumeric) {
            const numericValues = values.filter((v: any) => typeof v === 'number');
            const sum = numericValues.reduce((a: number, b: number) => a + b, 0);
            const avg = sum / numericValues.length;
            const min = Math.min(...numericValues);
            const max = Math.max(...numericValues);
            return { type: 'numeric', sum, avg, min, max, count: numericValues.length };
        } else {
            const unique = new Set(values).size;
            return { type: 'categorical', count: values.length, unique };
        }
    };

    // Aggregation Logic for Charts
    const chartData = useMemo(() => {
        if (!xKey || !yKey) return [];

        const isXNumeric = typeof data[0]?.[xKey] === 'number';
        const groups: Record<string, { sum: number, count: number, min: number, max: number }> = {};

        data.forEach((row: any) => {
            const key = String(row[xKey]);
            const val = Number(row[yKey]) || 0;

            if (!groups[key]) {
                groups[key] = { sum: 0, count: 0, min: val, max: val };
            }
            groups[key].sum += val;
            groups[key].count += 1;
            groups[key].min = Math.min(groups[key].min, val);
            groups[key].max = Math.max(groups[key].max, val);
        });

        // Convert back to array
        const aggregated = Object.entries(groups).map(([name, stats]) => {
            let value = 0;
            switch (aggType) {
                case 'sum': value = stats.sum; break;
                case 'avg': value = stats.sum / stats.count; break;
                case 'min': value = stats.min; break;
                case 'max': value = stats.max; break;
                case 'count': value = stats.count; break;
            }

            return {
                x: isXNumeric ? Number(name) : name,
                y: value,
                // Extra meta for hover if needed
                count: stats.count,
                sum: stats.sum,
                avg: stats.sum / stats.count
            };
        });

        // Sort
        if (isXNumeric) {
            return aggregated.sort((a, b) => (a.x as number) - (b.x as number));
        } else {
            return aggregated.sort((a, b) => (b.y as number) - (a.y as number));
        }

    }, [data, xKey, yKey, aggType]);

    const addStatKey = (key: string) => {
        if (!statKeys.includes(key)) {
            setStatKeys([...statKeys, key]);
        }
    };

    const removeStatKey = (key: string) => {
        setStatKeys(statKeys.filter(k => k !== key));
    };

    // Format data for Plotly
    const plotlyDataBar = useMemo(() => {
        return [{
            x: chartData.map(d => d.x),
            y: chartData.map(d => d.y),
            type: 'bar',
            marker: { color: '#5e30eb' },
        }] as any;
    }, [chartData]);

    const plotlyDataLine = useMemo(() => {
        return [{
            x: chartData.map(d => d.x),
            y: chartData.map(d => d.y),
            type: 'scatter',
            mode: 'lines+markers',
            marker: { color: '#52d6fc', size: 6 },
            line: { width: 3 }
        }] as any;
    }, [chartData]);

    const commonLayout = {
        width: undefined,
        height: undefined,
        autosize: true,
        margin: { l: 50, r: 20, t: 20, b: 50 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#71717a' }, // zinc-500
        xaxis: { title: { text: xKey } },
        yaxis: { title: { text: `${aggType} of ${yKey}` } }
    };

    return (
        <div className="space-y-6">
            {/* Control Panel */}
            <Card>
                <CardHeader>
                    <CardTitle>Chart Configuration</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4 flex-wrap">
                    <div className="w-[200px]">
                        <label className="text-sm font-medium mb-1 block">X Axis (Category)</label>
                        <Select value={xKey} onValueChange={setXKey}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select X Axis" />
                            </SelectTrigger>
                            <SelectContent>
                                {columns.map((c: string) => (
                                    <SelectItem key={`x-${c}`} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-[200px]">
                        <label className="text-sm font-medium mb-1 block">Y Axis (Value)</label>
                        <Select value={yKey} onValueChange={(val) => {
                            setYKey(val);
                            if (!statKeys.includes(val) && numericColumns.includes(val)) {
                                setStatKeys(prev => [...prev, val]);
                            }
                        }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Y Axis" />
                            </SelectTrigger>
                            <SelectContent>
                                {numericColumns.map((c: string) => (
                                    <SelectItem key={`y-${c}`} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-[200px]">
                        <label className="text-sm font-medium mb-1 block">Aggregation</label>
                        <Select value={aggType} onValueChange={(val: any) => setAggType(val)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Aggregation" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="sum">Sum</SelectItem>
                                <SelectItem value="avg">Average</SelectItem>
                                <SelectItem value="min">Minimum</SelectItem>
                                <SelectItem value="max">Maximum</SelectItem>
                                <SelectItem value="count">Count</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Bar Chart ({aggType === 'avg' ? 'Average' : aggType.charAt(0).toUpperCase() + aggType.slice(1)} of {yKey} by {xKey})</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        <Plot
                            data={plotlyDataBar}
                            layout={{
                                ...commonLayout,
                                yaxis: { title: { text: `${aggType} of ${yKey}` } } // Ensure title updates
                            }}
                            config={{
                                scrollZoom: true,
                                displayModeBar: true,
                                responsive: true,
                                displaylogo: false
                            }}
                            style={{ width: '100%', height: '100%' }}
                            useResizeHandler={true}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Line Chart (Trend of {yKey} - {aggType})</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        <Plot
                            data={plotlyDataLine}
                            layout={{
                                ...commonLayout,
                                yaxis: { title: { text: `${aggType} of ${yKey}` } }
                            }}
                            config={{
                                scrollZoom: true,
                                displayModeBar: true,
                                responsive: true,
                                displaylogo: false
                            }}
                            style={{ width: '100%', height: '100%' }}
                            useResizeHandler={true}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Advanced Stats Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-brand-purple" />
                        Advanced Statistics
                    </h2>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <Plus className="w-4 h-4" />
                                Add Column Analysis
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0" align="end">
                            <div className="max-h-[300px] overflow-y-auto">
                                <div className="p-2 text-xs font-semibold text-muted-foreground bg-slate-50 border-b">
                                    Numeric Columns
                                </div>
                                {numericColumns.map((col: string) => (
                                    <button
                                        key={col}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
                                        onClick={() => addStatKey(col)}
                                        disabled={statKeys.includes(col)}
                                    >
                                        {col}
                                    </button>
                                ))}
                                <div className="p-2 text-xs font-semibold text-muted-foreground bg-slate-50 border-b border-t mt-1">
                                    Categorical Columns
                                </div>
                                {stringColumns.map((col: string) => (
                                    <button
                                        key={col}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
                                        onClick={() => addStatKey(col)}
                                        disabled={statKeys.includes(col)}
                                    >
                                        {col}
                                    </button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="grid gap-6">
                    {statKeys.map(key => {
                        const stats = calculateStats(key);
                        return (
                            <Card key={key} className="relative group">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-base font-medium">Statistics for: <span className="text-brand-purple">{key}</span></CardTitle>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => removeStatKey(key)}
                                    >
                                        <X className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        <StatBox label="Count" value={stats.count} />
                                        {stats.type === 'numeric' ? (
                                            <>
                                                <StatBox label="Sum" value={stats.sum?.toLocaleString() || '-'} />
                                                <StatBox label="Average" value={stats.avg?.toFixed(2) || '-'} />
                                                <StatBox label="Min" value={stats.min ?? '-'} />
                                                <StatBox label="Max" value={stats.max ?? '-'} />
                                            </>
                                        ) : (
                                            <>
                                                <StatBox label="Unique Values" value={stats.unique ?? '-'} />
                                                <StatBox label="Type" value="Categorical" />
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Data Preview</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto max-h-[400px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {columns.map((col: string) => (
                                        <TableHead
                                            key={col}
                                            className="cursor-pointer hover:bg-slate-50 transition-colors select-none"
                                            onClick={() => handleSort(col)}
                                        >
                                            <div className="flex items-center gap-1">
                                                {col}
                                                {sortConfig?.key === col && (
                                                    <span className="text-brand-purple">
                                                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                    </span>
                                                )}
                                                {sortConfig?.key !== col && (
                                                    <span className="text-slate-300 opacity-0 group-hover:opacity-100">↕</span>
                                                )}
                                            </div>
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedData.slice(0, 50).map((row: any, i: number) => (
                                    <TableRow key={i}>
                                        {columns.map((col: string) => (
                                            <TableCell key={`${i}-${col}`}>
                                                {row[col]}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function StatBox({ label, value }: { label: string, value: string | number }) {
    return (
        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg border dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 overflow-hidden text-ellipsis">{value}</div>
        </div>
    );
}
