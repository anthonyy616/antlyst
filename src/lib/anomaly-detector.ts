/**
 * Anomaly Detection Engine
 *
 * Detects outliers using IQR and Z-score methods.
 * Designed to be extensible for future methods (Isolation Forest, LOF, etc.).
 */

export interface Anomaly {
    id: string;
    column: string;
    method: 'iqr' | 'zscore';
    severity: 'low' | 'medium' | 'high';
    confidence: number;
    value: any;
    rowIndex: number;
    description: string;
    bounds: { lower: number; upper: number };
}

export interface AnomalyResult {
    anomalies: Anomaly[];
    summary: {
        totalAnomalies: number;
        byColumn: Record<string, number>;
        bySeverity: Record<string, number>;
    };
    statistics: Record<string, {
        mean: number;
        std: number;
        q1: number;
        q3: number;
        iqr: number;
        lowerBound: number;
        upperBound: number;
    }>;
}

/**
 * Detect anomalies using the IQR method.
 */
export function detectIQR(
    values: number[],
    columnName: string,
    multiplier: number = 1.5
): { anomalies: number[]; bounds: { lower: number; upper: number }; stats: any } {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;

    const q1 = sorted[Math.floor(n * 0.25)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;

    const lower = q1 - multiplier * iqr;
    const upper = q3 + multiplier * iqr;

    const anomalyIndices: number[] = [];
    values.forEach((v, i) => {
        if (v < lower || v > upper) {
            anomalyIndices.push(i);
        }
    });

    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const std = Math.sqrt(variance);

    return {
        anomalies: anomalyIndices,
        bounds: { lower, upper },
        stats: { mean, std, q1, q3, iqr, lowerBound: lower, upperBound: upper },
    };
}

/**
 * Detect anomalies using the Z-score method.
 */
export function detectZScore(
    values: number[],
    columnName: string,
    threshold: number = 3
): { anomalies: number[]; bounds: { lower: number; upper: number }; stats: any } {
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const std = Math.sqrt(variance);

    if (std === 0) {
        return { anomalies: [], bounds: { lower: mean, upper: mean }, stats: { mean, std: 0, q1: 0, q3: 0, iqr: 0, lowerBound: mean, upperBound: mean } };
    }

    const lower = mean - threshold * std;
    const upper = mean + threshold * std;

    const anomalyIndices: number[] = [];
    values.forEach((v, i) => {
        if (v < lower || v > upper) {
            anomalyIndices.push(i);
        }
    });

    // Calculate quartiles for consistency
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(n * 0.25)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;

    return {
        anomalies: anomalyIndices,
        bounds: { lower, upper },
        stats: { mean, std, q1, q3, iqr, lowerBound: lower, upperBound: upper },
    };
}

/**
 * Detect anomalies across all numeric columns in a dataset.
 */
export function detectAnomalies(
    rows: any[],
    numericColumns: string[],
    methods: ('iqr' | 'zscore')[] = ['iqr', 'zscore']
): AnomalyResult {
    const allAnomalies: Anomaly[] = [];
    const statistics: Record<string, any> = {};
    const byColumn: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const col of numericColumns) {
        const values = rows
            .map((row, idx) => ({ value: Number(row[col]), idx }))
            .filter(v => !isNaN(v.value) && v.value !== null);

        if (values.length < 10) continue; // Need enough data points

        const numValues = values.map(v => v.value);

        for (const method of methods) {
            const result = method === 'iqr'
                ? detectIQR(numValues, col)
                : detectZScore(numValues, col);

            statistics[col] = result.stats;

            for (const idx of result.anomalies) {
                const value = numValues[idx];
                const { lower, upper } = result.bounds;
                const range = upper - lower;
                const distance = value < lower ? lower - value : value - upper;
                const severity = distance > range ? 'high' : distance > range * 0.5 ? 'medium' : 'low';
                const confidence = Math.min(0.99, 0.5 + (distance / range) * 0.3);

                const anomaly: Anomaly = {
                    id: `anomaly-${col}-${method}-${idx}`,
                    column: col,
                    method,
                    severity,
                    confidence,
                    value,
                    rowIndex: values[idx].idx,
                    description: `Value ${value.toFixed(2)} in "${col}" is ${severity} anomaly (${method.toUpperCase()}, outside [${lower.toFixed(2)}, ${upper.toFixed(2)}])`,
                    bounds: result.bounds,
                };

                allAnomalies.push(anomaly);
                byColumn[col] = (byColumn[col] || 0) + 1;
                bySeverity[severity] = (bySeverity[severity] || 0) + 1;
            }
        }
    }

    // Sort by severity then confidence
    const severityOrder = { high: 0, medium: 1, low: 2 };
    allAnomalies.sort((a, b) =>
        (severityOrder[a.severity] - severityOrder[b.severity]) ||
        (b.confidence - a.confidence)
    );

    return {
        anomalies: allAnomalies,
        summary: {
            totalAnomalies: allAnomalies.length,
            byColumn,
            bySeverity,
        },
        statistics,
    };
}
