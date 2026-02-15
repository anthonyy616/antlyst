'use client';

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportService } from "@/lib/export-service";
import { useState } from "react";

interface ExportButtonProps {
    targetId: string; // ID of the dashboard container
    filename?: string;
}

export function ExportButton({ targetId, filename = 'dashboard-analysis' }: ExportButtonProps) {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async (type: 'pdf' | 'png') => {
        setIsExporting(true);
        // Small delay to allow state update to render (e.g. show loading spinner if we had one)
        setTimeout(async () => {
            if (type === 'pdf') {
                await exportService.exportToPDF(targetId, filename);
            } else {
                await exportService.exportToPNG(targetId, filename);
            }
            setIsExporting(false);
        }, 100);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting} className="gap-2">
                    <Download className="h-4 w-4" />
                    {isExporting ? 'Exporting...' : 'Export'}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                    Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('png')}>
                    Export as PNG
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
