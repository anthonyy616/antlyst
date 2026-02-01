import { ClerkProvider } from '@clerk/nextjs'

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ClerkProvider>
            {children}
        </ClerkProvider>
    );
}
