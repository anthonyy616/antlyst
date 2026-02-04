'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Send, Bot, User, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface AIChatInterfaceProps {
    contextData?: any; // Optional data context (e.g. from a CSV file)
    contextDescription?: string;
}

export function AIChatInterface({ contextData, contextDescription }: AIChatInterfaceProps) {
    const { user } = useUser();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: `Hello ${user?.firstName || 'there'}! I'm your AI Data Analyst based on Llama 3. ${contextDescription ? `I have access to the **${contextDescription}** data.` : 'I can help you analyze your data.'} Ask me anything!`
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        // Prepare context - pass dashboard context directly if it has the expected structure
        const contextPayload = contextData?.type === 'dashboard'
            ? contextData  // Pass dashboard context directly (has type & formattedContext)
            : contextData
                ? { preview: Array.isArray(contextData) ? contextData.slice(0, 50) : contextData, description: contextDescription }
                : null;

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg.content,
                    context: contextPayload
                })
            });

            if (!response.ok) throw new Error('Failed to fetch AI response');
            if (!response.body) throw new Error('No response body');

            // Handle Streaming
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            const aiMsgId = (Date.now() + 1).toString();
            setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: '' }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                setMessages(prev => prev.map(m =>
                    m.id === aiMsgId
                        ? { ...m, content: m.content + chunk }
                        : m
                ));
            }

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: 'Sorry, I encountered an error tracking your request. Please try again.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="h-[600px] flex flex-col w-full max-w-4xl mx-auto shadow-lg border-t-4 border-t-brand-purple">
            <CardHeader className="py-3 border-b bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-brand-purple/10 rounded-full">
                        <Sparkles className="w-5 h-5 text-brand-purple" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">AI Senior Analyst</CardTitle>
                        <CardDescription className="text-xs">Powered by Llama 3.1 & Groq</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30" ref={scrollRef}>
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-full bg-brand-purple flex items-center justify-center shrink-0 mt-1">
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                            )}

                            <div
                                className={`rounded-2xl px-4 py-2.5 max-w-[80%] text-sm shadow-sm ${msg.role === 'user'
                                        ? 'bg-slate-900 text-white rounded-br-none'
                                        : 'bg-white border rounded-bl-none text-slate-800 whitespace-pre-wrap'
                                    }`}
                            >
                                {msg.content}
                            </div>

                            {msg.role === 'user' && (
                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-1">
                                    <User className="w-4 h-4 text-slate-600" />
                                </div>
                            )}
                        </div>
                    ))}

                    {isLoading && messages[messages.length - 1]?.role === 'user' && (
                        <div className="flex gap-3 justify-start">
                            <div className="w-8 h-8 rounded-full bg-brand-purple flex items-center justify-center shrink-0">
                                <Bot className="w-4 h-4 text-white" />
                            </div>
                            <div className="bg-white border rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-brand-purple" />
                                <span className="text-xs text-slate-500">Thinking...</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white border-t">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <Input
                            placeholder="Ask about trends, outliers, or summaries..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            disabled={isLoading}
                            className="flex-1"
                        />
                        <Button type="submit" disabled={isLoading || !input.trim()} size="icon" className="bg-brand-purple hover:bg-brand-purple/90">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                    </form>
                    <div className="text-center mt-2">
                        <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            AI can make mistakes. Double check important info.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
