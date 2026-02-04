import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import Link from 'next/link';

export function PricingTable() {
    const plans = [
        {
            name: "Free",
            price: "$0",
            period: "/forever",
            description: "Essential analytics for individuals.",
            features: [
                "5 CSV uploads/month",
                "100MB Storage",
                "Basic AI Chats (20/mo)",
                "Simple Dashboard Style",
                "Community Support"
            ],
            notIncluded: [
                "Pro & PowerBI Styles",
                "Teams & Collaboration",
                "Advanced AI Models",
                "Clean Exports (No Watermark)"
            ],
            cta: "Get Started Free",
            ctaLink: "/sign-up", // Clerk link usually or login
            popular: false
        },
        {
            name: "Pro",
            price: "$12",
            period: "/month",
            description: "Advanced power for data enthusiasts.",
            features: [
                "Unlimited Uploads",
                "5GB Storage",
                "Advanced AI (300 chats/mo)",
                "All Dashboard Styles (ML, PowerBI)",
                "Clean Exports",
                "Email Support"
            ],
            notIncluded: [
                "Team Management",
                "SSO / Audit Logs"
            ],
            cta: "Start Pro Trial",
            ctaLink: "/dashboard/billing",
            popular: true
        },
        {
            name: "Business",
            price: "$29",
            period: "/seat/month",
            description: "Collaboration for growing teams.",
            features: [
                "Everything in Pro",
                "25GB Storage per seat",
                "1,000 AI Chats/seat",
                "Team Templates",
                "Priority Support",
                "Audit Logs (90 days)"
            ],
            notIncluded: [],
            cta: "Contact Sales",
            ctaLink: "mailto:sales@antlyst.xyz", // Placeholder
            popular: false
        }
    ];

    return (
        <section className="py-24 bg-slate-50 dark:bg-slate-900" id="pricing">
            <div className="container mx-auto px-4">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4 text-slate-900 dark:text-white">
                        Simple, Transparent Pricing
                    </h2>
                    <p className="text-lg text-slate-600 dark:text-slate-400">
                        Choose the plan that fits your data needs. No hidden fees.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
                    {plans.map((plan) => (
                        <div
                            key={plan.name}
                            className={`relative rounded-2xl bg-white dark:bg-slate-800 p-8 shadow-lg ring-1 ring-slate-200 dark:ring-slate-700 flex flex-col ${plan.popular ? 'ring-2 ring-brand-purple scale-105 z-10' : ''}`}
                        >
                            {plan.popular && (
                                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4">
                                    <span className="inline-flex items-center gap-x-1.5 rounded-full bg-brand-purple px-4 py-1.5 text-xs font-semibold text-white shadow-sm">
                                        Most Popular
                                    </span>
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="text-lg font-semibold leading-8 text-slate-900 dark:text-white">{plan.name}</h3>
                                <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400">{plan.description}</p>
                                <p className="mt-6 flex items-baseline gap-x-1">
                                    <span className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{plan.price}</span>
                                    <span className="text-sm font-semibold leading-6 text-slate-600 dark:text-slate-400">{plan.period}</span>
                                </p>
                            </div>

                            <div className="flex-1 flex flex-col justify-between">
                                <ul role="list" className="space-y-3 mb-8">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex gap-x-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                            <Check className="h-6 w-5 flex-none text-brand-purple" aria-hidden="true" />
                                            {feature}
                                        </li>
                                    ))}
                                    {plan.notIncluded.map((feature) => (
                                        <li key={feature} className="flex gap-x-3 text-sm leading-6 text-slate-400 dark:text-slate-600 opacity-75">
                                            <X className="h-6 w-5 flex-none" aria-hidden="true" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <Button
                                    asChild
                                    variant={plan.popular ? "default" : "outline"}
                                    className={`w-full ${plan.popular ? 'bg-brand-purple hover:bg-brand-purple/90' : ''}`}
                                >
                                    <Link href={plan.ctaLink}>{plan.cta}</Link>
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-16 text-center">
                    <p className="text-slate-600 dark:text-slate-400">
                        Need Enterprise features? <Link href="mailto:enterprise@antlyst.xyz" className="text-brand-purple font-semibold hover:underline">Contact us</Link> for custom scaling and SLAs.
                    </p>
                </div>
            </div>
        </section>
    );
}
