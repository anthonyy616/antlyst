import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runAutoML, type ProblemType } from '@/lib/automl-engine';

const automlSchema = z.object({
    data: z.array(z.record(z.string(), z.any())).min(10),
    targetColumn: z.string().min(1),
    featureColumns: z.array(z.string()).min(1).optional(),
    problemType: z.enum(['classification', 'regression', 'clustering']).optional(),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validation = automlSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: validation.error.issues },
                { status: 400 }
            );
        }

        const { data, targetColumn, featureColumns, problemType } = validation.data;

        // Auto-detect feature columns if not provided
        const columns = data.length > 0 ? Object.keys(data[0]) : [];
        const features = featureColumns || columns.filter(c => c !== targetColumn);

        if (features.length === 0) {
            return NextResponse.json(
                { error: 'No feature columns available' },
                { status: 400 }
            );
        }

        const result = runAutoML(
            data,
            targetColumn,
            features,
            problemType as ProblemType | undefined
        );

        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        console.error('AutoML error:', error);
        return NextResponse.json(
            { error: 'Failed to run AutoML: ' + error.message },
            { status: 500 }
        );
    }
}
