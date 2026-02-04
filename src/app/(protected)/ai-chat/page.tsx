import { AIChatWithProjectSelector } from '@/components/ai/AIChatWithProjectSelector';

export const metadata = {
    title: 'AI Analyst - Antlyst',
    description: 'Chat with your data using our advanced AI Analyst.',
};

export default function AIChatPage() {
    return (
        <div className="container mx-auto p-4 md:p-6 max-w-6xl h-full flex flex-col">
            <div className="mb-4 md:mb-6">
                <h1 className="text-2xl font-bold tracking-tight">AI Senior Analyst</h1>
                <p className="text-muted-foreground text-sm">
                    Select a project to get context-aware insights from your dashboard data.
                </p>
            </div>

            <div className="flex-1 min-h-0">
                <AIChatWithProjectSelector />
            </div>
        </div>
    );
}
