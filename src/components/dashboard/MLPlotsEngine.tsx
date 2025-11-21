'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface MLPlotsEngineProps {
    projectId: string;
}

export default function MLPlotsEngine({ projectId }: MLPlotsEngineProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // In a real app, we would fetch the analysis result from the API
        // For now, we'll simulate fetching the manifest or fetch it if we had the URL
        // Since we don't have the manifest URL passed in props yet, we might need to fetch the project details first
        // or assume a structure. 

        // TODO: Fetch project -> analysis -> manifestUrl -> fetch manifest
        // For this MVP, we will show a placeholder or mock if no data
        setLoading(false);
    }, [projectId]);

    // Mock data for demonstration if real data isn't wired up yet
    const mockCorrelation = {
        z: [[1, 0.8, 0.3], [0.8, 1, 0.5], [0.3, 0.5, 1]],
        x: ['Feature A', 'Feature B', 'Feature C'],
        y: ['Feature A', 'Feature B', 'Feature C'],
        type: 'heatmap' as const,
        colorscale: 'Viridis'
    };

    return (
        <div className="p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Correlation Heatmap</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                    {loading ? (
                        <div>Loading analysis...</div>
                    ) : (
                        <Plot
                            data={[mockCorrelation]}
                            layout={{
                                width: 800,
                                height: 600,
                                title: { text: 'Feature Correlations' },
                                autosize: true
                            }}
                            useResizeHandler={true}
                            style={{ width: '100%', height: '100%' }}
                        />
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Feature Importance (SHAP)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px] flex items-center justify-center bg-slate-50">
                        <p className="text-slate-500">SHAP values visualization coming soon</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Partial Dependence Plot</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px] flex items-center justify-center bg-slate-50">
                        <p className="text-slate-500">PDP visualization coming soon</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
