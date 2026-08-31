/**
 * Intelligent Chart Recommendation Engine
 *
 * Analyzes dataset structure and recommends appropriate visualizations
 * based on column types, data distributions, and statistical properties.
 */

import { ColumnMeta, analyzeColumns } from './column-validator';
import { DatasetProfile, profileDataset } from './dataset-profiler';

// ── Types ──────────────────────────────────────────────────────────────

export type ChartType =
    | 'bar'
    | 'line'
    | 'scatter'
    | 'pie'
    | 'histogram'
    | 'area'
    | 'heatmap'
    | 'box'
    | 'treemap'
    | 'table';

export interface ChartRecommendation {
    id: string;
    chartType: ChartType;
    title: string;
    description: string;
    reason: string;
    confidence: number; // 0-1
    xColumn?: string;
    yColumn?: string;
    zColumn?: string;
    aggregation?: 'sum' | 'mean' | 'count' | 'min' | 'max';
    filters?: Record<string, any>;
    category: 'distribution' | 'comparison' | 'trend' | 'relationship' | 'composition';
}

export interface RecommendationResult {
    recommendations: ChartRecommendation[];
    summary: string;
    profiledAt: string;
}

// ── Chart Type Scoring Rules ───────────────────────────────────────────

interface ChartRule {
    chartType: ChartType;
    category: ChartRecommendation['category'];
    requires: {
        numeric?: number;     // Min numeric columns
        categorical?: number; // Min categorical columns
        datetime?: number;    // Min datetime columns
    };
    score: (cols: ColumnProfile[], allCols: ColumnProfile[]) => number;
    titleTemplate: (x?: string, y?: string, z?: string) => string;
    reasonTemplate: (x?: string, y?: string) => string;
}

interface ColumnProfile {
    name: string;
    type: ColumnMeta['type'];
    uniqueCount: number;
    nullPercentage: number;
    isConstant: boolean;
    isIdentifier: boolean;
    numericStats?: {
        min: number;
        max: number;
        mean: number;
        stdDev: number;
        outlierCount: number;
    };
    categoricalStats?: {
        uniqueCount: number;
        topValues: { value: string; count: number; percentage: number }[];
        entropy: number;
    };
}

// ── Recommendation Rules ───────────────────────────────────────────────

function buildColumnProfiles(rows: any[], columnMeta: Record<string, ColumnMeta>): ColumnProfile[] {
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return columns.map(col => {
        const meta = columnMeta[col];
        const profile: ColumnProfile = {
            name: col,
            type: meta?.type || 'unknown',
            uniqueCount: meta?.uniqueCount || 0,
            nullPercentage: meta?.nullPercentage || 0,
            isConstant: meta?.usableInCharts === false && meta?.type !== 'id',
            isIdentifier: meta?.type === 'id',
        };
        if (meta?.numericStats) {
            profile.numericStats = {
                min: meta.numericStats.min,
                max: meta.numericStats.max,
                mean: meta.numericStats.mean,
                stdDev: meta.numericStats.std,
                outlierCount: 0, // Will be computed by profiler if needed
            };
        }
        if (meta?.categoricalStats) {
            profile.categoricalStats = {
                uniqueCount: meta.uniqueCount,
                topValues: meta.categoricalStats.topValues,
                entropy: 0, // Will be computed by profiler if needed
            };
        }
        return profile;
    });
}

