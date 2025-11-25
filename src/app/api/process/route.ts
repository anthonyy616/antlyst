import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getObjectBuffer, uploadObject, getR2PublicUrl } from '@/lib/r2';
import pl from 'nodejs-polars';
import { z } from 'zod';

const processSchema = z.object({
    fileId: z.string(),
});

// Helper to convert bigint to number/string for JSON serialization
function sanitizeForJSON(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj === 'bigint') {
        // Convert bigint to number if it's safe, otherwise to string
        return obj <= Number.MAX_SAFE_INTEGER && obj >= Number.MIN_SAFE_INTEGER
            ? Number(obj)
            : obj.toString();
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeForJSON(item));
    }

    if (typeof obj === 'object') {
        const sanitized: any = {};
        for (const key in obj) {
            sanitized[key] = sanitizeForJSON(obj[key]);
        }
        return sanitized;
    }

    return obj;
}

export async function POST(request: NextRequest) {
    try {
        const { userId, orgId } = await auth();

        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const validation = processSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: validation.error.issues },
                { status: 400 }
            );
        }

        const { fileId } = validation.data;

        // Fetch file record
        const file = await prisma.file.findUnique({
            where: { id: fileId },
            include: { project: true },
        });

        if (!file) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        if (file.project.organizationId !== orgId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Update status to processing
        await prisma.file.update({
            where: { id: fileId },
            data: { uploadStatus: 'processing' },
        });

        // Download CSV from R2
        const csvBuffer = await getObjectBuffer(file.r2Key);

        // Load into Polars
        const df = pl.readCSV(csvBuffer);

        // Generate stats
        const rowCount = df.height;
        const schema = df.schema;

        // Basic stats for numeric columns
        const numericCols = df.select(
            pl.col(pl.Float64).or(pl.col(pl.Int64))
        ).columns;

        // Simple summary stats
        const columnMetadata = Object.entries(schema).map(([name, type]) => ({
            name,
            type: String(type),
        }));

        // Calculate Correlation Matrix for numeric columns
        let correlations: Record<string, Record<string, number>> | null = null;
        if (numericCols.length > 1) {
            try {
                correlations = {};
                for (const colA of numericCols) {
                    correlations[colA] = {};
                    for (const colB of numericCols) {
                        // Calculate correlation between two columns
                        // Note: nodejs-polars API might differ slightly, using a safe approach
                        const corrVal = df.select((pl as any).corr(colA, colB)).row(0)[0];
                        correlations[colA][colB] = corrVal as number;
                    }
                }
            } catch (e) {
                console.warn("Failed to calculate correlations", e);
            }
        }

        const manifest = sanitizeForJSON({
            rowCount,
            columns: columnMetadata,
            correlations,
            generatedAt: new Date().toISOString(),
        });

        // Save Parquet to R2
        const parquetKey = file.r2Key.replace('.csv', '.parquet');
        const parquetBuffer = df.writeParquet({ compression: 'snappy' });
        await uploadObject(parquetKey, parquetBuffer, 'application/vnd.apache.parquet');

        // Save Manifest to R2
        const manifestKey = file.r2Key.replace('.csv', '-manifest.json');
        await uploadObject(manifestKey, JSON.stringify(manifest, null, 2), 'application/json');

        // Update DB with results
        await prisma.analysisResult.upsert({
            where: { fileId },
            create: {
                fileId,
                manifestUrl: getR2PublicUrl(manifestKey),
                parquetUrl: getR2PublicUrl(parquetKey),
                stats: manifest,
            },
            update: {
                manifestUrl: getR2PublicUrl(manifestKey),
                parquetUrl: getR2PublicUrl(parquetKey),
                stats: manifest,
            },
        });

        // Update file status
        await prisma.file.update({
            where: { id: fileId },
            data: { uploadStatus: 'completed' },
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Processing error:', error);
        return NextResponse.json(
            { error: 'Failed to process file' },
            { status: 500 }
        );
    }
}
