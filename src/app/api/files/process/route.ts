import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import Papa from "papaparse";
import { Readable } from "stream";

// Helper to convert stream to buffer
// Helper to convert stream to buffer
import * as XLSX from "xlsx";

// Polyfill for pdf-parse/pdfjs-dist in server environment
if (typeof Promise.withResolvers === 'undefined') {
    // @ts-ignore
    Promise.withResolvers = function () {
        let resolve, reject;
        const promise = new Promise((res, rej) => {
            resolve = res;
            reject = rej;
        });
        return { promise, resolve, reject };
    };
}
// @ts-ignore
if (!global.DOMMatrix) {
    // @ts-ignore
    global.DOMMatrix = class DOMMatrix {
        constructor() { return this; }
        toString() { return "matrix(1, 0, 0, 1, 0, 0)"; }
    };
}
// @ts-ignore
if (!global.ImageData) {
    // @ts-ignore
    global.ImageData = class ImageData {
        constructor() { return this; }
    };
}
// @ts-ignore
if (!global.Path2D) {
    // @ts-ignore
    global.Path2D = class Path2D {
        constructor() { return this; }
    };
}

const pdf = require("pdf-parse");

// Convert stream to buffer
async function streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: any[] = [];
    return new Promise((resolve, reject) => {
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
}

import { fileProcessSchema } from "@/lib/validations/file";

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const validation = fileProcessSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Invalid request", details: validation.error.issues },
                { status: 400 }
            );
        }

        const { fileId } = validation.data;
        // Basic Input Sanitization (though Zod handles structure, we ensure strings are clean)
        // const safeFileId = sanitizeInput(fileId); // fileId is CUID, so safe by definition

        if (!fileId) {
            return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
        }

        const fileRecord = await prisma.file.findUnique({
            where: { id: fileId },
        });

        if (!fileRecord) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        // SSRF Check for R2 URL (Internal integrity check)
        // if (!validateSafeUrl(fileRecord.r2Url)) { ... } 
        // We trust our own database records for R2 keys, but good to keep in mind.

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

        const buffer = await streamToBuffer(response.Body as Readable);
        const fileName = fileRecord.fileName.toLowerCase();
        let rows: any[] = [];

        if (fileName.endsWith('.csv')) {
            const csvString = buffer.toString('utf-8');
            // XSS: Ensure CSV content doesn't contain formulas/scripts if displayed raw later
            // We parse to JSON, which neutralizes script tags, but formula injection is possible in Excel.
            const fullParse = Papa.parse(csvString, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true
            });
            rows = fullParse.data as any[];
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            rows = XLSX.utils.sheet_to_json(worksheet);
        } else if (fileName.endsWith('.pdf')) {
            const data = await pdf(buffer);
            // Smart PDF Table Extraction (Basic)
            // PDF text is usually structured by lines. We try to infer columns if they are space/tab separated.
            const lines: string[] = data.text.split('\n').filter((l: string) => l.trim().length > 0);
            if (lines.length > 1) {
                const header = lines[0].split(/\s{2,}/).map((h: string) => h.trim());
                rows = lines.slice(1).map((line: string) => {
                    const values = line.split(/\s{2,}/).map((v: string) => v.trim());
                    const row: any = {};
                    header.forEach((h: string, i: number) => {
                        row[h] = values[i] || null;
                    });
                    return row;
                });
            }
        }

        if (rows.length === 0) {
            throw new Error("No data could be extracted from the file");
        }

        const columns = Object.keys(rows[0]);
        const rowCount = rows.length;

        // 1. Infer Schema
        const schema: Record<string, string> = {};
        if (rows.length > 0) {
            columns.forEach(col => {
                const val = rows[0][col];
                schema[col] = typeof val;
            });
        }

        // 2. Enhanced Column Analysis
        const { analyzeColumns } = await import('@/lib/column-validator');
        const columnMeta = analyzeColumns(rows);

        // 3. Generate Preview (1000 rows)
        const preview = rows.slice(0, 1000);

        // 4. Stats Object
        const sanitizedStats = {
            rowCount,
            columns,
            schema,
            columnMeta: columnMeta as any,
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
