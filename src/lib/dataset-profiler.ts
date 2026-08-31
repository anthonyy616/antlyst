/**
 * Dataset Profiler & Data Quality Analyzer
 *
 * Automatically analyzes dataset structure, column types, statistics,
 * and data quality when a dataset enters the system.
 */

import { ColumnMeta, analyzeColumns } from './column-validator';

// ── Types ──────────────────────────────────────────────────────────────

export type IssueSeverity = 'info' | 'warning' | 'critical';

export interface DataQualityIssue {
    category: string;
    severity: IssueSeverity;
    title: string;
    description: string;
    affectedColumns?: string[];
    suggestion: string;
}

export interface DataQualityResult {
    overallScore: number; // 0-100
    issues: DataQualityIssue[];
    summary: {
        totalChecks: number;
        passed: number;
        warnings: number;
        critical: number;
    };
}

export interface NumericColumnStats {
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
    variance: number;
    q1: number;
    q3: number;
    iqr: number;
    skewness: number;
    outlierCount: number;
    missingCount: number;
    missingPercentage: number;
}

export interface CategoricalColumnStats {
    uniqueCount: number;
    missingCount: number;
    missingPercentage: number;
    topValues: { value: string; count: number; percentage: number }[];
    avgLength: number;
    entropy: number; // Diversity measure
}

export interface DatetimeColumnStats {
    earliest: string;
    latest: string;
    rangeDays: number;
    missingCount: number;
    missingPercentage: number;
    uniqueDates: number;
}

export interface ColumnProfile {
    name: string;
    detectedType: ColumnMeta['type'];
    totalCount: number;
    missingCount: number;
    missingPercentage: number;
    uniqueCount: number;
    uniquePercentage: number;
    isConstant: boolean;
    isIdentifier: boolean;
    numericStats?: NumericColumnStats;
    categoricalStats?: CategoricalColumnStats;
    datetimeStats?: DatetimeColumnStats;
}

export interface DatasetProfile {
    datasetName: string;
    rowCount: number;
    columnCount: number;
    totalCells: number;
    totalMissing: number;
    overallMissingPercentage: number;
    duplicateRowCount: number;
    duplicateRowPercentage: number;
    memoryEstimateBytes: number;
    columns: ColumnProfile[];
    columnMeta: Record<string, ColumnMeta>;
    quality: DataQualityResult;
    profiledAt: string;
    sampled: boolean;
}

// ── Sampling for Large Datasets ────────────────────────────────────────

const MAX_PROFILE_ROWS = 50_000;

function getSampledData(rows: any[]): { data: any[]; sampled: boolean } {
    if (rows.length <= MAX_PROFILE_ROWS) {
        return { data: rows, sampled: false };
    }
    // Even sampling
    const step = Math.floor(rows.length / MAX_PROFILE_ROWS);
    const sampled = rows.filter((_, i) => i % step === 0).slice(0, MAX_PROFILE_ROWS);
    return { data: sampled, sampled: true };
}

// ── Numeric Statistics ─────────────────────────────────────────────────

function calculateNumericStats(values: any[]): NumericColumnStats {
    const nums = values
        .filter((v): v is number => v !== null && v !== undefined && v !== '' && !isNaN(Number(v)))
        .map(Number);

    const missingCount = values.length - nums.length;
    const missingPercentage = values.length > 0 ? (missingCount / values.length) * 100 : 100;

    if (nums.length === 0) {
        return {
            min: 0, max: 0, mean: 0, median: 0, stdDev: 0, variance: 0,
            q1: 0, q3: 0, iqr: 0, skewness: 0, outlierCount: 0,
            missingCount, missingPercentage,
        };
    }

    const sorted = [...nums].sort((a, b) => a - b);
    const n = nums.length;
    const sum = nums.reduce((a, b) => a + b, 0);
    const mean = sum / n;

    // Median
    const median = n % 2 === 0
        ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
        : sorted[Math.floor(n / 2)];

    // Variance & StdDev
    const variance = nums.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // Quartiles
    const q1Idx = Math.floor(n * 0.25);
    const q3Idx = Math.floor(n * 0.75);
    const q1 = sorted[q1Idx];
    const q3 = sorted[q3Idx];
    const iqr = q3 - q1;

    // Skewness (Pearson's moment coefficient)
    const m3 = nums.reduce((acc, v) => acc + Math.pow(v - mean, 3), 0) / n;
    const skewness = stdDev > 0 ? m3 / Math.pow(stdDev, 3) : 0;

    // Outliers (IQR method)
    const lowerFence = q1 - 1.5 * iqr;
    const upperFence = q3 + 1.5 * iqr;
    const outlierCount = nums.filter(v => v < lowerFence || v > upperFence).length;

    return {
        min: sorted[0],
        max: sorted[n - 1],
        mean,
        median,
        stdDev,
        variance,
        q1,
        q3,
        iqr,
        skewness,
        outlierCount,
        missingCount,
        missingPercentage,
    };
}

