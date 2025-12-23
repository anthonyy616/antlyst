import pl from 'nodejs-polars';

export interface DashboardConfig {
    layout: string; // 'simple', 'ml', 'powerbi'
    kpis: {
        label: string;
        value: string | number;
        change?: string;
    }[];
    charts: {
        id: string;
        type: 'bar' | 'line' | 'scatter' | 'heatmap' | 'pie' | 'histogram';
        title: string;
        data: any[]; // Plotly data array
        layout: any; // Plotly layout object
        gridPos?: { x: number; y: number; w: number; h: number }; // For PowerBI style grid
    }[];
    insights?: Insight[];
}

export interface Insight {
    type: 'outlier' | 'trend' | 'correlation' | 'general';
    title: string;
    description: string;
    severity: 'info' | 'warning' | 'positive';
}

export async function generateDashboard(
    csvContent: string,
    style: 'simple' | 'ml' | 'powerbi'
): Promise<DashboardConfig> {
    // Load DataFrame
    const df = pl.readCSV(csvContent, { ignoreErrors: true });

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
    return config;
}

function generateSimpleDashboard(df: pl.DataFrame): DashboardConfig {
    const rowCount = df.height;
    const colCount = df.width;

    // 1. Identify Numeric and Categorical Columns
    // Polars TS types might need helper checks, basic approach:
    // We'll trust schema inspection.
    // NOTE: nodejs-polars schema returns DataType objects.

    // Simplified KPI: Total Rows
    const kpis = [
        { label: "Total Rows", value: rowCount.toLocaleString() },
        { label: "Total Columns", value: colCount.toLocaleString() },
    ];

    const charts: DashboardConfig['charts'] = [];

    // 2. Find first categorical column for a Bar Chart (Count by Category)
    // We iterate columns and check type.
    // Since strict type checking on schema can be verbose, we'll try to guess strings.
    // Or just grab the first column that looks like a string/category.

    // For now, let's take the *first* string column we find.
    let catCol = "";
    for (const name of df.columns) {
        // Simple heuristic: check if first value is string
        // This is not perfect but fast for MVP without complex schema parsing logic overhead
        // Better: df.schema[name]
        try {
            // Basic safe check
            const dtype = df.schema[name];
            if (dtype.toString() === 'Utf8') { // 'Utf8' is the string type in Polars
                catCol = name;
                break;
            }
        } catch (e) { }
    }

    if (catCol) {
        // Count Values: df.groupBy(col).agg(pl.count())
        const counts = df.groupBy(catCol)
            .agg(pl.count(catCol).alias("count"))
            .sort("count", true)
            .head(10);

        const xRaw = counts.getColumn(catCol).toArray();
        const yRaw = counts.getColumn("count").toArray();

        charts.push({
            id: 'chart-1',
            type: 'bar',
            title: `Top 10 ${catCol}`,
            data: [{
                x: xRaw,
                y: yRaw,
                type: 'bar',
                marker: { color: '#5e30eb' } // Brand purple
            }],
            layout: {
                xaxis: { title: catCol },
                yaxis: { title: 'Count' }
            }
        });
    }

    // 3. Find first numerical column for a Histogram
    let numCol = "";
    for (const name of df.columns) {
        try {
            const dtype = df.schema[name].toString();
            if (['Float32', 'Float64', 'Int32', 'Int64'].some(t => dtype.includes(t))) {
                numCol = name;
                break;
            }
        } catch (e) { }
    }

    if (numCol) {
        const values = df.getColumn(numCol).toArray();
        charts.push({
            id: 'chart-2',
            type: 'histogram',
            title: `Distribution of ${numCol}`,
            data: [{
                x: values,
                type: 'histogram',
                marker: { color: '#52d6fc' } // Brand blue
            }],
            layout: {
                xaxis: { title: numCol },
                yaxis: { title: 'Frequency' }
            }
        });
    }

    return { layout: 'simple', kpis, charts };
}

