"use client";

import useSWR from 'swr';
import { useState } from 'react';
import { FeedPost } from './FeedPost';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function ProjectFeed({ projectId }: { projectId: string }) {
    const { data: posts, error, mutate } = useSWR(`/api/projects/${projectId}/feed`, fetcher, {
        refreshInterval: 5000 // Poll every 5s
    });
    const [content, setContent] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!content.trim()) return;
        setSubmitting(true);
        try {
            await fetch(`/api/projects/${projectId}/feed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            setContent("");
            mutate(); // Refresh list immediately
        } catch (e) {
            console.error("Failed to post", e);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 border-l border-slate-200">
            <div className="p-4 border-b bg-white">
                <h3 className="font-semibold mb-4">Team Discussion</h3>
                <div className="space-y-2">
                    <Textarea
                        placeholder="Share an insight..."
                        className="resize-none min-h-[80px] text-sm"
                        value={content}
                        onChange={e => setContent(e.target.value)}
                    />
                    <div className="flex justify-end">
                        <Button
                            size="sm"
                            onClick={handleSubmit}
                            disabled={submitting || !content.trim()}
                            className="bg-brand-purple hover:bg-brand-purple/90"
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                            Post
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {!posts && !error && (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 text-slate-300 animate-spin" />
                    </div>
                )}

                {posts && posts.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-8">
                        No discussions yet. Be the first to share!
                    </div>
                )}

                {posts && posts.map((post: any) => (
                    <FeedPost key={post.id} post={post} projectId={projectId} />
                ))}
            </div>
        </div>
    );
}
