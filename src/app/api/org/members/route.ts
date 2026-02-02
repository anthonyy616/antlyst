import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateRoleSchema = z.object({
    organizationId: z.string(),
    memberId: z.string(), // This is the userId of the member
    newRole: z.enum(['admin', 'member']),
});

const getMembersSchema = z.object({
    organizationId: z.string(),
});

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const organizationId = searchParams.get('organizationId');

        if (!organizationId) {
            return NextResponse.json({ error: 'Org ID required' }, { status: 400 });
        }

        // 1. Verify Access
        const membership = await prisma.orgMembership.findUnique({
            where: { userId_organizationId: { userId, organizationId } }
        });

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // 2. Fetch Members
        const members = await prisma.orgMembership.findMany({
            where: { organizationId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        imageUrl: true
                    }
                }
            },
            orderBy: { role: 'asc' } // owner, then member
        });

        // 3. Format
        const formattedMembers = members.map(m => ({
            userId: m.userId,
            name: m.user.name,
            email: m.user.email,
            imageUrl: m.user.imageUrl,
            role: m.role,
            joinedAt: m.createdAt
        }));

        return NextResponse.json({ members: formattedMembers });

    } catch (error: any) {
        console.error("Fetch Members Error:", error);
        return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }
}
export async function PATCH(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const validation = updateRoleSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid input', details: validation.error }, { status: 400 });
        }

        const { organizationId, memberId, newRole } = validation.data;

        // 1. Verify Requester is Owner
        const requesterMembership = await prisma.orgMembership.findUnique({
            where: {
                userId_organizationId: {
                    userId,
                    organizationId
                }
            }
        });

        if (!requesterMembership || requesterMembership.role !== 'owner') {
            return NextResponse.json({ error: 'Only owners can manage roles' }, { status: 403 });
        }

        // 2. Prevent changing own role (Owner cannot demote themselves here, simple safety)
        if (memberId === userId) {
            return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
        }

        // 3. Update Target Member Role
        await prisma.orgMembership.update({
            where: {
                userId_organizationId: {
                    userId: memberId,
                    organizationId
                }
            },
            data: { role: newRole }
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Update Role Error:", error);
        return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }
}
