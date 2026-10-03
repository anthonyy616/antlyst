'use client';

import dynamic from 'next/dynamic';
import { ModeToggle } from '@/components/mode-toggle';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';
import { MobileSidebar } from '@/components/Sidebar';

const UserButton = dynamic(
    () => import('@clerk/nextjs').then((mod) => mod.UserButton),
    { ssr: false }
);

export function ProtectedHeader() {
    return (
        <header className="flex items-center p-3 sm:p-4 border-b gap-2 sm:gap-4">
            <MobileSidebar />
            <div className="flex w-full justify-end">
                <nav className="flex items-center gap-1 sm:gap-2">
                    <NotificationsDropdown />
                    <ModeToggle />
                    <UserButton afterSignOutUrl="/" />
                </nav>
            </div>
        </header>
    );
}
