export const CHART_THEMES = {
    default: {
        name: 'Default',
        colors: ['#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#84cc16', '#10b981', '#06b6d4']
    },
    ocean: {
        name: 'Ocean',
        colors: ['#0c4a6e', '#0369a1', '#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd', '#e0f2fe']
    },
    forest: {
        name: 'Forest',
        colors: ['#064e3b', '#065f46', '#047857', '#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0']
    },
    sunset: {
        name: 'Sunset',
        colors: ['#881337', '#9f1239', '#be123c', '#e11d48', '#f43f5e', '#fb7185', '#fda4af', '#fecdd3']
    },
    monochrome: {
        name: 'Monochrome',
        colors: ['#171717', '#262626', '#404040', '#525252', '#737373', '#a3a3a3', '#d4d4d4', '#e5e5e5']
    }
};

export type ChartTheme = keyof typeof CHART_THEMES;
