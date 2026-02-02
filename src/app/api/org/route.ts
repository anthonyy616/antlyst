import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { OrgService } from '@/lib/services/org.service';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const createOrgSchema = z.object({
    name: z.string().min(3).max(50),
});

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        const user = await currentUser();

        if (!userId || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const validation = createOrgSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid input', details: validation.error }, { status: 400 });
        }

        const { name } = validation.data;

        const userDetails = {
            email: user.emailAddresses[0]?.emailAddress,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            imageUrl: user.imageUrl
        };

        const org = await OrgService.createOrganization(userId, name, userDetails);

        return NextResponse.json({ success: true, organization: org });

    } catch (error: any) {
        console.error('Create Org Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to create organization' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch User's Memberships with Org Details
        const memberships = await prisma.orgMembership.findMany({
            where: { userId },
            include: {
                organization: {
                    include: {
                        _count: {
                            select: { members: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const organizations = memberships.map(m => {
            const canManage = ['owner', 'admin'].includes(m.role);
            return {
                id: m.organization.id,
                name: m.organization.name,
                slug: m.organization.slug,
                joinCode: canManage ? m.organization.joinCode : undefined, // Only show if admin/owner
                role: m.role,
                memberCount: m.organization._count.members,
                createdAt: m.organization.createdAt
            };
        });

        return NextResponse.json({ organizations });

    } catch (error: any) {
        console.error("Fetch Orgs Error:", error);
        return NextResponse.json({ error: "Failed to fetch organizations" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { organizationId } = body;

        if (!organizationId) {
            return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 });
        }

        await OrgService.deleteOrganization(userId, organizationId);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Delete Org Error:", error);
        return NextResponse.json({ error: error.message || "Failed to delete organization" }, { status: 500 });
    }
}
