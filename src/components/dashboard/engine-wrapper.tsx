'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import SimpleEngine from './simple-engine';
import MLPlotsEngine from './MLPlotsEngine';
import PowerBIEngine from './PowerBIEngine';
import { ExportButton } from './ExportButton';
import { BarChart3, BrainCircuit, LayoutGrid } from 'lucide-react';

interface EngineWrapperProps {
    analysisResult: any;
}

type EngineType = 'simple' | 'ml' | 'powerbi';

export default function EngineWrapper({ analysisResult }: EngineWrapperProps) {
    const [currentEngine, setCurrentEngine] = useState<EngineType>('simple');

    return (
        <div className="flex flex-col min-h-screen max-w-full overflow-x-hidden">
            {/* Engine Switcher Toolbar */}
            <div className="bg-white dark:bg-slate-900 border-b shadow-sm sticky top-0 z-10">
                <div className="p-2 sm:p-3 md:p-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-base sm:text-lg md:text-xl font-bold text-black dark:text-white mr-auto">
                            Dashboard
                        </h1>
                        <ExportButton targetId="dashboard-content" />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2">
                        {[
                            { key: 'simple' as EngineType, icon: BarChart3, label: 'Simple', shortLabel: 'Bar' },
                            { key: 'ml' as EngineType, icon: BrainCircuit, label: 'ML Plots', shortLabel: 'ML' },
                            { key: 'powerbi' as EngineType, icon: LayoutGrid, label: 'Power BI', shortLabel: 'Grid' },
                        ].map(({ key, icon: Icon, label, shortLabel }) => (
                            <Button
                                key={key}
                                variant={currentEngine === key ? 'default' : 'outline'}
                                onClick={() => setCurrentEngine(key)}
                                className="gap-1 text-[11px] sm:text-xs md:text-sm shrink-0 px-2 sm:px-3 h-8"
                                size="sm"
                            >
                                <Icon size={14} />
                                <span className="hidden sm:inline">{label}</span>
                                <span className="sm:hidden">{shortLabel}</span>
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Engine Content */}
            <div id="dashboard-content" className="flex-1 p-2 sm:p-3 md:p-6 bg-gray-50 dark:bg-slate-950 min-w-0 w-full">
                {currentEngine === 'simple' && <SimpleEngine analysisResult={analysisResult} />}
                {currentEngine === 'ml' && <MLPlotsEngine analysisResult={analysisResult} />}
                {currentEngine === 'powerbi' && <PowerBIEngine analysisResult={analysisResult} />}
            </div>
        </div>
    );
}
