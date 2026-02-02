'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BarChart3, Users, MessageSquare, LayoutDashboard, FolderKanban, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';

const routes = [
    {
        label: 'Projects',
        icon: FolderKanban,
        href: '/projects',
        color: 'text-sky-500',
    },
    {
        label: 'Dashboards',
        icon: LayoutDashboard,
        href: '/dashboard',
        color: 'text-violet-500',
    },
    {
        label: 'Team Chat',
        icon: MessageSquare,
        href: '/chat',
        color: 'text-pink-700',
    },
    {
        label: 'Organization',
        icon: Users,
        href: '/organization', // Placeholder for org settings if we make one
        color: 'text-orange-700',
    },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="space-y-4 py-4 flex flex-col h-full bg-slate-900 text-white">
            <div className="px-3 py-2 flex-1">
                <Link href="/projects" className="flex items-center pl-3 mb-14">
                    <div className="relative w-8 h-8 mr-4">
                        <BarChart3 className="w-8 h-8 text-brand-purple" />
                    </div>
                    <h1 className="text-2xl font-bold">
                        Antlyst
                    </h1>
                </Link>
                <div className="space-y-1">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                                pathname.startsWith(route.href) ? "text-white bg-white/10" : "text-zinc-400"
                            )}
                        >
                            <div className="flex items-center flex-1">
                                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                                {route.label}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function MobileSidebar() {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 bg-slate-900 border-none text-white w-72">
                <Sidebar />
            </SheetContent>
        </Sheet>
    );
}
