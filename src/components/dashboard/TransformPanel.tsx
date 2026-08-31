'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Wand2, Plus, Trash2, Play, RotateCcw, CheckCircle, XCircle } from 'lucide-react';

interface TransformPanelProps {
    data: any[];
    columns: string[];
    onTransformed?: (newData: any[]) => void;
}

interface StepConfig {
    type: string;
    columns?: string[];
    method?: string;
    value?: string;
    column?: string;
    targetType?: string;
    renames?: Record<string, string>;
}

const TRANSFORM_TYPES = [
    { value: 'remove_missing', label: 'Remove Missing Values' },
    { value: 'fill_missing', label: 'Fill Missing Values' },
    { value: 'remove_duplicates', label: 'Remove Duplicates' },
    { value: 'rename_column', label: 'Rename Column' },
    { value: 'change_type', label: 'Change Column Type' },
    { value: 'filter_rows', label: 'Filter Rows' },
    { value: 'sort_rows', label: 'Sort Rows' },
    { value: 'select_columns', label: 'Select Columns' },
    { value: 'drop_columns', label: 'Drop Columns' },
    { value: 'calculated_column', label: 'Calculated Column' },
    { value: 'aggregate', label: 'Aggregate' },
    { value: 'group_by', label: 'Group By' },
];

const FILL_METHODS = ['value', 'mean', 'median', 'mode', 'forward_fill'];
const SORT_DIRECTIONS = ['asc', 'desc'];
const TARGET_TYPES = ['string', 'number', 'boolean', 'date'];
const AGG_FUNCTIONS = ['sum', 'mean', 'count', 'min', 'max', 'median', 'std'];

let stepCounter = 0;

