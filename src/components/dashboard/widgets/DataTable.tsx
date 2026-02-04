import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DataTableProps {
    title: string;
    data: any[];
    columns: string[];
}

export function DataTable({ title, data, columns }: DataTableProps) {
    return (
        <Card className="h-full flex flex-col overflow-hidden">
            <CardHeader className="pb-2 flex-shrink-0">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
                <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                            {columns.map((col) => (
                                <TableHead key={col} className="whitespace-nowrap">{col}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.slice(0, 50).map((row, i) => (
                            <TableRow key={i}>
                                {columns.map((col) => (
                                    <TableCell key={`${i}-${col}`} className="whitespace-nowrap">
                                        {row[col]}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
