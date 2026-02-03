'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function JoinButton({ code, disabled }: { code: string, disabled?: boolean }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleJoin = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/org/join-code', {
                method: 'POST',
                body: JSON.stringify({ code }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                const data = await res.json();
                router.push('/organization');
            } else {
                const err = await res.json();
                alert(err.error || "Failed to join");
            }
        } catch (e) {
            console.error(e);
            alert("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            className="w-full bg-brand-purple hover:bg-brand-purple/90"
            size="lg"
            onClick={handleJoin}
            disabled={loading || disabled}
        >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Join Organization
        </Button>
    );
}
