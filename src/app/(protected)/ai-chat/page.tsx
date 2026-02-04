import { AIChatInterface } from '@/components/AIChatInterface';

export const metadata = {
    title: 'AI Analyst - Antlyst',
    description: 'Chat with your data using our advanced AI Analyst.',
};

export default function AIChatPage() {
    return (
        <div className="container mx-auto p-6 max-w-6xl h-full flex flex-col">
            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">AI Senior Analyst</h1>
                <p className="text-muted-foreground">
                    Ask general questions or load a project to ask specific data questions.
                </p>
            </div>

            <div className="flex-1 flex items-center justify-center pb-10">
                <AIChatInterface />
            </div>
        </div>
    );
}
