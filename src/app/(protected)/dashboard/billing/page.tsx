'use client';

import { useSubscription } from '@/lib/revenuecat/useSubscription';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Check, ExternalLink } from 'lucide-react';
import { FeatureMatrix } from '@/components/marketing/FeatureMatrix';

export default function BillingPage() {
    const { offerings, customerInfo, purchase, isLoading, isPro } = useSubscription();

    if (isLoading) {
        return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-brand-purple" /></div>;
    }

    const currentOffering = offerings?.current;

    // Fallback if needed or logic to find specific packages
    // RevenueCat usually maps 'monthly' and 'annual' if configured in dashboard
    const monthly = currentOffering?.monthly;
    const annual = currentOffering?.annual;

    const handlePurchase = async (pkg: any) => {
        if (!pkg) return;
        try {
            await purchase(pkg);
            alert("Subscription successful!");
        } catch (error) {
            alert("Purchase cancelled or failed.");
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-6xl space-y-12">
            <div className="text-center space-y-4">
                <h1 className="text-3xl font-bold">Subscription & Billing</h1>
                <p className="text-muted-foreground">Manage your plan and payment methods.</p>
            </div>

            {/* Current Status */}
            <Card className="bg-slate-50 dark:bg-slate-900 border-brand-purple/20">
                <CardHeader>
                    <CardTitle>Current Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-lg">
                        You are currently on the <span className="font-bold text-brand-purple">{isPro ? "PRO Plan" : "Free Plan"}</span>.
                    </p>
                    {isPro && (
                        <p className="text-sm text-muted-foreground mt-2">
                            Thanks for support Antlyst! You have access to all advanced features.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Plans */}
            {!isPro && (
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Monthly */}
                    <Card className="flex flex-col relative overflow-hidden border-2 hover:border-brand-purple transition-all">
                        <CardHeader>
                            <CardTitle>Pro Monthly</CardTitle>
                            <CardDescription>Flexible power.</CardDescription>
                            <div className="text-3xl font-bold mt-4">
                                {monthly?.product?.priceString || '$12.00'}
                                <span className="text-sm font-normal text-muted-foreground">/mo</span>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <ul className="space-y-2">
                                <li className="flex gap-2 text-sm"><Check className="w-4 h-4 text-brand-purple" /> Unlimited AI Analysis</li>
                                <li className="flex gap-2 text-sm"><Check className="w-4 h-4 text-brand-purple" /> Power BI & ML Charts</li>
                                <li className="flex gap-2 text-sm"><Check className="w-4 h-4 text-brand-purple" /> 5GB Storage</li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button
                                className="w-full"
                                onClick={() => handlePurchase(monthly)}
                                disabled={!monthly}
                            >
                                {monthly ? `Subscribe ${monthly?.product?.priceString}` : 'Unavailable'}
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Annual */}
                    <Card className="flex flex-col relative overflow-hidden border-2 border-brand-purple shadow-lg scale-105">
                        <div className="absolute top-0 right-0 bg-brand-purple text-white text-xs px-2 py-1">SAVE 20%</div>
                        <CardHeader>
                            <CardTitle>Pro Yearly</CardTitle>
                            <CardDescription>Best value for pros.</CardDescription>
                            <div className="text-3xl font-bold mt-4">
                                {annual?.product?.priceString || '$120.00'}
                                <span className="text-sm font-normal text-muted-foreground">/yr</span>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <ul className="space-y-2">
                                <li className="flex gap-2 text-sm"><Check className="w-4 h-4 text-brand-purple" /> All Monthly Features</li>
                                <li className="flex gap-2 text-sm"><Check className="w-4 h-4 text-brand-purple" /> 2 Months Free</li>
                                <li className="flex gap-2 text-sm"><Check className="w-4 h-4 text-brand-purple" /> Priority Support</li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button
                                className="w-full bg-brand-purple hover:bg-brand-purple/90"
                                onClick={() => handlePurchase(annual)}
                                disabled={!annual}
                            >
                                {annual ? `Subscribe ${annual?.product?.priceString}` : 'Unavailable'}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {/* Customer Center Link / Portal */}
            <div className="text-center pt-8">
                <p className="text-sm text-muted-foreground">
                    Need to manage an existing subscription?
                    {/* RevenueCat Customer Center portal link usually if configured, or just managing via Stripe if web */}
                </p>
            </div>

            <div className="pt-12">
                <h3 className="text-xl font-bold mb-6 text-center">Plan Comparison</h3>
                <FeatureMatrix />
            </div>
        </div>
    );
}
