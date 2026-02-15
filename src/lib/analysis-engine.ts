import Papa from 'papaparse';

export interface DashboardConfig {
    layout: string;
    kpis: {
        label: string;
        value: string | number;
        change?: string;
    }[];
    charts: {
        id: string;
        type: 'bar' | 'line' | 'scatter' | 'heatmap' | 'pie' | 'histogram' | 'table' | 'area';
        title: string;
        data: any[]; // Plotly data array
        layout: any; // Plotly layout object
        gridPos?: { x: number; y: number; w: number; h: number };
    }[];
    insights?: Insight[];
    stats?: {
        preview: any[];
        columns: string[];
        rowCount: number;
    }
}

export interface Insight {
    type: 'outlier' | 'trend' | 'correlation' | 'general';
    title: string;
    description: string;
    severity: 'info' | 'warning' | 'positive';
}

// Simple helper types for our LightDataFrame
type Row = Record<string, any>;
interface LightDataFrame {
    data: Row[];
    columns: string[];
    schema: Record<string, 'number' | 'string' | 'unknown'>;
    height: number;
    width: number;
}

export async function generateDashboard(
    data: any, // Can be csv content string OR pre-parsed Row array
    style: 'simple' | 'ml' | 'powerbi'
): Promise<DashboardConfig> {
    let rows: Row[] = [];
    let columns: string[] = [];

    if (typeof data === 'string') {
        const parseResult = Papa.parse(data, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true
        });
        rows = parseResult.data as Row[];
        columns = parseResult.meta.fields || [];
    } else if (Array.isArray(data)) {
        rows = data;
        columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    }

    // Infer Schema from first row
    const schema: LightDataFrame['schema'] = {};
    if (rows.length > 0) {
        columns.forEach(col => {
            const val = rows[0][col];
            // strictly filter numeric: check if it's actually a number and not an ID-like string that got parsed as number
            // or just use dynamicTyping result.
            if (typeof val === 'number') schema[col] = 'number';
            else if (typeof val === 'string') schema[col] = 'string';
            else schema[col] = 'unknown';
        });
    }

    const df: LightDataFrame = {
        data: rows,
        columns,
        schema,
        height: rows.length,
        width: columns.length
    };

    const insights = generateInsights(df);

    let config: DashboardConfig;
    switch (style) {
        case 'simple':
            config = generateSimpleDashboard(df);
            break;
        case 'ml':
            config = generateMLDashboard(df);
            break;
        case 'powerbi':
            config = generatePowerBIDashboard(df);
            break;
        default:
            config = generateSimpleDashboard(df);
    }

    config.insights = insights;

    // Add raw stats for the client-side engine
    config.stats = {
        preview: rows.slice(0, 100), // Send first 100 rows for preview/client processing
        columns: columns,
        rowCount: rows.length
    };

    return config;
}

function generateSimpleDashboard(df: LightDataFrame): DashboardConfig {
    const kpis = [
        { label: "Total Rows", value: df.height.toLocaleString() },
        { label: "Total Columns", value: df.width.toLocaleString() },
    ];

    const charts: DashboardConfig['charts'] = [];

    // 1. Find categorical column for Bar Chart
    const catCol = df.columns.find(col => df.schema[col] === 'string');

    if (catCol) {
        // Count values
        const counts: Record<string, number> = {};
        df.data.forEach(row => {
            const val = String(row[catCol]);
            counts[val] = (counts[val] || 0) + 1;
        });

        // Sort by count desc and take top 10
        const sortedCounts = Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);

        charts.push({
            id: 'chart-1',
            type: 'bar',
            title: `Top 10 ${catCol}`,
            data: [{
                x: sortedCounts.map(([k]) => k),
                y: sortedCounts.map(([, v]) => v),
                type: 'bar',
                marker: { color: '#5e30eb' }
            }],
            layout: {
                xaxis: { title: catCol },
                yaxis: { title: 'Count' }
            }
        });
    }

    // 2. Find numeric column for Histogram
    const numCol = df.columns.find(col => df.schema[col] === 'number');

    if (numCol) {
        const values = df.data.map(row => row[numCol]).filter(v => typeof v === 'number');
        charts.push({
            id: 'chart-2',
            type: 'histogram',
            title: `Distribution of ${numCol}`,
            data: [{
                x: values,
                type: 'histogram',
                marker: { color: '#52d6fc' }
            }],
            layout: {
                xaxis: { title: numCol },
                yaxis: { title: 'Frequency' }
            }
        });
    }

    return { layout: 'simple', kpis, charts };
}

function generateMLDashboard(df: LightDataFrame): DashboardConfig {
    // Mock ML Logic
    const numericCols = df.columns.filter(col => df.schema[col] === 'number');
    const charts: DashboardConfig['charts'] = [];

    if (numericCols.length > 1) {
        const col1 = numericCols[0];
        const col2 = numericCols[1];

        const x = df.data.map(r => r[col1]);
        const y = df.data.map(r => r[col2]);

        charts.push({
            id: 'ml-scatter',
            type: 'scatter',
            title: `Correlation: ${col1} vs ${col2}`,
            data: [{
                x: x,
                y: y,
                mode: 'markers',
                type: 'scatter',
                marker: { color: '#d946ef', opacity: 0.6 }
            }],
            layout: {
                xaxis: { title: col1 },
                yaxis: { title: col2 }
            }
        });
    }

    return {
        layout: 'ml',
        kpis: [
            { label: "Dataset Size", value: df.height },
            { label: "Features", value: df.width }
        ],
        charts
    };
}

