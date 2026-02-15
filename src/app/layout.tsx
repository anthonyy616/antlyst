import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import NeonOrbsWrapper from "@/components/NeonOrbsWrapper";
import { ClerkProvider } from '@clerk/nextjs'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: {
        default: "Antlyst - Data Dashboards in Seconds",
        template: "%s | Antlyst"
    },
    description: "Antlyst turns your raw data into stunning, interactive dashboards in seconds. Supported formats: CSV, Excel, PDF.",
    keywords: ["data visualization", "dashboard", "analytics", "csv to dashboard", "excel to dashboard", "ai data analysis"],
    authors: [{ name: "Antigravity Team" }],
    creator: "Antigravity",
    openGraph: {
        type: "website",
        locale: "en_US",
        url: "https://antlyst.com",
        title: "Antlyst - Data Dashboards in Seconds",
        description: "Turn your raw data into stunning, interactive dashboards in seconds.",
        siteName: "Antlyst",
        images: [
            {
                url: "/og-image.png",
                width: 1200,
                height: 630,
                alt: "Antlyst Dashboard Preview",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Antlyst - Data Dashboards in Seconds",
        description: "Turn your raw data into stunning, interactive dashboards in seconds.",
        images: ["/og-image.png"],
        creator: "@antlyst",
    },
    metadataBase: new URL("https://antlyst.com"),
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <ClerkProvider>
            <html lang="en" suppressHydrationWarning>
                <body className={inter.className}>
                    <ThemeProvider
                        attribute="class"
                        defaultTheme="system"
                        enableSystem
                        disableTransitionOnChange
                    >
                        <NeonOrbsWrapper />
                        {children}
                    </ThemeProvider>
                    <Analytics />
                </body>
            </html>
        </ClerkProvider>
    );
}
