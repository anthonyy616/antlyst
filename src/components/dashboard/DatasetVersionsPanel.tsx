'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, GitBranch, ArrowRight } from 'lucide-react';

interface DatasetVersion {
    id: string;
    version: number;
    rowCount: number;
    columnCount: number;
    changeSummary: any;
    createdAt: string;
}

interface DatasetVersionsPanelProps {
    dataSourceId: string;
}

export function DatasetVersionsPanel({ dataSourceId }: DatasetVersionsPanelProps) {
    const [versions, setVersions] = useState<DatasetVersion[]>([]);
    const [loading, setLoading] = useState(false);
    const [compareFrom, setCompareFrom] = useState('');
    const [compareTo, setCompareTo] = useState('');
    const [comparison, setComparison] = useState<any>(null);
    const [comparing, setComparing] = useState(false);

    useEffect(() => { fetchVersions(); }, [dataSourceId]);

    const fetchVersions = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/datasources/${dataSourceId}/versions`);
            if (res.ok) {
                const data = await res.json();
                setVersions(data.versions || []);
            }
        } catch (err) {
            console.error('Failed to fetch versions:', err);
        } finally {
            setLoading(false);
        }
    };

    const compareVersions = async () => {
        if (!compareFrom || !compareTo) return;
        setComparing(true);
        try {
            const res = await fetch(`/api/datasources/${dataSourceId}/versions/compare`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fromVersion: Number(compareFrom), toVersion: Number(compareTo) }),
            });
            if (res.ok) {
                const data = await res.json();
                setComparison(data.comparison);
            }
        } catch (err) {
            console.error('Failed to compare:', err);
        } finally {
            setComparing(false);
        }
    };

    return (
        <Card>
            <CardHeader className="pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
                <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-teal-500 shrink-0" />
                    Dataset Versions ({versions.length})
                </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                {loading ? (
                    <div className="flex items-center justify-center py-4 text-muted-foreground text-xs"><Loader2 className="h-3 w-3 animate-spin mr-2" /> Loading...</div>
                ) : versions.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">No versions recorded yet.</p>
                ) : (
                    <>
                        <div className="space-y-1.5 mb-3">
                            {versions.map((v) => (
                                <div key={v.id} className="flex items-center justify-between p-2 border rounded-lg text-xs">
                                    <div>
                                        <span className="font-medium">Version {v.version}</span>
                                        <span className="text-muted-foreground ml-2">{v.rowCount} rows, {v.columnCount} cols</span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        {versions.length >= 2 && (
                            <div className="border-t pt-3">
                                <div className="flex gap-2 items-end mb-2">
                                    <Select value={compareFrom} onValueChange={setCompareFrom}>
                                        <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="From" /></SelectTrigger>
                                        <SelectContent>
                                            {versions.map((v) => <SelectItem key={v.id} value={String(v.version)} className="text-xs">v{v.version}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                                    <Select value={compareTo} onValueChange={setCompareTo}>
                                        <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="To" /></SelectTrigger>
                                        <SelectContent>
                                            {versions.map((v) => <SelectItem key={v.id} value={String(v.version)} className="text-xs">v{v.version}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Button size="sm" className="h-8 text-xs" onClick={compareVersions} disabled={comparing || !compareFrom || !compareTo}>
                                        {comparing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Compare'}
                                    </Button>
                                </div>
                                {comparison && (
                                    <div className="p-2 border rounded-lg text-xs space-y-1">
                                        <div className="flex gap-2 flex-wrap">
                                            <Badge variant="outline" className="text-[9px]">Rows: {comparison.changes.rowsAdded >= 0 ? '+' : ''}{comparison.changes.rowsAdded}</Badge>
                                            {comparison.changes.columnsAdded?.length > 0 && <Badge variant="outline" className="text-[9px]">+{comparison.changes.columnsAdded.length} columns</Badge>}
                                            {comparison.changes.columnsRemoved?.length > 0 && <Badge variant="outline" className="text-[9px] text-red-600">-{comparison.changes.columnsRemoved.length} columns</Badge>}
                                        </div>
                                        {comparison.changeSummary && (
                                            <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap">{JSON.stringify(comparison.changeSummary, null, 2)}</pre>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