function generatePowerBIDashboard(df: LightDataFrame): DashboardConfig {
    const charts: DashboardConfig['charts'] = [];
    const kpis: DashboardConfig['kpis'] = [];

    // 1. Generate KPIs (Top 4 stats)
    kpis.push({ label: "Total Rows", value: df.height.toLocaleString() });
    kpis.push({ label: "Total Columns", value: df.width.toLocaleString() });

    // Filter columns
    const numericCols = df.columns.filter(col => df.schema[col] === 'number');
    const stringCols = df.columns.filter(col => df.schema[col] === 'string');

    // Smart Plotting Logic: Exclude ID-like columns (all unique)
    const validNumericCols = numericCols.filter(col => {
        const uniqueValues = new Set(df.data.map(r => r[col])).size;
        return uniqueValues < df.height * 0.95; // Assume if 95% unique, it's an ID
    });
    // If no valid numeric cols, fallback to all numeric
    const targetNumericCols = validNumericCols.length > 0 ? validNumericCols : numericCols;


    if (targetNumericCols.length > 0) {
        // Sum of first numeric column as extra KPI
        const col = targetNumericCols[0];
        const sum = df.data.reduce((acc, row) => acc + (Number(row[col]) || 0), 0);
        kpis.push({ label: `Total ${col}`, value: sum.toLocaleString(undefined, { maximumFractionDigits: 0 }) });
    }

    // 2. Generate Grid Layout
    let currentY = 0;

    // Pie Chart (Top Categorical)
    if (stringCols.length > 0) {
        const cat = stringCols[0];
        charts.push({
            id: 'pie-1',
            type: 'pie',
            title: `Distribution of ${cat}`,
            data: [],
            layout: {},
            gridPos: { x: 0, y: currentY, w: 4, h: 8 }
        });
    }

    // Bar Chart (Numeric vs Categorical)
    if (targetNumericCols.length > 0 && stringCols.length > 0) {
        const num = targetNumericCols[0];
        const cat = stringCols[0];
        charts.push({
            id: 'bar-1',
            type: 'bar',
            title: `${num} by ${cat}`,
            data: [],
            layout: { xKey: cat, yKey: num, marker: { color: '#8b5cf6' } },
            gridPos: { x: 4, y: currentY, w: 8, h: 8 }
        });
        currentY += 8;
    } else {
        // If we didn't add the bar chart, we should update currentY if pie was added? 
        // Logic check: if pie added (h=8), and no bar, next chart starts at y=0 which overlaps?
        // Actually grid layout is smart enough to find space but explicit y is better.
        if (stringCols.length > 0) currentY += 8;
    }

    // Line/Area Chart (Trend)
    if (targetNumericCols.length > 0) {
        // Try to find a 'date' or 'year' column for X, else use index
        const dateCol = stringCols.find(c => c.toLowerCase().includes('date') || c.toLowerCase().includes('year'));
        const num = targetNumericCols.length > 1 ? targetNumericCols[1] : targetNumericCols[0];

        charts.push({
            id: 'area-1',
            type: 'area',
            title: `Trend of ${num}`,
            data: [],
            layout: { xKey: dateCol || '_index', yKey: num, marker: { color: '#06b6d4' } },
            gridPos: { x: 0, y: currentY, w: 12, h: 6 }
        });
        currentY += 6;
    }

    // Data Table
    charts.push({
        id: 'table-1',
        type: 'table',
        title: 'Detailed Data View',
        data: [],
        layout: {},
        gridPos: { x: 0, y: currentY, w: 12, h: 8 }
    });

    return {
        layout: 'powerbi',
        kpis,
        charts
    };
}

function generateInsights(df: LightDataFrame): Insight[] {
    const insights: Insight[] = [];
    const numericCols = df.columns.filter(col => df.schema[col] === 'number');

    // 1. Detect Outliers (> 3 std dev)
    for (const col of numericCols) {
        const values = df.data.map(r => r[col]).filter(v => typeof v === 'number');
        if (values.length === 0) continue;

        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / values.length;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
        const std = Math.sqrt(variance);
        const max = Math.max(...values);

        if (std > 0) {
            const zScoreMax = (max - mean) / std;
            if (zScoreMax > 3) {
                insights.push({
                    type: 'outlier',
                    title: `Extreme Value in ${col}`,
                    description: `The maximum value (${max.toFixed(2)}) is significantly higher (> 3σ) than the average (${mean.toFixed(2)}).`,
                    severity: 'warning'
                });
            }
        }
    }

    // 2. Simple Trend (First half vs Second half)
    for (const col of numericCols) {
        const values = df.data.map(r => r[col]).filter(v => typeof v === 'number');
        if (values.length > 10) {
            const half = Math.floor(values.length / 2);
            const firstHalf = values.slice(0, half);
            const secondHalf = values.slice(half);

            const mean1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
            const mean2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

            if (mean1 !== 0) {
                const percentChange = ((mean2 - mean1) / mean1) * 100;
                if (Math.abs(percentChange) > 20) {
                    insights.push({
                        type: 'trend',
                        title: `${percentChange > 0 ? 'Upward' : 'Downward'} Trend in ${col}`,
                        description: `Values have ${percentChange > 0 ? 'increased' : 'decreased'} by approximately ${Math.abs(percentChange).toFixed(1)}% from the first half to the second half of the dataset.`,
                        severity: percentChange > 0 ? 'positive' : 'info'
                    });
                }
            }
        }
    }

    if (insights.length === 0) {
        insights.push({
            type: 'general',
            title: 'Consistent Data',
            description: 'No significant outliers or strong trends detected.',
            severity: 'info'
        });
    }

    return insights.slice(0, 5);
}
