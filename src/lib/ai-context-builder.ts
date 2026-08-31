/**
 * AI Context Builder
 *
 * Builds structured analytical context for the AI model.
 * The AI should never receive raw datasets - only summaries, statistics,
 * and relevant metadata.
 */

import { DatasetProfile, profileDataset } from './dataset-profiler';
import { ColumnMeta } from './column-validator';

// ── Types ──────────────────────────────────────────────────────────────

export interface AIContext {
    /** High-level dataset summary */
    dataset: {
        name: string;
        rowCount: number;
        columnCount: number;
        columns: string[];
        columnTypes: Record<string, string>;
    };
    /** Column-level statistics */
    columns: ColumnInfo[];
    /** Quality information */
    quality: {
        score: number;
        issues: string[];
    };
    /** Current chart context (if asking about a specific chart) */
    chartContext?: ChartContext;
    /** Current filters applied */
    filters?: Record<string, any>;
    /** Relevant insights */
    insights?: string[];
}

export interface ColumnInfo {
    name: string;
    type: string;
    missing: number;
    unique: number;
    stats?: string; // Human-readable stats summary
}

export interface ChartContext {
    chartType: string;
    title: string;
    xColumn?: string;
    yColumn?: string;
    dataSummary?: string;
}

// ── Context Builder ────────────────────────────────────────────────────

/**
 * Build AI context from a dataset profile.
 * This is the primary context builder for general dataset questions.
 */
export function buildDatasetContext(
    profile: DatasetProfile,
    datasetName?: string
): AIContext {
    const columns: ColumnInfo[] = profile.columns.map(col => {
        const info: ColumnInfo = {
            name: col.name,
            type: col.detectedType,
            missing: col.missingCount,
            unique: col.uniqueCount,
        };

        // Add type-specific stats summary
        if (col.numericStats) {
            const s = col.numericStats;
            info.stats = `Range: ${formatNumber(s.min)} - ${formatNumber(s.max)}, Mean: ${formatNumber(s.mean)}, StdDev: ${formatNumber(s.stdDev)}`;
            if (s.outlierCount > 0) {
                info.stats += `, ${s.outlierCount} outliers`;
            }
        } else if (col.categoricalStats) {
            const s = col.categoricalStats;
            const topVals = s.topValues.slice(0, 3).map(v => `${v.value} (${v.percentage.toFixed(1)}%)`).join(', ');
            info.stats = `Top values: ${topVals || 'N/A'}`;
        } else if (col.datetimeStats) {
            const s = col.datetimeStats;
            if (s.earliest && s.latest) {
                info.stats = `Range: ${s.earliest.split('T')[0]} to ${s.latest.split('T')[0]} (${s.rangeDays} days)`;
            }
        }

        return info;
    });

    const columnTypes: Record<string, string> = {};
    for (const col of profile.columns) {
        columnTypes[col.name] = col.detectedType;
    }

    return {
        dataset: {
            name: datasetName || profile.datasetName,
            rowCount: profile.rowCount,
            columnCount: profile.columnCount,
            columns: profile.columns.map(c => c.name),
            columnTypes,
        },
        columns,
        quality: {
            score: profile.quality.overallScore,
            issues: profile.quality.issues.map(i =>
                `[${i.severity.toUpperCase()}] ${i.title}: ${i.description}`
            ),
        },
    };
}

/**
 * Build context for "Ask This Chart" feature.
 */
export function buildChartContext(
    profile: DatasetProfile,
    chartType: string,
    chartTitle: string,
    xColumn?: string,
    yColumn?: string,
    chartData?: any[]
): AIContext {
    const baseContext = buildDatasetContext(profile);

    // Find relevant column stats
    const relevantColumns = [xColumn, yColumn].filter(Boolean);
    const chartColumnInfo = baseContext.columns.filter(
        c => relevantColumns.includes(c.name)
    );

    // Build data summary from chart data
    let dataSummary = '';
    if (chartData && chartData.length > 0) {
        if (chartData.length <= 10) {
            dataSummary = `Chart data (${chartData.length} points): ${JSON.stringify(chartData.slice(0, 10))}`;
        } else {
            // Summarize large chart data
            const first5 = chartData.slice(0, 5);
            const last5 = chartData.slice(-5);
            dataSummary = `Chart data (${chartData.length} points): First 5: ${JSON.stringify(first5)}, Last 5: ${JSON.stringify(last5)}`;
        }
    }

    return {
        ...baseContext,
        chartContext: {
            chartType,
            title: chartTitle,
            xColumn,
            yColumn,
            dataSummary,
        },
    };
}

