import { prisma } from '@/lib/prisma';
import { getObjectBuffer, uploadObject, getR2PublicUrl } from '@/lib/r2';
import pl from 'nodejs-polars';

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

export async function processFileJob(jobId: string) {
    try {
        console.log(`[Job Worker] Starting job ${jobId}`);
        // 1. Update status to running
        const job = await prisma.job.update({
            where: { id: jobId },
            data: { status: 'running', progress: 0 },
        });

        if (!job.payload || typeof job.payload !== 'object' || !('fileId' in job.payload)) {
            throw new Error('Invalid job payload: missing fileId');
        }

        const fileId = (job.payload as any).fileId as string;

        // Fetch file record
        const file = await prisma.file.findUnique({
            where: { id: fileId },
        });

        if (!file) {
            throw new Error(`File ${fileId} not found`);
        }

        // Update status to processing (legacy status on file)
        await prisma.file.update({
            where: { id: fileId },
            data: { uploadStatus: 'processing' },
        });

        await prisma.job.update({
            where: { id: jobId },
            data: { progress: 10 }
        });

        // Download CSV from R2
        console.log(`[Job Worker] Downloading ${file.r2Key}`);
        const csvBuffer = await getObjectBuffer(file.r2Key);

        // Load into Polars
        const df = pl.readCSV(csvBuffer);

        await prisma.job.update({
            where: { id: jobId },
            data: { progress: 30 }
        });

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

        await prisma.job.update({
            where: { id: jobId },
            data: { progress: 50 }
        });

        // Calculate Correlation Matrix for numeric columns
        let correlations: Record<string, Record<string, number>> | null = null;
        if (numericCols.length > 1) {
            try {
                correlations = {};
                for (const colA of numericCols) {
                    correlations[colA] = {};
                    for (const colB of numericCols) {
                        // Calculate correlation between two columns
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

        await prisma.job.update({
            where: { id: jobId },
            data: { progress: 70 }
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

        // Complete Job
        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: 'done',
                progress: 100,
                result: { success: true }
            },
        });
        console.log(`[Job Worker] Job ${jobId} completed`);

    } catch (error: any) {
        console.error(`[Job Worker] Job ${jobId} failed:`, error);
        await prisma.job.update({
            where: { id: jobId },
            data: {
                status: 'failed',
                error: error.message || 'Unknown error'
            },
        });
    }
}
