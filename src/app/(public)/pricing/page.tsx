import { LandingHeader } from '@/components/landing/LandingHeader';
import { PricingTable } from '@/components/marketing/PricingTable';
import { FeatureMatrix } from '@/components/marketing/FeatureMatrix';

export const metadata = {
    title: 'Pricing - Antlyst',
    description: 'Simple, transparent pricing for data analytics. Start for free, upgrade for power.',
};

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
            <LandingHeader />

            <main className="flex-1 pt-24 pb-12">
                <div className="container mx-auto px-4 mb-2">
                    <h1 className="sr-only">Pricing Plans</h1>
                </div>

                {/* Main Cards */}
                <PricingTable />

                {/* Comparison Table */}
                <FeatureMatrix />

                {/* FAQ or Trust signals could go here */}
            </main>

            <footer className="border-t py-12 bg-white dark:bg-slate-900">
                <div className="container mx-auto px-4 text-center text-muted-foreground">
                    <p>© 2025 Antlyst. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
