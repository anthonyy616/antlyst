'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DASHBOARD_TEMPLATES, DashboardTemplate, matchTemplate } from '@/lib/dashboard-templates';
import { LayoutTemplate, Sparkles, Search } from 'lucide-react';

interface TemplateGalleryProps {
    open: boolean;
    onClose: () => void;
    columns: string[];
    sampleRow: any;
    onApplyTemplate: (template: DashboardTemplate) => void;
}

export function TemplateGallery({ open, onClose, columns, sampleRow, onApplyTemplate }: TemplateGalleryProps) {
    const [selectedTemplate, setSelectedTemplate] = useState<DashboardTemplate | null>(null);
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Auto-detect best matching templates
    const rankedTemplates = useMemo(() => matchTemplate(columns, sampleRow), [columns, sampleRow]);

    // Filter templates
    const filteredTemplates = useMemo(() => {
        return DASHBOARD_TEMPLATES.filter(t => {
            const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
            const matchesSearch = searchQuery === '' ||
                t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.description.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [filterCategory, searchQuery]);

    const handleApply = () => {
        if (selectedTemplate) {
            onApplyTemplate(selectedTemplate);
            onClose();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <LayoutTemplate className="h-5 w-5" />
                        Dashboard Templates
                    </DialogTitle>
                    <DialogDescription>
                        Choose a pre-built template or let us auto-detect the best one for your data.
                    </DialogDescription>
                </DialogHeader>

                {/* AI Suggestion */}
                {rankedTemplates.length > 0 && (
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="h-4 w-4 text-purple-500" />
                            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                                Recommended for your data
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {rankedTemplates.slice(0, 3).map(({ template, score }) => (
                                <Button
                                    key={template.id}
                                    variant={selectedTemplate?.id === template.id ? 'default' : 'outline'}
                                    size="sm"
                                    className="gap-1"
                                    onClick={() => setSelectedTemplate(template)}
                                >
                                    <span>{template.icon}</span>
                                    {template.name}
                                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                                        {score}%
                                    </Badge>
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Search and Filter */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-9 text-sm"
                        />
                    </div>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-[130px] h-9 text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="finance">Finance</SelectItem>
                            <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Template Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[400px] pr-1">
                    {filteredTemplates.map((template) => {
                        const isRecommended = rankedTemplates.some(r => r.template.id === template.id);
                        return (
                            <Card
                                key={template.id}
                                className={`cursor-pointer transition-all hover:shadow-md ${
                                    selectedTemplate?.id === template.id
                                        ? 'ring-2 ring-primary shadow-md'
                                        : 'hover:border-primary/50'
                                }`}
                                onClick={() => setSelectedTemplate(template)}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <span className="text-lg">{template.icon}</span>
                                            {template.name}
                                        </CardTitle>
                                        {isRecommended && (
                                            <Badge variant="secondary" className="text-[10px]">
                                                <Sparkles className="h-3 w-3 mr-0.5" />
                                                Best Match
                                            </Badge>
                                        )}
                                    </div>
                                    <CardDescription className="text-xs">
                                        {template.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-1">
                                        {template.columnPatterns.preferred?.slice(0, 4).map((pattern) => (
                                            <Badge key={pattern} variant="outline" className="text-[10px]">
                                                {pattern}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {filteredTemplates.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        No templates match your search.
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleApply} disabled={!selectedTemplate}>
                        Apply Template
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
