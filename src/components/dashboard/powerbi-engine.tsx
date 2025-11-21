'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface PowerBIEngineProps {
    analysisResult: any;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function PowerBIEngine({ analysisResult }: PowerBIEngineProps) {
    if (!analysisResult || !analysisResult.stats || !analysisResult.stats.preview) {
        return <div>No data available</div>;
    }

    const data = analysisResult.stats.preview;
    const columns = analysisResult.stats.columns || [];
    const rowCount = analysisResult.stats.rowCount;

    // Heuristic: Find first string col for X, first numeric col for Y
    const xKey = columns.find((c: string) => typeof data[0][c] === 'string') || columns[0];
    const yKey = columns.find((c: string) => typeof data[0][c] === 'number') || columns[1];

    return (
        <div className="bg-[#f0f0f0] p-4 min-h-screen font-segoe">
            <div className="grid grid-cols-4 gap-4 mb-4">
                <Card className="col-span-1 bg-white border-l-4 border-yellow-500 rounded-none shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-500 uppercase">Total Rows</p>
                        <p className="text-3xl font-bold text-gray-800">{rowCount}</p>
                    </CardContent>
                </Card>
                <Card className="col-span-1 bg-white border-l-4 border-blue-500 rounded-none shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-500 uppercase">Columns</p>
                        <p className="text-3xl font-bold text-gray-800">{columns.length}</p>
                    </CardContent>
                </Card>
                <Card className="col-span-2 bg-white border-l-4 border-green-500 rounded-none shadow-sm">
                    <CardContent className="p-4">
                        <p className="text-sm text-gray-500 uppercase">Dataset Name</p>
                        <p className="text-xl font-bold text-gray-800 truncate">Analysis Report</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-3 gap-4 h-[500px]">
                <Card className="col-span-2 bg-white rounded-none shadow-sm">
                    <CardHeader className="pb-2 border-b">
                        <CardTitle className="text-lg font-semibold text-gray-700">Main Trend Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px] pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey={xKey} axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#f5f5f5' }} />
                                <Bar dataKey={yKey} fill="#118DFF" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="col-span-1 bg-white rounded-none shadow-sm">
                    <CardHeader className="pb-2 border-b">
                        <CardTitle className="text-lg font-semibold text-gray-700">Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px] pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.slice(0, 5)}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey={yKey}
                                >
                                    {data.slice(0, 5).map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
