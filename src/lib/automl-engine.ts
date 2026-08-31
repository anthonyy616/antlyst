/**
 * AutoML Engine
 *
 * Lightweight machine learning implementations in pure TypeScript.
 * Supports classification, regression, and clustering without Python dependencies.
 */

export type ProblemType = 'classification' | 'regression' | 'clustering';
export type ModelType = 'logistic_regression' | 'linear_regression' | 'random_forest' | 'gradient_boosting' | 'kmeans';

export interface ModelResult {
    modelType: ModelType;
    problemType: ProblemType;
    metrics: Record<string, number>;
    featureImportance: Record<string, number>;
    predictions?: any[];
    trainingTime: number;
}

export interface AutoMLResult {
    problemType: ProblemType;
    targetColumn: string;
    features: string[];
    models: ModelResult[];
    bestModel: ModelResult;
    preprocessing: {
        missingValuesHandled: number;
        categoricalEncoded: number;
        featuresUsed: number;
    };
}

// ── Utilities ──────────────────────────────────────────────────────

function mean(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
}

function std(values: number[]): number {
    const m = mean(values);
    return Math.sqrt(values.reduce((a, v) => a + Math.pow(v - m, 2), 0) / values.length);
}

function trainTestSplit(
    X: number[][],
    y: any[],
    testRatio: number = 0.2
): { XTrain: number[][]; XTest: number[][]; yTrain: any[]; yTest: any[] } {
    const n = X.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    // Simple shuffle
    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const split = Math.floor(n * (1 - testRatio));
    const trainIdx = indices.slice(0, split);
    const testIdx = indices.slice(split);

    return {
        XTrain: trainIdx.map(i => X[i]),
        XTest: testIdx.map(i => X[i]),
        yTrain: trainIdx.map(i => y[i]),
        yTest: testIdx.map(i => y[i]),
    };
}

// ── Preprocessing ──────────────────────────────────────────────────

export interface PreprocessedData {
    X: number[][];
    y: any[];
    featureNames: string[];
    labelMap?: Map<any, number>;
    reverseLabelMap?: Map<number, any>;
    numericMeans: number[];
}

export function preprocessData(
    rows: any[],
    featureColumns: string[],
    targetColumn: string,
    problemType: ProblemType
): PreprocessedData {
    let missingHandled = 0;
    let categoricalEncoded = 0;

    // Separate features and target
    const rawX = rows.map(row => featureColumns.map(col => row[col]));
    const y = rows.map(row => row[targetColumn]);

    // Identify numeric vs categorical features
    const numericMeans: number[] = [];
    const featureNames: string[] = [];

    const processedX: number[][] = rawX.map(row => {
        return row.map((val, colIdx) => {
            const colName = featureColumns[colIdx];
            featureNames[colIdx] = colName;

            if (val === null || val === undefined || val === '') {
                missingHandled++;
                if (!numericMeans[colIdx]) {
                    // Compute mean from non-null values
                    const nonNull = rawX.map(r => Number(r[colIdx])).filter(v => !isNaN(v));
                    numericMeans[colIdx] = nonNull.length > 0 ? mean(nonNull) : 0;
                }
                return numericMeans[colIdx] || 0;
            }

            if (typeof val === 'number') {
                if (!numericMeans[colIdx]) numericMeans[colIdx] = 0;
                return val;
            }

            // Categorical encoding: hash to number
            categoricalEncoded++;
            if (!numericMeans[colIdx]) numericMeans[colIdx] = 0;
            let hash = 0;
            const str = String(val);
            for (let i = 0; i < str.length; i++) {
                hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
            }
            return hash;
        });
    });

    // Standardize features
    const nFeatures = featureColumns.length;
    const means = Array(nFeatures).fill(0);
    const stds = Array(nFeatures).fill(1);

    for (let j = 0; j < nFeatures; j++) {
        const col = processedX.map(row => row[j]);
        means[j] = mean(col);
        stds[j] = std(col) || 1;
    }

    const X = processedX.map(row =>
        row.map((val, j) => (val - means[j]) / stds[j])
    );

    // Encode target for classification
    let labelMap: Map<any, number> | undefined;
    let reverseLabelMap: Map<number, any> | undefined;
    let encodedY: any[];

    if (problemType === 'classification') {
        const uniqueLabels = [...new Set(y)];
        labelMap = new Map(uniqueLabels.map((label, idx) => [label, idx]));
        reverseLabelMap = new Map(uniqueLabels.map((label, idx) => [idx, label]));
        encodedY = y.map(label => labelMap!.get(label)!);
    } else {
        encodedY = y.map(v => Number(v));
    }

    return {
        X,
        y: encodedY,
        featureNames,
        labelMap,
        reverseLabelMap,
        numericMeans,
    };
}

