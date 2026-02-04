import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMemo } from 'react';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface TrendChartProps {
    title: string;
    data: any[];
    xKey: string;
    yKey: string;
    type?: 'line' | 'bar' | 'area';
    color?: string;
}

export function TrendChart({ title, data, xKey, yKey, type = 'line', color = '#52d6fc' }: TrendChartProps) {
    const chartData = useMemo(() => {
        const x = data.map(d => d[xKey]);
        const y = data.map(d => d[yKey]);

        return [{
            x,
            y,
            type: type === 'area' ? 'scatter' : type,
            fill: type === 'area' ? 'tozeroy' : undefined,
            mode: type === 'bar' ? undefined : 'lines+markers',
            marker: { color },
            line: {
                color,
                width: 3,
                shape: 'spline'
            }
        }];
    }, [data, xKey, yKey, type, color]);

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
                        margin: { l: 40, r: 20, t: 10, b: 40 },
                        paper_bgcolor: 'rgba(0,0,0,0)',
                        plot_bgcolor: 'rgba(0,0,0,0)',
                        font: { color: '#71717a' },
                        xaxis: { title: { text: xKey }, showgrid: false },
                        yaxis: { title: { text: yKey }, gridcolor: '#71717a1a' }
                    }}
                    style={{ width: '100%', height: '100%' }}
                    useResizeHandler={true}
                    config={{ displayModeBar: false, responsive: true }}
                />
            </CardContent>
        </Card>
    );
}
