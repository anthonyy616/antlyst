/**
 * Column Type Validator & Categorizer
 * 
 * Replaces fragile `typeof val === 'number'` with robust multi-pass
 * column analysis that categorizes columns for efficient display and chart selection.
 */

export interface ColumnMeta {
    /** Display type for UI grouping */
    type: 'numeric' | 'categorical' | 'datetime' | 'boolean' | 'id' | 'unknown';

    /** Whether this column should appear in chart axis selectors */
    usableInCharts: boolean;

    /** Suggested chart types for this column */
    chartSuggestions: ('bar' | 'line' | 'pie' | 'scatter' | 'histogram' | 'area')[];

    /** Null/empty count */
    nullCount: number;
    nullPercentage: number;

    /** Unique value count */
    uniqueCount: number;

    /** Sample values for preview */
    sampleValues: any[];

    /** For numeric columns */
    numericStats?: {
        min: number;
        max: number;
        mean: number;
        median: number;
        std: number;
        sum: number;
    };

    /** For categorical columns */
    categoricalStats?: {
        topValues: { value: string; count: number; percentage: number }[];
        avgLength: number;
    };

    /** For datetime columns */
    datetimeStats?: {
        earliest: string;
        latest: string;
        rangeDays: number;
    };
}

/**
 * Check if a string value looks like a date
 */
function isDateString(val: string): boolean {
    // Try parsing as Date
    const date = new Date(val);
    if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        if (year >= 1900 && year <= 2100) return true;
    }

    // Check common date patterns
    const datePatterns = [
        /^\d{4}-\d{2}-\d{2}/,     // YYYY-MM-DD
        /^\d{2}\/\d{2}\/\d{4}/,   // MM/DD/YYYY
        /^\d{2}-\d{2}-\d{4}/,     // DD-MM-YYYY
        /^\d{4}\/\d{2}\/\d{2}/,   // YYYY/MM/DD
    ];

    return datePatterns.some(p => p.test(val));
}

/**
 * Analyze a single column and return metadata
 */
