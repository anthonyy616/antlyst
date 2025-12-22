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
}

export async function generateDashboard(
    csvContent: string,
    style: 'simple' | 'ml' | 'powerbi'
): Promise<DashboardConfig> {
    // Load DataFrame
    const df = pl.readCSV(csvContent, { ignoreErrors: true });

    switch (style) {
        case 'simple':
            return generateSimpleDashboard(df);
        case 'ml':
            return generateMLDashboard(df);
        case 'powerbi':
            return generatePowerBIDashboard(df);
        default:
            return generateSimpleDashboard(df);
    }
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
