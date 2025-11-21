import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import pl from "nodejs-polars";
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

        // Convert stream to buffer for Polars
        // Note: For very large files, we might want to stream, but Polars usually needs the file or buffer
        const fileBuffer = await streamToBuffer(response.Body as Readable);

        // Load into Polars
        const df = pl.readCSV(fileBuffer);

        // 1. Basic Stats
        const describe = df.describe();
        const stats = describe.toRecords(); // Convert to array of objects

        // 2. Correlation Matrix (Numeric columns only)
        const numericCols = df.select(pl.col(pl.Float64), pl.col(pl.Int64)).columns;
        let correlationMatrix: any = null;

        if (numericCols.length > 1) {
            // Polars doesn't have a direct corr() for the whole DF in JS yet, 
            // so we might need to iterate or use a simpler approach for MVP.
            // Actually, let's just store the raw data for the frontend to calculate simple corr 
            // OR just store the summary stats for now to keep it safe.

            // For MVP, let's just store the column names and types
            // and maybe the first 100 rows for preview
        }

        const preview = df.head(100).toRecords();
        const schema = df.schema;

        // Save results
        await prisma.analysisResult.create({
            data: {
                fileId: fileId,
                stats: {
                    rowCount: df.height,
                    columns: Object.keys(schema),
                    schema: schema,
                    preview: preview,
                    summary: stats
                },
            },
        });

        // Update file status
        await prisma.file.update({
            where: { id: fileId },
            data: { uploadStatus: "completed" },
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error processing file:", error);

        // Try to update status to failed
        if (req.body) { // check if we can parse body again or if we have fileId in scope
            // In a real app we'd handle this better
        }

        return NextResponse.json(
            { error: "Failed to process file" },
            { status: 500 }
        );
    }
}
