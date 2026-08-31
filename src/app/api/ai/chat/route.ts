import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { checkAIRateLimit, incrementAIUsage } from "@/lib/ai-rate-limiter";
import { groq, getModelForTier, AITier } from "@/lib/ai-service";
import { sanitizeInput } from "@/lib/security";
import { profileDataset } from "@/lib/dataset-profiler";
import {
    buildDatasetContext,
    buildChartContext,
    buildQuestionContext,
    buildSystemPrompt,
    buildUserMessage,
} from "@/lib/ai-context-builder";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { z } from "zod";

const chatSchema = z.object({
    message: z.string().min(1).max(2000),
    projectId: z.string().cuid(),
    tier: z.enum(["free", "pro", "enterprise"]).optional(),
    chartContext: z.object({
        chartType: z.string(),
        title: z.string(),
        xColumn: z.string().optional(),
        yColumn: z.string().optional(),
    }).optional(),
});

async function streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: any[] = [];
    return new Promise((resolve, reject) => {
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
}

async function getProjectDataset(projectId: string): Promise<{ rows: any[]; name: string } | null> {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
            files: { where: { uploadStatus: "completed" }, take: 1, orderBy: { createdAt: "desc" } },
        },
    });

    if (!project || !project.files[0]) return null;

    const file = project.files[0];

    try {
        const command = new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: file.r2Key,
        });

        const response = await r2Client.send(command);
        if (!response.Body) return null;

        const buffer = await streamToBuffer(response.Body as unknown as Readable);
        const fileName = file.fileName.toLowerCase();

        let rows: any[] = [];
        if (fileName.endsWith(".csv")) {
            const result = Papa.parse(buffer.toString("utf-8"), {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
            });
            rows = result.data as any[];
        } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
            const workbook = XLSX.read(buffer, { type: "buffer" });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            rows = XLSX.utils.sheet_to_json(firstSheet);
        }

        return { rows, name: project.name };
    } catch (error) {
        console.error("Failed to load project dataset:", error);
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const validation = chatSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }

        const { message, projectId, chartContext: chartCtx } = validation.data;

        // Sanitize input
        const safeMessage = sanitizeInput(message);

        // Verify Project Access
        const project = await prisma.project.findUnique({
            where: { id: projectId },
        });

        if (!project || project.ownerId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const userTier: AITier = "free";

        // Rate Limit Check
        const estimatedTokens = safeMessage.length / 4;
        const limitCheck = await checkAIRateLimit(userId, userTier, estimatedTokens);

        if (!limitCheck.allowed) {
            return NextResponse.json({
                error: limitCheck.error || "Rate limit exceeded",
                retryAfter: limitCheck.retryAfterMs,
            }, { status: 429 });
        }

        // Load and profile dataset for context
        const dataset = await getProjectDataset(projectId);
        let contextMessage = safeMessage;

        if (dataset && dataset.rows.length > 0) {
            const profile = profileDataset(dataset.rows, dataset.name);

            let context;
            if (chartCtx) {
                // "Ask This Chart" mode
                context = buildChartContext(
                    profile,
                    chartCtx.chartType,
                    chartCtx.title,
                    chartCtx.xColumn,
                    chartCtx.yColumn
                );
            } else {
                // General dataset question
                context = buildQuestionContext(profile, safeMessage);
            }

            contextMessage = buildUserMessage(context, safeMessage);
        }

        // Call AI Service with context
        const model = getModelForTier(userTier);
        const systemPrompt = buildSystemPrompt();

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: contextMessage },
            ],
            model: model,
            temperature: 0.7,
            max_tokens: 1024,
        });

        const responseContent = completion.choices[0]?.message?.content || "";
        const responseTokens = completion.usage?.total_tokens || 0;

        // Track Usage
        await incrementAIUsage(userId, responseTokens, userTier);

        return NextResponse.json({
            response: responseContent,
            usage: { total_tokens: responseTokens, limit_remaining: limitCheck.remainingTokens },
            hasContext: !!dataset,
        });

    } catch (error: any) {
        console.error("AI Chat Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
