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
        const fileBuffer = await streamToBuffer(response.Body as Readable);

        // Load into Polars
        const df = pl.readCSV(fileBuffer);

        // 1. Basic Stats
        const describe = df.describe();
        const stats = describe.toRecords(); // Convert to array of objects

        // 2. Correlation Matrix (Numeric columns only)
        const numericCols = df.select(pl.col(pl.Float64), pl.col(pl.Int64)).columns;

        // For MVP, we send a larger preview so the frontend can do client-side correlation/scatter plots
        // 1000 rows is usually enough for a decent scatter plot without overwhelming the payload
        const preview = df.head(1000).toRecords();
        const schema = df.schema;

        // Sanitize all data to remove bigint values
        const sanitizedStats = sanitizeForJSON({
            rowCount: df.height,
            columns: Object.keys(schema),
            schema: schema,
            preview: preview,
            summary: stats
        });

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

        // Update status to failed
        // We need to re-parse the request body to get fileId, which might fail if already consumed.
        try {
            // Attempt to get fileId from the request body again, if possible
            const reqBody = await new NextRequest(req.url, {
                method: req.method,
                headers: req.headers,
                body: req.body ? await req.text() : undefined,
            }).json();
            const fileIdFromError = reqBody.fileId;

            if (fileIdFromError) {
                await prisma.file.update({
                    where: { id: fileIdFromError },
                    data: { uploadStatus: "failed" },
                });
            }
        } catch (e) {
            // Ignore if we can't parse body again or update status
        }

        return NextResponse.json(
            { error: "Failed to process file: " + error.message },
            { status: 500 }
        );
    }
}
