"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
export function LandingHero() {
    return (
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-4"
            >
                <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
                    From raw data to <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-blue">
                        clear decisions
                    </span>
                </h1>
                <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
                    Upload a CSV or connect a data source and get an interactive,
                    shareable dashboard in seconds. Analyze, collaborate, and act
                    without building a data stack from scratch.
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-col sm:flex-row gap-4"
            >
                <Link href="/sign-up" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full bg-brand-purple hover:bg-brand-purple/90 text-white h-12 px-8 text-lg">
                        Explore your data <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                </Link>
            </motion.div>

        </div>
    );
}
