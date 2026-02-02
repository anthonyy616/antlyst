'use client';

import { Share2, Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface ShareProjectButtonProps {
    projectId: string;
}

export function ShareProjectButton({ projectId }: ShareProjectButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent card click
        e.stopPropagation();

        const url = `${window.location.origin}/dashboard/${projectId}`;

        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-blue-500 bg-white/80 hover:bg-white shadow-sm"
            onClick={handleShare}
            title="Share Project Link"
        >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
        </Button>
    );
}
