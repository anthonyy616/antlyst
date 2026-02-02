import { ClerkProvider } from '@clerk/nextjs'
import { ProtectedHeader } from '@/components/ProtectedHeader';
import { Sidebar } from '@/components/Sidebar';

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ClerkProvider>
            <div className="h-full relative">
                <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] bg-gray-900">
                    <Sidebar />
                </div>
                <main className="md:pl-72 flex flex-col min-h-screen">
                    <ProtectedHeader />
                    <div className="flex-1 p-6">
                        {children}
                    </div>
                </main>
            </div>
        </ClerkProvider>
    );
}
