import { ClerkProvider } from '@clerk/nextjs'

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ClerkProvider>
            <div className="flex min-h-screen items-center justify-center">
                {children}
            </div>
        </ClerkProvider>
    );
}
