'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface SidebarContextType {
    isCollapsed: boolean;
    toggle: () => void;
    expand: () => void;
    collapse: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Initialize from localStorage if available
    useEffect(() => {
        const stored = localStorage.getItem('sidebar-collapsed');
        if (stored) {
            setIsCollapsed(JSON.parse(stored));
        }
    }, []);

    const toggle = () => {
        setIsCollapsed((prev) => {
            const newState = !prev;
            localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
            return newState;
        });
    };

    const expand = () => {
        setIsCollapsed(false);
        localStorage.setItem('sidebar-collapsed', JSON.stringify(false));
    };

    const collapse = () => {
        setIsCollapsed(true);
        localStorage.setItem('sidebar-collapsed', JSON.stringify(true));
    };

    return (
        <SidebarContext.Provider value={{ isCollapsed, toggle, expand, collapse }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (context === undefined) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}
