/**
 * Automated Insight Detection Engine
 *
 * Discovers potentially important patterns in datasets without
 * requiring the user to ask a question. Uses deterministic statistical
 * methods for reliable insight generation.
 */

import { DatasetProfile, profileDataset } from './dataset-profiler';
import { ColumnMeta } from './column-validator';

// ── Types ──────────────────────────────────────────────────────────────

export type InsightType =
    | 'trend'
    | 'outlier'
    | 'correlation'
    | 'distribution'
    | 'anomaly'
    | 'group_difference'
    | 'summary';

export type InsightSeverity = 'low' | 'medium' | 'high';

export interface Insight {
    id: string;
    type: InsightType;
    severity: InsightSeverity;
    confidence: number; // 0-1
    title: string;
    finding: string;
    evidence: string;
    relevantColumns: string[];
    suggestedVisualization?: string;
    timestamp: string;
}

export interface InsightResult {
    insights: Insight[];
    summary: string;
    generatedAt: string;
}

// ── Insight Detection Functions ────────────────────────────────────────

/**
 * Detect outliers using IQR method.
 */
function detectOutliers(profile: DatasetProfile): Insight[] {
    const insights: Insight[] = [];

    for (const col of profile.columns) {
        if (!col.numericStats || col.numericStats.outlierCount === 0) continue;

        const { outlierCount, min, max, mean, stdDev } = col.numericStats;
        const outlierRate = (outlierCount / col.totalCount) * 100;

        const severity: InsightSeverity = outlierRate > 10 ? 'high' : outlierRate > 5 ? 'medium' : 'low';

        insights.push({
            id: `outlier-${col.name}-${Date.now()}`,
            type: 'outlier',
            severity,
            confidence: 0.85,
            title: `Outliers detected in ${col.name}`,
            finding: `${outlierCount} outlier(s) detected in ${col.name} (${outlierRate.toFixed(1)}% of data). Values range from ${formatNumber(min)} to ${formatNumber(max)}.`,
            evidence: `Mean: ${formatNumber(mean)}, StdDev: ${formatNumber(stdDev)}. Using IQR method (1.5x IQR beyond Q1/Q3).`,
            relevantColumns: [col.name],
            suggestedVisualization: 'box',
            timestamp: new Date().toISOString(),
        });
    }

    return insights;
}

/**
 * Detect trends by comparing first and second halves of the data.
 */
function detectTrends(profile: DatasetProfile, rows: any[]): Insight[] {
    const insights: Insight[] = [];

    for (const col of profile.columns) {
        if (col.detectedType !== 'numeric' || col.isIdentifier) continue;

        const values = rows
            .map(r => r[col.name])
            .filter(v => typeof v === 'number' && !isNaN(v));

        if (values.length < 10) continue;

        const half = Math.floor(values.length / 2);
        const firstHalf = values.slice(0, half);
        const secondHalf = values.slice(half);

        const mean1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const mean2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

        if (mean1 === 0) continue;

        const percentChange = ((mean2 - mean1) / Math.abs(mean1)) * 100;

        if (Math.abs(percentChange) > 15) {
            const direction = percentChange > 0 ? 'increased' : 'decreased';
            const severity: InsightSeverity = Math.abs(percentChange) > 50 ? 'high' : Math.abs(percentChange) > 30 ? 'medium' : 'low';

            insights.push({
                id: `trend-${col.name}-${Date.now()}`,
                type: 'trend',
                severity,
                confidence: 0.8,
                title: `${capitalize(direction)} trend in ${col.name}`,
                finding: `Values in ${col.name} have ${direction} by approximately ${Math.abs(percentChange).toFixed(1)}% from the first half to the second half of the dataset.`,
                evidence: `First half mean: ${formatNumber(mean1)}, Second half mean: ${formatNumber(mean2)}.`,
                relevantColumns: [col.name],
                suggestedVisualization: 'line',
                timestamp: new Date().toISOString(),
            });
        }
    }

    return insights;
}

/**
 * Detect correlations between numeric columns.
 */