// ── Categorical Statistics ─────────────────────────────────────────────

function calculateCategoricalStats(values: any[]): CategoricalColumnStats {
    const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
    const missingCount = values.length - nonNull.length;
    const missingPercentage = values.length > 0 ? (missingCount / values.length) * 100 : 100;

    const counts: Record<string, number> = {};
    let totalLength = 0;

    for (const val of nonNull) {
        const key = String(val);
        counts[key] = (counts[key] || 0) + 1;
        totalLength += key.length;
    }

    const uniqueCount = Object.keys(counts).length;
    const avgLength = nonNull.length > 0 ? totalLength / nonNull.length : 0;

    // Top values
    const topValues = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([value, count]) => ({
            value,
            count,
            percentage: (count / nonNull.length) * 100,
        }));

    // Shannon entropy (diversity measure)
    let entropy = 0;
    for (const count of Object.values(counts)) {
        const p = count / nonNull.length;
        if (p > 0) entropy -= p * Math.log2(p);
    }

    return {
        uniqueCount,
        missingCount,
        missingPercentage,
        topValues,
        avgLength,
        entropy,
    };
}

// ── Datetime Statistics ────────────────────────────────────────────────

function calculateDatetimeStats(values: any[]): DatetimeColumnStats {
    const dates: Date[] = [];
    let missingCount = 0;

    for (const val of values) {
        if (val === null || val === undefined || val === '') {
            missingCount++;
            continue;
        }
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
            dates.push(d);
        } else {
            missingCount++;
        }
    }

    const missingPercentage = values.length > 0 ? (missingCount / values.length) * 100 : 100;

    if (dates.length === 0) {
        return {
            earliest: '',
            latest: '',
            rangeDays: 0,
            missingCount,
            missingPercentage,
            uniqueDates: 0,
        };
    }

    dates.sort((a, b) => a.getTime() - b.getTime());
    const rangeDays = Math.ceil(
        (dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
        earliest: dates[0].toISOString(),
        latest: dates[dates.length - 1].toISOString(),
        rangeDays,
        missingCount,
        missingPercentage,
        uniqueDates: new Set(dates.map(d => d.toISOString().split('T')[0])).size,
    };
}

// ── Duplicate Detection ────────────────────────────────────────────────

function countDuplicateRows(rows: any[]): number {
    if (rows.length === 0) return 0;

    const seen = new Set<string>();
    let duplicates = 0;

    for (const row of rows) {
        const key = JSON.stringify(row);
        if (seen.has(key)) {
            duplicates++;
        } else {
            seen.add(key);
        }
    }

    return duplicates;
}

// ── Memory Estimation ──────────────────────────────────────────────────

function estimateMemory(rows: any[]): number {
    if (rows.length === 0) return 0;

    // Sample first 100 rows to estimate
    const sample = rows.slice(0, 100);
    const sampleSize = Buffer.byteLength(JSON.stringify(sample), 'utf-8');
    const avgRowSize = sampleSize / sample.length;
    return Math.ceil(avgRowSize * rows.length);
}

// ── Data Quality Scoring ───────────────────────────────────────────────

