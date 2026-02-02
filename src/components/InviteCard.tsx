'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface InviteCardProps {
    token: string;
    orgName: string;
    inviterName?: string | null;
}

export function InviteCard({ token, orgName, inviterName }: InviteCardProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleJoin = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/org/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to join');
            }

            // Success - redirect to dashboard (or org home)
            router.push('/projects'); // Assuming projects view shows org context or dropdown
            router.refresh();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-card border rounded-xl p-8 shadow-lg max-w-md w-full text-center space-y-6">
            <div className="space-y-2">
                <h1 className="text-2xl font-bold">You've been invited!</h1>
                <p className="text-muted-foreground">
                    {inviterName || 'Someone'} has invited you to join <span className="font-semibold text-foreground">{orgName}</span> on Antlyst.
                </p>
            </div>

            {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                    {error}
                </div>
            )}

            <Button
                onClick={handleJoin}
                disabled={isLoading}
                className="w-full h-12 text-lg font-semibold bg-brand-purple hover:bg-brand-purple/90"
            >
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : 'Accept Invitation'}
            </Button>
        </div>
    );
}
