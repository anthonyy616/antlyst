"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    BarChart3,
    Bell,
    Brain,
    FileText,
    LineChart,
    MessageSquare,
    PieChart,
    RefreshCw,
    Users,
} from 'lucide-react';
import { motion } from 'framer-motion';

export function LandingFeatures() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="mt-24 sm:mt-40 mb-20 sm:mb-32 max-w-5xl mx-auto"
        >
            <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-brand-purple/10 to-brand-blue/10 rounded-3xl blur-xl opacity-50"></div>
                <div className="relative bg-card/50 backdrop-blur-sm border rounded-3xl p-5 sm:p-8 md:p-12 shadow-lg space-y-10 sm:space-y-12">

                    {/* The Mission */}
                    <div className="text-center space-y-6">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-relaxed">
                            Turn every dataset into a shared workspace your team can understand and use.
                        </h2>
                        <p className="text-base sm:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                            Antlyst combines automated dashboards, AI-assisted analysis, and team collaboration
                            so you can move from upload to insight without the busywork.
                        </p>
                    </div>

                    {/* Dashboard engines */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
                        <div className="space-y-4">
                            <div className="w-10 h-10 bg-brand-purple/10 rounded-lg flex items-center justify-center">
                                <BarChart3 className="text-brand-purple w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold">Instant dashboards</h3>
                            <p className="text-muted-foreground text-sm">
                                Upload CSV or Excel data, review it in a guided workflow, and get clean charts and KPIs automatically.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div className="w-10 h-10 bg-brand-blue/10 rounded-lg flex items-center justify-center">
                                <LineChart className="text-brand-blue w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold">Three ways to explore</h3>
                            <p className="text-muted-foreground text-sm">
                                Choose simple, ML-enhanced, or Power BI-style dashboards for the level of detail your audience needs.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div className="w-10 h-10 bg-brand-grey/10 rounded-lg flex items-center justify-center">
                                <PieChart className="text-brand-grey w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold">Built for decisions</h3>
                            <p className="text-muted-foreground text-sm">
                                Edit charts, filter results, transform datasets, and export polished reports for presentations and reviews.
                            </p>
                        </div>
                    </div>

                    {/* Recent capabilities */}
                    <div className="border-t pt-12">
                        <h3 className="text-2xl font-bold mb-6 text-center">Everything your analysis needs after the first chart</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-4 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/30">
                                <Brain className="w-6 h-6 text-brand-purple mb-2" />
                                <h4 className="font-semibold">AI Analyst</h4>
                                <p className="text-xs text-muted-foreground mt-1">Ask questions about your project and get data-aware summaries, recommendations, and explanations.</p>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/30">
                                <Bell className="w-6 h-6 text-brand-purple mb-2" />
                                <h4 className="font-semibold">Monitor and forecast</h4>
                                <p className="text-xs text-muted-foreground mt-1">Create alert rules, inspect anomalies, forecast trends, and run automated ML analysis.</p>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/30">
                                <FileText className="w-6 h-6 text-brand-purple mb-2" />
                                <h4 className="font-semibold">Reports and history</h4>
                                <p className="text-xs text-muted-foreground mt-1">Generate reports, compare dataset versions, schedule refreshes, and keep your work reproducible.</p>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/30">
                                <Users className="w-6 h-6 text-brand-purple mb-2" />
                                <h4 className="font-semibold">Team workspaces</h4>
                                <p className="text-xs text-muted-foreground mt-1">Organize projects, invite teammates, manage roles, and keep each team focused.</p>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/30">
                                <MessageSquare className="w-6 h-6 text-brand-purple mb-2" />
                                <h4 className="font-semibold">Discuss in context</h4>
                                <p className="text-xs text-muted-foreground mt-1">Share dashboards, comment on work, and use real-time team chat without leaving Antlyst.</p>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/30">
                                <RefreshCw className="w-6 h-6 text-brand-purple mb-2" />
                                <h4 className="font-semibold">Connect and refresh</h4>
                                <p className="text-xs text-muted-foreground mt-1">Bring in data from files and external sources, then keep dashboards current with scheduled refreshes.</p>
                            </div>
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="pt-8 text-center">
                        <h3 className="text-2xl font-bold mb-6">Make your next dataset useful sooner.</h3>
                        <Link href="/sign-up">
                            <Button size="lg" className="bg-brand-purple hover:bg-brand-purple/90 text-white px-8">
                                Create Your Account
                            </Button>
                        </Link>
                    </div>

                </div>
            </div>
        </motion.div>
    );
}
