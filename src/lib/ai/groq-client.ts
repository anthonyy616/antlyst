import Groq from 'groq-sdk';

export const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export const AI_MODELS = {
    ANALYSIS: 'llama-3.1-8b-instant',
    COMPLEX: 'llama-3.3-70b-versatile'
};
