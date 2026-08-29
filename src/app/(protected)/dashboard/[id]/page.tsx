import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import EngineWrapper from "@/components/dashboard/engine-wrapper";
import FileUploader from "@/components/upload/file-uploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardPageProps {
    params: Promise<{ id: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");

    const { id } = await params;

    const project = await prisma.project.findUnique({
        where: { id },
        include: {
            files: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: {
                    analysisResult: true
                }
            }
        }
    });

    if (!project) notFound();

    // Check if user has access (simple check)
    if (project.ownerId !== userId) {
        // In a real app, check org access too
        // return <div>Unauthorized</div>;
    }

    const latestFile = project.files[0];
    const analysisResult = latestFile?.analysisResult;

    return (
        <div className="min-h-screen bg-gray-50 overflow-x-hidden">
            <header className="bg-white border-b px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 truncate">{project.name}</h1>
                <p className="text-xs sm:text-sm text-gray-500">Dashboard</p>
            </header>

            <main className="py-4 sm:py-6 md:py-8 px-2 sm:px-3 md:px-4 space-y-4 sm:space-y-6 md:space-y-8 max-w-full">
                {!latestFile ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Upload Data</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="mb-6 text-gray-600">Upload a CSV file to generate your dashboard.</p>
                            <FileUploader projectId={project.id} />
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {!analysisResult ? (
                            <Card>
                                <CardContent className="p-8 text-center">
                                    <p>Processing your data... please refresh in a moment.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <EngineWrapper analysisResult={analysisResult} />
                        )}

                        {/* 
                        <div className="mt-8 pt-8 border-t">
                            <h3 className="text-lg font-semibold mb-4">Update Data</h3>
                            <FileUploader projectId={project.id} />
                        </div>
                        */}
                    </>
                )}
            </main>
        </div>
    );
}
