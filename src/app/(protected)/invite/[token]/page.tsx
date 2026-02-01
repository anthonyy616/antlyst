import { prisma } from '@/lib/prisma';
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { clerkClient } from '@clerk/nextjs/server';

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
    const invite = await prisma.invite.findUnique({
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

    // 2. Add User to Organization (Clerk + Local DB)
    // Note: Clerk Org membership management via API 
    // We need to fetch the Clerk Org ID (which matches invite.organizationId)
    // And add the user.

    try {
        const client = await clerkClient();

        // Add to Clerk Organization
        await client.organizations.createOrganizationMembership({
            organizationId: invite.organizationId,
            userId: userId,
            role: 'basic_member', // Default role
        });

        // 3. Update Invite Usage locally
        await prisma.invite.update({
            where: { id: invite.id },
            data: { uses: { increment: 1 } }
        });

        // 4. Update User's active org metadata or db record if needed (Sync handled by webhook usually)
        // Ensure local user record has orgId if it was empty?
        await prisma.user.update({
            where: { id: userId },
            data: { organizationId: invite.organizationId }
        });

    } catch (error: any) {
        // If user is already in org, Clerk might throw. We can ignore or handle gracefully.
        const msg = error.errors?.[0]?.message || error.message;
        if (!msg?.includes('already a member')) {
            console.error("Failed to join org:", error);
            return <ErrorState message="Failed to join organization. Please try again." />;
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="max-w-md w-full p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold mb-2">Welcome to {invite.organization.name}!</h1>
                    <p className="text-muted-foreground">
                        You have successfully joined the team.
                    </p>
                </div>
                <Link href={`/${invite.organizationId}/projects`}>
                    <Button className="w-full bg-brand-purple hover:bg-brand-purple/90 text-white">
                        Go to Dashboard
                    </Button>
                </Link>
            </Card>
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
