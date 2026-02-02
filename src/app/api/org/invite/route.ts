import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { OrgService } from '@/lib/services/org.service';
import { prisma } from '@/lib/prisma'; // Helper to fetch orgId if not passed? 
// Actually, usually headers or context or passed in body.
// For now, let's expect organizationId in body.

const createInviteSchema = z.object({
    organizationId: z.string(),
});

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const validation = createInviteSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid input', details: validation.error }, { status: 400 });
        }

        const { organizationId } = validation.data;

        // Note: OrgService checks authorization (owner/admin) inside createInvite
        const invite = await OrgService.createInvite(userId, organizationId);

        return NextResponse.json({ success: true, invite });

    } catch (error: any) {
        console.error('Create Invite Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to create invite' }, { status: 500 }); // Service throws meaningful errors
    }
}
