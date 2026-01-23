'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

    // Calculate Stats
    const stats = useMemo(() => {
        if (!yKey || !numericColumns.includes(yKey)) return null;
        const values = data.map((d: any) => d[yKey]).filter((v: any) => typeof v === 'number');
        const sum = values.reduce((a: number, b: number) => a + b, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        return { sum, avg, min, max, count: values.length };
    }, [data, yKey, numericColumns]);

    return (
        <div className="space-y-6">
            {/* Control Panel */}
            <Card>
                <CardHeader>
                    <CardTitle>Chart Configuration</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4">
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
                        <Select value={yKey} onValueChange={setYKey}>
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
                        <CardTitle>Bar Chart ({xKey} vs {yKey})</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey={xKey} />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey={yKey} fill="#5e30eb" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Line Chart ({xKey} vs {yKey})</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey={xKey} />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey={yKey} stroke="#52d6fc" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Advanced Stats */}
            {stats && (
                <Card>
                    <CardHeader>
                        <CardTitle>Advanced Statistics ({yKey})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <StatBox label="Count" value={stats.count} />
                            <StatBox label="Sum" value={stats.sum.toLocaleString()} />
                            <StatBox label="Average" value={stats.avg.toFixed(2)} />
                            <StatBox label="Min" value={stats.min} />
                            <StatBox label="Max" value={stats.max} />
                        </div>
                    </CardContent>
                </Card>
            )}

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
        <div className="bg-slate-50 p-4 rounded-lg border">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="text-xl font-bold">{value}</div>
        </div>
    );
}
