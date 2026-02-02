import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        return NextResponse.json({ notifications });

    } catch (error: any) {
        console.error('Fetch Notifications Error:', error);
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { notificationId } = body;

        if (notificationId) {
            // Mark single read
            await prisma.notification.update({
                where: { id: notificationId, userId }, // Ensure ownership
                data: { isRead: true }
            });
        } else {
            // Mark all read
            await prisma.notification.updateMany({
                where: { userId, isRead: false },
                data: { isRead: true }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
    }
}
