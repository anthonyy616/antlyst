import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, checkOrgAccess } from '@/lib/auth';
import { randomBytes } from 'crypto';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ orgId: string }> }
) {
    const { orgId } = await context.params;
    const { userId, orgId: userOrgId } = await requireAuth();

    // Verify user belongs to this org
    if (orgId !== userOrgId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generate a secure random token
    const token = randomBytes(16).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    try {
        const invite = await prisma.invite.create({
            data: {
                token,
                organizationId: orgId,
                creatorId: userId,
                expiresAt,
            }
        });

        // Return the full shareable URL
        // In prod, use process.env.NEXT_PUBLIC_APP_URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const link = `${baseUrl}/invite/${token}`;

        return NextResponse.json({ link, token, expiresAt });
    } catch (error) {
        console.error("Invite generation failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
