import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { checkAIRateLimit, incrementAIUsage } from "@/lib/ai-rate-limiter";
import { groq, getModelForTier, AITier } from "@/lib/ai-service";
import { checkRole } from "@/lib/rbac";
import { sanitizeInput } from "@/lib/security";
import { z } from "zod";

const chatSchema = z.object({
    message: z.string().min(1).max(2000),
    projectId: z.string().cuid(),
    tier: z.enum(['free', 'pro', 'enterprise']).optional(),
});

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

        const { message, projectId } = validation.data;

        // Sanitize input
        const safeMessage = sanitizeInput(message);

        // Verify Project Access & Determine Tier
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { owner: { include: { subscription: true } } }
        });

        if (!project || project.ownerId !== userId) {
            // Check membership if not owner
            // TODO: Add proper membership check here if shared projects
            if (project?.ownerId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Determine User Tier (Mock logic for now, replace with actual Subscription check)
        // const userTier = project.owner.subscription?.planId.includes('pro') ? 'pro' : 'free';
        const userTier: AITier = 'free'; // Default to free for now

        // Rate Limit Check
        const estimatedTokens = safeMessage.length / 4; // Rough estimate
        const limitCheck = await checkAIRateLimit(userId, userTier, estimatedTokens);

        if (!limitCheck.allowed) {
            return NextResponse.json({
                error: limitCheck.error || "Rate limit exceeded",
                retryAfter: limitCheck.retryAfterMs
            }, { status: 429 });
        }

        // Call AI Service
        const model = getModelForTier(userTier);

        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: safeMessage }],
            model: model,
            temperature: 0.7,
            max_tokens: 1024,
        });

        const responseContent = completion.choices[0]?.message?.content || "";
        const responseTokens = completion.usage?.total_tokens || 0;

        // Track Usage (Async)
        await incrementAIUsage(userId, responseTokens, userTier);

        return NextResponse.json({
            response: responseContent,
            usage: { total_tokens: responseTokens, limit_remaining: limitCheck.remainingTokens }
        });

    } catch (error: any) {
        console.error("AI Chat Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