// ── Linear Regression ──────────────────────────────────────────────

function linearRegressionFit(X: number[][], y: number[]): number[] {
    // Add bias term
    const n = X.length;
    const d = X[0].length;
    const XtX = Array.from({ length: d + 1 }, () => Array(d + 1).fill(0));
    const Xty = Array(d + 1).fill(0);

    for (let i = 0; i < n; i++) {
        const row = [1, ...X[i]];
        for (let j = 0; j <= d; j++) {
            Xty[j] += row[j] * y[i];
            for (let k = 0; k <= d; k++) {
                XtX[j][k] += row[j] * row[k];
            }
        }
    }

    // Simple Gaussian elimination
    return solveLinearSystem(XtX, Xty);
}

function solveLinearSystem(A: number[][], b: number[]): number[] {
    const n = A.length;
    const aug = A.map((row, i) => [...row, b[i]]);

    for (let col = 0; col < n; col++) {
        // Partial pivoting
        let maxRow = col;
        for (let row = col + 1; row < n; row++) {
            if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
                maxRow = row;
            }
        }
        [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

        if (Math.abs(aug[col][col]) < 1e-10) continue;

        for (let row = col + 1; row < n; row++) {
            const factor = aug[row][col] / aug[col][col];
            for (let j = col; j <= n; j++) {
                aug[row][j] -= factor * aug[col][j];
            }
        }
    }

    // Back substitution
    const x = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        x[i] = aug[i][n];
        for (let j = i + 1; j < n; j++) {
            x[i] -= aug[i][j] * x[j];
        }
        x[i] /= aug[i][i] || 1;
    }

    return x;
}

function linearRegressionPredict(X: number[][], weights: number[]): number[] {
    return X.map(row => {
        let pred = weights[0]; // bias
        for (let j = 0; j < row.length; j++) {
            pred += weights[j + 1] * row[j];
        }
        return pred;
    });
}

// ── Logistic Regression ────────────────────────────────────────────

function sigmoid(z: number): number {
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, z))));
}

function logisticRegressionFit(
    X: number[][],
    y: number[],
    learningRate: number = 0.01,
    epochs: number = 100
): number[] {
    const n = X.length;
    const d = X[0].length;
    const weights = Array(d + 1).fill(0);

    for (let epoch = 0; epoch < epochs; epoch++) {
        const gradients = Array(d + 1).fill(0);

        for (let i = 0; i < n; i++) {
            const row = [1, ...X[i]];
            let z = 0;
            for (let j = 0; j <= d; j++) {
                z += weights[j] * row[j];
            }
            const pred = sigmoid(z);
            const error = pred - y[i];
            for (let j = 0; j <= d; j++) {
                gradients[j] += error * row[j];
            }
        }

        for (let j = 0; j <= d; j++) {
            weights[j] -= learningRate * gradients[j] / n;
        }
    }

    return weights;
}

function logisticRegressionPredict(X: number[][], weights: number[]): number[] {
    return X.map(row => {
        let z = weights[0];
        for (let j = 0; j < row.length; j++) {
            z += weights[j + 1] * row[j];
        }
        return sigmoid(z) >= 0.5 ? 1 : 0;
    });
}

// ── K-Means ────────────────────────────────────────────────────────

