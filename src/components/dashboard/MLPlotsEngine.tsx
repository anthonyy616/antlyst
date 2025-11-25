'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface MLPlotsEngineProps {
    analysisResult?: any;
    projectId?: string;
}

export default function MLPlotsEngine({ analysisResult }: MLPlotsEngineProps) {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (analysisResult) {
            setLoading(false);
        }
    }, [analysisResult]);

    if (!analysisResult || !analysisResult.stats || !analysisResult.stats.preview) {
        return <div>No data available</div>;
    }

    const data = analysisResult.stats.preview;
    const columns = analysisResult.stats.columns || [];

    // Prepare data for heatmap (Correlation proxy)
    // Since we don't have real correlation matrix yet, let's visualize the first 3 numeric columns
    const numericCols = columns.filter((c: string) => typeof data[0][c] === 'number').slice(0, 3);

    let heatmapData: any = null;
    if (numericCols.length >= 2) {
        // Create a scatter matrix or similar
        // For now, let's just do a 3D scatter if we have 3 cols, or 2D if 2
        heatmapData = {
            x: data.map((d: any) => d[numericCols[0]]),
            y: data.map((d: any) => d[numericCols[1]]),
            mode: 'markers',
            type: 'scatter',
            marker: { color: data.map((d: any) => d[numericCols[1]]), colorscale: 'Viridis' }
        };
        if (numericCols.length > 2) {
            heatmapData = {
                x: data.map((d: any) => d[numericCols[0]]),
                y: data.map((d: any) => d[numericCols[1]]),
                z: data.map((d: any) => d[numericCols[2]]),
                mode: 'markers',
                type: 'scatter3d',
                marker: { size: 3, color: data.map((d: any) => d[numericCols[2]]), colorscale: 'Viridis' }
            };
        }
    }

    return (
        <div className="p-6 space-y-6 bg-slate-900 text-white min-h-screen">
            <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white">Advanced Analytics (ML View)</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                    {loading ? (
                        <div>Loading analysis...</div>
                    ) : (
                        heatmapData ? (
                            <Plot
                                data={[heatmapData]}
                                layout={{
                                    width: 800,
                                    height: 600,
                                    title: { text: 'Multi-Dimensional Feature Analysis', font: { color: '#fff' } },
                                    paper_bgcolor: 'rgba(0,0,0,0)',
                                    plot_bgcolor: 'rgba(0,0,0,0)',
                                    scene: {
                                        xaxis: { title: numericCols[0], color: '#fff' },
                                        yaxis: { title: numericCols[1], color: '#fff' },
                                        zaxis: { title: numericCols[2], color: '#fff' },
                                    },
                                    xaxis: { title: numericCols[0], color: '#fff' },
                                    yaxis: { title: numericCols[1], color: '#fff' },
                                }}
                                useResizeHandler={true}
                                style={{ width: '100%', height: '100%' }}
                            />
                        ) : (
                            <div className="text-gray-400">Not enough numeric data for ML visualization</div>
                        )
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
