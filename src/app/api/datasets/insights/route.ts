import { NextRequest, NextResponse } from 'next/server';
import { detectInsights, InsightResult } from '@/lib/insight-engine';
import { profileDataset } from '@/lib/dataset-profiler';

/**
 * POST /api/datasets/insights
 *
 * Detects automated insights from a dataset.
 * Accepts either pre-profiled data or raw rows.
 *
 * Body:
 *   { rows: any[], profile?: DatasetProfile, maxInsights?: number }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { rows, profile, maxInsights } = body;

        if (!rows || !Array.isArray(rows) || rows.length === 0) {
            return NextResponse.json(
                { error: 'rows array is required and must not be empty' },
                { status: 400 }
            );
        }

        const datasetProfile = profile || profileDataset(rows);
        const result: InsightResult = detectInsights(
            rows,
            datasetProfile,
            maxInsights ?? 10
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('[Insights API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to detect insights' },
            { status: 500 }
        );
    }
}
