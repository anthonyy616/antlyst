'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

// Dynamic import for Plotly (lightweight bundle)
const Plot = dynamic(() => import('../PlotWrapper'), { ssr: false });

interface TrendChartProps {
    title: string;
    data: any[];
    xKey: string;
    yKey: string;
    type?: 'line' | 'bar' | 'area' | 'scatter';
    color?: string;
    onClick?: (event: any) => void;
}

export function TrendChart({ title, data, xKey, yKey, type = 'line', color = '#6366f1', onClick }: TrendChartProps) {
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const x = data.map((row, i) => xKey === '_index' ? i : row[xKey]);
        const y = data.map(row => row[yKey]);

        // For bar charts, aggregate data if there are many points
        if (type === 'bar' && x.length > 50) {
            const groups: Record<string, number[]> = {};
            x.forEach((val, idx) => {
                const key = String(val);
                if (!groups[key]) groups[key] = [];
                groups[key].push(y[idx] || 0);
            });

            const sorted = Object.entries(groups)
                .map(([k, vals]) => ({
                    x: k,
                    y: vals.reduce((a, b) => a + b, 0) / vals.length,
                }))
                .sort((a, b) => b.y - a.y)
                .slice(0, 20);

            return [{
                x: sorted.map(d => d.x),
                y: sorted.map(d => d.y),
                type: 'bar',
                marker: { color },
                hovertemplate: '%{x}<br>%{y:.2f}<extra></extra>',
            }];
        }

        const trace: any = {
            x,
            y,
            type: type === 'area' ? 'scatter' : type,
            mode: type === 'scatter' ? 'markers' : (type === 'bar' ? undefined : 'lines'),
            marker: { color },
            line: { color, width: 2 },
            hovertemplate: type === 'bar'
                ? '%{x}<br>%{y:.2f}<extra></extra>'
                : '%{x}: %{y:.2f}<extra></extra>',
        };

        if (type === 'area') {
            trace.fill = 'tozeroy';
            trace.fillcolor = color ? `${color}22` : 'rgba(99, 102, 241, 0.1)';
        }

        return [trace];
    }, [data, xKey, yKey, type, color]);

    const handleClick = (event: any) => {
        if (onClick && event?.points?.[0]) {
            onClick(event);
        }
    };

    const dataLength = data?.length || 0;

    return (
        <div className="w-full h-full flex flex-col">
            <div className="px-4 py-2 border-b">
                <h3 className="text-sm font-semibold truncate">{title}</h3>
            </div>
            <div className="flex-1 w-full min-h-0">
                <Plot
                    data={chartData as any}
                    layout={{
                        autosize: true,
                        margin: { t: 10, r: 15, b: 40, l: 50 },
                        xaxis: {
                            title: xKey !== '_index' ? { text: xKey, font: { size: 10 } } : undefined,
                            automargin: true,
                            tickangle: dataLength > 10 ? -45 : 0,
                            tickfont: { size: 9 },
                        },
                        yaxis: {
                            title: { text: yKey, font: { size: 10 } },
                            automargin: true,
                            tickfont: { size: 9 },
                        },
                        paper_bgcolor: 'transparent',
                        plot_bgcolor: 'transparent',
                        showlegend: false,
                    }}
                    useResizeHandler={true}
                    style={{ width: '100%', height: '100%' }}
                    config={{ displayModeBar: false, responsive: true, displaylogo: false }}
                    onClick={handleClick}
                />
            </div>
        </div>
    );
}
