import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { name, description } = await req.json();

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 });
        }

        let user = await prisma.user.findUnique({
            where: { id: userId },
            include: { organization: true }
        });

        // If user doesn't exist in our DB (first login), create them
        if (!user) {
            // Create organization first
            const org = await prisma.organization.create({
                data: {
                    id: `org_${userId}`,
                    name: "Personal Workspace",
                    slug: `personal-${userId}`,
                }
            });

            // Then create user
            user = await prisma.user.create({
                data: {
                    id: userId,
                    email: `user_${userId}@placeholder.com`, // Placeholder email since we don't have it
                    organizationId: org.id
                },
                include: { organization: true }
            });
        }

        // If user still has no org (shouldn't happen with above logic), create one
        if (!user.organizationId) {
            const org = await prisma.organization.create({
                data: {
                    id: `org_${userId}`,
                    name: "Personal Workspace",
                    slug: `personal-${userId}`,
                }
            });
            user = await prisma.user.update({
                where: { id: userId },
                data: { organizationId: org.id },
                include: { organization: true }
            });
        }

        const project = await prisma.project.create({
            data: {
                name,
                description,
                ownerId: userId,
                organizationId: user.organizationId!,
                status: "ready",
            },
        });

        return NextResponse.json(project);
    } catch (error) {
        console.error("Error creating project:", error);
        return NextResponse.json(
            { error: "Failed to create project" },
            { status: 500 }
        );
    }
}


export async function DELETE(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
        }

        // Verify ownership
        const project = await prisma.project.findUnique({
            where: { id },
        });

        if (!project || project.ownerId !== userId) {
            return NextResponse.json({ error: "Project not found or unauthorized" }, { status: 404 });
        }

        await prisma.project.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting project:", error);
        return NextResponse.json(
            { error: "Failed to delete project" },
            { status: 500 }
        );
    }
}
