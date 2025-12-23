"use client";

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquare, ThumbsUp } from 'lucide-react';

interface FeedPostProps {
    post: any;
    projectId: string;
}

export function FeedPost({ post, projectId }: FeedPostProps) {
    const [liked, setLiked] = useState(post.hasReacted);
    const [likeCount, setLikeCount] = useState(post.reactionCount);

    const handleLike = async () => {
        // Optimistic update
        setLiked(!liked);
        setLikeCount((prev: number) => liked ? prev - 1 : prev + 1);

        try {
            await fetch(`/api/projects/${projectId}/feed/${post.id}/react`, {
                method: 'POST',
                body: JSON.stringify({ emoji: 'like' })
            });
        } catch (e) {
            // Revert on error
            setLiked(!liked);
            setLikeCount((prev: number) => liked ? prev + 1 : prev - 1);
        }
    };

    return (
        <div className="border rounded-lg p-4 bg-white space-y-3">
            <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={post.user?.imageUrl} />
                    <AvatarFallback>{post.user?.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{post.user?.name || 'Unknown User'}</span>
                        <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                    </div>
                    <p className="text-sm mt-1 text-slate-700">{post.content}</p>
                </div>
            </div>

            <div className="flex items-center gap-4 pl-11">
                <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 px-2 text-xs gap-1 ${liked ? 'text-brand-purple' : 'text-slate-500'}`}
                    onClick={handleLike}
                >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    {likeCount > 0 && likeCount}
                </Button>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1 text-slate-500">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {post.commentCount > 0 && post.commentCount}
                </Button>
            </div>
        </div>
    );
}
