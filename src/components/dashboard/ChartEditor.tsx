'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CHART_THEMES, ChartTheme } from '@/lib/chart-themes';

interface ChartEditorProps {
    open: boolean;
    onClose: () => void;
    chartConfig: any;
    onSave: (newConfig: any) => void;
    columns: string[];
}

export function ChartEditor({ open, onClose, chartConfig, onSave, columns }: ChartEditorProps) {
    const [type, setType] = useState<string>(chartConfig?.type || 'bar');
    const [xKey, setXKey] = useState<string>(chartConfig?.layout?.xKey || '');
    const [yKey, setYKey] = useState<string>(chartConfig?.layout?.yKey || '');
    const [theme, setTheme] = useState<ChartTheme>('default');

    const handleSave = () => {
        const newConfig = {
            ...chartConfig,
            type,
            layout: {
                ...chartConfig.layout,
                xKey,
                yKey,
                marker: {
                    ...chartConfig.layout?.marker,
                    color: CHART_THEMES[theme].colors[0] // Set primary color from theme
                }
            }
        };
        onSave(newConfig);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Chart</DialogTitle>
                    <DialogDescription>
                        Customize your chart settings here.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                            Type
                        </Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select chart type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="bar">Bar</SelectItem>
                                <SelectItem value="line">Line</SelectItem>
                                <SelectItem value="area">Area</SelectItem>
                                <SelectItem value="scatter">Scatter</SelectItem>
                                <SelectItem value="pie">Pie</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {type !== 'pie' && (
                        <>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="xKey" className="text-right">
                                    X Axis
                                </Label>
                                <Select value={xKey} onValueChange={setXKey}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_index">Index</SelectItem>
                                        {columns.map((col) => (
                                            <SelectItem key={col} value={col}>{col}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="yKey" className="text-right">
                                    Y Axis
                                </Label>
                                <Select value={yKey} onValueChange={setYKey}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select column" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {columns.map((col) => (
                                            <SelectItem key={col} value={col}>{col}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="theme" className="text-right">
                            Theme
                        </Label>
                        <Select value={theme} onValueChange={(val: ChartTheme) => setTheme(val)}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select theme" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.keys(CHART_THEMES).map((key) => (
                                    <SelectItem key={key} value={key}>
                                        {CHART_THEMES[key as ChartTheme].name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSave}>Save changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