function detectCorrelations(profile: DatasetProfile, rows: any[]): Insight[] {
    const insights: Insight[] = [];
    const numericCols = profile.columns.filter(
        c => c.detectedType === 'numeric' && !c.isIdentifier && c.uniqueCount > 5
    );

    // Check pairs of numeric columns
    for (let i = 0; i < numericCols.length; i++) {
        for (let j = i + 1; j < numericCols.length; j++) {
            const col1 = numericCols[i];
            const col2 = numericCols[j];

            const pairs = rows
                .map(r => [r[col1.name], r[col2.name]])
                .filter(([a, b]) =>
                    typeof a === 'number' && typeof b === 'number' &&
                    !isNaN(a) && !isNaN(b)
                );

            if (pairs.length < 10) continue;

            const correlation = calculatePearsonCorrelation(
                pairs.map(p => p[0]),
                pairs.map(p => p[1])
            );

            const absCorr = Math.abs(correlation);
            if (absCorr > 0.6) {
                const strength = absCorr > 0.8 ? 'strong' : 'moderate';
                const direction = correlation > 0 ? 'positive' : 'negative';
                const severity: InsightSeverity = absCorr > 0.8 ? 'high' : 'medium';

                insights.push({
                    id: `corr-${col1.name}-${col2.name}-${Date.now()}`,
                    type: 'correlation',
                    severity,
                    confidence: absCorr,
                    title: `${strength} ${direction} correlation: ${col1.name} vs ${col2.name}`,
                    finding: `There is a ${strength} ${direction} correlation (${correlation.toFixed(2)}) between ${col1.name} and ${col2.name}.`,
                    evidence: `Based on ${pairs.length} paired observations. Pearson r = ${correlation.toFixed(3)}.`,
                    relevantColumns: [col1.name, col2.name],
                    suggestedVisualization: 'scatter',
                    timestamp: new Date().toISOString(),
                });
            }
        }
    }

    return insights;
}

/**
 * Detect group differences in categorical columns.
 */
function detectGroupDifferences(profile: DatasetProfile, rows: any[]): Insight[] {
    const insights: Insight[] = [];

    const catCols = profile.columns.filter(
        c => c.detectedType === 'categorical' && !c.isConstant && c.uniqueCount >= 2 && c.uniqueCount <= 10
    );
    const numCols = profile.columns.filter(
        c => c.detectedType === 'numeric' && !c.isIdentifier && c.uniqueCount > 5
    );

    for (const catCol of catCols) {
        for (const numCol of numCols) {
            const groups: Record<string, number[]> = {};

            for (const row of rows) {
                const groupKey = String(row[catCol.name]);
                const value = row[numCol.name];
                if (typeof value === 'number' && !isNaN(value)) {
                    if (!groups[groupKey]) groups[groupKey] = [];
                    groups[groupKey].push(value);
                }
            }

            const groupEntries = Object.entries(groups).filter(([, vals]) => vals.length >= 3);
            if (groupEntries.length < 2) continue;

            const groupMeans = groupEntries.map(([key, vals]) => ({
                key,
                mean: vals.reduce((a, b) => a + b, 0) / vals.length,
                count: vals.length,
            }));

            // Find largest difference
            groupMeans.sort((a, b) => b.mean - a.mean);
            const maxDiff = groupMeans[0].mean - groupMeans[groupMeans.length - 1].mean;
            const overallMean = groupMeans.reduce((a, b) => a + b.mean, 0) / groupMeans.length;
            const relativeDiff = overallMean !== 0 ? (maxDiff / Math.abs(overallMean)) * 100 : 0;

            if (relativeDiff > 20) {
                const severity: InsightSeverity = relativeDiff > 50 ? 'high' : 'medium';

                insights.push({
                    id: `group-${catCol.name}-${numCol.name}-${Date.now()}`,
                    type: 'group_difference',
                    severity,
                    confidence: 0.75,
                    title: `${numCol.name} varies significantly by ${catCol.name}`,
                    finding: `The highest group (${groupMeans[0].key}: ${formatNumber(groupMeans[0].mean)}) is ${relativeDiff.toFixed(1)}% different from the lowest group (${groupMeans[groupMeans.length - 1].key}: ${formatNumber(groupMeans[groupMeans.length - 1].mean)}).`,
                    evidence: `Group means: ${groupMeans.map(g => `${g.key}: ${formatNumber(g.mean)} (n=${g.count})`).join(', ')}.`,
                    relevantColumns: [catCol.name, numCol.name],
                    suggestedVisualization: 'bar',
                    timestamp: new Date().toISOString(),
                });
            }
        }
    }

    return insights;
}

/**
 * Detect distribution anomalies (highly skewed data).
 */
