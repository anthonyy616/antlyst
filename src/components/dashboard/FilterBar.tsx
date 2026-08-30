'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { useFilters, FilterState } from '@/context/FilterContext';
import {
    Filter,
    X,
    Search,
    Bookmark,
    BookmarkCheck,
    Trash2,
} from 'lucide-react';

interface FilterBarProps {
    columns: string[];
    data: any[];
}

export function FilterBar({ columns, data }: FilterBarProps) {
    const {
        filters,
        toggleFilterValue,
        clearFilter,
        clearAllFilters,
        setDateRangeFilter,
        setSearchText,
        activeFilterCount,
        savedViews,
        saveCurrentView,
        loadView,
        deleteView,
    } = useFilters();

    const [saveViewName, setSaveViewName] = useState('');
    const [showSaveDialog, setShowSaveDialog] = useState(false);

    // Get unique values for each column
    const getUniqueValues = (column: string): string[] => {
        const values = new Set(data.map(row => String(row[column])));
        return Array.from(values).sort().slice(0, 50); // Limit to 50 for performance
    };

    // Detect if a column looks like a date
    const isDateColumn = (column: string): boolean => {
        const lower = column.toLowerCase();
        return lower.includes('date') || lower.includes('time') || lower.includes('year') || lower.includes('month');
    };

    const handleSaveView = () => {
        if (saveViewName.trim()) {
            saveCurrentView(saveViewName.trim());
            setSaveViewName('');
            setShowSaveDialog(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 border-b px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative flex-1 min-w-[150px] max-w-[300px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search data..."
                        value={filters.searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="pl-8 h-8 text-sm"
                    />
                </div>

                {/* Filter Dropdowns */}
                {columns.slice(0, 4).map((col) => {
                    const isDate = isDateColumn(col);
                    const uniqueValues = getUniqueValues(col);
                    const activeValues = filters.activeFilters[col];

                    return (
                        <Popover key={col}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={activeValues && activeValues.size > 0 ? 'default' : 'outline'}
                                    size="sm"
                                    className="h-8 gap-1 text-xs"
                                >
                                    <Filter className="h-3 w-3" />
                                    <span className="hidden sm:inline truncate max-w-[80px]">{col}</span>
                                    <span className="sm:hidden">+</span>
                                    {activeValues && activeValues.size > 0 && (
                                        <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                                            {activeValues.size}
                                        </Badge>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[250px] p-2" align="start">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-medium">{col}</Label>
                                        {activeValues && activeValues.size > 0 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 text-xs text-red-500"
                                                onClick={() => clearFilter(col)}
                                            >
                                                Clear
                                            </Button>
                                        )}
                                    </div>
                                    <div className="max-h-[200px] overflow-y-auto space-y-1">
                                        {uniqueValues.map((val) => (
                                            <label
                                                key={val}
                                                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-1 rounded"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={activeValues?.has(val) || false}
                                                    onChange={() => toggleFilterValue(col, val)}
                                                    className="h-3.5 w-3.5"
                                                />
                                                <span className="truncate text-xs">{val}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    );
                })}

                {/* Date Range Filter */}
                {columns.some(col => isDateColumn(col)) && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={filters.dateRangeFilter ? 'default' : 'outline'}
                                size="sm"
                                className="h-8 gap-1 text-xs"
                            >
                                📅
                                <span className="hidden sm:inline">Date Range</span>
                                <span className="sm:hidden">📅</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-3" align="start">
                            <div className="space-y-3">
                                <Label className="text-xs font-medium">Date Range</Label>
                                <Select
                                    onValueChange={(val) => {
                                        if (val === 'clear') {
                                            setDateRangeFilter(null);
                                        } else {
                                            // Find min/max dates
                                            const dateCol = columns.find(col => isDateColumn(col));
                                            if (dateCol) {
                                                const dates = data.map(row => String(row[dateCol])).sort();
                                                const len = dates.length;
                                                let start = dates[0];
                                                let end = dates[len - 1];

                                                switch (val) {
                                                    case 'last7':
                                                        start = dates[Math.max(0, len - 7)];
                                                        break;
                                                    case 'last30':
                                                        start = dates[Math.max(0, len - 30)];
                                                        break;
                                                    case 'last90':
                                                        start = dates[Math.max(0, len - 90)];
                                                        break;
                                                }
                                                setDateRangeFilter(dateCol, start, end);
                                            }
                                        }
                                    }}
                                >
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Quick select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="last7">Last 7 rows</SelectItem>
                                        <SelectItem value="last30">Last 30 rows</SelectItem>
                                        <SelectItem value="last90">Last 90 rows</SelectItem>
                                        <SelectItem value="clear">Clear filter</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </PopoverContent>
                    </Popover>
                )}

                {/* Divider */}
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

                {/* Active Filters Count */}
                {activeFilterCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-xs text-red-500"
                        onClick={clearAllFilters}
                    >
                        <X className="h-3 w-3" />
                        Clear all ({activeFilterCount})
                    </Button>
                )}

                {/* Saved Views */}
                <div className="ml-auto flex items-center gap-1">
                    {savedViews.length > 0 && (
                        <Select onValueChange={loadView}>
                            <SelectTrigger className="w-[120px] h-8 text-xs">
                                <Bookmark className="h-3 w-3 mr-1" />
                                <SelectValue placeholder="Load view" />
                            </SelectTrigger>
                            <SelectContent>
                                {savedViews.map((view) => (
                                    <SelectItem key={view.id} value={view.id}>
                                        {view.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <Popover open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 text-xs"
                                disabled={activeFilterCount === 0}
                            >
                                <BookmarkCheck className="h-3 w-3" />
                                <span className="hidden sm:inline">Save View</span>
                                <span className="sm:hidden">Save</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[250px] p-3" align="end">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium">View Name</Label>
                                <Input
                                    value={saveViewName}
                                    onChange={(e) => setSaveViewName(e.target.value)}
                                    placeholder="My filtered view"
                                    className="h-8 text-sm"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveView();
                                    }}
                                />
                                <Button
                                    size="sm"
                                    className="w-full h-8 text-xs"
                                    onClick={handleSaveView}
                                    disabled={!saveViewName.trim()}
                                >
                                    Save
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
        </div>
    );
}
