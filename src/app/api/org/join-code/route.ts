import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { OrgService } from '@/lib/services/org.service';
import { z } from 'zod';

const joinCodeSchema = z.object({
    code: z.string().length(8),
});

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        const user = await currentUser();

        if (!userId || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const validation = joinCodeSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: 'Invalid code format (must be 8 characters)', details: validation.error }, { status: 400 });
        }

        const { code } = validation.data;

        const userDetails = {
            email: user.emailAddresses[0]?.emailAddress,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            imageUrl: user.imageUrl
        };

        // Convert code to uppercase as we store it strictly uppercase
        const result = await OrgService.joinViaCode(userId, code.toUpperCase(), userDetails);

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Join via Code Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to join organization' }, { status: 400 });
    }
}
