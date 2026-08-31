'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, MessageSquare, Send } from 'lucide-react';

interface Comment {
    id: string;
    content: string;
    createdAt: string;
    user: { id: string; name: string; email: string; imageUrl: string };
}

interface DashboardCommentsProps {
    dashboardId: string;
    projectId: string;
}

export function DashboardComments({ dashboardId, projectId }: DashboardCommentsProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [posting, setPosting] = useState(false);

    useEffect(() => {
        fetchComments();
    }, [dashboardId]);

    const fetchComments = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/dashboards/${dashboardId}/comments`);
            if (res.ok) {
                const data = await res.json();
                setComments(data.comments || []);
            }
        } catch (err) {
            console.error('Failed to fetch comments:', err);
        } finally {
            setLoading(false);
        }
    };

    const postComment = async () => {
        if (!newComment.trim()) return;
        setPosting(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/dashboards/${dashboardId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: newComment }),
            });
            if (res.ok) {
                setNewComment('');
                fetchComments();
            }
        } catch (err) {
            console.error('Failed to post comment:', err);
        } finally {
            setPosting(false);
        }
    };

    return (
        <Card>
            <CardHeader className="pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
                <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-500 shrink-0" />
                    Comments ({comments.length})
                </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                {loading ? (
                    <div className="flex items-center justify-center py-4 text-muted-foreground text-xs">
                        <Loader2 className="h-3 w-3 animate-spin mr-2" /> Loading...
                    </div>
                ) : (
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto mb-3">
                        {comments.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-2">No comments yet.</p>
                        )}
                        {comments.map((c) => (
                            <div key={c.id} className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[11px] font-medium">{c.user.name || c.user.email}</span>
                                    <span className="text-[10px] text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400">{c.content}</p>
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex gap-2">
                    <Textarea
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[60px] text-xs resize-none"
                    />
                    <Button
                        size="sm"
                        className="h-9 shrink-0"
                        onClick={postComment}
                        disabled={posting || !newComment.trim()}
                    >
                        {posting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
