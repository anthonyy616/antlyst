import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMemo } from 'react';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface PieChartWidgetProps {
    title: string;
    data: any[]; // Array of rows
    categoryColumn: string;
    valueColumn?: string; // If aggregation needed
}

export function PieChartWidget({ title, data, categoryColumn, valueColumn }: PieChartWidgetProps) {
    const chartData = useMemo(() => {
        const counts: Record<string, number> = {};

        data.forEach(row => {
            const key = String(row[categoryColumn]);
            if (valueColumn) {
                counts[key] = (counts[key] || 0) + (Number(row[valueColumn]) || 0);
            } else {
                counts[key] = (counts[key] || 0) + 1;
            }
        });

        const labels = Object.keys(counts);
        const values = Object.values(counts);

        return [{
            labels,
            values,
            type: 'pie',
            hole: 0.4,
            textinfo: 'label+percent',
            textposition: 'inside',
            marker: {
                colors: [
                    '#5e30eb', '#52d6fc', '#d946ef', '#f97316', '#22c55e',
                    '#eab308', '#ef4444', '#3b82f6', '#6366f1', '#8b5cf6'
                ]
            }
        }];
    }, [data, categoryColumn, valueColumn]);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
                <Plot
                    data={chartData as any}
                    layout={{
                        autosize: true,
                        margin: { l: 20, r: 20, t: 10, b: 20 },
                        showlegend: false,
                        paper_bgcolor: 'rgba(0,0,0,0)',
                        plot_bgcolor: 'rgba(0,0,0,0)',
                        font: { color: '#71717a' }
                    }}
                    style={{ width: '100%', height: '100%' }}
                    useResizeHandler={true}
                    config={{ displayModeBar: false }}
                />
            </CardContent>
        </Card>
    );
}
