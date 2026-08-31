/**
 * POST /api/datasets/profile
 *
 * Profile a dataset and return comprehensive metadata, statistics, and quality analysis.
 * Accepts a fileId to profile data from R2, or inline data for immediate profiling.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { r2Client, R2_BUCKET_NAME } from '@/lib/r2';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { profileDataset, formatProfileSummary } from '@/lib/dataset-profiler';
import { z } from 'zod';

const profileSchema = z.object({
    fileId: z.string().optional(),
    projectId: z.string().optional(),
    data: z.array(z.record(z.string(), z.any())).optional(),
    datasetName: z.string().optional(),
}).refine(
    (data) => data.fileId || data.data,
    { message: 'Either fileId or data array is required' }
);

async function streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: any[] = [];
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
}

export async function POST(req: NextRequest) {
    try {
        const { userId, orgId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const validation = profileSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid request', details: validation.error.issues },
                { status: 400 }
            );
        }

        const { fileId, projectId, data: inlineData, datasetName } = validation.data;

        let rows: any[];
        let name = datasetName || 'Untitled Dataset';

        if (inlineData && inlineData.length > 0) {
            // Use inline data directly — no orgId needed
            rows = inlineData;
        } else if (fileId) {
            // R2 file access requires orgId
            if (!orgId) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            // Fetch file from R2 and parse
            const fileRecord = await prisma.file.findUnique({ where: { id: fileId } });
            if (!fileRecord) {
                return NextResponse.json({ error: 'File not found' }, { status: 404 });
            }

            // Verify project access
            if (projectId) {
                const project = await prisma.project.findUnique({ where: { id: projectId } });
                if (!project || project.organizationId !== orgId) {
                    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
                }
            }

            name = datasetName || fileRecord.fileName;

            const command = new GetObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: fileRecord.r2Key,
            });

            const response = await r2Client.send(command);
            if (!response.Body) {
                return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
            }

            const buffer = await streamToBuffer(response.Body as unknown as Readable);
            const fileName = fileRecord.fileName.toLowerCase();

            if (fileName.endsWith('.csv')) {
                const result = Papa.parse(buffer.toString('utf-8'), {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true,
                });
                rows = result.data as any[];
            } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                const workbook = XLSX.read(buffer, { type: 'buffer' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                rows = XLSX.utils.sheet_to_json(firstSheet);
            } else {
                return NextResponse.json(
                    { error: 'Unsupported file type for profiling' },
                    { status: 400 }
                );
            }
        } else {
            return NextResponse.json(
                { error: 'No data source provided' },
                { status: 400 }
            );
        }

        if (rows.length === 0) {
            return NextResponse.json(
                { error: 'Dataset is empty' },
                { status: 400 }
            );
        }

        // Profile the dataset
        const profile = profileDataset(rows, name);
        const summary = formatProfileSummary(profile);

        return NextResponse.json({
            success: true,
            profile,
            summary,
        });

    } catch (error: any) {
        console.error('Dataset profiling error:', error);
        return NextResponse.json(
            { error: 'Failed to profile dataset: ' + error.message },
            { status: 500 }
        );
    }
}
