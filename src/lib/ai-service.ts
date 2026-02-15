import Groq from "groq-sdk";

export const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export type AITier = 'free' | 'pro' | 'enterprise';

export const AI_MODELS = {
    FREE: 'llama-3.1-8b-instant',
    PRO: 'llama-3.2-11b-vision-preview', // Or Llama 4 when available
    PRO_FALLBACK: 'llama-3.2-90b-vision-preview', // High quality fallback
    ENTERPRISE: 'llama-3.3-70b-specdec',
};

export function getModelForTier(tier: AITier): string {
    switch (tier) {
        case 'enterprise':
            return AI_MODELS.ENTERPRISE;
        case 'pro':
            return AI_MODELS.PRO;
        case 'free':
        default:
            return AI_MODELS.FREE;
    }
}

export interface AIInsight {
    title: string;
    description: string;
    type: 'trend' | 'outlier' | 'general';
}

export async function generateTableInsights(
    dataPreview: any[],
    columns: string[],
    tier: AITier
): Promise<AIInsight[]> {
    const model = getModelForTier(tier);

    const prompt = `
    Analyze this dataset preview and provide 3 key insights.
    Columns: ${columns.join(', ')}
    Data Preview (first 5 rows): ${JSON.stringify(dataPreview.slice(0, 5))}
    
    Return ONLY a JSON array with this format:
    [
        { "title": "Insight Title", "description": "Brief explanation", "type": "trend" | "outlier" | "general" }
    ]
    `;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are a data analyst. Output only valid JSON." },
                { role: "user", content: prompt }
            ],
            model: model,
            temperature: 0.5,
            max_tokens: 1000,
            response_format: { type: "json_object" }
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) return [];

        const result = JSON.parse(content);
        return result.insights || result;
    } catch (error) {
        console.error("AI Insight Generation Error:", error);
        return [];
    }
}
