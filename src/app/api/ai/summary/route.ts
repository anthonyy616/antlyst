import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { checkAIRateLimit, incrementAIUsage } from "@/lib/ai-rate-limiter";
import { generateTableInsights, AITier } from "@/lib/ai-service";
import { sanitizeInput } from "@/lib/security";
import { z } from "zod";

const summarySchema = z.object({
    fileId: z.string().cuid(),
    tier: z.enum(['free', 'pro', 'enterprise']).optional(),
});

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const validation = summarySchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }

        const { fileId } = validation.data;

        // Fetch Analysis Result
        const analysis = await prisma.analysisResult.findUnique({
            where: { fileId },
        });

        if (!analysis || !analysis.stats) {
            return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
        }

        const stats = analysis.stats as any;
        const userTier: AITier = 'free'; // Mock tier for now

        // Rate Limit Check (Summary is expensive)
        const estimatedTokens = 2000;
        const limitCheck = await checkAIRateLimit(userId, userTier, estimatedTokens);

        if (!limitCheck.allowed) {
            return NextResponse.json({
                error: limitCheck.error,
                retryAfter: limitCheck.retryAfterMs
            }, { status: 429 });
        }

        // Generate Insights
        const insights = await generateTableInsights(stats.preview, stats.columns, userTier);

        // Track Usage
        await incrementAIUsage(userId, 500, userTier); // Hardcoded token cost for now

        return NextResponse.json({ insights });

    } catch (error) {
        console.error("AI Summary Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
