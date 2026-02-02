import { ChatWindow } from '@/components/ChatWindow';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

import { ChatWindow } from '@/components/ChatWindow';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

interface ChatPageProps {
    searchParams: { [key: string]: string | string[] | undefined };
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
    const { userId } = await auth();
    if (!userId) redirect("/sign-in");

    // Fetch all user organizations
    const memberships = await prisma.orgMembership.findMany({
        where: { userId },
        include: { organization: true },
        orderBy: { organization: { name: 'asc' } }
    });

    if (memberships.length === 0) {
        redirect("/organization");
    }

    // Determine active org
    const orgIdParam = typeof searchParams.orgId === 'string' ? searchParams.orgId : undefined;
    const activeMembership = orgIdParam
        ? memberships.find(m => m.organizationId === orgIdParam)
        : memberships[0];

    // If param provided but invalid, redirect to first
    if (orgIdParam && !activeMembership) {
        redirect("/chat");
    }

    const activeOrg = activeMembership?.organization;
    const channelId = activeOrg ? `org-${activeOrg.id}-general` : '';

    return (
        <div className="container py-4 max-w-6xl mx-auto h-[calc(100vh-80px)] flex flex-col md:flex-row gap-4">
            {/* Org Sidebar / Switcher */}
            <div className="w-full md:w-64 flex flex-col gap-2 shrink-0">
                <h2 className="text-xl font-bold mb-2 hidden md:block">Organizations</h2>
                <div className="flex overflow-x-auto md:flex-col gap-2 pb-2 md:pb-0">
                    {memberships.map((m) => (
                        <Link key={m.organizationId} href={`/chat?orgId=${m.organizationId}`}>
                            <Button
                                variant={activeOrg?.id === m.organizationId ? "default" : "outline"}
                                className="w-full justify-start gap-2 whitespace-nowrap"
                            >
                                <MessageSquare className="w-4 h-4" />
                                {m.organization.name}
                            </Button>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col min-h-0 bg-background border rounded-lg shadow-sm overflow-hidden">
                {activeOrg ? (
                    <>
                        <div className="p-4 border-b bg-muted/30">
                            <h1 className="text-lg font-semibold flex items-center gap-2">
                                <span className="opacity-50">#</span> general
                                <span className="text-sm font-normal text-muted-foreground ml-auto">
                                    {activeOrg.name}
                                </span>
                            </h1>
                        </div>
                        <div className="flex-1 min-h-0">
                            <ChatWindow channelId={channelId} />
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        Select an organization to start chatting.
                    </div>
                )}
            </div>
        </div>
    );
}