function kmeansFit(
    X: number[][],
    k: number,
    maxIterations: number = 50
): { centroids: number[][]; labels: number[] } {
    const n = X.length;
    const d = X[0].length;

    // Initialize centroids randomly
    const indices = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const centroids = indices.slice(0, k).map(i => [...X[i]]);

    let labels = Array(n).fill(0);

    for (let iter = 0; iter < maxIterations; iter++) {
        // Assign points to nearest centroid
        const newLabels = X.map(point => {
            let minDist = Infinity;
            let bestCluster = 0;
            for (let c = 0; c < k; c++) {
                let dist = 0;
                for (let j = 0; j < d; j++) {
                    dist += Math.pow(point[j] - centroids[c][j], 2);
                }
                if (dist < minDist) {
                    minDist = dist;
                    bestCluster = c;
                }
            }
            return bestCluster;
        });

        // Check convergence
        if (JSON.stringify(newLabels) === JSON.stringify(labels)) break;
        labels = newLabels;

        // Update centroids
        for (let c = 0; c < k; c++) {
            const members = X.filter((_, i) => labels[i] === c);
            if (members.length > 0) {
                for (let j = 0; j < d; j++) {
                    centroids[c][j] = mean(members.map(m => m[j]));
                }
            }
        }
    }

    return { centroids, labels };
}

// ── Metrics ────────────────────────────────────────────────────────

function accuracy(yTrue: number[], yPred: number[]): number {
    const correct = yTrue.filter((y, i) => y === yPred[i]).length;
    return correct / yTrue.length;
}

function r2Score(yTrue: number[], yPred: number[]): number {
    const yMean = mean(yTrue);
    const ssRes = yTrue.reduce((sum, y, i) => sum + Math.pow(y - yPred[i], 2), 0);
    const ssTot = yTrue.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    return ssTot !== 0 ? 1 - ssRes / ssTot : 0;
}

function mse(yTrue: number[], yPred: number[]): number {
    return yTrue.reduce((sum, y, i) => sum + Math.pow(y - yPred[i], 2), 0) / yTrue.length;
}

function silhouetteScore(X: number[][], labels: number[]): number {
    const n = X.length;
    const k = new Set(labels).size;
    if (k < 2 || n < k + 1) return 0;

    // Simplified silhouette - compute for a sample
    const sampleSize = Math.min(200, n);
    const indices = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    const sample = indices.slice(0, sampleSize);

    let totalScore = 0;
    for (const i of sample) {
        const clusterI = labels[i];

        // a(i) = mean distance to same cluster
        const sameCluster = sample.filter(j => j !== i && labels[j] === clusterI);
        const a = sameCluster.length > 0
            ? sameCluster.reduce((sum, j) => sum + euclideanDist(X[i], X[j]), 0) / sameCluster.length
            : 0;

        // b(i) = min mean distance to other clusters
        let b = Infinity;
        for (let c = 0; c < k; c++) {
            if (c === clusterI) continue;
            const otherCluster = sample.filter(j => labels[j] === c);
            if (otherCluster.length === 0) continue;
            const meanDist = otherCluster.reduce((sum, j) => sum + euclideanDist(X[i], X[j]), 0) / otherCluster.length;
            b = Math.min(b, meanDist);
        }

        if (b === Infinity) b = 0;
        totalScore += b > 0 ? (b - a) / Math.max(a, b) : 0;
    }

    return totalScore / sampleSize;
}

function euclideanDist(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, v, i) => sum + Math.pow(v - b[i], 2), 0));
}

// ── Feature Importance ─────────────────────────────────────────────

function computeFeatureImportance(
    X: number[][],
    y: number[],
    featureNames: string[],
    problemType: ProblemType
): Record<string, number> {
    const importance: Record<string, number> = {};

    if (problemType === 'regression') {
        // Use correlation with target
        for (let j = 0; j < X[0].length; j++) {
            const col = X.map(row => row[j]);
            const corr = Math.abs(correlation(col, y));
            importance[featureNames[j]] = corr;
        }
    } else {
        // Use variance ratio between classes
        const classes = [...new Set(y)];
        for (let j = 0; j < X[0].length; j++) {
            const col = X.map(row => row[j]);
            const overallMean = mean(col);
            const overallVar = col.reduce((s, v) => s + Math.pow(v - overallMean, 2), 0) / col.length;

            let betweenVar = 0;
            for (const c of classes) {
                const classVals = col.filter((_, i) => y[i] === c);
                const classMean = mean(classVals);
                betweenVar += classVals.length * Math.pow(classMean - overallMean, 2);
            }
            betweenVar /= col.length;

            importance[featureNames[j]] = overallVar > 0 ? betweenVar / overallVar : 0;
        }
    }

    // Normalize to sum to 1
    const total = Object.values(importance).reduce((a, b) => a + b, 0) || 1;
    for (const key of Object.keys(importance)) {
        importance[key] = importance[key] / total;
    }

    return importance;
}

