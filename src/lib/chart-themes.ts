export const CHART_THEMES = {
    default: {
        colors: ['#5e30eb', '#52d6fc', '#d946ef', '#f97316', '#22c55e', '#eab308', '#ef4444', '#3b82f6', '#6366f1', '#8b5cf6'],
        background: 'transparent',
        textColor: '#71717a',
    },
    neon: {
        colors: ['#f0f', '#0ff', '#0f0', '#ff0', '#f00', '#00f'],
        background: '#000',
        textColor: '#fff',
    },
    pastel: {
        colors: ['#fca5a5', '#fdba74', '#bef264', '#86efac', '#67e8f9', '#93c5fd', '#c4b5fd', '#f9a8d4'],
        background: '#fff',
        textColor: '#333',
    }
};

export type ChartTheme = keyof typeof CHART_THEMES;
