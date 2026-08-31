import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getOrgMembers, updateMemberRole, removeMember, type OrgRole } from '@/lib/rbac';
import { z } from 'zod';

const updateRoleSchema = z.object({
    userId: z.string().min(1),
    role: z.enum(['owner', 'admin', 'editor', 'viewer']),
});

const removeMemberSchema = z.object({
    userId: z.string().min(1),
});

export async function GET(request: NextRequest) {
    try {
        const { userId, orgId } = await auth();
        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const members = await getOrgMembers(orgId);
        return NextResponse.json({ members });
    } catch (error: any) {
        console.error('List members error:', error);
        return NextResponse.json({ error: 'Failed to list members' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const { userId, orgId } = await auth();
        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const validation = updateRoleSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: validation.error.issues },
                { status: 400 }
            );
        }

        const { userId: targetUserId, role } = validation.data;
        await updateMemberRole(orgId, targetUserId, role as OrgRole, userId);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Update role error:', error);
        return NextResponse.json({ error: error.message || 'Failed to update role' }, { status: 400 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { userId, orgId } = await auth();
        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const validation = removeMemberSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: validation.error.issues },
                { status: 400 }
            );
        }

        const { userId: targetUserId } = validation.data;
        await removeMember(orgId, targetUserId, userId);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Remove member error:', error);
        return NextResponse.json({ error: error.message || 'Failed to remove member' }, { status: 400 });
    }
}
