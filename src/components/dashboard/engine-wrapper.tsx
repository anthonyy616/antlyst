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
        <div className="flex flex-col min-h-screen">
            {/* Engine Switcher Toolbar */}
            <div className="bg-white dark:bg-slate-900 border-b p-3 md:p-4 sticky top-0 z-10 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h1 className="text-lg md:text-xl font-bold text-black dark:text-white">Dashboard</h1>
                    <div className="flex flex-wrap items-center gap-2">
                        <ExportButton targetId="dashboard-content" />
                        <div className="flex gap-1.5">
                            <Button
                                variant={currentEngine === 'simple' ? 'default' : 'outline'}
                                onClick={() => setCurrentEngine('simple')}
                                className="gap-1.5 text-xs md:text-sm"
                                size="sm"
                            >
                                <BarChart3 size={14} />
                                <span className="hidden sm:inline">Simple</span>
                            </Button>
                            <Button
                                variant={currentEngine === 'ml' ? 'default' : 'outline'}
                                onClick={() => setCurrentEngine('ml')}
                                className="gap-1.5 text-xs md:text-sm"
                                size="sm"
                            >
                                <BrainCircuit size={14} />
                                <span className="hidden sm:inline">ML Plots</span>
                            </Button>
                            <Button
                                variant={currentEngine === 'powerbi' ? 'default' : 'outline'}
                                onClick={() => setCurrentEngine('powerbi')}
                                className="gap-1.5 text-xs md:text-sm"
                                size="sm"
                            >
                                <LayoutGrid size={14} />
                                <span className="hidden sm:inline">Power BI</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Engine Content */}
            <div id="dashboard-content" className="flex-1 p-3 md:p-6 bg-gray-50 dark:bg-slate-950">
                {currentEngine === 'simple' && <SimpleEngine analysisResult={analysisResult} />}
                {currentEngine === 'ml' && <MLPlotsEngine analysisResult={analysisResult} />}
                {currentEngine === 'powerbi' && <PowerBIEngine analysisResult={analysisResult} />}
            </div>
        </div>
    );
}
