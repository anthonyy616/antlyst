import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import Papa from "papaparse";
import { Readable } from "stream";

// Helper to convert stream to buffer
async function streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: any[] = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
}

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { fileId } = await req.json();

        if (!fileId) {
            return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
        }

        const fileRecord = await prisma.file.findUnique({
            where: { id: fileId },
        });

        if (!fileRecord) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        // Update status to processing
        await prisma.file.update({
            where: { id: fileId },
            data: { uploadStatus: "processing" },
        });

        // Download file from R2
        const command = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: fileRecord.r2Key,
        });

        const response = await r2Client.send(command);

        if (!response.Body) {
            throw new Error("Failed to download file body");
        }

        // Convert stream to buffer string
        const buffer = await streamToBuffer(response.Body as Readable);
        const csvString = buffer.toString('utf-8');

        // Parse with PapaParse
        const fullParse = Papa.parse(csvString, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true
        });

        const rows = fullParse.data as any[];
        const columns = fullParse.meta.fields || [];
        const rowCount = rows.length;

        // 1. Infer Schema
        const schema: Record<string, string> = {};
        if (rows.length > 0) {
            columns.forEach(col => {
                const val = rows[0][col];
                schema[col] = typeof val;
            });
        }

        // 2. Generate Preview (1000 rows)
        const preview = rows.slice(0, 1000);

        // 3. Stats Object
        const sanitizedStats = {
            rowCount,
            columns,
            schema,
            preview
        };

        // Save results
        await prisma.analysisResult.create({
            data: {
                fileId: fileId,
                stats: sanitizedStats,
            },
        });

        // Update file status
        await prisma.file.update({
            where: { id: fileId },
            data: { uploadStatus: "completed" },
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Error processing file:", error);

        return NextResponse.json(
            { error: "Failed to process file: " + error.message },
            { status: 500 }
        );
    }
}
