/**
 * ML Explainer
 *
 * Provides explainability for machine learning models:
 * - Feature importance rankings
 * - Prediction explanations (which features contributed most)
 * - Model comparison
 *
 * Designed to be extensible for SHAP, partial dependence plots, etc.
 */

export interface FeatureImportanceResult {
    feature: string;
    importance: number;
    rank: number;
    direction?: 'positive' | 'negative';
}

export interface PredictionExplanation {
    featureContributions: {
        feature: string;
        value: any;
        contribution: number;
        direction: 'positive' | 'negative';
    }[];
    baseValue: number;
    prediction: number;
    confidence?: number;
}

export interface ModelComparisonResult {
    models: {
        name: string;
        metrics: Record<string, number>;
        strength: string;
        weakness: string;
    }[];
    recommendation: string;
}

/**
 * Rank features by importance.
 */
export function rankFeatureImportance(
    importance: Record<string, number>
): FeatureImportanceResult[] {
    const entries = Object.entries(importance)
        .map(([feature, importance]) => ({
            feature,
            importance: Math.abs(importance),
            rank: 0,
            direction: importance >= 0 ? ('positive' as const) : ('negative' as const),
        }))
        .sort((a, b) => b.importance - a.importance)
        .map((item, idx) => ({ ...item, rank: idx + 1 }));

    return entries;
}

/**
 * Explain a single prediction using feature contributions.
 * Uses a simple linear attribution method.
 */
export function explainPrediction(
    features: Record<string, number>,
    featureWeights: Record<string, number>,
    baseValue: number = 0,
    prediction: number = 0
): PredictionExplanation {
    const contributions = Object.entries(features).map(([feature, value]) => {
        const weight = featureWeights[feature] || 0;
        const contribution = value * weight;
        return {
            feature,
            value,
            contribution,
            direction: contribution >= 0 ? 'positive' as const : 'negative' as const,
        };
    });

    // Sort by absolute contribution
    contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

    return {
        featureContributions: contributions,
        baseValue,
        prediction,
    };
}

/**
 * Compare multiple models and provide a recommendation.
 */
export function compareModels(
    models: { name: string; metrics: Record<string, number> }[],
    problemType: 'classification' | 'regression' | 'clustering'
): ModelComparisonResult {
    const compared = models.map(model => {
        let strength = '';
        let weakness = '';

        if (problemType === 'classification') {
            const acc = model.metrics.accuracy || 0;
            if (acc >= 0.9) strength = 'High accuracy';
            else if (acc >= 0.7) strength = 'Good accuracy';
            else strength = 'Moderate accuracy';

            if (acc < 0.7) weakness = 'Low accuracy - may underfit';
            else weakness = 'Check for overfitting with cross-validation';
        } else if (problemType === 'regression') {
            const r2 = model.metrics.r2 || 0;
            if (r2 >= 0.8) strength = 'Strong fit (high R-squared)';
            else if (r2 >= 0.5) strength = 'Moderate fit';
            else strength = 'Weak fit';

            if (r2 < 0.5) weakness = 'Model explains less than half the variance';
            else weakness = 'May not capture non-linear relationships';
        } else {
            const sil = model.metrics.silhouette || 0;
            if (sil >= 0.5) strength = 'Well-separated clusters';
            else if (sil >= 0.25) strength = 'Moderately separated clusters';
            else strength = 'Poorly separated clusters';

            if (sil < 0.25) weakness = 'Clusters may overlap significantly';
            else weakness = 'Consider trying different k values';
        }

        return { name: model.name, metrics: model.metrics, strength, weakness };
    });

    // Generate recommendation
    let recommendation = '';
    if (problemType === 'classification') {
        const best = compared.reduce((a, b) =>
            (a.metrics.accuracy || 0) > (b.metrics.accuracy || 0) ? a : b
        );
        recommendation = `${best.name} performs best with ${((best.metrics.accuracy || 0) * 100).toFixed(1)}% accuracy.`;
    } else if (problemType === 'regression') {
        const best = compared.reduce((a, b) =>
            (a.metrics.r2 || 0) > (b.metrics.r2 || 0) ? a : b
        );
        recommendation = `${best.name} explains ${((best.metrics.r2 || 0) * 100).toFixed(1)}% of variance.`;
    } else {
        const best = compared.reduce((a, b) =>
            (a.metrics.silhouette || 0) > (b.metrics.silhouette || 0) ? a : b
        );
        recommendation = `${best.name} has the best cluster separation (silhouette: ${(best.metrics.silhouette || 0).toFixed(3)}).`;
    }

    return { models: compared, recommendation };
}

/**
 * Generate human-readable explanation of feature importance.
 */
export function generateImportanceSummary(
    importance: FeatureImportanceResult[],
    topN: number = 5
): string {
    const top = importance.slice(0, topN);
    if (top.length === 0) return 'No feature importance data available.';

    const lines: string[] = [];
    lines.push(`Top ${top.length} most important features:`);

    for (const feat of top) {
        const pct = (feat.importance * 100).toFixed(1);
        const dir = feat.direction === 'positive' ? 'positively' : 'negatively';
        lines.push(`  ${feat.rank}. ${feat.feature} (${pct}% importance, influences ${dir})`);
    }

    return lines.join('\n');
}
