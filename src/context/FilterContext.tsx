'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export interface FilterState {
    /** Column name -> Set of selected values */
    activeFilters: Record<string, Set<string>>;
    /** Date range filter: { column, start, end } */
    dateRangeFilter: { column: string; start: string; end: string } | null;
    /** Search text filter */
    searchText: string;
}

interface FilterContextType {
    filters: FilterState;
    setFilter: (column: string, values: Set<string>) => void;
    toggleFilterValue: (column: string, value: string) => void;
    clearFilter: (column: string) => void;
    clearAllFilters: () => void;
    setDateRangeFilter: (column: string | null, start?: string, end?: string) => void;
    setSearchText: (text: string) => void;
    applyFilters: <T extends Record<string, any>>(data: T[]) => T[];
    activeFilterCount: number;
    savedViews: SavedView[];
    saveCurrentView: (name: string) => void;
    loadView: (viewId: string) => void;
    deleteView: (viewId: string) => void;
}

export interface SavedView {
    id: string;
    name: string;
    filters: FilterState;
    createdAt: string;
}

const defaultFilters: FilterState = {
    activeFilters: {},
    dateRangeFilter: null,
    searchText: '',
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: React.ReactNode }) {
    const [filters, setFilters] = useState<FilterState>(defaultFilters);
    const [savedViews, setSavedViews] = useState<SavedView[]>([]);

    const setFilter = useCallback((column: string, values: Set<string>) => {
        setFilters(prev => ({
            ...prev,
            activeFilters: {
                ...prev.activeFilters,
                [column]: values,
            },
        }));
    }, []);

    const toggleFilterValue = useCallback((column: string, value: string) => {
        setFilters(prev => {
            const current = prev.activeFilters[column] || new Set<string>();
            const next = new Set(current);
            if (next.has(value)) {
                next.delete(value);
            } else {
                next.add(value);
            }
            const newActiveFilters = { ...prev.activeFilters };
            if (next.size === 0) {
                delete newActiveFilters[column];
            } else {
                newActiveFilters[column] = next;
            }
            return { ...prev, activeFilters: newActiveFilters };
        });
    }, []);

    const clearFilter = useCallback((column: string) => {
        setFilters(prev => {
            const newActiveFilters = { ...prev.activeFilters };
            delete newActiveFilters[column];
            return { ...prev, activeFilters: newActiveFilters };
        });
    }, []);

    const clearAllFilters = useCallback(() => {
        setFilters(defaultFilters);
    }, []);

    const setDateRangeFilter = useCallback((column: string | null, start?: string, end?: string) => {
        setFilters(prev => ({
            ...prev,
            dateRangeFilter: column && start && end
                ? { column, start, end }
                : null,
        }));
    }, []);

    const setSearchText = useCallback((text: string) => {
        setFilters(prev => ({ ...prev, searchText: text }));
    }, []);

    const applyFilters = useCallback(<T extends Record<string, any>>(data: T[]): T[] => {
        let result = data;

        // Apply categorical filters
        for (const [column, values] of Object.entries(filters.activeFilters)) {
            if (values.size > 0) {
                result = result.filter(row => values.has(String(row[column])));
            }
        }

        // Apply date range filter
        if (filters.dateRangeFilter) {
            const { column, start, end } = filters.dateRangeFilter;
            result = result.filter(row => {
                const val = String(row[column]);
                return val >= start && val <= end;
            });
        }

        // Apply search text filter
        if (filters.searchText) {
            const searchLower = filters.searchText.toLowerCase();
            result = result.filter(row =>
                Object.values(row).some(val =>
                    String(val).toLowerCase().includes(searchLower)
                )
            );
        }

        return result;
    }, [filters]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        for (const values of Object.values(filters.activeFilters)) {
            count += values.size;
        }
        if (filters.dateRangeFilter) count += 1;
        if (filters.searchText) count += 1;
        return count;
    }, [filters]);

    const saveCurrentView = useCallback((name: string) => {
        const view: SavedView = {
            id: `view-${Date.now()}`,
            name,
            filters: { ...filters },
            createdAt: new Date().toISOString(),
        };
        setSavedViews(prev => [...prev, view]);
    }, [filters]);

    const loadView = useCallback((viewId: string) => {
        const view = savedViews.find(v => v.id === viewId);
        if (view) {
            setFilters(view.filters);
        }
    }, [savedViews]);

    const deleteView = useCallback((viewId: string) => {
        setSavedViews(prev => prev.filter(v => v.id !== viewId));
    }, []);

    return (
        <FilterContext.Provider value={{
            filters,
            setFilter,
            toggleFilterValue,
            clearFilter,
            clearAllFilters,
            setDateRangeFilter,
            setSearchText,
            applyFilters,
            activeFilterCount,
            savedViews,
            saveCurrentView,
            loadView,
            deleteView,
        }}>
            {children}
        </FilterContext.Provider>
    );
}

export function useFilters() {
    const context = useContext(FilterContext);
    if (context === undefined) {
        throw new Error('useFilters must be used within a FilterProvider');
    }
    return context;
}
