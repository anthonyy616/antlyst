'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, LayoutGrid, Trash2, Copy, Share2, MessageSquare, Clock } from 'lucide-react';

interface Dashboard {
    id: string;
    name: string;
    description?: string;
    style: string;
    isPublic: boolean;
    createdAt: string;
    updatedAt: string;
    ownerId: string;
    _count?: { shares: number; comments: number };
}

interface DashboardManagerProps {
    projectId: string;
    orgId: string;
}

export function DashboardManager({ projectId, orgId }: DashboardManagerProps) {
    const [dashboards, setDashboards] = useState<Dashboard[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newStyle, setNewStyle] = useState('powerbi');

    useEffect(() => {
        fetchDashboards();
    }, [projectId]);

    const fetchDashboards = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/dashboards`);
            if (res.ok) {
                const data = await res.json();
                setDashboards(data.dashboards || []);
            }
        } catch (err) {
            console.error('Failed to fetch dashboards:', err);
        } finally {
            setLoading(false);
        }
    };

    const createDashboard = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/dashboards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName, style: newStyle }),
            });
            if (res.ok) {
                setShowCreate(false);
                setNewName('');
                fetchDashboards();
            }
        } catch (err) {
            console.error('Failed to create dashboard:', err);
        } finally {
            setCreating(false);
        }
    };

    const deleteDashboard = async (id: string) => {
        if (!confirm('Delete this dashboard?')) return;
        try {
            const res = await fetch(`/api/projects/${projectId}/dashboards/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) fetchDashboards();
        } catch (err) {
            console.error('Failed to delete dashboard:', err);
        }
    };

    const duplicateDashboard = async (id: string) => {
        try {
            const res = await fetch(`/api/projects/${projectId}/dashboards/${id}/duplicate`, {
                method: 'POST',
            });
            if (res.ok) fetchDashboards();
        } catch (err) {
            console.error('Failed to duplicate dashboard:', err);
        }
    };

    return (
        <Card>
            <CardHeader className="pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-indigo-500 shrink-0" />
                        Dashboards
                    </CardTitle>
                    <Dialog open={showCreate} onOpenChange={setShowCreate}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                                <Plus className="h-3 w-3" /> New
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="text-sm">Create Dashboard</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3">
                                <Input
                                    placeholder="Dashboard name"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="h-9 text-sm"
                                />
                                <Select value={newStyle} onValueChange={setNewStyle}>
                                    <SelectTrigger className="h-9 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="powerbi">Power BI</SelectItem>
                                        <SelectItem value="simple">Simple Charts</SelectItem>
                                        <SelectItem value="ml">ML Plots</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    onClick={createDashboard}
                                    disabled={creating || !newName.trim()}
                                    className="w-full h-9 text-sm"
                                >
                                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                {loading ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
                    </div>
                ) : dashboards.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No dashboards yet. Create one to get started.</p>
                ) : (
                    <div className="space-y-2">
                        {dashboards.map((d) => (
                            <div key={d.id} className="flex items-center justify-between p-2.5 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <div className="min-w-0">
                                    <div className="text-xs sm:text-sm font-medium truncate">{d.name}</div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Badge variant="outline" className="text-[9px] capitalize">{d.style}</Badge>
                                        {d.isPublic && <Badge variant="secondary" className="text-[9px]">Public</Badge>}
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(d.updatedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {d._count?.shares ? (
                                        <Badge variant="outline" className="text-[9px] mr-1">
                                            <Share2 className="w-2.5 h-2.5 mr-0.5" /> {d._count.shares}
                                        </Badge>
                                    ) : null}
                                    {d._count?.comments ? (
                                        <Badge variant="outline" className="text-[9px] mr-1">
                                            <MessageSquare className="w-2.5 h-2.5 mr-0.5" /> {d._count.comments}
                                        </Badge>
                                    ) : null}
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => duplicateDashboard(d.id)}>
                                        <Copy className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteDashboard(d.id)}>
                                        <Trash2 className="h-3 w-3 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
