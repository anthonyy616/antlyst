'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileImage, FileText } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChartExportButtonProps {
    chartId: string;
    chartTitle: string;
    className?: string;
}

export function ChartExportButton({ chartId, chartTitle, className }: ChartExportButtonProps) {
    const [exporting, setExporting] = useState(false);

    const exportChart = async (format: 'png' | 'pdf') => {
        setExporting(true);
        try {
            // Find the chart container
            const chartContainer = document.getElementById(`chart-${chartId}`);
            if (!chartContainer) {
                console.error(`Chart container not found: chart-${chartId}`);
                return;
            }

            const plotDiv = chartContainer.querySelector('.js-plotly-plot') as HTMLElement;
            if (!plotDiv) {
                console.error('Plotly chart not found');
                return;
            }

            // Use Plotly's built-in toImage
            const Plotly = (window as any).Plotly;
            if (!Plotly || typeof Plotly.toImage !== 'function') {
                console.error('Plotly not available');
                return;
            }

            const dataUrl = await Plotly.toImage(plotDiv, {
                format: 'png',
                width: 1200,
                height: 800,
                scale: 2,
            });

            if (format === 'png') {
                // Direct download
                const link = document.createElement('a');
                link.download = `${chartTitle.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
                link.href = dataUrl;
                link.click();
            } else if (format === 'pdf') {
                // Create PDF with the chart
                const { default: jsPDF } = await import('jspdf');
                const pdf = new jsPDF({
                    orientation: 'landscape',
                    unit: 'px',
                    format: [1200, 800],
                });

                pdf.addImage(dataUrl, 'PNG', 0, 0, 1200, 800);
                pdf.save(`${chartTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
            }
        } catch (error) {
            console.error('Chart export failed:', error);
        } finally {
            setExporting(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 ${className}`}
                    disabled={exporting}
                >
                    <Download className="h-3.5 w-3.5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportChart('png')}>
                    <FileImage className="h-4 w-4 mr-2" />
                    Export as PNG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportChart('pdf')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export as PDF
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
