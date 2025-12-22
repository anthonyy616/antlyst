"use client";

import { motion } from "framer-motion";
import { BarChart3, LineChart, PieChart, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PlotStyle = "simple" | "ml" | "powerbi";

interface PlotStyleSelectorProps {
    selectedStyle: PlotStyle | null;
    onSelect: (style: PlotStyle) => void;
}

const STYLES = [
    {
        id: "simple" as PlotStyle,
        title: "Simple Engine",
        description: "Fast, clean charts for quick insights. Best for basic metrics and clear communication.",
        icon: BarChart3,
        color: "text-brand-purple",
        bg: "bg-brand-purple/10",
        borderColor: "border-brand-purple",
    },
    {
        id: "ml" as PlotStyle,
        title: "ML-Enhanced",
        description: "Advanced statistical plots (correlation matrices, distributions) to find hidden patterns.",
        icon: LineChart,
        color: "text-brand-blue",
        bg: "bg-brand-blue/10",
        borderColor: "border-brand-blue",
    },
    {
        id: "powerbi" as PlotStyle,
        title: "Power BI Style",
        description: "Professional, dense dashboard layout suitable for executive reports and presentations.",
        icon: PieChart,
        color: "text-brand-grey",
        bg: "bg-gray-500/10",
        borderColor: "border-gray-500",
    },
];

export function PlotStyleSelector({ selectedStyle, onSelect }: PlotStyleSelectorProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {STYLES.map((style) => (
                <motion.div
                    key={style.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelect(style.id)}
                    className={cn(
                        "relative cursor-pointer rounded-xl border-2 p-6 transition-all duration-200",
                        selectedStyle === style.id
                            ? `${style.borderColor} bg-card shadow-lg`
                            : "border-transparent bg-muted/50 hover:bg-muted"
                    )}
                >
                    {selectedStyle === style.id && (
                        <div className={`absolute -top-3 -right-3 rounded-full ${style.bg.replace('/10', '')} p-1 text-white shadow-sm`}>
                            <Check className="w-4 h-4" />
                        </div>
                    )}

                    <div className={`w-12 h-12 rounded-lg ${style.bg} flex items-center justify-center mb-4`}>
                        <style.icon className={`w-6 h-6 ${style.color}`} />
                    </div>

                    <h3 className="text-lg font-bold mb-2">{style.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {style.description}
                    </p>
                </motion.div>
            ))}
        </div>
    );
}
