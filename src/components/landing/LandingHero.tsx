"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import HeroSlideshow from '@/components/HeroSlideshow';
import { useEffect, useState } from 'react';

// Wrapper to prevent hydration mismatch for the slideshow if needed, 
// though standard client components should be fine.
function SlideshowWrapper() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted) return <div className="w-full h-full bg-slate-900 animate-pulse" />;
    return <HeroSlideshow />;
}

export function LandingHero() {
    return (
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-4"
            >
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
                    Data Visualization <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-blue">
                        Reimagined
                    </span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Upload your CSV and get three distinct dashboard styles instantly.
                    From simple metrics to complex ML plots, we handle the heavy lifting.
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-col sm:flex-row gap-4"
            >
                <Link href="/sign-up">
                    <Button size="lg" className="bg-brand-purple hover:bg-brand-purple/90 text-white h-12 px-8 text-lg">
                        Get Started <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                </Link>
                <Button size="lg" variant="outline" className="h-12 px-8 text-lg">
                    View Demo
                </Button>
            </motion.div>

            {/* Interactive 3D Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="mt-20 relative group perspective-1000"
            >
                <div className="absolute -inset-1 bg-gradient-to-r from-brand-purple to-brand-blue rounded-xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-card border rounded-xl shadow-2xl overflow-hidden transform transition-transform duration-500 hover:rotate-x-12 hover:scale-105">
                    <div className="relative h-[400px] w-full md:w-[800px] bg-slate-50 dark:bg-slate-900">
                        <SlideshowWrapper />
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
