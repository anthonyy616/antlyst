import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingFeatures } from '@/components/landing/LandingFeatures';
import { PricingTable } from '@/components/marketing/PricingTable';

export const dynamic = "force-static";
export const revalidate = 3600;

export default function Home() {
    return (
        <div className="min-h-screen bg-transparent flex flex-col overflow-hidden relative">
            {/* Header */}
            <LandingHeader />



            {/* Hero Section */}
            <main className="flex-1 container mx-auto px-4 pt-20 pb-32 relative z-10">
                <LandingHero />
                <LandingFeatures />
            </main>

            {/* Pricing Section on Home */}
            <PricingTable />

            {/* Footer */}
            <footer className="border-t py-8 relative z-10 bg-background/80 backdrop-blur-sm">
                <div className="container mx-auto px-4 text-center text-muted-foreground">
                    <p>© 2025 Antlyst. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
