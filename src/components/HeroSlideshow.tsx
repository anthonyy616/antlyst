"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const IMAGES = [
    {
        src: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2670&auto=format&fit=crop",
        alt: "Interactive Financial Dashboard",
    },
    {
        src: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=2670&auto=format&fit=crop",
        alt: "Team analyzing business metrics",
    },
    {
        src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop",
        alt: "Digital growth charts",
    },
    {
        src: "https://images.unsplash.com/photo-1599658880436-e252446958d5?q=80&w=2670&auto=format&fit=crop",
        alt: "Modern analytics interface",
    }
];

const TRANSITION_DURATION = 1.5;
const SLIDE_DURATION = 8; // Seconds per slide

export default function HeroSlideshow() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % IMAGES.length);
        }, SLIDE_DURATION * 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="relative h-full w-full overflow-hidden bg-slate-900">
            <AnimatePresence mode="popLayout">
                <motion.div
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{
                        duration: TRANSITION_DURATION,
                        ease: "easeInOut"
                    }}
                    className="absolute inset-0"
                >
                    <Image
                        src={IMAGES[index].src}
                        alt={IMAGES[index].alt}
                        fill
                        className="object-cover object-center"
                        priority
                    />
                    {/* Overlay for better text contrast if needed, or just aesthetic tint */}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
                </motion.div>
            </AnimatePresence>

            {/* Progress indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {IMAGES.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setIndex(i)}
                        className={`h-1.5 rounded-full transition-all duration-500 ${i === index
                            ? "w-8 bg-white"
                            : "w-2 bg-white/40 hover:bg-white/60"
                            }`}
                        aria-label={`Go to slide ${i + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
