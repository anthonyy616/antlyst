'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Share2, X, UserPlus } from 'lucide-react';

interface Share {
    id: string;
    userId: string;
    permission: string;
    user: { id: string; name: string; email: string; imageUrl: string };
}

interface DashboardShareDialogProps {
    open: boolean;
    onClose: () => void;
    dashboardId: string;
    projectId: string;
}

export function DashboardShareDialog({ open, onClose, dashboardId, projectId }: DashboardShareDialogProps) {
    const [shares, setShares] = useState<Share[]>([]);
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState('');
    const [permission, setPermission] = useState('view');
    const [sharing, setSharing] = useState(false);

    useEffect(() => {
        if (open) fetchShares();
    }, [open, dashboardId]);

    const fetchShares = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/dashboards/${dashboardId}`);
            if (res.ok) {
                const data = await res.json();
                setShares(data.dashboard?.shares || []);
            }
        } catch (err) {
            console.error('Failed to fetch shares:', err);
        } finally {
            setLoading(false);
        }
    };

    const addShare = async () => {
        if (!userId.trim()) return;
        setSharing(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/dashboards/${dashboardId}/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId.trim(), permission }),
            });
            if (res.ok) {
                setUserId('');
                fetchShares();
            }
        } catch (err) {
            console.error('Failed to share:', err);
        } finally {
            setSharing(false);
        }
    };

    const removeShare = async (targetUserId: string) => {
        try {
            const res = await fetch(`/api/projects/${projectId}/dashboards/${dashboardId}/share?userId=${targetUserId}`, {
                method: 'DELETE',
            });
            if (res.ok) fetchShares();
        } catch (err) {
            console.error('Failed to unshare:', err);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-sm flex items-center gap-2">
                        <Share2 className="w-4 h-4" /> Share Dashboard
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <Input
                            placeholder="User ID"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            className="h-9 text-sm flex-1"
                        />
                        <Select value={permission} onValueChange={setPermission}>
                            <SelectTrigger className="h-9 text-sm w-24">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="view">View</SelectItem>
                                <SelectItem value="edit">Edit</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button size="sm" className="h-9" onClick={addShare} disabled={sharing || !userId.trim()}>
                            {sharing ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                        </Button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-4 text-muted-foreground text-xs">
                            <Loader2 className="h-3 w-3 animate-spin mr-2" /> Loading shares...
                        </div>
                    ) : shares.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2 text-center">Not shared with anyone yet.</p>
                    ) : (
                        <div className="space-y-1.5">
                            {shares.map((share) => (
                                <div key={share.id} className="flex items-center justify-between p-2 border rounded-lg">
                                    <div className="min-w-0">
                                        <div className="text-xs font-medium truncate">{share.user.name || share.user.email}</div>
                                        <div className="text-[10px] text-muted-foreground">{share.user.email}</div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <Badge variant="outline" className="text-[9px] capitalize">{share.permission}</Badge>
                                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeShare(share.userId)}>
                                            <X className="h-3 w-3 text-muted-foreground" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
