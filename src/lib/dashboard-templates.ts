export interface DashboardTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'sales' | 'marketing' | 'finance' | 'general';
    /** Column patterns to auto-detect if this template matches the data */
    columnPatterns: {
        required?: string[];   // Columns that must exist (case-insensitive partial match)
        preferred?: string[];  // Columns that make this template a better fit
    };
    /** Template function: given column names and first row, return chart configs */
    generate: (columns: string[], sampleRow: any) => {
        kpis: { label: string; value: string | number; change?: string }[];
        charts: {
            id: string;
            type: 'bar' | 'line' | 'scatter' | 'heatmap' | 'pie' | 'histogram' | 'table' | 'area';
            title: string;
            data: any[];
            layout: any;
            gridPos?: { x: number; y: number; w: number; h: number };
        }[];
    };
}

function findCol(columns: string[], patterns: string[]): string | undefined {
    return columns.find(col =>
        patterns.some(p => col.toLowerCase().includes(p.toLowerCase()))
    );
}

function isNumeric(val: any): boolean {
    return typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)) && val !== '');
}

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
    {
        id: 'sales-revenue',
        name: 'Sales & Revenue',
        description: 'Track sales performance, revenue trends, and top products',
        icon: '💰',
        category: 'sales',
        columnPatterns: {
            preferred: ['revenue', 'sales', 'amount', 'price', 'product', 'customer', 'order'],
        },
        generate: (columns, sampleRow) => {
            const revenueCol = findCol(columns, ['revenue', 'amount', 'total', 'sales', 'price']) || columns.find(c => isNumeric(sampleRow[c]));
            const productCol = findCol(columns, ['product', 'item', 'name', 'category']);
            const dateCol = findCol(columns, ['date', 'time', 'month', 'year', 'day']);
            const customerCol = findCol(columns, ['customer', 'client', 'buyer']);
            const regionCol = findCol(columns, ['region', 'country', 'state', 'city', 'location']);

            return {
                kpis: [
                    { label: 'Total Revenue', value: revenueCol ? `$${(sampleRow[revenueCol] || 0).toLocaleString()}` : 'N/A' },
                    { label: 'Products', value: productCol ? 'Tracked' : 'N/A' },
                ],
                charts: [
                    ...(revenueCol && dateCol ? [{
                        id: 'revenue-trend',
                        type: 'line' as const,
                        title: `Revenue Trend by ${dateCol}`,
                        data: [],
                        layout: { xKey: dateCol, yKey: revenueCol },
                        gridPos: { x: 0, y: 0, w: 8, h: 6 },
                    }] : []),
                    ...(revenueCol && productCol ? [{
                        id: 'revenue-by-product',
                        type: 'bar' as const,
                        title: `Revenue by ${productCol}`,
                        data: [],
                        layout: { xKey: productCol, yKey: revenueCol },
                        gridPos: { x: 8, y: 0, w: 4, h: 6 },
                    }] : []),
                    ...(revenueCol && regionCol ? [{
                        id: 'revenue-by-region',
                        type: 'pie' as const,
                        title: `Revenue by ${regionCol}`,
                        data: [],
                        layout: { xKey: regionCol },
                        gridPos: { x: 0, y: 6, w: 4, h: 6 },
                    }] : []),
                    {
                        id: 'data-table',
                        type: 'table' as const,
                        title: 'Detailed Data',
                        data: [],
                        layout: {},
                        gridPos: { x: 4, y: 6, w: 8, h: 8 },
                    },
                ],
            };
        },
    },
    {
        id: 'marketing-analytics',
        name: 'Marketing Analytics',
        description: 'Campaign performance, conversion rates, and channel analysis',
        icon: '📊',
        category: 'marketing',
        columnPatterns: {
            preferred: ['campaign', 'conversion', 'impression', 'click', 'traffic', 'channel', 'source'],
        },
        generate: (columns, sampleRow) => {
            const metricCol = findCol(columns, ['conversion', 'rate', 'click', 'ctr']);
            const campaignCol = findCol(columns, ['campaign', 'channel', 'source', 'medium']);
            const dateCol = findCol(columns, ['date', 'time', 'month', 'year']);
            const spendCol = findCol(columns, ['spend', 'cost', 'budget', 'expense']);
            const audienceCol = findCol(columns, ['audience', 'segment', 'demographic']);

            return {
                kpis: [
                    { label: 'Campaigns', value: campaignCol ? 'Active' : 'N/A' },
                    { label: 'Key Metric', value: metricCol ? sampleRow[metricCol] : 'N/A' },
                ],
                charts: [
                    ...(metricCol && dateCol ? [{
                        id: 'metric-trend',
                        type: 'area' as const,
                        title: `${metricCol} Over Time`,
                        data: [],
                        layout: { xKey: dateCol, yKey: metricCol },
                        gridPos: { x: 0, y: 0, w: 8, h: 6 },
                    }] : []),
                    ...(campaignCol && metricCol ? [{
                        id: 'campaign-perf',
                        type: 'bar' as const,
                        title: `${metricCol} by ${campaignCol}`,
                        data: [],
                        layout: { xKey: campaignCol, yKey: metricCol },
                        gridPos: { x: 8, y: 0, w: 4, h: 6 },
                    }] : []),
                    ...(campaignCol ? [{
                        id: 'campaign-dist',
                        type: 'pie' as const,
                        title: `${campaignCol} Distribution`,
                        data: [],
                        layout: { xKey: campaignCol },
                        gridPos: { x: 0, y: 6, w: 4, h: 6 },
                    }] : []),
                    {
                        id: 'data-table',
                        type: 'table' as const,
                        title: 'Campaign Details',
                        data: [],
                        layout: {},
                        gridPos: { x: 4, y: 6, w: 8, h: 8 },
                    },
                ],
            };
        },
    },
    {
        id: 'finance-overview',
        name: 'Financial Overview',
        description: 'Profit & loss, expense breakdown, and financial health',
        icon: '📈',
        category: 'finance',
        columnPatterns: {
            preferred: ['expense', 'profit', 'loss', 'income', 'budget', 'cost', 'margin'],
        },
        generate: (columns, sampleRow) => {
            const expenseCol = findCol(columns, ['expense', 'cost', 'spend', 'outflow']);
            const incomeCol = findCol(columns, ['income', 'revenue', 'inflow', 'earnings']);
            const categoryCol = findCol(columns, ['category', 'type', 'department', 'account']);
            const dateCol = findCol(columns, ['date', 'month', 'year', 'quarter']);
            const budgetCol = findCol(columns, ['budget', 'planned', 'target']);

            return {
                kpis: [
                    { label: 'Total Income', value: incomeCol ? `$${(sampleRow[incomeCol] || 0).toLocaleString()}` : 'N/A' },
                    { label: 'Total Expenses', value: expenseCol ? `$${(sampleRow[expenseCol] || 0).toLocaleString()}` : 'N/A' },
                ],
                charts: [
                    ...(incomeCol && dateCol ? [{
                        id: 'income-trend',
                        type: 'line' as const,
                        title: `Income Trend`,
                        data: [],
                        layout: { xKey: dateCol, yKey: incomeCol },
                        gridPos: { x: 0, y: 0, w: 6, h: 6 },
                    }] : []),
                    ...(expenseCol && categoryCol ? [{
                        id: 'expense-breakdown',
                        type: 'pie' as const,
                        title: `Expense by ${categoryCol}`,
                        data: [],
                        layout: { xKey: categoryCol },
                        gridPos: { x: 6, y: 0, w: 6, h: 6 },
                    }] : []),
                    ...(expenseCol && dateCol ? [{
                        id: 'expense-trend',
                        type: 'area' as const,
                        title: `Expense Trend`,
                        data: [],
                        layout: { xKey: dateCol, yKey: expenseCol },
                        gridPos: { x: 0, y: 6, w: 8, h: 6 },
                    }] : []),
                    ...(incomeCol && expenseCol ? [{
                        id: 'income-vs-expense',
                        type: 'bar' as const,
                        title: `Income vs Expense`,
                        data: [],
                        layout: { xKey: dateCol || '_index', yKey: incomeCol },
                        gridPos: { x: 8, y: 6, w: 4, h: 6 },
                    }] : []),
                    {
                        id: 'data-table',
                        type: 'table' as const,
                        title: 'Financial Details',
                        data: [],
                        layout: {},
                        gridPos: { x: 0, y: 12, w: 12, h: 8 },
                    },
                ],
            };
        },
    },
    {
        id: 'employee-hr',
        name: 'Employee & HR',
        description: 'Workforce analytics, hiring trends, and department breakdown',
        icon: '👥',
        category: 'general',
        columnPatterns: {
            preferred: ['employee', 'staff', 'hire', 'department', 'salary', 'headcount'],
        },
        generate: (columns, sampleRow) => {
            const deptCol = findCol(columns, ['department', 'team', 'division', 'unit']);
            const salaryCol = findCol(columns, ['salary', 'pay', 'compensation', 'wage']);
            const dateCol = findCol(columns, ['date', 'hire_date', 'start', 'join']);
            const statusCol = findCol(columns, ['status', 'active', 'role']);

            return {
                kpis: [
                    { label: 'Headcount', value: 'N/A' },
                    { label: 'Departments', value: deptCol ? 'Tracked' : 'N/A' },
                ],
                charts: [
                    ...(deptCol ? [{
                        id: 'dept-dist',
                        type: 'bar' as const,
                        title: `Headcount by ${deptCol}`,
                        data: [],
                        layout: { xKey: deptCol, yKey: deptCol },
                        gridPos: { x: 0, y: 0, w: 6, h: 6 },
                    }] : []),
                    ...(salaryCol && deptCol ? [{
                        id: 'salary-by-dept',
                        type: 'bar' as const,
                        title: `Avg ${salaryCol} by ${deptCol}`,
                        data: [],
                        layout: { xKey: deptCol, yKey: salaryCol },
                        gridPos: { x: 6, y: 0, w: 6, h: 6 },
                    }] : []),
                    ...(salaryCol ? [{
                        id: 'salary-dist',
                        type: 'histogram' as const,
                        title: `${salaryCol} Distribution`,
                        data: [],
                        layout: { yKey: salaryCol },
                        gridPos: { x: 0, y: 6, w: 6, h: 6 },
                    }] : []),
                    {
                        id: 'data-table',
                        type: 'table' as const,
                        title: 'Employee Details',
                        data: [],
                        layout: {},
                        gridPos: { x: 6, y: 6, w: 6, h: 8 },
                    },
                ],
            };
        },
    },
    {
        id: 'layoffs-analysis',
        name: 'Layoffs & Workforce',
        description: 'Layoff trends, affected companies, and impact analysis',
        icon: '📉',
        category: 'general',
        columnPatterns: {
            required: [],
            preferred: ['laid_off', 'layoff', 'company', 'industry', 'funds_raised', 'total_laid_off'],
        },
        generate: (columns, sampleRow) => {
            const companyCol = findCol(columns, ['company', 'organization', 'firm']);
            const laidOffCol = findCol(columns, ['laid_off', 'layoff', 'total_laid_off', 'headcount_reduction']);
            const industryCol = findCol(columns, ['industry', 'sector', 'category']);
            const dateCol = findCol(columns, ['date', 'year', 'month']);
            const fundsCol = findCol(columns, ['funds_raised', 'funding', 'valuation']);
            const countryCol = findCol(columns, ['country', 'location', 'region']);

            return {
                kpis: [
                    { label: 'Total Records', value: 'N/A' },
                    { label: 'Companies', value: companyCol ? 'Tracked' : 'N/A' },
                ],
                charts: [
                    ...(laidOffCol && companyCol ? [{
                        id: 'top-layoffs',
                        type: 'bar' as const,
                        title: `Top ${companyCol} by ${laidOffCol}`,
                        data: [],
                        layout: { xKey: companyCol, yKey: laidOffCol },
                        gridPos: { x: 0, y: 0, w: 8, h: 6 },
                    }] : []),
                    ...(industryCol ? [{
                        id: 'industry-pie',
                        type: 'pie' as const,
                        title: `${laidOffCol || 'Layoffs'} by ${industryCol}`,
                        data: [],
                        layout: { xKey: industryCol },
                        gridPos: { x: 8, y: 0, w: 4, h: 6 },
                    }] : []),
                    ...(laidOffCol && dateCol ? [{
                        id: 'layoff-trend',
                        type: 'area' as const,
                        title: `${laidOffCol} Trend`,
                        data: [],
                        layout: { xKey: dateCol, yKey: laidOffCol },
                        gridPos: { x: 0, y: 6, w: 12, h: 6 },
                    }] : []),
                    {
                        id: 'data-table',
                        type: 'table' as const,
                        title: 'All Records',
                        data: [],
                        layout: {},
                        gridPos: { x: 0, y: 12, w: 12, h: 8 },
                    },
                ],
            };
        },
    },
];

/**
 * Score a template against the actual columns to find the best match.
 */
export function matchTemplate(columns: string[], sampleRow: any): { template: DashboardTemplate; score: number }[] {
    return DASHBOARD_TEMPLATES.map(template => {
        let score = 0;

        // Check preferred patterns
        if (template.columnPatterns.preferred) {
            for (const pattern of template.columnPatterns.preferred) {
                if (columns.some(col => col.toLowerCase().includes(pattern.toLowerCase()))) {
                    score += 1;
                }
            }
        }

        // Check required patterns (bonus for all matched)
        if (template.columnPatterns.required) {
            const allRequired = template.columnPatterns.required.every(pattern =>
                columns.some(col => col.toLowerCase().includes(pattern.toLowerCase()))
            );
            if (allRequired) {
                score += 5;
            } else {
                score = 0; // Don't suggest if required not met
            }
        }

        return { template, score };
    })
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score);
}