function calculateDataQuality(
    rows: any[],
    columns: string[],
    columnProfiles: ColumnProfile[],
    duplicateCount: number
): DataQualityResult {
    const issues: DataQualityIssue[] = [];
    let totalChecks = 0;
    let passed = 0;

    // Check 1: Missing values
    totalChecks++;
    const totalCells = rows.length * columns.length;
    const totalMissing = columnProfiles.reduce((acc, p) => acc + p.missingCount, 0);
    const missingRate = totalCells > 0 ? totalMissing / totalCells : 0;

    if (missingRate === 0) {
        passed++;
    } else if (missingRate < 0.05) {
        issues.push({
            category: 'missing_values',
            severity: 'info',
            title: 'Minor missing values detected',
            description: `${(missingRate * 100).toFixed(1)}% of cells are missing.`,
            suggestion: 'Consider filling missing values or removing incomplete rows.',
        });
    } else if (missingRate < 0.2) {
        const affectedCols = columnProfiles
            .filter(p => p.missingPercentage > 10)
            .map(p => p.name);
        issues.push({
            category: 'missing_values',
            severity: 'warning',
            title: 'Moderate missing values detected',
            description: `${(missingRate * 100).toFixed(1)}% of cells are missing.`,
            affectedColumns: affectedCols,
            suggestion: 'Review affected columns. Consider imputation or removal.',
        });
    } else {
        const affectedCols = columnProfiles
            .filter(p => p.missingPercentage > 10)
            .map(p => p.name);
        issues.push({
            category: 'missing_values',
            severity: 'critical',
            title: 'High missing value rate',
            description: `${(missingRate * 100).toFixed(1)}% of cells are missing. Data may be unreliable.`,
            affectedColumns: affectedCols,
            suggestion: 'Investigate data collection process. Consider removing severely incomplete columns.',
        });
    }

    // Check 2: Duplicate rows
    totalChecks++;
    const dupRate = rows.length > 0 ? duplicateCount / rows.length : 0;
    if (dupRate === 0) {
        passed++;
    } else if (dupRate < 0.05) {
        issues.push({
            category: 'duplicates',
            severity: 'info',
            title: 'Minor duplicate rows detected',
            description: `${duplicateCount} duplicate rows found (${(dupRate * 100).toFixed(1)}%).`,
            suggestion: 'Consider removing duplicates for cleaner analysis.',
        });
    } else if (dupRate < 0.2) {
        issues.push({
            category: 'duplicates',
            severity: 'warning',
            title: 'Significant duplicate rows detected',
            description: `${duplicateCount} duplicate rows found (${(dupRate * 100).toFixed(1)}%).`,
            suggestion: 'Duplicate data may skew analysis results. Consider deduplication.',
        });
    } else {
        issues.push({
            category: 'duplicates',
            severity: 'critical',
            title: 'High duplicate row rate',
            description: `${duplicateCount} duplicate rows found (${(dupRate * 100).toFixed(1)}%). Data integrity may be compromised.`,
            suggestion: 'Investigate data collection for duplication issues.',
        });
    }

    // Check 3: Constant columns
    totalChecks++;
    const constantCols = columnProfiles.filter(p => p.isConstant);
    if (constantCols.length === 0) {
        passed++;
    } else {
        issues.push({
            category: 'constant_columns',
            severity: 'warning',
            title: `${constantCols.length} constant column(s) detected`,
            description: 'Columns with only one unique value provide no analytical value.',
            affectedColumns: constantCols.map(p => p.name),
            suggestion: 'Consider removing constant columns from analysis.',
        });
    }

    // Check 4: Identifier columns (high uniqueness)
    totalChecks++;
    const idCols = columnProfiles.filter(p => p.isIdentifier);
    if (idCols.length === 0) {
        passed++;
    } else {
        issues.push({
            category: 'identifier_columns',
            severity: 'info',
            title: `${idCols.length} identifier column(s) detected`,
            description: 'Columns with near-unique values are likely identifiers, not measurements.',
            affectedColumns: idCols.map(p => p.name),
            suggestion: 'Use identifiers for joining, not for chart values.',
        });
    }

    // Check 5: Outliers in numeric columns
    totalChecks++;
    const colsWithOutliers = columnProfiles.filter(
        p => p.numericStats && p.numericStats.outlierCount > 0
    );
    if (colsWithOutliers.length === 0) {
        passed++;
    } else {
        const totalOutliers = colsWithOutliers.reduce(
            (acc, p) => acc + (p.numericStats?.outlierCount || 0), 0
        );
        issues.push({
            category: 'outliers',
            severity: 'warning',
            title: `${totalOutliers} outlier(s) detected across ${colsWithOutliers.length} column(s)`,
            description: 'Outliers may indicate data errors or genuinely extreme values.',
            affectedColumns: colsWithOutliers.map(p => p.name),
            suggestion: 'Review outliers before analysis. They may need removal or special handling.',
        });
    }

    // Check 6: Very high cardinality categorical columns
    totalChecks++;
    const highCardCols = columnProfiles.filter(
        p => p.categoricalStats && p.uniqueCount > rows.length * 0.9
    );
    if (highCardCols.length === 0) {
        passed++;
    } else {
        issues.push({
            category: 'high_cardinality',
            severity: 'info',
            title: `${highCardCols.length} high-cardinality categorical column(s)`,
            description: 'Columns with nearly as many unique values as rows may be identifiers or free text.',
            affectedColumns: highCardCols.map(p => p.name),
            suggestion: 'Consider grouping or binning for better visualization.',
        });
    }

    // Calculate overall score
    const warnings = issues.filter(i => i.severity === 'warning').length;
    const criticals = issues.filter(i => i.severity === 'critical').length;
    const deductions = warnings * 5 + criticals * 15;
    const overallScore = Math.max(0, Math.min(100, 100 - deductions));

    return {
        overallScore,
        issues,
        summary: {
            totalChecks,
            passed,
            warnings,
            critical: criticals,
        },
    };
}

