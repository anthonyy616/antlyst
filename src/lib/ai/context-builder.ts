import { DashboardConfig } from '@/lib/analysis-engine';

/**
 * Builds a token-efficient AI context from dashboard config
 * Instead of raw CSV data, we use the pre-processed dashboard data
 * which contains aggregated stats, chart data, and insights
 */

export interface AIProjectContext {
  projectId: string;
  projectName: string;
  dashboardStyle: string;
  summary: {
    totalRows: number;
    totalColumns: number;
    columnNames: string[];
    numericColumns: string[];
    categoricalColumns: string[];
  };
  kpis: {
    label: string;
    value: string | number;
    change?: string;
  }[];
  chartSummaries: {
    title: string;
    type: string;
    description: string;
    topValues?: { label: string; value: number }[];
    statistics?: {
      min?: number;
      max?: number;
      mean?: number;
    };
  }[];
  insights: {
    type: string;
    title: string;
    description: string;
    severity: string;
  }[];
  dataPreview: {
    columns: string[];
    sampleRows: Record<string, any>[];
  };
}

/**
 * Converts a DashboardConfig into a token-efficient AI context
 * This extracts only what the AI needs to provide insights
 */
export function buildAIContext(
  projectId: string,
  projectName: string,
  config: DashboardConfig
): AIProjectContext {
  // Extract column types from stats
  const columns = config.stats?.columns || [];
  const preview = config.stats?.preview || [];

  // Infer column types from preview data
  const numericColumns: string[] = [];
  const categoricalColumns: string[] = [];

  if (preview.length > 0) {
    columns.forEach(col => {
      const sampleValue = preview[0][col];
      if (typeof sampleValue === 'number') {
        numericColumns.push(col);
      } else {
        categoricalColumns.push(col);
      }
    });
  }

  // Build chart summaries (extract key info without raw data arrays)
  const chartSummaries = config.charts.map(chart => {
    const summary: AIProjectContext['chartSummaries'][0] = {
      title: chart.title,
      type: chart.type,
      description: `${chart.type} chart showing ${chart.title}`,
    };

    // Extract top values for bar charts
    if (chart.type === 'bar' && chart.data[0]?.x && chart.data[0]?.y) {
      const x = chart.data[0].x as string[];
      const y = chart.data[0].y as number[];
      summary.topValues = x.slice(0, 5).map((label, i) => ({
        label,
        value: y[i]
      }));
      summary.description = `Bar chart showing top ${x.length} categories by count`;
    }

    // Extract statistics for histograms
    if (chart.type === 'histogram' && chart.data[0]?.x) {
      const values = chart.data[0].x as number[];
      if (values.length > 0) {
        summary.statistics = {
          min: Math.min(...values),
          max: Math.max(...values),
          mean: values.reduce((a, b) => a + b, 0) / values.length
        };
        summary.description = `Histogram showing distribution of values (min: ${summary.statistics.min?.toFixed(2)}, max: ${summary.statistics.max?.toFixed(2)}, mean: ${summary.statistics.mean?.toFixed(2)})`;
      }
    }

    // Extract scatter plot info
    if (chart.type === 'scatter') {
      const xAxis = chart.layout?.xaxis?.title || 'X';
      const yAxis = chart.layout?.yaxis?.title || 'Y';
      summary.description = `Scatter plot showing correlation between ${xAxis} and ${yAxis}`;
    }

    return summary;
  });

  return {
    projectId,
    projectName,
    dashboardStyle: config.layout,
    summary: {
      totalRows: config.stats?.rowCount || 0,
      totalColumns: columns.length,
      columnNames: columns,
      numericColumns,
      categoricalColumns
    },
    kpis: config.kpis,
    chartSummaries,
    insights: config.insights?.map(i => ({
      type: i.type,
      title: i.title,
      description: i.description,
      severity: i.severity
    })) || [],
    dataPreview: {
      columns,
      sampleRows: preview.slice(0, 10) // Only 10 rows for AI context
    }
  };
}

/**
 * Formats the AI context into a system prompt
 * Optimized for token efficiency while providing enough context
 */
export function formatContextForPrompt(context: AIProjectContext): string {
  const parts: string[] = [];

  parts.push(`## Project: ${context.projectName}`);
  parts.push(`Dashboard Style: ${context.dashboardStyle}`);
  parts.push('');

  // Summary
  parts.push('### Data Summary');
  parts.push(`- Total Rows: ${context.summary.totalRows.toLocaleString()}`);
  parts.push(`- Total Columns: ${context.summary.totalColumns}`);
  parts.push(`- Columns: ${context.summary.columnNames.join(', ')}`);
  if (context.summary.numericColumns.length > 0) {
    parts.push(`- Numeric Columns: ${context.summary.numericColumns.join(', ')}`);
  }
  if (context.summary.categoricalColumns.length > 0) {
    parts.push(`- Categorical Columns: ${context.summary.categoricalColumns.join(', ')}`);
  }
  parts.push('');

  // KPIs
  if (context.kpis.length > 0) {
    parts.push('### Key Metrics (KPIs)');
    context.kpis.forEach(kpi => {
      parts.push(`- ${kpi.label}: ${kpi.value}${kpi.change ? ` (${kpi.change})` : ''}`);
    });
    parts.push('');
  }

  // Chart Summaries
  if (context.chartSummaries.length > 0) {
    parts.push('### Generated Charts');
    context.chartSummaries.forEach(chart => {
      parts.push(`**${chart.title}** (${chart.type})`);
      parts.push(`  ${chart.description}`);
      if (chart.topValues && chart.topValues.length > 0) {
        parts.push('  Top values:');
        chart.topValues.forEach(v => {
          parts.push(`    - ${v.label}: ${v.value}`);
        });
      }
      if (chart.statistics) {
        parts.push(`  Stats: min=${chart.statistics.min?.toFixed(2)}, max=${chart.statistics.max?.toFixed(2)}, mean=${chart.statistics.mean?.toFixed(2)}`);
      }
    });
    parts.push('');
  }

  // Pre-computed Insights
  if (context.insights.length > 0) {
    parts.push('### Pre-computed Insights');
    context.insights.forEach(insight => {
      parts.push(`- [${insight.severity.toUpperCase()}] ${insight.title}: ${insight.description}`);
    });
    parts.push('');
  }

  // Sample Data
  if (context.dataPreview.sampleRows.length > 0) {
    parts.push('### Sample Data (first 10 rows)');
    parts.push('```');
    parts.push(context.dataPreview.columns.join(' | '));
    parts.push('-'.repeat(50));
    context.dataPreview.sampleRows.forEach(row => {
      const values = context.dataPreview.columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return 'null';
        if (typeof val === 'number') return val.toFixed(2);
        return String(val).slice(0, 20);
      });
      parts.push(values.join(' | '));
    });
    parts.push('```');
  }

  return parts.join('\n');
}

/**
 * Estimates token count for budget tracking
 * Rough estimate: 1 token ≈ 4 characters
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
