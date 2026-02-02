import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { OrgService } from '@/lib/services/org.service';

const joinSchema = z.object({
    token: z.string(),
});

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const validation = joinSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid input', details: validation.error }, { status: 400 });
        }

        const { token } = validation.data;

        const result = await OrgService.joinViaInvite(userId, token);

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Join Org Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to join organization' }, { status: 400 });
    }
}
