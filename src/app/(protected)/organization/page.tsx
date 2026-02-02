'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@clerk/nextjs';
import { Plus, Users, Loader2, Copy, Shield, MoreVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Org {
    id: string;
    name: string;
    slug: string;
    joinCode?: string;
    role: string;
    memberCount: number;
}

interface Member {
    userId: string;
    name: string;
    email: string;
    imageUrl: string;
    role: 'owner' | 'admin' | 'member';
    joinedAt: string;
}

export default function OrganizationPage() {
    const { user } = useUser();
    const [orgs, setOrgs] = useState<Org[]>([]);
    const [loading, setLoading] = useState(true);

    // Create Form
    const [newName, setNewName] = useState('');
    const [createLoading, setCreateLoading] = useState(false);

    // Join Form
    const [joinCode, setJoinCode] = useState('');
    const [joinLoading, setJoinLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchOrgs();
    }, []);

    const fetchOrgs = async () => {
        try {
            const res = await fetch('/api/org');
            if (res.ok) {
                const data = await res.json();
                setOrgs(data.organizations || []);
            }
        } catch (e) {
            console.error("Failed to fetch orgs", e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setCreateLoading(true);

        try {
            const res = await fetch('/api/org', {
                method: 'POST',
                body: JSON.stringify({ name: newName }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create organization');
            }

            setNewName('');
            fetchOrgs(); // Refresh list
        } catch (err: any) {
            setError(err.message);
        } finally {
            setCreateLoading(false);
        }
    };

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setJoinLoading(true);

        try {
            const res = await fetch('/api/org/join-code', {
                method: 'POST',
                body: JSON.stringify({ code: joinCode }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to join organization');
            }

            setJoinCode('');
            fetchOrgs();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setJoinLoading(false);
        }
    };

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
    };

    if (loading) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="container max-w-5xl py-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
                    <p className="text-muted-foreground">Manage your teams and memberships.</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-md text-sm">
                    {error}
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
                {/* Create Org */}
                <Card>
                    <CardHeader>
                        <CardTitle>Create Organization</CardTitle>
                        <CardDescription>
                            Start a new team. Limit: 2 per user.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    placeholder="Organization Name"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    disabled={createLoading}
                                />
                            </div>
                            <Button className="w-full" type="submit" disabled={createLoading || !newName.trim()}>
                                {createLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                Create Organization
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Join Org */}
                <Card>
                    <CardHeader>
                        <CardTitle>Join Organization</CardTitle>
                        <CardDescription>
                            Enter the 8-digit code shared by your admin.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleJoin} className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    placeholder="e.g. A1B2C3D4"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                    maxLength={8}
                                    disabled={joinLoading}
                                />
                            </div>
                            <Button className="w-full" variant="secondary" type="submit" disabled={joinLoading || joinCode.length !== 8}>
                                {joinLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                                Join Team
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>

            {/* List Orgs */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold">My Organizations</h2>
                {orgs.length === 0 ? (
                    <div className="text-center py-12 border rounded-lg bg-slate-50">
                        <Users className="mx-auto h-12 w-12 text-gray-300" />
                        <h3 className="mt-2 text-sm font-semibold text-gray-900">No organizations</h3>
                        <p className="mt-1 text-sm text-gray-500">Create one or join an existing team.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {orgs.map((org) => (
                            <Card key={org.id} className="relative">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg">{org.name}</CardTitle>
                                        <Badge variant={org.role === 'owner' ? 'default' : 'secondary'}>
                                            {org.role}
                                        </Badge>
                                    </div>
                                    <CardDescription>
                                        {org.memberCount} members
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pb-2 space-y-4">
                                    {org.joinCode && (
                                        <>
                                            <div>
                                                <div className="text-xs text-muted-foreground uppercase font-semibold mb-1">
                                                    Join Code
                                                </div>
                                                <div className="flex items-center gap-2 bg-slate-100 p-2 rounded text-sm font-mono border border-slate-200">
                                                    <span className="text-black font-bold tracking-widest">{org.joinCode}</span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => copyCode(org.joinCode!)}>
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Manage Members Dialog */}
                                            {org.role === 'owner' && (
                                                <div className="flex gap-2 mt-2">
                                                    <ManageMembersDialog org={org} />
                                                    <DeleteOrgDialog orgId={org.id} orgName={org.name} onDeleted={fetchOrgs} />
                                                </div>
                                            )}
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function ManageMembersDialog({ org }: { org: Org }) {
    const [open, setOpen] = useState(false);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (open) {
            fetchMembers();
        }
    }, [open]);

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/org/members?organizationId=${org.id}`);
            if (res.ok) {
                const data = await res.json();
                setMembers(data.members || []);
            }
        } catch (e) {
            console.error("Fetch members error", e);
        } finally {
            setLoading(false);
        }
    };

    const updateRole = async (memberId: string, newRole: 'admin' | 'member') => {
        try {
            const res = await fetch('/api/org/members', {
                method: 'PATCH',
                body: JSON.stringify({
                    organizationId: org.id,
                    memberId,
                    newRole
                })
            });

            if (res.ok) {
                fetchMembers(); // Refresh
            } else {
                alert("Failed to update role");
            }
        } catch (e) {
            console.error("Update role error", e);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full mt-2">
                    <Shield className="w-4 h-4 mr-2" />
                    Manage Team
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Manage Members</DialogTitle>
                    <DialogDescription>
                        Manage roles for <strong>{org.name}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div>
                    ) : (
                        members.map(member => (
                            <div key={member.userId} className="flex items-center justify-between p-2 border rounded hover:bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={member.imageUrl} />
                                        <AvatarFallback>{member.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-medium leading-none">{member.name}</p>
                                        <p className="text-xs text-muted-foreground">{member.role}</p>
                                    </div>
                                </div>

                                {member.role !== 'owner' && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {member.role === 'member' ? (
                                                <DropdownMenuItem onClick={() => updateRole(member.userId, 'admin')}>
                                                    Promote to Admin
                                                </DropdownMenuItem>
                                            ) : (
                                                <DropdownMenuItem onClick={() => updateRole(member.userId, 'member')}>
                                                    Demote to Member
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function DeleteOrgDialog({ orgId, orgName, onDeleted }: { orgId: string, orgName: string, onDeleted: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [param, setParam] = useState('');

    const handleDelete = async () => {
        if (param !== 'DELETE') return;
        setLoading(true);
        try {
            const res = await fetch('/api/org', {
                method: 'DELETE',
                body: JSON.stringify({ organizationId: orgId }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.ok) {
                setOpen(false);
                onDeleted();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete');
            }
        } catch (e) {
            console.error(e);
            alert('Error deleting organization');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-full">
                    <Shield className="w-4 h-4 mr-2" />
                    Delete Team
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Organization</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete <strong>{orgName}</strong>? This action cannot be undone.
                        All projects and data within this organization will be permanently lost.
                        <br /><br />
                        Type <strong>DELETE</strong> to confirm.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    <Input
                        value={param}
                        onChange={(e) => setParam(e.target.value)}
                        placeholder="Type DELETE"
                    />
                    <Button
                        variant="destructive"
                        className="w-full"
                        disabled={loading || param !== 'DELETE'}
                        onClick={handleDelete}
                    >
                        {loading ? <Loader2 className="animate-spin mr-2" /> : 'Delete Organization'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
