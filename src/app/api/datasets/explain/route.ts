import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
    rankFeatureImportance,
    explainPrediction,
    compareModels,
    generateImportanceSummary,
} from '@/lib/ml-explainer';

const importanceSchema = z.object({
    featureImportance: z.record(z.string(), z.number()),
    topN: z.number().int().min(1).max(50).optional().default(10),
});

const explainSchema = z.object({
    features: z.record(z.string(), z.any()),
    featureWeights: z.record(z.string(), z.number()),
    baseValue: z.number().optional().default(0),
    prediction: z.number().optional().default(0),
});

const compareSchema = z.object({
    models: z.array(z.object({
        name: z.string(),
        metrics: z.record(z.string(), z.number()),
    })).min(2),
    problemType: z.enum(['classification', 'regression', 'clustering']),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action') || 'importance';

        switch (action) {
            case 'importance': {
                const validation = importanceSchema.safeParse(body);
                if (!validation.success) {
                    return NextResponse.json(
                        { error: 'Invalid request', details: validation.error.issues },
                        { status: 400 }
                    );
                }

                const { featureImportance, topN } = validation.data;
                const ranked = rankFeatureImportance(featureImportance);
                const summary = generateImportanceSummary(ranked, topN);

                return NextResponse.json({
                    success: true,
                    importance: ranked.slice(0, topN),
                    summary,
                });
            }

            case 'predict': {
                const validation = explainSchema.safeParse(body);
                if (!validation.success) {
                    return NextResponse.json(
                        { error: 'Invalid request', details: validation.error.issues },
                        { status: 400 }
                    );
                }

                const { features, featureWeights, baseValue, prediction } = validation.data;
                const explanation = explainPrediction(features, featureWeights, baseValue, prediction);

                return NextResponse.json({ success: true, explanation });
            }

            case 'compare': {
                const validation = compareSchema.safeParse(body);
                if (!validation.success) {
                    return NextResponse.json(
                        { error: 'Invalid request', details: validation.error.issues },
                        { status: 400 }
                    );
                }

                const { models, problemType } = validation.data;
                const comparison = compareModels(models, problemType);

                return NextResponse.json({ success: true, comparison });
            }

            default:
                return NextResponse.json(
                    { error: `Unknown action: ${action}. Use 'importance', 'predict', or 'compare'.` },
                    { status: 400 }
                );
        }
    } catch (error: any) {
        console.error('ML explain error:', error);
        return NextResponse.json(
            { error: 'Failed to explain: ' + error.message },
            { status: 500 }
        );
    }
}
