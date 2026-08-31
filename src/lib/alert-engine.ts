import { prisma } from './prisma';
import { detectAnomalies } from './anomaly-detector';

export interface AlertEvaluation {
    ruleId: string;
    triggered: boolean;
    message: string;
    currentValue?: number;
    threshold?: number;
}

/**
 * Evaluate a single alert rule against data.
 */
export function evaluateAlertRule(
    rule: {
        metric: string;
        condition: string;
        threshold: number;
    },
    rows: any[],
    numericColumns: string[]
): AlertEvaluation {
    const { metric, condition, threshold } = rule;

    // Handle anomaly detection
    if (condition === 'anomaly_detected') {
        const result = detectAnomalies(rows, [metric]);
        const anomalies = result.anomalies.filter(a => a.column === metric);
        return {
            ruleId: '',
            triggered: anomalies.length > 0,
            message: anomalies.length > 0
                ? `Detected ${anomalies.length} anomalies in "${metric}"`
                : `No anomalies detected in "${metric}"`,
        };
    }

    // For other conditions, compute the metric value
    const values = rows
        .map(row => Number(row[metric]))
        .filter(v => !isNaN(v));

    if (values.length === 0) {
        return {
            ruleId: '',
            triggered: false,
            message: `No numeric data found for "${metric}"`,
        };
    }

    const currentValue = values.reduce((a, b) => a + b, 0) / values.length; // Mean
    let triggered = false;
    let message = '';

    switch (condition) {
        case 'above':
            triggered = currentValue > threshold;
            message = triggered
                ? `${metric} (${currentValue.toFixed(2)}) is above threshold (${threshold})`
                : `${metric} (${currentValue.toFixed(2)}) is within normal range`;
            break;
        case 'below':
            triggered = currentValue < threshold;
            message = triggered
                ? `${metric} (${currentValue.toFixed(2)}) is below threshold (${threshold})`
                : `${metric} (${currentValue.toFixed(2)}) is within normal range`;
            break;
        case 'drops_by_pct':
            // Compare first half vs second half
            if (values.length >= 10) {
                const half = Math.floor(values.length / 2);
                const firstHalf = values.slice(0, half).reduce((a, b) => a + b, 0) / half;
                const secondHalf = values.slice(half).reduce((a, b) => a + b, 0) / (values.length - half);
                const dropPct = ((firstHalf - secondHalf) / firstHalf) * 100;
                triggered = dropPct >= threshold;
                message = triggered
                    ? `${metric} dropped by ${dropPct.toFixed(1)}% (threshold: ${threshold}%)`
                    : `${metric} changed by ${dropPct.toFixed(1)}% (within threshold)`;
            } else {
                message = `Not enough data to evaluate trend for "${metric}"`;
            }
            break;
        case 'increases_by_pct':
            if (values.length >= 10) {
                const half = Math.floor(values.length / 2);
                const firstHalf = values.slice(0, half).reduce((a, b) => a + b, 0) / half;
                const secondHalf = values.slice(half).reduce((a, b) => a + b, 0) / (values.length - half);
                const increasePct = ((secondHalf - firstHalf) / firstHalf) * 100;
                triggered = increasePct >= threshold;
                message = triggered
                    ? `${metric} increased by ${increasePct.toFixed(1)}% (threshold: ${threshold}%)`
                    : `${metric} changed by ${increasePct.toFixed(1)}% (within threshold)`;
            } else {
                message = `Not enough data to evaluate trend for "${metric}"`;
            }
            break;
        default:
            message = `Unknown condition: ${condition}`;
    }

    return {
        ruleId: '',
        triggered,
        message,
        currentValue,
        threshold,
    };
}

/**
 * Evaluate all active alert rules for a project.
 */
export async function evaluateProjectAlerts(
    projectId: string,
    rows: any[],
    numericColumns: string[]
): Promise<AlertEvaluation[]> {
    const rules = await prisma.alertRule.findMany({
        where: { projectId, enabled: true },
    });

    const results: AlertEvaluation[] = [];

    for (const rule of rules) {
        const evaluation = evaluateAlertRule(
            { metric: rule.metric, condition: rule.condition, threshold: rule.threshold },
            rows,
            numericColumns
        );

        evaluation.ruleId = rule.id;

        // Update rule status
        await prisma.alertRule.update({
            where: { id: rule.id },
            data: {
                lastChecked: new Date(),
                lastStatus: evaluation.triggered ? 'triggered' : 'ok',
            },
        });

        // Record event if triggered
        if (evaluation.triggered) {
            await prisma.alertEvent.create({
                data: {
                    alertRuleId: rule.id,
                    status: 'triggered',
                    message: evaluation.message,
                    value: evaluation.currentValue,
                    threshold: evaluation.threshold,
                },
            });

            // Update last triggered
            await prisma.alertRule.update({
                where: { id: rule.id },
                data: { lastTriggered: new Date() },
            });
        }

        results.push(evaluation);
    }

    return results;
}
