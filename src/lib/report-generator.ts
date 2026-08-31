/**
 * AI Report Generator
 *
 * Generates structured analytical reports from dataset analysis results.
 * Supports HTML and PDF export formats.
 * All content is data-grounded - no invented statistics.
 */

export interface ReportSection {
    title: string;
    content: string;
    type: 'text' | 'table' | 'chart' | 'list' | 'metrics';
    data?: any;
}

export interface Report {
    title: string;
    generatedAt: string;
    sections: ReportSection[];
    metadata: {
        dataSource: string;
        rowCount: number;
        columnCount: number;
        analysisTypes: string[];
    };
}

export interface ReportInput {
    datasetName: string;
    stats: {
        rowCount: number;
        columns: string[];
        preview: any[];
        columnMeta?: Record<string, any>;
    };
    insights?: any[];
    profile?: any;
    forecast?: any;
    automlResult?: any;
    anomalyResult?: any;
}

/**
 * Generate a complete analytical report from dataset analysis.
 */
export function generateReport(input: ReportInput): Report {
    const sections: ReportSection[] = [];

    // 1. Executive Summary
    sections.push(generateExecutiveSummary(input));

    // 2. Dataset Overview
    sections.push(generateDatasetOverview(input));

    // 3. Data Quality Summary
    if (input.profile) {
        sections.push(generateDataQualitySummary(input));
    }

    // 4. Key Findings (from insights)
    if (input.insights && input.insights.length > 0) {
        sections.push(generateKeyFindings(input));
    }

    // 5. Anomaly Summary
    if (input.anomalyResult) {
        sections.push(generateAnomalySummary(input));
    }

    // 6. Forecast Summary
    if (input.forecast) {
        sections.push(generateForecastSummary(input));
    }

    // 7. ML Model Summary
    if (input.automlResult) {
        sections.push(generateMLSummary(input));
    }

    // 8. Recommendations
    sections.push(generateRecommendations(input));

    // 9. Suggested Next Steps
    sections.push(generateNextSteps(input));

    return {
        title: `Data Analysis Report: ${input.datasetName}`,
        generatedAt: new Date().toISOString(),
        sections,
        metadata: {
            dataSource: input.datasetName,
            rowCount: input.stats.rowCount,
            columnCount: input.stats.columns.length,
            analysisTypes: [
                input.profile ? 'profiling' : '',
                input.insights?.length ? 'insights' : '',
                input.forecast ? 'forecasting' : '',
                input.automlResult ? 'automl' : '',
                input.anomalyResult ? 'anomaly-detection' : '',
            ].filter(Boolean),
        },
    };
}

function generateExecutiveSummary(input: ReportInput): ReportSection {
    const findings: string[] = [];

    findings.push(`Dataset contains ${input.stats.rowCount.toLocaleString()} rows and ${input.stats.columns.length} columns.`);

    if (input.profile?.quality) {
        findings.push(`Data quality score: ${input.profile.quality.overallScore}/100.`);
    }

    if (input.insights?.length) {
        const highSev = input.insights.filter((i: any) => i.severity === 'high');
        if (highSev.length > 0) {
            findings.push(`${highSev.length} high-severity insight(s) detected requiring attention.`);
        }
        findings.push(`${input.insights.length} total insight(s) identified.`);
    }

    if (input.anomalyResult?.anomalies?.length) {
        findings.push(`${input.anomalyResult.anomalies.length} anomaly/anomalies detected in the data.`);
    }

    if (input.forecast) {
        findings.push(`Forecast generated using ${input.forecast.method} with ${input.forecast.metadata.forecastHorizon} periods ahead.`);
    }

    if (input.automlResult) {
        findings.push(`AutoML identified the problem as ${input.automlResult.problemType} with best model: ${input.automlResult.bestModel.modelType}.`);
    }

    return {
        title: 'Executive Summary',
        content: findings.join(' '),
        type: 'text',
    };
}

function generateDatasetOverview(input: ReportInput): ReportSection {
    const columns = input.stats.columns.map((col: string) => {
        const meta = input.stats.columnMeta?.[col];
        return {
            name: col,
            type: meta?.type || 'unknown',
            uniqueCount: meta?.uniqueCount || 0,
            missingPct: meta?.nullPercentage || 0,
        };
    });

    const numericCount = columns.filter(c => c.type === 'numeric').length;
    const categoricalCount = columns.filter(c => c.type === 'categorical').length;
    const datetimeCount = columns.filter(c => c.type === 'datetime').length;

    return {
        title: 'Dataset Overview',
        content: `The dataset has ${numericCount} numeric, ${categoricalCount} categorical, and ${datetimeCount} datetime columns.`,
        type: 'table',
        data: columns,
    };
}