function getChartRules(): ChartRule[] {
    return [
        // ── Distribution Charts ───────────────────────────────────────
        {
            chartType: 'histogram',
            category: 'distribution',
            requires: { numeric: 1 },
            score: (cols) => {
                const numCols = cols.filter(c => c.type === 'numeric' && !c.isIdentifier);
                if (numCols.length === 0) return 0;
                // Prefer columns with more unique values (better distribution)
                const best = numCols.reduce((a, b) =>
                    (a.uniqueCount > b.uniqueCount ? a : b)
                );
                return 0.6 + Math.min(0.3, best.uniqueCount / 1000);
            },
            titleTemplate: (_, y) => `Distribution of ${y}`,
            reasonTemplate: (_, y) => `Shows the frequency distribution of ${y}. Useful for understanding data spread and central tendency.`,
        },
        {
            chartType: 'box',
            category: 'distribution',
            requires: { numeric: 1 },
            score: (cols) => {
                const numCols = cols.filter(c => c.type === 'numeric' && !c.isIdentifier);
                return numCols.length >= 1 ? 0.5 : 0;
            },
            titleTemplate: (_, y) => `Box Plot of ${y}`,
            reasonTemplate: (_, y) => `Shows the distribution quartiles and outliers of ${y}.`,
        },

        // ── Comparison Charts ─────────────────────────────────────────
        {
            chartType: 'bar',
            category: 'comparison',
            requires: { categorical: 1, numeric: 1 },
            score: (cols) => {
                const catCols = cols.filter(c => c.type === 'categorical' && !c.isConstant && c.uniqueCount <= 20);
                const numCols = cols.filter(c => c.type === 'numeric' && !c.isIdentifier);
                if (catCols.length === 0 || numCols.length === 0) return 0;
                // Prefer low-cardinality categoricals
                const bestCat = catCols.reduce((a, b) =>
                    (a.uniqueCount <= b.uniqueCount ? a : b)
                );
                return 0.7 + Math.min(0.2, (20 - bestCat.uniqueCount) / 100);
            },
            titleTemplate: (x, y) => `${y} by ${x}`,
            reasonTemplate: (x, y) => `Compares ${y} across different ${x} categories. Good for identifying top/bottom performers.`,
        },
        {
            chartType: 'pie',
            category: 'composition',
            requires: { categorical: 1 },
            score: (cols) => {
                const catCols = cols.filter(c =>
                    c.type === 'categorical' && !c.isConstant &&
                    c.uniqueCount >= 2 && c.uniqueCount <= 8
                );
                if (catCols.length === 0) return 0;
                // Best when few categories
                const best = catCols.reduce((a, b) =>
                    (a.uniqueCount <= b.uniqueCount ? a : b)
                );
                return 0.5 + Math.min(0.3, (8 - best.uniqueCount) / 20);
            },
            titleTemplate: (x) => `Distribution of ${x}`,
            reasonTemplate: (x) => `Shows the proportional composition of ${x}. Best for understanding parts of a whole.`,
        },
        {
            chartType: 'treemap',
            category: 'composition',
            requires: { categorical: 1 },
            score: (cols) => {
                const catCols = cols.filter(c =>
                    c.type === 'categorical' && !c.isConstant &&
                    c.uniqueCount > 5 && c.uniqueCount <= 50
                );
                return catCols.length >= 1 ? 0.4 : 0;
            },
            titleTemplate: (x) => `${x} Breakdown`,
            reasonTemplate: (x) => `Hierarchical view of ${x} proportions. Good for many categories.`,
        },

        // ── Trend Charts ──────────────────────────────────────────────
        {
            chartType: 'line',
            category: 'trend',
            requires: { datetime: 1, numeric: 1 },
            score: (cols) => {
                const dateCols = cols.filter(c => c.type === 'datetime');
                const numCols = cols.filter(c => c.type === 'numeric' && !c.isIdentifier);
                if (dateCols.length === 0 || numCols.length === 0) return 0;
                return 0.8; // High confidence for time series
            },
            titleTemplate: (x, y) => `${y} Over Time`,
            reasonTemplate: (x, y) => `Shows how ${y} changes over time based on ${x}. Ideal for identifying trends and seasonality.`,
        },
        {
            chartType: 'area',
            category: 'trend',
            requires: { datetime: 1, numeric: 1 },
            score: (cols) => {
                const dateCols = cols.filter(c => c.type === 'datetime');
                const numCols = cols.filter(c => c.type === 'numeric' && !c.isIdentifier);
                if (dateCols.length === 0 || numCols.length === 0) return 0;
                return 0.6; // Slightly less than line for trends
            },
            titleTemplate: (x, y) => `${y} Trend`,
            reasonTemplate: (x, y) => `Area chart showing the cumulative trend of ${y} over ${x}.`,
        },

        // ── Relationship Charts ───────────────────────────────────────
        {
            chartType: 'scatter',
            category: 'relationship',
            requires: { numeric: 2 },
            score: (cols) => {
                const numCols = cols.filter(c => c.type === 'numeric' && !c.isIdentifier);
                if (numCols.length < 2) return 0;
                // Higher score when both columns have low outlier rates
                const lowOutlier = numCols.every(c =>
                    !c.numericStats || c.numericStats.outlierCount < c.uniqueCount * 0.1
                );
                return lowOutlier ? 0.7 : 0.5;
            },
            titleTemplate: (x, y) => `${x} vs ${y}`,
            reasonTemplate: (x, y) => `Explores the relationship between ${x} and ${y}. Look for correlation patterns.`,
        },
        {
            chartType: 'heatmap',
            category: 'relationship',
            requires: { numeric: 3 },
            score: (cols) => {
                const numCols = cols.filter(c => c.type === 'numeric' && !c.isIdentifier);
                return numCols.length >= 3 ? 0.5 : 0;
            },
            titleTemplate: () => 'Correlation Matrix',
            reasonTemplate: () => 'Shows correlations between all numeric variables. Red/blue indicates positive/negative relationships.',
        },
    ];
}

