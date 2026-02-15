import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function TableSkeleton() {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <TableHead key={i}>
                                <Skeleton className="h-4 w-20" />
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
                        <TableRow key={row}>
                            {[1, 2, 3, 4, 5].map((cell) => (
                                <TableCell key={cell}>
                                    <Skeleton className="h-4 w-full" />
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
