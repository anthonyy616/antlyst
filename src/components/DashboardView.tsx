"use client";

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardConfig } from '@/lib/analysis-engine';
import { motion } from 'framer-motion';

// Dynamically import Plot for performance
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false, loading: () => <p>Loading chart...</p> });
import { Sparkles, AlertTriangle, TrendingUp, Info } from 'lucide-react';

interface DashboardViewProps {
    config: DashboardConfig;
}

export function DashboardView({ config }: DashboardViewProps) {
    if (!config) return null;

    // Helper for grid styles
    const getGridClass = (chart: any) => {
        if (config.layout === 'powerbi' && chart.gridPos) {
            // Very simplified grid mapping for Tailwind
            // In a real app we'd use react-grid-layout or CSS Grid with explicit row/col starts
            // Here we just toggle between full width or half width for demo
            return chart.gridPos.w >= 6 ? 'col-span-full md:col-span-1' : 'col-span-full';
        }
        return 'col-span-1';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* KPI Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {config.kpis.map((kpi, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                    >
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                    {kpi.label}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{kpi.value}</div>
                                {kpi.change && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {kpi.change}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* AI Insights Section */}
            {config.insights && config.insights.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="border-l-4 border-l-brand-purple bg-purple-50/50 dark:bg-purple-950/10">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-brand-purple" />
                                AI Analyst Insights
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {config.insights.map((insight, i) => (
                                <div key={i} className="flex items-start gap-3 p-2 rounded-md hover:bg-white/50 dark:hover:bg-white/5 transition-colors">
                                    <div className="mt-0.5">
                                        {insight.type === 'outlier' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                                        {insight.type === 'trend' && <TrendingUp className="h-5 w-5 text-green-500" />}
                                        {insight.type === 'general' && <Info className="h-5 w-5 text-blue-500" />}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold">{insight.title}</h4>
                                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Charts Section */}
            <div className={`grid gap-6 ${config.layout === 'powerbi' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                {config.charts.map((chart, idx) => (
                    <motion.div
                        key={chart.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + (idx * 0.1) }}
                        className={getGridClass(chart)}
                    >
                        <Card className="h-full min-h-[400px]">
                            <CardHeader>
                                <CardTitle>{chart.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[350px]">
                                <Plot
                                    data={chart.data}
                                    layout={{
                                        ...chart.layout,
                                        width: undefined, // Let it be responsive
                                        height: undefined,
                                        autosize: true,
                                        margin: { l: 50, r: 20, t: 30, b: 50 },
                                        paper_bgcolor: 'rgba(0,0,0,0)',
                                        plot_bgcolor: 'rgba(0,0,0,0)',
                                        font: {
                                            color: '#71717a' // zinc-500
                                        }
                                    }}
                                    style={{ width: '100%', height: '100%' }}
                                    useResizeHandler={true}
                                />
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