// ── Main Recommendation Engine ─────────────────────────────────────────

/**
 * Generate chart recommendations for a dataset.
 *
 * @param rows - The dataset rows
 * @param columnMeta - Column metadata from column-validator
 * @param maxRecommendations - Maximum number of recommendations (default: 8)
 * @returns Prioritized chart recommendations
 */
export function recommendCharts(
    rows: any[],
    columnMeta: Record<string, ColumnMeta>,
    maxRecommendations: number = 8
): RecommendationResult {
    if (rows.length === 0) {
        return {
            recommendations: [],
            summary: 'No data available for recommendations.',
            profiledAt: new Date().toISOString(),
        };
    }

    const profiles = buildColumnProfiles(rows, columnMeta);
    const rules = getChartRules();
    const candidates: ChartRecommendation[] = [];

    // Evaluate each rule
    for (const rule of rules) {
        // Check minimum requirements
        const numericCount = profiles.filter(c => c.type === 'numeric' && !c.isIdentifier).length;
        const categoricalCount = profiles.filter(c => c.type === 'categorical' && !c.isConstant).length;
        const datetimeCount = profiles.filter(c => c.type === 'datetime').length;

        if (rule.requires.numeric && numericCount < rule.requires.numeric) continue;
        if (rule.requires.categorical && categoricalCount < rule.requires.categorical) continue;
        if (rule.requires.datetime && datetimeCount < rule.requires.datetime) continue;

        // Find best column combination for this chart type
        const bestCombo = findBestColumnCombo(rule, profiles);
        if (!bestCombo) continue;

        const confidence = rule.score(bestCombo.selected, profiles);
        if (confidence <= 0) continue;

        candidates.push({
            id: `rec-${rule.chartType}-${bestCombo.x?.name || 'none'}-${bestCombo.y?.name || 'none'}`,
            chartType: rule.chartType,
            title: rule.titleTemplate(bestCombo.x?.name, bestCombo.y?.name, bestCombo.z?.name),
            description: generateChartDescription(rule.chartType, bestCombo.x, bestCombo.y, rows.length),
            reason: rule.reasonTemplate(bestCombo.x?.name, bestCombo.y?.name),
            confidence,
            xColumn: bestCombo.x?.name,
            yColumn: bestCombo.y?.name,
            zColumn: bestCombo.z?.name,
            aggregation: bestCombo.aggregation,
            category: rule.category,
        });
    }

    // Sort by confidence and remove redundant recommendations
    candidates.sort((a, b) => b.confidence - a.confidence);
    const filtered = removeRedundancy(candidates).slice(0, maxRecommendations);

    const summary = generateSummary(filtered, profiles, rows.length);

    return {
        recommendations: filtered,
        summary,
        profiledAt: new Date().toISOString(),
    };
}

// ── Column Combination Selection ───────────────────────────────────────

interface ColumnCombo {
    x?: ColumnProfile;
    y?: ColumnProfile;
    z?: ColumnProfile;
    selected: ColumnProfile[];
    aggregation?: 'sum' | 'mean' | 'count' | 'min' | 'max';
}

