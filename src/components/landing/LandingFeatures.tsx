"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BarChart3, LineChart, PieChart, Sparkles, Zap, Users, Brain } from 'lucide-react';
import { motion } from 'framer-motion';

export function LandingFeatures() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="mt-40 mb-32 max-w-5xl mx-auto"
        >
            <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-brand-purple/10 to-brand-blue/10 rounded-3xl blur-xl opacity-50"></div>
                <div className="relative bg-card/50 backdrop-blur-sm border rounded-3xl p-8 md:p-12 shadow-lg space-y-12">

                    {/* The Mission */}
                    <div className="text-center space-y-6">
                        <Sparkles className="w-12 h-12 text-brand-purple mx-auto" />
                        <h2 className="text-3xl md:text-4xl font-bold leading-relaxed">
                            "In a world where data shapes decisions, builds and optimizes business and new inventions, here at <span className="text-brand-purple">Antlyst</span> we're doing our part to shape how this data is viewed."
                        </h2>
                        <p className="text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
                            We help individuals and businesses make informed decisions with unique beginner-friendly dashboard visualizations just from a single upload.
                        </p>
                    </div>

                    {/* Current Features */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
                        <div className="space-y-4">
                            <div className="w-10 h-10 bg-brand-purple/10 rounded-lg flex items-center justify-center">
                                <BarChart3 className="text-brand-purple w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold">Simple Engine</h3>
                            <p className="text-muted-foreground text-sm">
                                Clean, fast, and effective charts powered by Lightdash. Perfect for quick insights and clarity.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div className="w-10 h-10 bg-brand-blue/10 rounded-lg flex items-center justify-center">
                                <LineChart className="text-brand-blue w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold">ML Plots Engine</h3>
                            <p className="text-muted-foreground text-sm">
                                Advanced statistical visualizations including correlation heatmaps and SHAP values for deeper analysis.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div className="w-10 h-10 bg-brand-grey/10 rounded-lg flex items-center justify-center">
                                <PieChart className="text-brand-grey w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-bold">Power BI Style</h3>
                            <p className="text-muted-foreground text-sm">
                                Professional, report-ready layouts inspired by Evidence.dev and Power BI for executive presentations.
                            </p>
                        </div>
                    </div>

                    {/* The Future */}
                    <div className="border-t pt-12">
                        <h3 className="text-2xl font-bold mb-6 text-center">And we're just getting started...</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-4 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/30">
                                <Brain className="w-6 h-6 text-muted-foreground mb-2" />
                                <h4 className="font-semibold">AI-Powered Insights</h4>
                                <p className="text-xs text-muted-foreground mt-1">Automated storytelling & anomaly detection.</p>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/30">
                                <Users className="w-6 h-6 text-muted-foreground mb-2" />
                                <h4 className="font-semibold">Team Collaboration</h4>
                                <p className="text-xs text-muted-foreground mt-1">Real-time sharing & commenting.</p>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/30">
                                <Zap className="w-6 h-6 text-muted-foreground mb-2" />
                                <h4 className="font-semibold">Live Connectors</h4>
                                <p className="text-xs text-muted-foreground mt-1">Direct DB & API integration.</p>
                            </div>
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="pt-8 text-center">
                        <h3 className="text-2xl font-bold mb-6">Sign up to get started.</h3>
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