function detectDistributionAnomalies(profile: DatasetProfile): Insight[] {
    const insights: Insight[] = [];

    for (const col of profile.columns) {
        if (col.detectedType !== 'numeric' || col.isIdentifier || !col.numericStats) continue;

        const { skewness, min, max, mean, stdDev } = col.numericStats;

        // High skewness
        if (Math.abs(skewness) > 1.5) {
            const direction = skewness > 0 ? 'right' : 'left';
            insights.push({
                id: `skew-${col.name}-${Date.now()}`,
                type: 'distribution',
                severity: 'medium',
                confidence: 0.8,
                title: `Highly skewed distribution: ${col.name}`,
                finding: `${col.name} has a ${direction}-skewed distribution (skewness: ${skewness.toFixed(2)}).`,
                evidence: `Mean: ${formatNumber(mean)}, StdDev: ${formatNumber(stdDev)}, Range: ${formatNumber(min)} - ${formatNumber(max)}.`,
                relevantColumns: [col.name],
                suggestedVisualization: 'histogram',
                timestamp: new Date().toISOString(),
            });
        }
    }

    return insights;
}

/**
 * Generate dataset summary insight.
 */
function generateSummaryInsight(profile: DatasetProfile): Insight {
    const numNumeric = profile.columns.filter(c => c.detectedType === 'numeric').length;
    const numCategorical = profile.columns.filter(c => c.detectedType === 'categorical').length;
    const numDatetime = profile.columns.filter(c => c.detectedType === 'datetime').length;

    return {
        id: `summary-${Date.now()}`,
        type: 'summary',
        severity: 'low',
        confidence: 1.0,
        title: 'Dataset Overview',
        finding: `This dataset contains ${profile.rowCount.toLocaleString()} rows and ${profile.columnCount} columns (${numNumeric} numeric, ${numCategorical} categorical, ${numDatetime} datetime).`,
        evidence: `Data quality score: ${profile.quality.overallScore}/100. ${profile.duplicateRowCount} duplicate rows detected.`,
        relevantColumns: profile.columns.map(c => c.name),
        timestamp: new Date().toISOString(),
    };
}

// ── Main Engine ────────────────────────────────────────────────────────

/**
 * Detect all insights in a dataset.
 *
 * @param rows - The raw dataset rows
 * @param profile - Optional pre-computed profile (will be generated if not provided)
 * @param maxInsights - Maximum number of insights to return
 * @returns Ranked insights with summary
 */
export function detectInsights(
    rows: any[],
    profile?: DatasetProfile,
    maxInsights: number = 10
): InsightResult {
    if (rows.length === 0) {
        return {
            insights: [],
            summary: 'No data available for analysis.',
            generatedAt: new Date().toISOString(),
        };
    }

    const datasetProfile = profile || profileDataset(rows);

    // Run all detectors
    const allInsights: Insight[] = [
        ...detectOutliers(datasetProfile),
        ...detectTrends(datasetProfile, rows),
        ...detectCorrelations(datasetProfile, rows),
        ...detectGroupDifferences(datasetProfile, rows),
        ...detectDistributionAnomalies(datasetProfile),
        generateSummaryInsight(datasetProfile),
    ];

    // Sort by confidence * severity weight, then take top N
    const severityWeight: Record<InsightSeverity, number> = {
        high: 3,
        medium: 2,
        low: 1,
    };

    allInsights.sort((a, b) => {
        const scoreA = a.confidence * severityWeight[a.severity];
        const scoreB = b.confidence * severityWeight[b.severity];
        return scoreB - scoreA;
    });

    const ranked = allInsights.slice(0, maxInsights);

    const summary = generateInsightSummary(ranked, datasetProfile);

    return {
        insights: ranked,
        summary,
        generatedAt: new Date().toISOString(),
    };
}

// ── Helpers ────────────────────────────────────────────────────────────

function calculatePearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n < 2) return 0;

    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        numerator += dx * dy;
        denomX += dx * dx;
        denomY += dy * dy;
    }

    const denom = Math.sqrt(denomX * denomY);
    return denom === 0 ? 0 : numerator / denom;
}

function formatNumber(n: number): string {
    if (Number.isInteger(n)) return n.toLocaleString();
    return n.toFixed(2);
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function generateInsightSummary(insights: Insight[], profile: DatasetProfile): string {
    if (insights.length === 0) {
        return 'No significant insights detected in this dataset.';
    }

    const highSev = insights.filter(i => i.severity === 'high').length;
    const medSev = insights.filter(i => i.severity === 'medium').length;
    const types = new Set(insights.map(i => i.type));

    const parts: string[] = [];
    parts.push(`Detected ${insights.length} insight(s) in ${profile.rowCount.toLocaleString()} rows.`);

    if (highSev > 0) parts.push(`${highSev} high-priority finding(s).`);
    if (medSev > 0) parts.push(`${medSev} medium-priority finding(s).`);
    parts.push(`Types: ${[...types].join(', ')}.`);

    return parts.join(' ');
}
