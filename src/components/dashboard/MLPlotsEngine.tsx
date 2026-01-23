'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from 'lucide-react';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface MLPlotsEngineProps {
    analysisResult?: any;
    projectId?: string;
}

export default function MLPlotsEngine({ analysisResult }: MLPlotsEngineProps) {
    const [loading, setLoading] = useState(true);

    const data = analysisResult?.stats?.preview;
    const columns = analysisResult?.stats?.columns || [];

    // Filter for numeric only
    const numericCols = useMemo(() => {
        if (!data || data.length === 0) return [];
        return columns.filter((c: string) => typeof data[0][c] === 'number');
    }, [columns, data]);

    // State for axes
    const [xCol, setXCol] = useState<string>('');
    const [yCol, setYCol] = useState<string>('');
    const [zCol, setZCol] = useState<string>('');

    // Initialize defaults when data loads
    useEffect(() => {
        if (analysisResult && numericCols.length > 0) {
            setXCol(numericCols[0] || '');
            setYCol(numericCols[1] || numericCols[0] || '');
            setZCol(numericCols[2] || numericCols[0] || '');
            setLoading(false);
        }
    }, [analysisResult, numericCols]);

    if (!analysisResult || !data) {
        return <div>No data available</div>;
    }

    const plotData = useMemo(() => {
        if (!xCol || !yCol) return null;

        const is3D = !!zCol && zCol !== 'none';

        const trace: any = {
            x: data.map((d: any) => d[xCol]),
            y: data.map((d: any) => d[yCol]),
            mode: 'markers',
            marker: {
                size: 5,
                color: data.map((d: any) => d[is3D ? zCol : yCol]),
                colorscale: 'Viridis',
                showscale: true
            }
        };

        if (is3D) {
            trace.z = data.map((d: any) => d[zCol]);
            trace.type = 'scatter3d';
        } else {
            trace.type = 'scatter';
        }

        return trace;
    }, [data, xCol, yCol, zCol]);

    return (
        <div className="p-6 space-y-6 bg-slate-900 text-white min-h-screen">
            {/* Control Panel */}
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white">ML View Configuration</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                    <div className="w-[200px]">
                        <label className="text-sm font-medium mb-1 block text-slate-300">X Axis</label>
                        <Select value={xCol} onValueChange={setXCol}>
                            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                                <SelectValue placeholder="Select X Axis" />
                            </SelectTrigger>
                            <SelectContent>
                                {numericCols.map((c: string) => (
                                    <SelectItem key={`x-${c}`} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-[200px]">
                        <label className="text-sm font-medium mb-1 block text-slate-300">Y Axis</label>
                        <Select value={yCol} onValueChange={setYCol}>
                            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                                <SelectValue placeholder="Select Y Axis" />
                            </SelectTrigger>
                            <SelectContent>
                                {numericCols.map((c: string) => (
                                    <SelectItem key={`y-${c}`} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-[200px]">
                        <label className="text-sm font-medium mb-1 block text-slate-300">Z Axis (Optional)</label>
                        <Select value={zCol} onValueChange={setZCol}>
                            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                                <SelectValue placeholder="Select Z Axis" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None (2D)</SelectItem>
                                {numericCols.map((c: string) => (
                                    <SelectItem key={`z-${c}`} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white">Multi-Dimensional Feature Analysis</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center h-[600px]">
                    {loading ? (
                        <div className="flex items-center gap-2">
                            <Loader2 className="animate-spin" /> Loading analysis...
                        </div>
                    ) : (
                        plotData ? (
                            <Plot
                                data={[plotData]}
                                layout={{
                                    autosize: true,
                                    title: { text: `${xCol} vs ${yCol} ${zCol !== 'none' ? 'vs ' + zCol : ''}`, font: { color: '#fff' } },
                                    paper_bgcolor: 'rgba(0,0,0,0)',
                                    plot_bgcolor: 'rgba(0,0,0,0)',
                                    scene: {
                                        xaxis: { title: { text: xCol }, color: '#fff' },
                                        yaxis: { title: { text: yCol }, color: '#fff' },
                                        zaxis: { title: { text: zCol }, color: '#fff' },
                                    },
                                    xaxis: { title: { text: xCol }, color: '#fff', gridcolor: '#444' },
                                    yaxis: { title: { text: yCol }, color: '#fff', gridcolor: '#444' },
                                    margin: { l: 50, r: 20, b: 50, t: 50, pad: 4 }
                                }}
                                useResizeHandler={true}
                                style={{ width: '100%', height: '100%' }}
                            />
                        ) : (
                            <div className="text-gray-400">Select numeric columns to visualize.</div>
                        )
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
