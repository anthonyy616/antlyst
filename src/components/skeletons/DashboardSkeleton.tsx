import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardSkeleton() {
    return (
        <div className="space-y-6 container mx-auto py-6 px-4 max-w-[1600px]">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-24" />
                </div>
            </div>

            {/* KPI Section Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                        <CardHeader className="pb-2">
                            <Skeleton className="h-4 w-24" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-20 mb-1" />
                            <Skeleton className="h-3 w-16" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Grid Content Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                    <Card key={i} className="min-h-[400px]">
                        <CardHeader>
                            <Skeleton className="h-6 w-32" />
                        </CardHeader>
                        <CardContent className="h-[350px] flex items-center justify-center">
                            <Skeleton className="h-full w-full rounded-md" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