export default function TransformPanel({ data, columns, onTransformed }: TransformPanelProps) {
    const [steps, setSteps] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const addStep = () => {
        stepCounter++;
        setSteps([
            ...steps,
            {
                id: `step-${stepCounter}`,
                type: 'remove_duplicates',
                enabled: true,
                config: {},
                status: 'pending',
                inputSchema: { columns: [], rowCount: data.length },
            },
        ]);
    };

    const removeStep = (id: string) => {
        setSteps(steps.filter((s) => s.id !== id));
    };

    const updateStep = (id: string, updates: Partial<any>) => {
        setSteps(steps.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    };

    const updateConfig = (id: string, configUpdates: Partial<StepConfig>) => {
        setSteps(
            steps.map((s) =>
                s.id === id ? { ...s, config: { ...s.config, ...configUpdates } } : s
            )
        );
    };

    const executePipeline = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/datasets/transform', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, steps, preserveOriginal: true }),
            });
            if (!res.ok) {
                const errBody = await res.json();
                throw new Error(errBody.error || 'Transformation failed');
            }
            const result = await res.json();
            setResult(result);
            if (result.transformedData) {
                onTransformed?.(result.transformedData);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const resetAll = () => {
        setSteps([]);
        setResult(null);
        setError(null);
    };

    return (
        <Card>
            <CardHeader className="pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
                <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-2 shrink-0">
                        <Wand2 className="w-4 h-4 text-amber-500 shrink-0" />
                        Data Transformations
                    </CardTitle>
                    <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addStep}>
                            <Plus className="h-3 w-3" /> <span className="hidden sm:inline">Add Step</span><span className="sm:hidden">Add</span>
                        </Button>
                        {steps.length > 0 && (
                            <>
                                <Button
                                    variant="default"
                                    size="sm"
                                    className="h-7 text-xs gap-1"
                                    onClick={executePipeline}
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                                    Run
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetAll}>
                                    <RotateCcw className="h-3 w-3" />
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                {error && (
                    <div className="text-sm text-red-500 py-2 mb-2 bg-red-50 dark:bg-red-950/20 rounded p-2">{error}</div>
                )}

                {result && (
                    <div className="text-xs text-muted-foreground bg-green-50 dark:bg-green-950/20 rounded p-2 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        <span className="truncate">Pipeline executed — {result.transformedData?.length ?? 0} rows output</span>
                        {result.stepResults && (
                            <span className="ml-auto shrink-0">
                                {result.stepResults.filter((s: any) => s.status === 'completed').length}/{result.stepResults.length} steps succeeded
                            </span>
                        )}
                    </div>
                )}

                {steps.length === 0 && !result && (
                    <p className="text-xs text-muted-foreground py-4">
                        Add transformation steps to clean, reshape, or aggregate your data. Steps execute in order.
                    </p>
                )}

                <div className="space-y-2">
                    {steps.map((step, idx) => (
                        <div key={step.id} className="border rounded-lg p-2.5 sm:p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Badge variant="outline" className="text-[10px] shrink-0">{idx + 1}</Badge>
                                    <Select
                                        value={step.type}
                                        onValueChange={(val) => updateStep(step.id, { type: val, config: {} })}
                                    >
                                        <SelectTrigger className="h-7 text-xs w-[140px] sm:w-[180px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TRANSFORM_TYPES.map((t) => (
                                                <SelectItem key={t.value} value={t.value} className="text-xs">
                                                    {t.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {step.status === 'completed' && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                                    {step.status === 'failed' && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => removeStep(step.id)}
                                    >
                                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                                    </Button>
                                </div>
                            </div>

                            {/* Step-specific config */}
                            <div className="flex flex-wrap gap-2">
                                {/* Columns selector for most types */}
                                {['remove_missing', 'remove_duplicates', 'select_columns', 'drop_columns', 'sort_rows'].includes(step.type) && (
                                    <div className="flex-1 min-w-[120px] sm:min-w-[150px]">
                                        <Label className="text-[10px] text-muted-foreground mb-0.5 block">Columns</Label>
                                        <Select
                                            value={step.config.columns?.[0] || ''}
                                            onValueChange={(val) => updateConfig(step.id, { columns: [val] })}
                                        >
                                            <SelectTrigger className="h-7 text-xs">
                                                <SelectValue placeholder="Select column" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {columns.map((col) => (
                                                    <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {step.type === 'fill_missing' && (
                                    <>
                                        <div className="flex-1 min-w-[100px] sm:min-w-[120px]">
                                            <Label className="text-[10px] text-muted-foreground mb-0.5 block">Column</Label>
                                            <Select
                                                value={step.config.columns?.[0] || ''}
                                                onValueChange={(val) => updateConfig(step.id, { columns: [val] })}
                                            >
                                                <SelectTrigger className="h-7 text-xs">
                                                    <SelectValue placeholder="Column" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {columns.map((col) => (
                                                        <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex-1 min-w-[100px] sm:min-w-[120px]">
                                            <Label className="text-[10px] text-muted-foreground mb-0.5 block">Method</Label>
                                            <Select
                                                value={step.config.method || 'value'}
                                                onValueChange={(val) => updateConfig(step.id, { method: val })}
                                            >
                                                <SelectTrigger className="h-7 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {FILL_METHODS.map((m) => (
                                                        <SelectItem key={m} value={m} className="text-xs capitalize">{m}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {step.config.method === 'value' && (
                                            <div className="flex-1 min-w-[80px] sm:min-w-[100px]">
                                                <Label className="text-[10px] text-muted-foreground mb-0.5 block">Value</Label>
                                                <Input
                                                    className="h-7 text-xs"
                                                    placeholder="Fill value"
                                                    value={step.config.value || ''}
                                                    onChange={(e) => updateConfig(step.id, { value: e.target.value })}
                                                />
                                            </div>
                                        )}
                                    </>
                                )}

                                {step.type === 'sort_rows' && (
                                    <div className="flex-1 min-w-[80px] sm:min-w-[100px]">
                                        <Label className="text-[10px] text-muted-foreground mb-0.5 block">Direction</Label>
                                        <Select
                                            value={step.config.method || 'asc'}
                                            onValueChange={(val) => updateConfig(step.id, { method: val })}
                                        >
                                            <SelectTrigger className="h-7 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {SORT_DIRECTIONS.map((d) => (
                                                    <SelectItem key={d} value={d} className="text-xs uppercase">{d}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {step.type === 'change_type' && (
                                    <>
                                        <div className="flex-1 min-w-[100px] sm:min-w-[120px]">
                                            <Label className="text-[10px] text-muted-foreground mb-0.5 block">Column</Label>
                                            <Select
                                                value={step.config.column || ''}
                                                onValueChange={(val) => updateConfig(step.id, { column: val })}
                                            >
                                                <SelectTrigger className="h-7 text-xs">
                                                    <SelectValue placeholder="Column" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {columns.map((col) => (
                                                        <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex-1 min-w-[80px] sm:min-w-[100px]">
                                            <Label className="text-[10px] text-muted-foreground mb-0.5 block">Target Type</Label>
                                            <Select
                                                value={step.config.targetType || 'string'}
                                                onValueChange={(val) => updateConfig(step.id, { targetType: val })}
                                            >
                                                <SelectTrigger className="h-7 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {TARGET_TYPES.map((t) => (
                                                        <SelectItem key={t} value={t} className="text-xs capitalize">{t}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </>
                                )}

                                {(step.type === 'aggregate' || step.type === 'group_by') && (
                                    <>
                                        <div className="flex-1 min-w-[100px] sm:min-w-[120px]">
                                            <Label className="text-[10px] text-muted-foreground mb-0.5 block">Group Column</Label>
                                            <Select
                                                value={step.config.columns?.[0] || ''}
                                                onValueChange={(val) => updateConfig(step.id, { columns: [val] })}
                                            >
                                                <SelectTrigger className="h-7 text-xs">
                                                    <SelectValue placeholder="Column" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {columns.map((col) => (
                                                        <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {step.type === 'aggregate' && (
                                            <div className="flex-1 min-w-[80px] sm:min-w-[100px]">
                                                <Label className="text-[10px] text-muted-foreground mb-0.5 block">Function</Label>
                                                <Select
                                                    value={step.config.method || 'sum'}
                                                    onValueChange={(val) => updateConfig(step.id, { method: val })}
                                                >
                                                    <SelectTrigger className="h-7 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {AGG_FUNCTIONS.map((f) => (
                                                            <SelectItem key={f} value={f} className="text-xs capitalize">{f}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
