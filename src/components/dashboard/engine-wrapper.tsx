'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import SimpleEngine from './simple-engine';
import MLPlotsEngine from './MLPlotsEngine';
import PowerBIEngine from './powerbi-engine';
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
            <div className="bg-white border-b p-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <h1 className="text-xl font-bold">Dashboard Engine</h1>
                <div className="flex space-x-2">
                    <Button
                        variant={currentEngine === 'simple' ? 'default' : 'outline'}
                        onClick={() => setCurrentEngine('simple')}
                        className="gap-2"
                    >
                        <BarChart3 size={16} />
                        Simple
                    </Button>
                    <Button
                        variant={currentEngine === 'ml' ? 'default' : 'outline'}
                        onClick={() => setCurrentEngine('ml')}
                        className="gap-2"
                    >
                        <BrainCircuit size={16} />
                        ML Plots
                    </Button>
                    <Button
                        variant={currentEngine === 'powerbi' ? 'default' : 'outline'}
                        onClick={() => setCurrentEngine('powerbi')}
                        className="gap-2"
                    >
                        <LayoutGrid size={16} />
                        Power BI
                    </Button>
                </div>
            </div>

            {/* Engine Content */}
            <div className="flex-1 p-6 bg-gray-50">
                {currentEngine === 'simple' && <SimpleEngine analysisResult={analysisResult} />}
                {currentEngine === 'ml' && <MLPlotsEngine analysisResult={analysisResult} />}
                {currentEngine === 'powerbi' && <PowerBIEngine analysisResult={analysisResult} />}
            </div>
        </div>
    );
}