/**
 * Build context for a specific user question.
 * Adds relevant column focus based on question keywords.
 */
export function buildQuestionContext(
    profile: DatasetProfile,
    question: string
): AIContext {
    const baseContext = buildDatasetContext(profile);
    const lowerQuestion = question.toLowerCase();

    // Detect which columns the question is about
    const mentionedColumns = profile.columns.filter(col =>
        lowerQuestion.includes(col.name.toLowerCase())
    );

    // If specific columns mentioned, add extra detail
    if (mentionedColumns.length > 0) {
        const detailedColumns = baseContext.columns.map(col => {
            if (mentionedColumns.find(mc => mc.name === col.name)) {
                return { ...col, detailed: true };
            }
            return col;
        });
        baseContext.columns = detailedColumns as ColumnInfo[];
    }

    return baseContext;
}

// ── Prompt Engineering ─────────────────────────────────────────────────

/**
 * Build the system prompt for the AI data analyst.
 */
export function buildSystemPrompt(): string {
    return `You are an expert data analyst AI assistant. Your role is to help users understand their datasets and visualizations.

## Core Principles

1. **Distinguish between facts and speculation:**
   - "The data shows..." (observed fact)
   - "The analysis suggests..." (statistical relationship)
   - "A possible explanation is..." (hypothesis)
   - "Further investigation may be needed..." (recommendation)

2. **Never present assumptions as facts.** Always clarify when you're inferring vs. observing.

3. **Use the provided context.** Base your analysis on the actual statistics and data provided, not on general knowledge.

4. **Be specific.** Reference actual numbers, column names, and statistical measures.

5. **Suggest next steps.** Help users explore their data further.

## Response Structure

When appropriate, structure your responses as:
- **Summary:** One-line overview
- **Key Findings:** Specific observations with numbers
- **Supporting Evidence:** Statistical backing
- **Possible Explanations:** If applicable
- **Recommended Next Questions:** To explore further

## Formatting

Use markdown formatting:
- **Bold** for key terms
- \`code\` for column names
- Bullet points for lists
- Numbers for ranked items`;
}

/**
 * Build the user message with context for a dataset question.
 */
export function buildUserMessage(
    context: AIContext,
    question: string
): string {
    const parts: string[] = [];

    // Dataset overview
    parts.push(`## Dataset: ${context.dataset.name}`);
    parts.push(`- Rows: ${context.dataset.rowCount.toLocaleString()}`);
    parts.push(`- Columns: ${context.dataset.columnCount}`);
    parts.push(`- Column types: ${Object.entries(context.dataset.columnTypes)
        .map(([name, type]) => `${name} (${type})`)
        .join(', ')}`);
    parts.push('');

    // Column statistics
    parts.push('## Column Statistics');
    for (const col of context.columns) {
        parts.push(`- **${col.name}** [${col.type}]: ${col.stats || 'No stats available'}`);
    }
    parts.push('');

    // Quality
    if (context.quality.issues.length > 0) {
        parts.push('## Data Quality Issues');
        for (const issue of context.quality.issues) {
            parts.push(`- ${issue}`);
        }
        parts.push('');
    }

    // Chart context
    if (context.chartContext) {
        parts.push('## Current Chart');
        parts.push(`- Type: ${context.chartContext.chartType}`);
        parts.push(`- Title: ${context.chartContext.title}`);
        if (context.chartContext.xColumn) parts.push(`- X-axis: ${context.chartContext.xColumn}`);
        if (context.chartContext.yColumn) parts.push(`- Y-axis: ${context.chartContext.yColumn}`);
        if (context.chartContext.dataSummary) {
            parts.push(`- Data: ${context.chartContext.dataSummary}`);
        }
        parts.push('');
    }

    // The actual question
    parts.push('## Question');
    parts.push(question);

    return parts.join('\n');
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatNumber(n: number): string {
    if (Number.isInteger(n)) return n.toLocaleString();
    return n.toFixed(2);
}
