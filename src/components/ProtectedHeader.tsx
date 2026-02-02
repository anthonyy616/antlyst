'use client';

import { UserButton } from '@clerk/nextjs';
import { ModeToggle } from '@/components/mode-toggle';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';
import { MobileSidebar } from '@/components/Sidebar';

export function ProtectedHeader() {
    return (
        <header className="flex items-center p-4 border-b gap-4">
            <MobileSidebar />
            <div className="flex w-full justify-end">
                <nav className="flex items-center gap-2">
                    <NotificationsDropdown />
                    <ModeToggle />
                    <UserButton afterSignOutUrl="/" />
                </nav>
            </div>
        </header>
    );
}