// ── Main Profiler ──────────────────────────────────────────────────────

/**
 * Profile a dataset and return comprehensive metadata, statistics, and quality analysis.
 *
 * @param rows - The raw dataset rows
 * @param datasetName - Name of the dataset
 * @returns Complete dataset profile
 */
export function profileDataset(
    rows: any[],
    datasetName: string = 'Untitled Dataset'
): DatasetProfile {
    const { data, sampled } = getSampledData(rows);

    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    const columnMeta = analyzeColumns(data);

    // Build column profiles
    const columnProfiles: ColumnProfile[] = columns.map(col => {
        const meta = columnMeta[col];
        const values = data.map(row => row[col]);
        const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
        const uniqueValues = new Set(nonNull.map(String));

        const profile: ColumnProfile = {
            name: col,
            detectedType: meta?.type || 'unknown',
            totalCount: data.length,
            missingCount: meta?.nullCount || (data.length - nonNull.length),
            missingPercentage: meta?.nullPercentage || ((data.length - nonNull.length) / data.length * 100),
            uniqueCount: uniqueValues.size,
            uniquePercentage: nonNull.length > 0 ? (uniqueValues.size / nonNull.length) * 100 : 0,
            isConstant: uniqueValues.size <= 1,
            isIdentifier: meta?.type === 'id' || (meta?.type === 'unknown' && uniqueValues.size > data.length * 0.95),
        };

        // Type-specific stats
        if (meta?.type === 'numeric') {
            profile.numericStats = calculateNumericStats(values);
        } else if (meta?.type === 'categorical') {
            profile.categoricalStats = calculateCategoricalStats(values);
        } else if (meta?.type === 'datetime') {
            profile.datetimeStats = calculateDatetimeStats(values);
        }

        return profile;
    });

    // Dataset-level metrics
    const duplicateCount = countDuplicateRows(data);
    const totalMissing = columnProfiles.reduce((acc, p) => acc + p.missingCount, 0);
    const totalCells = data.length * columns.length;

    // Quality analysis
    const quality = calculateDataQuality(data, columns, columnProfiles, duplicateCount);

    return {
        datasetName,
        rowCount: data.length,
        columnCount: columns.length,
        totalCells,
        totalMissing,
        overallMissingPercentage: totalCells > 0 ? (totalMissing / totalCells) * 100 : 0,
        duplicateRowCount: duplicateCount,
        duplicateRowPercentage: data.length > 0 ? (duplicateCount / data.length) * 100 : 0,
        memoryEstimateBytes: estimateMemory(rows),
        columns: columnProfiles,
        columnMeta,
        quality,
        profiledAt: new Date().toISOString(),
        sampled,
    };
}

/**
 * Get a human-readable summary of the dataset profile.
 */
export function formatProfileSummary(profile: DatasetProfile): string {
    const lines: string[] = [];

    lines.push(`## Dataset: ${profile.datasetName}`);
    lines.push(`- Rows: ${profile.rowCount.toLocaleString()}`);
    lines.push(`- Columns: ${profile.columnCount}`);
    lines.push(`- Memory Estimate: ${(profile.memoryEstimateBytes / 1024 / 1024).toFixed(2)} MB`);
    if (profile.sampled) lines.push(`- ⚠ Profiled using sampled data (first ${MAX_PROFILE_ROWS.toLocaleString()} rows)`);
    lines.push('');

    lines.push('### Column Types');
    const typeCounts: Record<string, number> = {};
    for (const col of profile.columns) {
        typeCounts[col.detectedType] = (typeCounts[col.detectedType] || 0) + 1;
    }
    for (const [type, count] of Object.entries(typeCounts)) {
        lines.push(`- ${type}: ${count}`);
    }
    lines.push('');

    lines.push('### Data Quality');
    lines.push(`- Score: ${profile.quality.overallScore}/100`);
    lines.push(`- Checks passed: ${profile.quality.summary.passed}/${profile.quality.summary.totalChecks}`);
    if (profile.quality.issues.length > 0) {
        lines.push('- Issues:');
        for (const issue of profile.quality.issues) {
            lines.push(`  - [${issue.severity.toUpperCase()}] ${issue.title}: ${issue.description}`);
        }
    }

    return lines.join('\n');
}