function findBestColumnCombo(
    rule: ChartRule,
    profiles: ColumnProfile[]
): ColumnCombo | null {
    const numCols = profiles.filter(c => c.type === 'numeric' && !c.isIdentifier && c.nullPercentage < 50);
    const catCols = profiles.filter(c => c.type === 'categorical' && !c.isConstant && c.nullPercentage < 50);
    const dateCols = profiles.filter(c => c.type === 'datetime' && c.nullPercentage < 50);

    switch (rule.chartType) {
        case 'histogram':
        case 'box': {
            const col = numCols[0];
            return col ? { y: col, selected: [col] } : null;
        }

        case 'bar': {
            // Best categorical for X, best numeric for Y
            const x = catCols.find(c => c.uniqueCount <= 15) || catCols[0];
            const y = numCols[0];
            if (!x || !y) return null;
            return { x, y, selected: [x, y], aggregation: 'sum' };
        }

        case 'pie': {
            const x = catCols.find(c => c.uniqueCount >= 2 && c.uniqueCount <= 8);
            return x ? { x, selected: [x], aggregation: 'count' } : null;
        }

        case 'treemap': {
            const x = catCols.find(c => c.uniqueCount > 5 && c.uniqueCount <= 50);
            const y = numCols[0];
            return x ? { x, y, selected: [x, ...(y ? [y] : [])], aggregation: y ? 'sum' : 'count' } : null;
        }

        case 'line':
        case 'area': {
            const x = dateCols[0];
            const y = numCols[0];
            if (!x || !y) return null;
            return { x, y, selected: [x, y] };
        }

        case 'scatter': {
            if (numCols.length < 2) return null;
            // Pick two most different numeric columns
            const x = numCols[0];
            const y = numCols.find(c => c.name !== x.name && c.numericStats &&
                Math.abs(c.numericStats.mean - x.numericStats!.mean) > x.numericStats!.stdDev
            ) || numCols[1];
            return { x, y, selected: [x, y] };
        }

        case 'heatmap': {
            const cols = numCols.slice(0, 5);
            return cols.length >= 3 ? { selected: cols } : null;
        }

        default:
            return null;
    }
}

// ── Redundancy Removal ─────────────────────────────────────────────────

function removeRedundancy(recs: ChartRecommendation[]): ChartRecommendation[] {
    const seen = new Set<string>();
    const result: ChartRecommendation[] = [];

    for (const rec of recs) {
        // Create a key based on chart type and columns
        const key = `${rec.chartType}:${rec.xColumn || ''}:${rec.yColumn || ''}`;
        if (seen.has(key)) continue;
        seen.add(key);

        // Also skip if we already have a chart for the same columns with higher confidence
        const existingForColumns = result.find(r =>
            r.xColumn === rec.xColumn && r.yColumn === rec.yColumn && r.confidence >= rec.confidence
        );
        if (existingForColumns) continue;

        result.push(rec);
    }

    return result;
}

// ── Description Generation ─────────────────────────────────────────────

function generateChartDescription(
    chartType: ChartType,
    x?: ColumnProfile,
    y?: ColumnProfile,
    rowCount?: number
): string {
    const descriptions: Record<ChartType, string> = {
        bar: `Bar chart comparing ${y?.name || 'values'} across ${x?.name || 'categories'}. ${x ? `${x.uniqueCount} categories` : ''}.`,
        line: `Line chart showing the trend of ${y?.name || 'values'} over ${x?.name || 'time'}. ${rowCount ? `${rowCount} data points` : ''}.`,
        scatter: `Scatter plot exploring the relationship between ${x?.name || 'X'} and ${y?.name || 'Y'}. ${rowCount ? `${rowCount} observations` : ''}.`,
        pie: `Pie chart showing the proportional distribution of ${x?.name || 'categories'}. ${x ? `${x.uniqueCount} segments` : ''}.`,
        histogram: `Histogram showing the frequency distribution of ${y?.name || 'values'}. Reveals data shape and spread.`,
        area: `Area chart showing the cumulative trend of ${y?.name || 'values'} over ${x?.name || 'time'}.`,
        heatmap: 'Correlation heatmap showing relationships between numeric variables.',
        box: `Box plot showing the distribution quartiles and outliers of ${y?.name || 'values'}.`,
        treemap: `Treemap showing hierarchical proportions of ${x?.name || 'categories'}.`,
        table: 'Data table showing raw values.',
    };

    return descriptions[chartType] || '';
}

// ── Summary Generation ─────────────────────────────────────────────────

function generateSummary(
    recs: ChartRecommendation[],
    profiles: ColumnProfile[],
    rowCount: number
): string {
    if (recs.length === 0) {
        return 'No suitable chart recommendations found for this dataset.';
    }

    const categories = new Set(recs.map(r => r.category));
    const numNumeric = profiles.filter(c => c.type === 'numeric').length;
    const numCategorical = profiles.filter(c => c.type === 'categorical').length;
    const numDatetime = profiles.filter(c => c.type === 'datetime').length;

    const lines: string[] = [];
    lines.push(`Found ${recs.length} chart recommendation(s) for a dataset with ${rowCount.toLocaleString()} rows.`);
    lines.push(`Columns: ${numNumeric} numeric, ${numCategorical} categorical, ${numDatetime} datetime.`);
    lines.push(`Chart categories: ${[...categories].join(', ')}.`);

    return lines.join(' ');
}
