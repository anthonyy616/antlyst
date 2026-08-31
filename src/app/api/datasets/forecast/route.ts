import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateForecast, validateForecastData } from '@/lib/forecast-engine';

const forecastSchema = z.object({
    data: z.array(z.record(z.string(), z.any())).min(10),
    timeColumn: z.string().min(1),
    valueColumn: z.string().min(1),
    method: z.enum(['moving_average', 'linear_trend']).default('linear_trend'),
    horizon: z.number().int().min(1).max(100).default(5),
    confidenceLevel: z.number().min(0.5).max(0.99).default(0.95),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validation = forecastSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: validation.error.issues },
                { status: 400 }
            );
        }

        const { data, timeColumn, valueColumn, method, horizon, confidenceLevel } = validation.data;

        // Validate data suitability
        const dataCheck = validateForecastData(data, timeColumn, valueColumn);
        if (!dataCheck.valid) {
            return NextResponse.json(
                { error: dataCheck.error },
                { status: 400 }
            );
        }

        const result = generateForecast(
            data,
            timeColumn,
            valueColumn,
            method,
            horizon,
            confidenceLevel
        );

        return NextResponse.json({ success: true, forecast: result });
    } catch (error: any) {
        console.error('Forecast error:', error);
        return NextResponse.json(
            { error: 'Failed to generate forecast: ' + error.message },
            { status: 500 }
        );
    }
}