export function analyzeColumn(columnName: string, rows: any[]): ColumnMeta {
    // Step 1: Sample collection (up to 1000 rows for performance)
    const sample = rows.slice(0, 1000);
    const values = sample.map(row => row[columnName]);
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');

    // Step 2: Null analysis
    const nullCount = values.length - nonNullValues.length;
    const nullPercentage = values.length > 0 ? (nullCount / values.length) * 100 : 100;

    // Handle all-null case
    if (nonNullValues.length === 0) {
        return {
            type: 'unknown',
            usableInCharts: false,
            chartSuggestions: [],
            nullCount,
            nullPercentage,
            uniqueCount: 0,
            sampleValues: [],
        };
    }

    // Step 3: Type voting
    const votes = { number: 0, date: 0, boolean: 0, string: 0 };

    for (const val of nonNullValues) {
        if (typeof val === 'number') {
            // Check if it's a unix timestamp (9-10 digit number between 1e9 and 2e9)
            if (val > 1e9 && val < 2e9 && Number.isInteger(val)) {
                votes.date++;
            } else {
                votes.number++;
            }
        } else if (typeof val === 'boolean') {
            votes.boolean++;
        } else if (typeof val === 'string') {
            const trimmed = val.trim();
            // Check if it parses as a number
            if (trimmed !== '' && !isNaN(Number(trimmed))) {
                votes.number++;
            }
            // Check if it's a boolean string
            else if (['true', 'false', 'yes', 'no', '0', '1'].includes(trimmed.toLowerCase())) {
                votes.boolean++;
            }
            // Check if it's a date
            else if (isDateString(trimmed)) {
                votes.date++;
            }
            else {
                votes.string++;
            }
        }
    }

    // Step 4: Type determination
    const total = nonNullValues.length;
    const threshold = 0.8;

    let type: ColumnMeta['type'] = 'unknown';
    let usableInCharts = true;
    let chartSuggestions: ColumnMeta['chartSuggestions'] = [];

    if (votes.boolean / total > 0.95) {
        type = 'boolean';
        chartSuggestions = ['bar', 'pie'];
    } else if (votes.number / total > threshold) {
        type = 'numeric';
        chartSuggestions = ['bar', 'histogram'];
    } else if (votes.date / total > threshold) {
        type = 'datetime';
        chartSuggestions = ['line', 'area'];
    } else if (votes.string / total > threshold) {
        // Check if it's an ID column (high uniqueness)
        const uniqueValues = new Set(nonNullValues.map(String));
        const uniqueRatio = uniqueValues.size / nonNullValues.length;

        if (uniqueRatio > 0.95 && nonNullValues.length > 10) {
            type = 'id';
            usableInCharts = false;
        } else {
            type = 'categorical';
        }
    } else {
        type = 'unknown';
    }

    // Unique count
    const uniqueCount = new Set(nonNullValues.map(String)).size;

    // Sample values
    const sampleValues = [...new Set(nonNullValues.slice(0, 10).map(v => String(v)))];

    // Step 5: Statistics calculation
    const meta: ColumnMeta = {
        type,
        usableInCharts,
        chartSuggestions,
        nullCount,
        nullPercentage,
        uniqueCount,
        sampleValues,
    };

    if (type === 'numeric') {
        const nums = nonNullValues.map(Number).filter(n => !isNaN(n));
        const sorted = [...nums].sort((a, b) => a - b);
        const sum = nums.reduce((a, b) => a + b, 0);
        const mean = nums.length > 0 ? sum / nums.length : 0;
        const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
        const variance = nums.length > 0
            ? nums.reduce((acc, n) => acc + Math.pow(n - mean, 2), 0) / nums.length
            : 0;

        meta.numericStats = {
            min: sorted[0] ?? 0,
            max: sorted[sorted.length - 1] ?? 0,
            mean,
            median,
            std: Math.sqrt(variance),
            sum,
        };

        // Update chart suggestions based on unique count
        if (uniqueCount <= 20) {
            chartSuggestions = ['bar', 'histogram', 'pie'];
        } else {
            chartSuggestions = ['bar', 'histogram'];
        }
    } else if (type === 'categorical') {
        const counts: Record<string, number> = {};
        for (const val of nonNullValues) {
            const key = String(val);
            counts[key] = (counts[key] || 0) + 1;
        }

        const topValues = Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([value, count]) => ({
                value,
                count,
                percentage: (count / nonNullValues.length) * 100,
            }));

        const avgLength = nonNullValues.reduce((acc, v) => acc + String(v).length, 0) / nonNullValues.length;

        meta.categoricalStats = { topValues, avgLength };

        // If avg string length > 50, not great for charts
        if (avgLength > 50) {
            usableInCharts = false;
        }

        // Chart suggestions based on cardinality
        if (uniqueCount <= 10) {
            chartSuggestions = ['bar', 'pie'];
        } else {
            chartSuggestions = ['bar'];
        }
    } else if (type === 'datetime') {
        const dates = nonNullValues
            .map(v => new Date(v))
            .filter(d => !isNaN(d.getTime()));
        dates.sort((a, b) => a.getTime() - b.getTime());

        if (dates.length > 0) {
            meta.datetimeStats = {
                earliest: dates[0].toISOString(),
                latest: dates[dates.length - 1].toISOString(),
                rangeDays: Math.ceil(
                    (dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24)
                ),
            };
        }

        chartSuggestions = ['line', 'area'];
    }

    meta.chartSuggestions = chartSuggestions;

    return meta;
}

/**
 * Analyze all columns in a dataset and return metadata map
 */
export function analyzeColumns(rows: any[]): Record<string, ColumnMeta> {
    if (rows.length === 0) return {};

    const columns = Object.keys(rows[0]);
    const result: Record<string, ColumnMeta> = {};

    for (const col of columns) {
        result[col] = analyzeColumn(col, rows);
    }

    return result;
}

/**
 * Get columns grouped by type for UI dropdowns
 */
export function getGroupedColumns(
    columns: string[],
    columnMeta: Record<string, ColumnMeta>
): {
    numeric: string[];
    categorical: string[];
    datetime: string[];
    boolean: string[];
    id: string[];
    unknown: string[];
} {
    const groups = {
        numeric: [] as string[],
        categorical: [] as string[],
        datetime: [] as string[],
        boolean: [] as string[],
        id: [] as string[],
        unknown: [] as string[],
    };

    for (const col of columns) {
        const meta = columnMeta[col];
        if (meta) {
            groups[meta.type].push(col);
        } else {
            groups.unknown.push(col);
        }
    }

    return groups;
}