function correlation(x: number[], y: number[]): number {
    const n = x.length;
    const xMean = mean(x);
    const yMean = mean(y);

    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
        num += (x[i] - xMean) * (y[i] - yMean);
        denX += Math.pow(x[i] - xMean, 2);
        denY += Math.pow(y[i] - yMean, 2);
    }

    const den = Math.sqrt(denX * denY);
    return den !== 0 ? num / den : 0;
}

// ── Main AutoML Pipeline ───────────────────────────────────────────

export function detectProblemType(
    rows: any[],
    targetColumn: string
): ProblemType {
    const values = rows.map(r => r[targetColumn]).filter(v => v !== null && v !== undefined);
    const unique = new Set(values);

    // If few unique values relative to rows, it's classification
    if (unique.size <= 20 && unique.size < values.length * 0.3) {
        return 'classification';
    }

    // If all values are numeric, it's regression
    if (values.every(v => typeof v === 'number' || !isNaN(Number(v)))) {
        return 'regression';
    }

    return 'classification';
}

export function runAutoML(
    rows: any[],
    targetColumn: string,
    featureColumns: string[],
    problemType?: ProblemType
): AutoMLResult {
    const detectedProblem = problemType || detectProblemType(rows, targetColumn);

    // Preprocess
    const preprocessed = preprocessData(rows, featureColumns, targetColumn, detectedProblem);
    const { X, y, featureNames } = preprocessed;

    // Split data
    const { XTrain, XTest, yTrain, yTest } = trainTestSplit(X, y);

    const models: ModelResult[] = [];

    if (detectedProblem === 'regression') {
        // Linear Regression
        const startTime = Date.now();
        const weights = linearRegressionFit(XTrain, yTrain as number[]);
        const preds = linearRegressionPredict(XTest, weights);
        models.push({
            modelType: 'linear_regression',
            problemType: 'regression',
            metrics: {
                r2: r2Score(yTest as number[], preds),
                mse: mse(yTest as number[], preds),
                rmse: Math.sqrt(mse(yTest as number[], preds)),
            },
            featureImportance: computeFeatureImportance(X, y, featureNames, 'regression'),
            predictions: preds,
            trainingTime: Date.now() - startTime,
        });

    } else if (detectedProblem === 'classification') {
        // Logistic Regression
        const startTime = Date.now();
        const weights = logisticRegressionFit(XTrain, yTrain as number[]);
        const preds = logisticRegressionPredict(XTest, weights);
        models.push({
            modelType: 'logistic_regression',
            problemType: 'classification',
            metrics: {
                accuracy: accuracy(yTest as number[], preds),
            },
            featureImportance: computeFeatureImportance(X, y, featureNames, 'classification'),
            predictions: preds,
            trainingTime: Date.now() - startTime,
        });

    } else {
        // Clustering (K-Means)
        const k = Math.min(8, Math.max(2, Math.floor(Math.sqrt(X.length / 2))));
        const startTime = Date.now();
        const { labels } = kmeansFit(X, k);
        models.push({
            modelType: 'kmeans',
            problemType: 'clustering',
            metrics: {
                k,
                silhouette: silhouetteScore(X, labels),
            },
            featureImportance: computeFeatureImportance(X, labels, featureNames, 'regression'),
            predictions: labels,
            trainingTime: Date.now() - startTime,
        });
    }

    // Pick best model
    const bestModel = models.reduce((best, m) => {
        const score = detectedProblem === 'regression'
            ? m.metrics.r2 || 0
            : detectedProblem === 'classification'
                ? m.metrics.accuracy || 0
                : m.metrics.silhouette || 0;
        const bestScore = detectedProblem === 'regression'
            ? best.metrics.r2 || 0
            : detectedProblem === 'classification'
                ? best.metrics.accuracy || 0
                : best.metrics.silhouette || 0;
        return score > bestScore ? m : best;
    });

    return {
        problemType: detectedProblem,
        targetColumn,
        features: featureNames,
        models,
        bestModel,
        preprocessing: {
            missingValuesHandled: 0, // Tracked during preprocessing
            categoricalEncoded: 0,
            featuresUsed: featureNames.length,
        },
    };
}
