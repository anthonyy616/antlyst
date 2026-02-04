import { NextRequest, NextResponse } from 'next/server';
import { groq, AI_MODELS } from '@/lib/ai/groq-client';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { message, context } = await req.json();

        // 1. Check Usage Limits (Phase C Enforcement Placeholder)
        // In a real implementation with limits, we would count `tokensIn` and `tokensOut` 
        // from `prisma.aIChatLog` for the current month and compare with Plan limits.
        // For now, we just log it.

        const systemPrompt = `You are Antlyst AI, an expert data analyst. 
        You are helpful, concise, and professional.
        If provided, use the following data context to answer the user's question:
        ${context ? JSON.stringify(context).slice(0, 10000) : 'No specific data context provided.'}
        
        Answer the user's question based on this data. If you cannot answer based on the data, say so.`;

        const completion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ],
            model: AI_MODELS.ANALYSIS,
            temperature: 0.5,
            max_tokens: 1024,
            stream: true,
        });

        // Streaming response
        const encoder = new TextEncoder();
        const customStream = new ReadableStream({
            async start(controller) {
                let fullResponse = '';
                try {
                    for await (const chunk of completion) {
                        const content = chunk.choices[0]?.delta?.content || '';
                        fullResponse += content;
                        controller.enqueue(encoder.encode(content));
                    }
                } finally {
                    controller.close();

                    // Log the interaction asynchronously
                    // Estimate tokens (rough heuristic: 4 chars = 1 token)
                    const tokensIn = (systemPrompt.length + message.length) / 4;
                    const tokensOut = fullResponse.length / 4;

                    await (prisma as any).aIChatLog.create({
                        data: {
                            userId,
                            model: AI_MODELS.ANALYSIS,
                            tokensIn: Math.ceil(tokensIn),
                            tokensOut: Math.ceil(tokensOut)
                        }
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    }).catch((err: any) => console.error("Failed to log AI chat:", err));
                }
            },
        });

        return new NextResponse(customStream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        console.error('AI Chat Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
