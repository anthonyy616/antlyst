import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ChartEditorProps {
    columns: string[];
    numericColumns: string[];
    xKey: string;
    yKey: string;
    chartType?: string;
    aggType: string;
    onXKeyChange: (val: string) => void;
    onYKeyChange: (val: string) => void;
    onChartTypeChange?: (val: string) => void;
    onAggTypeChange: (val: any) => void;
}

export function ChartEditor({
    columns,
    numericColumns,
    xKey,
    yKey,
    chartType,
    aggType,
    onXKeyChange,
    onYKeyChange,
    onChartTypeChange,
    onAggTypeChange
}: ChartEditorProps) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Chart Editor</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4 flex-wrap">
                <div className="w-[180px]">
                    <label className="text-xs font-semibold mb-1.5 block text-slate-500">X Axis (Dimension)</label>
                    <Select value={xKey} onValueChange={onXKeyChange}>
                        <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select X Axis" />
                        </SelectTrigger>
                        <SelectContent>
                            {columns.map((c: string) => (
                                <SelectItem key={`x-${c}`} value={c}>{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-[180px]">
                    <label className="text-xs font-semibold mb-1.5 block text-slate-500">Y Axis (Value)</label>
                    <Select value={yKey} onValueChange={onYKeyChange}>
                        <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select Y Axis" />
                        </SelectTrigger>
                        <SelectContent>
                            {numericColumns.map((c: string) => (
                                <SelectItem key={`y-${c}`} value={c}>{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-[150px]">
                    <label className="text-xs font-semibold mb-1.5 block text-slate-500">Aggregation</label>
                    <Select value={aggType} onValueChange={onAggTypeChange}>
                        <SelectTrigger className="h-9">
                            <SelectValue placeholder="Aggregation" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="sum">Sum</SelectItem>
                            <SelectItem value="avg">Average</SelectItem>
                            <SelectItem value="min">Minimum</SelectItem>
                            <SelectItem value="max">Maximum</SelectItem>
                            <SelectItem value="count">Count</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {onChartTypeChange && (
                    <div className="w-[150px]">
                        <label className="text-xs font-semibold mb-1.5 block text-slate-500">Chart Type</label>
                        <Select value={chartType} onValueChange={onChartTypeChange}>
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="bar">Bar Chart</SelectItem>
                                <SelectItem value="line">Line Chart</SelectItem>
                                <SelectItem value="area">Area Chart</SelectItem>
                                <SelectItem value="histogram">Histogram</SelectItem>
                                <SelectItem value="pie">Pie Chart</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
