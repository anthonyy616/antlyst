import { prisma } from "@/lib/prisma";
import { OrgService } from "@/lib/services/org.service";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Users, AlertCircle } from "lucide-react";
import JoinButton from "@/app/join/[code]/JoinButton"; // Client component
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface InvitePageProps {
    params: Promise<{
        code: string;
    }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
    const { code } = await params;

    // Normalize code
    const normalizedCode = code.toUpperCase();

    // Fetch Org Details
    const org = await OrgService.getOrgByCode(normalizedCode);

    if (!org) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <AlertCircle className="w-6 h-6 text-red-600" />
                        </div>
                        <CardTitle className="text-xl">Invalid Join Link</CardTitle>
                        <CardDescription>
                            We couldn't find an organization associated with this code. The link might be incorrect or expired.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-center">
                        <Link href="/">
                            <Button variant="outline">Go Home</Button>
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    const user = await currentUser();

    if (!user) {
        // Redirect to sign in, preserving the return url
        const returnUrl = encodeURIComponent(`/join/${code}`);
        redirect(`/sign-in?redirect_url=${returnUrl}`);
    }

    // Check if already a member
    const existingMembership = await prisma.orgMembership.findUnique({
        where: {
            userId_organizationId: {
                userId: user.id,
                organizationId: org.id
            }
        }
    });

    if (existingMembership) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <Users className="w-6 h-6 text-green-600" />
                        </div>
                        <CardTitle>You're already a member!</CardTitle>
                        <CardDescription>
                            You belong to <strong>{org.name}</strong>.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-center">
                        <Link href={`/${org.id}/projects`}>
                            <Button>Go to Dashboard</Button>
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto w-16 h-16 bg-brand-purple/10 rounded-full flex items-center justify-center mb-4">
                        <Users className="w-8 h-8 text-brand-purple" />
                    </div>
                    <CardTitle className="text-2xl">You've been invited!</CardTitle>
                    <CardDescription>
                        Join <strong>{org.name}</strong> on Antlyst.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-slate-100 p-4 rounded-lg flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Current Members</span>
                        <span className="font-semibold text-foreground">{org._count.members} / 5</span>
                    </div>

                    {org._count.members >= 5 && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Organization Full</AlertTitle>
                            <AlertDescription>
                                This organization has reached its 5-member limit. You cannot join at this time.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                    <JoinButton
                        code={normalizedCode}
                        disabled={org._count.members >= 5}
                    />
                    <Link href="/" className="w-full">
                        <Button variant="ghost" className="w-full">Cancel</Button>
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
