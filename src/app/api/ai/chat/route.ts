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

        const { message, context, projectId } = await req.json();

        // Build system prompt based on context type
        let systemPrompt: string;

        if (context?.type === 'dashboard' && context?.formattedContext) {
            // Project-specific analysis with dashboard data
            systemPrompt = `You are Antlyst AI, an expert data analyst assistant. You are analyzing a specific project's dashboard data.

## Your Role
- Provide clear, actionable insights based on the dashboard data
- Identify patterns, trends, anomalies, and correlations
- Answer questions specifically about this dataset
- Be concise but thorough
- Use specific numbers and data points from the context when available
- If asked about something not in the data, say so clearly

## Project Context
${context.formattedContext}

## Response Guidelines
- Use bullet points for clarity when listing insights
- Reference specific column names and values
- Highlight any concerning patterns or positive trends
- Suggest follow-up analyses when relevant
- Keep responses focused and under 500 words unless more detail is requested`;
        } else {
            // General data analysis assistant (no specific project)
            systemPrompt = `You are Antlyst AI, an expert data analyst assistant.
You help users understand data analysis concepts and provide general guidance.
Since no specific project data is loaded, provide general advice about data analysis.
If the user asks about specific data, suggest they select a project first.`;
        }

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
