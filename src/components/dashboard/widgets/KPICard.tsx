import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from 'lucide-react';

interface KPICardProps {
    title: string;
    value: string | number;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
}

export function KPICard({ title, value, change, trend }: KPICardProps) {
    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                {trend === 'up' && <ArrowUpIcon className="h-4 w-4 text-emerald-500" />}
                {trend === 'down' && <ArrowDownIcon className="h-4 w-4 text-rose-500" />}
                {trend === 'neutral' && <MinusIcon className="h-4 w-4 text-muted-foreground" />}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold truncate" title={String(value)}>{value}</div>
                {change && (
                    <p className="text-xs text-muted-foreground mt-1">
                        {change}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
