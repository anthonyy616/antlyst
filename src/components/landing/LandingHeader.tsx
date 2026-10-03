"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';
import { BarChart3 } from 'lucide-react';

export function LandingHeader() {
    return (
        <header className="container mx-auto w-full px-4 py-4 sm:py-6 flex items-center justify-between gap-3 relative z-10">
            <div className="flex min-w-0 flex-col">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-brand-purple rounded-lg flex items-center justify-center">
                        <BarChart3 className="text-white w-5 h-5" />
                    </div>
                    <span className="text-lg sm:text-xl font-bold tracking-tight">Antlyst</span>
                </div>
                <span className="text-xs font-medium text-muted-foreground ml-10 -mt-1">Anthony + Analyst</span>
            </div>
            <div className="flex items-center gap-4">
                <ModeToggle />
                <Link href="/sign-in" className="shrink-0">
                    <Button variant="outline" size="sm" className="sm:h-10 sm:px-4">Sign In</Button>
                </Link>
            </div>
        </header>
    );
}
