'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Clock } from 'lucide-react';

interface RefreshScheduleConfigProps {
    dataSourceId: string;
    currentSchedule?: string;
    nextRefreshAt?: string;
    lastSyncAt?: string;
    refreshCount?: number;
    lastRefreshStatus?: string;
    onRefresh?: () => void;
}

export function RefreshScheduleConfig({
    dataSourceId,
    currentSchedule,
    nextRefreshAt,
    lastSyncAt,
    refreshCount,
    lastRefreshStatus,
    onRefresh,
}: RefreshScheduleConfigProps) {
    const [schedule, setSchedule] = useState(currentSchedule || 'manual');
    const [refreshing, setRefreshing] = useState(false);
    const [updating, setUpdating] = useState(false);

    const triggerRefresh = async () => {
        setRefreshing(true);
        try {
            const res = await fetch(`/api/datasources/${dataSourceId}/refresh`, { method: 'POST' });
            if (res.ok && onRefresh) onRefresh();
        } catch (err) {
            console.error('Failed to refresh:', err);
        } finally {
            setRefreshing(false);
        }
    };

    const updateSchedule = async (newSchedule: string) => {
        setSchedule(newSchedule);
        setUpdating(true);
        try {
            await fetch(`/api/datasources/${dataSourceId}/refresh`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schedule: newSchedule }),
            });
        } catch (err) {
            console.error('Failed to update schedule:', err);
        } finally {
            setUpdating(false);
        }
    };

    return (
        <Card>
            <CardHeader className="pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
                <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-blue-500 shrink-0" />
                    Refresh Schedule
                </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Select value={schedule} onValueChange={updateSchedule}>
                            <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="manual" className="text-xs">Manual</SelectItem>
                                <SelectItem value="hourly" className="text-xs">Hourly</SelectItem>
                                <SelectItem value="daily" className="text-xs">Daily</SelectItem>
                                <SelectItem value="weekly" className="text-xs">Weekly</SelectItem>
                                <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button size="sm" className="h-8 text-xs gap-1" onClick={triggerRefresh} disabled={refreshing}>
                            {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Refresh
                        </Button>
                    </div>
                    <div className="flex gap-2 flex-wrap text-[10px] text-muted-foreground">
                        {lastSyncAt && <span>Last sync: {new Date(lastSyncAt).toLocaleString()}</span>}
                        {refreshCount !== undefined && <span>{refreshCount} refreshes</span>}
                        {lastRefreshStatus && (
                            <Badge variant={lastRefreshStatus === 'success' ? 'secondary' : lastRefreshStatus === 'failed' ? 'destructive' : 'outline'} className="text-[9px]">
                                {lastRefreshStatus}
                            </Badge>
                        )}
                    </div>
                    {nextRefreshAt && schedule !== 'manual' && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="w-3 h-3" /> Next: {new Date(nextRefreshAt).toLocaleString()}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
