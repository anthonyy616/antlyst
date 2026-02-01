import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Folder } from "lucide-react";

export default async function ProjectsPage() {
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");

    // Fetch user's projects
    const projects = await prisma.project.findMany({
        where: { ownerId: userId },
        orderBy: { updatedAt: 'desc' }
    });

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">My Projects</h1>
                        <p className="text-gray-500">Manage your analytics dashboards</p>
                    </div>
                    <Link href="/projects/new">
                        <Button className="gap-2">
                            <Plus size={16} /> New Project
                        </Button>
                    </Link>
                </div>

                {projects.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-lg border border-dashed">
                        <Folder className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No projects yet</h3>
                        <p className="text-gray-500 mb-6">Create your first project to start analyzing data.</p>
                        <Link href="/projects/new">
                            <Button variant="outline">Create Project</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => (
                            <Link key={project.id} href={`/dashboard/${project.id}`}>
                                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Folder className="w-5 h-5 text-blue-500" />
                                            {project.name}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-gray-500 line-clamp-2">
                                            {project.description || "No description"}
                                        </p>
                                        <div className="mt-4 text-xs text-gray-400">
                                            Updated {new Date(project.updatedAt).toLocaleDateString()}
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
