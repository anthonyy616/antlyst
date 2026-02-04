'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BarChart3, Users, MessageSquare, LayoutDashboard, FolderKanban, Menu, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { useState } from 'react';
import { useSidebar } from '@/context/SidebarContext';

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
        label: 'AI Analyst',
        icon: Sparkles,
        href: '/ai-chat',
        color: 'text-emerald-500',
    },
    {
        label: 'Organization',
        icon: Users,
        href: '/organization', // Placeholder for org settings if we make one
        color: 'text-orange-700',
    },
];

export function Sidebar({ forceExpand = false }: { forceExpand?: boolean }) {
    const pathname = usePathname();
    const { isCollapsed, toggle } = useSidebar();
    const collapsed = forceExpand ? false : isCollapsed;

    return (
        <div className={cn("space-y-4 py-4 flex flex-col h-full bg-slate-900 text-white transition-all duration-300", collapsed ? "items-center" : "")}>
            <div className="px-3 py-2 flex-1 w-full">
                <Link href="/projects" className={cn("flex items-center mb-14 transition-all duration-300", collapsed ? "justify-center pl-0" : "pl-3")}>
                    <div className="relative w-8 h-8 mr-0">
                        <BarChart3 className="w-8 h-8 text-brand-purple" />
                    </div>
                    {!collapsed && (
                        <h1 className="text-2xl font-bold ml-4">
                            Antlyst
                        </h1>
                    )}
                </Link>
                <div className="space-y-1">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                                pathname.startsWith(route.href) ? "text-white bg-white/10" : "text-zinc-400",
                                collapsed ? "justify-center" : ""
                            )}
                        >
                            <div className="flex items-center flex-1">
                                <route.icon className={cn("h-5 w-5", route.color, collapsed ? "mr-0" : "mr-3")} />
                                {!collapsed && route.label}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
            {/* Toggle Button (Desktop Only) */}
            {!forceExpand && (
                <div className="px-3 py-4 border-t border-slate-800">
                    <Button
                        onClick={toggle}
                        variant="ghost"
                        className="w-full justify-center"
                    >
                        {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                    </Button>
                </div>
            )}
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
                <SheetTitle className="sr-only">Sidebar</SheetTitle>
                <Sidebar forceExpand={true} />
            </SheetContent>
        </Sheet>
    );
}
