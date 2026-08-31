import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateReport, generateHTML, generateText, type ReportInput } from '@/lib/report-generator';

const reportSchema = z.object({
    datasetName: z.string().min(1),
    stats: z.object({
        rowCount: z.number(),
        columns: z.array(z.string()),
        preview: z.array(z.record(z.string(), z.any())),
        columnMeta: z.record(z.string(), z.any()).optional(),
    }),
    insights: z.array(z.any()).optional(),
    profile: z.any().optional(),
    forecast: z.any().optional(),
    automlResult: z.any().optional(),
    anomalyResult: z.any().optional(),
    format: z.enum(['html', 'text', 'json']).default('json'),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validation = reportSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: validation.error.issues },
                { status: 400 }
            );
        }

        const input: ReportInput = validation.data;
        const format = validation.data.format;

        const report = generateReport(input);

        switch (format) {
            case 'html': {
                const html = generateHTML(report);
                return new NextResponse(html, {
                    headers: {
                        'Content-Type': 'text/html',
                        'Content-Disposition': `attachment; filename="report-${Date.now()}.html"`,
                    },
                });
            }

            case 'text': {
                const text = generateText(report);
                return new NextResponse(text, {
                    headers: {
                        'Content-Type': 'text/plain',
                        'Content-Disposition': `attachment; filename="report-${Date.now()}.txt"`,
                    },
                });
            }

            case 'json':
            default:
                return NextResponse.json({ success: true, report });
        }
    } catch (error: any) {
        console.error('Report generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate report: ' + error.message },
            { status: 500 }
        );
    }
}
