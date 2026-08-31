import { NextRequest, NextResponse } from 'next/server';
import {
    executePipeline,
    validatePipeline,
    TransformationStep,
    TransformationResult,
} from '@/lib/data-transformer';

/**
 * POST /api/datasets/transform
 *
 * Execute a transformation pipeline on a dataset.
 *
 * Body:
 *   {
 *     data: any[],
 *     steps: TransformationStep[],
 *     preserveOriginal?: boolean
 *   }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { data, steps, preserveOriginal } = body;

        if (!data || !Array.isArray(data) || data.length === 0) {
            return NextResponse.json(
                { error: 'data array is required and must not be empty' },
                { status: 400 }
            );
        }

        if (!steps || !Array.isArray(steps) || steps.length === 0) {
            return NextResponse.json(
                { error: 'steps array is required and must not be empty' },
                { status: 400 }
            );
        }

        const result: TransformationResult = executePipeline(
            data,
            steps,
            preserveOriginal ?? true
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error('[Transform API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to execute transformation pipeline' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/datasets/transform?validate=true
 *
 * Validate a transformation pipeline without executing it.
 */
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { data, steps } = body;

        if (!steps || !Array.isArray(steps)) {
            return NextResponse.json(
                { error: 'steps array is required' },
                { status: 400 }
            );
        }

        const columns = data && Array.isArray(data) && data.length > 0
            ? Object.keys(data[0])
            : [];

        const errors = validatePipeline(steps, columns);

        return NextResponse.json({
            valid: errors.length === 0,
            errors,
        });
    } catch (error) {
        console.error('[Transform Validation] Error:', error);
        return NextResponse.json(
            { error: 'Failed to validate transformation pipeline' },
            { status: 500 }
        );
    }
}
