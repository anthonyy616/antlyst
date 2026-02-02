import { prisma } from '@/lib/prisma';
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { XCircle } from 'lucide-react';
import Link from 'next/link';
import { InviteCard } from '@/components/InviteCard';

export default async function InvitePage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;
    const { userId } = await auth();
    const user = await currentUser();

    if (!userId || !user) {
        redirect(`/sign-in?redirect_url=/invite/${token}`);
    }

    // 1. Validate Invite
    const invite = await prisma.orgInviteLink.findUnique({
        where: { token },
        include: { organization: true }
    });

    if (!invite) {
        return <ErrorState message="Invalid invite link." />;
    }

    if (invite.isRevoked) {
        return <ErrorState message="This invite has been revoked." />;
    }

    if (new Date() > invite.expiresAt) {
        return <ErrorState message="This invite has expired." />;
    }

    if (invite.uses >= invite.maxUses) {
        return <ErrorState message="This invite has reached its maximum usage limit." />;
    }

    // Check if creator name is available (optional)
    let inviterName = null;
    if (invite.creatorId) {
        // Try to fetch creator name if in our DB
        const creator = await prisma.user.findUnique({
            where: { id: invite.creatorId },
            select: { name: true, email: true }
        });
        inviterName = creator?.name || creator?.email;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <InviteCard
                token={token}
                orgName={invite.organization.name}
                inviterName={inviterName}
            />
        </div>
    );
}

function ErrorState({ message }: { message: string }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="max-w-md w-full p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <div>
                    <h1 className="text-xl font-bold mb-2">Invite Error</h1>
                    <p className="text-muted-foreground">{message}</p>
                </div>
                <Link href="/">
                    <Button variant="outline" className="w-full">
                        Back to Home
                    </Button>
                </Link>
            </Card>
        </div>
    );
}
