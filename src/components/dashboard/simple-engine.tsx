'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Brush } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, X, BarChart3 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

    // Stats Selection State: Allows multiple columns to be analyzed independently
    // Initialize with yKey (and maybe xKey if it makes sense, but usually stats are for numeric)
    const [statKeys, setStatKeys] = useState<string[]>([]);

    useEffect(() => {
        // Reset or init stat keys when columns change
        if (numericColumns.length > 0) {
            // Default to showing stats for the Y-Axis variable if it's numeric
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
            // Categorical Stats
            const unique = new Set(values).size;
            // Mode?
            return { type: 'categorical', count: values.length, unique };
        }
    };

    // Aggregation Logic for Charts
    const chartData = useMemo(() => {
        if (!xKey || !yKey) return [];

        // Check if aggregation is needed (if X is categorical/string)
        // If X is numeric, we might just want to sort by X.
        const isXNumeric = typeof data[0]?.[xKey] === 'number';

        if (isXNumeric) {
            // Just sort numerical X axis
            return [...data].sort((a, b) => (a[xKey] as number) - (b[xKey] as number));
        }

        // Categorical or Dates: Group and Sum
        const groups: Record<string, { sum: number, count: number }> = {};

        data.forEach((row: any) => {
            const key = String(row[xKey]); // Ensure string key
            const val = Number(row[yKey]) || 0;

            if (!groups[key]) {
                groups[key] = { sum: 0, count: 0 };
            }
            groups[key].sum += val;
            groups[key].count += 1;
        });

        // Convert back to array
        return Object.entries(groups).map(([name, stats]) => ({
            [xKey]: name,
            [yKey]: stats.sum, // Default to Sum for bar/line charts usually
            _count: stats.count,
            _avg: stats.sum / stats.count
        })).sort((a, b) => (b[yKey] as number) - (a[yKey] as number)); // Sort desc by value for cleaner count charts

    }, [data, xKey, yKey]);

    const addStatKey = (key: string) => {
        if (!statKeys.includes(key)) {
            setStatKeys([...statKeys, key]);
        }
    };

    const removeStatKey = (key: string) => {
        setStatKeys(statKeys.filter(k => k !== key));
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
                            // Optionally auto-add this to stats checking if the user wants that context switch
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
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Bar Chart (Sum of {yKey} by {xKey})</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                />
                                <Legend />
                                <Brush dataKey={xKey} height={30} stroke="#8884d8" />
                                <Bar dataKey={yKey} fill="#5e30eb" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Line Chart (Trend of {yKey})</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                <Brush dataKey={xKey} height={30} stroke="#8884d8" />
                                <Line type="monotone" dataKey={yKey} stroke="#52d6fc" strokeWidth={3} dot={{ strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
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
                                        <TableHead key={col}>{col}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.slice(0, 50).map((row: any, i: number) => (
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
