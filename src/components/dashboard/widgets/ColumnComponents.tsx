'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ColumnMeta } from '@/lib/column-validator';

// ── Column Type Badge ──────────────────────────────────────────────────

export function ColumnTypeBadge({ type }: { type: string }) {
    const config: Record<string, { label: string; color: string }> = {
        numeric: { label: '123', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
        categorical: { label: 'ABC', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
        datetime: { label: '📅', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
        boolean: { label: '✓', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
        id: { label: '🔑', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
        unknown: { label: '?', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500' },
    };

    const { label, color } = config[type] || config.unknown;

    return (
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${color}`}>
            {label}
        </span>
    );
}

// ── Grouped Column Select ──────────────────────────────────────────────

interface GroupedColumnSelectProps {
    columns: string[];
    columnMeta?: Record<string, ColumnMeta>;
    value: string;
    onChange: (value: string) => void;
    filter?: (meta: ColumnMeta) => boolean;
    placeholder?: string;
    className?: string;
}

export function GroupedColumnSelect({
    columns,
    columnMeta,
    value,
    onChange,
    filter,
    placeholder = 'Select column',
    className,
}: GroupedColumnSelectProps) {
    const groups = useMemo(() => {
        const grouped: Record<string, string[]> = {
            numeric: [],
            categorical: [],
            datetime: [],
            boolean: [],
            other: [],
        };

        for (const col of columns) {
            const meta = columnMeta?.[col];
            if (filter && meta && !filter(meta)) continue;

            const type = meta?.type || 'unknown';
            if (type === 'numeric') grouped.numeric.push(col);
            else if (type === 'categorical' || type === 'id') grouped.categorical.push(col);
            else if (type === 'datetime') grouped.datetime.push(col);
            else if (type === 'boolean') grouped.boolean.push(col);
            else grouped.other.push(col);
        }

        return grouped;
    }, [columns, columnMeta, filter]);

    const hasMeta = columnMeta && Object.keys(columnMeta).length > 0;

    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className={className}>
                <SelectValue placeholder={placeholder}>
                    {value && hasMeta && (
                        <span className="flex items-center gap-2">
                            <ColumnTypeBadge type={columnMeta?.[value]?.type || 'unknown'} />
                            <span className="truncate">{value}</span>
                        </span>
                    )}
                    {value && !hasMeta && <span className="truncate">{value}</span>}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {hasMeta ? (
                    <>
                        {groups.numeric.length > 0 && (
                            <SelectGroup>
                                <SelectLabel className="text-xs">📊 Numeric</SelectLabel>
                                {groups.numeric.map(col => (
                                    <SelectItem key={col} value={col}>
                                        <span className="flex items-center gap-2">
                                            <ColumnTypeBadge type="numeric" />
                                            <span className="truncate">{col}</span>
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        )}
                        {groups.categorical.length > 0 && (
                            <SelectGroup>
                                <SelectLabel className="text-xs">📝 Categorical</SelectLabel>
                                {groups.categorical.map(col => (
                                    <SelectItem key={col} value={col}>
                                        <span className="flex items-center gap-2">
                                            <ColumnTypeBadge type="categorical" />
                                            <span className="truncate">{col}</span>
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        )}
                        {groups.datetime.length > 0 && (
                            <SelectGroup>
                                <SelectLabel className="text-xs">📅 Date/Time</SelectLabel>
                                {groups.datetime.map(col => (
                                    <SelectItem key={col} value={col}>
                                        <span className="flex items-center gap-2">
                                            <ColumnTypeBadge type="datetime" />
                                            <span className="truncate">{col}</span>
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        )}
                        {groups.boolean.length > 0 && (
                            <SelectGroup>
                                <SelectLabel className="text-xs">✓ Boolean</SelectLabel>
                                {groups.boolean.map(col => (
                                    <SelectItem key={col} value={col}>
                                        <span className="flex items-center gap-2">
                                            <ColumnTypeBadge type="boolean" />
                                            <span className="truncate">{col}</span>
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        )}
                        {groups.other.length > 0 && (
                            <SelectGroup>
                                <SelectLabel className="text-xs">Other</SelectLabel>
                                {groups.other.map(col => (
                                    <SelectItem key={col} value={col}>{col}</SelectItem>
                                ))}
                            </SelectGroup>
                        )}
                    </>
                ) : (
                    columns.map(col => (
                        <SelectItem key={col} value={col}>
                            <span className="truncate">{col}</span>
                        </SelectItem>
                    ))
                )}
            </SelectContent>
        </Select>
    );
}

// ── Formatted Cell ─────────────────────────────────────────────────────

export function FormattedCell({ value, columnMeta }: { value: any; columnMeta?: ColumnMeta }) {
    if (value === null || value === undefined || value === '') {
        return <span className="text-muted-foreground">—</span>;
    }

    if (!columnMeta) {
        return <span>{String(value)}</span>;
    }

    switch (columnMeta.type) {
        case 'numeric':
            return (
                <span className="tabular-nums text-right inline-block w-full">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </span>
            );
        case 'datetime':
            return (
                <span className="text-muted-foreground">
                    {new Date(value).toLocaleDateString()}
                </span>
            );
        case 'boolean':
            return (
                <Badge variant={value ? 'default' : 'secondary'} className="text-[10px]">
                    {value ? 'Yes' : 'No'}
                </Badge>
            );
        case 'categorical': {
            const str = String(value);
            if (str.length > 30) {
                return (
                    <span className="truncate max-w-[200px] inline-block" title={str}>
                        {str}
                    </span>
                );
            }
            return <span>{str}</span>;
        }
        case 'id':
            return (
                <span className="font-mono text-xs truncate max-w-[150px] inline-block" title={String(value)}>
                    {String(value)}
                </span>
            );
        default:
            return <span>{String(value)}</span>;
    }
}