function generateDataQualitySummary(input: ReportInput): ReportSection {
    const profile = input.profile;
    const quality = profile.quality || {};
    const issues = quality.issues || [];

    const lines: string[] = [];
    lines.push(`Overall quality score: ${quality.overallScore || 'N/A'}/100`);

    if (quality.summary) {
        lines.push(`Passed checks: ${quality.summary.passed}`);
        lines.push(`Warnings: ${quality.summary.warnings}`);
        lines.push(`Critical issues: ${quality.summary.critical}`);
    }

    if (issues.length > 0) {
        lines.push('');
        lines.push('Issues detected:');
        for (const issue of issues.slice(0, 10)) {
            lines.push(`  - [${issue.severity}] ${issue.title}: ${issue.description}`);
        }
    }

    return {
        title: 'Data Quality Summary',
        content: lines.join('\n'),
        type: 'text',
    };
}

function generateKeyFindings(input: ReportInput): ReportSection {
    const insights = input.insights || [];
    const findings = insights.map((insight: any, idx: number) => {
        return `${idx + 1}. ${insight.title} (${insight.severity}, ${Math.round((insight.confidence || 0) * 100)}% confidence): ${insight.finding}`;
    });

    return {
        title: 'Key Findings',
        content: findings.join('\n'),
        type: 'list',
        data: insights,
    };
}

function generateAnomalySummary(input: ReportInput): ReportSection {
    const result = input.anomalyResult;
    const anomalies = result.anomalies || [];
    const summary = result.summary || {};

    const lines: string[] = [];
    lines.push(`Detected ${anomalies.length} anomalies total.`);

    if (summary.bySeverity) {
        lines.push(`By severity: ${summary.bySeverity.high || 0} high, ${summary.bySeverity.medium || 0} medium, ${summary.bySeverity.low || 0} low.`);
    }

    if (summary.byColumn) {
        lines.push('Affected columns:');
        for (const [col, count] of Object.entries(summary.byColumn)) {
            lines.push(`  - ${col}: ${count} anomalies`);
        }
    }

    // Show top anomalies
    const topAnomalies = anomalies.slice(0, 5);
    if (topAnomalies.length > 0) {
        lines.push('');
        lines.push('Top anomalies:');
        for (const a of topAnomalies) {
            lines.push(`  - ${a.description}`);
        }
    }

    return {
        title: 'Anomaly Detection Summary',
        content: lines.join('\n'),
        type: 'text',
        data: anomalies,
    };
}

function generateForecastSummary(input: ReportInput): ReportSection {
    const forecast = input.forecast;
    const lines: string[] = [];

    lines.push(`Method: ${forecast.method}`);
    lines.push(`Forecast horizon: ${forecast.metadata.forecastHorizon} periods`);
    lines.push(`Data points used: ${forecast.metadata.dataPoints}`);

    if (forecast.accuracy) {
        lines.push(`In-sample MAE: ${forecast.accuracy.mae.toFixed(2)}`);
        lines.push(`In-sample RMSE: ${forecast.accuracy.rmse.toFixed(2)}`);
        lines.push(`In-sample MAPE: ${forecast.accuracy.mape.toFixed(2)}%`);
    }

    if (forecast.forecast?.length > 0) {
        lines.push('');
        lines.push('Forecast values:');
        for (const f of forecast.forecast) {
            const range = f.lower !== undefined && f.upper !== undefined
                ? ` [${f.lower.toFixed(2)} - ${f.upper.toFixed(2)}]`
                : '';
            lines.push(`  ${f.x}: ${f.y.toFixed(2)}${range}`);
        }
    }

    return {
        title: 'Forecast Summary',
        content: lines.join('\n'),
        type: 'text',
        data: forecast,
    };
}

function generateMLSummary(input: ReportInput): ReportSection {
    const result = input.automlResult;
    const lines: string[] = [];

    lines.push(`Problem type: ${result.problemType}`);
    lines.push(`Target: ${result.targetColumn}`);
    lines.push(`Features used: ${result.features.length}`);
    lines.push('');

    for (const model of result.models) {
        lines.push(`Model: ${model.modelType}`);
        for (const [metric, value] of Object.entries(model.metrics)) {
            lines.push(`  ${metric}: ${typeof value === 'number' ? value.toFixed(4) : value}`);
        }
        lines.push(`  Training time: ${model.trainingTime}ms`);
    }

    // Feature importance
    if (result.bestModel?.featureImportance) {
        lines.push('');
        lines.push('Feature importance (best model):');
        const sorted = Object.entries(result.bestModel.featureImportance as Record<string, number>)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);
        for (const [feature, importance] of sorted) {
            lines.push(`  ${feature}: ${(importance * 100).toFixed(1)}%`);
        }
    }

    return {
        title: 'Machine Learning Summary',
        content: lines.join('\n'),
        type: 'text',
        data: result,
    };
}

