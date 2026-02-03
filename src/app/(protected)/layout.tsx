import { ClerkProvider } from '@clerk/nextjs'
import { SidebarProvider } from '@/context/SidebarContext';
import { ProtectedLayoutClient } from '@/components/ProtectedLayoutClient';

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ClerkProvider>
            <SidebarProvider>
                <ProtectedLayoutClient>
                    {children}
                </ProtectedLayoutClient>
            </SidebarProvider>
        </ClerkProvider>
    );
}
