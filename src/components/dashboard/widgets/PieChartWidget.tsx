'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

// Dynamic import for Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface PieChartWidgetProps {
    title: string;
    data: any[];
    categoryColumn: string;
    height?: number;
}

export function PieChartWidget({ title, data, categoryColumn, height = 300 }: PieChartWidgetProps) {
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const counts: Record<string, number> = {};
        data.forEach(row => {
            const val = String(row[categoryColumn] || 'Unknown');
            counts[val] = (counts[val] || 0) + 1;
        });

        // Sort by count desc
        const sorted = Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10); // Top 10

        return [{
            labels: sorted.map(([k]) => k),
            values: sorted.map(([, v]) => v),
            type: 'pie',
            hole: 0.4, // Donut chart style
            textinfo: 'label+percent',
            hoverinfo: 'label+value+percent',
            marker: {
                colors: [
                    '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e',
                    '#f97316', '#eab308', '#84cc16', '#10b981', '#06b6d4'
                ]
            }
        }];
    }, [data, categoryColumn]);

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
                        margin: { t: 20, r: 20, b: 20, l: 20 },
                        showlegend: true,
                        legend: { orientation: 'h', y: -0.1 },
                        paper_bgcolor: 'transparent',
                        plot_bgcolor: 'transparent',
                    }}
                    useResizeHandler={true}
                    style={{ width: '100%', height: '100%' }}
                    config={{ displayModeBar: false }}
                />
            </div>
        </div>
    );
}
