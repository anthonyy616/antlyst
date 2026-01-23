"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, Check, Copy, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InviteButton({ orgId }: { orgId: string }) {
    const [inviteLink, setInviteLink] = useState("");
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const generateInvite = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/organizations/${orgId}/invite`, {
                method: 'POST'
            });
            if (!res.ok) throw new Error("Failed to create invite");
            const data = await res.json();
            setInviteLink(data.link);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="hidden md:flex gap-2">
                    <UserPlus className="h-4 w-4" />
                    Invite Member
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Invite to Organization</DialogTitle>
                    <DialogDescription>
                        Generate a specialized link to add members to your team automatically.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col space-y-4 py-4">
                    {!inviteLink ? (
                        <div className="flex justify-center">
                            <Button onClick={generateInvite} disabled={loading} className="w-full">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Generate Invite Link
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label htmlFor="link">Share this link</Label>
                            <div className="flex items-center space-x-2">
                                <Input
                                    id="link"
                                    value={inviteLink}
                                    readOnly
                                    className="flex-1"
                                />
                                <Button size="sm" className="px-3" onClick={copyToClipboard}>
                                    {copied ? (
                                        <Check className="h-4 w-4" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                    <span className="sr-only">Copy</span>
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                This link expires in 7 days and can be used by multiple people.
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
