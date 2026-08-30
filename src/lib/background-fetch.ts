/**
 * Background Data Fetch
 * 
 * Fetches data from a source, stores in R2, creates File + AnalysisResult + Dashboard records.
 */

import { prisma } from '@/lib/prisma';
import { r2Client, R2_BUCKET_NAME } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { fetchFromUrl, fetchFromAPI, fetchFromGoogleSheets, fetchFromS3, FetchResult } from '@/lib/data-fetchers';
import { analyzeColumns } from '@/lib/column-validator';

export interface BackgroundFetchResult {
    success: boolean;
    rowCount?: number;
    error?: string;
}

export async function fetchDataInBackground(
    dataSourceId: string,
    type: string,
    config: Record<string, string>
): Promise<BackgroundFetchResult> {
    const dataSource = await prisma.dataSource.findUnique({ where: { id: dataSourceId } });
    if (!dataSource) return { success: false, error: 'Data source not found' };

    try {
        let result: FetchResult;

        switch (type) {
            case 'url':
                result = await fetchFromUrl(config.url!);
                break;
            case 'api':
                result = await fetchFromAPI({
                    url: config.url,
                    headers: config.headers ? JSON.parse(config.headers) : {},
                    method: (config.method as 'GET' | 'POST') || 'GET',
                    body: config.body,
                });
                break;
            case 'google-sheets':
                result = await fetchFromGoogleSheets(config.url!);
                break;
            case 's3':
                result = await fetchFromS3(config.url!, {
                    accessKeyId: config.s3AccessKeyId || process.env.AWS_ACCESS_KEY_ID!,
                    secretAccessKey: config.s3SecretAccessKey || process.env.AWS_SECRET_ACCESS_KEY!,
                    region: config.s3Region || 'us-east-1',
                });
                break;
            default:
                return { success: false, error: `Unknown source type: ${type}` };
        }

        if (!result.success || !result.data || !result.rawBuffer) {
            await prisma.dataSource.update({
                where: { id: dataSourceId },
                data: { status: 'error', errorMessage: result.error },
            });
            return { success: false, error: result.error };
        }

        // Upload to R2
        const r2Key = `sources/${dataSource.projectId}/${dataSourceId}/${result.fileName}`;

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: r2Key,
            Body: result.rawBuffer,
            ContentType: result.mimeType,
        });

        await r2Client.send(command);

        // Create File record
        const file = await prisma.file.create({
            data: {
                projectId: dataSource.projectId,
                fileName: result.fileName || 'data.csv',
                fileSize: result.rawBuffer.length,
                mimeType: result.mimeType || 'text/csv',
                r2Key,
                r2Url: `${process.env.R2_PUBLIC_URL}/${r2Key}`,
                uploadStatus: 'completed',
            },
        });

        // Run enhanced schema inference
        const columnMeta = analyzeColumns(result.data);

        // Create AnalysisResult with enhanced stats
        const columns = result.data.length > 0 ? Object.keys(result.data[0]) : [];
        const schema: Record<string, string> = {};
        for (const col of columns) {
            schema[col] = typeof result.data[0][col];
        }

        await prisma.analysisResult.create({
            data: {
                fileId: file.id,
                stats: {
                    preview: result.data.slice(0, 100),
                    columns,
                    rowCount: result.data.length,
                    schema,
                    columnMeta: columnMeta as any,
                },
            },
        });

        // Create default dashboard
        await prisma.dashboard.create({
            data: {
                projectId: dataSource.projectId,
                style: 'powerbi',
                config: {},
            },
        });

        // Update data source status
        await prisma.dataSource.update({
            where: { id: dataSourceId },
            data: {
                status: 'ready',
                fileId: file.id,
                lastSyncAt: new Date(),
                errorMessage: null,
            },
        });

        // Update project status
        await prisma.project.update({
            where: { id: dataSource.projectId },
            data: { status: 'ready' },
        });

        return { success: true, rowCount: result.data.length };
    } catch (error: any) {
        await prisma.dataSource.update({
            where: { id: dataSourceId },
            data: { status: 'error', errorMessage: error.message },
        });
        return { success: false, error: error.message };
    }
}
