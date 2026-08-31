'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Bell, Plus, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';

interface AlertRule {
    id: string;
    name: string;
    metric: string;
    condition: string;
    threshold: number;
    enabled: boolean;
    lastStatus?: string;
    lastChecked?: string;
    _count?: { AlertEvent: number };
}

interface AlertRulesPanelProps {
    projectId: string;
    columns: string[];
}

export function AlertRulesPanel({ projectId, columns }: AlertRulesPanelProps) {
    const [alerts, setAlerts] = useState<AlertRule[]>([]);
    const [loading, setLoading] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ name: '', metric: '', condition: 'above', threshold: 0 });

    useEffect(() => { fetchAlerts(); }, [projectId]);

    const fetchAlerts = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/alerts`);
            if (res.ok) {
                const data = await res.json();
                setAlerts(data.alerts || []);
            }
        } catch (err) {
            console.error('Failed to fetch alerts:', err);
        } finally {
            setLoading(false);
        }
    };

    const createAlert = async () => {
        if (!form.name || !form.metric) return;
        setCreating(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/alerts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                setShowCreate(false);
                setForm({ name: '', metric: '', condition: 'above', threshold: 0 });
                fetchAlerts();
            }
        } catch (err) {
            console.error('Failed to create alert:', err);
        } finally {
            setCreating(false);
        }
    };

    return (
        <Card>
            <CardHeader className="pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                        <Bell className="w-4 h-4 text-red-500 shrink-0" />
                        Alert Rules ({alerts.length})
                    </CardTitle>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowCreate(!showCreate)}>
                        <Plus className="h-3 w-3" /> New
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                {showCreate && (
                    <div className="border rounded-lg p-3 space-y-2 mb-3 bg-slate-50 dark:bg-slate-800/50">
                        <Input placeholder="Alert name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-8 text-xs" />
                        <div className="flex gap-2">
                            <Select value={form.metric} onValueChange={(v) => setForm({ ...form, metric: v })}>
                                <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Metric" /></SelectTrigger>
                                <SelectContent>
                                    {columns.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                                <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="above" className="text-xs">Above</SelectItem>
                                    <SelectItem value="below" className="text-xs">Below</SelectItem>
                                    <SelectItem value="drops_by_pct" className="text-xs">Drops by %</SelectItem>
                                    <SelectItem value="increases_by_pct" className="text-xs">Increases by %</SelectItem>
                                    <SelectItem value="anomaly_detected" className="text-xs">Anomaly Detected</SelectItem>
                                </SelectContent>
                            </Select>
                            {form.condition !== 'anomaly_detected' && (
                                <Input type="number" placeholder="Threshold" value={form.threshold || ''} onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })} className="h-8 text-xs w-24" />
                            )}
                        </div>
                        <Button size="sm" className="h-7 text-xs w-full" onClick={createAlert} disabled={creating || !form.name || !form.metric}>
                            {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Create Alert'}
                        </Button>
                    </div>
                )}
                {loading ? (
                    <div className="flex items-center justify-center py-4 text-muted-foreground text-xs"><Loader2 className="h-3 w-3 animate-spin mr-2" /> Loading...</div>
                ) : alerts.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">No alert rules configured.</p>
                ) : (
                    <div className="space-y-1.5">
                        {alerts.map((a) => (
                            <div key={a.id} className="flex items-center justify-between p-2 border rounded-lg text-xs">
                                <div className="min-w-0">
                                    <div className="font-medium truncate">{a.name}</div>
                                    <div className="text-[10px] text-muted-foreground">
                                        {a.metric} {a.condition.replace(/_/g, ' ')} {a.condition !== 'anomaly_detected' ? a.threshold : ''}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {a.lastStatus === 'triggered' ? (
                                        <Badge className="text-[9px] bg-red-100 text-red-700"><AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> Triggered</Badge>
                                    ) : a.lastStatus === 'ok' ? (
                                        <Badge variant="outline" className="text-[9px]"><CheckCircle className="w-2.5 h-2.5 mr-0.5 text-green-500" /> OK</Badge>
                                    ) : null}
                                    <Badge variant="outline" className="text-[9px]">{a._count?.AlertEvent || 0} events</Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
