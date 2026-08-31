/**
 * Forecasting Engine
 *
 * Provides simple time-series forecasting methods:
 * - Moving Average
 * - Linear Trend (least squares)
 *
 * Designed to be extensible for ARIMA, seasonal models, etc.
 */

export interface ForecastResult {
    method: string;
    historical: { x: any; y: number }[];
    forecast: { x: any; y: number; lower?: number; upper?: number }[];
    accuracy?: {
        mae: number;   // Mean Absolute Error
        rmse: number;  // Root Mean Squared Error
        mape: number;  // Mean Absolute Percentage Error
    };
    metadata: {
        dataPoints: number;
        forecastHorizon: number;
        confidenceLevel: number;
    };
}

/**
 * Validate that data is suitable for forecasting.
 */
export function validateForecastData(
    rows: any[],
    timeColumn: string,
    valueColumn: string
): { valid: boolean; error?: string } {
    if (!rows || rows.length < 10) {
        return { valid: false, error: 'At least 10 data points required for forecasting' };
    }

    if (!timeColumn || !valueColumn) {
        return { valid: false, error: 'Time and value columns are required' };
    }

    const values = rows.map(r => Number(r[valueColumn])).filter(v => !isNaN(v));
    if (values.length < 10) {
        return { valid: false, error: 'Not enough numeric values in the target column' };
    }

    // Check for sufficient variation
    const unique = new Set(values);
    if (unique.size < 3) {
        return { valid: false, error: 'Insufficient variation in the target column for forecasting' };
    }

    return { valid: true };
}

/**
 * Simple Moving Average forecast.
 */
export function movingAverageForecast(
    values: number[],
    horizon: number = 5,
    windowSize: number = 3
): number[] {
    const forecast: number[] = [];
    const extended = [...values];

    for (let i = 0; i < horizon; i++) {
        const window = extended.slice(-windowSize);
        const avg = window.reduce((a, b) => a + b, 0) / window.length;
        forecast.push(avg);
        extended.push(avg);
    }

    return forecast;
}

/**
 * Linear Trend forecast using least squares regression.
 */
export function linearTrendForecast(
    values: number[],
    horizon: number = 5
): { forecast: number[]; slope: number; intercept: number; r2: number } {
    const n = values.length;
    const x = values.map((_, i) => i);
    const y = values;

    // Calculate means
    const xMean = x.reduce((a, b) => a + b, 0) / n;
    const yMean = y.reduce((a, b) => a + b, 0) / n;

    // Calculate slope and intercept
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
        numerator += (x[i] - xMean) * (y[i] - yMean);
        denominator += (x[i] - xMean) * (x[i] - xMean);
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    // Calculate R-squared
    const yPred = x.map(xi => slope * xi + intercept);
    const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - yPred[i], 2), 0);
    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const r2 = ssTot !== 0 ? 1 - ssRes / ssTot : 0;

    // Generate forecast
    const forecast: number[] = [];
    for (let i = 0; i < horizon; i++) {
        forecast.push(slope * (n + i) + intercept);
    }

    return { forecast, slope, intercept, r2 };
}

/**
 * Calculate forecast confidence intervals using residual standard error.
 */
export function calculateConfidenceInterval(
    values: number[],
    forecast: number[],
    confidenceLevel: number = 0.95
): { lower: number[]; upper: number[] } {
    const n = values.length;
    const x = values.map((_, i) => i);
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    // Fit linear trend to get residuals
    const xMean = x.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
        num += (x[i] - xMean) * (values[i] - yMean);
        den += (x[i] - xMean) * (x[i] - xMean);
    }
    const slope = den !== 0 ? num / den : 0;
    const intercept = yMean - slope * xMean;

    const residuals = values.map((yi, i) => yi - (slope * i + intercept));
    const mse = residuals.reduce((a, r) => a + r * r, 0) / (n - 2);
    const se = Math.sqrt(mse);

    // t-value for 95% confidence (approximate)
    const zScore = confidenceLevel === 0.95 ? 1.96 : confidenceLevel === 0.99 ? 2.576 : 1.645;

    const lower: number[] = [];
    const upper: number[] = [];

    for (let i = 0; i < forecast.length; i++) {
        const distance = se * zScore * Math.sqrt(1 + (i + 1) / n);
        lower.push(forecast[i] - distance);
        upper.push(forecast[i] + distance);
    }

    return { lower, upper };
}

