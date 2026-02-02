import { ChatWindow } from '@/components/ChatWindow';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function ChatPage() {
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");

    // Check if user is part of any organization
    const membership = await prisma.orgMembership.findFirst({
        where: { userId },
        include: { organization: true }
    });

    if (!membership) {
        redirect("/organization");
    }

    // Use organization specific channel
    const channelId = `org-${membership.organizationId}-general`;

    return (
        <div className="container py-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Team Chat</h1>
            <p className="text-muted-foreground mb-4">
                Chatting in <strong>{membership.organization.name}</strong>
            </p>
            <ChatWindow channelId={channelId} />
        </div>
    );
}
