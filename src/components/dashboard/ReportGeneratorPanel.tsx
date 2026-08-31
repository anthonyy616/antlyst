'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, Download } from 'lucide-react';

interface ReportGeneratorPanelProps {
    data: any[];
    columns: string[];
    datasetName: string;
    stats?: any;
    insights?: any[];
    profile?: any;
}

export function ReportGeneratorPanel({ data, columns, datasetName, stats, insights, profile }: ReportGeneratorPanelProps) {
    const [format, setFormat] = useState('html');
    const [loading, setLoading] = useState(false);
    const [reportSections, setReportSections] = useState<any>(null);

    const generateReport = async () => {
        setLoading(true);
        try {
            const reportStats = stats || {
                rowCount: data.length,
                columns,
                preview: data.slice(0, 100),
            };
            const res = await fetch('/api/datasets/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    datasetName,
                    stats: reportStats,
                    insights,
                    profile,
                    format,
                }),
            });
            if (format === 'html' || format === 'text') {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `report-${Date.now()}.${format === 'html' ? 'html' : 'txt'}`;
                a.click();
                URL.revokeObjectURL(url);
            } else {
                const json = await res.json();
                setReportSections(json.report?.sections || []);
            }
        } catch (err) {
            console.error('Failed to generate report:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader className="pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
                <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                    Report Generator
                </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                <div className="flex gap-2 mb-3">
                    <Select value={format} onValueChange={setFormat}>
                        <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="html" className="text-xs">HTML</SelectItem>
                            <SelectItem value="text" className="text-xs">Text</SelectItem>
                            <SelectItem value="json" className="text-xs">JSON (Preview)</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button size="sm" className="h-8 text-xs gap-1" onClick={generateReport} disabled={loading}>
                        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                        Generate
                    </Button>
                </div>
                {reportSections && (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {reportSections.map((s: any, i: number) => (
                            <div key={i} className="p-2 border rounded-lg text-xs">
                                <h4 className="font-semibold mb-1">{s.title}</h4>
                                <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap">{s.content}</pre>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
