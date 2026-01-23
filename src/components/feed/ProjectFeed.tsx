"use client";

import useSWR from 'swr';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FeedPost } from './FeedPost';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function ProjectFeed({ projectId }: { projectId: string }) {
    const { data: posts, error, mutate } = useSWR(`/api/projects/${projectId}/feed`, fetcher); // Removed polling
    const [content, setContent] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Real-time Subscription
    useEffect(() => {
        const channel = supabase.channel(`project-${projectId}`)
            .on(
                'broadcast',
                { event: 'new-post' },
                (payload) => {
                    // Update SWR cache instantly
                    mutate((currentPosts: any) => {
                        // Dedup based on ID just in case
                        if (currentPosts?.find((p: any) => p.id === payload.payload.id)) return currentPosts;
                        return [payload.payload, ...(currentPosts || [])];
                    }, false);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [projectId, mutate]);

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
            // No need to mutate() here if the broadcast works, 
            // but for instant local feedback we could optimistic update.
            // Leaving it to the broadcast for now to prove it works.
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
