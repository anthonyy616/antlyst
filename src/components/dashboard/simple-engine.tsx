'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import dynamic from 'next/dynamic';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, X, BarChart3 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { GroupedColumnSelect, ColumnTypeBadge } from "./widgets/ColumnComponents";
import { ColumnMeta } from "@/lib/column-validator";

// Dynamically import Plotly
const Plot = dynamic(() => import('react-plotly.js'), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">Loading charts...</div>
});

interface SimpleEngineProps {
    analysisResult: any;
}

export default function SimpleEngine({ analysisResult }: SimpleEngineProps) {
    if (!analysisResult || !analysisResult.stats || !analysisResult.stats.preview) {
        return <div className="p-4 text-muted-foreground">No data available</div>;
    }

    const data = analysisResult.stats.preview;
    const columns = analysisResult.stats.columns || [];
    const columnMeta: Record<string, ColumnMeta> = analysisResult.stats.columnMeta || {};

    // Use columnMeta for column grouping, with fallback to typeof
    const numericColumns = useMemo(
        () => columns.filter((c: string) => columnMeta[c]?.type === 'numeric' || (!columnMeta[c] && typeof data[0]?.[c] === 'number')),
        [columns, data, columnMeta]
    );
    const stringColumns = useMemo(
        () => columns.filter((c: string) => columnMeta[c]?.type === 'categorical' || columnMeta[c]?.type === 'id' || (!columnMeta[c] && typeof data[0]?.[c] === 'string')),
        [columns, data, columnMeta]
    );

    // Initial Defaults — auto-select best columns from columnMeta
    const bestX = useMemo(() => {
        if (columnMeta && Object.keys(columnMeta).length > 0) {
            return columns.find((col: string) => columnMeta[col]?.type === 'categorical' && (columnMeta[col]?.uniqueCount || 0) <= 20)
                || columns.find((col: string) => columnMeta[col]?.type === 'categorical')
                || stringColumns[0] || columns[0];
        }
        return stringColumns[0] || columns[0];
    }, [columns, columnMeta, stringColumns]);

    const bestY = useMemo(() => {
        if (columnMeta && Object.keys(columnMeta).length > 0) {
            return columns.find((col: string) => columnMeta[col]?.type === 'numeric') || numericColumns[0] || columns[1];
        }
        return numericColumns[0] || columns[1];
    }, [columns, columnMeta, numericColumns]);

    const [xKey, setXKey] = useState<string>(bestX);
    const [yKey, setYKey] = useState<string>(bestY);
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
        if (numericColumns.length > 0) {
            if (numericColumns.includes(yKey)) {
                setStatKeys([yKey]);
            } else {
                setStatKeys([numericColumns[0]]);
            }
        }
    }, [numericColumns, yKey]);

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
                count: stats.count,
                sum: stats.sum,
                avg: stats.sum / stats.count
            };
        });

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
            marker: { color: '#52d6fc', size: 4 },
            line: { width: 2 }
        }] as any;
    }, [chartData]);

    const plotlyDataArea = useMemo(() => {
        return [{
            x: chartData.map(d => d.x),
            y: chartData.map(d => d.y),
            type: 'scatter',
            fill: 'tozeroy',
            fillcolor: 'rgba(94, 48, 235, 0.15)',
            mode: 'lines',
            line: { color: '#5e30eb', width: 2 }
        }] as any;
    }, [chartData]);

    // Short label for aggregation
    const aggLabel = aggType === 'avg' ? 'Avg' : aggType.charAt(0).toUpperCase() + aggType.slice(1);

    const commonLayout = {
        autosize: true,
        margin: { l: 35, r: 5, t: 5, b: 55 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#71717a', size: 9 },
        xaxis: {
            tickangle: -45,
            tickfont: { size: 8 },
            automargin: true as const,
        },
        yaxis: {
            tickfont: { size: 8 },
            automargin: true as const,
        }
    };

    return (
        <div className="space-y-3 sm:space-y-4 md:space-y-6 w-full min-w-0">

            {/* Control Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 p-2 sm:p-3 md:p-4 bg-white dark:bg-slate-900 rounded-lg border shadow-sm">
                <div className="space-y-1 sm:space-y-1.5">
                    <Label className="text-xs sm:text-sm">X Axis</Label>
                    <GroupedColumnSelect
                        columns={columns}
                        columnMeta={columnMeta}
                        value={xKey}
                        onChange={setXKey}
                        className="h-9 sm:h-10"
                    />
                </div>
                <div className="space-y-1 sm:space-y-1.5">
                    <Label className="text-xs sm:text-sm">Y Axis</Label>
                    <GroupedColumnSelect
                        columns={columns}
                        columnMeta={columnMeta}
                        value={yKey}
                        onChange={(val) => {
                            setYKey(val);
                            if (!statKeys.includes(val) && numericColumns.includes(val)) {
                                setStatKeys(prev => [...prev, val]);
                            }
                        }}
                        className="h-9 sm:h-10"
                    />
                </div>
                <div className="space-y-1 sm:space-y-1.5">
                    <Label className="text-xs sm:text-sm">Aggregation</Label>
                    <Select value={aggType} onValueChange={(val: any) => setAggType(val)}>
                        <SelectTrigger className="h-9 sm:h-10">
                            <SelectValue />
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
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <Card className="overflow-hidden">
                    <CardHeader className="pb-1 px-3 pt-3 sm:px-4 sm:pt-4">
                        <CardTitle className="text-xs sm:text-sm font-medium truncate">
                            Bar · {aggLabel} of {yKey}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[220px] sm:h-[280px] md:h-[340px] lg:h-[400px] px-1 sm:px-2 pb-2">
                        <Plot
                            data={plotlyDataBar}
                            layout={commonLayout}
                            config={{ displayModeBar: false, responsive: true, displaylogo: false }}
                            style={{ width: '100%', height: '100%' }}
                            useResizeHandler={true}
                        />
                    </CardContent>
                </Card>

                <Card className="overflow-hidden">
                    <CardHeader className="pb-1 px-3 pt-3 sm:px-4 sm:pt-4">
                        <CardTitle className="text-xs sm:text-sm font-medium truncate">
                            Line · {aggLabel} of {yKey}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[220px] sm:h-[280px] md:h-[340px] lg:h-[400px] px-1 sm:px-2 pb-2">
                        <Plot
                            data={plotlyDataLine}
                            layout={commonLayout}
                            config={{ displayModeBar: false, responsive: true, displaylogo: false }}
                            style={{ width: '100%', height: '100%' }}
                            useResizeHandler={true}
                        />
                    </CardContent>
                </Card>

                <Card className="md:col-span-2 lg:col-span-1 overflow-hidden">
                    <CardHeader className="pb-1 px-3 pt-3 sm:px-4 sm:pt-4">
                        <CardTitle className="text-xs sm:text-sm font-medium truncate">
                            Area · {aggLabel} of {yKey}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[220px] sm:h-[280px] md:h-[340px] lg:h-[400px] px-1 sm:px-2 pb-2">
                        <Plot
                            data={plotlyDataArea}
                            layout={commonLayout}
                            config={{ displayModeBar: false, responsive: true, displaylogo: false }}
                            style={{ width: '100%', height: '100%' }}
                            useResizeHandler={true}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Advanced Stats Section */}
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm sm:text-lg md:text-xl font-semibold flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-brand-purple" />
                        <span className="hidden sm:inline">Advanced Statistics</span>
                        <span className="sm:hidden">Stats</span>
                    </h2>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1 text-xs shrink-0">
                                <Plus className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Add Column Analysis</span>
                                <span className="sm:hidden">Add</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[240px] p-0" align="end">
                            <div className="max-h-[300px] overflow-y-auto">
                                {Object.entries({
                                    numeric: { label: ' Numeric', cols: columns.filter((c: string) => columnMeta[c]?.type === 'numeric') },
                                    categorical: { label: ' Categorical', cols: columns.filter((c: string) => columnMeta[c]?.type === 'categorical' || columnMeta[c]?.type === 'id') },
                                    datetime: { label: ' DateTime', cols: columns.filter((c: string) => columnMeta[c]?.type === 'datetime') },
                                    boolean: { label: ' Boolean', cols: columns.filter((c: string) => columnMeta[c]?.type === 'boolean') },
                                }).filter(([, group]) => group.cols.length > 0).map(([type, group]) => (
                                    <div key={type}>
                                        <div className="p-2 text-xs font-semibold text-muted-foreground bg-slate-50 dark:bg-slate-800 border-b flex items-center gap-1">
                                            {group.label} ({group.cols.length})
                                        </div>
                                        {group.cols.map((col: string) => (
                                            <button
                                                key={col}
                                                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 flex items-center gap-2"
                                                onClick={() => addStatKey(col)}
                                                disabled={statKeys.includes(col)}
                                            >
                                                <ColumnTypeBadge type={columnMeta[col]?.type || 'unknown'} />
                                                {col}
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="grid gap-3 sm:gap-4 md:gap-6">
                    {statKeys.map(key => {
                        const stats = calculateStats(key);
                        return (
                            <Card key={key} className="relative group">
                                <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
                                    <CardTitle className="text-xs sm:text-sm md:text-base font-medium truncate">
                                        Stats: <span className="text-brand-purple">{key}</span>
                                    </CardTitle>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                        onClick={() => removeStatKey(key)}
                                    >
                                        <X className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                                    </Button>
                                </CardHeader>
                                <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                                        <StatBox label="Count" value={stats.count} />
                                        {stats.type === 'numeric' ? (
                                            <>
                                                <StatBox label="Sum" value={stats.sum?.toLocaleString() || '-'} />
                                                <StatBox label="Avg" value={stats.avg?.toFixed(2) || '-'} />
                                                <StatBox label="Min" value={stats.min ?? '-'} />
                                                <StatBox label="Max" value={stats.max ?? '-'} />
                                            </>
                                        ) : (
                                            <>
                                                <StatBox label="Unique" value={stats.unique ?? '-'} />
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

            {/* Data Preview */}
            <Card>
                <CardHeader className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
                    <CardTitle className="text-sm sm:text-base">Data Preview</CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-4 pb-3 sm:pb-4">
                    <div className="overflow-x-auto max-h-[300px] sm:max-h-[400px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {columns.map((col: string) => (
                                        <TableHead
                                            key={col}
                                            className="cursor-pointer hover:bg-slate-50 transition-colors select-none text-[10px] sm:text-xs"
                                            onClick={() => handleSort(col)}
                                        >
                                            <div className="flex items-center gap-0.5 whitespace-nowrap">
                                                {col}
                                                {sortConfig?.key === col && (
                                                    <span className="text-brand-purple">
                                                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                    </span>
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
                                            <TableCell key={`${i}-${col}`} className="text-[10px] sm:text-xs">
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
        <div className="bg-slate-100 dark:bg-slate-800 p-2 sm:p-3 md:p-4 rounded-lg border dark:border-slate-700 min-w-0">
            <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">{label}</div>
            <div className="text-sm sm:text-base md:text-xl font-bold text-slate-900 dark:text-slate-100 overflow-hidden text-ellipsis">{value}</div>
        </div>
    );
}
