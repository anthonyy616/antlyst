'use client';

import { useSidebar } from '@/context/SidebarContext';
import { Sidebar } from '@/components/Sidebar';
import { ProtectedHeader } from '@/components/ProtectedHeader';
import { cn } from '@/lib/utils';
import React from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { ObservabilityPanel } from '@/components/ObservabilityPanel';

export function ProtectedLayoutClient({ children }: { children: React.ReactNode }) {
    const { isCollapsed } = useSidebar();

    return (
        <ErrorBoundary>
          <div className="h-full relative">
            <div className={cn(
                "hidden h-full md:flex md:flex-col md:fixed md:inset-y-0 z-[80] bg-gray-900 transition-all duration-300",
                isCollapsed ? "md:w-20" : "md:w-72"
            )}>
                <Sidebar />
            </div>
            <main className={cn(
                "flex flex-col min-h-screen transition-all duration-300",
                isCollapsed ? "md:pl-20" : "md:pl-72"
            )}>
                <ProtectedHeader />
                <div className="min-w-0 flex-1 p-2 sm:p-3 md:p-6">
                    {children}
                </div>
            </main>
          </div>
        </ErrorBoundary>
    );
}
