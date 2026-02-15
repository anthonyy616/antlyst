import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from "lucide-react";

interface KPICardProps {
    title: string;
    value: string | number;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
    className?: string;
}

export function KPICard({ title, value, change, trend = 'neutral', className }: KPICardProps) {
    return (
        <Card className={`h-full ${className}`}>
            <CardContent className="p-4 flex flex-col justify-between h-full">
                <span className="text-sm font-medium text-muted-foreground">{title}</span>
                <div className="flex items-end justify-between">
                    <span className="text-2xl font-bold">{value}</span>
                    {change && (
                        <div className={`flex items-center text-xs font-medium ${trend === 'up' ? 'text-green-500' :
                                trend === 'down' ? 'text-red-500' :
                                    'text-muted-foreground'
                            }`}>
                            {trend === 'up' && <ArrowUpIcon className="w-3 h-3 mr-1" />}
                            {trend === 'down' && <ArrowDownIcon className="w-3 h-3 mr-1" />}
                            {trend === 'neutral' && <MinusIcon className="w-3 h-3 mr-1" />}
                            {change}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
