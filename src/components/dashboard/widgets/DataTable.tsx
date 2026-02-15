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

interface DataTableProps {
    title: string;
    data: any[];
    columns: string[];
}

export function DataTable({ title, data, columns }: DataTableProps) {
    return (
        <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900">
            <div className="px-4 py-2 border-b">
                <h3 className="text-sm font-semibold">{title}</h3>
            </div>
            <div className="flex-1 min-h-0 relative">
                <ScrollArea className="h-full w-full rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {columns.map((col) => (
                                    <TableHead key={col} className="w-[150px] whitespace-nowrap">
                                        {col}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.slice(0, 100).map((row, i) => ( // Limit to 100 for perf in widget
                                <TableRow key={i}>
                                    {columns.map((col) => (
                                        <TableCell key={`${i}-${col}`} className="font-medium whitespace-nowrap">
                                            {typeof row[col] === 'object' ? JSON.stringify(row[col]) : row[col]}
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