function generateMLDashboard(df: pl.DataFrame): DashboardConfig {
    const rowCount = df.height;

    // Mock ML Logic for MVP - ideally we compute Correlation Matrix here
    // Calculating correlation in Polars:
    // Select numeric columns -> df.select(pl.col(numeric_cols)).corr()

    // Identify numeric columns
    const numericCols = df.columns.filter(name => {
        const dtype = df.schema[name].toString();
        return ['Float32', 'Float64', 'Int32', 'Int64'].some(t => dtype.includes(t));
    });

    const charts: DashboardConfig['charts'] = [];

    // Correlation Heatmap (if > 1 numeric col)
    if (numericCols.length > 1) {
        // Note: nodejs-polars might not have direct .corr() on DataFrame in all versions, 
        // fallback or use manual checking if needed. Assuming standard API.
        // Actually, getting full correlation matrix can be tricky in JS Polars directly returning a matrix.
        // Let's implement a simplified correlation computation or just mock if complex.
        // For MVP phase 4, let's try to grab a scatter plot of first two numeric columns.

        const col1 = numericCols[0];
        const col2 = numericCols[1];

        const x = df.getColumn(col1).toArray();
        const y = df.getColumn(col2).toArray();

        charts.push({
            id: 'ml-scatter',
            type: 'scatter',
            title: `Correlation: ${col1} vs ${col2}`,
            data: [{
                x: x,
                y: y,
                mode: 'markers',
                type: 'scatter',
                marker: { color: '#d946ef', opacity: 0.6 } // ML Purple/Pink
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
            { label: "Dataset Size", value: rowCount },
            { label: "Features", value: df.width }
        ],
        charts
    };
}

function generatePowerBIDashboard(df: pl.DataFrame): DashboardConfig {
    // Generate standard charts but with specific grid positions for "Dense" layout
    const simple = generateSimpleDashboard(df);

    // Enrich layout for "Professional" look
    // Add grid positions (x, y, w, h) based on React-Grid-Layout logic effectively
    // We will just map them and add a couple more cuts if possible

    const enrichedCharts = simple.charts.map((c, i) => ({
        ...c,
        gridPos: i === 0
            ? { x: 0, y: 0, w: 6, h: 4 } // Top Left
            : { x: 6, y: 0, w: 6, h: 4 } // Top Right
    }));

    // Todo: Add a Pie chart if categorical exists
    // (Extending logic effectively similar to Simple but styled differently in frontend)

    return {
        layout: 'powerbi',
        kpis: simple.kpis,
        charts: enrichedCharts
    };
}

function generateInsights(df: pl.DataFrame): Insight[] {
    const insights: Insight[] = [];
    const numericCols = df.columns.filter(name => {
        try {
            const dtype = df.schema[name].toString();
            return ['Float32', 'Float64', 'Int32', 'Int64'].some(t => dtype.includes(t));
        } catch { return false; }
    });

    // 1. Detect Outliers (Values > 2 std dev from mean)
    // Simplified: Check max vs mean
    for (const col of numericCols) {
        try {
            const series = df.getColumn(col);
            const mean = series.mean();
            const std = ((series as any).std() || 0);
            const max = series.max();
            const min = series.min();

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
        } catch (e) { }
    }

    // 2. Simple Trend Detection (Compare first half vs second half average)
    for (const col of numericCols) {
        try {
            const series = df.getColumn(col);
            if (series.length > 10) {
                const half = Math.floor(series.length / 2);
                const firstHalf = series.slice(0, half).mean();
                const secondHalf = series.slice(half, series.length - half).mean();

                const percentChange = ((secondHalf - firstHalf) / firstHalf) * 100;

                if (Math.abs(percentChange) > 20) {
                    insights.push({
                        type: 'trend',
                        title: `${percentChange > 0 ? 'Upward' : 'Downward'} Trend in ${col}`,
                        description: `Values have ${percentChange > 0 ? 'increased' : 'decreased'} by approximately ${Math.abs(percentChange).toFixed(1)}% from the first half to the second half of the dataset.`,
                        severity: percentChange > 0 ? 'positive' : 'info'
                    });
                }
            }
        } catch (e) { }
    }

    // Fallback if no insights
    if (insights.length === 0) {
        insights.push({
            type: 'general',
            title: 'Consistent Data',
            description: 'No significant outliers or strong trends detected. The data appears stable.',
            severity: 'info'
        });
    }

    return insights.slice(0, 5); // Limit to top 5
}
