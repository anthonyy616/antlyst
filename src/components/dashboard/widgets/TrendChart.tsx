'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

// Dynamic import for Plotly
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface TrendChartProps {
    title: string;
    data: any[];
    xKey: string;
    yKey: string;
    type?: 'line' | 'bar' | 'area' | 'scatter';
    color?: string;
}

export function TrendChart({ title, data, xKey, yKey, type = 'line', color = '#6366f1' }: TrendChartProps) {
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const x = data.map((row, i) => xKey === '_index' ? i : row[xKey]);
        const y = data.map(row => row[yKey]);

        const trace: any = {
            x,
            y,
            type: type === 'area' ? 'scatter' : type,
            mode: type === 'scatter' ? 'markers' : 'lines',
            marker: { color },
            line: { color, width: 2 }
        };

        if (type === 'area') {
            trace.fill = 'tozeroy';
        }

        return [trace];
    }, [data, xKey, yKey, type, color]);

    return (
        <div className="w-full h-full flex flex-col">
            <div className="px-4 py-2 border-b">
                <h3 className="text-sm font-semibold">{title}</h3>
            </div>
            <div className="flex-1 w-full min-h-0">
                <Plot
                    data={chartData as any}
                    layout={{
                        autosize: true,
                        margin: { t: 20, r: 20, b: 40, l: 50 },
                        xaxis: { title: xKey !== '_index' ? { text: xKey } : undefined, automargin: true },
                        yaxis: { title: { text: yKey }, automargin: true },
                        paper_bgcolor: 'transparent',
                        plot_bgcolor: 'transparent',
                        showlegend: false,
                    }}
                    useResizeHandler={true}
                    style={{ width: '100%', height: '100%' }}
                    config={{ displayModeBar: true, displaylogo: false }}
                />
            </div>
        </div>
    );
}
