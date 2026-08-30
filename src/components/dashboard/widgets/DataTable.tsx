'use client';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ColumnMeta } from "@/lib/column-validator";
import { ColumnTypeBadge, FormattedCell } from "./ColumnComponents";

interface DataTableProps {
    title: string;
    data: any[];
    columns: string[];
    columnMeta?: Record<string, ColumnMeta>;
}

export function DataTable({ title, data, columns, columnMeta }: DataTableProps) {
    const numericCount = columnMeta ? columns.filter(c => columnMeta[c]?.type === 'numeric').length : 0;
    const categoricalCount = columnMeta ? columns.filter(c => columnMeta[c]?.type === 'categorical' || columnMeta[c]?.type === 'id').length : 0;
    const datetimeCount = columnMeta ? columns.filter(c => columnMeta[c]?.type === 'datetime').length : 0;

    return (
        <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900">
            <div className="px-4 py-2 border-b flex items-center justify-between">
                <h3 className="text-sm font-semibold truncate">{title}</h3>
                {columnMeta && (
                    <div className="flex gap-1.5 shrink-0">
                        {numericCount > 0 && (
                            <Badge variant="outline" className="text-[10px] gap-1">
                                <span className="text-blue-500"></span> {numericCount}
                            </Badge>
                        )}
                        {categoricalCount > 0 && (
                            <Badge variant="outline" className="text-[10px] gap-1">
                                <span className="text-green-500"></span> {categoricalCount}
                            </Badge>
                        )}
                        {datetimeCount > 0 && (
                            <Badge variant="outline" className="text-[10px] gap-1">
                                <span className="text-purple-500"></span> {datetimeCount}
                            </Badge>
                        )}
                    </div>
                )}
            </div>
            <div className="flex-1 min-h-0 relative">
                <ScrollArea className="h-full w-full rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {columns.map((col) => (
                                    <TableHead key={col} className="whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            {columnMeta && <ColumnTypeBadge type={columnMeta[col]?.type || 'unknown'} />}
                                            <span className="truncate max-w-[150px]">{col}</span>
                                        </div>
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.slice(0, 100).map((row, i) => (
                                <TableRow key={i}>
                                    {columns.map((col) => (
                                        <TableCell
                                            key={`${i}-${col}`}
                                            className={`whitespace-nowrap ${
                                                columnMeta?.[col]?.type === 'numeric' ? 'text-right' : ''
                                            }`}
                                        >
                                            <FormattedCell value={row[col]} columnMeta={columnMeta?.[col]} />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
        </div>
    );
}