function generateRecommendations(input: ReportInput): ReportSection {
    const recommendations: string[] = [];

    // Based on data quality
    if (input.profile?.quality?.overallScore < 70) {
        recommendations.push('Address data quality issues before making business decisions. Focus on missing values and duplicates.');
    }

    // Based on insights
    if (input.insights?.length) {
        const highSev = input.insights.filter((i: any) => i.severity === 'high');
        if (highSev.length > 0) {
            recommendations.push('Investigate high-severity insights immediately - they may indicate critical business issues.');
        }
    }

    // Based on anomalies
    if (input.anomalyResult?.anomalies?.length > 5) {
        recommendations.push('Multiple anomalies detected. Consider investigating data collection processes for potential systematic errors.');
    }

    // Based on forecast
    if (input.forecast?.accuracy?.mape > 20) {
        recommendations.push('Forecast accuracy is low (MAPE > 20%). Consider collecting more data or trying alternative forecasting methods.');
    }

    // Based on ML
    if (input.automlResult) {
        const bestMetric = input.automlResult.problemType === 'regression'
            ? input.automlResult.bestModel.metrics.r2
            : input.automlResult.bestModel.metrics.accuracy;
        if (bestMetric < 0.7) {
            recommendations.push('Model performance is moderate. Consider feature engineering or collecting additional data.');
        }
    }

    if (recommendations.length === 0) {
        recommendations.push('Data looks healthy. Continue monitoring for changes over time.');
    }

    return {
        title: 'Recommendations',
        content: recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n'),
        type: 'list',
    };
}

function generateNextSteps(input: ReportInput): ReportSection {
    const steps: string[] = [];

    steps.push('Review the detailed visualizations in the dashboard.');
    steps.push('Set up alerts for key metrics to monitor changes over time.');

    if (input.stats.rowCount < 1000) {
        steps.push('Consider collecting more data for more reliable analysis.');
    }

    if (!input.forecast) {
        steps.push('Generate a forecast to understand future trends.');
    }

    if (!input.automlResult) {
        steps.push('Run AutoML to discover predictive patterns in your data.');
    }

    steps.push('Share this report with your team for collaborative analysis.');

    return {
        title: 'Suggested Next Steps',
        content: steps.map((s, i) => `${i + 1}. ${s}`).join('\n'),
        type: 'list',
    };
}

// ── Export Formats ──────────────────────────────────────────────────

/**
 * Generate HTML report.
 */
export function generateHTML(report: Report): string {
    const sections = report.sections.map(section => {
        let contentHtml = '';

        if (section.type === 'table' && Array.isArray(section.data)) {
            const headers = Object.keys(section.data[0] || {});
            const rows = section.data.map((row: any) =>
                `<tr>${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`
            ).join('');
            contentHtml = `
                <p>${section.content}</p>
                <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                <tbody>${rows}</tbody></table>`;
        } else if (section.type === 'list') {
            const items = section.content.split('\n').filter(l => l.trim());
            contentHtml = `<ul>${items.map(item => `<li>${item.replace(/^\d+\.\s*/, '')}</li>`).join('')}</ul>`;
        } else {
            contentHtml = `<pre>${section.content}</pre>`;
        }

        return `
        <section>
            <h2>${section.title}</h2>
            ${contentHtml}
        </section>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${report.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 40px 20px; color: #333; line-height: 1.6; }
        h1 { color: #1a1a2e; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
        h2 { color: #4338ca; margin-top: 30px; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 6px; overflow-x: auto; font-size: 14px; white-space: pre-wrap; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
        th { background: #f3f4f6; font-weight: 600; }
        ul { padding-left: 20px; }
        li { margin: 5px 0; }
        .meta { color: #6b7280; font-size: 13px; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 15px; }
    </style>
</head>
<body>
    <h1>${report.title}</h1>
    ${sections}
    <div class="meta">
        Generated: ${new Date(report.generatedAt).toLocaleString()} |
        Data: ${report.metadata.rowCount.toLocaleString()} rows, ${report.metadata.columnCount} columns |
        Analysis: ${report.metadata.analysisTypes.join(', ') || 'basic'}
    </div>
</body>
</html>`;
}

/**
 * Generate a simple text report.
 */
export function generateText(report: Report): string {
    const lines: string[] = [];
    lines.push('='.repeat(60));
    lines.push(report.title);
    lines.push('='.repeat(60));
    lines.push(`Generated: ${new Date(report.generatedAt).toLocaleString()}`);
    lines.push(`Data: ${report.metadata.rowCount.toLocaleString()} rows, ${report.metadata.columnCount} columns`);
    lines.push('');

    for (const section of report.sections) {
        lines.push(`--- ${section.title} ---`);
        lines.push(section.content);
        lines.push('');
    }

    return lines.join('\n');
}