/**
 * Calculate accuracy metrics.
 */
export function calculateAccuracy(
    actual: number[],
    predicted: number[]
): { mae: number; rmse: number; mape: number } {
    const n = Math.min(actual.length, predicted.length);
    let sumAbsErr = 0;
    let sumSqErr = 0;
    let sumPctErr = 0;
    let validPctCount = 0;

    for (let i = 0; i < n; i++) {
        const err = actual[i] - predicted[i];
        sumAbsErr += Math.abs(err);
        sumSqErr += err * err;
        if (actual[i] !== 0) {
            sumPctErr += Math.abs(err / actual[i]) * 100;
            validPctCount++;
        }
    }

    return {
        mae: sumAbsErr / n,
        rmse: Math.sqrt(sumSqErr / n),
        mape: validPctCount > 0 ? sumPctErr / validPctCount : 0,
    };
}

/**
 * Generate a full forecast for a dataset.
 */
export function generateForecast(
    rows: any[],
    timeColumn: string,
    valueColumn: string,
    method: 'moving_average' | 'linear_trend' = 'linear_trend',
    horizon: number = 5,
    confidenceLevel: number = 0.95
): ForecastResult {
    // Extract and sort values
    const dataPoints = rows
        .map(row => ({ x: row[timeColumn], y: Number(row[valueColumn]) }))
        .filter(p => !isNaN(p.y) && p.x !== null && p.x !== undefined)
        .sort((a, b) => {
            if (typeof a.x === 'string' && typeof b.x === 'string') {
                return a.x.localeCompare(b.x);
            }
            return Number(a.x) - Number(b.x);
        });

    const values = dataPoints.map(p => p.y);

    // Generate forecast
    let forecastValues: number[];
    let methodLabel: string;

    if (method === 'moving_average') {
        forecastValues = movingAverageForecast(values, horizon);
        methodLabel = 'Moving Average';
    } else {
        const result = linearTrendForecast(values, horizon);
        forecastValues = result.forecast;
        methodLabel = `Linear Trend (R²=${result.r2.toFixed(3)})`;
    }

    // Calculate confidence intervals
    const { lower, upper } = calculateConfidenceInterval(values, forecastValues, confidenceLevel);

    // Generate forecast x-values (extrapolate from last time value)
    const lastX = dataPoints[dataPoints.length - 1]?.x;
    const forecastPoints = forecastValues.map((y, i) => ({
        x: typeof lastX === 'number' ? lastX + i + 1 : `Forecast ${i + 1}`,
        y,
        lower: lower[i],
        upper: upper[i],
    }));

    // Calculate in-sample accuracy
    let inSamplePredicted: number[];
    if (method === 'moving_average') {
        inSamplePredicted = values.map((_, i) => {
            if (i < 3) return values[i];
            return (values[i - 1] + values[i - 2] + values[i - 3]) / 3;
        });
    } else {
        const { slope, intercept } = linearTrendForecast(values, 0) as any;
        // Refit for in-sample
        const n = values.length;
        const xMean = (n - 1) / 2;
        const yMean = values.reduce((a, b) => a + b, 0) / n;
        let num = 0, den = 0;
        for (let i = 0; i < n; i++) {
            num += (i - xMean) * (values[i] - yMean);
            den += (i - xMean) * (i - xMean);
        }
        const s = den !== 0 ? num / den : 0;
        const ic = yMean - s * xMean;
        inSamplePredicted = values.map((_, i) => s * i + ic);
    }

    const accuracy = calculateAccuracy(values, inSamplePredicted);

    return {
        method: methodLabel,
        historical: dataPoints,
        forecast: forecastPoints,
        accuracy,
        metadata: {
            dataPoints: values.length,
            forecastHorizon: horizon,
            confidenceLevel,
        },
    };
}
